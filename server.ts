import cluster from 'node:cluster';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  createChallengeToken,
  createPasskeyStore,
  encodePasskeysForEnv,
  issueAdminSessionToken,
  toBase64Url,
  verifyAdminSessionToken,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from './server/webauthn.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);

// Ensure primary & all forked cluster workers share an identical HMAC secret
if (!process.env.FOCUSOS_INTERNAL_HMAC_SECRET) {
  const seed =
    process.env.ADMIN_PASSKEY?.trim() ||
    process.env.ADMIN_PASSKEYS?.trim() ||
    '';
  process.env.FOCUSOS_INTERNAL_HMAC_SECRET =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    (seed
      ? crypto
          .createHash('sha256')
          .update(`focusos-session:${seed}`)
          .digest('hex')
      : crypto.randomBytes(32).toString('hex'));
}

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

interface CachedApkDigest {
  cacheKey: string;
  sha256: string;
  sizeBytes: number;
  fileName: string;
}

let cachedApkDigest: CachedApkDigest | null = null;

async function getApkDigestInfo(requestedApkPath = '/FocusOS-debug.apk'): Promise<{
  available: boolean;
  fileName: string;
  sizeBytes: number;
  sha256: string | null;
}> {
  const source = resolveBinaryOrParts(requestedApkPath);
  if (!source) {
    return {
      available: false,
      fileName: path.basename(requestedApkPath),
      sizeBytes: 0,
      sha256: null,
    };
  }

  const mtimes = source.parts
    .map((p) => {
      try {
        return Math.round(fs.statSync(p.filePath).mtimeMs);
      } catch {
        return 0;
      }
    })
    .join(',');
  const cacheKey = `${source.downloadName}:${source.totalSize}:${mtimes}`;

  if (cachedApkDigest && cachedApkDigest.cacheKey === cacheKey) {
    return {
      available: true,
      fileName: cachedApkDigest.fileName,
      sizeBytes: cachedApkDigest.sizeBytes,
      sha256: cachedApkDigest.sha256,
    };
  }

  // Check if a verified .parts.json manifest already holds the SHA-256
  if (source.parts.length > 0) {
    const firstPart = source.parts[0].filePath;
    const manifestPath = firstPart.replace(/\.part\d{3,}$/, '.parts.json');
    if (manifestPath !== firstPart && fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
          totalBytes?: number;
          sha256?: string;
        };
        if (
          manifest.totalBytes === source.totalSize &&
          typeof manifest.sha256 === 'string' &&
          /^[a-f0-9]{64}$/i.test(manifest.sha256)
        ) {
          const sha256 = manifest.sha256.toLowerCase();
          cachedApkDigest = {
            cacheKey,
            sha256,
            sizeBytes: source.totalSize,
            fileName: source.downloadName,
          };
          return {
            available: true,
            fileName: source.downloadName,
            sizeBytes: source.totalSize,
            sha256,
          };
        }
      } catch {
        // Fall through to streaming SHA-256 calculation
      }
    }
  }

  const hash = crypto.createHash('sha256');
  const stream = createMultiPartRangeStream(source.parts, 0, source.totalSize - 1);
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  const sha256 = hash.digest('hex');

  cachedApkDigest = {
    cacheKey,
    sha256,
    sizeBytes: source.totalSize,
    fileName: source.downloadName,
  };

  return {
    available: true,
    fileName: source.downloadName,
    sizeBytes: source.totalSize,
    sha256,
  };
}

// ---------------------------------------------------------------------------
// 4. Low-CPU Cached Compression Helper for Static Assets in Production
// ---------------------------------------------------------------------------
const STATIC_CACHE_MAX_FILE_BYTES = 1024 * 1024; // 1 MB per built web asset
const STATIC_CACHE_MAX_ENTRIES = 24;
const compressedAssetCache = new Map<string, Buffer>();

