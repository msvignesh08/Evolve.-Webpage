import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, BellOff, Lock, ShieldCheck, Smartphone } from 'lucide-react';

const DISTRACTION_FEED = [
  { app: 'Short Reels', detail: '34 new clips suggested while you were studying', time: 'now' },
  { app: 'Social Feed', detail: '21 unread mentions pulling your attention away', time: '1m' },
  { app: 'Video Stream', detail: 'Auto-play next episode queued in 5 seconds', time: '2m' },
];

const PROTECTED_TOOLS = [
  { app: 'Engineering Math', detail: '45 min deep work · Stricter lock active', status: 'ACTIVE' },
  { app: 'Notes & Calculator', detail: 'Allowed study utilities open', status: 'ALLOWED' },
  { app: 'Social & Video Apps', detail: 'Quietly paused until session completes', status: 'BLOCKED' },
];

export function FocusShieldShowcase() {
  const [shieldActive, setShieldActive] = useState(true);

  return (
    <section className="py-12 sm:py-20">
      <div className="mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-8 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-3 text-xs font-semibold tracking-widest text-[#60a5fa] uppercase">
            Feel the difference
          </p>
          <h2 className="text-balance font-display text-[clamp(1.85rem,3.6vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[#f4f7fb]">
            Turn phone noise into <span className="highlight-text">quiet focus.</span>
          </h2>
          <p className="mt-3.5 max-w-[490px] text-[15px] leading-relaxed text-[#9ba8bf] sm:mt-4 sm:text-base">
            Toggle the shield to compare how your phone behaves during a study block before you install Evolve.
          </p>

          {/* Segmented Mode Switch */}
          <div
            role="group"
            aria-label="Compare phone modes"
            className="glass-well mt-6 inline-flex w-full max-w-[380px] items-center gap-1 rounded-2xl p-1.5"
          >
            <button
              type="button"
              onClick={() => setShieldActive(false)}
              className={`min-h-[44px] flex-1 rounded-xl px-3 text-xs font-semibold transition-all duration-150 touch-manipulation ${
                !shieldActive
                  ? 'bg-white/12 text-[#f4f7fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]'
                  : 'text-[#8d9cb8] hover:text-[#dce5f5]'
              }`}
            >
              Without Evolve
            </button>
            <button
              type="button"
              onClick={() => setShieldActive(true)}
              className={`min-h-[44px] flex-1 rounded-xl px-3 text-xs font-semibold transition-all duration-150 touch-manipulation ${
                shieldActive
                  ? 'site-primary-btn'
                  : 'text-[#8d9cb8] hover:text-[#dce5f5]'
              }`}
            >
              With Evolve Shield
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href="#download"
              className="site-primary-btn inline-flex min-h-[48px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-sm font-semibold transition-all duration-150 active:scale-[0.98] hover:-translate-y-0.5 hover:brightness-110 sm:w-auto touch-manipulation"
            >
              <span>Install Evolve v1.0</span>
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
            <span className="text-xs text-[#7c89a1]">
              On-device only · Zero accounts
            </span>
          </div>
        </motion.div>

        {/* Interactive Glass Comparison Frame */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`rounded-[28px] p-5 transition-all duration-300 sm:p-7 ${
            shieldActive ? 'glass-surface-highlight' : 'glass-surface'
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
                  shieldActive
                    ? 'bg-[#3b82f6]/20 text-[#93c5fd]'
                    : 'bg-white/[0.06] text-[#9ba8bf]'
                }`}
              >
                {shieldActive ? (
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Smartphone className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <div>
                <p className="font-display text-sm font-bold text-[#f4f7fb]">
                  {shieldActive ? 'Evolve Shield Active' : 'Unprotected Phone State'}
                </p>
                <p className="text-[11px] text-[#8d9cb8]">
                  {shieldActive
                    ? 'Only your study allowlist stays open'
                    : 'Every app competes for your attention'}
                </p>
              </div>
            </div>

            <span
              className={`font-mono text-[11px] font-semibold ${
                shieldActive ? 'text-[#34d399]' : 'text-amber-300'
              }`}
            >
              {shieldActive ? 'LOCKED IN' : 'SCATTERED'}
            </span>
          </div>

          <div className="mt-4 min-h-[214px]">
            <AnimatePresence mode="wait">
              {shieldActive ? (
                <motion.div
                  key="protected"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-2.5"
                >
                  {PROTECTED_TOOLS.map((row) => (
                    <div
                      key={row.app}
                      className="glass-well flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-display text-xs font-semibold text-[#f4f7fb] sm:text-sm">
                          {row.app}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[#8d9cb8]">{row.detail}</p>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-[10px] font-semibold ${
                          row.status === 'BLOCKED' ? 'text-[#8d9cb8]' : 'text-[#34d399]'
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 text-[11px] text-[#9eb2d4]">
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-[#60a5fa]" aria-hidden="true" />
                      <span>We never sell your data. Not now, not ever.</span>
                    </span>
                    <span className="font-mono tabular-nums text-[#60a5fa]">45:00</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="unprotected"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-2.5"
                >
                  {DISTRACTION_FEED.map((row) => (
                    <div
                      key={row.app}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 opacity-85"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-display text-xs font-semibold text-[#e2e8f5] sm:text-sm">
                          {row.app}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[#8d9cb8]">{row.detail}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-amber-300 tabular-nums">
                        {row.time}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 text-[11px] text-[#8d9cb8]">
                    <span className="flex items-center gap-1.5">
                      <BellOff className="h-3.5 w-3.5 text-[#8d9cb8]" aria-hidden="true" />
                      <span>Tap &ldquo;With Evolve Shield&rdquo; to lock distractions out.</span>
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
