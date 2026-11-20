import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowDown, ArrowRight, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import { FocusLogo } from './FocusLogo';

const CAPABILITY_STRIP = [
  'Focus sessions',
  'App blocking',
  'Study timetable',
  '12-week dashboard',
  'Focus rooms',
  'We never sell your data',
];

interface HeroProps {
  onOpenDemo: () => void;
}

export function Hero({ onOpenDemo }: HeroProps) {
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const cardY = useTransform(scrollYProgress, [0, 1], [0, -26]);

  const handleDemoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.innerWidth < 768 || /android/i.test(navigator.userAgent)) {
      e.preventDefault();
      onOpenDemo();
    }
  };

  return (
    <>
      <section ref={heroRef} className="relative overflow-hidden pb-12 pt-8 sm:pb-24 sm:pt-20">
        <div className="mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="mb-3.5 text-xs font-semibold tracking-wide text-[#60a5fa] sm:mb-5 sm:text-sm">
              Evolve for Android · Zero ads · We never sell your data
            </p>

            <h1 className="max-w-[640px] text-balance font-display text-[clamp(2.15rem,8.4vw,4.5rem)] font-bold leading-[1.04] tracking-[-0.04em] text-[#f4f7fb]">
              Make time for <span className="highlight-text">what matters.</span>
            </h1>

            <p className="mt-4 max-w-[530px] text-[15px] leading-relaxed text-[#9ba8bf] sm:mt-6 sm:text-lg">
              Less scrolling. More doing. Evolve protects your attention on Android with focused sessions, smart app blocking, custom themes, and on-device progress tracking.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3.5">
              <a
                href="#download"
                className="site-primary-btn inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 py-3 text-sm font-semibold transition-all duration-150 active:scale-[0.98] hover:-translate-y-0.5 hover:brightness-110 touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 sm:w-auto"
              >
                <span>Download for Android</span>
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>

              <a
                href="#demo"
                onClick={handleDemoClick}
                className="glass-surface inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-sm font-semibold text-[#f4f7fb] transition-all duration-150 active:scale-[0.98] hover:border-[#60a5fa]/55 hover:brightness-110 touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6] sm:w-auto"
              >
                <Smartphone className="h-4 w-4 text-[#60a5fa]" aria-hidden="true" />
                <span>Try interactive demo</span>
              </a>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7c89a1] sm:mt-6">
              <span>8 custom themes</span>
              <span aria-hidden="true">·</span>
              <span>Glass &amp; vibrant UI toggles</span>
              <span aria-hidden="true">·</span>
              <span>All data stays on your phone</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            style={{ y: cardY }}
            className="relative flex flex-col items-center justify-center"
          >
            <div
              aria-hidden="true"
              className="site-hero-aura pointer-events-none absolute h-[320px] w-[320px] rounded-full blur-2xl sm:h-[360px] sm:w-[360px]"
            />

            <div className="glass-surface-highlight relative z-10 w-full max-w-[400px] overflow-hidden rounded-[32px] p-5 sm:p-7">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FocusLogo className="h-9 w-9" />
                  <div>
                    <p className="font-display text-lg font-bold tracking-tight text-[#f4f7fb]">
                      Evolve<span style={{ color: 'var(--site-accent-pale)' }}>.</span>
                    </p>
                    <p className="text-xs text-[#8d9cb8]">Make time for what matters.</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34d399]">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_rgba(52,211,153,0.85)]"
                    aria-hidden="true"
                  />
                  <span>Ready</span>
                </span>
              </div>

              <div className="glass-well mt-5 rounded-2xl px-4 py-3 text-xs italic text-[#cbd8f0]">
                “Get yourself back on track.”
              </div>

              <div className="glass-well mt-4 flex flex-col items-center rounded-2xl px-4 py-5 sm:mt-5 sm:px-5 sm:py-6">
                <div className="relative flex h-[148px] w-[148px] items-center justify-center sm:h-[156px] sm:w-[156px]">
                  <svg className="h-full w-full -rotate-90 drop-shadow-[0_0_14px_rgba(59,130,246,0.35)]" viewBox="0 0 140 140" aria-hidden="true">
                    <defs>
                      <linearGradient id="heroRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--site-accent-pale)" />
                        <stop offset="55%" stopColor="var(--site-accent)" />
                        <stop offset="100%" stopColor="var(--site-accent-mint)" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="70"
                      cy="70"
                      r="58"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="70"
                      cy="70"
                      r="58"
                      fill="none"
                      stroke="url(#heroRingGrad)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 58}
                      strokeDashoffset={2 * Math.PI * 58 * 0.24}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-3xl font-bold tracking-tight text-[#f4f7fb] tabular-nums">
                      25:00
                    </span>
                    <span className="mt-1 text-[10px] font-medium tracking-widest text-[#8d9cb8] uppercase">
                      25 min session
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid w-full grid-cols-2 gap-2.5 text-left">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#f4f7fb]">
                      <Lock className="h-3.5 w-3.5 text-[#60a5fa]" aria-hidden="true" />
                      <span>Stricter mode</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#8d9cb8]">No pause · EXIT lock</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#f4f7fb]">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#34d399]" aria-hidden="true" />
                      <span>Zero tracking</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#8d9cb8]">Stays on device</p>
                  </div>
                </div>

                <a
                  href="#demo"
                  onClick={handleDemoClick}
                  className="site-primary-btn mt-4 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] hover:brightness-110 touch-manipulation"
                >
                  <span>Open interactive app demo</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="border-y border-white/10 bg-white/[0.025] py-4 backdrop-blur-md sm:py-5">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-x-5 gap-y-2.5 px-4 text-xs text-[#9ba8bf] sm:gap-x-8 sm:px-6 sm:text-sm">
          {CAPABILITY_STRIP.map((item, idx) => (
            <div key={item} className="flex items-center gap-2 sm:gap-3">
              <span className="font-mono text-xs font-semibold text-[#60a5fa] tabular-nums">
                0{idx + 1}
              </span>
              <span className="font-medium text-[#e2e8f5]">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
