import { useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';

const WEEKLY_PRESETS = [
  {
    id: 'steady',
    label: 'Steady week',
    bars: [34, 57, 45, 78, 62, 92, 72],
    minutes: [25, 45, 35, 65, 50, 80, 60],
    focusTime: '06h',
    sessions: '09',
    streak: '07',
  },
  {
    id: 'exam',
    label: 'Exam sprint',
    bars: [58, 72, 66, 88, 84, 96, 79],
    minutes: [90, 115, 105, 145, 135, 160, 125],
    focusTime: '14h',
    sessions: '18',
    streak: '12',
  },
];

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const PRIVACY_PROMISES = [
  {
    title: 'We never sell your data. Not now, not ever.',
    detail: 'Zero data brokers, zero ad profiling, zero hidden telemetry.',
  },
  {
    title: 'Everything stays on your phone',
    detail: 'Your focus history, settings, app groups and study timetable are stored locally on your device.',
  },
  {
    title: 'No ads, no analytics, no accounts',
    detail: 'Install and start focusing immediately without creating an account or handing over personal details.',
  },
];

export function ProgressSection() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(5);
  const current = WEEKLY_PRESETS[presetIdx];
  const chartRef = useRef<HTMLDivElement>(null);
  const isChartInView = useInView(chartRef, { once: true, amount: 0.25 });

  return (
    <section id="privacy" className="py-14 sm:py-24">
      <div className="mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        {/* Left Column: Interactive Progress Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-surface-highlight rounded-[28px] p-5 sm:p-7"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <strong className="block font-display text-lg font-semibold text-[#f4f7fb]">
                Your focus, over time
              </strong>
              <span className="font-mono text-xs text-[#8d9cb8] tabular-nums">
                {DAYS[selectedDayIdx]} · {current.minutes[selectedDayIdx]}m focused
              </span>
            </div>

            <div
              role="group"
              aria-label="Preview weekly routine"
              className="glass-well flex items-center gap-1 rounded-xl p-1"
            >
              {WEEKLY_PRESETS.map((preset, idx) => {
                const active = presetIdx === idx;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPresetIdx(idx)}
                    className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 touch-manipulation ${
                      active
                        ? 'bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white shadow-[0_4px_14px_rgba(59,130,246,0.35)]'
                        : 'text-[#9ba8bf] hover:text-[#f4f7fb]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            ref={chartRef}
            aria-label="Illustrative weekly focus chart"
            className="flex h-[164px] items-end gap-2 border-b border-white/10 px-1 pb-4 sm:gap-3 sm:px-2 sm:pb-5"
          >
            {current.bars.map((heightPct, idx) => {
              const selected = selectedDayIdx === idx;
              return (
                <button
                  key={DAYS[idx]}
                  type="button"
                  onClick={() => setSelectedDayIdx(idx)}
                  aria-label={`${DAYS[idx]} ${current.minutes[idx]} minutes`}
                  className="flex h-full flex-1 cursor-pointer items-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6] touch-manipulation"
                >
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: isChartInView ? heightPct / 100 : 0 }}
                    transition={{
                      duration: 0.45,
                      delay: idx * 0.04,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{ height: '100%', transformOrigin: 'bottom' }}
                    className={`w-full rounded-t-lg rounded-b-[3px] transition-all duration-150 ${
                      selected
                        ? 'bg-gradient-to-b from-[#93c5fd] via-[#60a5fa] to-[#3b82f6] opacity-100 shadow-[0_0_20px_rgba(96,165,250,0.45)]'
                        : 'bg-gradient-to-b from-[#60a5fa] to-[#2563eb] opacity-60 hover:opacity-88'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div className="flex justify-around pt-2.5 text-[10px] font-medium tracking-wider text-[#7c89a1]">
            {DAYS.map((day, idx) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDayIdx(idx)}
                className={`min-h-[32px] px-1 transition-colors touch-manipulation ${
                  selectedDayIdx === idx ? 'font-bold text-[#93c5fd]' : 'hover:text-[#dce5f5]'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-2.5">
            <div className="glass-well rounded-xl p-3 sm:p-3.5">
              <b className="block font-display text-lg font-bold text-[#f4f7fb] tabular-nums sm:text-xl">
                {current.focusTime}
              </b>
              <small className="text-[10px] tracking-wider text-[#9ba8bf] uppercase">
                Focus time
              </small>
            </div>
            <div className="glass-well rounded-xl p-3 sm:p-3.5">
              <b className="block font-display text-lg font-bold text-[#f4f7fb] tabular-nums sm:text-xl">
                {current.sessions}
              </b>
              <small className="text-[10px] tracking-wider text-[#9ba8bf] uppercase">
                Sessions
              </small>
            </div>
            <div className="glass-well rounded-xl p-3 sm:p-3.5">
              <b className="block font-display text-lg font-bold text-[#f4f7fb] tabular-nums sm:text-xl">
                {current.streak}
              </b>
              <small className="text-[10px] tracking-wider text-[#9ba8bf] uppercase">
                Day streak
              </small>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-[#7c89a1]">
            Illustrative preview — tap any day bar to inspect. Actual stats stay private on your device.
          </p>
        </motion.div>

        {/* Right Column: Core Privacy Motto & Commitments */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.48, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-widest text-[#34d399] uppercase">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Your privacy comes first</span>
          </p>
          <h2 className="text-balance font-display text-[clamp(1.85rem,3.6vw,3rem)] font-bold leading-[1.12] tracking-[-0.03em] text-[#f4f7fb]">
            We never sell your data. Not now, not ever.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#9ba8bf] sm:text-base">
            FocusOS is built to protect your attention, not monetize it. Track your progress and build your streak knowing your habits stay completely yours.
          </p>

          <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
            {PRIVACY_PROMISES.map((item) => (
              <div key={item.title}>
                <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                  {item.title}
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-[#8d9cb8]">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          <a
            href="#download"
            className="glass-surface mt-6 inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-sm font-semibold text-[#f4f7fb] transition-all duration-150 active:scale-[0.98] hover:border-[#60a5fa]/55 hover:brightness-110 touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6] sm:mt-7 sm:w-auto"
          >
            <span>Download FocusOS</span>
            <ArrowUpRight className="h-4 w-4 text-[#60a5fa]" aria-hidden="true" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
