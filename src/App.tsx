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
import { DownloadSection } from './components/DownloadSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { MobileInstallBar } from './components/MobileInstallBar';
import { FullScreenDemoPage } from './components/FullScreenDemoPage';
import { LegalModal, LegalTab } from './components/LegalModal';
import { CookieConsent } from './components/CookieConsent';
import { DemoTab, ThemeId } from './components/focusDemoTypes';
import {
  CookiePreferences,
  readCookieConsent,
  readDemoUiPrefs,
  writeCookieConsent,
  writeDemoUiPrefs,
} from './utils/cookieConsent';

export default function App() {
  const initialStoredUi = readDemoUiPrefs();

  // Shared FocusOS Simulator State (persists seamlessly between inline and 1:1 full-screen page)
  const [activeTab, setActiveTab] = useState<DemoTab>('home');
  const [themeId, setThemeId] = useState<ThemeId>(initialStoredUi?.themeId ?? 'ios-blue');
  const [glassEffect, setGlassEffect] = useState<boolean>(initialStoredUi?.glassEffect ?? true);
  const [vibrantColour, setVibrantColour] = useState<boolean>(
    initialStoredUi?.vibrantColour ?? true,
  );
  const [showQuotes, setShowQuotes] = useState<boolean>(initialStoredUi?.showQuotes ?? true);
  const [stricterMode, setStricterMode] = useState<boolean>(
    initialStoredUi?.stricterMode ?? false,
  );
  const [showAllowedAppsScreen, setShowAllowedAppsScreen] = useState(false);
  const [simLegalModal, setSimLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [blockedPopupTrigger, setBlockedPopupTrigger] = useState(0);

  // Separate full-screen Demo Page, Legal Modal & Cookie Consent state
  const [isFullScreenDemo, setIsFullScreenDemo] = useState(false);
  const [siteLegalTab, setSiteLegalTab] = useState<LegalTab | null>(null);
  const [cookieConsent, setCookieConsent] = useState<CookiePreferences | null>(() =>
    readCookieConsent(),
  );
  const [cookieModalOpen, setCookieModalOpen] = useState(false);

  const showCookieBanner = cookieConsent === null && !isFullScreenDemo;

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

  // Persist optional demo UI preferences only when permitted
  useEffect(() => {
    if (!cookieConsent?.uiPreferences) return;
    writeDemoUiPrefs({
      themeId,
      glassEffect,
      vibrantColour,
      showQuotes,
      stricterMode,
    });
  }, [cookieConsent?.uiPreferences, themeId, glassEffect, vibrantColour, showQuotes, stricterMode]);

  const handleSaveCookiePrefs = (uiPreferences: boolean) => {
    const updated = writeCookieConsent(uiPreferences);
    setCookieConsent(updated);
    setCookieModalOpen(false);
    if (uiPreferences) {
      writeDemoUiPrefs({
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

  // Sync with Android hardware/gesture Back button & initial #demo-app hash
  useEffect(() => {
    if (window.location.hash === '#demo-app') {
      setIsFullScreenDemo(true);
    }

    const onPopState = () => {
      setIsFullScreenDemo(window.location.hash === '#demo-app');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#070a10] text-[#f4f7fb]">
        <a
          href="#top"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#3b82f6] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white focus:outline-none"
        >
          Skip to main content
        </a>

        <Navbar onDemoClick={openFullScreenDemo} />
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
          <DownloadSection />
          <FaqSection />
        </main>
        <Footer
          onOpenLegal={(tab) => setSiteLegalTab(tab)}
          onOpenCookiePreferences={() => setCookieModalOpen(true)}
          onDemoClick={openFullScreenDemo}
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
