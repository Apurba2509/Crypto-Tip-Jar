import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // React fast-refresh + JSX transform
    react(),

    // Polyfill Node.js globals (Buffer, process, etc.) required by @stellar/stellar-sdk
    // Without this, stellar-sdk will throw "Buffer is not defined" in the browser
    nodePolyfills({
      // Include only what stellar-sdk actually needs
      include: ["buffer", "process", "util", "stream", "crypto"],
      globals: {
        Buffer: true,    // stellar-sdk uses Buffer extensively
        process: true,   // some deps check process.env
        global: true,    // needed by some CommonJS modules
      },
    }),
  ],

  // Ensure vite resolves these correctly even if stellar-sdk ships CommonJS
  resolve: {
    alias: {
      // Some older versions need this explicit alias
      buffer: "buffer",
    },
  },

  // Optimise dependencies that need special treatment
  optimizeDeps: {
    include: [
      "@stellar/stellar-sdk",
      "@stellar/freighter-api",
      "buffer",
    ],
  },

  // Dev server settings
  server: {
    port: 5173,
    open: true,
  },
});
