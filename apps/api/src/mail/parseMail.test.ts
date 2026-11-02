import { activityLimits } from "@appligator/shared";
import { expect, test } from "vite-plus/test";
import { parseMail } from "./parseMail.ts";

function rawMail(headers: string[], body: string) {
  return Buffer.from([...headers, "", body].join("\r\n"));
}

const headers = [
  "Message-ID: <abc@example.com>",
  'From: "Acme Jobs" <Jobs@Acme.example>',
  "To: bewerbung@example.com, other@example.com",
  "Subject: =?UTF-8?Q?Einladung_zum_Gespr=C3=A4ch?=",
  "Date: Mon, 02 Nov 2026 09:14:00 +0100",
];

test("reads the headers of an email", async () => {
  const { messageId, content } = await parseMail(rawMail(headers, "Hello"));

  expect(messageId).toBe("<abc@example.com>");
  expect(content).toMatchObject({
    subject: "Einladung zum Gespräch",
    from: "jobs@acme.example",
    to: "bewerbung@example.com, other@example.com",
    sentAt: "2026-11-02T08:14:00.000Z",
  });
});

test("turns plain text into paragraphs and escapes it", async () => {
  const { content } = await parseMail(rawMail(headers, "First <b>line</b>\r\nSecond\r\n\r\nThird"));

  expect(content.body).toBe("<p>First &lt;b&gt;line&lt;/b&gt;<br>Second</p><p>Third</p>");
});

test("keeps the structure of HTML but removes active content and attributes", async () => {
  const html = [
    "<html><head><title>Hidden</title><style>p{color:red}</style></head><body>",
    '<p style="color:red" onclick="alert(1)">Text <strong>bold</strong></p>',
    '<script>alert(1)</script><img src="https://tracker.example/pixel.gif">',
    "</body></html>",
  ].join("");

  const { content } = await parseMail(
    rawMail([...headers, "Content-Type: text/html; charset=utf-8"], html),
  );

  expect(content.body).toBe("<p>Text <strong>bold</strong></p>");
});

test("falls back to shortened text when the body exceeds the limit", async () => {
  const text = "<&>".repeat(activityLimits.emailBodyLength);

  const { content } = await parseMail(rawMail(headers, text));

  expect(content.body.length).toBeLessThanOrEqual(activityLimits.emailBodyLength);
  expect(content.body.startsWith("<p>&lt;&amp;&gt;")).toBe(true);
});

test("shortens headers to the limit of an email attachment", async () => {
  const { content } = await parseMail(
    rawMail([`Subject: ${"a".repeat(activityLimits.emailHeaderLength + 10)}`], "Hello"),
  );

  expect(content.subject).toHaveLength(activityLimits.emailHeaderLength);
});

test("counts attachments but not inline images", async () => {
  const body = [
    "--b",
    "Content-Type: text/plain",
    "",
    "Hello",
    "--b",
    'Content-Type: application/pdf; name="offer.pdf"',
    'Content-Disposition: attachment; filename="offer.pdf"',
    "",
    "PDF",
    "--b",
    "Content-Type: image/png",
    "Content-Disposition: inline",
    "Content-ID: <logo>",
    "",
    "PNG",
    "--b--",
  ].join("\r\n");

  const { content } = await parseMail(
    rawMail([...headers, 'Content-Type: multipart/mixed; boundary="b"'], body),
  );

  expect(content.attachmentCount).toBe(1);
});

test("copes with an email without any headers or content", async () => {
  const { messageId, content } = await parseMail(Buffer.from("\r\n"));

  expect(messageId).toBeUndefined();
  expect(content).toEqual({
    subject: "",
    from: "",
    to: "",
    sentAt: null,
    body: "",
    attachmentCount: 0,
  });
});

test("collects the emails it refers to", async () => {
  const { referencedMessageIds } = await parseMail(
    rawMail(
      [
        ...headers,
        "In-Reply-To: <reply@example.com>",
        "References: <a@example.com> <b@example.com>",
      ],
      "Hello",
    ),
  );

  expect(referencedMessageIds).toEqual([
    "<reply@example.com>",
    "<a@example.com>",
    "<b@example.com>",
  ]);
});

test("has no references for a new conversation", async () => {
  const { referencedMessageIds } = await parseMail(rawMail(headers, "Hello"));

  expect(referencedMessageIds).toEqual([]);
});
