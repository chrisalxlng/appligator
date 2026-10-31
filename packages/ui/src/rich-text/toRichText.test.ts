import { expect, test } from "vite-plus/test";
import { toRichText } from "./toRichText.ts";

test("keeps paragraphs and line breaks but keeps supported formatting but drops other markup and empty paragraphs", () => {
  const html = `
    <style>p { color: red; }</style>
    <p class="MsoNormal" style="margin: 0">Hallo,</p>
    <p>&nbsp;</p>
    <p>vielen <span style="font-weight: bold">Dank</span>.<br>Bis bald</p>
    <table><tr><td>Tel.: 123</td></tr></table>
  `;

  expect(toRichText(html)).toBe(
    "<p>Hallo,</p><p>vielen <strong>Dank</strong>.<br>Bis bald</p><p>Tel.: 123</p>",
  );
});
