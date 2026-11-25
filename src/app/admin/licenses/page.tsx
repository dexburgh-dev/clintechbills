'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Ban,
  CheckCircle2,
  CalendarPlus,
  KeyRound,
  Lock,
  MessageSquareShare,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  PracticeLicense,
  PlanTier,
  PLAN_PRESETS,
  generateLicenseKey,
  isLicenseExpired,
} from '@/lib/licensing';

const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || 'MediBurgh2026!';
const ADMIN_AUTH_STORAGE = 'mediburgh_ctb_admin_unlocked';

export default function AdminLicensesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [unlocked, setUnlocked] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [licenses, setLicenses] = useState<PracticeLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedWaId, setCopiedWaId] = useState<string | null>(null);

  // Form state
  const [practiceName, setPracticeName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [planTier, setPlanTier] = useState<PlanTier>('FREE_COMP');
  const [customKey, setCustomKey] = useState(() => generateLicenseKey());
  const [monthlyLimit, setMonthlyLimit] = useState<string>('');
  const [maxPractitioners, setMaxPractitioners] = useState<number>(3);
  const [expiryDays, setExpiryDays] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      sessionStorage.getItem(ADMIN_AUTH_STORAGE) === '1'
    ) {
      setUnlocked(true);
    }
  }, []);

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('practice_licenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLicenses(data as PracticeLicense[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (unlocked) {
      fetchLicenses();
    }
  }, [unlocked, fetchLicenses]);

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (passInput === ADMIN_PASS) {
      sessionStorage.setItem(ADMIN_AUTH_STORAGE, '1');
      setUnlocked(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect MediBurgh Admin passcode.');
    }
  }

  function handlePresetChange(newTier: PlanTier) {
    setPlanTier(newTier);
    const preset = PLAN_PRESETS[newTier];
    setMonthlyLimit(
      preset.defaultMonthlyLimit === null
        ? ''
        : String(preset.defaultMonthlyLimit)
    );
    setMaxPractitioners(preset.defaultPractitioners);
    setExpiryDays(
      preset.defaultTrialDays === null ? '' : String(preset.defaultTrialDays)
    );
  }

  async function handleIssueLicense(e: React.FormEvent) {
    e.preventDefault();
    if (!practiceName.trim() || !contactEmail.trim()) return;
    setCreating(true);

    const expiresAt =
      expiryDays.trim() !== '' && Number(expiryDays) > 0
        ? new Date(
            Date.now() + Number(expiryDays) * 24 * 60 * 60 * 1000
          ).toISOString()
        : null;

    const parsedLimit =
      monthlyLimit.trim() === ''
        ? null
        : Math.max(1, parseInt(monthlyLimit, 10));

    const payload = {
      practice_name: practiceName.trim(),
      contact_email: contactEmail.trim().toLowerCase(),
      license_key: customKey.trim().toUpperCase() || generateLicenseKey(),
      plan_tier: planTier,
      status: 'active',
      monthly_case_limit: parsedLimit,
      max_practitioners: Math.max(1, maxPractitioners),
      expires_at: expiresAt,
      issued_by: 'Xander Burke (MediBurgh)',
      notes: notes.trim() || null,
    };

    const { error } = await supabase.from('practice_licenses').insert(payload);
    setCreating(false);

    if (error) {
      alert(`Error creating licence: ${error.message}`);
      return;
    }

    setPracticeName('');
    setContactEmail('');
    setNotes('');
    setCustomKey(generateLicenseKey());
    await fetchLicenses();
  }

  async function toggleSuspend(lic: PracticeLicense) {
    const nextStatus = lic.status === 'suspended' ? 'active' : 'suspended';
    await supabase
      .from('practice_licenses')
      .update({ status: nextStatus })
      .eq('id', lic.id);
    await fetchLicenses();
  }

  async function extendExpiry30Days(lic: PracticeLicense) {
    const baseTime =
      lic.expires_at && new Date(lic.expires_at).getTime() > Date.now()
        ? new Date(lic.expires_at).getTime()
        : Date.now();
    const newExpiry = new Date(
      baseTime + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    await supabase
      .from('practice_licenses')
      .update({ expires_at: newExpiry, status: 'active' })
      .eq('id', lic.id);
    await fetchLicenses();
  }

  function copyKey(lic: PracticeLicense) {
    navigator.clipboard.writeText(lic.license_key);
    setCopiedId(lic.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function copyWhatsAppInvite(lic: PracticeLicense) {
    const preset = PLAN_PRESETS[lic.plan_tier];
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://clintechbills.vercel.app';
    const expiryLine = lic.expires_at
      ? `Valid until: ${new Date(lic.expires_at).toLocaleDateString('en-ZA')}`
      : 'Validity: Active / No expiry';

    const msg = [
      `*ClinTechBills — MediBurgh Licence Issued*`,
      `Practice: *${lic.practice_name}*`,
      `Plan: *${preset.label}* (${preset.priceLabel})`,
      `Licence Key: \`${lic.license_key}\``,
      expiryLine,
      ``,
      `1. Open ${origin}/capture on your phone`,
      `2. Tap *Add to Home Screen* to install the app`,
      `3. Tap *Activate Key* at the top and paste your key above.`,
    ].join('\n');

    navigator.clipboard.writeText(msg);
    setCopiedWaId(lic.id);
    setTimeout(() => setCopiedWaId(null), 1800);
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080B] p-4 text-slate-100">
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm rounded-2xl border border-[#232B38] bg-[#0D1117] p-6 shadow-2xl"
        >
          <div className="flex items-center gap-2.5 text-[#00C2D1]">
            <Lock className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">
              MediBurgh Admin Gate
            </span>
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-montserrat)] text-lg font-bold text-white">
            ClinTechBills Licensing
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Enter your MediBurgh administrator passcode to issue and manage
            practice licences.
          </p>

          <input
            type="password"
            placeholder="Admin Passcode"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            className="mt-4 w-full rounded-xl border border-slate-700 bg-[#08080B] px-3.5 py-2.5 text-sm text-white focus:border-[#00C2D1] focus:outline-none"
            required
          />

          {authError && <p className="mt-2 text-xs text-rose-400">{authError}</p>}

          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-[#00C2D1] py-2.5 text-xs font-extrabold text-[#08080B] hover:bg-[#0AA7A1]"
          >
            Unlock Licence Console
          </button>
        </form>
      </div>
    );
  }

  const activeCount = licenses.filter(
    (l) => l.status === 'active' && !isLicenseExpired(l)
  ).length;
  const freeCompCount = licenses.filter(
    (l) => l.plan_tier === 'FREE_COMP'
  ).length;
  const paidCount = licenses.filter((l) =>
    ['PRO_PAID', 'GROUP_PAID', 'BUREAU_PAID'].includes(l.plan_tier)
  ).length;

  return (
    <div className="min-h-screen bg-[#08080B] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/mediburgh-icon.png"
              alt="MediBurgh Icon"
              className="h-11 w-11 rounded-xl border border-[#232B38] bg-[#0D1117] p-1.5 object-contain"
            />
            <div>
              <div className="flex items-center gap-2 text-[#00C2D1]">
                <Shield className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  MediBurgh Revenue &amp; Entitlement Engine
                </span>
              </div>
              <h1 className="mt-0.5 font-[family-name:var(--font-montserrat)] text-2xl font-bold text-white">
                ClinTechBills Licence Manager
              </h1>
              <p className="text-xs text-slate-400">
                Issue Free Complimentary keys, 30-day Pro Trials, or Paid
                Practice &amp; Bureau licences.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="rounded-xl border border-slate-800 bg-[#0D1117] px-4 py-2.5 text-center">
              <div className="text-lg font-bold text-white">{activeCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Active Keys
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2.5 text-center">
              <div className="text-lg font-bold text-emerald-300">
                {freeCompCount}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400/80">
                Free Comp
              </div>
            </div>
            <div className="rounded-xl border border-[#00C2D1]/30 bg-[#00C2D1]/10 px-4 py-2.5 text-center">
              <div className="text-lg font-bold text-[#00C2D1]">
                {paidCount}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[#00C2D1]/80">
                Paid Tiers
              </div>
            </div>
          </div>
        </div>

        {/* Issue New Licence Card */}
        <form
          onSubmit={handleIssueLicense}
          className="mt-6 rounded-2xl border border-slate-800 bg-[#0D1117] p-6 shadow-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Plus className="h-4 w-4 text-[#00C2D1]" />
              Issue New Practice Licence
            </h2>
            <span className="text-xs text-slate-400">
              {PLAN_PRESETS[planTier].description}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-300">
                Practice / Practitioner Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. J. van der Merwe Perfusion"
                value={practiceName}
                onChange={(e) => setPracticeName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-[#08080B] px-3 py-2 text-sm text-white focus:border-[#00C2D1] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Contact Email *
              </label>
              <input
                type="email"
                placeholder="doctor@practice.co.za"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-[#08080B] px-3 py-2 text-sm text-white focus:border-[#00C2D1] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Licence Tier &amp; Fee Structure
              </label>
              <select
                value={planTier}
                onChange={(e) => handlePresetChange(e.target.value as PlanTier)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-[#08080B] px-3 py-2 text-sm text-white focus:border-[#00C2D1] focus:outline-none"
              >
                {Object.values(PLAN_PRESETS).map((p) => (
                  <option key={p.tier} value={p.tier}>
                    {p.label} — {p.priceLabel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Generated Licence Key
              </label>
              <div className="mt-1 flex gap-1.5">
                <input
                  type="text"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-700 bg-[#08080B] px-3 py-2 font-mono text-sm text-[#00C2D1] focus:border-[#00C2D1] focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setCustomKey(generateLicenseKey())}
                  title="Generate new key"
                  className="rounded-xl border border-slate-700 bg-[#08080B] px-2.5 text-slate-400 hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-300">
                  Monthly Cap
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[#08080B] px-2.5 py-2 text-sm text-white placeholder-slate-600 focus:border-[#00C2D1] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300">
                  Seats
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxPractitioners}
                  onChange={(e) => setMaxPractitioners(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[#08080B] px-2.5 py-2 text-sm text-white focus:border-[#00C2D1] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300">
                  Valid Days
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="Never"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[#08080B] px-2.5 py-2 text-sm text-white placeholder-slate-600 focus:border-[#00C2D1] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Internal Admin Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Waived — MediBurgh 5% bureau client"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-[#08080B] px-3 py-2 text-sm text-white focus:border-[#00C2D1] focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00C2D1] px-5 py-2.5 text-xs font-extrabold text-[#08080B] transition hover:bg-[#0AA7A1] disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              {creating ? 'Issuing Licence...' : 'Issue & Activate Licence'}
            </button>
          </div>
        </form>

        {/* Active Licences Table */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-[#0D1117]">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <h2 className="text-sm font-bold text-white">
              Issued Licences ({licenses.length})
            </h2>
            <button
              type="button"
              onClick={fetchLicenses}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Loading licences...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-[#08080B]/70 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Practice &amp; Contact</th>
                    <th className="px-4 py-3">Licence Key</th>
                    <th className="px-4 py-3">Tier &amp; Fee</th>
                    <th className="px-4 py-3">Quota / Seats</th>
                    <th className="px-4 py-3">Status &amp; Expiry</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {licenses.map((lic) => {
                    const preset = PLAN_PRESETS[lic.plan_tier];
                    const expired = isLicenseExpired(lic);

                    return (
                      <tr key={lic.id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-white">
                            {lic.practice_name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {lic.contact_email}
                          </div>
                          {lic.notes && (
                            <div className="mt-0.5 text-[10px] italic text-slate-500">
                              {lic.notes}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <code className="rounded bg-[#08080B] px-2 py-1 font-mono text-[11px] text-[#00C2D1]">
                              {lic.license_key}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyKey(lic)}
                              title="Copy key"
                              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                            >
                              {copiedId === lic.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${preset.badgeColor}`}
                          >
                            {preset.label}
                          </span>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {preset.priceLabel}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-slate-300">
                          <div>
                            {lic.monthly_case_limit === null
                              ? 'Unlimited cases'
                              : `${lic.monthly_case_limit} cases / mo`}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {lic.max_practitioners} clinician seat(s)
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {lic.status === 'suspended' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-950/70 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                              Suspended
                            </span>
                          ) : expired ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/70 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                              Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              Active
                            </span>
                          )}
                          <div className="mt-1 text-[11px] text-slate-500">
                            {lic.expires_at
                              ? `Exp: ${new Date(lic.expires_at).toLocaleDateString('en-ZA')}`
                              : 'No expiry'}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyWhatsAppInvite(lic)}
                              title="Copy WhatsApp onboarding message"
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-2 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-950/60"
                            >
                              {copiedWaId === lic.id ? (
                                <>
                                  <Check className="h-3 w-3" /> Copied WA
                                </>
                              ) : (
                                <>
                                  <MessageSquareShare className="h-3 w-3" />{' '}
                                  WhatsApp
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => extendExpiry30Days(lic)}
                              title="Add 30 days validity"
                              className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
                            >
                              <CalendarPlus className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleSuspend(lic)}
                              title={
                                lic.status === 'suspended'
                                  ? 'Reactivate'
                                  : 'Suspend'
                              }
                              className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-rose-400"
                            >
                              {lic.status === 'suspended' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Ban className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}