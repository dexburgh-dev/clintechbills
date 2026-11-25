'use client';

import React, { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Register POPIA-safe service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Check if already installed in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setDismissed(true);
      return;
    }

    if (sessionStorage.getItem('clintech_pwa_dismissed') === '1') {
      setDismissed(true);
      return;
    }

    // Android / Desktop Chromium install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detect iOS Safari (which does not fire beforeinstallprompt)
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) {
      setShowIosGuide(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem('clintech_pwa_dismissed', '1');
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  }

  if (dismissed || (!deferredPrompt && !showIosGuide)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-xl mx-auto">
      <div className="p-4 rounded-2xl bg-[#14181F]/95 backdrop-blur-md border border-[#00D2C6]/50 shadow-2xl shadow-black/70 flex items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#00D2C6]/15 border border-[#00D2C6]/35 flex items-center justify-center text-[#00D2C6] shrink-0 mt-0.5">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">
              Install ClinTechBills on Your Phone
            </p>
            {deferredPrompt ? (
              <p className="text-[11px] text-[#8B98AB] mt-0.5">
                Launch straight from your home screen in theatre with full-screen camera
                capture.
              </p>
            ) : (
              <p className="text-[11px] text-[#C5D0DF] mt-0.5 leading-relaxed">
                Tap <Share className="w-3 h-3 inline text-[#00D2C6] mx-0.5" />{' '}
                <strong>Share</strong> in Safari, then choose{' '}
                <strong>Add to Home Screen</strong>.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {deferredPrompt && (
            <button
              type="button"
              onClick={handleAndroidInstall}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00D2C6] hover:bg-[#00E5D8] text-[#090B0E] font-extrabold text-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-[#8B98AB] hover:text-white"
            aria-label="Dismiss install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}