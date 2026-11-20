import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CalendarClock,
  Check,
  ChevronLeft,
  Copy,
  Home,
  Minus,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { AppEntry, DemoTab, StudyBlockEntry, THEMES, ThemeId } from './focusDemoTypes';

const QUOTES = [
  '“Get yourself back on track.”',
  '“Tonight’s effort is tomorrow’s confidence.”',
  '“Ready when you are. Resume and finish strong.”',
];

const TOPICS = ['General study', 'Engineering Mathematics', 'System Design', 'Exam Prep'];

const INITIAL_APP_LIST: AppEntry[] = [
  { name: 'AccuBattery', category: 'System', color: '#22c55e', allowed: false },
  { name: 'Calculator', category: 'Utility', color: '#f97316', allowed: true },
  { name: 'Calendar', category: 'Schedule', color: '#3b82f6', allowed: true },
  { name: 'File Manager', category: 'Files', color: '#eab308', allowed: false },
  { name: 'Instagram', category: 'Social', color: '#ec4899', allowed: false },
  { name: 'Netflix', category: 'Video', color: '#ef4444', allowed: false },
  { name: 'Notes', category: 'Study', color: '#60a5fa', allowed: true },
  { name: 'Photos', category: 'Media', color: '#a855f7', allowed: false },
  { name: 'Screen Recorder', category: 'Tool', color: '#10b981', allowed: true },
  { name: 'WhatsApp', category: 'Messaging', color: '#22c55e', allowed: false },
];

const INITIAL_BLOCKS: StudyBlockEntry[] = [
  { id: '1', label: 'Mon–Fri · 18:00', topic: 'Engineering Mathematics', duration: 45 },
  { id: '2', label: 'Sat · 10:00', topic: 'General study', duration: 60 },
];

const HEATMAP_WEEKS = 12;
const HEATMAP_DAYS = 5;

