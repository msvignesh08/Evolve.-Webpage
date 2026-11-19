import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown } from 'lucide-react';
import { FocusLogo } from './FocusLogo';

export function MobileInstallBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const downloadEl = document.getElementById('download');
      const inDownloadZone = downloadEl
        ? downloadEl.getBoundingClientRect().top < window.innerHeight * 0.75
        : false;
      setVisible(scrollY > 420 && !inDownloadZone);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="site-nav-shell fixed inset-x-0 bottom-0 z-30 border-t border-white/15 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl md:hidden"
        >
          <div className="mx-auto flex max-w-[480px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <FocusLogo className="h-8 w-8 shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-display text-xs font-bold text-[#f4f7fb]">
                  FocusOS for Android
                </p>
                <p className="truncate text-[11px] text-[#8d9cb8]">
                  Zero ads · We never sell your data
                </p>
              </div>
            </div>
            <a
              href="#download"
              className="site-primary-btn inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-transform active:scale-95 touch-manipulation"
            >
              <span>Install APK</span>
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
