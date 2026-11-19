import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

export type LegalTab = 'licenses' | 'terms' | 'privacy' | 'cookies';

interface LegalModalProps {
  openTab: LegalTab | null;
  onTabChange: (tab: LegalTab) => void;
  onClose: () => void;
  onOpenCookiePreferences?: () => void;
}

const OPEN_SOURCE_PACKAGES = [
  {
    name: 'React & React DOM',
    license: 'MIT License',
    holder: 'Meta Platforms, Inc. and affiliates',
    url: 'https://react.dev',
  },
  {
    name: 'Motion (motion/react)',
    license: 'MIT License',
    holder: 'Motion Division / Framer B.V.',
    url: 'https://motion.dev',
  },
  {
    name: 'Lucide React Icons',
    license: 'ISC License',
    holder: 'Lucide Contributors',
    url: 'https://lucide.dev',
  },
  {
    name: 'Tailwind CSS',
    license: 'MIT License',
    holder: 'Tailwind Labs, Inc.',
    url: 'https://tailwindcss.com',
  },
  {
    name: 'Vite',
    license: 'MIT License',
    holder: 'Evan You and Vite Contributors',
    url: 'https://vite.dev',
  },
];

const GOOGLE_FONTS = [
  {
    name: 'Plus Jakarta Sans',
    license: 'SIL Open Font License 1.1',
    author: 'Tokotype',
  },
  {
    name: 'DM Sans',
    license: 'SIL Open Font License 1.1',
    author: 'Colophon Foundry',
  },
  {
    name: 'JetBrains Mono',
    license: 'SIL Open Font License 1.1',
    author: 'JetBrains s.r.o.',
  },
];

