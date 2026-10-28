import { expect, test } from "vite-plus/test";
import { htmlToText } from "./htmlToText.ts";

test("keeps the structure of paragraphs, headings and lists as plain text", () => {
  const html =
    "<h2>About us</h2><p>We build <strong>software</strong>.<br>Join us!</p>" +
    "<ul><li><p>TypeScript</p></li><li><p>React</p></li></ul>";

  expect(htmlToText(html)).toBe(
    "About us\nWe build software.\nJoin us!\n\n- TypeScript\n\n- React",
  );
});

test("decodes HTML entities", () => {
  expect(htmlToText("<p>R&amp;D &lt;3 &quot;caf&#233;&quot; &#x1F600;&nbsp;&unknown;</p>")).toBe(
    'R&D <3 "café" 😀 &unknown;',
  );
});

test("keeps invalid numeric entities", () => {
  expect(htmlToText("<p>&#99999999;</p>")).toBe("&#99999999;");
});
