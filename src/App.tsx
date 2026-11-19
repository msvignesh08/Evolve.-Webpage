/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { FeaturesBento } from './components/FeaturesBento';
import { InteractiveDemoSection } from './components/InteractiveDemoSection';
import { HowItWorks } from './components/HowItWorks';
import { ProgressSection } from './components/ProgressSection';
import { FocusShieldShowcase } from './components/FocusShieldShowcase';
import { DownloadSection } from './components/DownloadSection';
import { UpcomingReleaseSection } from './components/UpcomingReleaseSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { MobileInstallBar } from './components/MobileInstallBar';
import { FullScreenDemoPage } from './components/FullScreenDemoPage';
import { AdminGiftPage } from './components/AdminGiftPage';
import { LegalModal, LegalTab } from './components/LegalModal';
import { CookieConsent } from './components/CookieConsent';
import { DemoTab, ThemeId } from './components/focusDemoTypes';
import {
  CookiePreferences,
  hasStoredCookieConsentSync,
  readCookieConsentAsync,
  readDemoUiPrefsAsync,
  writeCookieConsentAsync,
  writeDemoUiPrefsAsync,
} from './utils/cookieConsent';
import {
  DEFAULT_SITE_THEME,
  SiteThemeId,
  getSiteThemeMeta,
  isValidSiteThemeId,
} from './utils/siteThemes';

