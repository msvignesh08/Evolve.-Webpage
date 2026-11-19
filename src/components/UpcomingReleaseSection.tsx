import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, Gift, QrCode, ShieldCheck, Sparkles } from 'lucide-react';

type SkeletonVariant = 'gift-pass' | 'qr-room' | 'timer-skin' | 'mystery-drop';

interface UpcomingModule {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  hint: string;
  icon: typeof Gift;
  variant: SkeletonVariant;
}

const UPCOMING_MODULES: UpcomingModule[] = [
  {
    id: 'dev-gifts',
    index: '01',
    title: 'Developer Gifts & Subscriptions',
    subtitle: 'Pro passes, feature unlocks & surprise gifts from Phantomstrange',
    hint: 'Redeem subscription gifts and unrevealed in-app perks sent directly to your 12-digit device fingerprint.',
    icon: Gift,
    variant: 'gift-pass',
  },
  {
    id: 'qr-rooms',
    index: '02',
    title: 'QR Code Joining & Room Upgrades',
    subtitle: 'Instant QR scan-to-join & richer Room tab controls',
    hint: 'Scan a friend’s Focus Room QR code to co-focus in one tap, paired with refreshed Room tab layouts and status.',
    icon: QrCode,
    variant: 'qr-room',
  },
  {
    id: 'timer-skins',
    index: '03',
    title: 'New Timer Skins & UI/UX Polish',
    subtitle: 'Fresh interactive dial skins & tactile glass refinements',
    hint: 'Unlock collectible focus dial faces, smoother gesture transitions, and cleaner daily session screens.',
    icon: Sparkles,
    variant: 'timer-skin',
  },
  {
    id: 'unrevealed-drops',
    index: '04',
    title: 'Unrevealed In-App Feature Drops',
    subtitle: 'Random encrypted rewards & hidden capabilities in v2',
    hint: 'Mystery drops and unannounced FocusOS features stay sealed in the lab until the next major release wave.',
    icon: ShieldCheck,
    variant: 'mystery-drop',
  },
];

