import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // NEXT_PUBLIC_ kept so .env files written for the retired Next.js app keep
  // working. Only browser-safe values may use either prefix.
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:3000",
    },
  },
});
