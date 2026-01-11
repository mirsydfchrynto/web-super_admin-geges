import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['ivon.png'],
          manifest: {
            name: 'Geges Smart Barber - Super Admin',
            short_name: 'Geges Admin',
            description: 'Super Admin Portal for Geges Smart Barber Ecosystem',
            theme_color: '#000000',
            background_color: '#000000',
            display: 'standalone',
            orientation: 'portrait',
            icons: [
              {
                src: 'ivon.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'ivon.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: 'ivon.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          }
        })
      ],
      define: {
        // 'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion', '@reduxjs/toolkit', 'react-redux', 'lucide-react', 'react-hot-toast']
            }
          }
        }
      }
    };
});
