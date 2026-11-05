import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      // Keep API requests and session cookies on the browser's current origin.
      "/api": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
});
