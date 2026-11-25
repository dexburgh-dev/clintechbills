'use client';

import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { LicenseEntitlementState } from '@/hooks/useLicenseEntitlement';
import { PLAN_PRESETS } from '@/lib/licensing';

export function LicenseBanner({
  entitlement,
}: {
  entitlement: LicenseEntitlementState;
}) {
  const [openModal, setOpenModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'err';
    msg: string;
  } | null>(null);

  const {
    license,
    casesUsedThisMonth,
    effectiveMonthlyLimit,
    canSubmitCase,
    blockReason,
  } = entitlement;

  const preset = license
    ? PLAN_PRESETS[license.plan_tier]
    : PLAN_PRESETS.FREE_STARTER;

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    const res = await entitlement.activateLicenseKey(keyInput);
    setSubmitting(false);
    if (res.ok) {
      setFeedback({
        type: 'ok',
        msg: 'Licence activated! Unlimited/updated tier applied.',
      });
      setKeyInput('');
      setTimeout(() => {
        setOpenModal(false);
        setFeedback(null);
      }, 1100);
    } else {
      setFeedback({
        type: 'err',
        msg: res.error || 'Invalid licence key.',
      });
    }
  }

  return (
    <>
      <div
        className={`rounded-2xl border px-4 py-3 text-xs transition-colors ${
          !canSubmitCase
            ? 'border-rose-500/50 bg-rose-950/30 text-rose-200'
            : 'border-[#232B38] bg-[#14181F] text-[#C5D0DF]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            {canSubmitCase ? (
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#00D2C6]" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-white">
                {license?.practice_name || 'Starter Practice'}
              </span>
              <span
                className={`inline-block rounded border px-2 py-0.5 text-[10px] font-mono font-semibold ${preset.badgeColor}`}
              >
                {preset.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[#8B98AB]">
              {entitlement.loading
                ? 'Checking licence...'
                : effectiveMonthlyLimit === null
                ? `${casesUsedThisMonth} cases (Unlimited)`
                : `${casesUsedThisMonth} / ${effectiveMonthlyLimit} cases this month`}
            </span>

            <button
              type="button"
              onClick={() => setOpenModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#00D2C6]/40 bg-[#00D2C6]/10 px-2.5 py-1 text-[11px] font-bold text-[#00D2C6] hover:bg-[#00D2C6]/20 transition"
            >
              <KeyRound className="h-3 w-3" />
              {license?.plan_tier === 'FREE_STARTER'
                ? 'Activate Key'
                : 'Switch Key'}
            </button>
          </div>
        </div>

        {!canSubmitCase && blockReason && (
          <p className="mt-2.5 border-t border-rose-500/30 pt-2 text-[11px] text-rose-300">
            {blockReason}
          </p>
        )}
      </div>

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#2C3545] bg-[#14181F] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#232B38] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#00D2C6]" />
                <h3 className="font-[family-name:var(--font-montserrat)] text-sm font-bold text-white">
                  Activate MediBurgh Licence
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="rounded-lg p-1 text-[#8B98AB] hover:bg-[#1B212B] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleActivate} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8B98AB]">
                  Enter Licence Key
                </label>
                <input
                  type="text"
                  placeholder="MB-CTB-XXXX-XXXX"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full h-11 rounded-xl border border-[#232B38] bg-[#0E1218] px-3.5 font-mono text-sm uppercase tracking-wider text-white placeholder-[#4E5B6E] focus:border-[#00D2C6] focus:outline-none"
                  required
                />
                <p className="mt-1.5 text-[11px] text-[#8B98AB]">
                  Current key:{' '}
                  <span className="font-mono text-[#00D2C6]">
                    {entitlement.activeKey}
                  </span>
                </p>
              </div>

              {feedback && (
                <div
                  className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${
                    feedback.type === 'ok'
                      ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                      : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                  }`}
                >
                  {feedback.type === 'ok' && (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  )}
                  <span>{feedback.msg}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="rounded-xl border border-[#2C3545] px-4 py-2 text-xs font-medium text-[#C5D0DF] hover:bg-[#1B212B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#00D2C6] px-4 py-2 text-xs font-extrabold text-[#090B0E] hover:bg-[#00E5D8] disabled:opacity-50"
                >
                  {submitting ? 'Verifying...' : 'Activate Licence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}