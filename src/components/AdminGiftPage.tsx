import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Dice5,
  Eye,
  EyeOff,
  Gift,
  KeyRound,
  Lock,
  RefreshCw,
  Send,
  Smartphone,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { FocusLogo } from './FocusLogo';
import { SiteThemeSwitcher } from './SiteThemeSwitcher';
import { SiteThemeId } from '../utils/siteThemes';

type GiftCategory =
  | 'subscription'
  | 'timer_skin'
  | 'room_perk'
  | 'feature_unlock'
  | 'random_gift';

interface DeviceGift {
  id: string;
  fingerprint: string;
  category: GiftCategory;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  createdAt: string;
  expiresAt: string | null;
  claimedAt: string | null;
  sender: string;
}

interface AdminStatusResponse {
  configured: boolean;
  isProd: boolean;
  devFallback: boolean;
  corsEnabled: boolean;
}

interface AdminGiftPageProps {
  onBack: () => void;
  siteTheme: SiteThemeId;
  onChangeSiteTheme: (theme: SiteThemeId) => void;
}

const CATEGORY_LABELS: Record<GiftCategory, string> = {
  subscription: 'Subscription Pass',
  timer_skin: 'Timer Skin',
  room_perk: 'Room Enhancement / QR VIP',
  feature_unlock: 'Unrevealed Feature Unlock',
  random_gift: 'Random Surprise Gift',
};

const RANDOM_GIFT_PRESETS: Array<{
  category: GiftCategory;
  title: string;
  message: string;
  payload: Record<string, unknown>;
}> = [
  {
    category: 'subscription',
    title: 'FocusOS Pro Pass · 30 Days',
    message: 'Gift from Phantomstrange — enjoy Pro skins, expanded Rooms, and bonus perks.',
    payload: { rewardType: 'subscription', tier: 'pro', durationDays: 30, adFree: true },
  },
  {
    category: 'timer_skin',
    title: 'Holo Midnight Timer Skin',
    message: 'Unlocks an exclusive frosted iridescent focus dial skin for your device.',
    payload: { rewardType: 'timer_skin', skinId: 'holo-midnight-v2', animatedGlow: true },
  },
  {
    category: 'room_perk',
    title: 'QR Room Priority Host',
    message: 'Unlock instant QR room invites, custom room banners, and higher co-focus limits.',
    payload: { rewardType: 'room_perk', qrJoinBoost: true, maxParticipants: 25 },
  },
  {
    category: 'feature_unlock',
    title: 'Vault Unrevealed Feature Key',
    message: 'Hidden developer drop unlocked! Reveals an unreleased FocusOS experimental module.',
    payload: { rewardType: 'feature_unlock', moduleKey: 'mystery_focus_lab_v2', tier: 'vip' },
  },
  {
    category: 'random_gift',
    title: 'Phantomstrange Surprise Crate',
    message: 'A random developer gift picked just for your 12-digit FocusOS fingerprint.',
    payload: { rewardType: 'random_crate', bonusStreakShields: 3, specialBadge: 'founder-gift' },
  },
];

function formatFingerprintDisplay(digits: string): string {
  const clean = digits.replace(/\D/g, '').slice(0, 12);
  return clean.replace(/(\d{4})(?=\d)/g, '$1-');
}

function generateRandom12DigitFingerprint(): string {
  const arr = new Uint32Array(3);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((n) => String(n % 10000).padStart(4, '0'))
    .join('');
}

