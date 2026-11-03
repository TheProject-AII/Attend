import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        navigateFallback: "/index.html",
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: [
        "favicon.svg",
        "icons.svg",
        "tapin.png",
        "icon_pride.png",
      ],
      manifest: {
        id: "/",
        name: "So-Mak Attendance",
        short_name: "Attend",
        description: "Aplikasi Absensi",
        theme_color: "#0d439a",
        background_color: "#ffffff",
        display: "standalone",
        prefer_related_applications: false,
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/tapin.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon_pride.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon_pride.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
