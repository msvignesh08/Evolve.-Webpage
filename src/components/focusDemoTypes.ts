export type DemoTab = 'home' | 'rooms' | 'plan' | 'dashboard' | 'settings';

export type ThemeId =
  | 'ios-blue'
  | 'violet'
  | 'blue'
  | 'sage'
  | 'ocean'
  | 'forest'
  | 'cloud-dancer'
  | 'mocha-mousse';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  group: 'Classic' | 'Natural' | 'Pantone-inspired';
  accent: string;
  accentSoft: string;
  ringTo: string;
  glow: string;
}

export const THEMES: ThemeDef[] = [
  {
    id: 'ios-blue',
    name: 'iOS Blue',
    group: 'Classic',
    accent: '#2f7cf6',
    accentSoft: 'rgba(47, 124, 246, 0.16)',
    ringTo: '#60a5fa',
    glow: 'rgba(47, 124, 246, 0.28)',
  },
  {
    id: 'violet',
    name: 'Violet',
    group: 'Classic',
    accent: '#8b5cf6',
    accentSoft: 'rgba(139, 92, 246, 0.16)',
    ringTo: '#c4b5fd',
    glow: 'rgba(139, 92, 246, 0.28)',
  },
  {
    id: 'blue',
    name: 'Blue',
    group: 'Classic',
    accent: '#2563eb',
    accentSoft: 'rgba(37, 99, 235, 0.16)',
    ringTo: '#93c5fd',
    glow: 'rgba(37, 99, 235, 0.28)',
  },
  {
    id: 'sage',
    name: 'Sage',
    group: 'Natural',
    accent: '#6fa882',
    accentSoft: 'rgba(111, 168, 130, 0.16)',
    ringTo: '#a7e3b9',
    glow: 'rgba(111, 168, 130, 0.24)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    group: 'Natural',
    accent: '#0ea5e9',
    accentSoft: 'rgba(14, 165, 233, 0.16)',
    ringTo: '#7dd3fc',
    glow: 'rgba(14, 165, 233, 0.26)',
  },
  {
    id: 'forest',
    name: 'Forest',
    group: 'Natural',
    accent: '#10b981',
    accentSoft: 'rgba(16, 185, 129, 0.16)',
    ringTo: '#6ee7b7',
    glow: 'rgba(16, 185, 129, 0.24)',
  },
  {
    id: 'cloud-dancer',
    name: 'Cloud Dancer 2026',
    group: 'Pantone-inspired',
    accent: '#d6d3cb',
    accentSoft: 'rgba(214, 211, 203, 0.14)',
    ringTo: '#f3f1ec',
    glow: 'rgba(214, 211, 203, 0.18)',
  },
  {
    id: 'mocha-mousse',
    name: 'Mocha Mousse',
    group: 'Pantone-inspired',
    accent: '#a47864',
    accentSoft: 'rgba(164, 120, 100, 0.18)',
    ringTo: '#d4b3a3',
    glow: 'rgba(164, 120, 100, 0.25)',
  },
];

export interface AppEntry {
  name: string;
  category: string;
  color: string;
  allowed: boolean;
}

export interface StudyBlockEntry {
  id: string;
  label: string;
  topic: string;
  duration: number;
}
