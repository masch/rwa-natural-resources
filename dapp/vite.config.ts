import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/bda-rwa-natural-resources/",
  plugins: [react()],
  envPrefix: ["VITE_", "PUBLIC_"],
});
