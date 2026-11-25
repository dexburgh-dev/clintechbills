'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<'client' | 'office'>('client');
  const [fullName, setFullName] = useState('');
  const [practiceName, setPracticeName] = useState('Clinical Technology (075)');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function redirectIfAuthenticated() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active || !user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const targetRole =
          profile?.role || (user.user_metadata?.role as string) || 'client';

        if (targetRole === 'office' || targetRole === 'admin') {
          router.replace('/queue');
        } else {
          router.replace('/capture');
        }
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    redirectIfAuthenticated();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || email.split('@')[0],
              practice_name: practiceName.trim() || 'Clinical Technology (075)',
              role,
            },
          },
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: email.trim(),
            full_name: fullName.trim() || email.split('@')[0],
            practice_name: practiceName.trim() || 'Clinical Technology (075)',
            role,
          });

          if (data.session) {
            router.replace(role === 'office' ? '/queue' : '/capture');
            return;
          }
        }

        setInfoMsg(
          'Account created. Check your email to confirm your address, then sign in.'
        );
        setMode('signin');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        const targetRole =
          profile?.role || (data.user.user_metadata?.role as string) || 'client';

        router.replace(
          targetRole === 'office' || targetRole === 'admin' ? '/queue' : '/capture'
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#090B0E] text-[#F3F6FA] flex flex-col justify-between px-4 py-8">
      <div className="w-full max-w-md mx-auto my-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-[#14181F] border border-[#232B38] shadow-2xl shadow-[#00D2C6]/15">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/mediburgh-icon.png"
              alt="MediBurgh Icon"
              className="w-14 h-14 object-contain"
            />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D2C6]/10 border border-[#00D2C6]/30 text-[10px] font-mono font-bold uppercase tracking-widest text-[#00D2C6]">
              <Sparkles className="w-3 h-3" />
              <span>Discipline 075 · Clinical Technology</span>
            </div>
            <h1 className="font-[family-name:var(--font-montserrat)] text-3xl font-extrabold tracking-tight text-white mt-2">
              CLINTECH<span className="text-[#00D2C6]">BILLS</span>
            </h1>
            <p className="text-xs text-[#8B98AB] mt-1">
              Mobile case &amp; sticker capture synced live with MediBurgh Billing Office
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-[#14181F] border border-[#232B38] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0E1218] border border-[#232B38]">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className={`h-9 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                mode === 'signin'
                  ? 'bg-[#00D2C6] text-[#090B0E]'
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
              }}
              className={`h-9 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                mode === 'signup'
                  ? 'bg-[#00D2C6] text-[#090B0E]'
                  : 'text-[#8B98AB] hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-xl bg-[#00D2C6]/10 border border-[#00D2C6]/40 text-xs text-[#9FF7F1]">
              {infoMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8B98AB] mb-1.5">
                    Workspace Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('client')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        role === 'client'
                          ? 'bg-[#00D2C6]/15 border-[#00D2C6] text-white'
                          : 'bg-[#0E1218] border-[#232B38] text-[#8B98AB]'
                      }`}
                    >
                      <p className="text-xs font-bold">Practitioner</p>
                      <p className="text-[10px] opacity-80">Capture &amp; upload cases</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('office')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        role === 'office'
                          ? 'bg-[#1D7AFC]/20 border-[#1D7AFC] text-white'
                          : 'bg-[#0E1218] border-[#232B38] text-[#8B98AB]'
                      }`}
                    >
                      <p className="text-xs font-bold">Billing Office</p>
                      <p className="text-[10px] opacity-80">Review, query &amp; bill</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8B98AB] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Xander Burke"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8B98AB] mb-1.5">
                    Practice Name
                  </label>
                  <input
                    type="text"
                    value={practiceName}
                    onChange={(e) => setPracticeName(e.target.value)}
                    placeholder="Clinical Technology (075)"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8B98AB] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8B98AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@mediburgh.co.za"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8B98AB] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8B98AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || checkingSession}
              className="w-full h-11 rounded-xl bg-[#00D2C6] hover:bg-[#00E5D8] disabled:opacity-50 text-[#090B0E] font-[family-name:var(--font-montserrat)] font-extrabold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-2 transition shadow-lg shadow-[#00D2C6]/20"
            >
              {mode === 'signup' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Creating Account...' : 'Create Portal Account'}</span>
                </>
              ) : (
                <>
                  <span>{loading ? 'Signing In...' : 'Enter Workspace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-[#232B38] flex items-center justify-center gap-2 text-[11px] text-[#8B98AB]">
            <ShieldCheck className="w-4 h-4 text-[#00D2C6]" />
            <span>POPIA Encrypted · Role-Based Access Control</span>
          </div>
        </div>
      </div>

      {/* MediBurgh Brand Footer */}
      <footer className="w-full max-w-md mx-auto pt-8 flex flex-col items-center gap-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/mediburgh-logo.png"
          alt="MediBurgh · Precision Billing. Protected Revenue."
          className="h-8 w-auto object-contain opacity-95"
        />
        <p className="font-mono text-[10px] tracking-wider uppercase text-[#6A7689]">
          Precision Billing. Protected Revenue.
        </p>
      </footer>
    </div>
  );
}