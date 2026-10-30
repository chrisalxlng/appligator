import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite-plus";

// The public key pins the extension ID, which the Keycloak client allows as redirect URI.
const publicKey =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtxjhM2ICeggefn1GkZbI+4uWbjqOKtb9cwHvfYhabhyYcfdAZ1glrdoG0txaU9Vs2S+JBXhXsgINezCKsAl4v3J3g11L40DYyjpoAbAnoKjkROKk4zikvHt06GXvJ/l08pNGCQsWQexqradevpG2arU5Zm8ukURm4eM41nLPro5+xg4Slz+HN7+gM4Md+eeGfa8rz4p68xE3Kcgu5CbPOpzBKbRZYSX4zLlZnnsk7MdLIIBwbeX3cQ0b3UVHFV5rB3Y2U+yWW8xmz069cB/INDzWObiKVkTmteK78iJ0PFqDpzTEWY5dxMsGuGGz3seoShqGpx31C11OTFN2sLFsDQIDAQAB";

const icons = {
  16: "icons/icon-16.png",
  32: "icons/icon-32.png",
  48: "icons/icon-48.png",
  128: "icons/icon-128.png",
};

function manifest(env: Record<string, string>): Plugin {
  return {
    name: "manifest",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify({
          manifest_version: 3,
          name: "Appligator",
          version: env.VITE_APP_VERSION,
          description: "Import job ads into Appligator with one click.",
          key: publicKey,
          icons,
          action: { default_popup: "popup.html", default_icon: icons },
          background: { service_worker: "background.js", type: "module" },
          permissions: ["activeTab", "scripting", "storage"],
          host_permissions: [`${env.VITE_API_URL}/*`, `${env.VITE_KEYCLOAK_URL}/*`],
          web_accessible_resources: [
            { resources: ["auth-callback.html"], matches: [`${env.VITE_KEYCLOAK_URL}/*`] },
          ],
        }),
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), manifest(loadEnv(mode, import.meta.dirname))],
  build: {
    rollupOptions: {
      input: {
        popup: "popup.html",
        authCallback: "auth-callback.html",
        background: "src/background/background.ts",
      },
      output: {
        entryFileNames: ({ name }) =>
          name === "background" ? "background.js" : "assets/[name]-[hash].js",
      },
    },
  },
  test: {
    env: loadEnv("development", import.meta.dirname),
    environment: "jsdom",
    setupFiles: ["./test-setup.ts"],
  },
}));
