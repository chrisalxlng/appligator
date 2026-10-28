import { defineConfig } from "vite-plus";

function drizzleKit(command: string) {
  return `node --env-file-if-exists=.env.development node_modules/drizzle-kit/bin.cjs ${command}`;
}

export default defineConfig({
  pack: {
    entry: ["src/server.ts"],
    platform: "node",
    deps: {
      alwaysBundle: ["@appligator/shared"],
    },
  },
  run: {
    tasks: {
      "db:generate": { command: drizzleKit("generate"), cache: false },
      "db:migrate": { command: drizzleKit("migrate"), cache: false },
    },
  },
});
