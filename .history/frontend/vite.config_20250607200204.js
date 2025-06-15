import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis" // Fix for 'global' not being defined in Vite
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/ws": {
        target: "http://localhost:8000",
        ws: true
      },
      "/api": "http://localhost:8000"
    }
  }
});