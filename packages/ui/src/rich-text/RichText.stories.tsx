import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Field } from "../field/Field.tsx";
import { RichText } from "./RichText.tsx";
import { RichTextEditor } from "./RichTextEditor.tsx";
import styles from "./RichText.stories.module.css";

const jobDescription = `<h2>Introduction</h2>
<p><strong>Initech GmbH</strong>: We build <em>enterprise software</em> since 1995.</p>
<h2>Your tasks</h2>
<ul>
  <li><p><strong>Development:</strong> Build frontend components with React.</p></li>
  <li><p><strong>Architecture:</strong> Design scalable frontend architectures.</p></li>
</ul>
<ol>
  <li><p>Apply</p></li>
  <li><p>Interview</p></li>
</ol>`;

const formatLabels = {
  bold: "Bold",
  italic: "Italic",
  heading: "Heading",
  bulletList: "Bulleted list",
  orderedList: "Numbered list",
};

function RichTextDemo({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className={styles.container}>
      <Field label="Description">
        <RichTextEditor value={value} onValueChange={setValue} formatLabels={formatLabels} />
      </Field>
      <RichText html={value} />
    </div>
  );
}

const meta = {
  title: "Components/RichText",
  component: RichTextDemo,
} satisfies Meta<typeof RichTextDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { initialValue: "" },
};

export const Formatted: Story = {
  args: { initialValue: jobDescription },
};
