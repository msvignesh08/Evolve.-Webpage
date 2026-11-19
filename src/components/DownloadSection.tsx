import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Download, Info, Share2 } from 'lucide-react';

const INSTALL_STEPS = [
  {
    step: '01',
    title: 'Download the APK file',
    body: 'Tap Download APK to save FocusOS-debug.apk directly to your Android phone.',
  },
  {
    step: '02',
    title: 'Allow browser install',
    body: 'Open the downloaded file from Android notifications and allow installs from your browser when prompted.',
  },
  {
    step: '03',
    title: 'Open FocusOS & start focusing',
    body: 'Pick your theme, choose your allowed apps, and start your first session — no account needed.',
  },
];

export function DownloadSection() {
  const [showGuide, setShowGuide] = useState(false);
  const [apkNotice, setApkNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [sharedFeedback, setSharedFeedback] = useState(false);

  const handleDownloadClick = async () => {
    setChecking(true);
    setApkNotice(null);
    try {
      const response = await fetch('/FocusOS-debug.apk', { method: 'HEAD' });
      const contentType = response.headers.get('content-type') || '';
      const isActualBinary =
        response.ok &&
        !contentType.includes('text/html') &&
        !contentType.includes('application/json');

      if (isActualBinary) {
        const link = document.createElement('a');
        link.href = '/FocusOS-debug.apk';
        link.download = 'FocusOS-debug.apk';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setApkNotice('Download started. Follow the 3-step install guide below on your Android phone.');
        setShowGuide(true);
      } else {
        setApkNotice(
          'Preview mode: place your FocusOS-debug.apk (or signed release APK) in the public folder to enable direct browser downloads.',
        );
        setShowGuide(true);
      }
    } catch {
      setApkNotice(
        'Preview mode: place your FocusOS-debug.apk (or signed release APK) in the public folder to enable direct browser downloads.',
      );
      setShowGuide(true);
    } finally {
      setChecking(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FocusOS for Android',
          text: 'FocusOS helps you protect your attention with focused sessions and app blocking. We never sell your data.',
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share unavailable; fall back to copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Ignore clipboard failure
    }
    setSharedFeedback(true);
    window.setTimeout(() => setSharedFeedback(false), 1800);
  };

  return (
    <section id="download" className="py-12 sm:py-20">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[28px] border border-[#3b82f6]/30 bg-[radial-gradient(560px_280px_at_92%_0%,rgba(59,130,246,0.20),transparent_70%),linear-gradient(135deg,#111829,#0b0f19)] p-6 sm:rounded-[32px] sm:p-12"
        >
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center lg:gap-8">
            <div className="max-w-[560px]">
              <p className="mb-3 text-xs font-semibold tracking-widest text-[#60a5fa] uppercase">
                Ready when you are
              </p>
              <h2 className="text-balance font-display text-[clamp(1.85rem,3.6vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[#f4f7fb]">
                Give your next hour a purpose.
              </h2>
              <p className="mt-3.5 text-[15px] leading-relaxed text-[#9ba8bf] sm:mt-4 sm:text-base">
                Install FocusOS on your Android phone and make space for the work that matters. No ads, no accounts, and we never sell your data.
              </p>
            </div>

            <div className="flex w-full shrink-0 flex-col items-stretch sm:items-start lg:w-auto lg:min-w-[240px] lg:items-center">
              <button
                type="button"
                onClick={handleDownloadClick}
                disabled={checking}
                className="inline-flex min-h-[48px] w-full shrink-0 cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-[#3b82f6] px-7 py-3.5 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] hover:-translate-y-0.5 hover:bg-[#2563eb] hover:shadow-[0_12px_32px_rgba(59,130,246,0.34)] touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6] disabled:opacity-70 lg:w-auto"
              >
                <span>{checking ? 'Preparing APK...' : 'Download APK'}</span>
                <Download className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#91a0ba]">
                <span>Android</span>
                <span aria-hidden="true">·</span>
                <span>Zero data sold</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowGuide((prev) => !prev)}
                  aria-expanded={showGuide}
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-[#60a5fa] underline-offset-4 hover:underline touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6]"
                >
                  <span>{showGuide ? 'Hide install guide' : 'How to install on Android'}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      showGuide ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-[#a9b6cc] transition-colors hover:text-[#f4f7fb] touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6]"
                >
                  {sharedFeedback ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#34d399]" aria-hidden="true" />
                      <span>Link copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Share page</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {apkNotice && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
                className="mt-5 flex items-start gap-2.5 rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-xs leading-relaxed text-[#dce5f5]"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#60a5fa]" aria-hidden="true" />
                <span>{apkNotice}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 grid grid-cols-1 gap-3.5 border-t border-white/10 pt-6 md:grid-cols-3 md:gap-4"
              >
                {INSTALL_STEPS.map((item) => (
                  <div
                    key={item.step}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <span className="font-mono text-xs font-semibold text-[#60a5fa] tabular-nums">
                      {item.step}
                    </span>
                    <h3 className="mt-1.5 font-display text-sm font-semibold text-[#f4f7fb]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#9ba8bf]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="mt-4 max-w-[920px] text-xs leading-relaxed text-[#7c89a1]">
          Important: FocusOS and any downloadable APK build are provided &ldquo;AS IS&rdquo; without warranties of any kind. The APK referenced here is a testing/debug build; sideloading is at your own discretion and risk. FocusOS is a personal focus tool, cannot permanently lock your phone, and must not be relied upon for safety or emergency situations.
        </p>
      </div>
    </section>
  );
}
