import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
    },
    hmr: {
      overlay: false
    }
  },
  logLevel: 'info', // Set to 'warn' or 'error' if you want less terminal noise
})
