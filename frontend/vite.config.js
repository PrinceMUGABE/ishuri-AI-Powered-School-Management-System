import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    // Improve chunk splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large vendor libraries into separate chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/lab', '@emotion/react', '@emotion/styled'],
          'vendor-charts': ['chart.js', 'react-chartjs-2', 'recharts'],
          'vendor-maps': ['leaflet', 'react-leaflet'],
          'vendor-utils': ['axios', 'date-fns', 'framer-motion']
        }
      }
    },
    // Increase warning limit to reduce noise (optional)
    chunkSizeWarningLimit: 1000,
    // Generate sourcemaps for production (helpful for debugging)
    sourcemap: true
  }
})