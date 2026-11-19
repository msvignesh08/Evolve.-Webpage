import cluster from 'node:cluster';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);

// ---------------------------------------------------------------------------
// 1. Cluster Load Balancing (Production multi-worker round-robin)
// ---------------------------------------------------------------------------
const clusterEnabled = isProd && process.env.CLUSTER_ENABLED !== 'false';
const rawConcurrency = Number(process.env.WEB_CONCURRENCY || 2);
const cpuCap = Math.max(1, Math.min(os.availableParallelism(), 4));
const workerCount = clusterEnabled
  ? Math.max(1, Math.min(Number.isFinite(rawConcurrency) ? rawConcurrency : 2, cpuCap))
  : 1;

if (clusterEnabled && workerCount > 1 && cluster.isPrimary) {
  cluster.schedulingPolicy = cluster.SCHED_RR;

  for (let i = 0; i < workerCount; i += 1) {
    cluster.fork();
  }

  let shuttingDown = false;

  cluster.on('exit', (worker, code, signal) => {
    if (shuttingDown) return;
    console.warn(
      `[FocusOS cluster] Worker ${worker.process.pid} exited (code=${code}, signal=${signal}). Respawning...`,
    );
    setTimeout(() => {
      if (!shuttingDown) cluster.fork();
    }, 500);
  });

  const shutdownPrimary = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[FocusOS cluster] Received ${signal}, gracefully stopping workers...`);
    for (const id of Object.keys(cluster.workers ?? {})) {
      cluster.workers?.[id]?.kill('SIGTERM');
    }
    setTimeout(() => process.exit(0), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdownPrimary('SIGTERM'));
  process.on('SIGINT', () => shutdownPrimary('SIGINT'));
} else {
  startHttpServer().catch((err) => {
    console.error('[FocusOS server] Fatal startup error:', err);
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// 2. Multi-Tier Sliding-Window Rate Limiter (Memory-Bounded)
// ---------------------------------------------------------------------------
interface BucketEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  tierName: string;
}

const MAX_TRACKED_IPS = 10_000;

function createRateLimiter({ windowMs, maxRequests, tierName }: RateLimitOptions) {
  const effectiveMax = Math.max(1, Math.ceil(maxRequests / workerCount));
  const store = new Map<string, BucketEntry>();

  const sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, Math.min(windowMs, 60_000));
  sweepTimer.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${tierName}:${clientIp}`;

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      if (store.size >= MAX_TRACKED_IPS) {
        const oldestKey = store.keys().next().value;
        if (oldestKey) store.delete(oldestKey);
      }
      entry = { count: 1, resetAt: now + windowMs };
      store.set(key, entry);
    } else {
      entry.count += 1;
    }

    const remaining = Math.max(0, effectiveMax - entry.count);
    const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

    res.setHeader('RateLimit-Limit', String(effectiveMax));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (entry.count > effectiveMax) {
      res.setHeader('Retry-After', String(resetSeconds));
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please wait briefly before retrying.',
        retryAfterSeconds: resetSeconds,
      });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// 3. Multi-Part (19–24 MB Chunked) Binary File Resolver & Range Streamer
// ---------------------------------------------------------------------------
interface VirtualBinarySource {
  parts: Array<{ filePath: string; size: number; start: number; end: number }>;
  totalSize: number;
  downloadName: string;
}

