import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vite-plus/test";
import { activityWith, applicationFor, createFakeApi, jobFixture } from "../testing/fakeApi.ts";
import { renderApp } from "../testing/renderApp.tsx";

const application = applicationFor(jobFixture);
const cvFileId = "6a1f0e3c-2b4d-4c5e-8f9a-0b1c2d3e4f5a";
const offerEmail = {
  kind: "email" as const,
  subject: "Unser Angebot an dich",
  from: "hr@randstad-digital.de",
  sentAt: "2026-10-30T09:00:00.000Z",
  body: "<p>Hallo, anbei unser Angebot.</p>",
};
const cv = {
  kind: "file" as const,
  fileId: cvFileId,
  name: "Lebenslauf.pdf",
  mimeType: "application/pdf",
};
const submission = activityWith({
  occurredAt: "2026-10-17T08:00:00.000Z",
  attachments: [cv, offerEmail],
});

const eml = [
  "From: Randstad HR <hr@randstad-digital.de>",
  "To: jd@example.com",
  "Subject: Einladung zum Gespräch",
  "Date: Fri, 30 Oct 2026 10:00:00 +0100",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Hallo,",
  "",
  "wir laden dich ein.",
].join("\r\n");

function renderAttachments() {
  const api = createFakeApi([jobFixture], [application], { [application.id]: [submission] });
  api.files.set(cvFileId, new Blob(["%PDF"], { type: "application/pdf" }));
  renderApp(`/applications/${application.id}`);
  return api;
}

async function findLog() {
  return screen.findByRole("region", { name: "Activities" });
}

async function editSubmission() {
  const log = await findLog();
  await userEvent.click(
    await within(log).findByRole("button", { name: /Edit Application submitted$/ }),
  );
  return screen.findByRole("dialog", { name: "Application submitted" });
}

async function chooseAttachment(form: HTMLElement, kind: "Link" | "Email" | "File") {
  await userEvent.click(within(form).getByRole("button", { name: "Add attachment" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: kind }));
}

test("shows the email and file attachments of an activity", async () => {
  renderAttachments();
  const log = await findLog();

  expect(await within(log).findByRole("button", { name: /^Lebenslauf/ })).toHaveTextContent(
    "LebenslaufPDF",
  );
  expect(within(log).getByRole("button", { name: /^Unser Angebot/ })).toHaveTextContent(
    "Unser Angebot an dichhr@randstad-digital.de",
  );
});

test("reads an email attachment in a drawer", async () => {
  renderAttachments();
  const log = await findLog();

  await userEvent.click(await within(log).findByRole("button", { name: /^Unser Angebot/ }));

  const email = await screen.findByRole("dialog", { name: "Unser Angebot an dich" });
  expect(email).toHaveTextContent("Fromhr@randstad-digital.de");
  expect(email).toHaveTextContent("SentOctober 30, 2026");
  expect(email).toHaveTextContent("Hallo, anbei unser Angebot.");
});

test("opens a file attachment in a new tab", async () => {
  const tab = { location: { href: "" }, close: vi.fn() };
  vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
  URL.createObjectURL = vi.fn(() => "blob:cv");
  const api = renderAttachments();
  const log = await findLog();

  await userEvent.click(await within(log).findByRole("button", { name: /^Lebenslauf/ }));

  await waitFor(() => expect(tab.location.href).toBe("blob:cv"));
  expect(api.stashRequests).toEqual([{ method: "GET", fileId: cvFileId }]);
});

test("explains when a file cannot be opened", async () => {
  const tab = { location: { href: "" }, close: vi.fn() };
  vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
  const api = renderAttachments();
  api.failStashWith(500);
  const log = await findLog();

  await userEvent.click(await within(log).findByRole("button", { name: /^Lebenslauf/ }));

  expect(await within(log).findByRole("alert")).toHaveTextContent(
    "The file could not be opened. Please try again.",
  );
  expect(tab.close).toHaveBeenCalled();
});

test("adds an email by hand", async () => {
  const api = renderAttachments();
  const form = await editSubmission();

  await chooseAttachment(form, "Email");
  const drawer = await screen.findByRole("dialog", { name: "Add email" });
  await userEvent.type(within(drawer).getByRole("textbox", { name: "Subject" }), "Rückfrage");
  await userEvent.type(within(drawer).getByRole("textbox", { name: "From" }), "hr@example.com");
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));
  await userEvent.click(within(form).getByRole("button", { name: "Update" }));

  await waitFor(() =>
    expect(api.requestsWith("PUT")[0]?.body?.attachments).toEqual([
      cv,
      offerEmail,
      { kind: "email", subject: "Rückfrage", from: "hr@example.com", sentAt: null, body: "" },
    ]),
  );
});

