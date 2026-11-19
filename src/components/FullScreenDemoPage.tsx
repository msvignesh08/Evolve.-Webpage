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
      aria-label="FocusOS full-screen 1:1 interactive app demo"
      className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col bg-[#070a10] text-[#f4f7fb]"
    >
      {/* Minimal Separate-Page Navigation Bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-[#070a10]/95 px-3 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-[#cbd5e8] transition-colors active:scale-95 hover:text-white touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to site</span>
        </button>

        <span className="font-mono text-[11px] font-medium text-[#7c89a1]">
          FocusOS · 1:1 Demo
        </span>

        <button
          type="button"
          onClick={onJumpToDownload}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-[#3b82f6] px-3.5 text-xs font-semibold text-white transition-transform active:scale-95 touch-manipulation"
        >
          <span>Install</span>
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* 1:1 Full-Screen App Viewport (100% edge-to-edge on mobile/Android) */}
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col md:my-4 md:max-w-[440px] md:overflow-hidden md:rounded-[34px] md:border md:border-white/15 md:shadow-2xl">
        <FocusAppSimulator {...simulatorProps} isFullScreen />
      </div>
    </motion.div>
  );
}
