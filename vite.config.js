import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        id: "/",
        name: "FreeCode — Website to Code",
        short_name: "FreeCode",
        description: "Inspect and export accessible website code for free.",
        theme_color: "#07110d",
        background_color: "#07110d",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest,woff2}"],
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true
      }
    })
  ],
  server: { host: "0.0.0.0" }
});