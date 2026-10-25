import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA: instalable y con caché solo de los archivos del build. Las respuestas de
    // Supabase (datos personales) nunca se guardan: no hay `runtimeCaching`.
    // El service worker solo existe en `npm run build`; en `npm run dev` no se registra.
    VitePWA({
      // La versión nueva espera a que la persona pulse "Actualizar" (ActualizacionApp.tsx).
      registerType: 'prompt',
      injectRegister: false,
      // Los íconos ya entran por `globPatterns`; así no se precachean dos veces.
      includeManifestIcons: false,
      manifest: {
        id: '/',
        name: 'Puriqay',
        short_name: 'Puriqay',
        description: 'Gestión de voluntariado de Puriqay: jornadas, asistencias y perfil.',
        lang: 'es-PE',
        // Con sesión abre directo en Inicio; sin sesión, Dashboard manda al login.
        // ("/" también llegaría al panel, pero mostrando el login un instante.)
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        theme_color: '#0e7a77', // pq-teal
        background_color: '#ffffff',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        // Todas las rutas del SPA responden con index.html, como `_redirects`.
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
