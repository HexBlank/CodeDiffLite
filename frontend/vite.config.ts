import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

const shouldAnalyzeBundle = process.env.ANALYZE_BUNDLE === 'true'

export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    shouldAnalyzeBundle ? visualizer({ open: false, filename: 'stats.html' }) : null,
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../static-react',
    emptyOutDir: true,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('@monaco-editor/react') ||
            id.includes('@monaco-editor/loader')
          ) {
            return 'monaco-react'
          }

          if (
            id.includes('monaco-editor/esm/vs/basic-languages/') ||
            id.includes('monaco-editor/esm/vs/language/json/')
          ) {
            return 'monaco-languages'
          }

          if (id.includes('monaco-editor/esm/vs/editor/')) {
            return 'monaco-editor'
          }

          if (
            id.includes('monaco-editor/esm/vs/base/') ||
            id.includes('monaco-editor/esm/vs/platform/')
          ) {
            return 'monaco-core'
          }

          if (id.includes('node_modules/d3') || id.includes('node_modules/d3-')) {
            return 'vendor-d3'
          }

          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }

          if (id.includes('node_modules/@radix-ui') || id.includes('node_modules/lucide-react')) {
            return 'vendor-ui'
          }

        },
      },
    },
  },
})
