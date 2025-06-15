import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis" // Fix for 'global' not being defined in Vite
  },
  server: {
    https: {
      key: "../certs/192.168.215.1+255-key.pem",
      cert: "../certs/192.168.215.1+255.pem"
    },
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/ws": {
        target: "https://localhost:8000",
        ws: true
      },
      "/api": "https://localhost:8000"
    }
  }
});