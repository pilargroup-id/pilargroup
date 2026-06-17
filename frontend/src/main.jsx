import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import '@/assets/styles/index.css'

async function initApp() {
  // Unregister SW lama dulu, tunggu selesai
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((reg) => reg.unregister()))
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }

  // Baru register SW baru
  registerSW({ immediate: true })

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

initApp()