function setBoundedAssetCache(cacheKey: string, payload: Buffer) {
  if (compressedAssetCache.size >= STATIC_CACHE_MAX_ENTRIES) {
    const oldestKey = compressedAssetCache.keys().next().value;
    if (oldestKey) compressedAssetCache.delete(oldestKey);
  }
  compressedAssetCache.set(cacheKey, payload);
}

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

  const encoding =
    compressible && acceptEncoding.includes('br')
      ? 'br'
      : compressible && acceptEncoding.includes('gzip')
        ? 'gzip'
        : 'raw';

  const cacheKey = `${encoding}:${filePath}`;
  const cached = compressedAssetCache.get(cacheKey);
  if (cached) {
    if (encoding !== 'raw') {
      res.setHeader('Content-Encoding', encoding);
    }
    res.setHeader('Content-Length', String(cached.length));
    res.end(cached);
    return;
  }

  let fileSize = 0;
  try {
    fileSize = fs.statSync(filePath).size;
  } catch {
    res.status(404).end();
    return;
  }

  if (fileSize <= STATIC_CACHE_MAX_FILE_BYTES) {
    fs.readFile(filePath, (err, rawBuffer) => {
      if (err) {
        if (!res.headersSent) res.status(404).end();
        return;
      }
      if (encoding === 'br') {
        zlib.brotliCompress(
          rawBuffer,
          { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } },
          (compErr, compressed) => {
            if (compErr) {
              res.setHeader('Content-Length', String(rawBuffer.length));
              res.end(rawBuffer);
              return;
            }
            setBoundedAssetCache(cacheKey, compressed);
            res.setHeader('Content-Encoding', 'br');
            res.setHeader('Content-Length', String(compressed.length));
            res.end(compressed);
          },
        );
      } else if (encoding === 'gzip') {
        zlib.gzip(rawBuffer, { level: 6 }, (compErr, compressed) => {
          if (compErr) {
            res.setHeader('Content-Length', String(rawBuffer.length));
            res.end(rawBuffer);
            return;
          }
          setBoundedAssetCache(cacheKey, compressed);
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Length', String(compressed.length));
          res.end(compressed);
        });
      } else {
        setBoundedAssetCache(cacheKey, rawBuffer);
        res.setHeader('Content-Length', String(rawBuffer.length));
        res.end(rawBuffer);
      }
    });
    return;
  }

  if (encoding === 'br') {
    res.setHeader('Content-Encoding', 'br');
    fs.createReadStream(filePath)
      .pipe(zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } }))
      .pipe(res);
    return;
  }

  if (encoding === 'gzip') {
    res.setHeader('Content-Encoding', 'gzip');
    fs.createReadStream(filePath).pipe(zlib.createGzip({ level: 6 })).pipe(res);
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
// 4B. Developer Gift & 12-Digit Device Fingerprint Store (Multi-Worker Safe)
// ---------------------------------------------------------------------------
type GiftCategory =
  | 'subscription'
  | 'timer_skin'
  | 'room_perk'
  | 'feature_unlock'
  | 'random_gift';

interface DeviceGift {
  id: string;
  fingerprint: string;
  category: GiftCategory;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  createdAt: string;
  expiresAt: string | null;
  claimedAt: string | null;
  sender: string;
}

const VALID_GIFT_CATEGORIES: ReadonlySet<string> = new Set([
  'subscription',
  'timer_skin',
  'room_perk',
  'feature_unlock',
  'random_gift',
]);

const MAX_GIFTS_STORED = 5_000;
const GIFTS_STORE_PATH = process.env.GIFTS_STORE_PATH?.trim()
  ? path.resolve(process.env.GIFTS_STORE_PATH.trim())
  : path.join(__dirname, 'data', 'gifts.json');

let cachedGiftsList: DeviceGift[] = [];
let cachedGiftsMtimeMs = -1;

function normalizeFingerprint(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[\s-]+/g, '').trim();
  return /^\d{12}$/.test(digits) ? digits : null;
}

