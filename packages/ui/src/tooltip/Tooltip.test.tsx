import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vite-plus/test";
import { Button } from "../button/Button.tsx";
import { Tooltip } from "./Tooltip.tsx";

test("shows the label while the trigger is hovered", async () => {
  render(
    <Tooltip label="Saves your changes">
      <Button>Save</Button>
    </Tooltip>,
  );

  expect(screen.queryByText("Saves your changes")).not.toBeInTheDocument();

  await userEvent.hover(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Saves your changes")).toBeInTheDocument();
});
