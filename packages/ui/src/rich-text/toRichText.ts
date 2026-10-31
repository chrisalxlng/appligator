import { generateHTML, generateJSON, type JSONContent } from "@tiptap/react";
import { normalizeHeadings, richTextExtensions } from "./extensions.ts";

function hasText(node: JSONContent): boolean {
  if (node.type === "text") return Boolean(node.text?.trim());
  return node.content?.some(hasText) ?? false;
}

/** Reduces any HTML, e.g. of an email, to the rich text the editor supports, without empty paragraphs. */
export function toRichText(html: string) {
  const document = generateJSON(normalizeHeadings(html), richTextExtensions);
  return generateHTML(
    { ...document, content: document.content?.filter(hasText) ?? [] },
    richTextExtensions,
  );
}
