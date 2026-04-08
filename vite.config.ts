import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
            manifest: {
                name: "CSC '23",
                short_name: "CSC '23",
                description: 'A quiz application for CS students',
                start_url: '/',
                display: 'standalone',
                orientation: 'any',
                background_color: '#000000',
                theme_color: '#000000',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            },
            workbox: {
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: true,
                maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf,eot}'],
                runtimeCaching: [
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/api'),
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*$/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'supabase-rest-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 6 // 6 hours
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*$/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'supabase-public-storage',
                            expiration: {
                                maxEntries: 150,
                                maxAgeSeconds: 60 * 60 * 24 * 30
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/api\.dicebear\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'dicebear-avatars-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24 * 30 // <== 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/ucarecdn\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'external-images',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ]
            }
        })
    ],
    build: {
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                passes: 3
            },
            mangle: {
                toplevel: true,
            },
            format: {
                comments: false,
                beautify: false
            }
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
                    ui: ['framer-motion', 'clsx', 'tailwind-merge'],
                    utils: ['katex', 'marked', 'dompurify', '@supabase/supabase-js']
                }
            }
        }
    }
})
