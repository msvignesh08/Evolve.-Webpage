import { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowDown,
  Lock,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

export type PermissionCategory = 'core' | 'optional' | 'reliability';

export interface PermissionDetail {
  id: string;
  name: string;
  scope: string;
  category: PermissionCategory;
  required: boolean;
  asksFor: string;
  usedFor: string;
  awareness: string;
}

export const ANDROID_PERMISSIONS: PermissionDetail[] = [
  {
    id: 'usage-stats',
    name: 'Usage Access',
    scope: 'Core Blocker',
    category: 'core',
    required: true,
    asksFor: 'Special App Access toggle to read which app is currently open in the foreground.',
    usedFor:
      'Checks the foreground app during a session so blocked apps are caught immediately.',
    awareness:
      'Checked in-memory on your phone only. Evolve does not log app history or upload usage data.',
  },
  {
    id: 'overlay',
    name: 'Display Over Other Apps',
    scope: 'Core Blocker',
    category: 'core',
    required: true,
    asksFor: 'Permission to draw a screen over other running apps.',
    usedFor:
      'Displays the full-screen focus shield ("Returning to Evolve in 10 s") when a blocked app opens.',
    awareness:
      'Active only during running focus sessions. Never used for floating widgets or pop-ups when idle.',
  },
  {
    id: 'accessibility',
    name: 'Accessibility Guard Service',
    scope: 'Optional Strict Mode',
    category: 'optional',
    required: false,
    asksFor: 'Optional Accessibility toggle in Android Settings for anti-bypass protection.',
    usedFor:
      'Blocks bypassing Stricter Mode via Android Settings and supports mid-session Uninstall Protection.',
    awareness:
      'Android shows a generic system warning ("may observe actions or window content") for all Accessibility services. Evolve never reads passwords, chats, or typed text, and standard blocking works with this OFF.',
  },
  {
    id: 'notifications',
    name: 'Notifications & Foreground Service',
    scope: 'Core Timer',
    category: 'core',
    required: true,
    asksFor: 'Permission to show a persistent timer notification while a session is running.',
    usedFor:
      'Keeps your focus countdown visible in the notification shade so Android does not kill the timer when you lock your screen.',
    awareness:
      'Zero marketing or promotional pushes. Used only for active timers, Study Plan starts, and Room alerts.',
  },
  {
    id: 'alarms',
    name: 'Exact Alarms & Boot Start',
    scope: 'Study Plan',
    category: 'reliability',
    required: false,
    asksFor: 'Permission to trigger minute-accurate alarms and resume after a reboot.',
    usedFor:
      'Starts scheduled Study Plan blocks on time and restores active locks if your phone restarts.',
    awareness:
      'Runs only for your local timetable. Never wakes your phone for background telemetry.',
  },
  {
    id: 'battery',
    name: 'Unrestricted Battery Optimization',
    scope: 'OEM Reliability',
    category: 'reliability',
    required: false,
    asksFor: 'Exemption from aggressive background app sleeping.',
    usedFor:
      'Prevents Samsung One UI, Xiaomi HyperOS/MIUI, Poco, and Motorola power managers from killing the blocker mid-session.',
    awareness:
      'Evolve only checks the active app while a timer is running, keeping idle battery drain minimal.',
  },
  {
    id: 'packages',
    name: 'Installed Apps List',
    scope: 'Allowlist UI',
    category: 'core',
    required: true,
    asksFor: 'Read-only access to the names and icons of installed apps.',
    usedFor:
      'Lists your installed apps so you can pick tools like Notes, Calculator, or Phone to keep unlocked.',
    awareness:
      'Your app list stays strictly on your device and is never shared with third parties.',
  },
  {
    id: 'internet',
    name: 'Network & Internet Access',
    scope: 'Rooms & Gifts Only',
    category: 'reliability',
    required: false,
    asksFor: 'Standard Android internet and connection-state access.',
    usedFor:
      'Used only when you join or create a Focus Room or redeem a 12-digit developer gift code.',
    awareness:
      'Timers, app blocking, Study Plan, and the 12-week Dashboard work fully offline without tracking.',
  },
];

export const NEVER_ACCESSED = [
  'Location / GPS',
  'Contacts',
  'Camera & Microphone',
  'SMS & Call Logs',
  'Photos / Private Files',
  'Advertising IDs',
];

const PERMISSION_AWARENESS_TIPS = [
  {
    title: 'Android isolates every app',
    detail:
      'By default, Android blocks apps from seeing what else is open or covering the screen unless you grant Usage Access and Display Over Other Apps.',
  },
  {
    title: 'Accessibility is optional',
    detail:
      'Turn it on only if you want Stricter Mode tamper protection. Standard focus sessions and app blocking work with it turned off.',
  },
  {
    title: 'Revoke anytime in Settings',
    detail:
      'Every toggle can be turned off at any time under Android Settings -> Apps -> Evolve -> Permissions and Special App Access.',
  },
];

type FilterTab = 'all' | PermissionCategory;

const FILTER_TABS: { id: FilterTab; label: string; count: number }[] = [
  { id: 'all', label: 'All Permissions', count: ANDROID_PERMISSIONS.length },
  {
    id: 'core',
    label: 'Core Blocker',
    count: ANDROID_PERMISSIONS.filter((p) => p.category === 'core').length,
  },
  {
    id: 'optional',
    label: 'Optional Guard',
    count: ANDROID_PERMISSIONS.filter((p) => p.category === 'optional').length,
  },
  {
    id: 'reliability',
    label: 'Schedule & Offline',
    count: ANDROID_PERMISSIONS.filter((p) => p.category === 'reliability').length,
  },
];

export function PermissionsSection() {
  const [filter, setFilter] = useState<FilterTab>('all');

  const visiblePermissions =
    filter === 'all'
      ? ANDROID_PERMISSIONS
      : ANDROID_PERMISSIONS.filter((perm) => perm.category === filter);

  return (
    <section id="permissions" className="py-14 sm:py-24">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex flex-col justify-between gap-6 lg:mb-10 lg:flex-row lg:items-end"
        >
          <div className="max-w-[680px]">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-widest text-[#60a5fa] uppercase">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              <span>Permissions &amp; Awareness</span>
            </p>
            <h2 className="text-balance font-display text-[clamp(1.85rem,3.6vw,3rem)] font-bold leading-[1.12] tracking-[-0.03em] text-[#f4f7fb]">
              Why Evolve asks for Android permissions.
            </h2>
            <p className="mt-3.5 text-[15px] leading-relaxed text-[#9ba8bf] sm:mt-4 sm:text-base">
              Android sandboxes apps strictly, so blocking distractions requires explicit OS
              toggles. Here is what each permission asks for, how Evolve uses it, and what stays on
              your phone.
            </p>
          </div>

          <a
            href="#download"
            className="glass-surface inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 self-start whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-semibold text-[#f4f7fb] transition-all duration-150 hover:border-[#60a5fa]/55 hover:brightness-110 touch-manipulation lg:self-auto"
          >
            <span>Inspect APK Checksum</span>
            <ArrowDown className="h-3.5 w-3.5 text-[#60a5fa]" aria-hidden="true" />
          </a>
        </motion.div>

        {/* 3-Point Awareness Banner */}
        <div className="mb-7 grid grid-cols-1 gap-3 md:grid-cols-3">
          {PERMISSION_AWARENESS_TIPS.map((tip, idx) => (
            <div key={tip.title} className="glass-surface rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-[#60a5fa]">
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>0{idx + 1} · Awareness</span>
              </div>
              <h3 className="mt-2 font-display text-sm font-bold text-[#f4f7fb] sm:text-base">
                {tip.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#9ba8bf]">{tip.detail}</p>
            </div>
          ))}
        </div>

        {/* Category Filter Bar */}
        <div
          role="tablist"
          aria-label="Filter Android permissions by category"
          className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-black/30 p-1.5 sm:inline-grid sm:grid-cols-4"
        >
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 touch-manipulation ${
                  active
                    ? 'site-primary-btn'
                    : 'text-[#9ba8bf] hover:bg-white/[0.05] hover:text-[#f4f7fb]'
                }`}
              >
                <span className="truncate">{tab.label}</span>
                <span
                  className={`font-mono text-[10px] tabular-nums ${
                    active ? 'opacity-90' : 'text-[#7c89a1]'
                  }`}
                >
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Detailed Permissions Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visiblePermissions.map((perm) => (
            <article
              key={perm.id}
              className={`rounded-3xl p-5 transition-colors duration-200 sm:p-6 ${
                perm.id === 'accessibility'
                  ? 'glass-surface-highlight'
                  : 'glass-surface hover:border-white/25'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 pb-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-bold text-[#f4f7fb] sm:text-lg">
                    {perm.name}
                  </h3>
                  <span
                    className={`font-mono text-[10px] font-semibold uppercase ${
                      perm.required ? 'text-[#60a5fa]' : 'text-[#34d399]'
                    }`}
                  >
                    {perm.required ? 'Required' : 'Optional'}
                  </span>
                </div>

                <span className="shrink-0 font-mono text-[11px] font-semibold text-[#34d399]">
                  {perm.scope}
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-xs leading-relaxed">
                <div>
                  <span className="font-semibold text-[#f4f7fb]">What it asks for: </span>
                  <span className="text-[#cbd5e8]">{perm.asksFor}</span>
                </div>

                <div>
                  <span className="font-semibold text-[#f4f7fb]">How Evolve uses it: </span>
                  <span className="text-[#9ba8bf]">{perm.usedFor}</span>
                </div>

                <div className="glass-well flex items-start gap-2 rounded-2xl px-3.5 py-2.5 text-[11px] leading-relaxed text-[#cbd5e8]">
                  {perm.id === 'accessibility' ? (
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300"
                      aria-hidden="true"
                    />
                  ) : (
                    <Lock
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34d399]"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <strong className="text-[#34d399]">Awareness: </strong>
                    <span>{perm.awareness}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Bottom Guarantee Card: Never Accessed */}
        <div className="glass-surface-highlight mt-6 flex flex-col justify-between gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="max-w-[740px]">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#34d399] uppercase">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Permissions Evolve Never Requests</span>
            </div>
            <p className="mt-2 font-mono text-xs leading-relaxed text-[#f4f7fb]">
              {NEVER_ACCESSED.join('  ·  ')}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-[#9ba8bf]">
              Your focus sessions, schedules, and installed apps stay on your phone. We never sell
              your data — not now, not ever.
            </p>
          </div>

          <div className="shrink-0 font-mono text-[11px] font-semibold text-[#60a5fa]">
            0 Trackers · 0 Ads
          </div>
        </div>
      </div>
    </section>
  );
}
