import { motion } from 'motion/react';
import {
  ChevronRight,
  Clock3,
  Lock,
  Maximize2,
  ShieldAlert,
  Smartphone,
  TrendingUp,
} from 'lucide-react';
import { FocusAppSimulator, FocusSimulatorControlledProps } from './FocusAppSimulator';
import { THEMES } from './focusDemoTypes';

interface InteractiveDemoSectionProps extends FocusSimulatorControlledProps {
  onOpenFullScreen: () => void;
  onTriggerBlockedPopup: () => void;
}

export function InteractiveDemoSection({
  onOpenFullScreen,
  onTriggerBlockedPopup,
  ...simProps
}: InteractiveDemoSectionProps) {
  const {
    activeTab,
    setActiveTab,
    themeId,
    setThemeId,
    glassEffect,
    setGlassEffect,
    vibrantColour,
    setVibrantColour,
    showQuotes,
    setShowQuotes,
    stricterMode,
    setStricterMode,
    setShowAllowedAppsScreen,
    setLegalModal,
  } = simProps;

  const activeTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  const handleOpenBlockedPopup = () => {
    onTriggerBlockedPopup();
    if (window.innerWidth < 768 || /android/i.test(navigator.userAgent)) {
      onOpenFullScreen();
    }
  };

  return (
    <section id="demo" className="site-demo-section border-y border-white/10 py-14 backdrop-blur-sm sm:py-24">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex flex-col justify-between gap-5 sm:mb-10 md:flex-row md:items-end"
        >
          <div className="max-w-[660px]">
            <p
              className="mb-3 text-xs font-semibold tracking-widest uppercase"
              style={{ color: activeTheme.ringTo }}
            >
              Interactive App Demo
            </p>
            <h2 className="text-balance font-display text-[clamp(1.85rem,3.6vw,3rem)] font-bold leading-[1.12] tracking-[-0.03em] text-[#f4f7fb]">
              Try FocusOS before you install.
            </h2>
            <p className="mt-3.5 text-[15px] leading-relaxed text-[#9ba8bf] sm:mt-4 sm:text-base">
              Explore every screen of the Android app — switch between the 8 themes, toggle glass and vibrant UI modes, test app allowlists, and run a focus session.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenFullScreen}
            className="site-primary-btn inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-150 active:scale-[0.98] hover:-translate-y-0.5 hover:brightness-110 touch-manipulation"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            <span>Open 1:1 full-screen demo</span>
          </button>
        </motion.div>

        {/* Mobile Quick Launch Banner for Android & iPhone */}
        <div className="glass-surface-highlight mb-6 rounded-3xl p-5 md:hidden">
          <div className="flex items-start gap-3">
            <span className="site-primary-btn grid h-10 w-10 shrink-0 place-items-center rounded-xl">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-[#f4f7fb]">
                Experience FocusOS 1:1 on your phone
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#9ba8bf]">
                Launch the demo as a full-screen edge-to-edge app page with zero website borders.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenFullScreen}
            className="site-primary-btn mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-transform active:scale-[0.98] touch-manipulation"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            <span>Launch full-screen app demo</span>
          </button>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
          {/* Desktop / Tablet Framed Phone Simulator */}
          <div className="hidden flex-col items-center md:flex">
            <div className="focus-app-sim-root relative w-full max-w-[356px] rounded-[42px] border border-white/25 bg-gradient-to-br from-[#263044]/95 via-[#101522]/95 to-[#080a10]/95 p-3 shadow-[0_32px_90px_rgba(0,0,0,0.68),0_0_40px_-14px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.22)]">
              <FocusAppSimulator {...simProps} />
            </div>
            <p className="mt-3 text-center text-[11px] text-[#7c89a1]">
              Interactive web simulation for preview purposes only.
            </p>
          </div>

          {/* Live Theme & UI/UX Controls */}
          <div className="flex flex-col gap-5">
            <div className="glass-surface rounded-3xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#f4f7fb]">
                    Live theme &amp; UI/UX controls
                  </h3>
                  <p className="mt-1 text-xs text-[#8d9cb8]">
                    Change the app&apos;s look right here — changes sync to the 1:1 demo instantly.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#9ba8bf]">{activeTheme.name}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {THEMES.map((t) => {
                  const selected = t.id === themeId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setThemeId(t.id);
                        if (activeTab === 'home' && simProps.showAllowedAppsScreen) {
                          setShowAllowedAppsScreen(false);
                        }
                      }}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 touch-manipulation"
                      style={{
                        borderColor: selected ? t.accent : 'rgba(255,255,255,0.12)',
                        backgroundColor: selected ? t.accentSoft : 'rgba(255,255,255,0.03)',
                        color: selected ? '#f4f7fb' : '#a9b6cc',
                      }}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: t.accent }}
                      />
                      <span>{t.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  {
                    label: 'Glass effect',
                    desc: 'Frosted translucent cards',
                    active: glassEffect,
                    onClick: () => setGlassEffect(!glassEffect),
                  },
                  {
                    label: 'Vibrant colour',
                    desc: 'Ambient glow & tinted cards',
                    active: vibrantColour,
                    onClick: () => setVibrantColour(!vibrantColour),
                  },
                  {
                    label: 'Motivational quotes',
                    desc: 'Dynamic quote banner',
                    active: showQuotes,
                    onClick: () => setShowQuotes(!showQuotes),
                  },
                  {
                    label: 'Stricter mode',
                    desc: 'No pause · EXIT lock',
                    active: stricterMode,
                    onClick: () => setStricterMode(!stricterMode),
                  },
                ].map((ctrl) => (
                  <button
                    key={ctrl.label}
                    type="button"
                    onClick={ctrl.onClick}
                    className="flex min-h-[54px] items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 text-left transition-colors active:scale-[0.98] hover:border-white/20 touch-manipulation"
                  >
                    <div>
                      <span className="block text-xs font-semibold text-[#f4f7fb]">
                        {ctrl.label}
                      </span>
                      <span className="block text-[11px] text-[#7c89a1]">{ctrl.desc}</span>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                        ctrl.active ? 'bg-[#22c55e]' : 'bg-white/15'
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          ctrl.active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Scenario Shortcuts */}
            <div className="glass-surface rounded-3xl p-5 sm:p-6">
              <h3 className="font-display text-base font-semibold text-[#f4f7fb]">
                Quick scenarios to test
              </h3>
              <p className="mt-1 text-xs text-[#8d9cb8]">
                Jump straight to key FocusOS screens (opens full-screen on mobile).
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleOpenBlockedPopup}
                  className="glass-well flex min-h-[48px] items-center justify-between rounded-2xl px-4 py-2.5 text-left text-xs font-semibold text-[#f4f7fb] transition-colors active:scale-[0.98] hover:border-white/25 touch-manipulation"
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    <span>Test blocked app overlay</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#7c89a1]" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setShowAllowedAppsScreen(true);
                    if (window.innerWidth < 768 || /android/i.test(navigator.userAgent)) {
                      onOpenFullScreen();
                    }
                  }}
                  className="glass-well flex min-h-[48px] items-center justify-between rounded-2xl px-4 py-2.5 text-left text-xs font-semibold text-[#f4f7fb] transition-colors active:scale-[0.98] hover:border-white/25 touch-manipulation"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#60a5fa]" aria-hidden="true" />
                    <span>Open allowed apps list</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#7c89a1]" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAllowedAppsScreen(false);
                    setActiveTab('dashboard');
                    if (window.innerWidth < 768 || /android/i.test(navigator.userAgent)) {
                      onOpenFullScreen();
                    }
                  }}
                  className="glass-well flex min-h-[48px] items-center justify-between rounded-2xl px-4 py-2.5 text-left text-xs font-semibold text-[#f4f7fb] transition-colors active:scale-[0.98] hover:border-white/25 touch-manipulation"
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#34d399]" aria-hidden="true" />
                    <span>Inspect 12-week dashboard</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#7c89a1]" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAllowedAppsScreen(false);
                    setActiveTab('settings');
                    setLegalModal('privacy');
                    if (window.innerWidth < 768 || /android/i.test(navigator.userAgent)) {
                      onOpenFullScreen();
                    }
                  }}
                  className="glass-well flex min-h-[48px] items-center justify-between rounded-2xl px-4 py-2.5 text-left text-xs font-semibold text-[#f4f7fb] transition-colors active:scale-[0.98] hover:border-white/25 touch-manipulation"
                >
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-[#60a5fa]" aria-hidden="true" />
                    <span>Read privacy promise</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#7c89a1]" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Privacy Motto Callout */}
            <div className="glass-surface-highlight rounded-3xl p-5 sm:p-6">
              <p className="text-xs font-semibold tracking-widest text-[#60a5fa] uppercase">
                Our core motto
              </p>
              <p className="mt-2 font-display text-lg font-bold text-[#f4f7fb]">
                We never sell your data. Not now, not ever.
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#a9b6cc]">
                No ads, no analytics, and no accounts required. Your focus history, settings, app groups, and study timetable stay on your phone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
