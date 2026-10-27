import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import '@fontsource-variable/albert-sans'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/fira-code'
import './index.css'
import { installViewportHeight } from './lib/viewport'

installViewportHeight()

// iOS Safari 在聚焦字号小于 16px 的输入框时会自动放大页面。
// 只在 iOS 上加 maximum-scale=1：iOS 仍允许双指缩放，而 Android 不受影响。
if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
  const viewport = document.querySelector('meta[name="viewport"]')
  viewport?.setAttribute('content', `${viewport.getAttribute('content')}, maximum-scale=1`)
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
