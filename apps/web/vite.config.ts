import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test-setup.ts"],
    env: {
      VITE_API_URL: "http://api.test",
      VITE_STASH_URL: "http://stash.test",
      VITE_APP_VERSION: "1.2.3",
    },
  },
});
