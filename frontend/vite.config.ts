import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,       // Docker içinden dışarıya erişim için 0.0.0.0
    port: 5173,
    watch: {
      usePolling: true,  // Docker volume'larında hot reload
    },
    hmr: {
      overlay: false
    }
  },
  logLevel: 'info', // URL bilgisini ve info loglarını göster
})
