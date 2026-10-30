import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SearchList } from "./SearchList.tsx";
import styles from "./SearchList.stories.module.css";

const jobs = ["Lead Developer Frontend", "Frontend Developer", "Junior Developer"];

function JobSearch({ status }: { status?: string }) {
  const [search, setSearch] = useState("");
  return (
    <div className={styles.container}>
      <SearchList
        items={jobs.filter((job) => job.toLowerCase().includes(search.toLowerCase()))}
        search={search}
        onSearchChange={setSearch}
        onSelect={() => {}}
        itemKey={(job) => job}
        renderItem={(job) => job}
        inputLabel="Search jobs"
        placeholder="Search jobs …"
        listLabel="Jobs"
        status={status}
      />
    </div>
  );
}

const meta = {
  title: "Components/SearchList",
  component: JobSearch,
} satisfies Meta<typeof JobSearch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithStatus: Story = {
  args: { status: "No open jobs" },
};
