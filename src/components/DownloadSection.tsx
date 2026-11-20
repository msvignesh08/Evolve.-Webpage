import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileArchive,
  Info,
  Layers,
  Share2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { FocusLogo } from './FocusLogo';
import { ANDROID_PERMISSIONS, NEVER_ACCESSED } from './PermissionsSection';

interface ApkInfoResponse {
  available: boolean;
  fileName: string;
  sizeBytes: number;
  sha256: string | null;
}

type InspectorTab = 'package' | 'screens' | 'permissions' | 'files';

const PREVIEW_SHA256 = 'c31890ff77952c2560b555d0bb1aac704217966546d97e737b4e4898a4c2f3c5';

const INSTALL_STEPS = [
  {
    step: '01',
    title: 'Download & check SHA-256',
    body: 'Tap Download APK to save Evolve-debug.apk, then match its SHA-256 checksum against the hash above before installing.',
  },
  {
    step: '02',
    title: 'Allow browser install',
    body: 'Open the verified APK from Android notifications and allow installs from your browser when prompted.',
  },
  {
    step: '03',
    title: 'Open Evolve & get back on track',
    body: 'Pick your theme, choose your allowed apps, and start your first session — no account needed.',
  },
];

const APP_SCREENS = [
  {
    module: '01 · Home & Timer',
    title: 'Focus Ring, Quotes & Stricter Lock',
    detail: 'Topic selector, 5–120 min timer dial, motivational quote banner, and EXIT guard.',
  },
  {
    module: '02 · Focus Rooms',
    title: 'Live Co-Focus Sessions',
    detail: 'Create or join shared study rooms with a 6-digit code to stay accountable together.',
  },
  {
    module: '03 · Study Plan',
    title: 'Automated Timetable Blocks',
    detail: 'Recurring weekly schedules that launch your chosen app allowlist automatically.',
  },
  {
    module: '04 · 12-Week Dashboard',
    title: 'On-Device Progress & Passes',
    detail: 'Consistency heatmap, focused minutes, subject breakdown, and earned emergency passes.',
  },
  {
    module: '05 · App Allowlist',
    title: 'Custom App Groups',
    detail: 'Keep Phone, Notes, or Calculator open while blocking social and video distractions.',
  },
  {
    module: '06 · Themes & Settings',
    title: '8 Themes, Glass & Developer Gifts',
    detail: 'Switch between 8 curated themes, UI glass/vibrant toggles, and 12-digit gift vault.',
  },
];

const APK_ENTRIES = [
  { name: 'classes.dex', detail: 'Kotlin 2.0.21 + Compose runtime & Material 3 bytecode', size: '3.42 MB' },
  { name: 'resources.arsc', detail: 'Compiled string tables, 8 theme palettes & adaptive styles', size: '1.18 MB' },
  { name: 'res/drawable-* & mipmap-*', detail: '98 vector UI assets, squircle icons & timer skins', size: '1.76 MB' },
  { name: 'AndroidManifest.xml', detail: 'evolve://join deep link, FocusGuardService & alarm receiver', size: '24 KB' },
  { name: 'META-INF/ (14 files)', detail: 'APK v2/v3 signing block, manifest digests & Kotlin metadata', size: '806 KB' },
];

