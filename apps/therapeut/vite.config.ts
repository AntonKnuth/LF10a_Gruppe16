import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Der Server liefert diese App unter /therapeut/ aus, die Kind-App unter /.
  // Eine Origin für alles: dadurch funktioniert das Anmelde-Cookie ohne CORS.
  base: '/therapeut/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../api/wwwroot/therapeut',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    // Auch beim Entwickeln dieselbe Origin wie später — sonst schickt der Browser das
    // Cookie nicht mit und man baut CORS ein, das in Produktion niemand braucht.
    proxy: { '/api': 'http://localhost:5099' },
  },
})