export function LegalModal({
  openTab,
  onTabChange,
  onClose,
  onOpenCookiePreferences,
}: LegalModalProps) {
  useEffect(() => {
    if (!openTab) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openTab, onClose]);

  return (
    <AnimatePresence>
      {openTab && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label="Legal notices, disclaimers, privacy, and open source licenses"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="site-modal-bg flex max-h-[88dvh] w-full max-w-[740px] flex-col overflow-hidden rounded-t-3xl border border-white/15 text-[#f4f7fb] shadow-2xl sm:rounded-3xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight text-[#f4f7fb]">
                  Legal, Disclaimers &amp; Open Source Licenses
                </h2>
                <p className="mt-0.5 text-xs text-[#8d9cb8]">
                  Transparency, third-party attributions, and terms of use for FocusOS.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close legal dialog"
                onClick={onClose}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[#cbd5e8] transition-colors hover:text-white touch-manipulation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Legal sections"
              className="grid grid-cols-2 gap-1.5 border-b border-white/10 bg-black/25 px-5 py-2.5 sm:grid-cols-4 sm:px-6"
            >
              {(
                [
                  { id: 'terms', label: 'Terms & Disclaimers' },
                  { id: 'privacy', label: 'Privacy Notice' },
                  { id: 'cookies', label: 'Cookie Policy' },
                  { id: 'licenses', label: 'Open Source & Fonts' },
                ] as const
              ).map((tab) => {
                const active = openTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={`min-h-[40px] rounded-xl px-2.5 text-xs font-semibold transition-colors touch-manipulation ${
                      active
                        ? 'bg-[#3b82f6] text-white'
                        : 'bg-white/[0.04] text-[#9ba8bf] hover:text-[#f4f7fb]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 text-xs leading-relaxed text-[#b7c3d9] sm:px-6">
              {openTab === 'terms' && (
                <div className="space-y-4">
                  <section>
                    <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                      1. Personal Productivity Tool — No Guarantee
                    </h3>
                    <p className="mt-1">
                      FocusOS is an independent personal productivity and study aid provided for
                      voluntary self-management. It cannot permanently lock your device. Operating
                      system updates, manufacturer battery/task managers, Safe Mode, device
                      restarts, or system settings may pause or stop active sessions. Do not rely
                      on FocusOS for safety-critical, medical, financial, or emergency purposes.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                      2. Interactive Web Demo Simulation
                    </h3>
                    <p className="mt-1">
                      The interactive demo embedded on this website is a visual client-side UI
                      simulation for preview purposes only. It does not inspect, modify, or block
                      any applications on your device, and any statistics shown in the preview are
                      illustrative examples.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                      3. Software &amp; APK Provided &ldquo;As Is&rdquo;
                    </h3>
                    <p className="mt-1">
                      This website and any downloadable APK build (including testing/debug builds)
                      are provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis
                      without warranties of any kind, whether express, implied, or statutory,
                      including implied warranties of merchantability, fitness for a particular
                      purpose, accuracy, or non-infringement. Sideloading APK files is entirely at
                      your own discretion and risk.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                      4. Limitation of Liability
                    </h3>
                    <p className="mt-1">
                      To the maximum extent permitted by applicable law, the developer and
                      contributors shall not be liable for any direct, indirect, incidental,
                      special, consequential, or punitive damages—including missed calls, missed
                      notifications, lost messages, data loss, academic/work delays, or device
                      interruptions—arising out of or related to your use of or inability to use
                      this website or FocusOS.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                      5. Trademarks &amp; Third-Party Marks
                    </h3>
                    <p className="mt-1">
                      Android and Google Play are trademarks of Google LLC. iOS is a registered
                      trademark of Cisco Technology, Inc. and/or its affiliates; &ldquo;iOS
                      Blue&rdquo; refers solely to a colour palette option. Pantone is a registered
                      trademark of Pantone LLC; Pantone-inspired theme shades are approximate
                      digital matches, not official Pantone standards. Any third-party app names
                      shown inside the illustrative allowlist preview (such as Instagram, Netflix,
                      or WhatsApp) remain the property of their respective trademark owners and are
                      displayed strictly as non-affiliated examples.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                      6. Rooms &amp; External Servers
                    </h3>
                    <p className="mt-1">
                      Focus Rooms are optional and require connecting to a user-specified or hosted
                      server. You are solely responsible for the nicknames, room codes, and server
                      endpoints you choose to connect to.
                    </p>
                  </section>
                </div>
              )}

              {openTab === 'privacy' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#3b82f6]/30 bg-[#3b82f6]/10 p-4">
                    <p className="font-display text-sm font-bold text-[#f4f7fb]">
                      We never sell your data. Not now, not ever.
                    </p>
                    <p className="mt-1 text-xs text-[#c7d6ef]">
                      FocusOS has no ads, no analytics trackers, no ad cookies, and no user
                      accounts.
                    </p>
                  </div>

                  <section>
                    <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                      On-Device Storage
                    </h3>
                    <p className="mt-1">
                      In the FocusOS Android app, your focus history, settings, app groups, and
                      study timetable are stored locally on your phone. This landing website does
                      not store personal profiles or track your browsing across sites.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                      Rooms Exception
                    </h3>
                    <p className="mt-1">
                      Only if you choose to join or create a Focus Room, your chosen nickname,
                      room code, and session status are transmitted to the Rooms server you connect
                      to while the room is active. Hosting providers may retain standard technical
                      infrastructure logs (such as IP addresses).
                    </p>
                  </section>

                  <section>
                    <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                      Google Fonts Web Typography Notice
                    </h3>
                    <p className="mt-1">
                      This website loads web fonts (Plus Jakarta Sans, DM Sans, and JetBrains Mono)
                      from Google Fonts (<code className="text-[#dce5f5]">fonts.googleapis.com</code>{' '}
                      and <code className="text-[#dce5f5]">fonts.gstatic.com</code>). When your
                      browser fetches those font files, Google receives standard HTTP request
                      metadata (such as IP address and browser user-agent) subject to Google&apos;s
                      privacy policy. No advertising cookies or analytics scripts are loaded by
                      FocusOS.
                    </p>
                  </section>
                </div>
              )}

              {openTab === 'cookies' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#3b82f6]/30 bg-[#3b82f6]/10 p-4">
                    <p className="font-display text-sm font-bold text-[#f4f7fb]">
                      Zero advertising or analytics cookies
                    </p>
                    <p className="mt-1 text-xs text-[#c7d6ef]">
                      FocusOS does not set third-party advertising, cross-site tracking, or
                      behavioural analytics cookies. We never sell your data. Not now, not ever.
                    </p>
                  </div>

                  <section>
                    <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                      How this website uses browser storage
                    </h3>
                    <p className="mt-1">
                      Instead of invasive tracking cookies, this website uses minimal browser
                      local storage only for the two purposes listed below:
                    </p>
                    <div className="mt-2.5 space-y-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <code className="font-mono text-[11px] font-semibold text-[#f4f7fb]">
                            focusos_cookie_prefs_v1
                          </code>
                          <span className="font-mono text-[11px] text-[#34d399]">
                            Strictly necessary
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#9ba8bf]">
                          Saves your consent choice so the cookie notice stays dismissed across
                          reloads.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <code className="font-mono text-[11px] font-semibold text-[#f4f7fb]">
                            focusos_demo_ui_v1
                          </code>
                          <span className="font-mono text-[11px] text-[#60a5fa]">
                            Optional preferences
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#9ba8bf]">
                          Stored only if you enable optional UI preferences. Remembers your demo
                          theme, glass effect, vibrant colour, quotes, and stricter mode locally on
                          your device.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                      Managing or clearing storage
                    </h3>
                    <p className="mt-1">
                      You can change your choice anytime using Cookie Preferences below, or clear site
                      data directly in your browser settings. Selecting &ldquo;Essential only&rdquo;
                      immediately removes any saved optional demo preferences.
                    </p>
                    {onOpenCookiePreferences && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenCookiePreferences();
                        }}
                        className="mt-3 inline-flex min-h-[40px] items-center rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-[#f4f7fb] transition-colors hover:bg-white/[0.12] touch-manipulation"
                      >
                        Manage cookie preferences
                      </button>
                    )}
                  </section>
                </div>
              )}

              {openTab === 'licenses' && (
                <div className="space-y-5">
                  <section>
                    <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                      Google Fonts (SIL Open Font License 1.1)
                    </h3>
                    <p className="mt-1 text-[#9ba8bf]">
                      Typography on this website is served via Google Fonts under the SIL Open Font
                      License, Version 1.1.
                    </p>
                    <div className="mt-2.5 space-y-2">
                      {GOOGLE_FONTS.map((font) => (
                        <div
                          key={font.name}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
                        >
                          <div>
                            <span className="block font-semibold text-[#f4f7fb]">
                              {font.name}
                            </span>
                            <span className="text-[11px] text-[#8d9cb8]">By {font.author}</span>
                          </div>
                          <span className="font-mono text-[11px] text-[#60a5fa]">
                            {font.license}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="font-display text-sm font-semibold text-[#f4f7fb]">
                      Open Source Software Packages
                    </h3>
                    <p className="mt-1 text-[#9ba8bf]">
                      This web interface incorporates the following open-source libraries, used in
                      compliance with their respective MIT and ISC licenses:
                    </p>
                    <div className="mt-2.5 space-y-2">
                      {OPEN_SOURCE_PACKAGES.map((pkg) => (
                        <div
                          key={pkg.name}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
                        >
                          <div>
                            <span className="block font-semibold text-[#f4f7fb]">{pkg.name}</span>
                            <span className="text-[11px] text-[#8d9cb8]">
                              Copyright © {pkg.holder}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-[#34d399]">
                            {pkg.license}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-black/25 p-3.5 text-[11px] text-[#8d9cb8]">
                    THE OPEN-SOURCE SOFTWARE LISTED ABOVE IS PROVIDED &ldquo;AS IS&rdquo;, WITHOUT
                    WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. Full license texts (MIT, ISC, and
                    SIL OFL 1.1) apply to each respective component.
                  </section>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-white/10 px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] rounded-full bg-white/10 px-5 text-xs font-semibold text-[#f4f7fb] transition-colors hover:bg-white/15 touch-manipulation"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