function ModuleSkeletonPreview({ variant }: { variant: SkeletonVariant }) {
  if (variant === 'qr-room') {
    return (
      <div aria-hidden="true" className="glass-well mt-5 rounded-2xl p-3.5">
        <div className="flex items-center gap-3.5">
          {/* Stylized QR Finder Matrix Skeleton */}
          <div className="grid h-16 w-16 shrink-0 grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1.5">
            <div className="skeleton-shimmer rounded-sm border border-[#60a5fa]/35" />
            <div className="skeleton-shimmer rounded-sm" />
            <div className="skeleton-shimmer rounded-sm border border-[#60a5fa]/35" />
            <div className="skeleton-shimmer rounded-sm" />
            <div className="skeleton-shimmer rounded-sm bg-[#3b82f6]/20" />
            <div className="skeleton-shimmer rounded-sm" />
            <div className="skeleton-shimmer rounded-sm border border-[#34d399]/35" />
            <div className="skeleton-shimmer rounded-sm" />
            <div className="skeleton-shimmer rounded-sm" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton-shimmer h-3 w-4/5 rounded-full" />
            <div className="skeleton-shimmer h-2.5 w-3/5 rounded-full" />
            <div className="flex items-center gap-1.5 pt-1">
              <div className="skeleton-shimmer h-4 w-4 rounded-full" />
              <div className="skeleton-shimmer h-4 w-4 rounded-full" />
              <div className="skeleton-shimmer h-4 w-4 rounded-full" />
              <div className="skeleton-shimmer h-3.5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'timer-skin') {
    return (
      <div aria-hidden="true" className="glass-well mt-5 rounded-2xl p-3.5">
        <div className="flex items-center gap-4">
          <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-[#60a5fa]/35 bg-white/[0.03]">
            <div className="skeleton-shimmer h-10 w-10 rounded-full" />
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="skeleton-shimmer h-3 w-3/4 rounded-full" />
            <div className="flex items-center gap-2">
              <div className="skeleton-shimmer h-5 w-5 rounded-full border border-[#60a5fa]/40" />
              <div className="skeleton-shimmer h-5 w-5 rounded-full border border-[#34d399]/40" />
              <div className="skeleton-shimmer h-5 w-5 rounded-full border border-[#a78bfa]/40" />
              <div className="skeleton-shimmer h-5 w-12 rounded-full" />
            </div>
            <div className="skeleton-shimmer h-2.5 w-2/3 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'mystery-drop') {
    return (
      <div aria-hidden="true" className="glass-well mt-5 space-y-2.5 rounded-2xl p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="skeleton-shimmer h-4 w-28 rounded-md" />
          <div className="skeleton-shimmer h-4 w-16 rounded-md" />
        </div>
        <div className="skeleton-shimmer h-2.5 w-full rounded-full" />
        <div className="skeleton-shimmer h-2.5 w-4/5 rounded-full" />
        <div className="flex items-center gap-2 pt-0.5">
          <div className="skeleton-shimmer h-6 flex-1 rounded-lg" />
          <div className="skeleton-shimmer h-6 w-20 rounded-lg" />
        </div>
      </div>
    );
  }

  // gift-pass
  return (
    <div aria-hidden="true" className="glass-well mt-5 space-y-2.5 rounded-2xl p-3.5">
      <div className="flex items-center gap-2.5">
        <div className="skeleton-shimmer h-8 w-8 shrink-0 rounded-xl border border-[#60a5fa]/30" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="skeleton-shimmer h-3 w-4/5 rounded-full" />
          <div className="skeleton-shimmer h-2 w-1/2 rounded-full" />
        </div>
      </div>
      <div className="skeleton-shimmer h-2.5 w-11/12 rounded-full" />
      <div className="flex items-center justify-between pt-0.5">
        <div className="skeleton-shimmer h-5 w-28 rounded-lg" />
        <div className="skeleton-shimmer h-5 w-14 rounded-lg" />
      </div>
    </div>
  );
}

export function UpcomingReleaseSection() {
  const [selectedId, setSelectedId] = useState<string>('dev-gifts');

  return (
    <section id="whats-next" className="py-12 sm:py-20">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex flex-col justify-between gap-5 sm:mb-10 md:flex-row md:items-end"
        >
          <div className="max-w-[680px]">
            <p className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold tracking-widest text-[#60a5fa] uppercase">
              <span>Website v1.0</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#34d399]">Big App &amp; Web Upgrades Loading</span>
            </p>
            <h2 className="text-balance font-display text-[clamp(1.85rem,3.6vw,3rem)] font-bold leading-[1.12] tracking-[-0.03em] text-[#f4f7fb]">
              Ready today. <span className="highlight-text">Huge drops next.</span>
            </h2>
            <p className="mt-3.5 text-[15px] leading-relaxed text-[#9ba8bf] sm:mt-4 sm:text-base">
              This is v1.0 of FocusOS — upcoming updates bring developer subscription gifts, QR code room joining, fresh timer skins, Room tab upgrades, and unrevealed in-app surprises.
            </p>
          </div>

          <a
            href="#download"
            className="glass-surface inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-semibold text-[#f4f7fb] transition-all hover:border-[#60a5fa]/50 hover:brightness-110 touch-manipulation"
          >
            <span>Install v1.0 APK now</span>
            <ArrowDown className="h-3.5 w-3.5 text-[#60a5fa]" aria-hidden="true" />
          </a>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {UPCOMING_MODULES.map((mod, idx) => {
            const Icon = mod.icon;
            const isSelected = selectedId === mod.id;
            return (
              <motion.button
                key={mod.id}
                type="button"
                onClick={() => setSelectedId(mod.id)}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className={`flex flex-col justify-between rounded-3xl p-5 text-left transition-all duration-200 active:scale-[0.99] sm:p-6 touch-manipulation ${
                  isSelected
                    ? 'glass-surface-highlight'
                    : 'glass-surface hover:border-white/25 hover:brightness-105'
                }`}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-semibold text-[#60a5fa] tabular-nums">
                      {mod.index} · COMING IN NEXT DROP
                    </span>
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-xl border transition-colors ${
                        isSelected
                          ? 'border-[#60a5fa]/45 bg-[#3b82f6]/15 text-[#93c5fd]'
                          : 'border-white/12 bg-white/[0.05] text-[#93c5fd]'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-lg font-semibold text-[#f4f7fb]">
                    {mod.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#9ba8bf]">{mod.subtitle}</p>

                  <ModuleSkeletonPreview variant={mod.variant} />
                </div>

                <p className="mt-4 text-xs leading-relaxed text-[#9ba8bf]">
                  {isSelected ? (
                    <span className="text-[#cbd5e8]">{mod.hint}</span>
                  ) : (
                    <span className="text-[#7c89a1]">Tap to inspect upcoming v2 drop details</span>
                  )}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
