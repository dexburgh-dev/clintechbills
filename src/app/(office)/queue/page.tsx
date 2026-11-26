'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  Hash,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  LogOut,
  MessageSquareWarning,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { SelectedTariff, Icd10Item } from '@/data/discipline075';

interface ProviderProfile {
  id: string;
  full_name: string | null;
  practice_name: string | null;
  practice_number: string | null;
  email: string | null;
}

interface BureauLicenseRecord {
  id: string;
  practice_name: string;
  contact_email: string;
  license_key: string;
  plan_tier: string;
  status: 'active' | 'suspended' | 'expired';
  max_practitioners: number;
  expires_at: string | null;
}

interface OfficeCaseRecord {
  id: string;
  case_ref: string;
  client_id: string;
  bureau_license_id: string | null;
  patient_first_name: string;
  patient_surname: string;
  medical_aid_name: string | null;
  medical_aid_number: string | null;
  dependent_code: string | null;
  patient_cellphone: string | null;
  sticker_storage_path: string | null;
  service_date: string;
  facility_name: string | null;
  referring_surgeon: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  calculated_time_units: number;
  primary_icd10: string;
  primary_icd10_desc: string;
  secondary_icd10: Icd10Item[];
  tariffs: SelectedTariff[];
  clinical_notes: string | null;
  status: 'SUBMITTED' | 'QUERIED' | 'BILLED';
  office_query_note: string | null;
  billed_invoice_ref: string | null;
  created_at: string;
  provider?: ProviderProfile | ProviderProfile[] | null;
}

const PROVIDER_BADGE_STYLES = [
  'bg-cyan-500/15 text-cyan-300 border-cyan-400/40',
  'bg-indigo-500/15 text-indigo-300 border-indigo-400/40',
  'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
  'bg-amber-500/15 text-amber-300 border-amber-400/40',
  'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/40',
  'bg-sky-500/15 text-sky-300 border-sky-400/40',
];

function getProviderBadgeStyle(providerId: string): string {
  let hash = 0;
  for (let i = 0; i < providerId.length; i++) {
    hash = (hash * 31 + providerId.charCodeAt(i)) >>> 0;
  }
  return PROVIDER_BADGE_STYLES[hash % PROVIDER_BADGE_STYLES.length];
}

