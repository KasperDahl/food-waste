/**
 * Cloudflare Worker — Salling Food Waste API proxy
 *
 * Forwards requests to the Salling API and injects the bearer token from a
 * Worker secret (API_TOKEN), so the token is never exposed to the browser.
 *
 * Deploy steps:
 *   1. Install Wrangler: npm install -g wrangler
 *   2. Login:            wrangler login
 *   3. Add the secret:   wrangler secret put API_TOKEN   (paste your bearer token)
 *   4. Deploy:           wrangler deploy worker/index.js --name food-waste-proxy --compatibility-date 2024-01-01
 *   5. Copy the worker URL (e.g. https://food-waste-proxy.<your-subdomain>.workers.dev)
 *      and add it as a GitHub secret named API_WORKER_URL.
 */

const SALLING_URL =
  'https://api.sallinggroup.com/v1/food-waste/6ba6a678-77c9-4368-910f-b65c421ae59a'

export default {
  async fetch(request, env) {
    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 })
    }

    const response = await fetch(SALLING_URL, {
      headers: { Authorization: `Bearer ${env.API_TOKEN}` },
    })

    if (!response.ok) {
      return new Response(response.statusText, { status: response.status })
    }

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        // Allow the GitHub Pages origin (and localhost in dev) to call this worker.
        'Access-Control-Allow-Origin': '*',
      },
    })
  },
}