function resolveBinaryOrParts(requestedPath: string): VirtualBinarySource | null {
  const cleanRel = requestedPath.replace(/^\/+/, '');
  if (!cleanRel || cleanRel.includes('..') || cleanRel.includes('\0')) {
    return null;
  }

  const candidateDirs = isProd
    ? [path.join(__dirname, 'dist'), path.join(__dirname, 'public')]
    : [path.join(__dirname, 'public')];

  for (const baseDir of candidateDirs) {
    const directFile = path.join(baseDir, cleanRel);
    if (fs.existsSync(directFile) && fs.statSync(directFile).isFile()) {
      const stat = fs.statSync(directFile);
      return {
        parts: [{ filePath: directFile, size: stat.size, start: 0, end: stat.size - 1 }],
        totalSize: stat.size,
        downloadName: path.basename(cleanRel),
      };
    }

    // Look for split .part001, .part002, ... files alongside or inside public/downloads
    const partRoots = [
      directFile,
      path.join(baseDir, 'downloads', path.basename(cleanRel)),
    ];

    for (const rootBase of partRoots) {
      const parentDir = path.dirname(rootBase);
      const baseName = path.basename(rootBase);
      if (!fs.existsSync(parentDir)) continue;

      const partFiles = fs
        .readdirSync(parentDir)
        .filter((name) => name.startsWith(`${baseName}.part`) && /^\.part\d{3,}$/.test(name.slice(baseName.length)))
        .sort();

      if (partFiles.length > 0) {
        let offset = 0;
        const parts: VirtualBinarySource['parts'] = [];
        for (const name of partFiles) {
          const full = path.join(parentDir, name);
          const stat = fs.statSync(full);
          if (!stat.isFile() || stat.size === 0) continue;
          parts.push({
            filePath: full,
            size: stat.size,
            start: offset,
            end: offset + stat.size - 1,
          });
          offset += stat.size;
        }
        if (parts.length > 0 && offset > 0) {
          return {
            parts,
            totalSize: offset,
            downloadName: path.basename(cleanRel),
          };
        }
      }
    }
  }

  return null;
}

function createMultiPartRangeStream(
  parts: VirtualBinarySource['parts'],
  rangeStart: number,
  rangeEnd: number,
): Readable {
  async function* generateChunks() {
    for (const part of parts) {
      if (part.end < rangeStart || part.start > rangeEnd) {
        continue;
      }
      const localStart = Math.max(0, rangeStart - part.start);
      const localEnd = Math.min(part.size - 1, rangeEnd - part.start);
      const stream = fs.createReadStream(part.filePath, { start: localStart, end: localEnd });
      for await (const chunk of stream) {
        yield chunk;
      }
    }
  }
  return Readable.from(generateChunks());
}

// ---------------------------------------------------------------------------
// 4. Compression Helper for Static Assets in Production
// ---------------------------------------------------------------------------
function sendFileWithOptionalCompression(
  req: Request,
  res: Response,
  filePath: string,
  contentType: string,
  cacheControl: string,
) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Vary', 'Accept-Encoding');

  const acceptEncoding = String(req.headers['accept-encoding'] || '');
  const compressible =
    contentType.startsWith('text/') ||
    contentType.includes('javascript') ||
    contentType.includes('json') ||
    contentType.includes('xml') ||
    contentType.includes('svg');

  if (compressible && acceptEncoding.includes('br')) {
    res.setHeader('Content-Encoding', 'br');
    fs.createReadStream(filePath).pipe(zlib.createBrotliCompress()).pipe(res);
    return;
  }

  if (compressible && acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
    fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
    return;
  }

  fs.createReadStream(filePath).pipe(res);
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.json':
    case '.webmanifest':
      return 'application/manifest+json; charset=utf-8';
    case '.xml':
      return 'application/xml; charset=utf-8';
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

