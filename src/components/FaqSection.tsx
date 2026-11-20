import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus } from 'lucide-react';

const FAQS = [
  {
    question: 'Do you collect or sell my data?',
    answer:
      'No. We never sell your data — not now, not ever. Evolve has no ads, no analytics, and no accounts. Your focus history, settings, app groups, and timetable stay on your phone.',
  },
  {
    question: 'Is Evolve available for Android?',
    answer:
      'Yes. This website is prepared for the Android APK build supplied with it.',
  },
  {
    question: 'Why does Evolve ask for multiple Android permissions?',
    answer:
      'Android sandboxes every app, so blocking distractions needs separate toggles: Usage Access detects blocked apps, Display Over Other Apps shows the shield screen, Optional Accessibility guards Stricter Mode, Notifications & Battery exemption keep your timer alive on One UI/MIUI/Poco/Moto, and Exact Alarms start Study Plan blocks. Open the Permissions tab in the navigation bar for full details on each toggle.',
  },
  {
    question: 'Can I customize the look and feel of Evolve?',
    answer:
      'Yes. Evolve includes 8 built-in themes (iOS Blue, Violet, Blue, Sage, Ocean, Forest, Cloud Dancer 2026, and Mocha Mousse) along with toggles for glass effects, vibrant colour, and motivational quotes. Try them live in the Demo tab above.',
  },
  {
    question: 'Can I study with friends?',
    answer:
      'Evolve includes Rooms, where you can create a room or join one using a room code. Room features need a working server connection.',
  },
  {
    question: 'Is this the final Play Store release?',
    answer:
      "No. The APK bundled with this starter website is a debug/testing build. Use a signed release APK for public distribution and follow Google Play's publishing requirements for the Play Store version.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-14 sm:py-24">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 max-w-[660px] sm:mb-10"
        >
          <p className="mb-3 text-xs font-semibold tracking-widest text-[#60a5fa] uppercase">
            Questions
          </p>
          <h2 className="text-balance font-display text-[clamp(1.85rem,3.6vw,3rem)] font-bold leading-[1.12] tracking-[-0.03em] text-[#f4f7fb]">
            Good to know.
          </h2>
          <p className="mt-3 text-[15px] text-[#9ba8bf] sm:text-base">
            A few details before you get started.
          </p>
        </motion.div>

        <div className="glass-surface max-w-[820px] divide-y divide-white/10 rounded-3xl px-5 sm:px-7">
          {FAQS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={item.question} className="py-4 sm:py-5">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex min-h-[48px] w-full items-center justify-between gap-4 text-left touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3b82f6] sm:gap-6"
                >
                  <span className="font-display text-base font-semibold text-[#f4f7fb] sm:text-lg">
                    {item.question}
                  </span>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors ${
                      isOpen
                        ? 'border-[#60a5fa]/50 bg-[#3b82f6]/20 text-[#93c5fd]'
                        : 'border-white/12 bg-white/[0.04] text-[#60a5fa]'
                    }`}
                  >
                    {isOpen ? (
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="pr-10 pt-3 text-sm leading-relaxed text-[#9ba8bf] sm:pr-12"
                    >
                      {item.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
