import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Der Server liefert die gebaute App aus. Eine Origin für Kind-App, Therapeuten-App und
    // API — dadurch gibt es kein CORS und keine zweite Adresse, die auf dem Tablet eingetragen
    // werden müsste.
    outDir: '../api/wwwroot',
    // NICHT leeren: unter wwwroot/therapeut/ liegt die andere App. Aufgeräumt wird in start.ps1.
    emptyOutDir: false,
  },
  server: {
    port: 5173,
    // Auch beim Entwickeln dieselbe Origin wie später.
    proxy: { '/api': 'http://localhost:5099' },
  },
})
