import { defineConfig } from "steiger";
import fsd from "@feature-sliced/steiger-plugin";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Next.js App Router occupies `app/`, so the FSD pages layer is `_pages`.
    files: ["./src/_pages/**"],
    rules: {
      "fsd/typo-in-layer-name": "off",
    },
  },
]);
