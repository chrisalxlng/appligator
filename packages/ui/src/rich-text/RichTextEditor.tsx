import { BubbleMenu } from "@tiptap/react/menus";
import { EditorContent, posToDOMRect, useEditor, useEditorState, type Editor } from "@tiptap/react";
import {
  IconBold,
  IconHeading,
  IconItalic,
  IconList,
  IconListNumbers,
  type Icon,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFieldLabelId } from "../field/Field.tsx";
import { Tooltip } from "../tooltip/Tooltip.tsx";
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

const formatMenuKey = "formatMenu";

type MenuPlacement = "top" | "bottom";

function selectionRect(editor: Editor) {
  const { from, to } = editor.state.selection;
  return posToDOMRect(editor.view, from, to);
}

function selectionReference(editor: Editor) {
  const rect = selectionRect(editor);
  const { node } = editor.view.domAtPos(editor.state.selection.from);

  // The context element lets Floating UI hide the menu once the selection is scrolled out of view.
  return {
    getBoundingClientRect: () => rect,
    getClientRects: () => [rect],
    contextElement: node instanceof Element ? node : (node.parentElement ?? undefined),
  };
}

function FormatMenu({ editor, labels }: { editor: Editor; labels: RichTextEditorLabels }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [lockedPlacement, setLockedPlacement] = useState<MenuPlacement | null>(null);
  const getReference = useCallback(() => selectionReference(editor), [editor]);

  // Floating UI may flip the menu below the selection when it opens, but flipping while
  // scrolling makes the menu jump, so the side it opened on is kept until it closes.
  const options = useMemo(() => {
    const lockPlacement = () => {
      const menu = menuRef.current;
      if (!menu) return;
      const opensAbove = menu.getBoundingClientRect().top < selectionRect(editor).top;
      setLockedPlacement(opensAbove ? "top" : "bottom");
    };

    return {
      placement: lockedPlacement ?? "top",
      flip: lockedPlacement === null,
      offset: 8,
      hide: true,
      onUpdate: lockPlacement,
      onHide: () => setLockedPlacement(null),
    };
  }, [editor, lockedPlacement]);

  useEffect(() => {
    // The bubble menu only follows window scrolling, but the editor and the drawer scroll on their own.
    const updatePosition = () =>
      editor.view.dispatch(editor.state.tr.setMeta(formatMenuKey, "updatePosition"));
    document.addEventListener("scroll", updatePosition, { capture: true });
    return () => document.removeEventListener("scroll", updatePosition, { capture: true });
  }, [editor]);

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
      icon: IconHeading,
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
      ref={menuRef}
      editor={editor}
      pluginKey={formatMenuKey}
      getReferencedVirtualElement={getReference}
      className={styles.menu}
      role="toolbar"
      options={options}
    >
      {formats.map(({ key, icon: FormatIcon, toggle }) => (
        <Tooltip key={key} label={labels[key]}>
          <button
            type="button"
            className={styles.format}
            aria-label={labels[key]}
            aria-pressed={active[key]}
            onClick={toggle}
          >
            <FormatIcon size={18} stroke={2.2} aria-hidden />
          </button>
        </Tooltip>
      ))}
    </BubbleMenu>
  );
}