function normalizeProvider(raw: OfficeCaseRecord['provider']): ProviderProfile | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function BillingOfficeQueuePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Auth & Bureau Tenant State
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [clerkName, setClerkName] = useState<string>('Billing Clerk');
  const [bureauLicense, setBureauLicense] = useState<BureauLicenseRecord | null>(null);

  // Bureau Key Activation & Upgrade Modal
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [bureauKeyInput, setBureauKeyInput] = useState('');
  const [activatingKey, setActivatingKey] = useState(false);
  const [licenseFeedback, setLicenseFeedback] = useState<{
    type: 'ok' | 'err';
    msg: string;
  } | null>(null);
  const [checkoutTierLoading, setCheckoutTierLoading] = useState<string | null>(null);

  // Cases & Filters
  const [cases, setCases] = useState<OfficeCaseRecord[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'QUERIED' | 'BILLED'>('ALL');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Case Inspection Drawer / Panel
  const [activeCase, setActiveCase] = useState<OfficeCaseRecord | null>(null);
  const [stickerSignedUrl, setStickerSignedUrl] = useState<string | null>(null);
  const [stickerLoading, setStickerLoading] = useState(false);

  // Query & Mark Billed Actions
  const [queryInput, setQueryInput] = useState('');
  const [pmsAccountInput, setPmsAccountInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  }, []);

  // Fetch Cases Scoped to Active Bureau Tenant
  const fetchBureauCases = useCallback(
    async (bureauId: string | null) => {
      if (!bureauId) {
        setCases([]);
        setCasesLoading(false);
        return;
      }

      setCasesLoading(true);
      setCasesError(null);

      const { data, error } = await supabase
        .from('cases')
        .select(
          `
          id, case_ref, client_id, bureau_license_id,
          patient_first_name, patient_surname,
          medical_aid_name, medical_aid_number, dependent_code, patient_cellphone,
          sticker_storage_path, service_date, facility_name, referring_surgeon,
          start_time, end_time, duration_minutes, calculated_time_units,
          primary_icd10, primary_icd10_desc, secondary_icd10, tariffs,
          clinical_notes, status, office_query_note, billed_invoice_ref, created_at,
          provider:profiles!cases_client_id_profiles_fkey (
            id, full_name, practice_name, practice_number, email
          )
        `
        )
        .eq('bureau_license_id', bureauId)
        .order('created_at', { ascending: false })
        .limit(250);

      if (error) {
        setCasesError(error.message);
      } else {
        const typed = (data as unknown as OfficeCaseRecord[]) || [];
        setCases(typed);
        setActiveCase((prev) =>
          prev ? typed.find((item) => item.id === prev.id) ?? null : null
        );
      }
      setCasesLoading(false);
    },
    [supabase]
  );

  // Initialize Office Clerk Session & Bureau Tenant
  useEffect(() => {
    let active = true;

    async function initOfficeSession() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (userError || !user) {
          router.replace('/');
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email || '');

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, bureau_license_id')
          .eq('id', user.id)
          .maybeSingle();

        if (!active) return;

        if (profile && profile.role !== 'office' && profile.role !== 'admin') {
          router.replace('/capture');
          return;
        }

        setClerkName(profile?.full_name || user.email?.split('@')[0] || 'Billing Clerk');

        if (profile?.bureau_license_id) {
          const { data: licData } = await supabase
            .from('practice_licenses')
            .select('id, practice_name, contact_email, license_key, plan_tier, status, max_practitioners, expires_at')
            .eq('id', profile.bureau_license_id)
            .maybeSingle();

          if (!active) return;

          if (licData) {
            setBureauLicense(licData as BureauLicenseRecord);
            await fetchBureauCases(licData.id);
          } else {
            setLicenseModalOpen(true);
            setCasesLoading(false);
          }
        } else {
          setLicenseModalOpen(true);
          setCasesLoading(false);
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    initOfficeSession();
    return () => {
      active = false;
    };
  }, [fetchBureauCases, router, supabase]);

  // Realtime Subscription Scoped to This Bureau's Cases
  useEffect(() => {
    if (!bureauLicense?.id) return;

    const channel = supabase
      .channel(`bureau-queue-${bureauLicense.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases',
          filter: `bureau_license_id=eq.${bureauLicense.id}`,
        },
        () => {
          fetchBureauCases(bureauLicense.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bureauLicense?.id, fetchBureauCases, supabase]);

  // Load Signed URL for Hospital Sticker When Selecting a Case
  useEffect(() => {
    let active = true;

    async function loadStickerUrl() {
      if (!activeCase?.sticker_storage_path) {
        setStickerSignedUrl(null);
        return;
      }

      setStickerLoading(true);
      const { data, error } = await supabase.storage
        .from('stickers')
        .createSignedUrl(activeCase.sticker_storage_path, 3600);

      if (!active) return;
      setStickerSignedUrl(!error && data?.signedUrl ? data.signedUrl : null);
      setStickerLoading(false);
    }

    setQueryInput(activeCase?.office_query_note || '');
    setPmsAccountInput(activeCase?.billed_invoice_ref || '');
    loadStickerUrl();

    return () => {
      active = false;
    };
  }, [activeCase, supabase]);

  // Activate or Switch Bureau Office Licence Key
  async function handleActivateBureauKey(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    const cleaned = bureauKeyInput.trim().toUpperCase();
    if (!cleaned) return;

    setActivatingKey(true);
    setLicenseFeedback(null);

    const { data: lic, error } = await supabase
      .from('practice_licenses')
      .select('id, practice_name, contact_email, license_key, plan_tier, status, max_practitioners, expires_at')
      .eq('license_key', cleaned)
      .maybeSingle();

    if (error || !lic) {
      setActivatingKey(false);
      setLicenseFeedback({
        type: 'err',
        msg: 'Bureau licence key not found. Verify the MB-CTB key or purchase an Office package below.',
      });
      return;
    }

    const typedLic = lic as BureauLicenseRecord;

    if (typedLic.status === 'suspended') {
      setActivatingKey(false);
      setLicenseFeedback({
        type: 'err',
        msg: 'This Bureau licence is suspended. Contact MediBurgh support.',
      });
      return;
    }

    const allowedOfficeTiers = [
      'BUREAU_STARTER',
      'BUREAU_SCALE',
      'BUREAU_PAID',
      'FREE_COMP',
      'GROUP_PAID',
    ];
    if (!allowedOfficeTiers.includes(typedLic.plan_tier)) {
      setActivatingKey(false);
      setLicenseFeedback({
        type: 'err',
        msg: 'This is a single-practitioner key. Enter a Bureau Office key (BUREAU_STARTER / SCALE / ENTERPRISE) to unlock /queue.',
      });
      return;
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ bureau_license_id: typedLic.id })
      .eq('id', userId);

    setActivatingKey(false);

    if (profileErr) {
      setLicenseFeedback({ type: 'err', msg: profileErr.message });
      return;
    }

    setBureauLicense(typedLic);
    setBureauKeyInput('');
    setLicenseFeedback({
      type: 'ok',
      msg: `Connected to ${typedLic.practice_name} (${typedLic.plan_tier}).`,
    });
    await fetchBureauCases(typedLic.id);
    setTimeout(() => {
      setLicenseModalOpen(false);
      setLicenseFeedback(null);
    }, 900);
  }

  // Trigger PayFast Checkout for Billing Bureau Packages
  async function handleStartBureauCheckout(planTier: 'BUREAU_STARTER' | 'BUREAU_SCALE' | 'BUREAU_PAID') {
    setCheckoutTierLoading(planTier);
    try {
      const res = await fetch('/api/payfast/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier,
          practiceName: bureauLicense?.practice_name || `${clerkName} Billing Bureau`,
          contactEmail: userEmail,
          licenseKey: bureauLicense?.license_key || '',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.checkoutUrl) {
        alert(json.error || 'Could not start PayFast checkout.');
        return;
      }
      window.location.href = json.checkoutUrl;
    } finally {
      setCheckoutTierLoading(null);
    }
  }

  // Unique ClinTech Providers in This Bureau's Queue
  const providerList = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        practiceName: string;
        practiceNumber: string | null;
        totalCases: number;
        openCases: number;
      }
    >();

    for (const c of cases) {
      const prov = normalizeProvider(c.provider);
      const pid = prov?.id || c.client_id;
      const existing = map.get(pid);
      const isOpen = c.status !== 'BILLED';

      if (existing) {
        existing.totalCases += 1;
        if (isOpen) existing.openCases += 1;
      } else {
        map.set(pid, {
          id: pid,
          name: prov?.full_name || prov?.email || 'Unnamed ClinTech',
          practiceName: prov?.practice_name || 'Discipline 075',
          practiceNumber: prov?.practice_number || null,
          totalCases: 1,
          openCases: isOpen ? 1 : 0,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.openCases - a.openCases);
  }, [cases]);

  // Filtered Cases
  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return cases.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;

      const prov = normalizeProvider(c.provider);
      const pid = prov?.id || c.client_id;
      if (selectedProviderId !== 'ALL' && pid !== selectedProviderId) return false;

      if (!q) return true;

      const hay = [
        c.case_ref,
        c.patient_first_name,
        c.patient_surname,
        c.referring_surgeon,
        c.primary_icd10,
        c.billed_invoice_ref,
        prov?.full_name,
        prov?.practice_name,
        prov?.practice_number,
        ...(Array.isArray(c.tariffs) ? c.tariffs.map((t) => t.procedure_code) : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return hay.includes(q);
    });
  }, [cases, searchQuery, selectedProviderId, statusFilter]);

  // Status Counts
  const counts = useMemo(() => {
    return {
      all: cases.length,
      submitted: cases.filter((c) => c.status === 'SUBMITTED').length,
      queried: cases.filter((c) => c.status === 'QUERIED').length,
      billed: cases.filter((c) => c.status === 'BILLED').length,
    };
  }, [cases]);

  // Send Query to Practitioner
  async function handleSendQuery() {
    if (!activeCase || !userId) return;
    if (!queryInput.trim()) {
      alert('Enter a clear query note explaining what the ClinTech needs to fix.');
      return;
    }

    setActionLoading(true);
    const { error } = await supabase
      .from('cases')
      .update({
        status: 'QUERIED',
        office_query_note: queryInput.trim(),
      })
      .eq('id', activeCase.id);

    if (!error) {
      await supabase.from('case_audit_logs').insert({
        case_id: activeCase.id,
        actor_id: userId,
        action: 'CASE_QUERIED',
        details: { query_note: queryInput.trim() },
      });
      showToast(`Query sent to ClinTech for ${activeCase.case_ref}`);
      await fetchBureauCases(bureauLicense?.id ?? null);
    } else {
      alert(error.message);
    }
    setActionLoading(false);
  }

  // Mark Case Billed with PMS Account #
  async function handleMarkBilled() {
    if (!activeCase || !userId) return;
    if (!pmsAccountInput.trim()) {
      alert('Enter the PMS Account / Invoice Reference before marking as Billed.');
      return;
    }

    setActionLoading(true);
    const cleanRef = pmsAccountInput.trim().toUpperCase();

    const { error } = await supabase
      .from('cases')
      .update({
        status: 'BILLED',
        billed_invoice_ref: cleanRef,
        office_query_note: null,
      })
      .eq('id', activeCase.id);

    if (!error) {
      await supabase.from('case_audit_logs').insert({
        case_id: activeCase.id,
        actor_id: userId,
        action: 'CASE_BILLED',
        details: { pms_account_ref: cleanRef },
      });
      showToast(`Case ${activeCase.case_ref} marked BILLED (${cleanRef})`);
      await fetchBureauCases(bureauLicense?.id ?? null);
    } else {
      alert(error.message);
    }
    setActionLoading(false);
  }

  // Export PMS CSV Including ClinTech Provider Columns
  function handleExportPmsCsv() {
    if (filteredCases.length === 0) {
      alert('No cases in the current filter view to export.');
      return;
    }

    const headers = [
      'Case_Ref',
      'Status',
      'PMS_Account_Ref',
      'Service_Date',
      'ClinTech_Name',
      'ClinTech_Practice',
      'Practice_Number_075',
      'Patient_First_Name',
      'Patient_Surname',
      'Referring_Surgeon',
      'Start_Time',
      'End_Time',
      'Duration_Minutes',
      'Time_Units_30m',
      'Primary_ICD10',
      'Secondary_ICD10',
      'Tariff_Codes_And_Units',
      'Clinical_Notes',
    ];

    const rows = filteredCases.map((c) => {
      const prov = normalizeProvider(c.provider);
      const secIcds = Array.isArray(c.secondary_icd10)
        ? c.secondary_icd10.map((i) => i.code).join(';')
        : '';
      const tariffStr = Array.isArray(c.tariffs)
        ? c.tariffs.map((t) => `${t.procedure_code}x${t.units}`).join(';')
        : '';

      return [
        c.case_ref,
        c.status,
        c.billed_invoice_ref || '',
        c.service_date,
        prov?.full_name || '',
        prov?.practice_name || '',
        prov?.practice_number || '',
        c.patient_first_name,
        c.patient_surname,
        c.referring_surgeon,
        c.start_time?.slice(0, 5) || '',
        c.end_time?.slice(0, 5) || '',
        c.duration_minutes,
        c.calculated_time_units,
        c.primary_icd10,
        secIcds,
        tariffStr,
        (c.clinical_notes || '').replace(/\r?\n/g, ' '),
      ]
        .map(escapeCsvCell)
        .join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const providerSlug =
      selectedProviderId === 'ALL'
        ? 'all-clintechs'
        : (
            providerList.find((p) => p.id === selectedProviderId)?.name || 'provider'
          )
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');

    link.href = url;
    link.download = `clintechbills-pms-${providerSlug}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#08080B] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#00D2C6] font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>LOADING BILLING BUREAU DESK...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080B] text-[#F3F6FA] pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-[#00D2C6]/50 bg-[#0D1117] px-4 py-3 text-xs font-semibold text-[#9FF7F1] shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-[#00D2C6]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-[#232B38] bg-[#08080B]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/mediburgh-icon.png"
              alt="MediBurgh"
              className="h-9 w-9 rounded-lg border border-[#232B38] bg-[#0D1117] p-1 object-contain"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-[family-name:var(--font-montserrat)] text-sm sm:text-base font-extrabold tracking-wide text-white">
                  {bureauLicense?.practice_name || 'UNLINKED BILLING DESK'}
                </span>
                <span className="hidden sm:inline-flex items-center rounded border border-[#00D2C6]/35 bg-[#00D2C6]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#00D2C6]">
                  {bureauLicense ? bureauLicense.plan_tier : 'NO BUREAU KEY'}
                </span>
              </div>
              <p className="text-[11px] text-[#8B98AB]">
                Desk Operator: {clerkName} · Discipline 075 Bureau Queue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setLicenseModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#00D2C6]/40 bg-[#00D2C6]/10 px-3 py-2 text-xs font-bold text-[#00D2C6] hover:bg-[#00D2C6]/20 transition"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {bureauLicense ? 'Bureau Licence' : 'Activate Bureau Key'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportPmsCsv}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#00D2C6] px-3.5 py-2 text-xs font-extrabold text-[#08080B] hover:bg-[#00E5D8] transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export PMS CSV</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#232B38] bg-[#14181F] px-3 py-2 text-xs font-medium text-[#C5D0DF] hover:text-white transition"
            >
              <LogOut className="h-3.5 w-3.5 text-[#00D2C6]" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 space-y-6">
        {/* Unlinked Bureau Warning Banner */}
        {!bureauLicense && (
          <div className="rounded-2xl border border-amber-400/50 bg-amber-500/15 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-amber-200">
                  Activate Your Billing Bureau Office Licence
                </h2>
                <p className="text-xs text-amber-100/80 mt-0.5">
                  Connect your Bureau Office Key (`MB-CTB-XXXX-XXXX`) or subscribe to a
                  Bureau plan to unlock multi-ClinTech queue routing and PMS exports.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLicenseModalOpen(true)}
              className="rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-[#08080B] hover:bg-amber-300 shrink-0"
            >
              Activate or Buy Office Plan
            </button>
          </div>
        )}

        {/* ClinTech Provider Attribution Filter Strip */}
        <section className="rounded-2xl border border-[#232B38] bg-[#14181F] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
              <Users className="h-4 w-4 text-[#00D2C6]" />
              <span>ClinTech Providers ({providerList.length})</span>
            </div>
            <button
              type="button"
              onClick={() => fetchBureauCases(bureauLicense?.id ?? null)}
              className="inline-flex items-center gap-1.5 text-xs text-[#8B98AB] hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sync Queue</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedProviderId('ALL')}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                selectedProviderId === 'ALL'
                  ? 'border-[#00D2C6] bg-[#00D2C6]/15 text-[#00D2C6]'
                  : 'border-[#232B38] bg-[#0E1218] text-[#C5D0DF] hover:border-[#2C3545]'
              }`}
            >
              <span>All ClinTechs</span>
              <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px]">
                {cases.length}
              </span>
            </button>

            {providerList.map((prov) => {
              const active = selectedProviderId === prov.id;
              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setSelectedProviderId(prov.id)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'border-[#00D2C6] bg-[#00D2C6]/15 text-white'
                      : 'border-[#232B38] bg-[#0E1218] text-[#C5D0DF] hover:border-[#2C3545]'
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5 text-[#00D2C6]" />
                  <span>{prov.name}</span>
                  {prov.practiceNumber && (
                    <span className="font-mono text-[10px] text-[#8B98AB]">
                      ({prov.practiceNumber})
                    </span>
                  )}
                  <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-[#00D2C6]">
                    {prov.openCases} open / {prov.totalCases}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Status Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'ALL', label: 'All Cases', count: counts.all },
                { key: 'SUBMITTED', label: 'Ready to Bill', count: counts.submitted },
                { key: 'QUERIED', label: 'Queried', count: counts.queried },
                { key: 'BILLED', label: 'Billed', count: counts.billed },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                  statusFilter === tab.key
                    ? 'border-[#00D2C6] bg-[#00D2C6] text-[#08080B]'
                    : 'border-[#232B38] bg-[#14181F] text-[#C5D0DF] hover:text-white'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span className="font-mono text-[11px] opacity-80">({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="h-4 w-4 text-[#8B98AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, ref, ClinTech, 075 code..."
              className="w-full h-10 pl-10 pr-8 rounded-xl border border-[#232B38] bg-[#14181F] text-xs text-white placeholder-[#4E5B6E] focus:border-[#00D2C6] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B98AB] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Split Workspace: Case List + Case Inspection & Billing Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Cases List */}
          <div className="lg:col-span-7 space-y-3">
            {casesLoading ? (
              <div className="rounded-2xl border border-[#232B38] bg-[#14181F] p-10 text-center text-xs font-mono text-[#8B98AB]">
                Loading bureau queue...
              </div>
            ) : casesError ? (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-300">
                {casesError}
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="rounded-2xl border border-[#232B38] bg-[#14181F] p-10 text-center text-sm text-[#8B98AB]">
                No cases match the current ClinTech / status filter.
              </div>
            ) : (
              filteredCases.map((c) => {
                const prov = normalizeProvider(c.provider);
                const provId = prov?.id || c.client_id;
                const badgeStyle = getProviderBadgeStyle(provId);
                const isSelected = activeCase?.id === c.id;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCase(c)}
                    className={`w-full text-left rounded-2xl border p-4 transition space-y-2.5 ${
                      isSelected
                        ? 'border-[#00D2C6] bg-[#141C24] shadow-lg shadow-[#00D2C6]/10'
                        : 'border-[#232B38] bg-[#14181F] hover:border-[#2C3545]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#00D2C6]">
                          {c.case_ref}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${badgeStyle}`}
                        >
                          <UserCheck className="h-3 w-3" />
                          {prov?.full_name || 'ClinTech'}
                          {prov?.practice_number ? ` · ${prov.practice_number}` : ''}
                        </span>
                      </div>

                      <span
                        className={`rounded-lg px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                          c.status === 'BILLED'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : c.status === 'QUERIED'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-[#1D7AFC]/15 text-[#7FB3FF] border border-[#1D7AFC]/30'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <span className="text-base font-bold text-white">
                          {c.patient_first_name} {c.patient_surname}
                        </span>
                        <span className="ml-2 text-xs text-[#8B98AB]">
                          · Surgeon: {c.referring_surgeon}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-[#8B98AB]">
                        {c.service_date} ({c.duration_minutes}m)
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-[#0E1218] border border-[#232B38] px-2 py-0.5 font-mono text-[11px] text-[#E2E8F0]">
                        ICD: {c.primary_icd10}
                      </span>
                      {Array.isArray(c.tariffs) &&
                        c.tariffs.map((t) => (
                          <span
                            key={t.procedure_code}
                            className="rounded bg-[#00D2C6]/10 border border-[#00D2C6]/25 px-2 py-0.5 font-mono text-[11px] text-[#00D2C6]"
                          >
                            {t.procedure_code} ×{t.units}
                          </span>
                        ))}
                      {c.billed_invoice_ref && (
                        <span className="ml-auto rounded bg-emerald-500/15 border border-emerald-400/40 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
                          PMS: {c.billed_invoice_ref}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Active Case Workbench */}
          <div className="lg:col-span-5 lg:sticky lg:top-20">
            {!activeCase ? (
              <div className="rounded-2xl border border-[#232B38] bg-[#14181F] p-8 text-center space-y-2">
                <FileSpreadsheet className="h-8 w-8 text-[#00D2C6] mx-auto opacity-80" />
                <h3 className="text-sm font-bold text-white">
                  Select a Case from the Queue
                </h3>
                <p className="text-xs text-[#8B98AB]">
                  Inspect the hospital sticker, verify Discipline 075 time units, send a
                  query to the ClinTech, or capture the PMS Account #.
                </p>
              </div>
            ) : (
              (() => {
                const prov = normalizeProvider(activeCase.provider);
                const provId = prov?.id || activeCase.client_id;

                return (
                  <div className="rounded-2xl border border-[#2C3545] bg-[#14181F] p-5 space-y-5 shadow-2xl">
                    {/* Provider Attribution Header */}
                    <div className="rounded-xl border border-[#232B38] bg-[#0E1218] p-3.5 space-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] block">
                        Submitting Clinical Technologist (075)
                      </span>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-white">
                            {prov?.full_name || 'ClinTech Practitioner'}
                          </p>
                          <p className="text-xs text-[#8B98AB]">
                            {prov?.practice_name || 'Clinical Technology (075)'}
                            {prov?.practice_number
                              ? ` · Pr No: ${prov.practice_number}`
                              : ''}
                          </p>
                        </div>
                        <span
                          className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${getProviderBadgeStyle(
                            provId
                          )}`}
                        >
                          {activeCase.case_ref}
                        </span>
                      </div>
                    </div>

                    {/* Hospital Sticker Preview */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#00D2C6]">
                          <ImageIcon className="h-3.5 w-3.5" />
                          Hospital Patient Sticker
                        </span>
                        {stickerSignedUrl && (
                          <a
                            href={stickerSignedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#00D2C6] hover:underline"
                          >
                            <span>Open Full Size</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      {stickerLoading ? (
                        <div className="h-40 rounded-xl bg-[#0E1218] border border-[#232B38] flex items-center justify-center text-xs text-[#8B98AB]">
                          Decrypting sticker...
                        </div>
                      ) : stickerSignedUrl ? (
                        <div className="overflow-hidden rounded-xl border border-[#232B38] bg-[#0E1218]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={stickerSignedUrl}
                            alt="Patient hospital sticker"
                            className="max-h-60 w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-[#232B38] bg-[#0E1218] p-4 text-xs text-[#8B98AB]">
                          No sticker image attached to this case.
                        </div>
                      )}
                    </div>

                    {/* Case Clinical Summary */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="rounded-xl bg-[#0E1218] border border-[#232B38] p-3">
                        <span className="text-[10px] font-mono uppercase text-[#8B98AB] block">
                          Patient
                        </span>
                        <span className="font-bold text-white">
                          {activeCase.patient_first_name} {activeCase.patient_surname}
                        </span>
                      </div>
                      <div className="rounded-xl bg-[#0E1218] border border-[#232B38] p-3">
                        <span className="text-[10px] font-mono uppercase text-[#8B98AB] block">
                          Surgeon &amp; Date
                        </span>
                        <span className="font-bold text-white">
                          {activeCase.referring_surgeon}
                        </span>
                        <span className="block text-[11px] text-[#8B98AB]">
                          {activeCase.service_date}
                        </span>
                      </div>
                      <div className="rounded-xl bg-[#0E1218] border border-[#232B38] p-3">
                        <span className="text-[10px] font-mono uppercase text-[#8B98AB] block">
                          Theatre Time
                        </span>
                        <span className="font-mono font-bold text-[#00D2C6]">
                          {activeCase.start_time?.slice(0, 5)} –{' '}
                          {activeCase.end_time?.slice(0, 5)}
                        </span>
                        <span className="block text-[11px] text-[#8B98AB]">
                          {activeCase.duration_minutes}m ·{' '}
                          {activeCase.calculated_time_units} × 30m units
                        </span>
                      </div>
                      <div className="rounded-xl bg-[#0E1218] border border-[#232B38] p-3">
                        <span className="text-[10px] font-mono uppercase text-[#8B98AB] block">
                          Primary ICD-10
                        </span>
                        <span className="font-mono font-bold text-white">
                          {activeCase.primary_icd10}
                        </span>
                        <span className="block text-[11px] text-[#8B98AB] truncate">
                          {activeCase.primary_icd10_desc}
                        </span>
                      </div>
                    </div>

                    {/* Tariffs & Notes */}
                    <div className="space-y-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#8B98AB] block">
                        Discipline 075 Tariffs
                      </span>
                      <div className="space-y-1.5">
                        {Array.isArray(activeCase.tariffs) &&
                          activeCase.tariffs.map((t) => (
                            <div
                              key={t.procedure_code}
                              className="flex items-center justify-between rounded-lg bg-[#0E1218] border border-[#232B38] px-3 py-2 text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-mono font-bold text-[#00D2C6] mr-2">
                                  {t.procedure_code}
                                </span>
                                <span className="text-[#C5D0DF]">
                                  {t.procedure_description}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-white shrink-0">
                                ×{t.units}
                              </span>
                            </div>
                          ))}
                      </div>

                      {activeCase.clinical_notes && (
                        <div className="rounded-xl bg-[#0E1218] border border-[#232B38] p-3 text-xs text-[#C5D0DF]">
                          <span className="font-mono text-[10px] uppercase text-[#8B98AB] block mb-1">
                            ClinTech Notes / Query Replies
                          </span>
                          <p className="whitespace-pre-line">{activeCase.clinical_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Action 1: Send Query to ClinTech */}
                    <div className="border-t border-[#232B38] pt-4 space-y-2">
                      <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-amber-300">
                        <MessageSquareWarning className="h-3.5 w-3.5" />
                        Query ClinTech (Returns Case to Mobile App)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={queryInput}
                          onChange={(e) => setQueryInput(e.target.value)}
                          placeholder="e.g. Dependent code cropped on sticker — please confirm"
                          className="flex-1 h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 text-xs text-white placeholder-[#4E5B6E] focus:border-amber-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={handleSendQuery}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-3.5 text-xs font-extrabold text-[#08080B] disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Query</span>
                        </button>
                      </div>
                    </div>

                    {/* Action 2: Capture PMS Account # & Mark Billed */}
                    <div className="border-t border-[#232B38] pt-4 space-y-2">
                      <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-emerald-300">
                        <Hash className="h-3.5 w-3.5" />
                        PMS Account / Invoice Reference
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={pmsAccountInput}
                          onChange={(e) =>
                            setPmsAccountInput(e.target.value.toUpperCase())
                          }
                          placeholder="e.g. GX-88412"
                          className="flex-1 h-10 rounded-xl border border-[#232B38] bg-[#0E1218] px-3 font-mono text-xs uppercase text-white placeholder-[#4E5B6E] focus:border-emerald-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={handleMarkBilled}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 px-4 text-xs font-extrabold text-[#08080B] disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Mark Billed</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </main>

      {/* Bureau Office Licence Activation & PayFast Purchase Modal */}
      {licenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[#2C3545] bg-[#14181F] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#232B38] pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#00D2C6]" />
                <h3 className="font-[family-name:var(--font-montserrat)] text-base font-bold text-white">
                  Billing Bureau Office Licence
                </h3>
              </div>
              {bureauLicense && (
                <button
                  type="button"
                  onClick={() => setLicenseModalOpen(false)}
                  className="rounded-lg p-1 text-[#8B98AB] hover:bg-[#1B212B] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Option A: Enter Issued Bureau Key */}
            <form onSubmit={handleActivateBureauKey} className="space-y-3">
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#8B98AB]">
                Already Have a Bureau Key? Enter Below
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="MB-CTB-XXXX-XXXX"
                  value={bureauKeyInput}
                  onChange={(e) => setBureauKeyInput(e.target.value.toUpperCase())}
                  className="flex-1 h-11 rounded-xl border border-[#232B38] bg-[#0E1218] px-3.5 font-mono text-sm uppercase tracking-wider text-white placeholder-[#4E5B6E] focus:border-[#00D2C6] focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={activatingKey}
                  className="rounded-xl bg-[#00D2C6] px-4 text-xs font-extrabold text-[#08080B] hover:bg-[#00E5D8] disabled:opacity-50"
                >
                  {activatingKey ? 'Linking...' : 'Link Desk'}
                </button>
              </div>
              {bureauLicense && (
                <p className="text-[11px] text-[#8B98AB]">
                  Current Bureau:{' '}
                  <span className="font-bold text-white">
                    {bureauLicense.practice_name}
                  </span>{' '}
                  · Key:{' '}
                  <span className="font-mono text-[#00D2C6]">
                    {bureauLicense.license_key}
                  </span>
                </p>
              )}
              {licenseFeedback && (
                <p
                  className={`text-xs ${
                    licenseFeedback.type === 'ok'
                      ? 'text-emerald-300'
                      : 'text-rose-300'
                  }`}
                >
                  {licenseFeedback.msg}
                </p>
              )}
            </form>

            {/* Option B: Purchase a Bureau Office Plan via PayFast */}
            <div className="border-t border-[#232B38] pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#00D2C6]">
                  Or Subscribe as a Billing Company (PayFast ZAR)
                </span>
                <ShieldCheck className="h-4 w-4 text-[#00D2C6]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    tier: 'BUREAU_STARTER' as const,
                    name: 'Bureau Starter',
                    price: 'R1,950/mo',
                    seats: 'Up to 5 ClinTechs + 3 Clerks',
                  },
                  {
                    tier: 'BUREAU_SCALE' as const,
                    name: 'Bureau Scale',
                    price: 'R3,450/mo',
                    seats: 'Up to 15 ClinTechs + 10 Clerks',
                  },
                  {
                    tier: 'BUREAU_PAID' as const,
                    name: 'Bureau Enterprise',
                    price: 'R5,950/mo',
                    seats: 'Up to 35 ClinTechs + Unlimited Clerks',
                  },
                ].map((pkg) => (
                  <div
                    key={pkg.tier}
                    className="rounded-xl border border-[#232B38] bg-[#0E1218] p-3.5 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{pkg.name}</p>
                      <p className="mt-1 font-mono text-sm font-extrabold text-[#00D2C6]">
                        {pkg.price}
                      </p>
                      <p className="mt-1 text-[11px] text-[#8B98AB]">{pkg.seats}</p>
                    </div>
                    <button
                      type="button"
                      disabled={checkoutTierLoading !== null}
                      onClick={() => handleStartBureauCheckout(pkg.tier)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00D2C6]/15 hover:bg-[#00D2C6] border border-[#00D2C6]/40 py-2 text-[11px] font-extrabold text-[#00D2C6] hover:text-[#08080B] transition disabled:opacity-50"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>
                        {checkoutTierLoading === pkg.tier
                          ? 'Redirecting...'
                          : 'Subscribe'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}