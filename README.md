# food-waste

Svelte app that displays food waste clearances from the Salling Group API in a sortable, searchable, filterable table.

## Architecture

The Salling API does not allow direct browser requests (CORS). To keep the bearer token off the browser entirely, two different proxies are used depending on environment:

| Environment | Proxy | Token location |
|---|---|---|
| Local dev | Vite dev server (`/api/food-waste`) | `token.txt` (gitignored) |
| Production | Cloudflare Worker | CF Worker secret |

## Local development

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Make sure `token.txt` exists in the project root containing your API bearer token (one line, no quotes). This file is gitignored and never committed.

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173).

The Vite dev server automatically proxies requests to the Salling API and injects the auth header — the token is never sent to the browser.

## Production build

```bash
npm run build   # output goes to dist/
npm run preview # preview the built app locally
```

## Cloudflare Worker setup (required for production)

The production app calls a Cloudflare Worker that proxies the Salling API request with the bearer token stored as a Worker secret.

1. Install Wrangler (CF's CLI):
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. Add the bearer token as a Worker secret:
   ```bash
   wrangler secret put API_TOKEN
   # paste your token when prompted
   ```

3. Deploy the worker:
   ```bash
   wrangler deploy worker/index.js --name food-waste-proxy --compatibility-date 2024-01-01
   ```

4. Copy the worker URL shown (e.g. `https://food-waste-proxy.<subdomain>.workers.dev`).

5. Add it as a GitHub repo secret named `API_WORKER_URL`:
   Repo → Settings → Secrets and variables → Actions → New repository secret

## Deployment (GitHub Pages)

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds and deploys automatically using the `API_WORKER_URL` secret.

**One-time GitHub Pages setup:**

1. Repo → Settings → Pages → Source → **GitHub Actions**
2. Replace `yourdomain.com` in `public/CNAME` with your actual domain
3. Add a CNAME DNS record in Cloudflare pointing your domain to `<your-github-username>.github.io`
4. Cloudflare SSL mode: set to **Full** (not Full strict), or set the record to **DNS only** to avoid cert conflicts with GitHub Pages
