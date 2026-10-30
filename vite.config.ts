import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["apps/api/drizzle/**"],
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
    overrides: [
      {
        files: ["apps/web/**", "apps/extension/**", "packages/ui/**"],
        plugins: ["react", "jsx-a11y"],
      },
    ],
  },
  test: {
    projects: ["apps/*/vite.config.ts", "packages/*/vite.config.ts", "tools/*/vite.config.ts"],
  },
  run: {
    cache: true,
    tasks: {
      release: { command: "node tools/release/src/release.ts", cache: false },
    },
  },
});
