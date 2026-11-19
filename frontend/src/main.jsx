import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import '@/assets/styles/index.css'

// Daftarkan service worker PWA (auto update saat ada versi baru)
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