function readGiftsFromDisk(): DeviceGift[] {
  try {
    const stat = fs.statSync(GIFTS_STORE_PATH);
    if (stat.mtimeMs === cachedGiftsMtimeMs) {
      return cachedGiftsList;
    }
    const raw = fs.readFileSync(GIFTS_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedGiftsList = parsed.filter(
        (item): item is DeviceGift =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.fingerprint === 'string' &&
          typeof item.title === 'string',
      );
    } else {
      cachedGiftsList = [];
    }
    cachedGiftsMtimeMs = stat.mtimeMs;
    return cachedGiftsList;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      cachedGiftsList = [];
      cachedGiftsMtimeMs = 0;
      return cachedGiftsList;
    }
    return cachedGiftsList;
  }
}

function writeGiftsToDisk(gifts: DeviceGift[]) {
  const dir = path.dirname(GIFTS_STORE_PATH);
  fs.mkdirSync(dir, { recursive: true });

  // Evict oldest claimed/expired items first if approaching storage cap
  let bounded = gifts;
  if (bounded.length > MAX_GIFTS_STORED) {
    const active = bounded.filter((g) => !g.claimedAt);
    const claimed = bounded.filter((g) => Boolean(g.claimedAt));
    bounded = [...claimed, ...active].slice(-MAX_GIFTS_STORED);
  }

  const tmpPath = `${GIFTS_STORE_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(bounded, null, 2), 'utf8');
  fs.renameSync(tmpPath, GIFTS_STORE_PATH);
  try {
    cachedGiftsMtimeMs = fs.statSync(GIFTS_STORE_PATH).mtimeMs;
  } catch {
    cachedGiftsMtimeMs = Date.now();
  }
  cachedGiftsList = bounded;
}

function isGiftExpired(gift: DeviceGift, nowMs = Date.now()): boolean {
  if (!gift.expiresAt) return false;
  const exp = Date.parse(gift.expiresAt);
  return Number.isFinite(exp) && exp <= nowMs;
}

const PASSKEYS_STORE_PATH = process.env.PASSKEYS_STORE_PATH?.trim()
  ? path.resolve(process.env.PASSKEYS_STORE_PATH.trim())
  : path.join(path.dirname(GIFTS_STORE_PATH), 'passkeys.json');
const passkeyStore = createPasskeyStore(
  PASSKEYS_STORE_PATH,
  () => process.env.ADMIN_PASSKEYS,
);

function getSessionHmacSecret(): string {
  return process.env.FOCUSOS_INTERNAL_HMAC_SECRET || 'focusos-dev-hmac-fallback';
}

function resolveWebAuthnRpAndOrigin(req: Request): { rpId: string; origin: string } {
  const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
  if (originHeader) {
    try {
      const parsed = new URL(originHeader);
      return {
        rpId: parsed.hostname,
        origin: parsed.origin,
      };
    } catch {
      // Fall back to request host
    }
  }
  const protoHeader = String(req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http'))
    .split(',')[0]
    .trim();
  const hostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000')
    .split(',')[0]
    .trim();
  const rpId = hostHeader.replace(/:\d+$/, '');
  return {
    rpId,
    origin: `${protoHeader}://${hostHeader}`,
  };
}

function getEffectiveAdminPasskey(): { passkey: string | null; devFallback: boolean } {
  const configured = process.env.ADMIN_PASSKEY?.trim();
  if (configured && configured.length >= 6 && configured !== 'CHANGE_ME_STRONG_PASSKEY') {
    return { passkey: configured, devFallback: false };
  }
  if (!isProd) {
    return { passkey: 'focusos-dev-admin', devFallback: true };
  }
  return { passkey: null, devFallback: false };
}

