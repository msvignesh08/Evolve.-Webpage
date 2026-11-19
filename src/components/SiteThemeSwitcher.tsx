import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Palette } from 'lucide-react';
import { SITE_THEMES, SiteThemeId, getSiteThemeMeta } from '../utils/siteThemes';

interface SiteThemeSwitcherProps {
  siteTheme: SiteThemeId;
  onChangeSiteTheme: (theme: SiteThemeId) => void;
  variant?: 'navbar' | 'inline';
}

export function SiteThemeSwitcher({
  siteTheme,
  onChangeSiteTheme,
  variant = 'navbar',
}: SiteThemeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeMeta = getSiteThemeMeta(siteTheme);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (variant === 'inline') {
    return (
      <div
        role="group"
        aria-label="Site visual theme"
        className="glass-well inline-flex flex-wrap items-center gap-1 rounded-2xl p-1"
      >
        {SITE_THEMES.map((theme) => {
          const active = theme.id === siteTheme;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChangeSiteTheme(theme.id)}
              aria-pressed={active}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all touch-manipulation ${
                active
                  ? 'bg-white/15 text-[#f4f7fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                  : 'text-[#8d9cb8] hover:text-[#e2e8f5]'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full border border-white/25"
                style={{
                  background: `linear-gradient(135deg, ${theme.swatchFrom}, ${theme.swatchTo})`,
                }}
              />
              <span>{theme.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Site theme: ${activeMeta.label}. Switch site theme`}
        className="glass-surface inline-flex min-h-[42px] items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-[#f4f7fb] transition-all hover:border-white/30 hover:brightness-110 active:scale-95 touch-manipulation sm:px-3.5"
      >
        <span
          aria-hidden="true"
          className="h-3 w-3 shrink-0 rounded-full border border-white/35 shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${activeMeta.swatchFrom}, ${activeMeta.swatchTo})`,
          }}
        />
        <span className="hidden sm:inline">{activeMeta.label}</span>
        <Palette className="h-3.5 w-3.5 opacity-80 sm:hidden" aria-hidden="true" />
        <ChevronDown
          className={`h-3.5 w-3.5 opacity-75 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            role="listbox"
            aria-label="Choose site theme"
            className="glass-surface-highlight absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-2xl p-2 shadow-2xl"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
              Site Theme
            </div>
            <div className="space-y-1">
              {SITE_THEMES.map((theme) => {
                const selected = theme.id === siteTheme;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChangeSiteTheme(theme.id);
                      setOpen(false);
                    }}
                    className={`flex min-h-[46px] w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors touch-manipulation ${
                      selected
                        ? 'bg-white/12 text-[#f4f7fb]'
                        : 'text-[#cbd5e8] hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0 rounded-lg border border-white/25 shadow-inner"
                        style={{
                          background: `linear-gradient(135deg, ${theme.swatchFrom}, ${theme.swatchTo})`,
                        }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold leading-tight">{theme.label}</div>
                        <div className="truncate text-[10px] text-[#8d9cb8]">
                          {theme.description}
                        </div>
                      </div>
                    </div>
                    {selected && (
                      <Check
                        className="h-3.5 w-3.5 shrink-0 text-[#f4f7fb]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
