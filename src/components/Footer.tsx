import { ArrowUp } from 'lucide-react';
import { FocusLogo } from './FocusLogo';
import { LegalTab } from './LegalModal';

interface FooterProps {
  onOpenLegal: (tab: LegalTab) => void;
  onOpenCookiePreferences: () => void;
  onDemoClick: () => void;
}

export function Footer({ onOpenLegal, onOpenCookiePreferences, onDemoClick }: FooterProps) {
  const year = new Date().getFullYear();

  const handleDemoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.innerWidth < 768 || /android/i.test(navigator.userAgent)) {
      e.preventDefault();
      onDemoClick();
    }
  };

  return (
    <footer className="border-t border-white/10 pb-20 pt-8 text-xs text-[#7c89a1] md:pb-10">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5 font-display text-base font-bold tracking-tight text-[#f4f7fb]">
            <FocusLogo className="h-7 w-7" />
            <span>
              FocusOS<span className="text-[#3b82f6]">.</span>
            </span>
          </div>

          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href="#features" className="transition-colors hover:text-[#60a5fa]">
              Features
            </a>
            <a href="#demo" onClick={handleDemoClick} className="transition-colors hover:text-[#60a5fa]">
              Demo
            </a>
            <a href="#download" className="transition-colors hover:text-[#60a5fa]">
              Download
            </a>
            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              className="cursor-pointer transition-colors hover:text-[#60a5fa] touch-manipulation"
            >
              Privacy Notice
            </button>
            <button
              type="button"
              onClick={() => onOpenLegal('cookies')}
              className="cursor-pointer transition-colors hover:text-[#60a5fa] touch-manipulation"
            >
              Cookie Policy
            </button>
            <button
              type="button"
              onClick={onOpenCookiePreferences}
              className="cursor-pointer transition-colors hover:text-[#60a5fa] touch-manipulation"
            >
              Cookie Preferences
            </button>
            <button
              type="button"
              onClick={() => onOpenLegal('terms')}
              className="cursor-pointer transition-colors hover:text-[#60a5fa] touch-manipulation"
            >
              Terms &amp; Disclaimers
            </button>
            <button
              type="button"
              onClick={() => onOpenLegal('licenses')}
              className="cursor-pointer transition-colors hover:text-[#60a5fa] touch-manipulation"
            >
              Open Source &amp; Fonts
            </button>
          </nav>

          <a
            href="#top"
            className="inline-flex items-center gap-1.5 font-medium text-[#9ba8bf] transition-colors hover:text-[#60a5fa]"
          >
            <span>Back to top</span>
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>

        <div className="mt-5 flex flex-col justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-end">
          <p className="max-w-[780px] text-[11px] leading-relaxed text-[#6b7890]">
            FocusOS is an independent personal productivity tool provided &ldquo;AS IS&rdquo; without warranty of any kind, express or implied, and is not intended for safety-critical or emergency use. Android and Google Play are trademarks of Google LLC; Pantone is a registered trademark of Pantone LLC (Pantone-inspired theme shades are approximate digital matches); third-party app names shown in the web preview are illustrative examples with no affiliation. Web typography served via Google Fonts under the SIL Open Font License 1.1; open-source libraries licensed under MIT and ISC licenses.
          </p>

          <div className="shrink-0 sm:text-right">
            <p className="text-[11px] text-[#8d9cb8]">
              © {year} FocusOS. We never sell your data.
            </p>
            <p className="mt-1.5 flex items-baseline gap-2 text-[11px] text-[#7c89a1] sm:justify-end">
              <span>Developed by</span>
              <span className="font-display text-sm font-semibold italic tracking-[-0.02em] bg-gradient-to-r from-[#93c5fd] via-[#f4f7fb] to-[#60a5fa] bg-clip-text text-transparent">
                Phantomstrange
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-medium tracking-wide text-[#cbd5e8]">M S Vignesh</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