function verifyBearerPasskey(authHeader: string | undefined, expected: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const supplied = authHeader.slice(7).trim();
  if (!supplied) return false;

  // 1. Check short-lived HMAC-signed WebAuthn passkey session token (15-min TTL)
  if (supplied.startsWith('adm_')) {
    const claims = verifyAdminSessionToken(supplied, getSessionHmacSecret());
    if (claims) {
      // Ensure the passkey credential has not since been revoked
      const registered = passkeyStore.read();
      if (registered.some((pk) => pk.id === claims.credId)) {
        return true;
      }
    }
    return false;
  }

  // 2. Fall back to bootstrap/recovery ADMIN_PASSKEY secret
  if (!expected) return false;
  const suppliedDigest = crypto.createHash('sha256').update(supplied).digest();
  const expectedDigest = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(suppliedDigest, expectedDigest);
}

function applyAdminCors(req: Request, res: Response) {
  const rawAllowed = process.env.ADMIN_CORS_ORIGIN?.trim() || '';
  if (!rawAllowed) return;
  const origin = req.headers.origin;
  if (rawAllowed === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin) {
    const allowList = rawAllowed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowList.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}

function applyGiftPublicCors(res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

// ---------------------------------------------------------------------------
// 5. Express Application & HTTP Server Setup
// ---------------------------------------------------------------------------
async function startHttpServer() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));

  // Enforce HTTPS behind Render's TLS proxy in production (exempt /healthz internal probe)
  if (isProd) {
    app.use((req, res, next) => {
      if (req.path !== '/healthz' && req.headers['x-forwarded-proto'] === 'http' && req.headers.host) {
        res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
        return;
      }
      next();
    });
  }

  // Security headers across all responses
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    if (isProd) {
      res.setHeader(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob:",
          "connect-src 'self'",
          "frame-ancestors 'self'",
          "base-uri 'self'",
          "form-action 'self'",
          'upgrade-insecure-requests',
        ].join('; '),
      );
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }
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

  const adminRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: Number(process.env.ADMIN_RATE_LIMIT_MAX || 60),
    tierName: 'admin-api',
  });

  // Block direct access to internal split metadata, raw chunks, sourcemaps, data store, or source/config files
  app.use((req, res, next) => {
    const p = req.path;
    if (
      /\.part\d{3,}$/i.test(p) ||
      /\.parts\.json$/i.test(p) ||
      /\.map$/i.test(p) ||
      (isProd && /\.(ts|tsx|mts|cts)$/i.test(p)) ||
      /^\/(\.env|\.git|data\/|server\/|scripts\/|package(-lock)?\.json|tsconfig\.json|render\.yaml)/i.test(p)
    ) {
      res.status(404).end();
      return;
    }
    next();
  });

  // Pre-install APK integrity metadata & SHA-256 checksum endpoint
  app.get('/api/apk-info', pageRateLimiter, async (_req, res) => {
    try {
      const info = await getApkDigestInfo('/FocusOS-debug.apk');
      res.setHeader('Cache-Control', 'public, max-age=120');
      res.status(200).json(info);
    } catch {
      res.status(200).json({
        available: false,
        fileName: 'FocusOS-debug.apk',
        sizeBytes: 0,
        sha256: null,
      });
    }
  });

  // -------------------------------------------------------------------------
  // Android App Device-Fingerprint Gift Delivery API (/api/gifts/*)
  // -------------------------------------------------------------------------
  const giftJsonParser = express.json({ limit: '64kb' });

  app.options(/^\/api\/gifts(?:\/.*)?$/, (req, res) => {
    applyGiftPublicCors(res);
    res.status(204).end();
  });

  app.get('/api/gifts/:fingerprint', pageRateLimiter, (req, res) => {
    applyGiftPublicCors(res);
    res.setHeader('Cache-Control', 'no-store');

    const fingerprint = normalizeFingerprint(req.params.fingerprint);
    if (!fingerprint) {
      res.status(400).json({
        error: 'INVALID_FINGERPRINT',
        message: 'Device fingerprint must be exactly 12 numeric digits.',
      });
      return;
    }

    const includeClaimed = req.query.includeClaimed === '1' || req.query.includeClaimed === 'true';
    const nowMs = Date.now();
    const allGifts = readGiftsFromDisk();
    const matching = allGifts.filter((g) => {
      if (g.fingerprint !== fingerprint) return false;
      if (isGiftExpired(g, nowMs)) return false;
      if (!includeClaimed && g.claimedAt) return false;
      return true;
    });

    res.status(200).json({
      fingerprint,
      serverTime: new Date(nowMs).toISOString(),
      count: matching.length,
      gifts: matching,
    });
  });

  app.post('/api/gifts/:fingerprint/claim', pageRateLimiter, giftJsonParser, (req, res) => {
    applyGiftPublicCors(res);
    res.setHeader('Cache-Control', 'no-store');

    const fingerprint = normalizeFingerprint(req.params.fingerprint);
    if (!fingerprint) {
      res.status(400).json({
        error: 'INVALID_FINGERPRINT',
        message: 'Device fingerprint must be exactly 12 numeric digits.',
      });
      return;
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      giftId?: unknown;
      claimAll?: unknown;
    };
    const targetGiftId = typeof body.giftId === 'string' ? body.giftId.trim() : '';
    const claimAll = body.claimAll === true;

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const gifts = readGiftsFromDisk().map((g) => ({ ...g }));
    const claimedNow: DeviceGift[] = [];

    for (const gift of gifts) {
      if (gift.fingerprint !== fingerprint) continue;
      if (gift.claimedAt || isGiftExpired(gift, nowMs)) continue;

      if (claimAll || (targetGiftId && gift.id === targetGiftId) || (!targetGiftId && claimedNow.length === 0)) {
        gift.claimedAt = nowIso;
        claimedNow.push(gift);
        if (!claimAll) break;
      }
    }

    if (claimedNow.length > 0) {
      writeGiftsToDisk(gifts);
    }

    res.status(200).json({
      ok: true,
      fingerprint,
      claimedCount: claimedNow.length,
      claimed: claimedNow,
    });
  });

  // -------------------------------------------------------------------------
  // Developer Admin Gift Console API (/api/admin/*)
  // -------------------------------------------------------------------------
  app.options(/^\/api\/admin(?:\/.*)?$/, (req, res) => {
    applyAdminCors(req, res);
    res.status(204).end();
  });

  app.get('/api/admin/status', adminRateLimiter, (req, res) => {
    applyAdminCors(req, res);
    res.setHeader('Cache-Control', 'no-store');
    const { passkey, devFallback } = getEffectiveAdminPasskey();
    const passkeys = passkeyStore.read();
    res.status(200).json({
      configured: Boolean(passkey) || passkeys.length > 0,
      isProd,
      devFallback,
      corsEnabled: Boolean(process.env.ADMIN_CORS_ORIGIN?.trim()),
      passkeyCount: passkeys.length,
    });
  });

  const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
    applyAdminCors(req, res);
    res.setHeader('Cache-Control', 'no-store');

    const { passkey } = getEffectiveAdminPasskey();
    const passkeyCount = passkeyStore.read().length;
    if (!passkey && passkeyCount === 0) {
      res.status(503).json({
        error: 'ADMIN_PASSKEY_NOT_CONFIGURED',
        message: 'Set ADMIN_PASSKEY in Render Environment Variables to unlock Developer Admin.',
      });
      return;
    }

    if (!verifyBearerPasskey(req.headers.authorization, passkey)) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired developer admin passkey.',
      });
      return;
    }

    next();
  };

  app.post('/api/admin/verify', adminRateLimiter, requireAdminAuth, (_req, res) => {
    const gifts = readGiftsFromDisk();
    const pending = gifts.filter((g) => !g.claimedAt && !isGiftExpired(g)).length;
    res.status(200).json({
      ok: true,
      stats: {
        total: gifts.length,
        pending,
        claimed: gifts.filter((g) => Boolean(g.claimedAt)).length,
      },
    });
  });

  // -------------------------------------------------------------------------
  // Hardware Passkey (WebAuthn / FIDO2) Biometric Admin Authentication
  // -------------------------------------------------------------------------
  app.post('/api/admin/passkey/auth-options', adminRateLimiter, (req, res) => {
    applyAdminCors(req, res);
    res.setHeader('Cache-Control', 'no-store');

    const registered = passkeyStore.read();
    if (registered.length === 0) {
      res.status(400).json({
        error: 'NO_PASSKEYS_ENROLLED',
        message: 'No hardware passkey enrolled yet. Unlock once with your secret to register one.',
      });
      return;
    }

    const { rpId, origin } = resolveWebAuthnRpAndOrigin(req);
    const { challenge, challengeToken } = createChallengeToken(
      'auth',
      rpId,
      origin,
      getSessionHmacSecret(),
    );

    res.status(200).json({
      rpId,
      challenge,
      challengeToken,
      timeout: 60_000,
      userVerification: 'preferred',
      allowCredentials: registered.map((pk) => ({
        id: pk.id,
        type: 'public-key',
        transports: pk.transports,
      })),
    });
  });

  app.post('/api/admin/passkey/auth-verify', adminRateLimiter, giftJsonParser, (req, res) => {
    applyAdminCors(req, res);
    res.setHeader('Cache-Control', 'no-store');

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      challengeToken?: unknown;
      id?: unknown;
      response?: {
        clientDataJSON?: unknown;
        authenticatorData?: unknown;
        signature?: unknown;
      };
    };

    if (
      typeof body.challengeToken !== 'string' ||
      typeof body.id !== 'string' ||
      !body.response ||
      typeof body.response.clientDataJSON !== 'string' ||
      typeof body.response.authenticatorData !== 'string' ||
      typeof body.response.signature !== 'string'
    ) {
      res.status(400).json({
        error: 'INVALID_ASSERTION',
        message: 'Malformed WebAuthn authentication payload.',
      });
      return;
    }

    try {
      const existing = passkeyStore.read();
      const { passkey, newSignCount } = verifyAuthenticationResponse({
        challengeToken: body.challengeToken,
        id: body.id,
        clientDataJSON: body.response.clientDataJSON,
        authenticatorData: body.response.authenticatorData,
        signature: body.response.signature,
        storedPasskeys: existing,
        secret: getSessionHmacSecret(),
      });

      const updated = existing.map((item) =>
        item.id === passkey.id
          ? {
              ...item,
              signCount: Math.max(item.signCount, newSignCount),
              lastUsedAt: new Date().toISOString(),
            }
          : item,
      );
      passkeyStore.write(updated);

      const sessionToken = issueAdminSessionToken(passkey.id, getSessionHmacSecret());
      res.status(200).json({
        ok: true,
        sessionToken,
        expiresInSeconds: 900,
        passkeyLabel: passkey.label,
      });
    } catch (err) {
      res.status(401).json({
        error: 'PASSKEY_AUTH_FAILED',
        message: err instanceof Error ? err.message : 'Passkey verification failed.',
      });
    }
  });

  app.get('/api/admin/passkeys', adminRateLimiter, requireAdminAuth, (_req, res) => {
    const listWithStatus = passkeyStore.readWithStatus();
    const list = listWithStatus.map((pk) => ({
      id: pk.id,
      label: pk.label,
      alg: pk.alg,
      transports: pk.transports,
      createdAt: pk.createdAt,
      lastUsedAt: pk.lastUsedAt,
      pinnedInEnv: pk.pinnedInEnv,
    }));
    res.status(200).json({
      passkeys: list,
      envExportValue: encodePasskeysForEnv(listWithStatus),
      allPinned: listWithStatus.length > 0 && listWithStatus.every((pk) => pk.pinnedInEnv),
    });
  });

  app.post('/api/admin/passkey/register-options', adminRateLimiter, requireAdminAuth, (req, res) => {
    const { rpId, origin } = resolveWebAuthnRpAndOrigin(req);
    const { challenge, challengeToken } = createChallengeToken(
      'register',
      rpId,
      origin,
      getSessionHmacSecret(),
    );
    const existing = passkeyStore.read();
    const userHandle = toBase64Url(crypto.createHash('sha256').update('focusos-developer-admin').digest().subarray(0, 16));

    res.status(200).json({
      rp: { name: 'FocusOS Developer Admin', id: rpId },
      user: {
        id: userHandle,
        name: 'phantomstrange',
        displayName: 'Phantomstrange (FocusOS Admin)',
      },
      challenge,
      challengeToken,
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256 (Android Fingerprint / Face ID / Touch ID)
        { type: 'public-key', alg: -257 }, // RS256 fallback
      ],
      timeout: 60_000,
      attestation: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      excludeCredentials: existing.map((pk) => ({
        id: pk.id,
        type: 'public-key',
        transports: pk.transports,
      })),
    });
  });

  app.post(
    '/api/admin/passkey/register-verify',
    adminRateLimiter,
    requireAdminAuth,
    giftJsonParser,
    (req, res) => {
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
        challengeToken?: unknown;
        label?: unknown;
        id?: unknown;
        rawId?: unknown;
        response?: {
          clientDataJSON?: unknown;
          attestationObject?: unknown;
          transports?: unknown;
        };
      };

      if (
        typeof body.challengeToken !== 'string' ||
        typeof body.id !== 'string' ||
        typeof body.rawId !== 'string' ||
        !body.response ||
        typeof body.response.clientDataJSON !== 'string' ||
        typeof body.response.attestationObject !== 'string'
      ) {
        res.status(400).json({
          error: 'INVALID_ATTESTATION',
          message: 'Malformed WebAuthn registration payload.',
        });
        return;
      }

      try {
        const stored = verifyRegistrationResponse({
          challengeToken: body.challengeToken,
          id: body.id,
          rawId: body.rawId,
          clientDataJSON: body.response.clientDataJSON,
          attestationObject: body.response.attestationObject,
          transports: Array.isArray(body.response.transports)
            ? body.response.transports.filter((t): t is string => typeof t === 'string')
            : [],
          label: typeof body.label === 'string' ? body.label : 'Developer Device',
          secret: getSessionHmacSecret(),
        });

        const existing = passkeyStore.read().filter((pk) => pk.id !== stored.id);
        const merged = [...existing, stored];
        passkeyStore.write(merged);
        const statusMatch = passkeyStore.readWithStatus().find((pk) => pk.id === stored.id);

        // Upgrade current session into a short-lived passkey-bound session token as well
        const sessionToken = issueAdminSessionToken(stored.id, getSessionHmacSecret());
        res.status(201).json({
          ok: true,
          sessionToken,
          envExportValue: encodePasskeysForEnv(merged),
          passkey: {
            id: stored.id,
            label: stored.label,
            alg: stored.alg,
            transports: stored.transports,
            createdAt: stored.createdAt,
            lastUsedAt: stored.lastUsedAt,
            pinnedInEnv: Boolean(statusMatch?.pinnedInEnv),
          },
        });
      } catch (err) {
        res.status(400).json({
          error: 'PASSKEY_REGISTRATION_FAILED',
          message: err instanceof Error ? err.message : 'Could not verify hardware passkey.',
        });
      }
    },
  );

  app.delete('/api/admin/passkeys/:id', adminRateLimiter, requireAdminAuth, (req, res) => {
    const rawId = req.params.id;
    const id = typeof rawId === 'string' ? rawId.trim() : '';
    const existingWithStatus = passkeyStore.readWithStatus();
    const target = existingWithStatus.find((pk) => pk.id === id);
    if (!target) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Passkey not found.' });
      return;
    }
    if (target.pinnedInEnv) {
      res.status(409).json({
        error: 'PINNED_IN_ENV',
        message:
          'This passkey is pinned in Render Environment Variable ADMIN_PASSKEYS. Update or remove ADMIN_PASSKEYS in Render to revoke it permanently.',
      });
      return;
    }
    const nextList = existingWithStatus.filter((pk) => pk.id !== id);
    passkeyStore.write(nextList);
    res.status(200).json({
      ok: true,
      deletedId: id,
      envExportValue: encodePasskeysForEnv(nextList),
    });
  });

  app.get('/api/admin/gifts', adminRateLimiter, requireAdminAuth, (req, res) => {
    const rawFilter = typeof req.query.fingerprint === 'string' ? req.query.fingerprint : '';
    const filterDigits = rawFilter.replace(/[\s-]+/g, '').trim();

    const all = readGiftsFromDisk();
    const filtered = (filterDigits
      ? all.filter((g) => g.fingerprint.includes(filterDigits))
      : all
    )
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    res.status(200).json({
      total: all.length,
      pending: all.filter((g) => !g.claimedAt && !isGiftExpired(g)).length,
      claimed: all.filter((g) => Boolean(g.claimedAt)).length,
      gifts: filtered,
    });
  });

  app.post('/api/admin/gifts', adminRateLimiter, requireAdminAuth, giftJsonParser, (req, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      fingerprint?: unknown;
      category?: unknown;
      title?: unknown;
      message?: unknown;
      payload?: unknown;
      expiresInDays?: unknown;
      sender?: unknown;
    };

    const fingerprint = normalizeFingerprint(body.fingerprint);
    if (!fingerprint) {
      res.status(400).json({
        error: 'INVALID_FINGERPRINT',
        message: 'Target device fingerprint must be exactly 12 numeric digits.',
      });
      return;
    }

    const categoryRaw = typeof body.category === 'string' ? body.category.trim() : 'random_gift';
    const category: GiftCategory = VALID_GIFT_CATEGORIES.has(categoryRaw)
      ? (categoryRaw as GiftCategory)
      : 'random_gift';

    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 96) : '';
    if (!title) {
      res.status(400).json({
        error: 'MISSING_TITLE',
        message: 'Provide a concise gift title.',
      });
      return;
    }

    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 280) : '';
    const sender =
      typeof body.sender === 'string' && body.sender.trim()
        ? body.sender.trim().slice(0, 48)
        : 'Phantomstrange';

    let payload: Record<string, unknown> = {};
    if (body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)) {
      payload = body.payload as Record<string, unknown>;
    } else if (typeof body.payload === 'string' && body.payload.trim()) {
      try {
        const parsed = JSON.parse(body.payload.trim());
        payload =
          parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : { value: parsed };
      } catch {
        payload = { rewardCode: body.payload.trim().slice(0, 256) };
      }
    }

    const daysNum = Number(body.expiresInDays);
    const expiresAt =
      Number.isFinite(daysNum) && daysNum > 0
        ? new Date(Date.now() + Math.min(daysNum, 3650) * 86_400_000).toISOString()
        : null;

    const newGift: DeviceGift = {
      id: `gift_${crypto.randomBytes(6).toString('hex')}`,
      fingerprint,
      category,
      title,
      message,
      payload,
      createdAt: new Date().toISOString(),
      expiresAt,
      claimedAt: null,
      sender,
    };

    const existing = readGiftsFromDisk();
    const updated = [...existing, newGift];
    writeGiftsToDisk(updated);

    res.status(201).json({
      ok: true,
      gift: newGift,
    });
  });

  app.delete('/api/admin/gifts/:id', adminRateLimiter, requireAdminAuth, (req, res) => {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ error: 'MISSING_ID' });
      return;
    }

    const existing = readGiftsFromDisk();
    const nextList = existing.filter((g) => g.id !== id);
    if (nextList.length === existing.length) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }

    writeGiftsToDisk(nextList);
    res.status(200).json({ ok: true, deletedId: id });
  });

  // APK & split-part download handler (works in both dev and production)
  app.all(/^\/(FocusOS[^/]*\.apk|downloads\/[^/]+)$/i, downloadRateLimiter, async (req, res, next) => {
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

    try {
      const digest = await getApkDigestInfo(req.path);
      if (digest.sha256) {
        res.setHeader('X-Checksum-Sha256', digest.sha256);
      }
    } catch {
      // Non-fatal if checksum header calculation is skipped
    }

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
