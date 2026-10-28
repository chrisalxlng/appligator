import StarterKit from "@tiptap/starter-kit";

export const richTextExtensions = [
  StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    dropcursor: false,
    heading: { levels: [2] },
    horizontalRule: false,
    link: false,
    strike: false,
    trailingNode: false,
    underline: false,
  }),
];

export function normalizeHeadings(html: string) {
  return html.replace(/<(\/?)h[1-6]\b/gi, "<$1h2");
}
