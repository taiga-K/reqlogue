// Next.js 16+: flat imports. Verified against setup-frontend 2026-09-12 notes.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "storybook-static/**",
      "public/**",
      "next-env.d.ts",
      "steiger.config.ts",
      "playwright.config.ts",
      "vitest.config.ts",
      ".storybook/**",
      "scripts/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "react/forbid-dom-props": ["error", { forbid: ["style"] }],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@astryxdesign/core",
              message: "Import from a subpath entry (e.g. @astryxdesign/core/Button), not the package root.",
            },
          ],
        },
      ],
    },
  },
);
