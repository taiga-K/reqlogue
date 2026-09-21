import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Panel } from "./panel";

const meta = {
  title: "shared/Panel",
  component: Panel,
  args: {
    title: "リアルタイム文字起こし",
    children: <p>本日は受発注システムの要件を整理します。</p>,
  },
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "リアルタイム文字起こし" })).toBeVisible();
  },
};

export const WithAction: Story = {
  args: {
    actions: (
      <button type="button" disabled>
        更新中
      </button>
    ),
  },
};
