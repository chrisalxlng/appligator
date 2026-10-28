import { Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// Mod-Enter would insert a hard break, but it is the shortcut to submit the surrounding form.
const keepSubmitShortcut = Extension.create({
  name: "keepSubmitShortcut",
  priority: 1000,
  addKeyboardShortcuts: () => ({ "Mod-Enter": () => true }),
});

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
  keepSubmitShortcut,
];

export function normalizeHeadings(html: string) {
  return html.replace(/<(\/?)h[1-6]\b/gi, "<$1h2");
}
