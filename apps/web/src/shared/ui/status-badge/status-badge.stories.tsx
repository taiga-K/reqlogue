import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { StatusBadge } from "./status-badge";

const meta = {
  title: "shared/StatusBadge",
  component: StatusBadge,
  args: { status: "live" },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Live: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("会議中")).toBeVisible();
  },
};

export const Idle: Story = { args: { status: "idle" } };
export const Ended: Story = { args: { status: "ended" } };
export const Degraded: Story = { args: { status: "degraded" } };
