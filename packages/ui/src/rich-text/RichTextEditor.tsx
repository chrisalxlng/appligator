import { BubbleMenu } from "@tiptap/react/menus";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import {
  IconBold,
  IconH2,
  IconItalic,
  IconList,
  IconListNumbers,
  type Icon,
} from "@tabler/icons-react";
import { useEffect } from "react";
import { useFieldLabelId } from "../field/Field.tsx";
import { normalizeHeadings, richTextExtensions } from "./extensions.ts";
import controlStyles from "../field/control.module.css";
import proseStyles from "./prose.module.css";
import styles from "./RichTextEditor.module.css";

export interface RichTextEditorLabels {
  bold: string;
  italic: string;
  heading: string;
  bulletList: string;
  orderedList: string;
}

export interface RichTextEditorProps {
  value: string;
  onValueChange: (value: string) => void;
  formatLabels: RichTextEditorLabels;
  "aria-label"?: string;
}

function toValue(editor: Editor) {
  return editor.isEmpty ? "" : editor.getHTML();
}

export function RichTextEditor({
  value,
  onValueChange,
  formatLabels,
  "aria-label": ariaLabel,
}: RichTextEditorProps) {
  const labelId = useFieldLabelId();
  const editor = useEditor({
    extensions: richTextExtensions,
    content: value,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        ...(ariaLabel ? { "aria-label": ariaLabel } : labelId && { "aria-labelledby": labelId }),
        class: `${controlStyles.control} ${proseStyles.prose} ${styles.editor}`,
      },
      transformPastedHTML: normalizeHeadings,
    },
    onUpdate: ({ editor }) => onValueChange(toValue(editor)),
  });

  useEffect(() => {
    if (toValue(editor) !== value) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  return (
    <>
      <EditorContent editor={editor} />
      <FormatMenu editor={editor} labels={formatLabels} />
    </>
  );
}

function FormatMenu({ editor, labels }: { editor: Editor; labels: RichTextEditorLabels }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      heading: editor.isActive("heading"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
    }),
  });

  const formats: { key: keyof RichTextEditorLabels; icon: Icon; toggle: () => void }[] = [
    { key: "bold", icon: IconBold, toggle: () => editor.chain().focus().toggleBold().run() },
    { key: "italic", icon: IconItalic, toggle: () => editor.chain().focus().toggleItalic().run() },
    {
      key: "heading",
      icon: IconH2,
      toggle: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      key: "bulletList",
      icon: IconList,
      toggle: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      key: "orderedList",
      icon: IconListNumbers,
      toggle: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <BubbleMenu
      editor={editor}
      className={styles.menu}
      role="toolbar"
      options={{ placement: "top", offset: 8 }}
    >
      {formats.map(({ key, icon: FormatIcon, toggle }) => (
        <button
          key={key}
          type="button"
          className={styles.format}
          aria-label={labels[key]}
          aria-pressed={active[key]}
          onClick={toggle}
        >
          <FormatIcon size={18} stroke={2.2} aria-hidden />
        </button>
      ))}
    </BubbleMenu>
  );
}
