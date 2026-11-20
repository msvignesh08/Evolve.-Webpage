import { useState } from 'react';
import { motion } from 'motion/react';
import {
  CalendarClock,
  Check,
  Clock3,
  Copy,
  Lock,
  ShieldBan,
  TrendingUp,
  Users,
} from 'lucide-react';

const FOCUS_TOPICS = [
  { label: 'General study', duration: '25 min' },
  { label: 'Engineering Mathematics', duration: '45 min' },
  { label: 'Thesis Writing', duration: '60 min' },
];

const INITIAL_APPS = [
  { name: 'Notes', allowed: true },
  { name: 'Calculator', allowed: true },
  { name: 'Instagram', allowed: false },
  { name: 'Netflix', allowed: false },
  { name: 'File Manager', allowed: false },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      delay: i * 0.06,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

export function FeaturesBento() {
  const [selectedTopic, setSelectedTopic] = useState(0);
  const [apps, setApps] = useState(INITIAL_APPS);
  const [copiedCode, setCopiedCode] = useState(false);

  const toggleApp = (index: number) => {
    setApps((prev) =>
      prev.map((app, i) => (i === index ? { ...app, allowed: !app.allowed } : app)),
    );
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText('482-910');
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1800);
  };

  const allowedCount = apps.filter((a) => a.allowed).length;
  const blockedCount = apps.length - allowedCount;

  return (
    <section id="features" className="py-14 sm:py-24">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-9 max-w-[660px] sm:mb-12"
        >
          <p className="mb-3 text-xs font-semibold tracking-widest text-[#60a5fa] uppercase">
            What you get
          </p>
          <h2 className="text-balance font-display text-[clamp(1.85rem,3.6vw,3rem)] font-bold leading-[1.12] tracking-[-0.03em] text-[#f4f7fb]">
            Build a routine that protects your attention.
          </h2>
          <p className="mt-3.5 text-[15px] leading-relaxed text-[#9ba8bf] sm:mt-4 sm:text-base">
            Evolve gives your study time a clear structure — with custom themes, UI toggles, and strict session locks when distractions show up.
          </p>
        </motion.div>

        {/* Asymmetric 3-Column Bento Grid */}
        <div className="grid grid-cols-1 gap-3.5 sm:gap-4 lg:grid-cols-3">
          {/* 1. Marquee Card (2 cols): Focused sessions */}
          <motion.article
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={cardVariants}
            className="glass-surface-highlight flex flex-col justify-between rounded-3xl p-5 transition-colors duration-200 hover:border-[#60a5fa]/50 sm:p-7 lg:col-span-2"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="max-w-[360px]">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-[#60a5fa]/30 bg-[#3b82f6]/18 text-[#93c5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] sm:mb-5">
                  <Clock3 className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-[#f4f7fb]">
                  Focused sessions
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9ba8bf]">
                  Choose a session length, pick your study topic, and give one task your full attention.
                </p>
              </div>

              <div className="glass-well w-full rounded-2xl p-3.5 sm:w-[270px] sm:shrink-0 sm:p-4">
                <p className="mb-2.5 text-xs font-medium text-[#8d9cb8]">
                  Select session focus
                </p>
                <div className="flex flex-col gap-1.5">
                  {FOCUS_TOPICS.map((topic, idx) => {
                    const active = selectedTopic === idx;
                    return (
                      <button
                        key={topic.label}
                        type="button"
                        onClick={() => setSelectedTopic(idx)}
                        className={`flex min-h-[44px] items-center justify-between rounded-xl px-3.5 py-2 text-left text-xs font-medium transition-all duration-150 active:scale-[0.98] touch-manipulation ${
                          active
                            ? 'bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white shadow-[0_6px_18px_rgba(59,130,246,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]'
                            : 'bg-white/[0.04] text-[#cbd5e8] hover:bg-white/[0.09]'
                        }`}
                      >
                        <span className="truncate">{topic.label}</span>
                        <span
                          className={`ml-2 shrink-0 font-mono text-[11px] tabular-nums ${
                            active ? 'text-white/90' : 'text-[#8d9cb8]'
                          }`}
                        >
                          {topic.duration}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.article>

          {/* 2. Single Card (1 col): Stricter mode */}
          <motion.article
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={cardVariants}
            className="glass-surface flex flex-col justify-between rounded-3xl p-5 transition-colors duration-200 hover:border-[#60a5fa]/45 sm:p-7"
          >
            <div>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-[#60a5fa]/25 bg-[#3b82f6]/15 text-[#93c5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] sm:mb-5">
                <Lock className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-display text-xl font-semibold tracking-tight text-[#f4f7fb]">
                Stricter mode
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9ba8bf]">
                No pause, Settings is blocked, and emergency exit requires a wait plus typing EXIT.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-[#8d9cb8] sm:mt-6">
              <span>No pause</span>
              <span aria-hidden="true">·</span>
              <span>EXIT confirmation</span>
            </div>
          </motion.article>

          {/* 3. Single Card (1 col): Study plan */}
          <motion.article
            custom={2}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={cardVariants}
            className="glass-surface flex flex-col justify-between rounded-3xl p-5 transition-colors duration-200 hover:border-[#60a5fa]/45 sm:p-7"
          >
            <div>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-[#60a5fa]/25 bg-[#3b82f6]/15 text-[#93c5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] sm:mb-5">
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-display text-xl font-semibold tracking-tight text-[#f4f7fb]">
                Study plan
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9ba8bf]">
                Set weekly study blocks that start automatically at their scheduled time with your chosen app group.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-[#8d9cb8] sm:mt-6">
              <span>Recurring blocks</span>
              <span aria-hidden="true">·</span>
              <span>Custom app groups</span>
            </div>
          </motion.article>

          {/* 4. Marquee Card (2 cols): Block distracting apps */}
          <motion.article
            custom={3}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={cardVariants}
            className="glass-surface-highlight flex flex-col justify-between rounded-3xl p-5 transition-colors duration-200 hover:border-[#60a5fa]/50 sm:p-7 lg:col-span-2"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="max-w-[340px]">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-[#60a5fa]/30 bg-[#3b82f6]/18 text-[#93c5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] sm:mb-5">
                  <ShieldBan className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-[#f4f7fb]">
                  Block distracting apps
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9ba8bf]">
                  Choose the apps you want available in your allowlist. During a session, other apps stay out of reach.
                </p>
                <p className="mt-4 text-xs text-[#8d9cb8] tabular-nums sm:mt-5">
                  {allowedCount} allowed · {blockedCount} blocked during session
                </p>
              </div>

              <div className="glass-well w-full rounded-2xl p-3.5 sm:w-[290px] sm:shrink-0 sm:p-4">
                <p className="mb-2.5 text-xs font-medium text-[#8d9cb8]">
                  Tap an app to test allowlist
                </p>
                <div className="flex flex-col gap-1.5">
                  {apps.map((app, idx) => (
                    <button
                      key={app.name}
                      type="button"
                      onClick={() => toggleApp(idx)}
                      className="flex min-h-[44px] items-center justify-between rounded-xl border border-white/5 bg-white/[0.04] px-3.5 py-2 text-left text-xs transition-colors duration-150 active:scale-[0.98] hover:border-white/15 hover:bg-white/[0.08] touch-manipulation"
                    >
                      <span className="font-medium text-[#e4ebf7]">{app.name}</span>
                      <span
                        className={`font-mono text-[11px] font-semibold ${
                          app.allowed ? 'text-[#34d399]' : 'text-[#8d9cb8]'
                        }`}
                      >
                        {app.allowed ? 'ALLOWED' : 'BLOCKED'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.article>

          {/* 5. Single Card (1 col): 12-week Dashboard */}
          <motion.article
            custom={4}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={cardVariants}
            className="glass-surface flex flex-col justify-between rounded-3xl p-5 transition-colors duration-200 hover:border-[#60a5fa]/45 sm:p-7"
          >
            <div>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-[#34d399]/25 bg-[#34d399]/15 text-[#6ee7b7] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] sm:mb-5">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-display text-xl font-semibold tracking-tight text-[#f4f7fb]">
                Deep progress insights
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9ba8bf]">
                See your 12-week consistency grid, peak focus hours, subject breakdown, and earned emergency passes.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-[#8d9cb8] sm:mt-6">
              <span>12-week grid</span>
              <span aria-hidden="true">·</span>
              <span>Emergency passes</span>
            </div>
          </motion.article>

          {/* 6. Marquee Card (2 cols): Focus with friends — kept the same as requested */}
          <motion.article
            custom={5}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={cardVariants}
            className="glass-surface flex flex-col justify-between rounded-3xl p-5 transition-colors duration-200 hover:border-[#60a5fa]/45 sm:p-7 lg:col-span-2"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="max-w-[360px]">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-[#60a5fa]/25 bg-[#3b82f6]/15 text-[#93c5fd] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] sm:mb-5">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-[#f4f7fb]">
                  Focus with friends
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9ba8bf]">
                  Create or join a room with a code and start a shared focus session together.
                </p>
              </div>

              <div className="glass-well w-full rounded-2xl p-3.5 sm:w-[270px] sm:shrink-0 sm:p-4">
                <p className="text-xs font-medium text-[#8d9cb8]">Shared study room</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="font-mono text-lg font-semibold tracking-wider text-[#f4f7fb] tabular-nums">
                    482-910
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-[#f4f7fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors active:scale-95 hover:border-[#60a5fa]/50 hover:text-[#93c5fd] touch-manipulation"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#34d399]" aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Copy code</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-[#7c89a1]">
                  Share a code in Evolve Rooms to study in sync.
                </p>
              </div>
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
