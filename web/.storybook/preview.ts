import type { Preview } from "@storybook/nextjs-vite";
import { mswLoader } from "msw-storybook-addon/csf3";
import { handlers } from "../tests/msw/handlers";

const preview: Preview = {
  loaders: [mswLoader()],
  parameters: {
    nextjs: { appDirectory: true },
    a11y: { test: "error" },
    msw: handlers,
  },
};

export default preview;
