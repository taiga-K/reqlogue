import { defineConfig } from "steiger";
import fsd from "@feature-sliced/steiger-plugin";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Next.js App Router reserves `app` and `pages`. FSD layers are `_app` /
    // `_pages` per https://fsd.how/ja/docs/guides/tech/with-nextjs/
    rules: {
      "fsd/typo-in-layer-name": "off",
    },
  },
]);