export function AdminGiftPage({ onBack, siteTheme, onChangeSiteTheme }: AdminGiftPageProps) {
  const [status, setStatus] = useState<AdminStatusResponse | null>(null);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [activePasskey, setActivePasskey] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Gift composer state
  const [fingerprintRaw, setFingerprintRaw] = useState('');
  const [category, setCategory] = useState<GiftCategory>('subscription');
  const [title, setTitle] = useState(RANDOM_GIFT_PRESETS[0].title);
  const [message, setMessage] = useState(RANDOM_GIFT_PRESETS[0].message);
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(RANDOM_GIFT_PRESETS[0].payload, null, 2),
  );
  const [expiresInDays, setExpiresInDays] = useState<string>('30');
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  );

  // Inventory & live poll tester state
  const [gifts, setGifts] = useState<DeviceGift[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, claimed: 0 });
  const [filterFp, setFilterFp] = useState('');
  const [loadingGifts, setLoadingGifts] = useState(false);
  const [pollPreviewJson, setPollPreviewJson] = useState<string | null>(null);
  const [pollTargetFp, setPollTargetFp] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const normalizedFp = fingerprintRaw.replace(/\D/g, '').slice(0, 12);
  const isFpValid = /^\d{12}$/.test(normalizedFp);
  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    let active = true;
    fetch('/api/admin/status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: AdminStatusResponse) => {
        if (active) setStatus(data);
      })
      .catch(() => {
        if (active) setStatus(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const copyText = (key: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  const loadGifts = useCallback(
    async (token: string, fpFilter = '') => {
      setLoadingGifts(true);
      try {
        const qs = fpFilter.trim()
          ? `?fingerprint=${encodeURIComponent(fpFilter.replace(/\D/g, ''))}`
          : '';
        const res = await fetch(`/api/admin/gifts${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) {
          if (res.status === 401) {
            setActivePasskey(null);
            setAuthError('Session expired or invalid passkey.');
          }
          return;
        }
        const data = (await res.json()) as {
          total: number;
          pending: number;
          claimed: number;
          gifts: DeviceGift[];
        };
        setGifts(data.gifts);
        setStats({ total: data.total, pending: data.pending, claimed: data.claimed });
      } catch {
        // Keep current list on transient network glitch
      } finally {
        setLoadingGifts(false);
      }
    },
    [],
  );

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    const candidate = passkeyInput.trim();
    if (!candidate) {
      setAuthError('Enter your developer passkey.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${candidate}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string };
        setAuthError(errData.message || 'Invalid passkey.');
        return;
      }
      setActivePasskey(candidate);
      setPasskeyInput('');
      await loadGifts(candidate, filterFp);
    } catch {
      setAuthError('Unable to reach server. Check your connection.');
    } finally {
      setAuthLoading(false);
    }
  };

  const applyPreset = (preset: (typeof RANDOM_GIFT_PRESETS)[number]) => {
    setCategory(preset.category);
    setTitle(preset.title);
    setMessage(preset.message);
    setPayloadText(JSON.stringify(preset.payload, null, 2));
    setSendFeedback(null);
  };

  const applyRandomSurprise = () => {
    const idx = Math.floor(Math.random() * RANDOM_GIFT_PRESETS.length);
    const chosen = RANDOM_GIFT_PRESETS[idx];
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    applyPreset({
      ...chosen,
      payload: {
        ...chosen.payload,
        dropNonce: code,
        randomBonusPoints: Math.floor(Math.random() * 400) + 100,
      },
    });
  };

  const handleDispatchGift = async (e: FormEvent) => {
    e.preventDefault();
    if (!activePasskey) return;
    if (!isFpValid) {
      setSendFeedback({
        type: 'err',
        text: 'Enter the user’s exact 12-digit device fingerprint.',
      });
      return;
    }

    let parsedPayload: Record<string, unknown> | string = payloadText.trim();
    if (typeof parsedPayload === 'string' && parsedPayload.startsWith('{')) {
      try {
        parsedPayload = JSON.parse(parsedPayload) as Record<string, unknown>;
      } catch {
        setSendFeedback({
          type: 'err',
          text: 'Reward payload JSON has a syntax error. Fix braces/quotes or use plain text.',
        });
        return;
      }
    }

    setSending(true);
    setSendFeedback(null);
    try {
      const res = await fetch('/api/admin/gifts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activePasskey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fingerprint: normalizedFp,
          category,
          title,
          message,
          payload: parsedPayload,
          expiresInDays: Number(expiresInDays) || 0,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        gift?: DeviceGift;
        message?: string;
      };
      if (!res.ok || !data.gift) {
        setSendFeedback({
          type: 'err',
          text: data.message || 'Could not dispatch gift.',
        });
        return;
      }
      setSendFeedback({
        type: 'ok',
        text: `Delivered "${data.gift.title}" to fingerprint ${formatFingerprintDisplay(data.gift.fingerprint)}.`,
      });
      await loadGifts(activePasskey, filterFp);
    } catch {
      setSendFeedback({ type: 'err', text: 'Network error while dispatching gift.' });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteGift = async (id: string) => {
    if (!activePasskey) return;
    try {
      const res = await fetch(`/api/admin/gifts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${activePasskey}` },
      });
      if (res.ok) {
        await loadGifts(activePasskey, filterFp);
      }
    } catch {
      // ignore
    }
  };

  const handleTestAppPoll = async (fp: string) => {
    try {
      const res = await fetch(`/api/gifts/${fp}`, { cache: 'no-store' });
      const data = await res.json();
      setPollTargetFp(fp);
      setPollPreviewJson(JSON.stringify(data, null, 2));
    } catch {
      setPollTargetFp(fp);
      setPollPreviewJson('{"error": "Failed to poll endpoint"}');
    }
  };

  const handleSimulateClaim = async (fp: string, giftId: string) => {
    if (!activePasskey) return;
    try {
      await fetch(`/api/gifts/${fp}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId }),
      });
      await loadGifts(activePasskey, filterFp);
      if (pollTargetFp === fp) {
        await handleTestAppPoll(fp);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="site-bg site-theme-scope min-h-screen pb-[max(2rem,env(safe-area-inset-bottom))] text-[#f4f7fb]">
      {/* Top Safe-Area Sticky Bar */}
      <header className="site-nav-shell sticky top-0 z-30 border-b border-white/10 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="glass-surface inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-[#cbd5e8] transition-colors hover:border-white/30 hover:text-white touch-manipulation"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to FocusOS</span>
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              <FocusLogo className="h-6 w-6" />
              <span className="font-display text-sm font-bold text-[#f4f7fb]">
                Developer Gift Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SiteThemeSwitcher
              siteTheme={siteTheme}
              onChangeSiteTheme={onChangeSiteTheme}
              variant="navbar"
            />
            {activePasskey ? (
              <>
                <button
                  type="button"
                  onClick={() => void loadGifts(activePasskey, filterFp)}
                  className="glass-surface inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-[#93c5fd] hover:border-white/30 touch-manipulation"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loadingGifts ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePasskey(null);
                    setGifts([]);
                  }}
                  className="glass-surface inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-[#cbd5e8] hover:border-rose-400/40 hover:text-rose-200 touch-manipulation"
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Lock</span>
                </button>
              </>
            ) : (
              <span className="hidden font-mono text-[11px] font-medium text-[#60a5fa] sm:inline">
                ADMIN · 12-DIGIT GIFT BRIDGE
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1160px] px-4 pt-6 sm:px-6 sm:pt-10">
        {!activePasskey ? (
          /* Unlock Gate */
          <div className="mx-auto max-w-[520px]">
            <div className="glass-surface-highlight rounded-3xl p-6 sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#60a5fa]/40 bg-[#3b82f6]/15 text-[#93c5fd]">
                  <KeyRound className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-[#f4f7fb]">
                    FocusOS Developer Admin
                  </h1>
                  <p className="text-xs text-[#9ba8bf]">
                    Send gifts &amp; subscriptions by 12-digit device fingerprint
                  </p>
                </div>
              </div>

              {status && !status.configured && status.isProd ? (
                <div className="glass-well mb-5 rounded-2xl border border-amber-400/30 p-4 text-xs leading-relaxed text-amber-200">
                  <strong className="font-semibold">Setup needed on Render:</strong> Add{' '}
                  <code className="allow-select font-mono text-white">ADMIN_PASSKEY</code> in your
                  Render Environment Variables so this console and external AI Studio admin tools
                  stay protected.
                </div>
              ) : null}

              {status?.devFallback ? (
                <div className="glass-well mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl p-3.5 text-xs text-[#9ba8bf]">
                  <span>
                    Local preview fallback passkey:{' '}
                    <code className="allow-select font-mono text-[#93c5fd]">focusos-dev-admin</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPasskeyInput('focusos-dev-admin')}
                    className="rounded-lg border border-[#60a5fa]/35 bg-[#3b82f6]/15 px-2.5 py-1 text-[11px] font-semibold text-[#93c5fd] hover:bg-[#3b82f6]/25"
                  >
                    Auto-fill
                  </button>
                </div>
              ) : null}

              <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                  <label
                    htmlFor="admin-passkey"
                    className="mb-1.5 block text-xs font-medium text-[#cbd5e8]"
                  >
                    Developer Admin Passkey
                  </label>
                  <div className="relative">
                    <input
                      id="admin-passkey"
                      type={showPasskey ? 'text' : 'password'}
                      value={passkeyInput}
                      onChange={(e) => setPasskeyInput(e.target.value)}
                      placeholder="Enter ADMIN_PASSKEY"
                      autoComplete="off"
                      className="glass-well w-full rounded-2xl px-4 py-3 pr-11 font-mono text-sm text-[#f4f7fb] placeholder:text-[#64748b] focus:border-[#60a5fa]/60 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasskey((v) => !v)}
                      aria-label={showPasskey ? 'Hide passkey' : 'Show passkey'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#9ba8bf] hover:text-white"
                    >
                      {showPasskey ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {authError && (
                  <p className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="site-primary-btn inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60"
                >
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  <span>{authLoading ? 'Verifying…' : 'Unlock Gift Console'}</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Authenticated Console */
          <div className="space-y-6">
            {/* Header & Stats */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold tracking-widest text-[#60a5fa] uppercase">
                  Phantomstrange · Live Gift Dispatcher
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold text-[#f4f7fb] sm:text-3xl">
                  Send Gifts to <span className="highlight-text">12-Digit Fingerprints</span>
                </h1>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="glass-surface rounded-2xl px-4 py-2.5 text-center">
                  <div className="font-mono text-lg font-bold text-[#f4f7fb] tabular-nums">
                    {stats.total}
                  </div>
                  <div className="text-[11px] text-[#9ba8bf]">Total</div>
                </div>
                <div className="glass-surface rounded-2xl px-4 py-2.5 text-center">
                  <div className="font-mono text-lg font-bold text-[#60a5fa] tabular-nums">
                    {stats.pending}
                  </div>
                  <div className="text-[11px] text-[#9ba8bf]">Pending</div>
                </div>
                <div className="glass-surface rounded-2xl px-4 py-2.5 text-center">
                  <div className="font-mono text-lg font-bold text-[#34d399] tabular-nums">
                    {stats.claimed}
                  </div>
                  <div className="text-[11px] text-[#9ba8bf]">Claimed</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Composer */}
              <section className="glass-surface-highlight rounded-3xl p-5 sm:p-6 lg:col-span-5">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold text-[#f4f7fb]">
                    <Gift className="h-4 w-4 text-[#60a5fa]" aria-hidden="true" />
                    <span>Create &amp; Send Gift</span>
                  </h2>
                  <button
                    type="button"
                    onClick={applyRandomSurprise}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#34d399]/35 bg-[#10b981]/12 px-3 py-1.5 text-[11px] font-semibold text-[#6ee7b7] transition-colors hover:bg-[#10b981]/20 touch-manipulation"
                  >
                    <Dice5 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Random Drop</span>
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {RANDOM_GIFT_PRESETS.slice(0, 4).map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-[#cbd5e8] transition-colors hover:border-[#60a5fa]/45 hover:text-white touch-manipulation"
                    >
                      {CATEGORY_LABELS[preset.category].split(' ')[0]} Preset
                    </button>
                  ))}
                </div>

                <form onSubmit={handleDispatchGift} className="space-y-3.5">
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label
                        htmlFor="fp-input"
                        className="text-xs font-medium text-[#cbd5e8]"
                      >
                        12-Digit Device Fingerprint
                      </label>
                      <button
                        type="button"
                        onClick={() => setFingerprintRaw(generateRandom12DigitFingerprint())}
                        className="text-[11px] font-medium text-[#60a5fa] hover:underline"
                      >
                        Generate test 12 digits
                      </button>
                    </div>
                    <input
                      id="fp-input"
                      type="text"
                      inputMode="numeric"
                      value={fingerprintRaw}
                      onChange={(e) => setFingerprintRaw(e.target.value)}
                      placeholder="e.g. 482910573612 or 4829-1057-3612"
                      className="glass-well w-full rounded-2xl px-3.5 py-2.5 font-mono text-sm tracking-wider text-[#f4f7fb] placeholder:text-[#64748b] focus:border-[#60a5fa]/60 focus:outline-none"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-[#9ba8bf]">
                        {normalizedFp ? formatFingerprintDisplay(normalizedFp) : '0000-0000-0000'}
                      </span>
                      <span className={isFpValid ? 'text-[#34d399]' : 'text-[#7c89a1]'}>
                        {normalizedFp.length}/12 digits
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="gift-category"
                        className="mb-1 block text-xs font-medium text-[#cbd5e8]"
                      >
                        Category
                      </label>
                      <select
                        id="gift-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as GiftCategory)}
                        className="glass-well w-full rounded-2xl px-3 py-2.5 text-xs font-medium text-[#f4f7fb] focus:border-[#60a5fa]/60 focus:outline-none"
                      >
                        {(Object.keys(CATEGORY_LABELS) as GiftCategory[]).map((key) => (
                          <option key={key} value={key} className="bg-[#0b101c] text-[#f4f7fb]">
                            {CATEGORY_LABELS[key]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="gift-expiry"
                        className="mb-1 block text-xs font-medium text-[#cbd5e8]"
                      >
                        Expires In
                      </label>
                      <select
                        id="gift-expiry"
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(e.target.value)}
                        className="glass-well w-full rounded-2xl px-3 py-2.5 text-xs font-medium text-[#f4f7fb] focus:border-[#60a5fa]/60 focus:outline-none"
                      >
                        <option value="7" className="bg-[#0b101c]">
                          7 days
                        </option>
                        <option value="30" className="bg-[#0b101c]">
                          30 days
                        </option>
                        <option value="90" className="bg-[#0b101c]">
                          90 days
                        </option>
                        <option value="0" className="bg-[#0b101c]">
                          Never expires
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="gift-title"
                      className="mb-1 block text-xs font-medium text-[#cbd5e8]"
                    >
                      Gift Title
                    </label>
                    <input
                      id="gift-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={96}
                      required
                      className="glass-well w-full rounded-2xl px-3.5 py-2.5 text-sm text-[#f4f7fb] focus:border-[#60a5fa]/60 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="gift-message"
                      className="mb-1 block text-xs font-medium text-[#cbd5e8]"
                    >
                      In-App Note to User
                    </label>
                    <textarea
                      id="gift-message"
                      rows={2}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={280}
                      className="glass-well w-full rounded-2xl px-3.5 py-2 text-xs leading-relaxed text-[#f4f7fb] focus:border-[#60a5fa]/60 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="gift-payload"
                      className="mb-1 block text-xs font-medium text-[#cbd5e8]"
                    >
                      Reward JSON / Unlock Key (for Android app)
                    </label>
                    <textarea
                      id="gift-payload"
                      rows={4}
                      value={payloadText}
                      onChange={(e) => setPayloadText(e.target.value)}
                      className="glass-well w-full rounded-2xl px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-[#93c5fd] focus:border-[#60a5fa]/60 focus:outline-none"
                    />
                  </div>

                  {sendFeedback && (
                    <div
                      className={`rounded-2xl border px-3.5 py-2.5 text-xs ${
                        sendFeedback.type === 'ok'
                          ? 'border-[#34d399]/35 bg-[#10b981]/10 text-[#a7f3d0]'
                          : 'border-rose-400/35 bg-rose-500/10 text-rose-200'
                      }`}
                    >
                      {sendFeedback.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="site-primary-btn inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60 touch-manipulation"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span>{sending ? 'Dispatching…' : 'Send Gift to Device'}</span>
                  </button>
                </form>
              </section>

              {/* Right Column: Dispatched Gifts & External App / AI Studio Connection Guide */}
              <div className="space-y-6 lg:col-span-7">
                <section className="glass-surface rounded-3xl p-5 sm:p-6">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="flex items-center gap-2 font-display text-base font-semibold text-[#f4f7fb]">
                      <Sparkles className="h-4 w-4 text-[#34d399]" aria-hidden="true" />
                      <span>Dispatched Device Gifts</span>
                    </h2>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={filterFp}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFilterFp(v);
                          if (activePasskey) void loadGifts(activePasskey, v);
                        }}
                        placeholder="Filter 12-digit ID…"
                        className="glass-well w-44 rounded-xl px-3 py-1.5 font-mono text-xs text-[#f4f7fb] placeholder:text-[#64748b] focus:border-[#60a5fa]/60 focus:outline-none"
                      />
                    </div>
                  </div>

                  {gifts.length === 0 ? (
                    <div className="glass-well rounded-2xl p-6 text-center text-xs text-[#9ba8bf]">
                      No gifts queued yet. Enter a user&apos;s 12-digit device fingerprint on the
                      left to send a subscription pass, skin, or random surprise.
                    </div>
                  ) : (
                    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {gifts.map((gift) => (
                        <div key={gift.id} className="glass-well rounded-2xl p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="allow-select font-mono text-xs font-semibold text-[#93c5fd]">
                                  {formatFingerprintDisplay(gift.fingerprint)}
                                </span>
                                <span className="text-[11px] text-[#7c89a1]">
                                  · {CATEGORY_LABELS[gift.category] ?? gift.category}
                                </span>
                                <span
                                  className={`text-[11px] font-semibold ${
                                    gift.claimedAt ? 'text-[#34d399]' : 'text-amber-300'
                                  }`}
                                >
                                  · {gift.claimedAt ? 'Claimed' : 'Pending'}
                                </span>
                              </div>
                              <h3 className="mt-1 font-display text-sm font-semibold text-[#f4f7fb]">
                                {gift.title}
                              </h3>
                              {gift.message && (
                                <p className="mt-0.5 text-xs text-[#9ba8bf]">{gift.message}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void handleTestAppPoll(gift.fingerprint)}
                                className="rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-[#cbd5e8] hover:border-[#60a5fa]/45 hover:text-white touch-manipulation"
                              >
                                Test Poll
                              </button>
                              {!gift.claimedAt && (
                                <button
                                  type="button"
                                  onClick={() => void handleSimulateClaim(gift.fingerprint, gift.id)}
                                  className="rounded-lg border border-[#34d399]/30 bg-[#10b981]/10 px-2.5 py-1 text-[11px] font-medium text-[#6ee7b7] hover:bg-[#10b981]/20 touch-manipulation"
                                >
                                  Mark Claimed
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleDeleteGift(gift.id)}
                                aria-label="Revoke gift"
                                className="rounded-lg border border-rose-400/25 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/20 touch-manipulation"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          <pre className="allow-select mt-2.5 overflow-x-auto rounded-xl bg-[#070a10]/80 px-3 py-2 font-mono text-[10px] text-[#9ba8bf]">
                            {JSON.stringify(gift.payload)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}

                  {pollPreviewJson && (
                    <div className="mt-4 rounded-2xl border border-[#60a5fa]/30 bg-[#0b1220] p-3.5">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] text-[#93c5fd]">
                        <span>
                          Live Android App Response (GET /api/gifts/{pollTargetFp})
                        </span>
                        <button
                          type="button"
                          onClick={() => setPollPreviewJson(null)}
                          className="text-[#9ba8bf] hover:text-white"
                        >
                          Close
                        </button>
                      </div>
                      <pre className="allow-select max-h-44 overflow-auto font-mono text-[11px] leading-relaxed text-[#cbd5e8]">
                        {pollPreviewJson}
                      </pre>
                    </div>
                  )}
                </section>

                {/* Android & External AI Studio Project Integration Reference */}
                <section className="glass-surface rounded-3xl p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold text-[#f4f7fb]">
                    <Smartphone className="h-4 w-4 text-[#60a5fa]" aria-hidden="true" />
                    <span>Connect Android App &amp; External AI Studio Admin Site</span>
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#9ba8bf]">
                    Point your Android app or a separate AI Studio Admin project to these HTTPS
                    endpoints on this backend. Set{' '}
                    <code className="allow-select font-mono text-[#cbd5e8]">ADMIN_CORS_ORIGIN</code>{' '}
                    in Render if calling admin routes from a different domain.
                  </p>

                  <div className="mt-4 space-y-2.5">
                    {[
                      {
                        key: 'poll',
                        label: 'Android App Fetch Gifts (GET)',
                        value: `${originUrl}/api/gifts/482910573612`,
                      },
                      {
                        key: 'claim',
                        label: 'Android App Claim Gift (POST JSON {"giftId": "..."})',
                        value: `${originUrl}/api/gifts/482910573612/claim`,
                      },
                      {
                        key: 'admin',
                        label: 'External AI Studio Admin Send Gift (POST + Bearer ADMIN_PASSKEY)',
                        value: `${originUrl}/api/admin/gifts`,
                      },
                    ].map((row) => (
                      <div
                        key={row.key}
                        className="glass-well flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium text-[#9ba8bf]">{row.label}</div>
                          <div className="allow-select truncate font-mono text-xs text-[#93c5fd]">
                            {row.value}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(row.key, row.value)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/12 bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-semibold text-[#cbd5e8] hover:border-[#60a5fa]/45 touch-manipulation"
                        >
                          {copiedKey === row.key ? (
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
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
