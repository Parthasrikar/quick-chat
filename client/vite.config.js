import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import tailwindScrollbar from 'tailwind-scrollbar'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Allow external access
    port: 5173, // Change if needed
    strictPort: true, // Ensures the exact port is used
    cors: true, // Enable CORS
    hmr: {
      host: "rnatm-2409-4070-4ec9-859f-9c53-ae2-8fda-e9ed.a.free.pinggy.link", // Allow HMR on the external host
    },
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 4173,
    allowedHosts: 'all' // This fixes the blocked host error
  }
})