// ---------------------------------------------------------------------------
// 5. Express Application & HTTP Server Setup
// ---------------------------------------------------------------------------
async function startHttpServer() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));

  // Security headers across all responses
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    if (isProd && (req.secure || req.headers['x-forwarded-proto'] === 'https')) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Render Load Balancer Health Check (exempt from rate limiting)
  app.get('/healthz', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      status: 'ok',
      service: 'focusos-web',
      uptimeSeconds: Math.round(process.uptime()),
      workerPid: process.pid,
      workerCount,
    });
  });

  // Rate-limit tiers
  const downloadRateLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    maxRequests: Number(process.env.APK_RATE_LIMIT_MAX || 15),
    tierName: 'apk-download',
  });

  const assetRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: Number(process.env.ASSET_RATE_LIMIT_MAX || 300),
    tierName: 'static-asset',
  });

  const pageRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: Number(process.env.RATE_LIMIT_MAX || 120),
    tierName: 'page-route',
  });

  // Block direct access to internal split metadata / raw chunks
  app.use((req, res, next) => {
    if (/\.part\d{3,}$/i.test(req.path) || /\.parts\.json$/i.test(req.path)) {
      res.status(404).end();
      return;
    }
    next();
  });

  // APK & split-part download handler (works in both dev and production)
  app.all(/^\/(FocusOS[^/]*\.apk|downloads\/[^/]+)$/i, downloadRateLimiter, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.status(405).end();
      return;
    }

    const source = resolveBinaryOrParts(req.path);
    if (!source) {
      next();
      return;
    }

    const { parts, totalSize, downloadName } = source;
    const isApk = downloadName.toLowerCase().endsWith('.apk');

    res.setHeader(
      'Content-Type',
      isApk ? 'application/vnd.android.package-archive' : 'application/octet-stream',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
      if (!match) {
        res.status(416).setHeader('Content-Range', `bytes */${totalSize}`).end();
        return;
      }

      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), totalSize - 1) : totalSize - 1;

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= totalSize) {
        res.status(416).setHeader('Content-Range', `bytes */${totalSize}`).end();
        return;
      }

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', String(end - start + 1));

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      createMultiPartRangeStream(parts, start, end).pipe(res);
      return;
    }

    res.status(200);
    res.setHeader('Content-Length', String(totalSize));

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    createMultiPartRangeStream(parts, 0, totalSize - 1).pipe(res);
  });

  if (!isProd) {
    // Development mode: mount Vite middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use((req, res, next) => {
      if (req.path.startsWith('/assets/') || req.path.startsWith('/src/')) {
        assetRateLimiter(req, res, next);
      } else {
        pageRateLimiter(req, res, next);
      }
    });

    app.use(vite.middlewares);
  } else {
    // Production mode: serve compressed dist/ assets + SPA fallback
    const distDir = path.join(__dirname, 'dist');
    const indexHtmlPath = path.join(distDir, 'index.html');

    app.use('/assets', assetRateLimiter);

    app.get(/^\/.+/, (req, res, next) => {
      const cleanPath = req.path.replace(/^\/+/, '');
      if (cleanPath.includes('..')) {
        res.status(400).end();
        return;
      }

      const targetPath = path.join(distDir, cleanPath);
      if (
        targetPath.startsWith(distDir) &&
        fs.existsSync(targetPath) &&
        fs.statSync(targetPath).isFile()
      ) {
        assetRateLimiter(req, res, () => {
          const isHashedAsset = req.path.startsWith('/assets/');
          const cacheControl = isHashedAsset
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=3600';
          sendFileWithOptionalCompression(
            req,
            res,
            targetPath,
            getMimeType(targetPath),
            cacheControl,
          );
        });
        return;
      }

      next();
    });

    app.use(pageRateLimiter);

    app.use((req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.status(405).end();
        return;
      }

      // Return 404 for missing non-HTML asset/binary paths (important for HEAD /FocusOS-debug.apk check)
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        res.status(404).end();
        return;
      }

      if (!fs.existsSync(indexHtmlPath)) {
        res.status(503).send('Application build missing. Run npm run build.');
        return;
      }

      if (req.method === 'HEAD') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.status(200).end();
        return;
      }

      sendFileWithOptionalCompression(
        req,
        res,
        indexHtmlPath,
        'text/html; charset=utf-8',
        'no-cache',
      );
    });
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(
      `[FocusOS] Server listening on http://0.0.0.0:${port} (mode=${isProd ? 'production' : 'development'}, pid=${process.pid}, workers=${workerCount})`,
    );
  });

  // Prevent 502 upstream drops behind Render's load balancer / proxy
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  const gracefulExit = (signal: string) => {
    console.log(`[FocusOS] Worker ${process.pid} closing on ${signal}...`);
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 8_000).unref();
  };

  process.on('SIGTERM', () => gracefulExit('SIGTERM'));
  process.on('SIGINT', () => gracefulExit('SIGINT'));
}
