import { generateJSON } from "@tiptap/react";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { createElement, useMemo } from "react";
import { richTextExtensions } from "./extensions.ts";
import styles from "./prose.module.css";

export interface RichTextProps {
  html: string;
  headingLevel?: 3 | 4;
}

export function RichText({ html, headingLevel = 4 }: RichTextProps) {
  const content = useMemo(
    () =>
      renderToReactElement({
        extensions: richTextExtensions,
        content: generateJSON(html, richTextExtensions),
        options: {
          nodeMapping: {
            heading: ({ children }) => createElement(`h${headingLevel}`, null, children),
          },
        },
      }),
    [html, headingLevel],
  );

  return <div className={styles.prose}>{content}</div>;
}
