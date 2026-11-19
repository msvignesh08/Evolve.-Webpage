import { ThemeId } from '../components/focusDemoTypes';

export const COOKIE_CONSENT_KEY = 'focusos_cookie_prefs_v1';
export const DEMO_UI_PREFS_KEY = 'focusos_demo_ui_v1';

export interface CookiePreferences {
  necessary: true;
  uiPreferences: boolean;
  updatedAt: string;
}

export interface StoredDemoUiPrefs {
  themeId: ThemeId;
  glassEffect: boolean;
  vibrantColour: boolean;
  showQuotes: boolean;
  stricterMode: boolean;
}

export function readCookieConsent(): CookiePreferences | null {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookiePreferences>;
    if (typeof parsed.uiPreferences !== 'boolean') return null;
    return {
      necessary: true,
      uiPreferences: parsed.uiPreferences,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(uiPreferences: boolean): CookiePreferences {
  const prefs: CookiePreferences = {
    necessary: true,
    uiPreferences,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    if (!uiPreferences) {
      window.localStorage.removeItem(DEMO_UI_PREFS_KEY);
    }
  } catch {
    // Storage may be disabled in private browsing contexts
  }
  return prefs;
}

export function readDemoUiPrefs(): Partial<StoredDemoUiPrefs> | null {
  try {
    const consent = readCookieConsent();
    if (!consent?.uiPreferences) return null;
    const raw = window.localStorage.getItem(DEMO_UI_PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<StoredDemoUiPrefs>;
  } catch {
    return null;
  }
}

export function writeDemoUiPrefs(prefs: StoredDemoUiPrefs): void {
  try {
    const consent = readCookieConsent();
    if (!consent?.uiPreferences) return;
    window.localStorage.setItem(DEMO_UI_PREFS_KEY, JSON.stringify(prefs));
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
