import { useState } from 'react';
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { FocusLogo } from './FocusLogo';
import { SiteThemeSwitcher } from './SiteThemeSwitcher';
import { SiteThemeId } from '../utils/siteThemes';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#demo', label: 'Demo' },
  { href: '#how', label: 'How it works' },
  { href: '#permissions', label: 'Permissions' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#faq', label: 'FAQ' },
];

interface NavbarProps {
  onDemoClick: () => void;
  siteTheme: SiteThemeId;
  onChangeSiteTheme: (theme: SiteThemeId) => void;
}

export function Navbar({ onDemoClick, siteTheme, onChangeSiteTheme }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 32,
    restDelta: 0.001,
  });

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMobileOpen(false);
    if (href === '#demo' && (window.innerWidth < 768 || /android/i.test(navigator.userAgent))) {
      e.preventDefault();
      onDemoClick();
    }
  };

  return (
    <header className="site-nav-shell sticky top-0 z-40 border-b border-white/12 pt-[env(safe-area-inset-top)] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_-1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-colors duration-200">
      {/* Hairline scroll progress bar */}
      <motion.div
        aria-hidden="true"
        className="site-progress-line pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left"
        style={{ scaleX }}
      />

      <div className="mx-auto flex h-14 max-w-[1160px] items-center justify-between gap-4 px-4 sm:h-[72px] sm:gap-8 sm:px-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          aria-label="Evolve home"
          className="flex min-h-[44px] shrink-0 items-center gap-2.5 whitespace-nowrap font-display text-lg font-bold tracking-tight text-[#f4f7fb] touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3b82f6] sm:text-xl"
        >
          <FocusLogo className="h-8 w-8 sm:h-9 sm:w-9" />
          <span>
            Evolve<span style={{ color: 'var(--site-accent-pale)' }}>.</span>
          </span>
        </a>

        {/* Zone 2: 6 concise single-line nav links */}
        <nav aria-label="Primary navigation" className="hidden items-center gap-5 md:flex lg:gap-7">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleLinkClick(e, link.href)}
              className="group relative shrink-0 whitespace-nowrap py-1 text-sm font-medium text-[#a9b6cc] transition-colors duration-150 hover:text-[#f4f7fb] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3b82f6]"
            >
              {link.label}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-0.5 h-[1.5px] origin-left scale-x-0 bg-gradient-to-r from-[#60a5fa] to-[#34d399] transition-transform duration-200 ease-out group-hover:scale-x-100"
              />
            </a>
          ))}
        </nav>

        {/* Zone 3: Theme switcher + primary action + mobile menu toggle */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <SiteThemeSwitcher
            siteTheme={siteTheme}
            onChangeSiteTheme={onChangeSiteTheme}
            variant="navbar"
          />

          <a
            href="#download"
            className="site-primary-btn hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-150 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 md:inline-flex"
          >
            <span>Get Evolve</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-[#f4f7fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md transition-transform duration-150 active:scale-95 hover:border-white/35 touch-manipulation md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            aria-label="Mobile navigation"
            className="site-drawer-shell border-t border-white/10 px-4 py-4 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href)}
                  className="flex min-h-[48px] items-center justify-between rounded-xl px-3.5 text-base font-medium text-[#d4def0] transition-colors active:bg-white/10 hover:bg-white/5 hover:text-[#60a5fa] touch-manipulation"
                >
                  <span>{link.label}</span>
                  {link.href === '#demo' && (
                    <span className="font-mono text-[11px] text-[#60a5fa]">1:1 App</span>
                  )}
                </a>
              ))}
              <a
                href="#download"
                onClick={() => setMobileOpen(false)}
                className="site-primary-btn mt-2 flex min-h-[48px] items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-transform active:scale-[0.98] touch-manipulation"
              >
                <span>Download for Android</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
