import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fs from 'fs'

export default defineConfig(() => {
  // Token is only used by the local dev proxy — it is never sent to the browser.
  // In production the Cloudflare Worker holds the token as a secret.
  let apiToken = process.env.VITE_API_TOKEN
  if (!apiToken) {
    try {
      apiToken = fs.readFileSync('token.txt', 'utf-8').trim()
    } catch {
      console.warn('[food-waste] No token found. Create token.txt or set VITE_API_TOKEN.')
    }
  }

  // In production the frontend calls the Cloudflare Worker URL.
  // Set VITE_API_URL as a GitHub secret so the workflow bakes the right URL into the bundle.
  const apiUrl = process.env.VITE_API_URL || '/api/food-waste'

  return {
    plugins: [svelte()],
    base: '/',
    define: {
      // URL the browser will call. In dev this is the local proxy path; in prod it is the CF Worker URL.
      __API_URL__: JSON.stringify(apiUrl),
    },
    server: {
      proxy: {
        // Proxy /api/food-waste → Salling API, injecting the auth header server-side.
        // This avoids both the CORS restriction and sending the token to the browser.
        '/api/food-waste': {
          target: 'https://api.sallinggroup.com',
          changeOrigin: true,
          rewrite: () => '/v1/food-waste/6ba6a678-77c9-4368-910f-b65c421ae59a',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (apiToken) proxyReq.setHeader('Authorization', `Bearer ${apiToken}`)
            })
          },
        },
      },
    },
  }
})
