# Evolve Website

Minimalist Android focus app landing page, permissions transparency guide, and interactive 1:1 app demo, configured for GitHub and Render hosting (`evolve.onrender.com`) with built-in cluster load balancing, multi-tier rate limiting, compression, WebAuthn Passkey Admin (`#admin`), and 19–24 MB chunked binary support.

## Local Development

```bash
npm install
npm run dev
```

Runs on `http://localhost:3000`.

## GitHub Upload & 19–24 MB File Splitting

Every webpage source file and compiled frontend chunk is kept small (well under 1 MB).
If you add a large Android APK (`> 24 MB`) that exceeds GitHub's 25 MB web upload limit, split it into **19–24 MB parts** (default `20 MB`):

```bash
npm run split:apk -- ./Evolve-debug.apk --size-mb=20
```

This creates `public/Evolve-debug.apk.part001`, `.part002`, ... plus a checksum manifest. Remove the unsplit original file before uploading to GitHub; the Express server automatically streams and reassembles the `.partNNN` chunks (including HTTP `HEAD` and byte-range resume) when visitors click **Download APK**.

Check that all repository files stay under 24 MB before committing/pushing:

```bash
npm run check:sizes
```

## Hosting on Render

1. Push this project to a GitHub repository.
2. On [Render](https://render.com), choose **New + -> Blueprint** (uses `render.yaml` automatically with `name: evolve`) or **New + -> Web Service**:
   - **Build Command**: `npm install --include=dev --legacy-peer-deps && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/healthz`
3. Environment variables for `#admin` Passkey persistence across Render Free Tier restarts:
   - `ADMIN_PASSKEY`: Bootstrap recovery secret for first setup and enrolling devices.
   - `ADMIN_PASSKEYS`: Paste the exported `b64:...` passkey string from `#admin` so enrolled devices survive restarts/redeploys.
   - `ADMIN_SESSION_SECRET`: Recommended HMAC signing key for 15-minute admin sessions.
4. Built-in production features active on Render:
   - **Load Balancing**: Node cluster round-robin (`WEB_CONCURRENCY`, default `2`) + Render reverse-proxy `keepAliveTimeout` (`65s`) and `trust proxy` support.
   - **Rate Limiting**: Multi-tier sliding-window limits (`/healthz` exempt, `120 req/min` pages, `300 req/min` static assets, `15 req/10min` APK downloads) with `RateLimit-*` and `Retry-After` headers.
   - **Compression & Caching**: Brotli/Gzip compression and immutable asset caching.
