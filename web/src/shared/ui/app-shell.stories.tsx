import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppShell } from "./app-shell";

const meta = {
  component: AppShell,
} satisfies Meta<typeof AppShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "会議の画面",
  },
};
