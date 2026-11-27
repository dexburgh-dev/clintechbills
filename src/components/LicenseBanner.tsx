'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  KeyRound,
  Sparkles,
  X,
} from 'lucide-react';
import type { LicenseEntitlementState } from '@/hooks/useLicenseEntitlement';

interface LicenseBannerProps {
  entitlement: LicenseEntitlementState;
}

export function LicenseBanner({ entitlement }: LicenseBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [pillDismissed, setPillDismissed] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [activating, setActivating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(
    null
  );
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const isStarter =
    !entitlement.license ||
    entitlement.license.license_key === 'MB-CTB-STARTER-FREE' ||
    entitlement.effectiveMonthlyLimit !== null;

  // Auto-open compact floating subscription card once right after new account signup (still closeable anytime)
  useEffect(() => {
    if (entitlement.loading) return;
    if (typeof window === 'undefined') return;

    const justSignedUp = sessionStorage.getItem('clintechbills_new_signup_prompt');
    if (justSignedUp === '1' && isStarter) {
      sessionStorage.removeItem('clintechbills_new_signup_prompt');
      setModalOpen(true);
    }
  }, [entitlement.loading, isStarter]);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setActivating(true);
    setFeedback(null);

    const res = await entitlement.activateLicenseKey(keyInput);
    setActivating(false);

    if (!res.ok) {
      setFeedback({ type: 'err', msg: res.error || 'Invalid licence key.' });
    } else {
      setFeedback({ type: 'ok', msg: 'Licence activated.' });
      setKeyInput('');
      setTimeout(() => {
        setModalOpen(false);
        setFeedback(null);
      }, 800);
    }
  }

  async function handleCheckout(planTier: 'PRO_PAID' | 'GROUP_PAID') {
    setCheckoutLoading(planTier);
    try {
      const res = await fetch('/api/payfast/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier,
          practiceName:
            entitlement.license?.practice_name || 'Clinical Technology (075)',
          contactEmail: entitlement.license?.contact_email || '',
          licenseKey: entitlement.activeKey,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.checkoutUrl) {
        setFeedback({
          type: 'err',
          msg: json.error || 'Could not start PayFast checkout.',
        });
        return;
      }
      window.location.href = json.checkoutUrl;
    } finally {
      setCheckoutLoading(null);
    }
  }

  if (entitlement.loading) return null;

  return (
    <>
      {/* Discreet Floating Bottom-Right Pill (Dismissible with X, never crowds header) */}
      {!pillDismissed && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-[#2C3545] bg-[#11151C]/95 pl-3.5 pr-2 py-1.5 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 text-left"
          >
            <span className="h-2 w-2 rounded-full bg-[#00D2C6]" />
            <span className="font-mono text-[11px] font-bold text-white">
              {isStarter
                ? `Starter (${entitlement.casesUsedThisMonth}/${entitlement.effectiveMonthlyLimit ?? 15})`
                : entitlement.license?.plan_tier}
            </span>
            <span className="rounded-full bg-[#00D2C6]/15 border border-[#00D2C6]/35 px-2 py-0.5 font-mono text-[10px] font-bold text-[#00D2C6] hover:bg-[#00D2C6] hover:text-[#08080B] transition">
              {isStarter ? 'Upgrade / Key' : 'Licence'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPillDismissed(true)}
            aria-label="Hide plan pill"
            className="rounded-full p-1 text-[#6A7689] hover:bg-[#1B212B] hover:text-white transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Closeable Floating Subscription & Key Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#2C3545] bg-[#14181F] p-5 sm:p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-[#232B38] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#00D2C6]" />
                <h3 className="font-[family-name:var(--font-montserrat)] text-sm sm:text-base font-bold text-white">
                  Plan &amp; Medical Bureau Key
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close subscription dialog"
                className="rounded-lg p-1.5 text-[#8B98AB] hover:bg-[#1B212B] hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Enter Bureau or Pro Key */}
            <form onSubmit={handleActivate} className="space-y-2.5">
              <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#8B98AB]">
                <KeyRound className="h-3.5 w-3.5 text-[#00D2C6]" />
                <span>Have a Bureau or Pro Key? Activate Here</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                  placeholder="MB-CTB-XXXX-XXXX"
                  className="flex-1 h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 font-mono text-xs uppercase tracking-wider text-white placeholder-[#4E5B6E] focus:border-[#00D2C6] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={activating || !keyInput.trim()}
                  className="rounded-xl bg-[#00D2C6] px-4 text-xs font-extrabold text-[#08080B] hover:bg-[#00E5D8] disabled:opacity-50"
                >
                  {activating ? 'Linking...' : 'Activate'}
                </button>
              </div>
              {feedback && (
                <p
                  className={`text-xs ${
                    feedback.type === 'ok' ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {feedback.msg}
                </p>
              )}
            </form>

            {/* Optional Subscription Plans */}
            <div className="border-t border-[#232B38] pt-4 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#8B98AB]">
                Or Upgrade for Unlimited Captures (Optional)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#232B38] bg-[#0E1218] p-3.5 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="text-xs font-bold text-white">Pro Practitioner</p>
                    <p className="mt-0.5 font-mono text-sm font-extrabold text-[#00D2C6]">
                      R495 / mo
                    </p>
                    <p className="mt-1 text-[11px] text-[#8B98AB]">
                      Unlimited cases + AI Sticker OCR
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={checkoutLoading !== null}
                    onClick={() => handleCheckout('PRO_PAID')}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00D2C6]/15 hover:bg-[#00D2C6] border border-[#00D2C6]/40 py-2 text-[11px] font-extrabold text-[#00D2C6] hover:text-[#08080B] transition disabled:opacity-50"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>
                      {checkoutLoading === 'PRO_PAID' ? 'Connecting...' : 'Subscribe'}
                    </span>
                  </button>
                </div>

                <div className="rounded-xl border border-[#232B38] bg-[#0E1218] p-3.5 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="text-xs font-bold text-white">Practice Group</p>
                    <p className="mt-0.5 font-mono text-sm font-extrabold text-[#00D2C6]">
                      R1,195 / mo
                    </p>
                    <p className="mt-1 text-[11px] text-[#8B98AB]">
                      Up to 5 ClinTech seats + shared queue
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={checkoutLoading !== null}
                    onClick={() => handleCheckout('GROUP_PAID')}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00D2C6]/15 hover:bg-[#00D2C6] border border-[#00D2C6]/40 py-2 text-[11px] font-extrabold text-[#00D2C6] hover:text-[#08080B] transition disabled:opacity-50"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>
                      {checkoutLoading === 'GROUP_PAID' ? 'Connecting...' : 'Subscribe'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dismiss / Continue on Free Starter */}
            <div className="border-t border-[#232B38] pt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#8B98AB]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00D2C6]" />
                Starter includes 15 free cases/month
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-[#2C3545] bg-[#1B212B] px-3.5 py-1.5 text-xs font-semibold text-white hover:border-[#00D2C6] transition"
              >
                Continue Free →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
