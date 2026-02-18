# corsx - CORS Proxy (Cloudflare Workers)

corsx is a lightweight CORS proxy running on Cloudflare's edge network. Helps client-side JavaScript fetch content from any URL without CORS restrictions.

## Live Demo

**[https://corsx.YOUR_SUBDOMAIN.workers.dev](https://corsx.YOUR_SUBDOMAIN.workers.dev)**

## Usage

```javascript
const proxyUrl = "https://corsx.YOUR_SUBDOMAIN.workers.dev/proxy";
const targetUrl = "https://api.example.com/data";

const response = await fetch(
  `${proxyUrl}?url=${encodeURIComponent(targetUrl)}`,
);
const data = await response.json();
```

## Deploy Your Own

1. Install Wrangler CLI:

   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:

   ```bash
   wrangler login
   ```

3. Clone and deploy:
   ```bash
   git clone https://github.com/YOUR_USERNAME/corsx
   cd corsx
   wrangler deploy
   ```

That's it. You'll get a URL like `https://corsx.YOUR_SUBDOMAIN.workers.dev`.

## Endpoints

| Endpoint                | Description                                 |
| ----------------------- | ------------------------------------------- |
| `GET /`                 | Landing page with docs and interactive demo |
| `GET /proxy?url=<url>`  | Proxy a request                             |
| `POST /proxy?url=<url>` | Proxy a POST request (body forwarded)       |
| `GET /health`           | Health check                                |

## Features

- **Fast** — Runs on Cloudflare's global edge network
- **Free** — 100k requests/day on free tier
- **SSRF Protection** — Blocks internal/private IPs
- **Full CORS** — All the right headers, preflight handled
- **POST Support** — Forwards request body

## Response Headers

Added to all proxied responses:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
X-Proxied-By: corsx
X-Original-URL: <original-url>
```

## Local Development

```bash
wrangler dev
```

Opens a local server at `http://localhost:8787`.

## Custom Domain

Edit `wrangler.toml`:

```toml
routes = [
  { pattern = "cors.yourdomain.com", custom_domain = true }
]
```

Then redeploy with `wrangler deploy`.

## License

MIT
