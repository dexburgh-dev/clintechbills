'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function CleanLoginPortalPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [accountRole, setAccountRole] = useState<'client' | 'office'>('client');

  const [fullName, setFullName] = useState('');
  const [practiceName, setPracticeName] = useState('');
  const [practiceNumber, setPracticeNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function redirectIfAuthenticated() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active || !user) {
          if (active) setCheckingSession(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (!active) return;

        if (profile?.role === 'office' || profile?.role === 'admin') {
          router.replace('/queue');
        } else {
          router.replace('/capture');
        }
      } catch {
        if (active) setCheckingSession(false);
      }
    }

    redirectIfAuthenticated();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw new Error(error.message);

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profile?.role === 'office' || profile?.role === 'admin') {
            router.replace('/queue');
          } else {
            router.replace('/capture');
          }
        }
        return;
      }

      // Sign Up flow — marks fresh signup so subtle floating subscription prompt appears once inside workspace
      const cleanFullName = fullName.trim() || cleanEmail.split('@')[0];
      const cleanPractice =
        practiceName.trim() ||
        (accountRole === 'office'
          ? 'Medical Billing Bureau'
          : 'Clinical Technology (075)');

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanFullName,
            practice_name: cleanPractice,
            practice_number: practiceNumber.trim() || null,
            role: accountRole,
          },
        },
      });

      if (signUpError) throw new Error(signUpError.message);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('clintechbills_new_signup_prompt', '1');
      }

      if (signUpData.user && signUpData.session) {
        await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          email: cleanEmail,
          full_name: cleanFullName,
          practice_name: cleanPractice,
          practice_number: practiceNumber.trim() || null,
          role: accountRole,
        });

        router.replace(accountRole === 'office' ? '/queue' : '/capture');
      } else {
        setInfoMsg(
          'Account created. Check your inbox to confirm your email, then sign in below.'
        );
        setMode('signin');
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Authentication failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#08080B] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#00D2C6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080B] text-[#F3F6FA] flex flex-col justify-between px-4 py-8 relative overflow-hidden">
      {/* Subtle Ambient Obsidian Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-[34rem] rounded-full bg-[#00D2C6]/10 blur-3xl"
      />

      <div className="my-auto mx-auto w-full max-w-md space-y-7 relative z-10">
        {/* Big MediBurgh Brand Lockup */}
        <div className="flex flex-col items-center text-center space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/mediburgh-logo.png"
            alt="MediBurgh"
            className="h-16 sm:h-20 w-auto object-contain drop-shadow-[0_0_24px_rgba(0,210,198,0.22)]"
          />
          <div className="inline-flex items-center gap-2 rounded-full border border-[#232B38] bg-[#11151C] px-3 py-1">
            <span className="font-[family-name:var(--font-montserrat)] text-xs font-extrabold tracking-widest text-white">
              CLINTECH<span className="text-[#00D2C6]">BILLS</span>
            </span>
            <span className="text-[#4E5B6E]">·</span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8B98AB]">
              Discipline 075
            </span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-[#232B38] bg-[#11151C]/95 p-6 sm:p-7 shadow-2xl backdrop-blur-md space-y-5">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 rounded-xl bg-[#090B0E] p-1 border border-[#1E2530]">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold tracking-wide transition ${
                mode === 'signin'
                  ? 'bg-[#00D2C6] text-[#08080B] shadow'
                  : 'text-[#8B98AB] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold tracking-wide transition ${
                mode === 'signup'
                  ? 'bg-[#00D2C6] text-[#08080B] shadow'
                  : 'text-[#8B98AB] hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="rounded-xl border border-[#00D2C6]/40 bg-[#00D2C6]/10 px-3.5 py-2.5 text-xs text-[#9FF7F1]">
              {infoMsg}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                {/* Role Selector */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAccountRole('client')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-bold transition ${
                      accountRole === 'client'
                        ? 'border-[#00D2C6] bg-[#00D2C6]/15 text-[#00D2C6]'
                        : 'border-[#232B38] bg-[#090B0E] text-[#8B98AB] hover:text-white'
                    }`}
                  >
                    <Stethoscope className="h-3.5 w-3.5" />
                    <span>ClinTech (075)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountRole('office')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-bold transition ${
                      accountRole === 'office'
                        ? 'border-[#00D2C6] bg-[#00D2C6]/15 text-[#00D2C6]'
                        : 'border-[#232B38] bg-[#090B0E] text-[#8B98AB] hover:text-white'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Medical Bureau</span>
                  </button>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-[#6A7689] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Xander Burke"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#090B0E] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] mb-1">
                      {accountRole === 'office' ? 'Bureau Name *' : 'Practice Name'}
                    </label>
                    <input
                      type="text"
                      required={accountRole === 'office'}
                      value={practiceName}
                      onChange={(e) => setPracticeName(e.target.value)}
                      placeholder={
                        accountRole === 'office'
                          ? 'e.g. MediBurgh Bureau'
                          : 'e.g. Perfusion Care 075'
                      }
                      className="w-full h-11 px-3.5 rounded-xl bg-[#090B0E] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                    />
                  </div>

                  {accountRole === 'client' && (
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] mb-1">
                        Practice No (075)
                      </label>
                      <input
                        type="text"
                        value={practiceNumber}
                        onChange={(e) => setPracticeNumber(e.target.value)}
                        placeholder="e.g. 0751234"
                        className="w-full h-11 px-3.5 rounded-xl bg-[#090B0E] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none font-mono text-sm text-white placeholder-[#4E5B6E]"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-[#6A7689] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@practice.co.za"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#090B0E] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-[#6A7689] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#090B0E] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6A7689] hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-[#00D2C6] hover:bg-[#00E5D8] disabled:opacity-50 font-[family-name:var(--font-montserrat)] font-extrabold text-xs uppercase tracking-wider text-[#08080B] transition flex items-center justify-center gap-2 shadow-lg shadow-[#00D2C6]/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{mode === 'signin' ? 'Signing In...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Enter Workspace' : 'Create Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Minimal Footer */}
        <footer className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-[#6A7689]">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[#00D2C6]" />
            POPIA Encrypted
          </span>
          <span>·</span>
          <a
            href="mailto:support@mediburgh.co.za"
            className="hover:text-[#00D2C6] transition"
          >
            support@mediburgh.co.za
          </a>
          <span>·</span>
          <Link href="/legal" className="hover:text-[#00D2C6] transition">
            POPIA &amp; Terms
          </Link>
        </footer>
      </div>
    </div>
  );
}