test("imports an email from an .eml file in the email drawer", async () => {
  renderAttachments();
  const form = await editSubmission();
  await chooseAttachment(form, "Email");
  const drawer = await screen.findByRole("dialog", { name: "Add email" });

  await userEvent.upload(
    within(drawer).getByLabelText("Import .eml file", { selector: "input" }),
    new File([eml], "einladung.eml", { type: "message/rfc822" }),
  );

  await waitFor(() =>
    expect(within(drawer).getByRole("textbox", { name: "Subject" })).toHaveValue(
      "Einladung zum Gespräch",
    ),
  );
  expect(within(drawer).getByRole("textbox", { name: "From" })).toHaveValue(
    "hr@randstad-digital.de",
  );
  expect(within(drawer).getByLabelText("Sent")).toHaveValue("2026-10-30T10:00");
});

test("adds dropped .eml files as emails and uploads other dropped files", async () => {
  const api = renderAttachments();
  const form = await editSubmission();

  fireEvent.drop(within(form).getByRole("button", { name: "Add attachment" }), {
    dataTransfer: {
      files: [
        new File([eml], "einladung.eml", { type: "message/rfc822" }),
        new File(["cover letter"], "Anschreiben.pdf", { type: "application/pdf" }),
      ],
    },
  });

  expect(await within(form).findByRole("button", { name: /^Anschreiben/ })).toHaveTextContent(
    "AnschreibenPDF",
  );
  expect(within(form).getByRole("button", { name: /^Einladung zum Gespräch/ })).toBeVisible();
  const [upload] = api.stashRequests;
  expect(upload).toMatchObject({ method: "POST" });
  expect(api.files.get(upload!.fileId)).toBeInstanceOf(File);

  await userEvent.click(within(form).getByRole("button", { name: "Update" }));
  await waitFor(() =>
    expect(api.requestsWith("PUT")[0]?.body?.attachments).toEqual(
      expect.arrayContaining([
        {
          kind: "email",
          subject: "Einladung zum Gespräch",
          from: "hr@randstad-digital.de",
          sentAt: "2026-10-30T09:00:00.000Z",
          body: "<p>Hallo,</p><p>wir laden dich ein.</p>",
        },
        {
          kind: "file",
          fileId: upload!.fileId,
          name: "Anschreiben.pdf",
          mimeType: "application/pdf",
        },
      ]),
    ),
  );
});

test("rejects files larger than 10 MB without uploading them", async () => {
  const api = renderAttachments();
  const form = await editSubmission();
  const largeFile = new File(["x"], "Portfolio.pdf", { type: "application/pdf" });
  Object.defineProperty(largeFile, "size", { value: 10_000_001 });

  await chooseAttachment(form, "File");
  await userEvent.upload(within(form).getByLabelText("File", { selector: "input" }), largeFile);

  expect(await within(form).findByRole("alert")).toHaveTextContent("Files can be at most 10 MB.");
  expect(api.stashRequests).toEqual([]);
});

test("explains when a file cannot be uploaded", async () => {
  const api = renderAttachments();
  api.failStashWith(422);
  const form = await editSubmission();

  await chooseAttachment(form, "File");
  await userEvent.upload(
    within(form).getByLabelText("File", { selector: "input" }),
    new File(["cv"], "CV.pdf", { type: "application/pdf" }),
  );

  expect(await within(form).findByRole("alert")).toHaveTextContent(
    "You have reached the maximum number of files.",
  );
});

test("deletes removed files after saving", async () => {
  const api = renderAttachments();
  const form = await editSubmission();

  await userEvent.click(within(form).getByRole("button", { name: "Remove Lebenslauf" }));
  expect(api.stashRequests).toEqual([]);
  await userEvent.click(within(form).getByRole("button", { name: "Update" }));

  await waitFor(() => expect(api.stashRequests).toEqual([{ method: "DELETE", fileId: cvFileId }]));
});

test("deletes uploaded files when the form is closed without saving", async () => {
  const api = renderAttachments();
  const form = await editSubmission();
  await chooseAttachment(form, "File");
  await userEvent.upload(
    within(form).getByLabelText("File", { selector: "input" }),
    new File(["cv"], "CV.pdf", { type: "application/pdf" }),
  );
  await within(form).findByRole("button", { name: /^CV/ });

  await userEvent.click(within(form).getByRole("button", { name: "Close" }));

  await waitFor(() => expect(api.files.size).toBe(1));
  expect(api.files.has(cvFileId)).toBe(true);
});

test("deletes the files of a deleted activity", async () => {
  const api = renderAttachments();
  const form = await editSubmission();

  await userEvent.click(within(form).getByRole("button", { name: "Delete" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Delete activity?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  await waitFor(() => expect(api.stashRequests).toEqual([{ method: "DELETE", fileId: cvFileId }]));
});
