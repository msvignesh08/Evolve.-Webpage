import { useState } from 'react';
import { motion } from 'motion/react';

const STEPS = [
  {
    number: '1',
    title: 'Choose your allowed apps',
    description: 'Keep essential apps available while you focus.',
    detail: 'Create custom app groups like Default or Study so only what you need stays accessible.',
  },
  {
    number: '2',
    title: 'Pick a topic, duration & theme',
    description: 'Set a clear intention and customise your workspace.',
    detail: 'Pick from quick presets (15, 25, 45, 60 min) and switch between 8 curated themes or glass UI toggles.',
  },
  {
    number: '3',
    title: 'Start focus mode',
    description: 'Let Evolve help keep distracting apps out of reach.',
    detail: 'Enable Stricter mode whenever you want no pause and an EXIT confirmation lock.',
  },
  {
    number: '4',
    title: 'Finish and earn emergency passes',
    description: 'Complete sessions and track your 12-week consistency.',
    detail: 'Completed 15+ minute sessions build your streak and earn emergency passes for later.',
  },
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how" className="py-14 sm:py-24">
      <div className="mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-3 text-xs font-semibold tracking-widest text-[#60a5fa] uppercase">
            Simple by design
          </p>
          <h2 className="text-balance font-display text-[clamp(1.85rem,3.6vw,3rem)] font-bold leading-[1.12] tracking-[-0.03em] text-[#f4f7fb]">
            Set your rules. Start your session. Get to work.
          </h2>
          <p className="mt-4 max-w-[490px] text-[15px] leading-relaxed text-[#9ba8bf] sm:text-base">
            No complicated productivity system. Just decide what matters right now, make distractions less available, and begin.
          </p>

          <div className="glass-surface-highlight mt-6 rounded-2xl px-4 py-3.5 text-xs leading-relaxed text-[#cbd8f0] sm:mt-7 sm:px-5 sm:py-4">
            <strong className="block font-semibold text-[#f4f7fb]">
              We never sell your data. Not now, not ever.
            </strong>
            <span className="mt-1 block text-[#9eb2d4]">
              Your focus history, settings, app groups and timetable stay on your phone — with no ads, no analytics and no accounts.
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="glass-surface rounded-[28px] p-5 sm:p-7"
        >
          <div className="divide-y divide-white/10">
            {STEPS.map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className="group flex min-h-[56px] w-full items-start gap-4 py-4 text-left transition-colors first:pt-1 last:pb-1 touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6]"
                >
                  <span
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-br from-[#60a5fa] to-[#2563eb] text-white shadow-[0_6px_18px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]'
                        : 'border border-white/15 bg-white/[0.04] text-[#a9b6cc] group-hover:border-[#60a5fa]/50'
                    }`}
                  >
                    {step.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`font-display text-base font-semibold transition-colors ${
                        isActive ? 'text-[#f4f7fb]' : 'text-[#dce5f5] group-hover:text-[#f4f7fb]'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#9ba8bf]">{step.description}</p>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2 text-xs leading-relaxed text-[#60a5fa]"
                      >
                        {step.detail}
                      </motion.p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
