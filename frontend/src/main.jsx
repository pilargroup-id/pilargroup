import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import '@/assets/styles/index.css'

// Matikan semua service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister())
  })
  caches.keys().then((keys) => {
    keys.forEach((key) => caches.delete(key))
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)