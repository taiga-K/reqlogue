import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MeetingNameField } from "./MeetingNameField";

const meta = {
  component: MeetingNameField,
  tags: ["autodocs"],
} satisfies Meta<typeof MeetingNameField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
