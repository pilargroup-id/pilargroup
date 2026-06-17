import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      // VitePWA({
      //   registerType: 'autoUpdate',
      //   includeAssets: ['favicon-pwa.png', 'apple-touch-icon-pwa.png'],
      //   manifest: {
      //     name: 'Pilargroup Dashboard IT',
      //     short_name: 'Pilargroup',
      //     description: 'Internal dashboard PT. Pilar Niaga Makmur.',
      //     lang: 'id',
      //     theme_color: '#1f4e8c',
      //     background_color: '#f7fbff',
      //     display: 'standalone',
      //     scope: '/',
      //     start_url: '/',
      //     icons: [
      //       {
      //         src: 'pwa-192x192.png',
      //         sizes: '192x192',
      //         type: 'image/png',
      //         purpose: 'any',
      //       },
      //       {
      //         src: 'pwa-512x512.png',
      //         sizes: '512x512',
      //         type: 'image/png',
      //         purpose: 'any',
      //       },
      //       {
      //         src: 'maskable-192x192.png',
      //         sizes: '192x192',
      //         type: 'image/png',
      //         purpose: 'maskable',
      //       },
      //       {
      //         src: 'maskable-512x512.png',
      //         sizes: '512x512',
      //         type: 'image/png',
      //         purpose: 'maskable',
      //       },
      //     ],
      //   },
      //   workbox: {
      //     cleanupOutdatedCaches: true,
      //     clientsClaim: true,
      //     skipWaiting: true,
      //     navigateFallbackDenylist: [/^\/saml\//],
      //   },
      // }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET,
          changeOrigin: true,
        },
      },
    },
  }
})
