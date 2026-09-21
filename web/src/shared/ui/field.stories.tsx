import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Field, FieldGroup, FieldLabel } from "./field";
import { Input } from "./input";

const meta = {
  component: Field,
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="story-field">Label</FieldLabel>
        <Input id="story-field" />
      </Field>
    </FieldGroup>
  ),
};
