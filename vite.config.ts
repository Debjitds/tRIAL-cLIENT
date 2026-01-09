import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "icons/icon-192x192.png", "icons/icon-512x512.png"],
      manifest: {
        name: "tRIAL - cLIENTS",
        short_name: "tRIAL",
        description: "Generate realistic client briefs and practice projects with AI",
        theme_color: "#6366f1",
        background_color: "#0a0a0b",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/icons/57 X 57.png",
            sizes: "57x57",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/60 X 60.png",
            sizes: "60x60",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/72 X 72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/76 X 76.png",
            sizes: "76x76",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/114 X 114.png",
            sizes: "114x114",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/120 X 120.png",
            sizes: "120x120",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/128 X 128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/144 X 144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/152 X 152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/180 X 180.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/192 X 192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/256 X 256.png",
            sizes: "256x256",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/384 X 384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/512 X 512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
