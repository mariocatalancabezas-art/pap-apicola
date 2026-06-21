import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Logo/LOGO ASB.png.png', 'Logo/LOGO INDAP.png', 'favicon.svg'],
      manifest: {
        name: 'PAP Apícola - Gestión de Visitas',
        short_name: 'PAP Apícola',
        description: 'Gestión de visitas apícolas con sincronización offline',
        theme_color: '#f59e0b',
        background_color: '#fffbeb',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/login',
        icons: [
          {
            src: 'Logo/LOGO ASB.png.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'Logo/LOGO ASB.png.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          }
        ]
      }
    })
  ]
})
