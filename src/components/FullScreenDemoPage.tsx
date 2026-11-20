import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowLeft } from 'lucide-react';
import { FocusAppSimulator, FocusSimulatorControlledProps } from './FocusAppSimulator';

interface FullScreenDemoPageProps extends FocusSimulatorControlledProps {
  onClose: () => void;
  onJumpToDownload: () => void;
}

export function FullScreenDemoPage({
  onClose,
  onJumpToDownload,
  ...simulatorProps
}: FullScreenDemoPageProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label="Evolve full-screen 1:1 interactive app demo"
      className="site-bg site-theme-scope fixed inset-0 z-50 flex h-[100dvh] w-full flex-col text-[#f4f7fb]"
    >
      {/* Minimal Separate-Page Navigation Bar (clears notch / Dynamic Island / punch-hole) */}
      <div className="site-nav-shell flex min-h-[48px] shrink-0 items-center justify-between border-b border-white/10 px-3 pt-[env(safe-area-inset-top)] pb-1.5 backdrop-blur-xl sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-[#cbd5e8] transition-colors active:scale-95 hover:text-white touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to site</span>
        </button>

        <span className="font-mono text-[11px] font-medium text-[#7c89a1]">
          Evolve · 1:1 Demo
        </span>

        <button
          type="button"
          onClick={onJumpToDownload}
          className="site-primary-btn inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-transform active:scale-95 touch-manipulation"
        >
          <span>Install</span>
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* 1:1 Full-Screen App Viewport (100% edge-to-edge on mobile/Android) */}
      <div className="focus-app-sim-root mx-auto flex min-h-0 w-full flex-1 flex-col md:my-4 md:max-w-[440px] md:overflow-hidden md:rounded-[34px] md:border md:border-white/15 md:shadow-2xl">
        <FocusAppSimulator {...simulatorProps} isFullScreen />
      </div>
    </motion.div>
  );
}
