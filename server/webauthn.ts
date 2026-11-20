import crypto from 'node:crypto';
import type { JsonWebKey as CryptoJsonWebKey } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface StoredPasskey {
  id: string; // base64url credential ID
  label: string;
  alg: -7 | -257;
  publicKeyJwk: CryptoJsonWebKey;
  signCount: number;
  transports: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

export interface WebAuthnChallengeClaims {
  purpose: 'register' | 'auth';
  challenge: string;
  rpId: string;
  origin: string;
  nonce: string;
  exp: number;
}

export interface AdminSessionClaims {
  sub: 'admin';
  authMethod: 'passkey';
  credId: string;
  iat: number;
  exp: number;
}

// ---------------------------------------------------------------------------
// Base64URL helpers
// ---------------------------------------------------------------------------
export function toBase64Url(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString('base64url');
}

export function fromBase64Url(str: string): Buffer {
  return Buffer.from(str, 'base64url');
}

// ---------------------------------------------------------------------------
// Minimal RFC 8949 CBOR Decoder (supports attestationObject & COSE public keys)
// ---------------------------------------------------------------------------
function decodeCborItem(buf: Uint8Array, offset: number): { value: unknown; nextOffset: number } {
  if (offset >= buf.length) {
    throw new Error('Unexpected end of CBOR data');
  }

  const initial = buf[offset];
  const major = initial >> 5;
  const ai = initial & 0x1f;
  let pos = offset + 1;

  const readUint = (info: number): number => {
    if (info < 24) return info;
    if (info === 24) {
      if (pos + 1 > buf.length) throw new Error('Truncated CBOR uint8');
      const v = buf[pos];
      pos += 1;
      return v;
    }
    if (info === 25) {
      if (pos + 2 > buf.length) throw new Error('Truncated CBOR uint16');
      const v = (buf[pos] << 8) | buf[pos + 1];
      pos += 2;
      return v;
    }
    if (info === 26) {
      if (pos + 4 > buf.length) throw new Error('Truncated CBOR uint32');
      const v =
        ((buf[pos] << 24) >>> 0) + (buf[pos + 1] << 16) + (buf[pos + 2] << 8) + buf[pos + 3];
      pos += 4;
      return v;
    }
    if (info === 27) {
      if (pos + 8 > buf.length) throw new Error('Truncated CBOR uint64');
      const view = new DataView(buf.buffer, buf.byteOffset + pos, 8);
      const hi = view.getUint32(0, false);
      const lo = view.getUint32(4, false);
      pos += 8;
      return hi * 2 ** 32 + lo;
    }
    throw new Error(`Unsupported CBOR additional info: ${info}`);
  };

  if (major === 0) {
    return { value: readUint(ai), nextOffset: pos };
  }
  if (major === 1) {
    return { value: -1 - readUint(ai), nextOffset: pos };
  }
  if (major === 2) {
    const len = readUint(ai);
    if (pos + len > buf.length) throw new Error('Truncated CBOR bytes');
    const slice = buf.subarray(pos, pos + len);
    return { value: slice, nextOffset: pos + len };
  }
  if (major === 3) {
    const len = readUint(ai);
    if (pos + len > buf.length) throw new Error('Truncated CBOR text');
    const text = Buffer.from(buf.subarray(pos, pos + len)).toString('utf8');
    return { value: text, nextOffset: pos + len };
  }
  if (major === 4) {
    const len = readUint(ai);
    const arr: unknown[] = [];
    let cur = pos;
    for (let i = 0; i < len; i += 1) {
      const item = decodeCborItem(buf, cur);
      arr.push(item.value);
      cur = item.nextOffset;
    }
    return { value: arr, nextOffset: cur };
  }
  if (major === 5) {
    const len = readUint(ai);
    const map = new Map<unknown, unknown>();
    let cur = pos;
    for (let i = 0; i < len; i += 1) {
      const key = decodeCborItem(buf, cur);
      const val = decodeCborItem(buf, key.nextOffset);
      map.set(key.value, val.value);
      cur = val.nextOffset;
    }
    return { value: map, nextOffset: cur };
  }
  if (major === 6) {
    // Semantic tag: skip tag number, decode inner value
    readUint(ai);
    return decodeCborItem(buf, pos);
  }
  if (major === 7) {
    if (ai === 20) return { value: false, nextOffset: pos };
    if (ai === 21) return { value: true, nextOffset: pos };
    if (ai === 22) return { value: null, nextOffset: pos };
    if (ai === 23) return { value: undefined, nextOffset: pos };
    return { value: ai, nextOffset: pos };
  }

  throw new Error(`Unsupported CBOR major type: ${major}`);
}

function coseMapToJwk(coseMap: Map<unknown, unknown>): {
  alg: -7 | -257;
  publicKeyJwk: CryptoJsonWebKey;
} {
  const kty = coseMap.get(1);
  const alg = coseMap.get(3);

  // EC2 P-256 (ES256)
  if (kty === 2 && alg === -7) {
    const crv = coseMap.get(-1);
    const x = coseMap.get(-2);
    const y = coseMap.get(-3);
    if (crv !== 1 || !(x instanceof Uint8Array) || !(y instanceof Uint8Array)) {
      throw new Error('Unsupported EC2 curve or coordinates');
    }
    return {
      alg: -7,
      publicKeyJwk: {
        kty: 'EC',
        crv: 'P-256',
        x: toBase64Url(x),
        y: toBase64Url(y),
      },
    };
  }

  // RSA (RS256)
  if (kty === 3 && alg === -257) {
    const n = coseMap.get(-1);
    const e = coseMap.get(-2);
    if (!(n instanceof Uint8Array) || !(e instanceof Uint8Array)) {
      throw new Error('Invalid RSA COSE public key');
    }
    return {
      alg: -257,
      publicKeyJwk: {
        kty: 'RSA',
        n: toBase64Url(n),
        e: toBase64Url(e),
      },
    };
  }

  throw new Error(`Unsupported WebAuthn COSE key algorithm (kty=${String(kty)}, alg=${String(alg)})`);
}

// ---------------------------------------------------------------------------
// HMAC-Signed Challenge & Short-Lived Session Tokens (Cluster-Safe)
// ---------------------------------------------------------------------------
const consumedChallengeNonces = new Map<string, number>();

function signToken(payload: object, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken<T>(token: string, secret: string): T | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

export function createChallengeToken(
  purpose: 'register' | 'auth',
  rpId: string,
  origin: string,
  secret: string,
): { challenge: string; challengeToken: string } {
  const challenge = toBase64Url(crypto.randomBytes(32));
  const nonce = toBase64Url(crypto.randomBytes(12));
  const claims: WebAuthnChallengeClaims = {
    purpose,
    challenge,
    rpId,
    origin,
    nonce,
    exp: Date.now() + 120_000, // 2 minutes
  };
  return {
    challenge,
    challengeToken: signToken(claims, secret),
  };
}

function consumeChallengeToken(
  challengeToken: string,
  expectedPurpose: 'register' | 'auth',
  secret: string,
): WebAuthnChallengeClaims {
  const now = Date.now();
  // Periodic sweep of expired nonces
  if (consumedChallengeNonces.size > 500) {
    for (const [k, exp] of consumedChallengeNonces.entries()) {
      if (exp <= now) consumedChallengeNonces.delete(k);
    }
  }

  const claims = verifyToken<WebAuthnChallengeClaims>(challengeToken, secret);
  if (!claims || claims.purpose !== expectedPurpose || claims.exp <= now) {
    throw new Error('Passkey challenge expired or invalid. Please retry.');
  }
  if (consumedChallengeNonces.has(claims.nonce)) {
    throw new Error('Passkey challenge already used.');
  }
  consumedChallengeNonces.set(claims.nonce, claims.exp);
  return claims;
}

export function issueAdminSessionToken(credId: string, secret: string, ttlMs = 15 * 60_000): string {
  const now = Date.now();
  const claims: AdminSessionClaims = {
    sub: 'admin',
    authMethod: 'passkey',
    credId,
    iat: now,
    exp: now + ttlMs,
  };
  return `adm_${signToken(claims, secret)}`;
}

export function verifyAdminSessionToken(token: string, secret: string): AdminSessionClaims | null {
  if (!token.startsWith('adm_')) return null;
  const claims = verifyToken<AdminSessionClaims>(token.slice(4), secret);
  if (!claims || claims.sub !== 'admin' || claims.exp <= Date.now()) {
    return null;
  }
  return claims;
}

// ---------------------------------------------------------------------------
// WebAuthn Registration & Authentication Verifiers
// ---------------------------------------------------------------------------
export function verifyRegistrationResponse(params: {
  challengeToken: string;
  id: string;
  rawId: string;
  clientDataJSON: string;
  attestationObject: string;
  transports?: string[];
  label?: string;
  secret: string;
}): StoredPasskey {
  const claims = consumeChallengeToken(params.challengeToken, 'register', params.secret);

  const clientDataBuf = fromBase64Url(params.clientDataJSON);
  const clientData = JSON.parse(clientDataBuf.toString('utf8')) as {
    type?: string;
    challenge?: string;
    origin?: string;
  };

  if (clientData.type !== 'webauthn.create') {
    throw new Error('Invalid WebAuthn ceremony type');
  }
  if (clientData.challenge !== claims.challenge) {
    throw new Error('WebAuthn challenge mismatch');
  }
  if (clientData.origin !== claims.origin) {
    throw new Error(`WebAuthn origin mismatch (${clientData.origin} != ${claims.origin})`);
  }

  const attBuf = fromBase64Url(params.attestationObject);
  const decodedAtt = decodeCborItem(attBuf, 0).value;
  if (!(decodedAtt instanceof Map)) {
    throw new Error('Invalid attestationObject CBOR map');
  }

  const authData = decodedAtt.get('authData');
  if (!(authData instanceof Uint8Array) || authData.length < 55) {
    throw new Error('Invalid WebAuthn authData');
  }

  // Verify RP ID hash
  const rpIdHash = authData.subarray(0, 32);
  const expectedRpHash = crypto.createHash('sha256').update(claims.rpId).digest();
  if (!crypto.timingSafeEqual(rpIdHash, expectedRpHash)) {
    throw new Error('WebAuthn RP ID hash mismatch');
  }

  const flags = authData[32];
  const userPresent = (flags & 0x01) !== 0;
  const attestedCredDataIncluded = (flags & 0x40) !== 0;
  if (!userPresent || !attestedCredDataIncluded) {
    throw new Error('Authenticator did not confirm user presence or credential key');
  }

  const view = new DataView(authData.buffer, authData.byteOffset, authData.byteLength);
  const signCount = view.getUint32(33, false);

  // Attested credential data: aaguid (16 bytes: 37..53), credIdLen (2 bytes: 53..55)
  const credIdLen = view.getUint16(53, false);
  const credIdEnd = 55 + credIdLen;
  if (credIdEnd >= authData.length) {
    throw new Error('Malformed attested credential length');
  }

  const credIdBytes = authData.subarray(55, credIdEnd);
  const credentialIdB64u = toBase64Url(credIdBytes);

  const publicKeyCbor = decodeCborItem(authData, credIdEnd).value;
  if (!(publicKeyCbor instanceof Map)) {
    throw new Error('Malformed COSE public key');
  }

  const { alg, publicKeyJwk } = coseMapToJwk(publicKeyCbor);
  const cleanLabel =
    typeof params.label === 'string' && params.label.trim()
      ? params.label.trim().slice(0, 48)
      : 'Developer Passkey';

  return {
    id: credentialIdB64u,
    label: cleanLabel,
    alg,
    publicKeyJwk,
    signCount,
    transports: Array.isArray(params.transports) ? params.transports.slice(0, 6) : [],
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
}

export function verifyAuthenticationResponse(params: {
  challengeToken: string;
  id: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  storedPasskeys: StoredPasskey[];
  secret: string;
}): { passkey: StoredPasskey; newSignCount: number } {
  const claims = consumeChallengeToken(params.challengeToken, 'auth', params.secret);

  const match = params.storedPasskeys.find((pk) => pk.id === params.id);
  if (!match) {
    throw new Error('Unknown passkey credential');
  }

  const clientDataBuf = fromBase64Url(params.clientDataJSON);
  const clientData = JSON.parse(clientDataBuf.toString('utf8')) as {
    type?: string;
    challenge?: string;
    origin?: string;
  };

  if (clientData.type !== 'webauthn.get') {
    throw new Error('Invalid WebAuthn assertion type');
  }
  if (clientData.challenge !== claims.challenge) {
    throw new Error('WebAuthn assertion challenge mismatch');
  }
  if (clientData.origin !== claims.origin) {
    throw new Error('WebAuthn assertion origin mismatch');
  }

  const authDataBuf = fromBase64Url(params.authenticatorData);
  if (authDataBuf.length < 37) {
    throw new Error('Invalid authenticatorData length');
  }

  const rpIdHash = authDataBuf.subarray(0, 32);
  const expectedRpHash = crypto.createHash('sha256').update(claims.rpId).digest();
  if (!crypto.timingSafeEqual(rpIdHash, expectedRpHash)) {
    throw new Error('WebAuthn RP ID hash mismatch');
  }

  const flags = authDataBuf[32];
  if ((flags & 0x01) === 0) {
    throw new Error('User presence check failed');
  }

  const view = new DataView(authDataBuf.buffer, authDataBuf.byteOffset, authDataBuf.byteLength);
  const newSignCount = view.getUint32(33, false);
  if (match.signCount > 0 && newSignCount > 0 && newSignCount <= match.signCount) {
    throw new Error('Authenticator signature counter did not advance (possible cloned key)');
  }

  const clientDataHash = crypto.createHash('sha256').update(clientDataBuf).digest();
  const signedPayload = Buffer.concat([authDataBuf, clientDataHash]);
  const signatureBuf = fromBase64Url(params.signature);

  const keyObject = crypto.createPublicKey({
    key: match.publicKeyJwk,
    format: 'jwk',
  });

  const validSig = crypto.verify('sha256', signedPayload, keyObject, signatureBuf);
  if (!validSig) {
    throw new Error('Invalid hardware passkey signature');
  }

  return { passkey: match, newSignCount };
}

// ---------------------------------------------------------------------------
// Cluster-Safe + Stateless Env-Pinned Passkey Store
// ---------------------------------------------------------------------------
function isValidStoredPasskey(pk: unknown): pk is StoredPasskey {
  if (!pk || typeof pk !== 'object') return false;
  const candidate = pk as Partial<StoredPasskey>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    Boolean(candidate.publicKeyJwk) &&
    typeof candidate.publicKeyJwk === 'object' &&
    (candidate.alg === -7 || candidate.alg === -257)
  );
}

export function parseEnvPasskeys(rawEnv: string | undefined): StoredPasskey[] {
  const trimmed = rawEnv?.trim();
  if (!trimmed) return [];

  const decodeSingleChunk = (chunk: string): StoredPasskey[] => {
    try {
      const jsonText = chunk.startsWith('b64:')
        ? Buffer.from(chunk.slice(4), 'base64url').toString('utf8')
        : chunk;
      const parsed = JSON.parse(jsonText);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return list.filter(isValidStoredPasskey).map((pk) => ({
        id: pk.id,
        label: typeof pk.label === 'string' && pk.label.trim() ? pk.label.trim() : 'Pinned Passkey',
        alg: pk.alg,
        publicKeyJwk: pk.publicKeyJwk,
        signCount: typeof pk.signCount === 'number' && Number.isFinite(pk.signCount) ? pk.signCount : 0,
        transports: Array.isArray(pk.transports) ? pk.transports : [],
        createdAt: typeof pk.createdAt === 'string' ? pk.createdAt : new Date(0).toISOString(),
        lastUsedAt: typeof pk.lastUsedAt === 'string' ? pk.lastUsedAt : null,
      }));
    } catch {
      return [];
    }
  };

  // Support either a single combined b64:/JSON value or multiple comma/whitespace-separated b64: tokens
  const chunks = trimmed.startsWith('b64:')
    ? trimmed
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [trimmed];

  const byId = new Map<string, StoredPasskey>();
  for (const chunk of chunks) {
    for (const pk of decodeSingleChunk(chunk)) {
      byId.set(pk.id, pk);
    }
  }
  return Array.from(byId.values());
}

export function encodePasskeysForEnv(passkeys: StoredPasskey[]): string {
  if (passkeys.length === 0) return '';
  const compact = passkeys.map((pk) => ({
    id: pk.id,
    label: pk.label,
    alg: pk.alg,
    publicKeyJwk: pk.publicKeyJwk,
    transports: pk.transports,
    createdAt: pk.createdAt,
  }));
  return `b64:${Buffer.from(JSON.stringify(compact), 'utf8').toString('base64url')}`;
}

export function createPasskeyStore(storePath: string, getEnvRaw: () => string | undefined = () => undefined) {
  let cachedDiskList: StoredPasskey[] = [];
  let cachedMtimeMs = -1;

  const readDisk = (): StoredPasskey[] => {
    try {
      const stat = fs.statSync(storePath);
      if (stat.mtimeMs === cachedMtimeMs) {
        return cachedDiskList;
      }
      const raw = fs.readFileSync(storePath, 'utf8');
      const parsed = JSON.parse(raw);
      cachedDiskList = Array.isArray(parsed) ? parsed.filter(isValidStoredPasskey) : [];
      cachedMtimeMs = stat.mtimeMs;
      return cachedDiskList;
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
        cachedDiskList = [];
        cachedMtimeMs = 0;
        return cachedDiskList;
      }
      return cachedDiskList;
    }
  };

  const readWithStatus = (): Array<StoredPasskey & { pinnedInEnv: boolean }> => {
    const envKeys = parseEnvPasskeys(getEnvRaw());
    const diskKeys = readDisk();
    const diskById = new Map(diskKeys.map((k) => [k.id, k]));
    const envIds = new Set(envKeys.map((k) => k.id));

    const merged: Array<StoredPasskey & { pinnedInEnv: boolean }> = [];

    for (const envPk of envKeys) {
      const diskOverride = diskById.get(envPk.id);
      merged.push({
        ...envPk,
        signCount: diskOverride ? Math.max(envPk.signCount, diskOverride.signCount) : envPk.signCount,
        lastUsedAt: diskOverride?.lastUsedAt ?? envPk.lastUsedAt,
        pinnedInEnv: true,
      });
    }

    for (const diskPk of diskKeys) {
      if (!envIds.has(diskPk.id)) {
        merged.push({
          ...diskPk,
          pinnedInEnv: false,
        });
      }
    }

    return merged;
  };

  const read = (): StoredPasskey[] => readWithStatus();

  const write = (passkeys: StoredPasskey[]) => {
    const dir = path.dirname(storePath);
    fs.mkdirSync(dir, { recursive: true });
    const bounded = passkeys.slice(-20); // cap max enrolled admin devices cleanly
    const tmpPath = `${storePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(bounded, null, 2), 'utf8');
    fs.renameSync(tmpPath, storePath);
    try {
      cachedMtimeMs = fs.statSync(storePath).mtimeMs;
    } catch {
      cachedMtimeMs = Date.now();
    }
    cachedDiskList = bounded;
  };

  return { read, readWithStatus, write };
}

