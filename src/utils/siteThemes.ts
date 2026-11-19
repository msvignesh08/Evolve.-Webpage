export type SiteThemeId = 'signature' | 'dark' | 'phantom' | 'emerald';

export interface SiteThemeDefinition {
  id: SiteThemeId;
  label: string;
  description: string;
  themeColor: string;
  swatchFrom: string;
  swatchTo: string;
}

export const DEFAULT_SITE_THEME: SiteThemeId = 'signature';

export const SITE_THEMES: SiteThemeDefinition[] = [
  {
    id: 'signature',
    label: 'Signature',
    description: 'Cobalt sapphire & mint frosted glass',
    themeColor: '#070a10',
    swatchFrom: '#3b82f6',
    swatchTo: '#34d399',
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'True OLED pitch-black & titanium silver',
    themeColor: '#000000',
    swatchFrom: '#f4f4f5',
    swatchTo: '#52525b',
  },
  {
    id: 'phantom',
    label: 'Phantom',
    description: 'Electric violet & cyan neon glass',
    themeColor: '#080612',
    swatchFrom: '#8b5cf6',
    swatchTo: '#22d3ee',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    description: 'Deep pine slate & botanical mint',
    themeColor: '#050c0a',
    swatchFrom: '#10b981',
    swatchTo: '#2dd4bf',
  },
];

export function isValidSiteThemeId(value: unknown): value is SiteThemeId {
  return value === 'signature' || value === 'dark' || value === 'phantom' || value === 'emerald';
}

export function getSiteThemeMeta(id: SiteThemeId): SiteThemeDefinition {
  return SITE_THEMES.find((t) => t.id === id) ?? SITE_THEMES[0];
}