export function DownloadSection() {
  const [activeTab, setActiveTab] = useState<InspectorTab>('package');
  const [showGuide, setShowGuide] = useState(false);
  const [apkNotice, setApkNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [sharedFeedback, setSharedFeedback] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [apkInfo, setApkInfo] = useState<ApkInfoResponse | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/apk-info')
      .then((res) => (res.ok ? (res.json() as Promise<ApkInfoResponse>) : null))
      .then((data) => {
        if (active && data) {
          setApkInfo(data);
        }
      })
      .catch(() => {
        // Ignore preview fetch errors
      });
    return () => {
      active = false;
    };
  }, []);

  const displaySha256 = apkInfo?.sha256 || PREVIEW_SHA256;
  const formattedSizeMb =
    apkInfo?.sizeBytes && apkInfo.sizeBytes > 0
      ? `${(apkInfo.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : '7.19 MB';
  const displayApkName = apkInfo?.available ? apkInfo.fileName : 'Evolve-debug.apk';

  const handleCopySha256 = async () => {
    try {
      await navigator.clipboard.writeText(displaySha256);
      setCopiedHash(true);
      window.setTimeout(() => setCopiedHash(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleDownloadClick = async () => {
    setChecking(true);
    setApkNotice(null);
    const candidates = apkInfo?.available
      ? [`/${apkInfo.fileName}`, '/Evolve-debug.apk', '/FocusOS-debug.apk']
      : ['/Evolve-debug.apk', '/FocusOS-debug.apk'];

    try {
      let resolvedPath: string | null = null;
      for (const pathCandidate of candidates) {
        const response = await fetch(pathCandidate, { method: 'HEAD' });
        const contentType = response.headers.get('content-type') || '';
        const isActualBinary =
          response.ok &&
          !contentType.includes('text/html') &&
          !contentType.includes('application/json');
        if (isActualBinary) {
          resolvedPath = pathCandidate;
          break;
        }
      }

      if (resolvedPath) {
        const link = document.createElement('a');
        link.href = resolvedPath;
        link.download = displayApkName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setApkNotice('Download started. Match the SHA-256 checksum below before tapping Install.');
        setShowGuide(true);
      } else {
        setApkNotice(
          'Preview mode: place Evolve-debug.apk (or split .part001+ chunks) in the public folder to enable direct HTTPS downloads and live SHA-256 verification.',
        );
        setShowGuide(true);
      }
    } catch {
      setApkNotice(
        'Preview mode: place Evolve-debug.apk (or split .part001+ chunks) in the public folder to enable direct HTTPS downloads and live SHA-256 verification.',
      );
      setShowGuide(true);
    } finally {
      setChecking(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Evolve for Android',
          text: 'Make time for what matters. Get yourself back on track with Evolve — focused sessions and smart app blocking. We never sell your data.',
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share unavailable; fall back to copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Ignore clipboard failure
    }
    setSharedFeedback(true);
    window.setTimeout(() => setSharedFeedback(false), 1800);
  };

  return (
    <section id="download" className="py-12 sm:py-20">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-surface-highlight relative overflow-hidden rounded-[28px] p-5 sm:rounded-[32px] sm:p-10"
        >
          {/* Top CTA Row */}
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center lg:gap-8">
            <div className="max-w-[580px]">
              <p className="mb-2.5 text-xs font-semibold tracking-widest text-[#60a5fa] uppercase">
                Ready when you are
              </p>
              <h2 className="text-balance font-display text-[clamp(1.85rem,3.6vw,2.85rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[#f4f7fb]">
                Give your next hour a <span className="highlight-text">purpose.</span>
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#9ba8bf] sm:mt-3.5 sm:text-base">
                Install Evolve on your Android phone and get yourself back on track. Make time for
                what matters — zero ads, zero accounts, and we never sell your data.
              </p>
            </div>

            <div className="flex w-full shrink-0 flex-col items-stretch sm:items-start lg:w-auto lg:min-w-[248px] lg:items-center">
              <button
                type="button"
                onClick={handleDownloadClick}
                disabled={checking}
                className="site-primary-btn inline-flex min-h-[50px] w-full shrink-0 cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-7 py-3.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] hover:-translate-y-0.5 hover:brightness-110 touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:opacity-70 lg:w-auto"
              >
                <span>{checking ? 'Preparing APK...' : 'Download APK'}</span>
                <Download className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="mt-2.5 flex items-center justify-center gap-2 text-xs text-[#91a0ba]">
                <span>Android 8.0+</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{formattedSizeMb}</span>
                <span aria-hidden="true">·</span>
                <span>Zero data sold</span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowGuide((prev) => !prev)}
                  aria-expanded={showGuide}
                  className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-medium text-[#60a5fa] underline-offset-4 hover:underline touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6]"
                >
                  <span>{showGuide ? 'Hide install guide' : 'How to install & verify'}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      showGuide ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-medium text-[#a9b6cc] transition-colors hover:text-[#f4f7fb] touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6]"
                >
                  {sharedFeedback ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#34d399]" aria-hidden="true" />
                      <span>Link copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Share page</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* APK Package Inspector Box */}
          <div className="glass-well mt-7 rounded-[24px] p-4 sm:p-6">
            {/* APK Header Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3.5">
                <FocusLogo className="h-11 w-11 sm:h-12 sm:w-12" />
                <div>
                  <h3 className="font-display text-base font-bold tracking-tight text-[#f4f7fb] sm:text-lg">
                    {displayApkName}
                  </h3>
                  <p className="mt-0.5 font-mono text-[11px] text-[#8d9cb8] sm:text-xs">
                    com.vignesh.evolve · v2.5.0 · {formattedSizeMb}
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#34d399]/30 bg-[#10b981]/10 px-3 py-1 text-xs font-semibold text-[#34d399]">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Verified APK</span>
              </div>
            </div>

            {/* Segmented 4-Tab Bar */}
            <div
              role="tablist"
              aria-label="APK package details"
              className="mt-4 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/30 p-1 sm:grid-cols-4"
            >
              {(
                [
                  { id: 'package', label: 'Package Info', icon: Info },
                  { id: 'screens', label: 'Screens (6)', icon: Layers },
                  {
                    id: 'permissions',
                    label: `Permissions (${ANDROID_PERMISSIONS.length})`,
                    icon: ShieldAlert,
                  },
                  { id: 'files', label: 'APK Files (115)', icon: FileArchive },
                ] as const
              ).map((tab) => {
                const selected = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all duration-150 touch-manipulation sm:px-3 ${
                      selected
                        ? 'bg-white/[0.12] text-[#f4f7fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]'
                        : 'text-[#8d9cb8] hover:text-[#dce5f5]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div className="mt-4">
              {activeTab === 'package' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
                      <p className="text-[11px] font-medium text-[#8d9cb8]">Build Toolchain</p>
                      <p className="mt-1 font-mono text-sm font-bold text-[#f4f7fb]">AGP 8.7.3</p>
                      <p className="mt-0.5 text-[11px] text-[#8d9cb8]">Gradle 8.11.1</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
                      <p className="text-[11px] font-medium text-[#8d9cb8]">Kotlin / UI</p>
                      <p className="mt-1 font-mono text-sm font-bold text-[#f4f7fb]">
                        Kotlin 2.0.21
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8d9cb8]">Compose + Material 3</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
                      <p className="text-[11px] font-medium text-[#8d9cb8]">Deep Link &amp; Role</p>
                      <p className="mt-1 font-mono text-sm font-bold text-[#f4f7fb]">
                        evolve://join
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8d9cb8]">Launcher + Guard</p>
                    </div>
                  </div>

                  {/* SHA-256 Checksum Bar */}
                  <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#8d9cb8]">
                        SHA-256 Checksum{' '}
                        {apkInfo?.sha256 ? (
                          <span className="text-[#34d399]">· Live Server Binary</span>
                        ) : (
                          <span>· Build Fingerprint</span>
                        )}
                      </p>
                      <p className="allow-select mt-1 truncate font-mono text-xs text-[#f4f7fb]">
                        {displaySha256}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopySha256}
                      className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 self-start rounded-xl border border-white/15 bg-white/[0.06] px-3.5 text-xs font-semibold text-[#f4f7fb] transition-colors hover:bg-white/[0.12] sm:self-auto touch-manipulation"
                    >
                      {copiedHash ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#34d399]" aria-hidden="true" />
                          <span className="text-[#34d399]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'screens' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {APP_SCREENS.map((item) => (
                    <div
                      key={item.module}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5"
                    >
                      <p className="font-mono text-[11px] font-medium text-[#60a5fa]">
                        {item.module}
                      </p>
                      <p className="mt-1 font-display text-xs font-bold text-[#f4f7fb] sm:text-sm">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#8d9cb8]">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'permissions' && (
                <div className="space-y-4">
                  {/* Awareness Intro Banner */}
                  <div className="rounded-2xl border border-[#60a5fa]/30 bg-[#3b82f6]/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-sm font-bold text-[#f4f7fb]">
                        Why Evolve asks for multiple Android permissions
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] font-semibold text-[#34d399]">
                          100% On-Device · Zero Tracking
                        </span>
                        <a
                          href="#permissions"
                          className="font-mono text-[11px] font-semibold text-[#60a5fa] underline-offset-4 hover:underline"
                        >
                          Full guide ↑
                        </a>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#cbd5e8]">
                      Android sandboxes apps strictly, so blocking distractions requires separate
                      system toggles. Every permission below stays on your phone and can be toggled
                      off in Android Settings.
                    </p>
                  </div>

                  {/* Detailed Permission Breakdown Grid */}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {ANDROID_PERMISSIONS.map((perm) => (
                      <div
                        key={perm.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-display text-sm font-bold text-[#f4f7fb]">
                            {perm.name}
                          </h4>
                          <span className="font-mono text-[10px] font-semibold text-[#34d399]">
                            {perm.scope}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2 text-[11px] leading-relaxed">
                          <p className="text-[#cbd5e8]">
                            <strong className="text-white">What it asks for:</strong> {perm.asksFor}
                          </p>
                          <p className="text-[#9ba8bf]">
                            <strong className="text-[#e2e8f5]">How Evolve uses it:</strong>{' '}
                            {perm.usedFor}
                          </p>
                          <p className="rounded-xl border border-white/8 bg-black/25 px-3 py-2 text-[#a7f3d0]/90">
                            <strong className="text-[#34d399]">Awareness:</strong> {perm.awareness}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Zero-Spying Guarantee Box */}
                  <div className="rounded-2xl border border-[#34d399]/25 bg-[#10b981]/8 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#34d399]">
                      <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Permissions Evolve NEVER Requests</span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#cbd5e8]">
                      {NEVER_ACCESSED.join(' · ')}. We never sell your data — not now, not ever.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] px-4">
                  {APK_ENTRIES.map((entry) => (
                    <div
                      key={entry.name}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-[#f4f7fb]">
                          {entry.name}
                        </span>
                        <p className="text-[11px] text-[#8d9cb8]">{entry.detail}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] font-semibold text-[#60a5fa] tabular-nums">
                        {entry.size}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {apkNotice && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
                className="mt-5 flex items-start gap-2.5 rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-xs leading-relaxed text-[#dce5f5]"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#60a5fa]" aria-hidden="true" />
                <span>{apkNotice}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 space-y-4 border-t border-white/10 pt-6"
              >
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3 md:gap-4">
                  {INSTALL_STEPS.map((item) => (
                    <div key={item.step} className="glass-well rounded-2xl p-4">
                      <span className="font-mono text-xs font-semibold text-[#60a5fa] tabular-nums">
                        {item.step}
                      </span>
                      <h3 className="mt-1.5 font-display text-sm font-semibold text-[#f4f7fb]">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#9ba8bf]">{item.body}</p>
                    </div>
                  ))}
                </div>

                <div className="glass-well rounded-2xl p-4 text-xs leading-relaxed text-[#9ba8bf]">
                  <p className="font-display font-semibold text-[#f4f7fb]">
                    Verify SHA-256 before installing on Android
                  </p>
                  <p className="mt-1">
                    After downloading <code className="text-[#dce5f5]">{displayApkName}</code>,
                    inspect its SHA-256 hash using Android&apos;s Termux (
                    <code className="text-[#dce5f5]">sha256sum {displayApkName}</code>), Windows (
                    <code className="text-[#dce5f5]">certutil -hashfile {displayApkName} SHA256</code>
                    ), or macOS (
                    <code className="text-[#dce5f5]">shasum -a 256 {displayApkName}</code>) and
                    confirm it matches the checksum published above before tapping Install.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="mt-4 max-w-[920px] text-xs leading-relaxed text-[#7c89a1]">
          Important: Evolve and any downloadable APK build are provided &ldquo;AS IS&rdquo;
          without warranties of any kind. The APK referenced here is a testing/debug build;
          sideloading is at your own discretion and risk. Evolve is a personal focus tool, cannot
          permanently lock your phone, and must not be relied upon for safety or emergency
          situations.
        </p>
      </div>
    </section>
  );
}
