'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'signin' | 'signup';
type AccountRole = 'client' | 'office';
type PricingAudience = 'practitioner' | 'bureau';

const LICENSE_STORAGE_KEY = 'clintechbills_active_license_key';

export default function ClinTechBillsLandingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Existing session check (shows quick "Open Workspace" button if already logged in)
  const [existingRole, setExistingRole] = useState<'client' | 'office' | null>(null);
  const [existingEmail, setExistingEmail] = useState<string>('');

  // Pricing tab toggle
  const [audience, setAudience] = useState<PricingAudience>('practitioner');

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [role, setRole] = useState<AccountRole>('client');
  const [fullName, setFullName] = useState('');
  const [practiceName, setPracticeName] = useState('');
  const [practiceNumber, setPracticeNumber] = useState('');
  const [inviteKey, setInviteKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Trial / VIP Key Request Modal State
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [trialName, setTrialName] = useState('');
  const [trialPractice, setTrialPractice] = useState('');
  const [trialRole, setTrialRole] = useState<'Clinical Technologist (075)' | 'Medical Billing Bureau'>(
    'Clinical Technologist (075)'
  );
  const [trialEmail, setTrialEmail] = useState('');
  const [trialMonthlyCases, setTrialMonthlyCases] = useState('25–60 cases/mo');
  const [trialSubmitted, setTrialSubmitted] = useState(false);

  // Direct PayFast Plan Checkout Modal
  const [checkoutPlan, setCheckoutPlan] = useState<{
    tier: string;
    label: string;
    price: string;
  } | null>(null);
  const [checkoutPractice, setCheckoutPractice] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !user) return;

      setExistingEmail(user.email || '');
      setCheckoutEmail(user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;
      if (profile?.role === 'office' || profile?.role === 'admin') {
        setExistingRole('office');
      } else {
        setExistingRole('client');
      }
    }

    checkSession();
    return () => {
      active = false;
    };
  }, [supabase]);

  function openAuth(mode: AuthMode, defaultRole: AccountRole = 'client') {
    setAuthMode(mode);
    setRole(defaultRole);
    setAuthError(null);
    setAuthNotice(null);
    setAuthModalOpen(true);
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      if (authMode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error || !data.user) {
          throw new Error(error?.message || 'Sign in failed. Check your email and password.');
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile?.role === 'office' || profile?.role === 'admin') {
          router.push('/queue');
        } else {
          router.push('/capture');
        }
        return;
      }

      // Sign Up Flow
      if (!fullName.trim() || !practiceName.trim()) {
        throw new Error('Full name and Practice / Bureau name are required.');
      }

      // Optional: Resolve entered MB-CTB licence key before creating profile
      let resolvedLicenseId: string | null = null;
      const cleanedKey = inviteKey.trim().toUpperCase();

      if (cleanedKey) {
        const { data: licData, error: licErr } = await supabase
          .from('practice_licenses')
          .select('id, status')
          .eq('license_key', cleanedKey)
          .maybeSingle();

        if (licErr || !licData) {
          throw new Error(
            'Licence key not found. Leave blank to start on the free 15-case Starter tier, or check your MB-CTB key.'
          );
        }
        if (licData.status === 'suspended') {
          throw new Error('That licence key is currently suspended. Contact support@mediburgh.co.za.');
        }
        resolvedLicenseId = licData.id;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            practice_name: practiceName.trim(),
            role,
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (signUpData.user) {
        await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          practice_name: practiceName.trim(),
          practice_number: role === 'client' ? practiceNumber.trim() || null : null,
          role,
          bureau_license_id: resolvedLicenseId,
        });

        if (cleanedKey && typeof window !== 'undefined') {
          localStorage.setItem(LICENSE_STORAGE_KEY, cleanedKey);
        }

        if (signUpData.session) {
          router.push(role === 'office' ? '/queue' : '/capture');
          return;
        }
      }

      setAuthNotice(
        'Account created! Check your inbox to confirm your email address, then sign in.'
      );
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication error.');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleDirectCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!checkoutPlan) return;
    setCheckoutLoading(true);

    try {
      const savedKey =
        typeof window !== 'undefined'
          ? localStorage.getItem(LICENSE_STORAGE_KEY) || ''
          : '';

      const res = await fetch('/api/payfast/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier: checkoutPlan.tier,
          practiceName: checkoutPractice.trim() || 'ClinTech Practice',
          contactEmail: checkoutEmail.trim().toLowerCase(),
          licenseKey: savedKey,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.checkoutUrl) {
        alert(json.error || 'Could not start PayFast checkout.');
        return;
      }

      window.location.href = json.checkoutUrl;
    } finally {
      setCheckoutLoading(false);
    }
  }

  function buildTrialMailtoHref() {
    const subject = encodeURIComponent(
      `ClinTechBills 30-Day VIP Trial Request — ${trialPractice || trialName}`
    );
    const body = encodeURIComponent(
      [
        `Hi MediBurgh Team,`,
        ``,
        `Please issue a 30-day ClinTechBills Pro Trial key for:`,
        `• Name: ${trialName}`,
        `• Practice / Bureau: ${trialPractice}`,
        `• Role: ${trialRole}`,
        `• Email: ${trialEmail}`,
        `• Estimated Monthly Volume: ${trialMonthlyCases}`,
      ].join('\n')
    );
    return `mailto:support@mediburgh.co.za?subject=${subject}&body=${body}`;
  }

  return (
    <div className="min-h-screen bg-[#08080B] text-[#F3F6FA] selection:bg-[#00D2C6] selection:text-[#08080B]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#232B38] bg-[#08080B]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/mediburgh-icon.png"
              alt="MediBurgh Icon"
              className="h-9 w-9 rounded-lg border border-[#232B38] bg-[#0E1218] p-1 object-contain shadow-lg shadow-[#00D2C6]/10"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-[family-name:var(--font-montserrat)] text-base font-extrabold tracking-wide text-white">
                  CLINTECH<span className="text-[#00D2C6]">BILLS</span>
                </span>
                <span className="hidden sm:inline-flex rounded border border-[#00D2C6]/35 bg-[#00D2C6]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#00D2C6]">
                  DISCIPLINE 075
                </span>
              </div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#8B98AB]">
                By MediBurgh Healthcare Intelligence
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#C5D0DF]">
            <a href="#workflow" className="hover:text-[#00D2C6] transition">
              Theatre Workflow
            </a>
            <a href="#pricing" className="hover:text-[#00D2C6] transition">
              Pricing &amp; Bureaux
            </a>
            <a href="#popia" className="hover:text-[#00D2C6] transition">
              POPIA Security
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {existingRole ? (
              <button
                type="button"
                onClick={() =>
                  router.push(existingRole === 'office' ? '/queue' : '/capture')
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#00D2C6] px-4 py-2 text-xs font-extrabold text-[#08080B] hover:bg-[#00E5D8] transition shadow-lg shadow-[#00D2C6]/20"
              >
                <span>Open Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuth('signin')}
                  className="rounded-xl border border-[#2C3545] bg-[#14181F] px-3.5 py-2 text-xs font-bold text-white hover:border-[#00D2C6]/50 transition"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('signup', 'client')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#00D2C6] px-4 py-2 text-xs font-extrabold text-[#08080B] hover:bg-[#00E5D8] transition shadow-lg shadow-[#00D2C6]/20"
                >
                  <span>Start Free</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[#1A202B]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,210,198,0.12),transparent_45%)]" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00D2C6]/35 bg-[#00D2C6]/10 px-3.5 py-1.5 font-mono text-[11px] font-semibold text-[#00D2C6]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>SOUTH AFRICA · DISCIPLINE 075 REVENUE CAPTURE</span>
            </div>

            <h1 className="font-[family-name:var(--font-montserrat)] text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.12]">
              Stop Losing Theatre Revenue to{' '}
              <span className="text-[#00D2C6]">WhatsApp Sticker Photos.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#C5D0DF] leading-relaxed max-w-2xl">
              ClinTechBills connects Clinical Technologists in theatre directly to
              their billing desk in under 45 seconds. Snap hospital stickers,
              auto-calculate 30-minute units and after-hours modifiers, and export
              clean batches for GoodX, Elixir Live, and Healthbridge.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => openAuth('signup', 'client')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#00D2C6] px-6 py-3.5 text-sm font-extrabold text-[#08080B] hover:bg-[#00E5D8] transition shadow-xl shadow-[#00D2C6]/20"
              >
                <span>Start Free (15 Cases / Mo)</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setTrialSubmitted(false);
                  setTrialModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[#2C3545] bg-[#14181F] px-5 py-3.5 text-sm font-bold text-white hover:border-[#00D2C6]/50 transition"
              >
                <KeyRound className="h-4 w-4 text-[#00D2C6]" />
                <span>Request 30-Day VIP Trial</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-[#8B98AB]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#00D2C6]" />
                Android &amp; iOS Home-Screen PWA
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#00D2C6]" />
                POPIA Encrypted Sticker Vault
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#00D2C6]" />
                Multi-ClinTech Bureau Isolation
              </span>
            </div>
          </div>

          {/* Live Theatre Capture Preview Card */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-[#2C3545] bg-[#14181F] p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#232B38] pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#00D2C6] animate-pulse" />
                  <span className="font-mono text-xs font-bold text-white">
                    LIVE THEATRE CAPTURE
                  </span>
                </div>
                <span className="rounded bg-purple-500/15 border border-purple-400/40 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-200">
                  AFTER-HOURS DETECTED
                </span>
              </div>

              <div className="rounded-2xl border border-[#232B38] bg-[#0E1218] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-[10px] text-[#00D2C6] block">
                      CASE REF · CTB-2026-084
                    </span>
                    <p className="text-base font-bold text-white">
                      Johan Van Der Merwe
                    </p>
                    <p className="text-xs text-[#8B98AB]">
                      Surgeon: Dr. K. Naidoo · Netcare Sunninghill
                    </p>
                  </div>
                  <span className="rounded-lg bg-emerald-500/15 border border-emerald-400/40 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-300">
                    STICKER VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="rounded-xl bg-[#14181F] border border-[#232B38] p-2.5">
                    <span className="text-[10px] font-mono text-[#8B98AB] block">
                      DURATION
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      180 min
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#14181F] border border-[#232B38] p-2.5">
                    <span className="text-[10px] font-mono text-[#8B98AB] block">
                      30M UNITS
                    </span>
                    <span className="font-mono text-sm font-bold text-[#00D2C6]">
                      6u (+4 add-on)
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#14181F] border border-[#232B38] p-2.5">
                    <span className="text-[10px] font-mono text-[#8B98AB] block">
                      PRIMARY ICD
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      I25.1
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="rounded bg-[#00D2C6]/15 border border-[#00D2C6]/35 px-2 py-0.5 font-mono text-[11px] font-bold text-[#00D2C6]">
                    75063 ×1
                  </span>
                  <span className="rounded bg-[#00D2C6]/15 border border-[#00D2C6]/35 px-2 py-0.5 font-mono text-[11px] font-bold text-[#00D2C6]">
                    75065 ×4
                  </span>
                  <span className="rounded bg-[#1D7AFC]/15 border border-[#1D7AFC]/35 px-2 py-0.5 font-mono text-[11px] font-bold text-[#7FB3FF]">
                    GUARDRAIL CLEARED
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#8B98AB] pt-1">
                <span>Synced to Bureau Desk in 0.4s</span>
                <button
                  type="button"
                  onClick={() => openAuth('signup', 'client')}
                  className="font-bold text-[#00D2C6] hover:underline"
                >
                  Try Live Capture →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow & Feature Pillars */}
      <section id="workflow" className="mx-auto max-w-6xl px-4 sm:px-6 py-20 space-y-12">
        <div className="max-w-2xl space-y-2">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#00D2C6]">
            Engineered For Discipline 075
          </p>
          <h2 className="font-[family-name:var(--font-montserrat)] text-2xl sm:text-4xl font-extrabold text-white">
            Every Minute in Theatre Accounted For.
          </h2>
          <p className="text-sm sm:text-base text-[#8B98AB]">
            Designed from 15+ years of South African specialist medical billing
            experience to eliminate under-coded time units and lost patient stickers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: Zap,
              title: '45-Second PWA Capture',
              desc: 'Install directly onto Android or iPhone. Snap the hospital sticker, keep surgeon & date sticky across your list, and submit between cases.',
            },
            {
              icon: Activity,
              title: '075 Guardrails & Bundles',
              desc: 'One-tap CPB, Pacemaker, ECMO, CRRT, and IONM protocol bundles auto-sync 30-minute time add-ons and flag coding mismatches before submit.',
            },
            {
              icon: Users,
              title: 'Multi-ClinTech Bureau Desk',
              desc: 'Billing offices filter incoming cases by individual Clinical Technologist, inspect encrypted high-res stickers, and return queries in 1 click.',
            },
            {
              icon: FileSpreadsheet,
              title: 'PMS-Ready CSV Exports',
              desc: 'Capture PMS Account numbers and export structured CSV batches with provider attribution ready for GoodX, Elixir Live, and Healthbridge.',
            },
          ].map((feat) => (
            <div
              key={feat.title}
              className="rounded-2xl border border-[#232B38] bg-[#14181F] p-6 space-y-3 hover:border-[#00D2C6]/40 transition"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#00D2C6]/35 bg-[#00D2C6]/10 text-[#00D2C6]">
                <feat.icon className="h-5 w-5" />
              </div>
              <h3 className="font-[family-name:var(--font-montserrat)] text-base font-bold text-white">
                {feat.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#8B98AB] leading-relaxed">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Transparent Pricing Section */}
      <section
        id="pricing"
        className="border-y border-[#1A202B] bg-[#0B0E13] py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#00D2C6]">
                Transparent ZAR Licensing
              </p>
              <h2 className="font-[family-name:var(--font-montserrat)] text-2xl sm:text-4xl font-extrabold text-white">
                Built for Solo ClinTechs &amp; Billing Bureaux.
              </h2>
              <p className="text-sm text-[#8B98AB]">
                Recovering a single missed 30-minute perfusion or pacemaker unit pays
                for an entire month. All prices excl. VAT.
              </p>
            </div>

            {/* Audience Switcher */}
            <div className="inline-flex rounded-2xl border border-[#232B38] bg-[#14181F] p-1.5 self-start">
              <button
                type="button"
                onClick={() => setAudience('practitioner')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                  audience === 'practitioner'
                    ? 'bg-[#00D2C6] text-[#08080B]'
                    : 'text-[#C5D0DF] hover:text-white'
                }`}
              >
                <Stethoscope className="h-3.5 w-3.5" />
                <span>Clinical Technologists</span>
              </button>
              <button
                type="button"
                onClick={() => setAudience('bureau')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                  audience === 'bureau'
                    ? 'bg-[#00D2C6] text-[#08080B]'
                    : 'text-[#C5D0DF] hover:text-white'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Medical Billing Bureaux</span>
              </button>
            </div>
          </div>

          {audience === 'practitioner' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Starter */}
              <div className="rounded-2xl border border-[#232B38] bg-[#14181F] p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div>
                    <span className="font-mono text-xs uppercase text-[#8B98AB]">
                      Starter
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="font-[family-name:var(--font-montserrat)] text-3xl font-extrabold text-white">
                        R0
                      </span>
                      <span className="text-xs text-[#8B98AB]">/ month forever</span>
                    </div>
                    <p className="mt-2 text-xs text-[#8B98AB]">
                      Ideal for trialling ClinTechBills in live theatre lists.
                    </p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-[#C5D0DF] border-t border-[#232B38] pt-4">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#00D2C6] shrink-0" />
                      <span>Up to 15 cases per calendar month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#00D2C6] shrink-0" />
                      <span>1 Practitioner + 1 Billing Desk seat</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#00D2C6] shrink-0" />
                      <span>Mobile PWA sticker capture &amp; 075 lookup</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => openAuth('signup', 'client')}
                  className="w-full rounded-xl border border-[#2C3545] bg-[#0E1218] hover:border-[#00D2C6] py-3 text-xs font-extrabold text-white transition"
                >
                  Create Free Account
                </button>
              </div>

              {/* Pro Practitioner */}
              <div className="rounded-2xl border-2 border-[#00D2C6] bg-[#14181F] p-6 flex flex-col justify-between space-y-6 shadow-2xl shadow-[#00D2C6]/10 relative">
                <span className="absolute -top-3 right-5 rounded-full bg-[#00D2C6] px-3 py-0.5 font-mono text-[10px] font-extrabold uppercase text-[#08080B]">
                  Most Popular
                </span>

                <div className="space-y-4">
                  <div>
                    <span className="font-mono text-xs uppercase text-[#00D2C6]">
                      Pro Practitioner
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="font-[family-name:var(--font-montserrat)] text-3xl font-extrabold text-white">
                        R495
                      </span>
                      <span className="text-xs text-[#8B98AB]">/ month</span>
                    </div>
                    <p className="mt-2 text-xs text-[#8B98AB]">
                      Full theatre-to-bureau automation for active Clinical Technologists.
                    </p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-[#C5D0DF] border-t border-[#232B38] pt-4">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#00D2C6] shrink-0" />
                      <span>
                        <strong className="text-white">Unlimited</strong> monthly cases
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#00D2C6] shrink-0" />
                      <span>1 Practitioner + 2 Billing Desk seats</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#00D2C6] shrink-0" />
                      <span>Discipline 075 coding guardrails &amp; protocol bundles</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#00D2C6] shrink-0" />
                      <span>GoodX / Elixir / Healthbridge PMS CSV exports</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCheckoutPlan({
                      tier: 'PRO_PAID',
                      label: 'Pro Practitioner',
                      price: 'R495 / mo',
                    })
                  }
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#00D2C6] hover:bg-[#00E5D8] py-3 text-xs font-extrabold text-[#08080B] transition"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Subscribe via PayFast</span>
                </button>
              </div>

              {/* Practice Group */}
              <div className="rounded-2xl border border-[#232B38] bg-[#14181F] p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div>
                    <span className="font-mono text-xs uppercase text-indigo-300">
                      Practice Group
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="font-[family-name:var(--font-montserrat)] text-3xl font-extrabold text-white">
                        R1,195
                      </span>
                      <span className="text-xs text-[#8B98AB]">/ month</span>
                    </div>
                    <p className="mt-2 text-xs text-[#8B98AB]">
                      Multi-practitioner Clinical Technology partnerships (2–5 clinicians).
                    </p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-[#C5D0DF] border-t border-[#232B38] pt-4">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-indigo-300 shrink-0" />
                      <span>Up to 5 Practitioners + 3 Admin seats</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-indigo-300 shrink-0" />
                      <span>Unlimited cases &amp; centralized practice queue</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-indigo-300 shrink-0" />
                      <span>Individual ClinTech attribution badges &amp; CSV splits</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCheckoutPlan({
                      tier: 'GROUP_PAID',
                      label: 'Practice Group (Up to 5 ClinTechs)',
                      price: 'R1,195 / mo',
                    })
                  }
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/15 hover:bg-indigo-500 py-3 text-xs font-extrabold text-indigo-200 hover:text-white transition"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Subscribe Group</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  tier: 'BUREAU_STARTER',
                  name: 'Bureau Office Starter',
                  price: 'R1,950',
                  desc: 'Dedicated /queue tenant for boutique medical billing companies.',
                  features: [
                    'Up to 5 contracted Clinical Technologists',
                    'Up to 3 Billing Office clerk logins',
                    'Isolated Bureau Queue with provider filter pills',
                    'GoodX, Elixir Live & Healthbridge PMS CSV export',
                  ],
                },
                {
                  tier: 'BUREAU_SCALE',
                  name: 'Bureau Office Scale',
                  price: 'R3,450',
                  popular: true,
                  desc: 'For established bureaux managing high-volume hospital theatre lists.',
                  features: [
                    'Up to 15 contracted Clinical Technologists',
                    'Up to 10 Billing Office clerk logins',
                    'Custom bureau header branding on /queue',
                    'Priority WhatsApp & email onboarding support',
                  ],
                },
                {
                  tier: 'BUREAU_PAID',
                  name: 'Bureau Enterprise',
                  price: 'R5,950',
                  desc: 'Full multi-region bureau capacity with unlimited billing clerks.',
                  features: [
                    'Up to 35 contracted Clinical Technologists',
                    'Unlimited Billing Office clerk logins',
                    'Custom PMS CSV column mapping on request',
                    'Dedicated account strategist at MediBurgh',
                  ],
                },
              ].map((pkg) => (
                <div
                  key={pkg.tier}
                  className={`rounded-2xl p-6 flex flex-col justify-between space-y-6 bg-[#14181F] ${
                    pkg.popular
                      ? 'border-2 border-[#00D2C6] shadow-2xl shadow-[#00D2C6]/10 relative'
                      : 'border border-[#232B38]'
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-3 right-5 rounded-full bg-[#00D2C6] px-3 py-0.5 font-mono text-[10px] font-extrabold uppercase text-[#08080B]">
                      Best Value
                    </span>
                  )}
                  <div className="space-y-4">
                    <div>
                      <span className="font-mono text-xs uppercase text-[#00D2C6]">
                        {pkg.name}
                      </span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="font-[family-name:var(--font-montserrat)] text-3xl font-extrabold text-white">
                          {pkg.price}
                        </span>
                        <span className="text-xs text-[#8B98AB]">/ month</span>
                      </div>
                      <p className="mt-2 text-xs text-[#8B98AB]">{pkg.desc}</p>
                    </div>

                    <ul className="space-y-2.5 text-xs text-[#C5D0DF] border-t border-[#232B38] pt-4">
                      {pkg.features.map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-[#00D2C6] shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCheckoutPlan({
                        tier: pkg.tier,
                        label: pkg.name,
                        price: `${pkg.price} / mo`,
                      })
                    }
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#00D2C6] hover:bg-[#00E5D8] py-3 text-xs font-extrabold text-[#08080B] transition"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>License Bureau Office</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* MediBurgh Full-Service Outsourced Billing Callout */}
          <div className="rounded-2xl border border-[#00D2C6]/35 bg-gradient-to-r from-[#0E171D] to-[#14181F] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#00D2C6]">
                MediBurgh Full-Service Bureau Advantage
              </span>
              <h3 className="font-[family-name:var(--font-montserrat)] text-base sm:text-lg font-bold text-white">
                Outsource your Discipline 075 billing to MediBurgh — get ClinTechBills Pro at R0/mo.
              </h3>
              <p className="text-xs text-[#8B98AB]">
                Practices partnered with MediBurgh for end-to-end medical aid submissions,
                PMB escalations, and debt recovery receive complimentary unlimited seats.
              </p>
            </div>
            <a
              href="https://mediburgh.co.za"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[#00D2C6] px-5 py-3 text-xs font-extrabold text-[#00D2C6] hover:bg-[#00D2C6] hover:text-[#08080B] transition shrink-0"
            >
              <span>Explore MediBurgh</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* POPIA & Governance Section */}
      <section id="popia" className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="rounded-3xl border border-[#232B38] bg-[#14181F] p-6 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-[#00D2C6] font-mono text-xs font-bold uppercase">
              <ShieldCheck className="h-4 w-4" />
              <span>POPIA &amp; Clinical Governance</span>
            </div>
            <h3 className="font-[family-name:var(--font-montserrat)] text-xl font-extrabold text-white">
              Built for South African Healthcare Compliance.
            </h3>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#C5D0DF]">
            <div className="rounded-2xl border border-[#232B38] bg-[#0E1218] p-4 space-y-1">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#00D2C6]" />
                Private Signed Sticker Vault
              </p>
              <p className="text-[#8B98AB]">
                Hospital stickers never sit in public buckets—only authorized bureau
                clerks generate time-limited signed URLs.
              </p>
            </div>
            <div className="rounded-2xl border border-[#232B38] bg-[#0E1218] p-4 space-y-1">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#00D2C6]" />
                Immutable Audit Trail
              </p>
              <p className="text-[#8B98AB]">
                Every submission, query, sticker replacement, and PMS billing reference
                is logged with timestamp and actor ID.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1A202B] bg-[#060709] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/mediburgh-logo.png"
              alt="MediBurgh"
              className="h-7 w-auto object-contain"
            />
            <span className="text-xs text-[#8B98AB]">
              Precision Billing. Protected Revenue.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#8B98AB]">
            <a
              href="mailto:support@mediburgh.co.za"
              className="hover:text-[#00D2C6] transition"
            >
              support@mediburgh.co.za
            </a>
            <span>·</span>
            <a
              href="https://mediburgh.co.za"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#00D2C6] transition"
            >
              mediburgh.co.za
            </a>
            <span>·</span>
            <a
              href="https://www.linkedin.com/company/mediburgh"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#00D2C6] transition"
            >
              LinkedIn
            </a>
            <span>·</span>
            <a
              href="https://www.instagram.com/mediburgh.sa"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#00D2C6] transition"
            >
              Instagram
            </a>
          </div>
        </div>
      </footer>

      {/* MODAL 1: Sign In / Create Account */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#2C3545] bg-[#14181F] p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#232B38] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#00D2C6]" />
                <h3 className="font-[family-name:var(--font-montserrat)] text-sm font-bold text-white">
                  {authMode === 'signin'
                    ? 'Sign In to ClinTechBills'
                    : 'Create ClinTechBills Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="rounded-lg p-1 text-[#8B98AB] hover:bg-[#1B212B] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 rounded-xl border border-[#232B38] bg-[#0E1218] p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError(null);
                }}
                className={`rounded-lg py-2 text-xs font-bold transition ${
                  authMode === 'signin'
                    ? 'bg-[#00D2C6] text-[#08080B]'
                    : 'text-[#8B98AB] hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError(null);
                }}
                className={`rounded-lg py-2 text-xs font-bold transition ${
                  authMode === 'signup'
                    ? 'bg-[#00D2C6] text-[#08080B]'
                    : 'text-[#8B98AB] hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] mb-1">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('client')}
                        className={`rounded-xl border p-2.5 text-left text-xs transition ${
                          role === 'client'
                            ? 'border-[#00D2C6] bg-[#00D2C6]/15 text-white'
                            : 'border-[#232B38] bg-[#0E1218] text-[#8B98AB]'
                        }`}
                      >
                        <p className="font-bold">ClinTech (075)</p>
                        <p className="text-[10px] opacity-80">Theatre Capture</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('office')}
                        className={`rounded-xl border p-2.5 text-left text-xs transition ${
                          role === 'office'
                            ? 'border-[#00D2C6] bg-[#00D2C6]/15 text-white'
                            : 'border-[#232B38] bg-[#0E1218] text-[#8B98AB]'
                        }`}
                      >
                        <p className="font-bold">Billing Bureau</p>
                        <p className="text-[10px] opacity-80">Office Queue</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Johan van der Merwe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 text-xs text-white focus:border-[#00D2C6] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] mb-1">
                      {role === 'client' ? 'Practice Name *' : 'Billing Bureau Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        role === 'client'
                          ? 'e.g. Gauteng Perfusion Services'
                          : 'e.g. Apex Medical Billing'
                      }
                      value={practiceName}
                      onChange={(e) => setPracticeName(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 text-xs text-white focus:border-[#00D2C6] focus:outline-none"
                    />
                  </div>

                  {role === 'client' && (
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] mb-1">
                        BHF Practice Number (075)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 0751234"
                        value={practiceNumber}
                        onChange={(e) => setPracticeNumber(e.target.value)}
                        className="w-full h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 font-mono text-xs text-white focus:border-[#00D2C6] focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] mb-1">
                      Licence / Bureau Invite Key (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="MB-CTB-XXXX-XXXX"
                      value={inviteKey}
                      onChange={(e) => setInviteKey(e.target.value.toUpperCase())}
                      className="w-full h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 font-mono text-xs uppercase text-[#00D2C6] placeholder-[#4E5B6E] focus:border-[#00D2C6] focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@practice.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 text-xs text-white focus:border-[#00D2C6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 text-xs text-white focus:border-[#00D2C6] focus:outline-none"
                />
              </div>

              {authError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">
                  {authError}
                </div>
              )}

              {authNotice && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-200">
                  {authNotice}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(false)}
                  className="rounded-xl border border-[#2C3545] px-4 py-2.5 text-xs font-semibold text-[#C5D0DF] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00D2C6] px-5 py-2.5 text-xs font-extrabold text-[#08080B] hover:bg-[#00E5D8] disabled:opacity-50"
                >
                  {authSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Request 30-Day VIP / Trial Key */}
      {trialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#2C3545] bg-[#14181F] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#232B38] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#00D2C6]" />
                <h3 className="font-[family-name:var(--font-montserrat)] text-sm font-bold text-white">
                  Request 30-Day VIP Pro Trial Key
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTrialModalOpen(false)}
                className="rounded-lg p-1 text-[#8B98AB] hover:bg-[#1B212B] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!trialSubmitted ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setTrialSubmitted(true);
                }}
                className="space-y-3"
              >
                <p className="text-xs text-[#8B98AB]">
                  Test unlimited Discipline 075 theatre captures or a full Bureau
                  Office queue free for 30 days—no card required.
                </p>

                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#8B98AB] mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={trialName}
                    onChange={(e) => setTrialName(e.target.value)}
                    placeholder="e.g. Dr. S. Govender"
                    className="w-full h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 text-xs text-white focus:border-[#00D2C6] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#8B98AB] mb-1">
                    Practice or Billing Bureau Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={trialPractice}
                    onChange={(e) => setTrialPractice(e.target.value)}
                    placeholder="e.g. Highveld Clinical Tech"
                    className="w-full h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 text-xs text-white focus:border-[#00D2C6] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#8B98AB] mb-1">
                      Role
                    </label>
                    <select
                      value={trialRole}
                      onChange={(e) =>
                        setTrialRole(
                          e.target.value as
                            | 'Clinical Technologist (075)'
                            | 'Medical Billing Bureau'
                        )
                      }
                      className="w-full h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-2.5 text-xs text-white focus:border-[#00D2C6] focus:outline-none"
                    >
                      <option value="Clinical Technologist (075)">
                        ClinTech (075)
                      </option>
                      <option value="Medical Billing Bureau">
                        Billing Bureau
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#8B98AB] mb-1">
                      Monthly Volume
                    </label>
                    <select
                      value={trialMonthlyCases}
                      onChange={(e) => setTrialMonthlyCases(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-2.5 text-xs text-white focus:border-[#00D2C6] focus:outline-none"
                    >
                      <option value="15–30 cases/mo">15–30 cases/mo</option>
                      <option value="30–80 cases/mo">30–80 cases/mo</option>
                      <option value="80+ cases/mo">80+ cases/mo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#8B98AB] mb-1">
                    Email for Licence Key Delivery *
                  </label>
                  <input
                    type="email"
                    required
                    value={trialEmail}
                    onChange={(e) => setTrialEmail(e.target.value)}
                    placeholder="doctor@practice.co.za"
                    className="w-full h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 text-xs text-white focus:border-[#00D2C6] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTrialModalOpen(false)}
                    className="rounded-xl border border-[#2C3545] px-4 py-2 text-xs font-semibold text-[#C5D0DF]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#00D2C6] px-4 py-2 text-xs font-extrabold text-[#08080B] hover:bg-[#00E5D8]"
                  >
                    Generate Request
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3.5 text-xs text-emerald-200">
                  Trial request prepared for <strong>{trialPractice}</strong>. Send
                  via email to <strong>support@mediburgh.co.za</strong> to receive
                  your <code>MB-CTB-XXXX-XXXX</code> key within 2 business hours.
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={buildTrialMailtoHref()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#00D2C6] py-3 text-xs font-extrabold text-[#08080B] hover:bg-[#00E5D8]"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Send Request to support@mediburgh.co.za</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setTrialModalOpen(false)}
                    className="w-full rounded-xl border border-[#2C3545] py-2.5 text-xs font-semibold text-[#C5D0DF]"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Direct PayFast Checkout for Selected Tier */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#2C3545] bg-[#14181F] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#232B38] pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase text-[#00D2C6]">
                  PayFast ZAR Subscription
                </span>
                <h3 className="font-[family-name:var(--font-montserrat)] text-sm font-bold text-white">
                  {checkoutPlan.label} — {checkoutPlan.price}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                className="rounded-lg p-1 text-[#8B98AB] hover:bg-[#1B212B] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDirectCheckout} className="space-y-3">
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#8B98AB] mb-1">
                  Practice or Billing Bureau Name *
                </label>
                <input
                  type="text"
                  required
                  value={checkoutPractice}
                  onChange={(e) => setCheckoutPractice(e.target.value)}
                  placeholder="e.g. Gauteng Perfusion / Apex Bureau"
                  className="w-full h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 text-xs text-white focus:border-[#00D2C6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-[#8B98AB] mb-1">
                  Email for Instant Key Delivery *
                </label>
                <input
                  type="email"
                  required
                  value={checkoutEmail}
                  onChange={(e) => setCheckoutEmail(e.target.value)}
                  placeholder="doctor@practice.co.za"
                  className="w-full h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 text-xs text-white focus:border-[#00D2C6] focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-[#8B98AB]">
                Your <code>MB-CTB-XXXX-XXXX</code> licence key activates immediately
                and is emailed to you upon PayFast payment confirmation.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutPlan(null)}
                  className="rounded-xl border border-[#2C3545] px-4 py-2.5 text-xs font-semibold text-[#C5D0DF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00D2C6] px-5 py-2.5 text-xs font-extrabold text-[#08080B] hover:bg-[#00E5D8] disabled:opacity-50"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>
                    {checkoutLoading ? 'Redirecting...' : 'Continue to PayFast'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}