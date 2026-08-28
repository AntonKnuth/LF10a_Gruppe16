import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Installierbar sein ist kein Komfort: Safari löscht Website-Daten nach ~7 Tagen
      // Nichtnutzung, aber nicht bei einer vom Homescreen gestarteten PWA.
      manifest: {
        name: 'TravelKickers',
        short_name: 'TravelKickers',
        description: 'Schreibmotorik-Training im Fußballverein',
        lang: 'de',
        start_url: '/',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#7ec8f0',
        theme_color: '#7ec8f0',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
