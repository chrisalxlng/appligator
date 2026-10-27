import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/server.ts"],
    platform: "node",
    deps: {
      alwaysBundle: ["@appligator/shared"],
    },
  },
});
