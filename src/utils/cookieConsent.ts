import { ThemeId } from '../components/focusDemoTypes';
import { SiteThemeId } from './siteThemes';

export const COOKIE_CONSENT_KEY = 'focusos_cookie_prefs_v1';
export const DEMO_UI_PREFS_KEY = 'focusos_demo_ui_v1';

const ENC_V1_PREFIX = 'enc:aesgcm:v1:';
const ENC_V2_PREFIX = 'enc:aesgcm:v2:';
const LEGACY_SALT = 'FocusOS::WebStorage::2026';

const KEYSTORE_DB_NAME = 'focusos_sec_db';
const KEYSTORE_STORE_NAME = 'keys';
const DEVICE_KEY_ID = 'device_aes_v2';

export interface CookiePreferences {
  necessary: true;
  uiPreferences: boolean;
  updatedAt: string;
}

export interface StoredDemoUiPrefs {
  siteTheme?: SiteThemeId;
  themeId: ThemeId;
  glassEffect: boolean;
  vibrantColour: boolean;
  showQuotes: boolean;
  stricterMode: boolean;
}

let cachedDeviceKeyPromise: Promise<CryptoKey> | null = null;
let cachedLegacyV1KeyPromise: Promise<CryptoKey> | null = null;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function openKeyStoreDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window.indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = window.indexedDB.open(KEYSTORE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEYSTORE_STORE_NAME)) {
        db.createObjectStore(KEYSTORE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

function idbGetKey(db: IDBDatabase): Promise<CryptoKey | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYSTORE_STORE_NAME, 'readonly');
    const req = tx.objectStore(KEYSTORE_STORE_NAME).get(DEVICE_KEY_ID);
    req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPutKey(db: IDBDatabase, key: CryptoKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYSTORE_STORE_NAME, 'readwrite');
    tx.objectStore(KEYSTORE_STORE_NAME).put(key, DEVICE_KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getLegacyV1Key(): Promise<CryptoKey> {
  if (!cachedLegacyV1KeyPromise) {
    cachedLegacyV1KeyPromise = (async () => {
      const encoder = new TextEncoder();
      const seedMaterial = encoder.encode(`${window.location.origin}::${LEGACY_SALT}`);
      const baseKey = await window.crypto.subtle.importKey('raw', seedMaterial, 'PBKDF2', false, [
        'deriveKey',
      ]);
      return window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode(LEGACY_SALT),
          iterations: 100_000,
          hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
    })();
  }
  return cachedLegacyV1KeyPromise;
}

/**
 * Generates or loads a hardware/browser-bound non-extractable AES-256-GCM key
 * persisted in IndexedDB (`extractable: false`). Falls back cleanly if IDB is blocked.
 */
async function getDeviceBoundKey(): Promise<CryptoKey> {
  if (!cachedDeviceKeyPromise) {
    cachedDeviceKeyPromise = (async () => {
      try {
        const db = await openKeyStoreDb();
        try {
          const existing = await idbGetKey(db);
          if (existing) {
            return existing;
          }
          const created = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false, // non-extractable: JS cannot export raw key material
            ['encrypt', 'decrypt'],
          );
          await idbPutKey(db, created);
          return created;
        } finally {
          db.close();
        }
      } catch {
        return getLegacyV1Key();
      }
    })();
  }
  return cachedDeviceKeyPromise;
}

async function encryptPayload(value: unknown): Promise<string> {
  const json = JSON.stringify(value);
  if (!window.crypto?.subtle) {
    return json;
  }
  const key = await getDeviceBoundKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(json);
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  return `${ENC_V2_PREFIX}${toBase64(iv)}:${toBase64(new Uint8Array(cipherBuffer))}`;
}

async function decryptPayload<T>(raw: string): Promise<{ data: T | null; needsUpgrade: boolean }> {
  if (!raw.startsWith(ENC_V2_PREFIX) && !raw.startsWith(ENC_V1_PREFIX)) {
    return { data: JSON.parse(raw) as T, needsUpgrade: true };
  }
  if (!window.crypto?.subtle) {
    return { data: null, needsUpgrade: false };
  }

  const isV2 = raw.startsWith(ENC_V2_PREFIX);
  const payload = raw.slice(isV2 ? ENC_V2_PREFIX.length : ENC_V1_PREFIX.length);
  const parts = payload.split(':');
  if (parts.length !== 2) {
    return { data: null, needsUpgrade: false };
  }

  const iv = fromBase64(parts[0]);
  const cipher = fromBase64(parts[1]);
  const key = isV2 ? await getDeviceBoundKey() : await getLegacyV1Key();
  const plainBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  const decoded = new TextDecoder().decode(plainBuffer);
  return { data: JSON.parse(decoded) as T, needsUpgrade: !isV2 };
}

export function hasStoredCookieConsentSync(): boolean {
  try {
    return Boolean(window.localStorage.getItem(COOKIE_CONSENT_KEY));
  } catch {
    return false;
  }
}

export async function readCookieConsentAsync(): Promise<CookiePreferences | null> {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const { data: parsed, needsUpgrade } = await decryptPayload<Partial<CookiePreferences>>(raw);
    if (!parsed || typeof parsed.uiPreferences !== 'boolean') return null;
    const normalized: CookiePreferences = {
      necessary: true,
      uiPreferences: parsed.uiPreferences,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
    if (needsUpgrade) {
      const sealed = await encryptPayload(normalized);
      window.localStorage.setItem(COOKIE_CONSENT_KEY, sealed);
    }
    return normalized;
  } catch {
    return null;
  }
}

export async function writeCookieConsentAsync(uiPreferences: boolean): Promise<CookiePreferences> {
  const prefs: CookiePreferences = {
    necessary: true,
    uiPreferences,
    updatedAt: new Date().toISOString(),
  };
  try {
    const sealed = await encryptPayload(prefs);
    window.localStorage.setItem(COOKIE_CONSENT_KEY, sealed);
    if (!uiPreferences) {
      window.localStorage.removeItem(DEMO_UI_PREFS_KEY);
    }
  } catch {
    // Storage may be disabled in private browsing contexts
  }
  return prefs;
}

export async function readDemoUiPrefsAsync(): Promise<Partial<StoredDemoUiPrefs> | null> {
  try {
    const consent = await readCookieConsentAsync();
    if (!consent?.uiPreferences) return null;
    const raw = window.localStorage.getItem(DEMO_UI_PREFS_KEY);
    if (!raw) return null;
    const { data: parsed, needsUpgrade } = await decryptPayload<Partial<StoredDemoUiPrefs>>(raw);
    if (parsed && needsUpgrade) {
      const sealed = await encryptPayload(parsed);
      window.localStorage.setItem(DEMO_UI_PREFS_KEY, sealed);
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeDemoUiPrefsAsync(prefs: StoredDemoUiPrefs): Promise<void> {
  try {
    const consent = await readCookieConsentAsync();
    if (!consent?.uiPreferences) return;
    const sealed = await encryptPayload(prefs);
    window.localStorage.setItem(DEMO_UI_PREFS_KEY, sealed);
  } catch {
    // Ignore storage quota or restricted context errors
  }
}

export function clearOptionalSiteStorage(): void {
  try {
    window.localStorage.removeItem(DEMO_UI_PREFS_KEY);
  } catch {
    // Ignore
  }
}