export default function App() {
  // Website Theme ('signature' | 'dark' | 'phantom' | 'emerald')
  const [siteTheme, setSiteTheme] = useState<SiteThemeId>(DEFAULT_SITE_THEME);

  // Shared FocusOS Simulator State (persists seamlessly between inline and 1:1 full-screen page)
  const [activeTab, setActiveTab] = useState<DemoTab>('home');
  const [themeId, setThemeId] = useState<ThemeId>('ios-blue');
  const [glassEffect, setGlassEffect] = useState<boolean>(true);
  const [vibrantColour, setVibrantColour] = useState<boolean>(true);
  const [showQuotes, setShowQuotes] = useState<boolean>(true);
  const [stricterMode, setStricterMode] = useState<boolean>(false);
  const [showAllowedAppsScreen, setShowAllowedAppsScreen] = useState(false);
  const [simLegalModal, setSimLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [blockedPopupTrigger, setBlockedPopupTrigger] = useState(0);

  // Separate full-screen Demo Page, Developer Admin Console, Legal Modal & Cookie Consent state
  const [isFullScreenDemo, setIsFullScreenDemo] = useState(false);
  const [isAdminView, setIsAdminView] = useState<boolean>(
    () => typeof window !== 'undefined' && window.location.hash === '#admin',
  );
  const [siteLegalTab, setSiteLegalTab] = useState<LegalTab | null>(null);
  const [hasPriorConsent, setHasPriorConsent] = useState<boolean>(() =>
    hasStoredCookieConsentSync(),
  );
  const [cookieConsent, setCookieConsent] = useState<CookiePreferences | null>(null);
  const [cookieModalOpen, setCookieModalOpen] = useState(false);
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  const showCookieBanner =
    !hasPriorConsent && cookieConsent === null && !isFullScreenDemo && !isAdminView;

  // Hydrate encrypted local preferences on mount
  useEffect(() => {
    let active = true;
    (async () => {
      const [consent, storedUi] = await Promise.all([
        readCookieConsentAsync(),
        readDemoUiPrefsAsync(),
      ]);
      if (!active) return;
      if (consent) {
        setCookieConsent(consent);
        setHasPriorConsent(true);
      } else {
        setHasPriorConsent(false);
      }
      if (storedUi) {
        if (isValidSiteThemeId(storedUi.siteTheme)) setSiteTheme(storedUi.siteTheme);
        if (storedUi.themeId) setThemeId(storedUi.themeId);
        if (typeof storedUi.glassEffect === 'boolean') setGlassEffect(storedUi.glassEffect);
        if (typeof storedUi.vibrantColour === 'boolean') setVibrantColour(storedUi.vibrantColour);
        if (typeof storedUi.showQuotes === 'boolean') setShowQuotes(storedUi.showQuotes);
        if (typeof storedUi.stricterMode === 'boolean') setStricterMode(storedUi.stricterMode);
      }
      setPrefsHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Apply selected site theme to <html> & mobile browser address bar theme-color
  useEffect(() => {
    document.documentElement.dataset.siteTheme = siteTheme;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) {
      meta.content = getSiteThemeMeta(siteTheme).themeColor;
    }
  }, [siteTheme]);

  // Client-side anti-copy & casual source-inspection deterrents
  useEffect(() => {
    const isSelectableTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(target.closest('.allow-select, input, textarea, select'));

    const onContextMenu = (e: MouseEvent) => {
      if (!isSelectableTarget(e.target)) {
        e.preventDefault();
      }
    };

    const onCopyOrCut = (e: ClipboardEvent) => {
      if (!isSelectableTarget(e.target)) {
        e.preventDefault();
      }
    };

    const onDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }

      if (ctrlOrCmd && e.shiftKey && (key === 'i' || key === 'j' || key === 'c' || key === 'k')) {
        e.preventDefault();
        return;
      }

      if (e.metaKey && e.altKey && (key === 'i' || key === 'j' || key === 'c' || key === 'u')) {
        e.preventDefault();
        return;
      }

      if (ctrlOrCmd && (key === 'u' || key === 's')) {
        e.preventDefault();
        return;
      }

      if (ctrlOrCmd && key === 'c' && !isSelectableTarget(e.target)) {
        const selection = window.getSelection()?.toString() || '';
        if (!selection || !isSelectableTarget(window.getSelection()?.anchorNode?.parentElement ?? null)) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('copy', onCopyOrCut, true);
    document.addEventListener('cut', onCopyOrCut, true);
    document.addEventListener('dragstart', onDragStart, true);
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('copy', onCopyOrCut, true);
      document.removeEventListener('cut', onCopyOrCut, true);
      document.removeEventListener('dragstart', onDragStart, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);

  // Dynamic canonical & OpenGraph URL resolution
  useEffect(() => {
    const canonicalUrl = window.location.origin + window.location.pathname;
    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    let ogUrlMeta = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!ogUrlMeta) {
      ogUrlMeta = document.createElement('meta');
      ogUrlMeta.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrlMeta);
    }
    ogUrlMeta.content = canonicalUrl;
  }, []);

  // Persist optional site & demo UI preferences only when permitted (encrypted via AES-GCM)
  useEffect(() => {
    if (!prefsHydrated || !cookieConsent?.uiPreferences) return;
    void writeDemoUiPrefsAsync({
      siteTheme,
      themeId,
      glassEffect,
      vibrantColour,
      showQuotes,
      stricterMode,
    });
  }, [
    prefsHydrated,
    cookieConsent?.uiPreferences,
    siteTheme,
    themeId,
    glassEffect,
    vibrantColour,
    showQuotes,
    stricterMode,
  ]);

  const handleSaveCookiePrefs = async (uiPreferences: boolean) => {
    const updated = await writeCookieConsentAsync(uiPreferences);
    setCookieConsent(updated);
    setHasPriorConsent(true);
    setCookieModalOpen(false);
    if (uiPreferences) {
      await writeDemoUiPrefsAsync({
        siteTheme,
        themeId,
        glassEffect,
        vibrantColour,
        showQuotes,
        stricterMode,
      });
    }
  };

  const openFullScreenDemo = () => {
    setIsFullScreenDemo(true);
    if (window.location.hash !== '#demo-app') {
      window.history.pushState({ demoApp: true }, '', '#demo-app');
    }
  };

  const closeFullScreenDemo = () => {
    setIsFullScreenDemo(false);
    if (window.location.hash === '#demo-app') {
      window.history.back();
    }
  };

  const jumpToDownloadFromDemo = () => {
    setIsFullScreenDemo(false);
    if (window.location.hash === '#demo-app') {
      window.history.replaceState(null, '', '#download');
    }
    window.setTimeout(() => {
      document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const openAdminView = () => {
    setIsFullScreenDemo(false);
    setIsAdminView(true);
    if (window.location.hash !== '#admin') {
      window.history.pushState({ adminView: true }, '', '#admin');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const closeAdminView = () => {
    setIsAdminView(false);
    if (window.location.hash === '#admin') {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  // Sync with Android hardware/gesture Back button & initial #demo-app / #admin hash
  useEffect(() => {
    const syncFromHash = () => {
      const h = window.location.hash;
      setIsFullScreenDemo(h === '#demo-app');
      setIsAdminView(h === '#admin');
    };

    syncFromHash();
    window.addEventListener('popstate', syncFromHash);
    window.addEventListener('hashchange', syncFromHash);
    return () => {
      window.removeEventListener('popstate', syncFromHash);
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, []);

  // Lock background page scroll while modal or separate full-screen demo is open
  useEffect(() => {
    if (isFullScreenDemo || siteLegalTab || cookieModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullScreenDemo, siteLegalTab, cookieModalOpen]);

  const simulatorProps = {
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
    legalModal: simLegalModal,
    setLegalModal: setSimLegalModal,
    blockedPopupTrigger,
  };

  if (isAdminView) {
    return (
      <MotionConfig reducedMotion="user">
        <AdminGiftPage
          onBack={closeAdminView}
          siteTheme={siteTheme}
          onChangeSiteTheme={setSiteTheme}
        />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="site-bg site-theme-scope min-h-screen text-[#f4f7fb]">
        <a
          href="#top"
          className="site-primary-btn sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:outline-none"
        >
          Skip to main content
        </a>

        <Navbar
          onDemoClick={openFullScreenDemo}
          siteTheme={siteTheme}
          onChangeSiteTheme={setSiteTheme}
        />
        <main id="top">
          <Hero onOpenDemo={openFullScreenDemo} />
          <FeaturesBento />
          <InteractiveDemoSection
            {...simulatorProps}
            onOpenFullScreen={openFullScreenDemo}
            onTriggerBlockedPopup={() => setBlockedPopupTrigger((n) => n + 1)}
          />
          <HowItWorks />
          <ProgressSection />
          <FocusShieldShowcase />
          <DownloadSection />
          <UpcomingReleaseSection />
          <FaqSection />
        </main>
        <Footer
          onOpenLegal={(tab) => setSiteLegalTab(tab)}
          onOpenCookiePreferences={() => setCookieModalOpen(true)}
          onDemoClick={openFullScreenDemo}
          onOpenAdmin={openAdminView}
          siteTheme={siteTheme}
          onChangeSiteTheme={setSiteTheme}
        />

        {!isFullScreenDemo && !showCookieBanner && !cookieModalOpen && <MobileInstallBar />}

        {isFullScreenDemo && (
          <FullScreenDemoPage
            {...simulatorProps}
            onClose={closeFullScreenDemo}
            onJumpToDownload={jumpToDownloadFromDemo}
          />
        )}

        <LegalModal
          openTab={siteLegalTab}
          onTabChange={(tab) => setSiteLegalTab(tab)}
          onClose={() => setSiteLegalTab(null)}
          onOpenCookiePreferences={() => setCookieModalOpen(true)}
        />

        <CookieConsent
          showBanner={showCookieBanner}
          isModalOpen={cookieModalOpen}
          uiPreferencesEnabled={cookieConsent?.uiPreferences ?? false}
          onAcceptOptional={() => handleSaveCookiePrefs(true)}
          onEssentialOnly={() => handleSaveCookiePrefs(false)}
          onSavePreferences={handleSaveCookiePrefs}
          onOpenModal={() => setCookieModalOpen(true)}
          onCloseModal={() => setCookieModalOpen(false)}
          onOpenCookiePolicy={() => setSiteLegalTab('cookies')}
        />
      </div>
    </MotionConfig>
  );
}
