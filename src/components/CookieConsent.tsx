import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Cookie, SlidersHorizontal, X } from 'lucide-react';

interface CookieConsentProps {
  showBanner: boolean;
  isModalOpen: boolean;
  uiPreferencesEnabled: boolean;
  onAcceptOptional: () => void;
  onEssentialOnly: () => void;
  onSavePreferences: (uiPreferences: boolean) => void;
  onOpenModal: () => void;
  onCloseModal: () => void;
  onOpenCookiePolicy: () => void;
}

export function CookieConsent({
  showBanner,
  isModalOpen,
  uiPreferencesEnabled,
  onAcceptOptional,
  onEssentialOnly,
  onSavePreferences,
  onOpenModal,
  onCloseModal,
  onOpenCookiePolicy,
}: CookieConsentProps) {
  const [draftUiPrefs, setDraftUiPrefs] = useState(uiPreferencesEnabled);

  useEffect(() => {
    setDraftUiPrefs(uiPreferencesEnabled);
  }, [uiPreferencesEnabled, isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen, onCloseModal]);

  return (
    <>
      {/* Non-blocking Compact Cookie & Local Storage Notice */}
      <AnimatePresence>
        {showBanner && !isModalOpen && (
          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            aria-label="Cookie and local storage notice"
            className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-white/15 bg-[#0d1320]/95 p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[410px] sm:p-4"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#3b82f6]/15 text-[#60a5fa]">
                <Cookie className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xs font-bold text-[#f4f7fb] sm:text-sm">
                  Cookies &amp; local storage
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#9ba8bf] sm:text-xs">
                  Zero ads and zero analytics cookies. Allow optional local storage to remember your demo theme, or keep essential only.{' '}
                  <button
                    type="button"
                    onClick={onOpenCookiePolicy}
                    className="font-medium text-[#60a5fa] underline-offset-2 hover:underline touch-manipulation"
                  >
                    Cookie Policy
                  </button>
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onOpenModal}
                className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-full border border-white/12 bg-white/[0.04] px-3.5 text-xs font-medium text-[#cbd5e8] transition-colors hover:border-white/25 hover:text-white touch-manipulation"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Manage</span>
              </button>
              <button
                type="button"
                onClick={onEssentialOnly}
                className="min-h-[38px] whitespace-nowrap rounded-full border border-white/15 bg-white/[0.05] px-3.5 text-xs font-semibold text-[#f4f7fb] transition-colors hover:bg-white/[0.1] touch-manipulation"
              >
                Essential only
              </button>
              <button
                type="button"
                onClick={onAcceptOptional}
                className="min-h-[38px] whitespace-nowrap rounded-full bg-[#3b82f6] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#2563eb] touch-manipulation"
              >
                Save preferences
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Granular Cookie Preferences Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-label="Cookie and storage preferences"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            onClick={onCloseModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[88dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-[#0e1420] text-[#f4f7fb] shadow-2xl sm:rounded-3xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight text-[#f4f7fb]">
                    Cookie &amp; Storage Preferences
                  </h2>
                  <p className="mt-0.5 text-xs text-[#8d9cb8]">
                    We never sell your data. Not now, not ever. Control optional local preferences below.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close cookie preferences"
                  onClick={onCloseModal}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[#cbd5e8] transition-colors hover:text-white touch-manipulation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-6">
                {/* 1. Strictly Necessary */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-sm font-semibold text-[#f4f7fb]">
                      Strictly necessary storage
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-[#34d399]">
                      Always active
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#9ba8bf]">
                    Stores your cookie choice (<code className="text-[#dce5f5]">focusos_cookie_prefs_v1</code>) in your browser so you are not asked again on every visit.
                  </p>
                </div>

                {/* 2. Optional UI & Demo Preferences */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={draftUiPrefs}
                  onClick={() => setDraftUiPrefs((prev) => !prev)}
                  className="flex w-full items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/20 touch-manipulation"
                >
                  <div>
                    <span className="block font-display text-sm font-semibold text-[#f4f7fb]">
                      Demo theme &amp; UI preferences
                    </span>
                    <span className="mt-1.5 block text-xs leading-relaxed text-[#9ba8bf]">
                      Remembers your selected theme, glass effect, vibrant colour, quotes, and stricter mode locally (<code className="text-[#dce5f5]">focusos_demo_ui_v1</code>). Turning this off deletes saved demo preferences immediately.
                    </span>
                  </div>
                  <span
                    aria-hidden="true"
                    className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                      draftUiPrefs ? 'bg-[#22c55e]' : 'bg-white/15'
                    }`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        draftUiPrefs ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </span>
                </button>

                {/* 3. Analytics & Advertising (Always Off) */}
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-sm font-semibold text-[#f4f7fb]">
                      Advertising &amp; analytics cookies
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-[#8d9cb8]">
                      Always off
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#8d9cb8]">
                    FocusOS loads zero ad networks, zero cross-site trackers, and zero behavioural analytics cookies.
                  </p>
                </div>

                <div className="pt-1 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      onCloseModal();
                      onOpenCookiePolicy();
                    }}
                    className="text-xs font-medium text-[#60a5fa] underline-offset-2 hover:underline touch-manipulation"
                  >
                    Read full Cookie Policy
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-white/10 px-5 py-3.5 sm:px-6">
                <button
                  type="button"
                  onClick={() => onSavePreferences(false)}
                  className="min-h-[42px] whitespace-nowrap rounded-full border border-white/15 bg-white/[0.04] px-4 text-xs font-semibold text-[#cbd5e8] transition-colors hover:bg-white/[0.09] hover:text-white touch-manipulation"
                >
                  Essential only
                </button>
                <button
                  type="button"
                  onClick={() => onSavePreferences(draftUiPrefs)}
                  className="min-h-[42px] whitespace-nowrap rounded-full bg-[#3b82f6] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#2563eb] touch-manipulation"
                >
                  Save choices
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
