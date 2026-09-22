import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MeetingHeader } from "./meeting-header";

const meta = {
  component: MeetingHeader,
} satisfies Meta<typeof MeetingHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "新サービスの打ち合わせ",
  },
};