function formatClock(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface FocusSimulatorControlledProps {
  activeTab: DemoTab;
  setActiveTab: (tab: DemoTab) => void;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  glassEffect: boolean;
  setGlassEffect: (v: boolean) => void;
  vibrantColour: boolean;
  setVibrantColour: (v: boolean) => void;
  showQuotes: boolean;
  setShowQuotes: (v: boolean) => void;
  stricterMode: boolean;
  setStricterMode: (v: boolean) => void;
  showAllowedAppsScreen: boolean;
  setShowAllowedAppsScreen: (v: boolean) => void;
  legalModal: 'privacy' | 'terms' | null;
  setLegalModal: (m: 'privacy' | 'terms' | null) => void;
  blockedPopupTrigger: number;
  isFullScreen?: boolean;
}

export function FocusAppSimulator({
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
  showAllowedAppsScreen,
  setShowAllowedAppsScreen,
  legalModal,
  setLegalModal,
  blockedPopupTrigger,
  isFullScreen = false,
}: FocusSimulatorControlledProps) {
  const activeTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  const [studyTopic, setStudyTopic] = useState('General study');
  const [durationMins, setDurationMins] = useState(5);
  const [dailyGoalMins, setDailyGoalMins] = useState(15);
  const [blockSettingsNormal, setBlockSettingsNormal] = useState(false);
  const [requireTypingExit, setRequireTypingExit] = useState(true);
  const [uninstallProtection, setUninstallProtection] = useState(true);

  const [sessionState, setSessionState] = useState<'ready' | 'running' | 'paused'>('ready');
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);
  const [focusedMinutesToday, setFocusedMinutesToday] = useState(2);
  const [sessionsCompleted, setSessionsCompleted] = useState(1);
  const [emergencyPasses, setEmergencyPasses] = useState(0);
  const [recentSessions, setRecentSessions] = useState([
    { topic: 'General study', date: '17 Nov · 16:19', mins: 2, status: 'Ended early' },
  ]);

  const [appSearch, setAppSearch] = useState('');
  const [apps, setApps] = useState<AppEntry[]>(INITIAL_APP_LIST);

  const [showBlockedPopup, setShowBlockedPopup] = useState(false);
  const [blockedCountdown, setBlockedCountdown] = useState(10);

  const [showExitModal, setShowExitModal] = useState(false);
  const [exitWaitSeconds, setExitWaitSeconds] = useState(5);
  const [exitInput, setExitInput] = useState('');

  const [studyBlocks, setStudyBlocks] = useState<StudyBlockEntry[]>(INITIAL_BLOCKS);
  const [newBlockAddedToast, setNewBlockAddedToast] = useState(false);
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);

  // Trigger blocked popup from external quick-scenario button
  useEffect(() => {
    if (blockedPopupTrigger === 0) return;
    if (sessionState === 'ready') {
      setSecondsLeft(durationMins * 60);
      setSessionState('running');
    }
    setActiveTab('home');
    setShowAllowedAppsScreen(false);
    setBlockedCountdown(10);
    setShowBlockedPopup(true);
  }, [blockedPopupTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer tick
  useEffect(() => {
    if (sessionState !== 'running') return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setSessionState('ready');
          setFocusedMinutesToday((m) => m + durationMins);
          setSessionsCompleted((s) => s + 1);
          if (durationMins >= 15) {
            setEmergencyPasses((p) => Math.min(5, p + (stricterMode ? 2 : 1)));
          }
          setRecentSessions((list) => [
            {
              topic: studyTopic || 'General study',
              date: 'Just now',
              mins: durationMins,
              status: 'Completed',
            },
            ...list.slice(0, 4),
          ]);
          return durationMins * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [sessionState, durationMins, studyTopic, stricterMode]);

  // Blocked app popup countdown
  useEffect(() => {
    if (!showBlockedPopup) return;
    const id = window.setInterval(() => {
      setBlockedCountdown((prev) => {
        if (prev <= 1) {
          setShowBlockedPopup(false);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [showBlockedPopup]);

  // Emergency exit wait countdown
  useEffect(() => {
    if (!showExitModal || exitWaitSeconds <= 0) return;
    const id = window.setInterval(() => {
      setExitWaitSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [showExitModal, exitWaitSeconds]);

  const handleDurationChange = (mins: number) => {
    const clamped = Math.max(5, Math.min(120, mins));
    setDurationMins(clamped);
    if (sessionState === 'ready') {
      setSecondsLeft(clamped * 60);
    }
  };

  const handleStartSession = () => {
    setSecondsLeft(durationMins * 60);
    setSessionState('running');
  };

  const openEmergencyExit = () => {
    setExitInput('');
    setExitWaitSeconds(stricterMode ? 8 : 4);
    setShowExitModal(true);
  };

  const confirmEmergencyExit = () => {
    setShowExitModal(false);
    setSessionState('ready');
    setSecondsLeft(durationMins * 60);
    setRecentSessions((list) => [
      {
        topic: studyTopic || 'General study',
        date: 'Just now',
        mins: 1,
        status: 'Ended early',
      },
      ...list.slice(0, 4),
    ]);
  };

  const triggerBlockedAppSim = () => {
    if (sessionState === 'ready') {
      setSecondsLeft(durationMins * 60);
      setSessionState('running');
    }
    setActiveTab('home');
    setShowAllowedAppsScreen(false);
    setBlockedCountdown(10);
    setShowBlockedPopup(true);
  };

  const toggleAppAllowed = (appName: string) => {
    setApps((prev) =>
      prev.map((a) => (a.name === appName ? { ...a, allowed: !a.allowed } : a)),
    );
  };

  const filteredApps = useMemo(() => {
    const q = appSearch.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter((a) => a.name.toLowerCase().includes(q));
  }, [apps, appSearch]);

  const allowedAppsList = useMemo(() => apps.filter((a) => a.allowed), [apps]);
  const allowedCount = allowedAppsList.length;
  const blockedCount = apps.length - allowedCount;

  const progressRatio =
    sessionState === 'ready'
      ? 1
      : Math.max(0.04, secondsLeft / Math.max(1, durationMins * 60));
  const circumference = 2 * Math.PI * 58;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const cardSurfaceClass = glassEffect
    ? 'border border-white/12 bg-white/[0.055] backdrop-blur-md'
    : 'border border-white/10 bg-[#121620]';

  const isLightPantone = themeId === 'cloud-dancer';
  const buttonTextColor = isLightPantone ? '#111722' : '#ffffff';

  const canConfirmExit =
    exitWaitSeconds === 0 && (!requireTypingExit || exitInput.trim().toUpperCase() === 'EXIT');

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText('482-910');
    } catch {
      // Ignore clipboard failure
    }
    setCopiedRoomCode(true);
    window.setTimeout(() => setCopiedRoomCode(false), 1800);
  };

  const handleAddStudyBlock = () => {
    const nextIdx = studyBlocks.length + 1;
    setStudyBlocks((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        label: nextIdx % 2 === 0 ? 'Tue & Thu · 19:00' : 'Sun · 16:00',
        topic: studyTopic || 'Focused Review',
        duration: durationMins >= 15 ? durationMins : 45,
      },
    ]);
    setNewBlockAddedToast(true);
    window.setTimeout(() => setNewBlockAddedToast(false), 1800);
  };

  const themeGroups: ('Classic' | 'Natural' | 'Pantone-inspired')[] = [
    'Classic',
    'Natural',
    'Pantone-inspired',
  ];

  return (
    <div
      className={`relative flex w-full flex-col justify-between overflow-hidden transition-colors duration-300 ${
        isFullScreen ? 'h-full' : 'h-[650px] rounded-[32px]'
      }`}
      style={{
        background: vibrantColour
          ? `radial-gradient(360px 280px at 50% 8%, ${activeTheme.glow}, transparent 75%), radial-gradient(280px 300px at 85% 75%, ${activeTheme.accentSoft}, transparent 70%), #080a10`
          : '#090b10',
      }}
    >
      {/* Android Status Bar (shown cleanly in framed preview; hidden in full-screen native mobile since phone already has one) */}
      {!isFullScreen && (
        <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-3 text-[11px] font-medium text-[#9aa6bc]">
          <span className="tabular-nums">9:08 PM</span>
          <span className="text-[10px] tracking-wider">5G · 94%</span>
        </div>
      )}

      {/* Scrollable Screen Body */}
      <div className="relative flex-1 overflow-y-auto px-4 pb-4 pt-2 sm:px-5">
        <AnimatePresence mode="wait">
          {showAllowedAppsScreen ? (
            <motion.div
              key="allowed-apps"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18 }}
              className="pb-2"
            >
              <button
                type="button"
                onClick={() => setShowAllowedAppsScreen(false)}
                className="mb-2 inline-flex min-h-[40px] items-center gap-1 text-sm font-semibold touch-manipulation"
                style={{ color: activeTheme.ringTo }}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back</span>
              </button>

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-2xl font-bold text-[#f4f7fb]">
                    Allowed apps
                  </h3>
                  <p className="mt-0.5 text-xs text-[#8d9cb8] tabular-nums">
                    {allowedCount} allowed in Default · {blockedCount} blocked
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setApps((prev) => prev.map((a) => ({ ...a, allowed: false })))
                  }
                  className="min-h-[36px] text-xs font-semibold touch-manipulation"
                  style={{ color: activeTheme.ringTo }}
                >
                  Clear all
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold"
                  style={{
                    backgroundColor: activeTheme.accent,
                    color: buttonTextColor,
                  }}
                >
                  Default · {allowedCount}
                </span>
                <span className="rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-[#cbd5e8]">
                  + New group
                </span>
              </div>

              <p className="mt-2.5 text-[11px] text-[#7c89a1]">
                Phone, your home screen and Evolve are always available.
              </p>

              <div className="relative mt-3">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c89a1]"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  placeholder="Search apps"
                  aria-label="Search apps"
                  className="min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.05] pl-10 pr-3 text-xs text-[#f4f7fb] placeholder-[#7c89a1] focus:border-white/30 focus:outline-none"
                />
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {filteredApps.map((app) => (
                  <button
                    key={app.name}
                    type="button"
                    onClick={() => toggleAppAllowed(app.name)}
                    className={`flex min-h-[58px] w-full items-center justify-between rounded-2xl px-3.5 py-2 text-left transition-colors touch-manipulation ${cardSurfaceClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold text-white"
                        style={{ backgroundColor: app.color }}
                      >
                        {app.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <span className="block text-sm font-semibold text-[#f4f7fb]">
                          {app.name}
                        </span>
                        <span
                          className="text-[10px] font-semibold tracking-wider uppercase"
                          style={{ color: app.allowed ? '#34d399' : '#7c89a1' }}
                        >
                          {app.allowed ? 'ALLOWED' : 'BLOCKED'}
                        </span>
                      </div>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                        app.allowed ? 'bg-[#22c55e]' : 'bg-white/15'
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          app.allowed ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : activeTab === 'home' ? (
            <motion.div
              key="home-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="flex flex-col gap-3.5 pb-2"
            >
              {/* App Top Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    className="font-display text-2xl font-bold tracking-tight"
                    style={{ color: activeTheme.ringTo }}
                  >
                    Evolve<span className="text-[#f4f7fb]">.</span>
                  </h3>
                  <p className="text-xs text-[#8d9cb8]">Make time for what matters.</p>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold"
                  style={{
                    color:
                      sessionState === 'running'
                        ? '#34d399'
                        : sessionState === 'paused'
                          ? '#fbbf24'
                          : '#e2e8f5',
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        sessionState === 'running'
                          ? '#34d399'
                          : sessionState === 'paused'
                            ? '#fbbf24'
                            : '#9ba8bf',
                    }}
                  />
                  <span>
                    {sessionState === 'running'
                      ? 'Blocking active'
                      : sessionState === 'paused'
                        ? 'Paused'
                        : 'Ready'}
                  </span>
                </span>
              </div>

              {/* Motivational Quote Card (Toggleable!) */}
              {showQuotes && (
                <div
                  className={`rounded-2xl px-4 py-3 text-xs italic text-[#cbd5e8] ${cardSurfaceClass}`}
                >
                  {sessionState === 'paused'
                    ? QUOTES[2]
                    : sessionState === 'running'
                      ? QUOTES[1]
                      : QUOTES[0]}
                </div>
              )}

              {/* Study Topic Card */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <p className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                  Study topic
                </p>
                <input
                  type="text"
                  value={studyTopic}
                  onChange={(e) => setStudyTopic(e.target.value)}
                  placeholder="What are you studying?"
                  aria-label="What are you studying?"
                  className="mt-2 min-h-[42px] w-full rounded-2xl border border-white/10 bg-black/25 px-3.5 text-xs text-[#f4f7fb] placeholder-[#7c89a1] focus:border-white/30 focus:outline-none"
                />
                <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
                  {TOPICS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setStudyTopic(t)}
                      className={`min-h-[34px] shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors touch-manipulation ${
                        studyTopic === t
                          ? 'border-white/35 bg-white/15 text-[#f4f7fb]'
                          : 'border-white/10 bg-white/[0.04] text-[#9ba8bf] hover:text-[#f4f7fb]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timer Ring Card */}
              <div className={`rounded-3xl p-4 text-center sm:p-5 ${cardSurfaceClass}`}>
                <div className="relative mx-auto flex h-[152px] w-[152px] items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 132 132" aria-hidden="true">
                    <defs>
                      <linearGradient id="appRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={activeTheme.ringTo} />
                        <stop offset="100%" stopColor={activeTheme.accent} />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="66"
                      cy="66"
                      r="58"
                      fill="none"
                      stroke="rgba(255,255,255,0.09)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="66"
                      cy="66"
                      r="58"
                      fill="none"
                      stroke="url(#appRingGrad)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-[stroke-dashoffset] duration-300 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-3xl font-bold tracking-tight text-[#f4f7fb] tabular-nums">
                      {formatClock(secondsLeft)}
                    </span>
                    <span className="mt-1 text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                      {sessionState === 'ready'
                        ? `${durationMins} min session`
                        : sessionState === 'running'
                          ? 'Focus'
                          : 'Paused'}
                    </span>
                  </div>
                </div>

                {sessionState === 'ready' ? (
                  <>
                    <div className="mt-4 grid grid-cols-4 gap-1.5">
                      {[15, 25, 45, 60].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleDurationChange(m)}
                          className="min-h-[38px] rounded-full border text-[11px] font-semibold transition-colors touch-manipulation"
                          style={{
                            borderColor:
                              durationMins === m ? activeTheme.accent : 'rgba(255,255,255,0.12)',
                            backgroundColor:
                              durationMins === m ? activeTheme.accentSoft : 'rgba(255,255,255,0.04)',
                            color: durationMins === m ? '#f4f7fb' : '#9ba8bf',
                          }}
                        >
                          {m} min
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-5">
                      <button
                        type="button"
                        aria-label="Decrease duration"
                        onClick={() => handleDurationChange(durationMins - 5)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.05] text-[#f4f7fb] touch-manipulation"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="font-mono text-sm font-semibold text-[#f4f7fb] tabular-nums">
                        {durationMins} min
                      </span>
                      <button
                        type="button"
                        aria-label="Increase duration"
                        onClick={() => handleDurationChange(durationMins + 5)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.05] text-[#f4f7fb] touch-manipulation"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 border-t border-white/10 pt-3.5 text-left">
                      <span className="block text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                        App group
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAllowedAppsScreen(true)}
                        className="mt-2 inline-flex min-h-[34px] items-center rounded-full px-3.5 py-1 text-xs font-semibold touch-manipulation"
                        style={{
                          backgroundColor: activeTheme.accentSoft,
                          color: activeTheme.ringTo,
                        }}
                      >
                        Default · {allowedCount}
                      </button>

                      <p className="mt-2 text-[11px] leading-relaxed text-[#9ba8bf]">
                        {allowedCount === 0
                          ? 'This group has no apps. During a session everything except Phone, your home screen and Evolve will be blocked.'
                          : `${allowedCount} allowed apps stay available. All other apps stay blocked during your session.`}
                      </p>

                      <button
                        type="button"
                        onClick={() => setStricterMode(!stricterMode)}
                        className="mt-3 flex min-h-[48px] w-full items-center justify-between gap-3 text-left touch-manipulation"
                      >
                        <div>
                          <span className="block text-xs font-semibold text-[#f4f7fb]">
                            Stricter mode
                          </span>
                          <span className="block text-[11px] leading-snug text-[#8d9cb8]">
                            No pause, Settings is blocked, and the emergency exit needs a 60-second wait plus typing EXIT.
                          </span>
                        </div>
                        <span
                          aria-hidden="true"
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                            stricterMode ? 'bg-[#22c55e]' : 'bg-white/15'
                          }`}
                        >
                          <span
                            className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              stricterMode ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartSession}
                      className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-full text-sm font-bold transition-transform active:scale-[0.98] touch-manipulation"
                      style={{
                        background: `linear-gradient(90deg, ${activeTheme.accent}, ${activeTheme.ringTo})`,
                        color: buttonTextColor,
                      }}
                    >
                      Start focus session
                    </button>
                  </>
                ) : (
                  <div className="mt-5 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5">
                      {!stricterMode && (
                        <button
                          type="button"
                          onClick={() =>
                            setSessionState((s) => (s === 'running' ? 'paused' : 'running'))
                          }
                          className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.08] text-xs font-semibold text-[#f4f7fb] touch-manipulation"
                        >
                          {sessionState === 'running' ? (
                            <>
                              <Pause className="h-4 w-4" aria-hidden="true" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" aria-hidden="true" />
                              <span>Resume</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={openEmergencyExit}
                        className="flex min-h-[46px] flex-1 items-center justify-center rounded-full border border-rose-500/35 bg-rose-500/15 text-xs font-semibold text-rose-200 touch-manipulation"
                      >
                        Emergency exit
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={triggerBlockedAppSim}
                      className="min-h-[38px] text-xs font-medium underline-offset-2 hover:underline touch-manipulation"
                      style={{ color: activeTheme.ringTo }}
                    >
                      Simulate opening a blocked app
                    </button>
                  </div>
                )}
              </div>

              {/* Daily Progress Card */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold tracking-widest text-[#8d9cb8] uppercase">
                    Daily progress
                  </span>
                  <span className="font-mono font-semibold text-[#f4f7fb] tabular-nums">
                    {focusedMinutesToday}m of {dailyGoalMins}m
                  </span>
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (focusedMinutesToday / dailyGoalMins) * 100)}%`,
                      backgroundColor: activeTheme.accent,
                    }}
                  />
                </div>
                <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl border border-white/10 bg-black/20 py-2.5">
                    <b className="block font-display text-base text-[#f4f7fb] tabular-nums">
                      {focusedMinutesToday}m
                    </b>
                    <small className="text-[10px] text-[#8d9cb8]">Today</small>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 py-2.5">
                    <b className="block font-display text-base text-[#f4f7fb] tabular-nums">
                      {sessionsCompleted}
                    </b>
                    <small className="text-[10px] text-[#8d9cb8]">Sessions</small>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 py-2.5">
                    <b className="block font-display text-base text-[#f4f7fb] tabular-nums">
                      {emergencyPasses}
                    </b>
                    <small className="text-[10px] text-[#8d9cb8]">Emergency passes</small>
                  </div>
                </div>
              </div>

              {/* Allowed Apps Card */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                    Allowed apps · Default
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllowedAppsScreen(true)}
                    className="min-h-[36px] px-2 text-xs font-semibold touch-manipulation"
                    style={{ color: activeTheme.ringTo }}
                  >
                    Manage
                  </button>
                </div>
                {allowedAppsList.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {allowedAppsList.map((app) => (
                      <div key={app.name} className="flex items-center gap-1.5 rounded-xl bg-white/[0.05] px-2.5 py-1.5">
                        <span
                          className="grid h-5 w-5 place-items-center rounded-md text-[9px] font-bold text-white"
                          style={{ backgroundColor: app.color }}
                        >
                          {app.name.slice(0, 1)}
                        </span>
                        <span className="text-[11px] text-[#e2e8f5]">{app.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-[#8d9cb8]">
                    Choose which apps stay available during a session.
                  </p>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'rooms' ? (
            /* Rooms kept the same as requested */
            <motion.div
              key="rooms-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="flex flex-col gap-4 pb-2"
            >
              <div>
                <h3 className="font-display text-2xl font-bold text-[#f4f7fb]">Rooms</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#8d9cb8]">
                  Focus with friends. Create or join a room with a code and start a shared focus session together.
                </p>
              </div>

              <div
                className="rounded-3xl border p-5"
                style={{
                  borderColor: activeTheme.accentSoft,
                  backgroundColor: activeTheme.accentSoft,
                }}
              >
                <span className="text-[10px] font-semibold tracking-wider text-[#c4d0e6] uppercase">
                  Shared study room
                </span>
                <div className="mt-2 flex items-center justify-between">
                  <p className="font-mono text-3xl font-bold tracking-wider text-[#f4f7fb] tabular-nums">
                    482-910
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyRoomCode}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/15 bg-black/25 px-3.5 text-xs font-semibold text-[#f4f7fb] touch-manipulation"
                  >
                    {copiedRoomCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#34d399]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#c4d0e6]">
                  {joinedRoom
                    ? '3 people focusing · 45m session active'
                    : 'Share this code with friends to start together.'}
                </p>
                <button
                  type="button"
                  onClick={() => setJoinedRoom((prev) => !prev)}
                  className="mt-4 flex min-h-[46px] w-full items-center justify-center rounded-full text-sm font-bold touch-manipulation"
                  style={{
                    backgroundColor: activeTheme.accent,
                    color: buttonTextColor,
                  }}
                >
                  {joinedRoom ? 'Leave room preview' : 'Join room preview'}
                </button>
              </div>
            </motion.div>
          ) : activeTab === 'plan' ? (
            <motion.div
              key="plan-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="flex flex-col gap-3.5 pb-2"
            >
              <div>
                <h3 className="font-display text-2xl font-bold text-[#f4f7fb]">Study plan</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#8d9cb8]">
                  Set weekly study blocks. Each one starts by itself at its time.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddStudyBlock}
                className="flex min-h-[48px] w-full items-center justify-center rounded-full text-sm font-bold transition-transform active:scale-[0.98] touch-manipulation"
                style={{
                  background: `linear-gradient(90deg, ${activeTheme.accent}, ${activeTheme.ringTo})`,
                  color: buttonTextColor,
                }}
              >
                Add study block
              </button>

              {newBlockAddedToast && (
                <p className="text-center text-xs font-medium text-[#34d399]">
                  Study block added to your weekly schedule
                </p>
              )}

              <div className="flex flex-col gap-2.5">
                {studyBlocks.map((block) => (
                  <div
                    key={block.id}
                    className={`flex items-center justify-between rounded-2xl p-4 ${cardSurfaceClass}`}
                  >
                    <div>
                      <span
                        className="block font-mono text-[11px] font-semibold tabular-nums"
                        style={{ color: activeTheme.ringTo }}
                      >
                        {block.label}
                      </span>
                      <span className="mt-0.5 block text-sm font-semibold text-[#f4f7fb]">
                        {block.topic}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-[#9ba8bf] tabular-nums">
                      {block.duration} min
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : activeTab === 'dashboard' ? (
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="flex flex-col gap-3.5 pb-2"
            >
              {/* 01 Overview */}
              <div>
                <p className="font-mono text-3xl font-bold text-[#f4f7fb] tabular-nums">
                  {focusedMinutesToday} min
                </p>
                <p className="text-xs text-[#8d9cb8] tabular-nums">
                  {Math.min(100, Math.round((focusedMinutesToday / dailyGoalMins) * 100))}% of{' '}
                  {dailyGoalMins}m goal
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (focusedMinutesToday / dailyGoalMins) * 100)}%`,
                      backgroundColor: activeTheme.accent,
                    }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className={`rounded-2xl p-3.5 ${cardSurfaceClass}`}>
                    <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                      Day streak
                    </span>
                    <b className="mt-1 block font-display text-2xl text-[#f4f7fb] tabular-nums">
                      1
                    </b>
                    <small className="text-[11px] text-[#7c89a1]">days in a row</small>
                  </div>
                  <div className={`rounded-2xl p-3.5 ${cardSurfaceClass}`}>
                    <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                      Best streak
                    </span>
                    <b className="mt-1 block font-display text-2xl text-[#f4f7fb] tabular-nums">
                      1
                    </b>
                    <small className="text-[11px] text-[#7c89a1]">days</small>
                  </div>
                  <div className={`rounded-2xl p-3.5 ${cardSurfaceClass}`}>
                    <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                      Sessions
                    </span>
                    <b className="mt-1 block font-display text-2xl text-[#f4f7fb] tabular-nums">
                      {sessionsCompleted}
                    </b>
                    <small className="text-[11px] text-[#7c89a1]">completed</small>
                  </div>
                  <div className={`rounded-2xl p-3.5 ${cardSurfaceClass}`}>
                    <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                      Average
                    </span>
                    <b className="mt-1 block font-display text-2xl text-[#f4f7fb] tabular-nums">
                      {Math.max(2, Math.round(focusedMinutesToday / Math.max(1, sessionsCompleted)))}m
                    </b>
                    <small className="text-[11px] text-[#7c89a1]">per session</small>
                  </div>
                </div>
              </div>

              {/* 02 Rhythm */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                  02 Rhythm
                </span>
                <p className="mt-0.5 font-display text-lg font-bold text-[#f4f7fb]">Your week</p>
                <div className="mt-4 flex items-end justify-between gap-2.5 border-b border-white/10 pb-2">
                  {[10, 14, 8, 22, 16, 56, 18].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t"
                      style={{
                        height: `${h}px`,
                        backgroundColor: i === 5 ? activeTheme.accent : 'rgba(255,255,255,0.16)',
                      }}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-[#7c89a1]">
                  {['T', 'F', 'S', 'S', 'M', 'T', 'W'].map((d, i) => (
                    <span key={i} className={i === 6 ? 'font-bold text-[#f4f7fb]' : ''}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* 03 Consistency */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                  03 Consistency
                </span>
                <p className="mt-0.5 font-display text-lg font-bold text-[#f4f7fb]">Twelve weeks</p>
                <div className="mt-3 grid grid-cols-12 gap-1">
                  {Array.from({ length: HEATMAP_WEEKS * HEATMAP_DAYS }).map((_, i) => {
                    const isToday = i === HEATMAP_WEEKS * HEATMAP_DAYS - 1;
                    const level = i % 11 === 0 || i > 52 ? 0.85 : i % 5 === 0 ? 0.45 : 0.14;
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded-[4px] ${
                          isToday ? 'ring-1 ring-white' : ''
                        }`}
                        style={{
                          backgroundColor:
                            level > 0.2 ? activeTheme.accent : 'rgba(255,255,255,0.08)',
                          opacity: level,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#7c89a1]">
                  <span>Less → More</span>
                  <span>White outline = today</span>
                </div>
              </div>

              {/* 04 Focus Hours */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                  04 Focus hours
                </span>
                <p className="mt-0.5 font-display text-lg font-bold text-[#f4f7fb]">
                  When you focus best
                </p>
                <div className="mt-3 flex h-16 items-end gap-1 border-b border-white/10 pb-1">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div
                      key={h}
                      className="flex-1 rounded-t"
                      style={{
                        height: h === 16 ? '100%' : h === 17 ? '42%' : '4px',
                        backgroundColor:
                          h === 16 || h === 17 ? activeTheme.accent : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-[#8d9cb8]">
                  You focus most between 16:00 and 17:00.
                </p>
              </div>

              {/* 05 Subjects */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                  05 Subjects
                </span>
                <p className="mt-0.5 font-display text-lg font-bold text-[#f4f7fb]">
                  What you study
                </p>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <span className="text-[#f4f7fb]">01 {studyTopic || 'General study'}</span>
                  <span className="font-mono text-[#9ba8bf] tabular-nums">
                    {focusedMinutesToday}m
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full w-4/5 rounded-full"
                    style={{ backgroundColor: activeTheme.accent }}
                  />
                </div>
              </div>

              {/* 06 Rewards */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                  06 Rewards
                </span>
                <p className="mt-0.5 font-display text-lg font-bold text-[#f4f7fb]">
                  Emergency passes
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-[#f4f7fb] tabular-nums">
                  {emergencyPasses} / 5
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#8d9cb8]">
                  3 more completed sessions of 15+ minutes earns a pass. Stricter sessions count double.
                </p>
              </div>

              {/* 07 Log */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                  07 Log
                </span>
                <p className="mt-0.5 font-display text-lg font-bold text-[#f4f7fb]">
                  Recent sessions
                </p>
                <div className="mt-2.5 flex flex-col gap-2">
                  {recentSessions.map((item, idx) => (
                    <div
                      key={`${item.topic}-${idx}`}
                      className="flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="block font-medium text-[#f4f7fb]">{item.topic}</span>
                        <span className="text-[10px] text-[#7c89a1]">{item.date}</span>
                      </div>
                      <div className="text-right">
                        <span className="block font-mono font-semibold text-[#f4f7fb] tabular-nums">
                          {item.mins}m
                        </span>
                        <span
                          className="text-[10px]"
                          style={{
                            color: item.status === 'Completed' ? '#34d399' : '#f59e0b',
                          }}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            /* Settings Tab */
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="flex flex-col gap-3.5 pb-2"
            >
              <h3 className="font-display text-2xl font-bold text-[#f4f7fb]">Settings</h3>

              {/* Customisation */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                  Customisation
                </span>

                <div className="mt-3 space-y-3">
                  {themeGroups.map((group) => (
                    <div key={group}>
                      <p className="mb-1.5 text-[11px] font-medium text-[#9ba8bf]">{group}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {THEMES.filter((t) => t.group === group).map((t) => {
                          const selected = t.id === themeId;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setThemeId(t.id)}
                              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors touch-manipulation"
                              style={{
                                borderColor: selected ? t.accent : 'rgba(255,255,255,0.12)',
                                backgroundColor: selected
                                  ? t.accentSoft
                                  : 'rgba(255,255,255,0.03)',
                                color: selected ? '#f4f7fb' : '#9ba8bf',
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
                    </div>
                  ))}
                </div>

                <div className="mt-4 divide-y divide-white/10">
                  {[
                    {
                      label: 'Glass effect',
                      desc: 'Frosted translucent cards over a softly moving colour background.',
                      value: glassEffect,
                      toggle: () => setGlassEffect(!glassEffect),
                    },
                    {
                      label: 'Vibrant colour',
                      desc: 'Stronger colour glow, tinted cards and two-colour gradients.',
                      value: vibrantColour,
                      toggle: () => setVibrantColour(!vibrantColour),
                    },
                    {
                      label: 'Motivational quotes',
                      desc: 'Show a short line on Home that changes with the time of day.',
                      value: showQuotes,
                      toggle: () => setShowQuotes(!showQuotes),
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.toggle}
                      className="flex min-h-[54px] w-full items-center justify-between gap-3 py-2.5 text-left touch-manipulation"
                    >
                      <div>
                        <span className="block text-xs font-semibold text-[#f4f7fb]">
                          {item.label}
                        </span>
                        <span className="block text-[10px] leading-snug text-[#8d9cb8]">
                          {item.desc}
                        </span>
                      </div>
                      <span
                        aria-hidden="true"
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                          item.value ? 'bg-[#22c55e]' : 'bg-white/15'
                        }`}
                      >
                        <span
                          className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            item.value ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                  Focus
                </span>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#f4f7fb]">Default session length</span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      aria-label="Decrease default length"
                      onClick={() => handleDurationChange(durationMins - 5)}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/[0.05] text-[#f4f7fb] touch-manipulation"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-xs font-semibold text-[#f4f7fb] tabular-nums">
                      {durationMins} min
                    </span>
                    <button
                      type="button"
                      aria-label="Increase default length"
                      onClick={() => handleDurationChange(durationMins + 5)}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/[0.05] text-[#f4f7fb] touch-manipulation"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#f4f7fb]">Daily goal</span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      aria-label="Decrease daily goal"
                      onClick={() => setDailyGoalMins((g) => Math.max(5, g - 5))}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/[0.05] text-[#f4f7fb] touch-manipulation"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-xs font-semibold text-[#f4f7fb] tabular-nums">
                      {dailyGoalMins}m
                    </span>
                    <button
                      type="button"
                      aria-label="Increase daily goal"
                      onClick={() => setDailyGoalMins((g) => Math.min(180, g + 5))}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/[0.05] text-[#f4f7fb] touch-manipulation"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Allowed Apps */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                  Allowed apps
                </span>
                <p className="mt-1 text-xs text-[#c4d0e6] tabular-nums">
                  {allowedCount} apps allowed in Default
                </p>
                <button
                  type="button"
                  onClick={() => setShowAllowedAppsScreen(true)}
                  className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-xs font-semibold text-[#f4f7fb] touch-manipulation"
                >
                  Manage groups and apps
                </button>
              </div>

              {/* App Lock */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                  App lock
                </span>
                <div className="mt-1 divide-y divide-white/10">
                  {[
                    {
                      label: 'Stricter mode',
                      value: stricterMode,
                      toggle: () => setStricterMode(!stricterMode),
                    },
                    {
                      label: 'Block Settings in normal sessions too',
                      value: blockSettingsNormal,
                      toggle: () => setBlockSettingsNormal((v) => !v),
                    },
                    {
                      label: 'Require typing EXIT',
                      value: requireTypingExit,
                      toggle: () => setRequireTypingExit((v) => !v),
                    },
                    {
                      label: 'Uninstall protection',
                      value: uninstallProtection,
                      toggle: () => setUninstallProtection((v) => !v),
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.toggle}
                      className="flex min-h-[48px] w-full items-center justify-between gap-2 py-2 text-left touch-manipulation"
                    >
                      <span className="text-xs font-medium text-[#f4f7fb]">{item.label}</span>
                      <span
                        aria-hidden="true"
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                          item.value ? 'bg-[#22c55e]' : 'bg-white/15'
                        }`}
                      >
                        <span
                          className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            item.value ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy & Terms */}
              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                  Privacy &amp; Terms
                </span>
                <p className="mt-1.5 text-xs leading-relaxed text-[#c4d0e6]">
                  We never sell your data. Not now, not ever. Your history and settings stay on this phone.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLegalModal('privacy')}
                    className="min-h-[42px] rounded-full border border-white/15 bg-white/[0.06] text-xs font-semibold text-[#f4f7fb] touch-manipulation"
                  >
                    Privacy
                  </button>
                  <button
                    type="button"
                    onClick={() => setLegalModal('terms')}
                    className="min-h-[42px] rounded-full border border-white/15 bg-white/[0.06] text-xs font-semibold text-[#f4f7fb] touch-manipulation"
                  >
                    Terms
                  </button>
                </div>
              </div>

              <div className={`rounded-3xl p-4 ${cardSurfaceClass}`}>
                <span className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                  General
                </span>
                <p className="mt-1 text-xs font-semibold text-[#f4f7fb]">Evolve 2.5.0</p>
                <p className="mt-1 text-[11px] text-[#8d9cb8]">
                  Everything is stored on this device only.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Android Bottom Tab Bar (5 tabs) */}
      <div
        role="tablist"
        aria-label="Evolve app navigation"
        className={`grid shrink-0 grid-cols-5 border-t border-white/10 bg-[#080a10]/95 px-1.5 pt-1.5 backdrop-blur-md ${
          isFullScreen ? 'pb-[max(0.5rem,env(safe-area-inset-bottom))]' : 'pb-2'
        }`}
      >
        {(
          [
            { id: 'home', label: 'Home', icon: Home },
            { id: 'rooms', label: 'Rooms', icon: Users },
            { id: 'plan', label: 'Plan', icon: CalendarClock },
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'settings', label: 'Settings', icon: Settings },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id && !showAllowedAppsScreen;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => {
                setShowAllowedAppsScreen(false);
                setActiveTab(tab.id);
              }}
              className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors touch-manipulation"
              style={{
                backgroundColor: active ? activeTheme.accentSoft : 'transparent',
                color: active ? activeTheme.ringTo : '#7c89a1',
              }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Blocked App Overlay */}
      <AnimatePresence>
        {showBlockedPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-5 backdrop-blur-md"
          >
            <div className="w-full max-w-[320px] rounded-3xl border border-white/15 bg-[#121620] p-6 text-center shadow-2xl">
              <p className="text-[10px] font-semibold tracking-widest text-[#8d9cb8] uppercase">
                Blocked during focus
              </p>
              <h4 className="mt-1 font-display text-xl font-bold text-[#f4f7fb]">File Manager</h4>
              <p className="mt-1.5 text-xs text-[#9ba8bf]">
                You&apos;ve used File Manager for under a minute today.
              </p>
              <p
                className="mt-4 font-mono text-5xl font-bold tabular-nums"
                style={{ color: activeTheme.ringTo }}
              >
                {blockedCountdown}
              </p>
              <p className="mt-1 text-[11px] text-[#8d9cb8] tabular-nums">
                Returning to Evolve in {blockedCountdown} s
              </p>
              <button
                type="button"
                onClick={() => setShowBlockedPopup(false)}
                className="mt-5 flex min-h-[46px] w-full items-center justify-center rounded-full text-xs font-bold touch-manipulation"
                style={{
                  backgroundColor: activeTheme.accent,
                  color: buttonTextColor,
                }}
              >
                Back to Evolve now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emergency Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"
          >
            <div className="w-full max-w-[320px] rounded-3xl border border-white/15 bg-[#121722] p-5 shadow-2xl">
              <h4 className="font-display text-lg font-bold text-[#f4f7fb]">End session early?</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-[#9ba8bf]">
                All apps unlock immediately and this session is saved as ended early.
              </p>
              <p className="mt-2 text-xs font-medium text-amber-300 tabular-nums">
                {exitWaitSeconds > 0
                  ? `Please wait ${exitWaitSeconds} s to confirm.`
                  : 'Wait complete. Confirm below to end session.'}
              </p>

              {requireTypingExit && (
                <div className="mt-3">
                  <label className="block text-[11px] font-medium text-[#8d9cb8]">
                    Type EXIT to confirm
                  </label>
                  <input
                    type="text"
                    value={exitInput}
                    onChange={(e) => setExitInput(e.target.value)}
                    placeholder="EXIT"
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-rose-400/50 bg-black/35 px-3 font-mono text-xs text-[#f4f7fb] focus:outline-none"
                  />
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="min-h-[42px] px-3 text-xs font-semibold text-[#f4f7fb] touch-manipulation"
                >
                  Keep focusing
                </button>
                <button
                  type="button"
                  disabled={!canConfirmExit}
                  onClick={confirmEmergencyExit}
                  className="min-h-[42px] rounded-full bg-rose-500/20 px-4 text-xs font-semibold text-rose-200 transition-opacity disabled:opacity-40 touch-manipulation"
                >
                  End session
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy / Terms Modal */}
      <AnimatePresence>
        {legalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <div className="max-h-[85%] w-full max-w-[330px] overflow-y-auto rounded-3xl border border-white/15 bg-[#121722] p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-display text-lg font-bold text-[#f4f7fb]">
                  {legalModal === 'privacy' ? 'Your privacy comes first' : 'Terms & Conditions'}
                </h4>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setLegalModal(null)}
                  className="grid h-9 w-9 place-items-center rounded-full text-[#9ba8bf] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {legalModal === 'privacy' ? (
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[#c4d0e6]">
                  <li>• We never sell your data. Not now, not ever.</li>
                  <li>
                    • Your focus history, settings, app groups and timetable are stored only on this
                    phone.
                  </li>
                  <li>• Evolve has no ads, no analytics and no accounts.</li>
                  <li>
                    • Only exception: if you use Rooms, your nickname and focus status are shared with
                    that room until it ends.
                  </li>
                </ul>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-[#c4d0e6]">
                  Evolve is a personal focus tool that helps you block distracting apps during
                  study sessions that you start yourself. Stricter mode limits pausing and leaving
                  a session early.
                </p>
              )}
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="mt-4 flex min-h-[42px] w-full items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-[#f4f7fb] touch-manipulation"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
