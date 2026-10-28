import { generateJSON } from "@tiptap/react";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { useMemo } from "react";
import { richTextExtensions } from "./extensions.ts";
import styles from "./prose.module.css";

export interface RichTextProps {
  html: string;
}

export function RichText({ html }: RichTextProps) {
  const content = useMemo(
    () =>
      renderToReactElement({
        extensions: richTextExtensions,
        content: generateJSON(html, richTextExtensions),
      }),
    [html],
  );

  return <div className={styles.prose}>{content}</div>;
}
