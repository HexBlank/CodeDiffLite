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
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 编辑器核心单独打包；各语言包由 lib/codemirror.ts 动态导入，自动拆分
          if (
            /node_modules\/@codemirror\/(state|view|language|commands|search|autocomplete|merge)\//.test(id) ||
            /node_modules\/@lezer\/(common|highlight|lr)\//.test(id) ||
            id.includes('node_modules/style-mod') ||
            id.includes('node_modules/w3c-keyname') ||
            id.includes('node_modules/crelt')
          ) {
            return 'codemirror'
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
