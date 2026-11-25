'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Hash,
  History,
  Image as ImageIcon,
  Loader2,
  LogOut,
  MessageSquare,
  MessageSquareWarning,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Square,
  Stethoscope,
  X,
  ZoomIn,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Icd10Item, SelectedTariff } from '@/data/discipline075';

interface OfficeCaseRecord {
  id: string;
  case_ref: string;
  client_id: string;
  patient_first_name: string;
  patient_surname: string;
  sticker_storage_path: string | null;
  service_date: string;
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
  billed_at: string | null;
  created_at: string;
}

interface PractitionerProfile {
  id: string;
  full_name: string;
  practice_name: string;
  email: string;
}

interface AuditLogEntry {
  id: string;
  case_id: string;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

type StatusFilter = 'ALL' | 'SUBMITTED' | 'QUERIED' | 'BILLED';
type InspectorTab = 'CODING' | 'AUDIT';

const QUICK_QUERY_TEMPLATES = [
  'Sticker blurry — please re-upload clear photo',
  'Confirm medical aid dependent code (00/01)',
  'Verify theatre start & end times',
  'Confirm primary ICD-10 diagnosis code',
];

function splitNotesAndResolution(rawNotes: string | null): {
  baseNotes: string;
  resolutionReplies: string[];
} {
  if (!rawNotes) return { baseNotes: '', resolutionReplies: [] };
  const lines = rawNotes.split('\n');
  const baseLines: string[] = [];
  const replies: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[Query Reply:') && trimmed.endsWith(']')) {
      replies.push(trimmed.slice('[Query Reply:'.length, -1).trim());
    } else if (trimmed.length > 0) {
      baseLines.push(line);
    }
  }

  return {
    baseNotes: baseLines.join('\n').trim(),
    resolutionReplies: replies,
  };
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

  // Auth & Role Guard State
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffEmail, setStaffEmail] = useState<string>('');
  const [staffName, setStaffName] = useState<string>('Billing Officer');
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [promotingRole, setPromotingRole] = useState(false);

  // Queue Data
  const [cases, setCases] = useState<OfficeCaseRecord[]>([]);
  const [resubmittedCaseIds, setResubmittedCaseIds] = useState<Set<string>>(new Set());
  const [profilesMap, setProfilesMap] = useState<Record<string, PractitionerProfile>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters, Date Range & Batch Selection
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('SUBMITTED');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [batchCopied, setBatchCopied] = useState(false);

  // Active Case Split-View Modal State
  const [activeCase, setActiveCase] = useState<OfficeCaseRecord | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('CODING');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [stickerSignedUrl, setStickerSignedUrl] = useState<string | null>(null);
  const [stickerLoading, setStickerLoading] = useState(false);
  const [stickerRotation, setStickerRotation] = useState(0);
  const [stickerZoomed, setStickerZoomed] = useState(false);

  // Office Reconciliation Inputs
  const [invoiceRefInput, setInvoiceRefInput] = useState('');
  const [queryNoteInput, setQueryNoteInput] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [copiedCaseId, setCopiedCaseId] = useState<string | null>(null);
  const [copiedPmsId, setCopiedPmsId] = useState<string | null>(null);

  const loadQueueData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setErrorMsg(null);

      try {
        const [casesRes, profilesRes, resubRes] = await Promise.all([
          supabase
            .from('cases')
            .select(
              'id, case_ref, client_id, patient_first_name, patient_surname, sticker_storage_path, service_date, referring_surgeon, start_time, end_time, duration_minutes, calculated_time_units, primary_icd10, primary_icd10_desc, secondary_icd10, tariffs, clinical_notes, status, office_query_note, billed_invoice_ref, billed_at, created_at'
            )
            .order('created_at', { ascending: false })
            .limit(400),
          supabase.from('profiles').select('id, full_name, practice_name, email'),
          supabase
            .from('case_audit_logs')
            .select('case_id')
            .eq('action', 'CASE_RESUBMITTED')
            .limit(500),
        ]);

        if (casesRes.error) {
          setErrorMsg(casesRes.error.message);
        } else {
          setCases((casesRes.data as OfficeCaseRecord[]) || []);
        }

        if (profilesRes.data) {
          const map: Record<string, PractitionerProfile> = {};
          for (const p of profilesRes.data as PractitionerProfile[]) {
            map[p.id] = p;
          }
          setProfilesMap(map);
        }

        if (resubRes.data) {
          const ids = new Set<string>(
            (resubRes.data as Array<{ case_id: string }>).map((row) => row.case_id)
          );
          setResubmittedCaseIds(ids);
        }
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Unexpected error loading office queue.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supabase]
  );

  // 1. Authenticate Office / Admin Session
  useEffect(() => {
    let active = true;

    async function initOfficeSession() {
      setAuthLoading(true);
      setAuthError(null);

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

        setStaffId(user.id);
        setStaffEmail(user.email || '');

        const metaRole =
          typeof user.user_metadata?.role === 'string'
            ? user.user_metadata.role
            : null;
        const fallbackName =
          (typeof user.user_metadata?.full_name === 'string' &&
            user.user_metadata.full_name) ||
          user.email?.split('@')[0] ||
          'Billing Officer';

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .maybeSingle();

        if (!active) return;

        if (profileError) {
          setAuthError(`Profile lookup error: ${profileError.message}`);
          setCurrentRole(metaRole || 'unknown');
          return;
        }

        let resolvedRole = profile?.role || metaRole || 'client';

        if (!profile) {
          const initialRole =
            metaRole === 'office' || metaRole === 'admin' ? metaRole : 'client';
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email ?? '',
            full_name: fallbackName,
            practice_name: 'MediBurgh Billing Office',
            role: initialRole,
          });
          resolvedRole = initialRole;
        } else if (
          profile.role === 'client' &&
          (metaRole === 'office' || metaRole === 'admin')
        ) {
          await supabase
            .from('profiles')
            .update({ role: metaRole })
            .eq('id', user.id);
          resolvedRole = metaRole;
        }

        setStaffName(profile?.full_name || fallbackName);
        setCurrentRole(resolvedRole);

        if (resolvedRole === 'office' || resolvedRole === 'admin') {
          await loadQueueData(false);
        }
      } catch (err) {
        if (!active) return;
        setAuthError(
          err instanceof Error
            ? err.message
            : 'Failed to initialise billing office session.'
        );
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    initOfficeSession();
    return () => {
      active = false;
    };
  }, [loadQueueData, router, supabase]);

  // 2. Realtime Subscription for Live Case Updates
  useEffect(() => {
    if (!staffId || (currentRole !== 'office' && currentRole !== 'admin')) {
      return;
    }

    const channel = supabase
      .channel('office-cases-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        () => {
          loadQueueData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRole, loadQueueData, staffId, supabase]);

  async function handlePromoteToOffice() {
    if (!staffId) return;
    setPromotingRole(true);
    setAuthError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'office' })
        .eq('id', staffId);

      if (error) {
        setAuthError(`Could not update role: ${error.message}`);
        return;
      }

      setCurrentRole('office');
      await loadQueueData(false);
    } finally {
      setPromotingRole(false);
    }
  }

  async function openCaseInspector(record: OfficeCaseRecord) {
    setActiveCase(record);
    setInspectorTab('CODING');
    setInvoiceRefInput(record.billed_invoice_ref || '');
    setQueryNoteInput(record.office_query_note || '');
    setActionFeedback(null);
    setStickerRotation(0);
    setStickerZoomed(false);
    setStickerSignedUrl(null);
    setAuditLogs([]);

    if (record.sticker_storage_path) {
      setStickerLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from('stickers')
          .createSignedUrl(record.sticker_storage_path, 3600);

        if (!error && data?.signedUrl) {
          setStickerSignedUrl(data.signedUrl);
        }
      } finally {
        setStickerLoading(false);
      }
    }

    setAuditLoading(true);
    try {
      const { data: logs } = await supabase
        .from('case_audit_logs')
        .select('id, case_id, actor_id, action, details, created_at')
        .eq('case_id', record.id)
        .order('created_at', { ascending: false });

      if (logs) {
        setAuditLogs(logs as AuditLogEntry[]);
      }
    } finally {
      setAuditLoading(false);
    }
  }

  async function handleCopyPmsNumber(caseId: string, pmsRef: string) {
    await navigator.clipboard.writeText(pmsRef);
    setCopiedPmsId(caseId);
    setTimeout(() => setCopiedPmsId(null), 2000);
  }

  function formatSingleCaseSummary(record: OfficeCaseRecord): string {
    const practitioner = profilesMap[record.client_id];
    const secondaryList = Array.isArray(record.secondary_icd10)
      ? record.secondary_icd10.map((i) => `${i.code} (${i.description})`).join(', ')
      : '';
    const tariffList = Array.isArray(record.tariffs)
      ? record.tariffs
          .map((t) => `${t.procedure_code} x${t.units} - ${t.procedure_description}`)
          .join('\n')
      : '';

    return [
      `REF: ${record.case_ref}`,
      record.billed_invoice_ref ? `PMS ACCOUNT #: ${record.billed_invoice_ref}` : null,
      `PATIENT: ${record.patient_first_name} ${record.patient_surname}`,
      `DATE: ${record.service_date} | TIME: ${record.start_time?.slice(0, 5)} - ${record.end_time?.slice(0, 5)} (${record.duration_minutes} min / ${record.calculated_time_units} x 30m units)`,
      `SURGEON: ${record.referring_surgeon}`,
      `PRACTITIONER: ${practitioner?.full_name ?? 'Clinical Technologist'}`,
      `PRIMARY ICD-10: ${record.primary_icd10} - ${record.primary_icd10_desc}`,
      secondaryList ? `SECONDARY ICD-10: ${secondaryList}` : null,
      `DISCIPLINE 075 PROCEDURES:\n${tariffList}`,
      record.clinical_notes ? `NOTES: ${record.clinical_notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  async function copyCaseSummary(record: OfficeCaseRecord) {
    await navigator.clipboard.writeText(formatSingleCaseSummary(record));
    setCopiedCaseId(record.id);
    setTimeout(() => setCopiedCaseId(null), 2000);
  }

  async function handleMarkAsBilled() {
    if (!activeCase || !staffId) return;
    if (!invoiceRefInput.trim()) {
      setActionFeedback('Enter the PMS Account Number / Invoice Ref first.');
      return;
    }

    setActionSubmitting(true);
    setActionFeedback(null);

    try {
      const nowIso = new Date().toISOString();
      const cleanRef = invoiceRefInput.trim();

      const { error } = await supabase
        .from('cases')
        .update({
          status: 'BILLED',
          billed_invoice_ref: cleanRef,
          billed_by: staffId,
          billed_at: nowIso,
          office_query_note: null,
        })
        .eq('id', activeCase.id);

      if (error) {
        setActionFeedback(`Update failed: ${error.message}`);
        return;
      }

      await supabase.from('case_audit_logs').insert({
        case_id: activeCase.id,
        actor_id: staffId,
        action: 'MARKED_BILLED',
        details: { billed_invoice_ref: cleanRef },
      });

      setActiveCase(null);
      await loadQueueData(true);
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleSendQuery() {
    if (!activeCase || !staffId) return;
    if (!queryNoteInput.trim()) {
      setActionFeedback('Enter a note explaining what the practitioner needs to clarify.');
      return;
    }

    setActionSubmitting(true);
    setActionFeedback(null);

    try {
      const cleanNote = queryNoteInput.trim();

      const { error } = await supabase
        .from('cases')
        .update({
          status: 'QUERIED',
          office_query_note: cleanNote,
        })
        .eq('id', activeCase.id);

      if (error) {
        setActionFeedback(`Query failed: ${error.message}`);
        return;
      }

      await supabase.from('case_audit_logs').insert({
        case_id: activeCase.id,
        actor_id: staffId,
        action: 'QUERIED_PRACTITIONER',
        details: { note: cleanNote },
      });

      setActiveCase(null);
      await loadQueueData(true);
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  const counts = useMemo(() => {
    return {
      ALL: cases.length,
      SUBMITTED: cases.filter((c) => c.status === 'SUBMITTED').length,
      QUERIED: cases.filter((c) => c.status === 'QUERIED').length,
      BILLED: cases.filter((c) => c.status === 'BILLED').length,
    };
  }, [cases]);

  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cases.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (dateFrom && c.service_date < dateFrom) return false;
      if (dateTo && c.service_date > dateTo) return false;
      if (!q) return true;
      const practName = profilesMap[c.client_id]?.full_name?.toLowerCase() ?? '';
      return (
        c.case_ref.toLowerCase().includes(q) ||
        (c.billed_invoice_ref && c.billed_invoice_ref.toLowerCase().includes(q)) ||
        c.patient_first_name.toLowerCase().includes(q) ||
        c.patient_surname.toLowerCase().includes(q) ||
        c.referring_surgeon.toLowerCase().includes(q) ||
        c.primary_icd10.toLowerCase().includes(q) ||
        practName.includes(q) ||
        (Array.isArray(c.tariffs) &&
          c.tariffs.some((t) => t.procedure_code.toLowerCase().includes(q)))
      );
    });
  }, [cases, dateFrom, dateTo, profilesMap, searchQuery, statusFilter]);

  function toggleSelectCase(id: string) {
    setSelectedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    const allSelected =
      filteredCases.length > 0 &&
      filteredCases.every((c) => selectedCaseIds.has(c.id));

    if (allSelected) {
      setSelectedCaseIds(new Set());
    } else {
      setSelectedCaseIds(new Set(filteredCases.map((c) => c.id)));
    }
  }

  function getTargetExportCases(): OfficeCaseRecord[] {
    if (selectedCaseIds.size > 0) {
      return filteredCases.filter((c) => selectedCaseIds.has(c.id));
    }
    return filteredCases;
  }

  async function handleCopyBatchSummaries() {
    const targets = getTargetExportCases();
    if (targets.length === 0) return;
    const combined = targets
      .map((c) => formatSingleCaseSummary(c))
      .join('\n\n----------------------------------------\n\n');
    await navigator.clipboard.writeText(combined);
    setBatchCopied(true);
    setTimeout(() => setBatchCopied(false), 2000);
  }

  function handleExportPmsCsv() {
    const targets = getTargetExportCases();
    if (targets.length === 0) return;

    const headers = [
      'Case Ref',
      'PMS Account #',
      'Status',
      'Service Date',
      'Patient First Name',
      'Patient Surname',
      'Referring Surgeon',
      'Clinical Technologist',
      'Start Time',
      'End Time',
      'Duration (Mins)',
      '30-Min Units',
      'Primary ICD-10',
      'Primary ICD-10 Description',
      'Secondary ICD-10s',
      'Discipline 075 Tariffs',
      'Notes & Query Replies',
      'Billed At',
    ];

    const rows = targets.map((c) => {
      const pract = profilesMap[c.client_id]?.full_name ?? '';
      const secIcds = Array.isArray(c.secondary_icd10)
        ? c.secondary_icd10.map((s) => s.code).join('; ')
        : '';
      const tariffsFormatted = Array.isArray(c.tariffs)
        ? c.tariffs.map((t) => `${t.procedure_code} x${t.units}`).join('; ')
        : '';

      return [
        c.case_ref,
        c.billed_invoice_ref ?? '',
        c.status,
        c.service_date,
        c.patient_first_name,
        c.patient_surname,
        c.referring_surgeon,
        pract,
        c.start_time?.slice(0, 5) ?? '',
        c.end_time?.slice(0, 5) ?? '',
        c.duration_minutes,
        c.calculated_time_units,
        c.primary_icd10,
        c.primary_icd10_desc,
        secIcds,
        tariffsFormatted,
        (c.clinical_notes ?? '').replace(/\n/g, ' | '),
        c.billed_at ? new Date(c.billed_at).toLocaleString('en-ZA') : '',
      ]
        .map(escapeCsvCell)
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `ClinTechBills_075_${statusFilter}_${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#090B0E] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#00D2C6] font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>LOADING BILLING OFFICE WORKSPACE...</span>
        </div>
      </div>
    );
  }

  if (currentRole !== 'office' && currentRole !== 'admin') {
    return (
      <div className="min-h-screen bg-[#090B0E] text-[#F3F6FA] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-[#14181F] border border-[#2C3545] rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
                Role Verification
              </p>
              <h1 className="font-[family-name:var(--font-montserrat)] text-xl font-bold text-white">
                Billing Office Access Required
              </h1>
            </div>
          </div>

          <p className="text-sm text-[#C5D0DF] leading-relaxed">
            You are signed in as{' '}
            <span className="font-mono text-white">{staffEmail || 'current user'}</span>{' '}
            with profile role{' '}
            <span className="px-2 py-0.5 rounded bg-[#0E1218] border border-[#232B38] font-mono text-xs text-[#00D2C6]">
              {currentRole || 'client'}
            </span>
            . Only <span className="font-mono text-white">office</span> or{' '}
            <span className="font-mono text-white">admin</span> accounts can view the
            billing queue.
          </p>

          {authError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-xs text-red-200">
              {authError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.push('/capture')}
              className="flex-1 h-11 px-4 rounded-xl bg-[#00D2C6] hover:bg-[#00E5D8] text-[#090B0E] font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-2 transition"
            >
              <span>Open Practitioner Capture</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={promotingRole}
              onClick={handlePromoteToOffice}
              className="flex-1 h-11 px-4 rounded-xl bg-[#1D7AFC]/20 hover:bg-[#1D7AFC]/30 border border-[#1D7AFC]/40 text-[#9CC4FF] font-semibold text-xs inline-flex items-center justify-center gap-2 transition"
            >
              {promotingRole ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>Switch My Account to Office</span>
            </button>
          </div>

          <div className="pt-3 border-t border-[#232B38] flex items-center justify-between text-xs text-[#8B98AB]">
            <span>Signed in with the wrong email?</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-[#00D2C6] hover:underline font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allFilteredSelected =
    filteredCases.length > 0 &&
    filteredCases.every((c) => selectedCaseIds.has(c.id));

  return (
    <div className="min-h-screen bg-[#090B0E] text-[#F3F6FA] pb-16">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#090B0E]/90 backdrop-blur-md border-b border-[#232B38]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/mediburgh-icon.png"
              alt="MediBurgh Icon"
              className="w-9 h-9 rounded-lg object-contain bg-[#0E1218] p-1 border border-[#232B38] shadow-lg shadow-[#00D2C6]/15"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-[family-name:var(--font-montserrat)] font-extrabold tracking-wide text-sm sm:text-base text-white">
                  CLINTECH<span className="text-[#00D2C6]">BILLS</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1D7AFC]/15 text-[#7FB3FF] border border-[#1D7AFC]/35">
                  BILLING OFFICE
                </span>
              </div>
              <p className="text-[11px] text-[#8B98AB] truncate max-w-[220px] sm:max-w-sm">
                {staffName} · Discipline 075 Queue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPmsCsv}
              disabled={filteredCases.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 border border-emerald-400/40 text-xs font-bold text-emerald-200 transition"
              title="Export visible or selected cases to CSV for PMS reconciliation"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>
                Export PMS CSV
                {selectedCaseIds.size > 0 ? ` (${selectedCaseIds.size})` : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={() => loadQueueData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#14181F] hover:bg-[#1B212B] border border-[#232B38] text-xs font-medium text-[#C5D0DF] hover:text-white transition"
              title="Refresh Queue"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#00D2C6] ${refreshing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#14181F] hover:bg-[#1B212B] border border-[#232B38] text-xs font-medium text-[#C5D0DF] hover:text-white transition"
            >
              <LogOut className="w-3.5 h-3.5 text-[#00D2C6]" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI Filter Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setStatusFilter('SUBMITTED')}
            className={`p-4 rounded-2xl border text-left transition ${
              statusFilter === 'SUBMITTED'
                ? 'bg-[#14181F] border-[#00D2C6]'
                : 'bg-[#14181F]/70 border-[#232B38] hover:border-[#2C3545]'
            }`}
          >
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B98AB]">
              Ready to Bill
            </span>
            <p className="font-[family-name:var(--font-montserrat)] text-2xl font-extrabold text-[#00D2C6] mt-1">
              {counts.SUBMITTED}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('QUERIED')}
            className={`p-4 rounded-2xl border text-left transition ${
              statusFilter === 'QUERIED'
                ? 'bg-[#14181F] border-amber-400'
                : 'bg-[#14181F]/70 border-[#232B38] hover:border-[#2C3545]'
            }`}
          >
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B98AB]">
              Queried
            </span>
            <p className="font-[family-name:var(--font-montserrat)] text-2xl font-extrabold text-amber-300 mt-1">
              {counts.QUERIED}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('BILLED')}
            className={`p-4 rounded-2xl border text-left transition ${
              statusFilter === 'BILLED'
                ? 'bg-[#14181F] border-emerald-400'
                : 'bg-[#14181F]/70 border-[#232B38] hover:border-[#2C3545]'
            }`}
          >
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B98AB]">
              Billed &amp; Invoiced
            </span>
            <p className="font-[family-name:var(--font-montserrat)] text-2xl font-extrabold text-emerald-300 mt-1">
              {counts.BILLED}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`p-4 rounded-2xl border text-left transition ${
              statusFilter === 'ALL'
                ? 'bg-[#14181F] border-[#1D7AFC]'
                : 'bg-[#14181F]/70 border-[#232B38] hover:border-[#2C3545]'
            }`}
          >
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8B98AB]">
              All Cases
            </span>
            <p className="font-[family-name:var(--font-montserrat)] text-2xl font-extrabold text-white mt-1">
              {counts.ALL}
            </p>
          </button>
        </div>

        {/* Search, Service Date Range & Batch Action Bar */}
        <div className="bg-[#14181F] border border-[#232B38] rounded-2xl p-4 space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8B98AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, PMS account #, case ref (CT-...), surgeon, ICD-10 or 75xxx..."
                className="w-full h-10 pl-10 pr-8 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B98AB] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Service Date Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 h-10 rounded-xl bg-[#0E1218] border border-[#232B38] text-xs">
                <Calendar className="w-3.5 h-3.5 text-[#00D2C6]" />
                <span className="font-mono text-[10px] text-[#8B98AB]">FROM</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent font-mono text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 px-2.5 h-10 rounded-xl bg-[#0E1218] border border-[#232B38] text-xs">
                <span className="font-mono text-[10px] text-[#8B98AB]">TO</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent font-mono text-xs text-white focus:outline-none"
                />
              </div>

              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="h-10 px-3 rounded-xl bg-[#0E1218] hover:bg-[#1B212B] border border-[#232B38] text-xs text-[#8B98AB] hover:text-white"
                >
                  Clear Dates
                </button>
              )}
            </div>
          </div>

          {/* Batch Selection & Bulk Actions */}
          <div className="pt-2 border-t border-[#1E2530] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                className="inline-flex items-center gap-1.5 text-[#C5D0DF] hover:text-white font-medium"
              >
                {allFilteredSelected ? (
                  <CheckSquare className="w-4 h-4 text-[#00D2C6]" />
                ) : (
                  <Square className="w-4 h-4 text-[#8B98AB]" />
                )}
                <span>
                  {allFilteredSelected
                    ? 'Deselect All'
                    : `Select All (${filteredCases.length})`}
                </span>
              </button>

              {selectedCaseIds.size > 0 && (
                <span className="px-2 py-0.5 rounded bg-[#00D2C6]/15 border border-[#00D2C6]/35 font-mono text-[11px] text-[#00D2C6]">
                  {selectedCaseIds.size} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyBatchSummaries}
                disabled={filteredCases.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1218] hover:bg-[#1B212B] disabled:opacity-40 border border-[#232B38] text-xs font-medium text-[#C5D0DF] hover:text-white transition"
              >
                {batchCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#00D2C6]" />
                    <span className="text-[#00D2C6]">Batch Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#00D2C6]" />
                    <span>
                      Copy {selectedCaseIds.size > 0 ? `Selected (${selectedCaseIds.size})` : 'All Visible'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-sm text-red-200">
            Error loading billing queue: {errorMsg}
          </div>
        )}

        {/* Queue List */}
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-3 text-sm font-mono text-[#8B98AB]">
            <Loader2 className="w-5 h-5 animate-spin text-[#00D2C6]" />
            <span>Loading incoming Discipline 075 cases...</span>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="bg-[#14181F] border border-[#232B38] rounded-2xl py-16 text-center space-y-2">
            <p className="text-base font-semibold text-white">No cases in this view</p>
            <p className="text-xs text-[#8B98AB]">
              Switch status tabs above or clear your search / date filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCases.map((c) => {
              const practitioner = profilesMap[c.client_id];
              const wasResubmitted = resubmittedCaseIds.has(c.id);
              const parsedNotes = splitNotesAndResolution(c.clinical_notes);
              const isSelected = selectedCaseIds.has(c.id);

              return (
                <div
                  key={c.id}
                  className={`bg-[#14181F] hover:bg-[#171C24] border rounded-2xl p-4 sm:p-5 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-[#00D2C6]'
                      : c.status === 'BILLED'
                      ? 'border-emerald-500/35'
                      : c.status === 'QUERIED'
                      ? 'border-amber-500/45'
                      : 'border-[#232B38] hover:border-[#2F3A4B]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleSelectCase(c.id)}
                      className="mt-1 text-[#8B98AB] hover:text-[#00D2C6] shrink-0"
                      title="Select case for batch export"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#00D2C6]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div className="space-y-2 min-w-0 flex-1">
                      {/* Row 1: Case Ref, Patient, Prominent PMS Account #, Status & Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#00D2C6]">
                          {c.case_ref}
                        </span>
                        <span className="text-base font-bold text-white">
                          {c.patient_first_name} {c.patient_surname}
                        </span>

                        {c.status === 'BILLED' && c.billed_invoice_ref && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyPmsNumber(c.id, c.billed_invoice_ref as string)
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 font-mono text-xs sm:text-sm font-extrabold tracking-wide transition"
                            title="Copy PMS Account Number"
                          >
                            <Hash className="w-3.5 h-3.5 text-emerald-300" />
                            <span>PMS ACC: {c.billed_invoice_ref}</span>
                            {copiedPmsId === c.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-300" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-emerald-300/80" />
                            )}
                          </button>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                            c.status === 'BILLED'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : c.status === 'QUERIED'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-[#1D7AFC]/15 text-[#7FB3FF] border border-[#1D7AFC]/30'
                          }`}
                        >
                          {c.status}
                        </span>

                        {wasResubmitted && c.status === 'SUBMITTED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 border border-purple-400/40 text-[10px] font-mono font-bold text-purple-200">
                            <RotateCcw className="w-3 h-3" />
                            Query Resolved · Resubmitted
                          </span>
                        )}

                        {c.sticker_storage_path ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#00D2C6]/10 border border-[#00D2C6]/30 text-[10px] font-mono text-[#00D2C6]">
                            <ImageIcon className="w-3 h-3" />
                            Sticker Attached
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-300">
                            No Sticker
                          </span>
                        )}
                      </div>

                      {/* Row 2: Service Date, Surgeon, Start/End Time, Practitioner */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8B98AB]">
                        <span className="text-[#C5D0DF] font-medium">{c.service_date}</span>
                        <span>·</span>
                        <span>Surgeon: {c.referring_surgeon}</span>
                        <span>·</span>
                        <span className="font-mono text-[#00D2C6]">
                          {c.start_time?.slice(0, 5)} – {c.end_time?.slice(0, 5)} (
                          {c.duration_minutes}m / {c.calculated_time_units}u)
                        </span>
                        {practitioner && (
                          <>
                            <span>·</span>
                            <span>Captured by {practitioner.full_name}</span>
                          </>
                        )}
                      </div>

                      {/* Row 3: ICD-10 & Discipline 075 Tariffs */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <span className="px-2 py-0.5 rounded bg-[#0E1218] border border-[#232B38] font-mono text-[11px] text-[#E2E8F0]">
                          ICD: {c.primary_icd10}
                          {Array.isArray(c.secondary_icd10) && c.secondary_icd10.length > 0
                            ? ` (+${c.secondary_icd10.length})`
                            : ''}
                        </span>
                        {Array.isArray(c.tariffs) &&
                          c.tariffs.map((t) => (
                            <span
                              key={t.procedure_code}
                              className="px-2 py-0.5 rounded bg-[#00D2C6]/10 border border-[#00D2C6]/25 font-mono text-[11px] text-[#00D2C6]"
                            >
                              {t.procedure_code} ×{t.units}
                            </span>
                          ))}
                      </div>

                      {/* Row 4: Actionable Notes, Practitioner Query Replies & Open Office Queries */}
                      {(parsedNotes.baseNotes ||
                        parsedNotes.resolutionReplies.length > 0 ||
                        c.office_query_note) && (
                        <div className="pt-1 space-y-1.5">
                          {parsedNotes.resolutionReplies.map((rep, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-400/35 text-xs text-purple-100 flex items-center gap-2"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                              <span>
                                <strong className="font-mono text-[10px] uppercase text-purple-300 mr-1.5">
                                  Practitioner Reply:
                                </strong>
                                {rep}
                              </span>
                            </div>
                          ))}

                          {parsedNotes.baseNotes && (
                            <p className="text-xs text-[#C5D0DF]">
                              <span className="font-mono text-[10px] uppercase text-[#8B98AB] mr-1.5">
                                Notes:
                              </span>
                              {parsedNotes.baseNotes}
                            </p>
                          )}

                          {c.office_query_note && (
                            <p className="text-xs text-amber-300 font-medium">
                              <span className="font-mono text-[10px] uppercase text-amber-400 mr-1.5">
                                Open Query:
                              </span>
                              {c.office_query_note}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <button
                      type="button"
                      onClick={() => copyCaseSummary(c)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0E1218] hover:bg-[#1B212B] border border-[#232B38] text-xs font-medium text-[#C5D0DF] hover:text-white transition"
                      title="Copy summary for PMS"
                    >
                      {copiedCaseId === c.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#00D2C6]" />
                          <span className="text-[#00D2C6]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#8B98AB]" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openCaseInspector(c)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00D2C6] hover:bg-[#00E5D8] text-[#090B0E] font-bold text-xs transition shadow-md shadow-[#00D2C6]/15"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open &amp; Bill</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MediBurgh Brand Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#1A202B] mt-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/mediburgh-logo.png"
          alt="MediBurgh · Precision Billing. Protected Revenue."
          className="h-7 w-auto object-contain opacity-90"
        />
        <p className="font-mono text-[11px] text-[#6A7689]">
          Precision Billing. Protected Revenue. · Discipline 075 Office
        </p>
      </footer>

      {/* Split-View Case & Sticker Verification Modal */}
      {activeCase && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-6xl bg-[#14181F] border border-[#2C3545] rounded-2xl shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#0E1218] border-b border-[#232B38] flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-[#00D2C6]">
                    {activeCase.case_ref}
                  </span>
                  <h2 className="font-[family-name:var(--font-montserrat)] text-lg font-bold text-white">
                    {activeCase.patient_first_name} {activeCase.patient_surname}
                  </h2>

                  {activeCase.status === 'BILLED' && activeCase.billed_invoice_ref && (
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyPmsNumber(
                          activeCase.id,
                          activeCase.billed_invoice_ref as string
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 font-mono text-xs sm:text-sm font-extrabold"
                    >
                      <Hash className="w-3.5 h-3.5 text-emerald-300" />
                      <span>PMS ACC: {activeCase.billed_invoice_ref}</span>
                      {copiedPmsId === activeCase.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-emerald-300/80" />
                      )}
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#8B98AB]">
                  Service Date: {activeCase.service_date} · Surgeon:{' '}
                  {activeCase.referring_surgeon}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg bg-[#14181F] p-0.5 border border-[#232B38]">
                  <button
                    type="button"
                    onClick={() => setInspectorTab('CODING')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      inspectorTab === 'CODING'
                        ? 'bg-[#00D2C6] text-[#090B0E]'
                        : 'text-[#8B98AB] hover:text-white'
                    }`}
                  >
                    Coding &amp; Sticker
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('AUDIT')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      inspectorTab === 'AUDIT'
                        ? 'bg-[#00D2C6] text-[#090B0E]'
                        : 'text-[#8B98AB] hover:text-white'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>POPIA Audit ({auditLogs.length})</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => copyCaseSummary(activeCase)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14181F] hover:bg-[#1B212B] border border-[#232B38] text-xs text-[#C5D0DF]"
                >
                  {copiedCaseId === activeCase.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#00D2C6]" />
                      <span className="text-[#00D2C6]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#00D2C6]" />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCase(null)}
                  className="p-2 rounded-lg bg-[#14181F] hover:bg-[#1B212B] text-[#8B98AB] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {inspectorTab === 'AUDIT' ? (
              <div className="p-6 max-h-[80vh] overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#00D2C6]">
                      Compliance &amp; Chain of Custody
                    </p>
                    <h3 className="font-[family-name:var(--font-montserrat)] text-base font-bold text-white">
                      POPIA Case Audit Log · {activeCase.case_ref}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#8B98AB]">
                    Immutable Timestamped Events
                  </span>
                </div>

                {auditLoading ? (
                  <div className="py-12 flex items-center justify-center gap-2 text-xs font-mono text-[#8B98AB]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#00D2C6]" />
                    <span>Loading audit trail...</span>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#0E1218] border border-[#232B38] text-xs text-[#8B98AB]">
                    No audit trail records logged for this case yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {auditLogs.map((log) => {
                      const actor = log.actor_id ? profilesMap[log.actor_id] : null;
                      return (
                        <div
                          key={log.id}
                          className="p-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#00D2C6]/15 border border-[#00D2C6]/35 font-mono text-[11px] font-bold text-[#00D2C6]">
                                {log.action}
                              </span>
                              <span className="text-xs font-medium text-white">
                                {actor?.full_name || 'System User'}
                              </span>
                            </div>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <p className="font-mono text-[11px] text-[#8B98AB]">
                                {JSON.stringify(log.details)}
                              </p>
                            )}
                          </div>

                          <span className="font-mono text-[11px] text-[#8B98AB] shrink-0">
                            {new Date(log.created_at).toLocaleString('en-ZA')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Modal Body: Left Sticker Viewer | Right Coding & Reconciliation */
              <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[82vh] overflow-y-auto">
                {/* LEFT: Hospital Patient Sticker Viewer */}
                <div className="lg:col-span-6 p-5 bg-[#090B0E] border-b lg:border-b-0 lg:border-r border-[#232B38] flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#00D2C6] flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      Hospital Patient Sticker
                    </span>

                    {stickerSignedUrl && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setStickerRotation((r) => (r + 90) % 360)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#14181F] border border-[#232B38] text-[11px] font-mono text-[#C5D0DF] hover:text-white"
                          title="Rotate 90°"
                        >
                          <RotateCw className="w-3 h-3 text-[#00D2C6]" />
                          Rotate
                        </button>
                        <button
                          type="button"
                          onClick={() => setStickerZoomed((z) => !z)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#14181F] border border-[#232B38] text-[11px] font-mono text-[#C5D0DF] hover:text-white"
                        >
                          <ZoomIn className="w-3 h-3 text-[#00D2C6]" />
                          {stickerZoomed ? 'Fit' : 'Zoom'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-h-[280px] rounded-xl bg-[#0E1218] border border-[#232B38] flex items-center justify-center overflow-auto p-3">
                    {stickerLoading ? (
                      <div className="flex items-center gap-2 text-xs font-mono text-[#8B98AB]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#00D2C6]" />
                        <span>Decrypting private sticker...</span>
                      </div>
                    ) : stickerSignedUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={stickerSignedUrl}
                        alt="Patient hospital sticker"
                        style={{ transform: `rotate(${stickerRotation}deg)` }}
                        className={`transition-transform duration-200 rounded-lg ${
                          stickerZoomed
                            ? 'max-w-none w-[160%] cursor-zoom-out'
                            : 'max-h-[420px] w-auto object-contain cursor-zoom-in'
                        }`}
                        onClick={() => setStickerZoomed((z) => !z)}
                      />
                    ) : (
                      <div className="text-center space-y-1.5 p-6">
                        <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
                        <p className="text-xs font-semibold text-white">
                          No hospital sticker uploaded for this case
                        </p>
                        <p className="text-[11px] text-[#8B98AB]">
                          Use Query Practitioner below if medical scheme details are required.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT: Coding Breakdown & Office Actions */}
                <div className="lg:col-span-6 p-5 space-y-5">
                  {/* Theatre Timing Card */}
                  <div className="p-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#00D2C6]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Theatre / Clinical Timing</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[#8B98AB] block text-[10px] font-mono">
                          START – END
                        </span>
                        <span className="font-mono font-bold text-white">
                          {activeCase.start_time?.slice(0, 5)} –{' '}
                          {activeCase.end_time?.slice(0, 5)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8B98AB] block text-[10px] font-mono">
                          DURATION
                        </span>
                        <span className="font-mono font-bold text-white">
                          {activeCase.duration_minutes} mins
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8B98AB] block text-[10px] font-mono">
                          30-MIN UNITS
                        </span>
                        <span className="font-mono font-bold text-[#00D2C6]">
                          {activeCase.calculated_time_units} units
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Discipline 075 Procedures */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#00D2C6]">
                      <Activity className="w-3.5 h-3.5" />
                      <span>Discipline 075 Procedure Codes</span>
                    </div>
                    <div className="space-y-2">
                      {Array.isArray(activeCase.tariffs) &&
                        activeCase.tariffs.map((t) => (
                          <div
                            key={t.procedure_code}
                            className="p-3 rounded-xl bg-[#0E1218] border border-[#232B38] flex items-start justify-between gap-3"
                          >
                            <div>
                              <span className="font-mono text-xs font-bold text-[#00D2C6]">
                                {t.procedure_code}
                              </span>
                              <p className="text-xs text-[#C5D0DF] mt-0.5">
                                {t.procedure_description}
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded bg-[#14181F] border border-[#2C3545] font-mono text-xs font-bold text-white shrink-0">
                              × {t.units}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* ICD-10 Diagnoses */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#00D2C6]">
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>ICD-10 Diagnoses</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0E1218] border border-[#232B38] space-y-1.5 text-xs">
                      <div>
                        <span className="px-1.5 py-0.5 rounded bg-[#00D2C6]/20 text-[#00D2C6] font-mono text-[10px] font-bold mr-2">
                          PRIMARY
                        </span>
                        <span className="font-mono font-bold text-white mr-2">
                          {activeCase.primary_icd10}
                        </span>
                        <span className="text-[#C5D0DF]">
                          {activeCase.primary_icd10_desc}
                        </span>
                      </div>

                      {Array.isArray(activeCase.secondary_icd10) &&
                        activeCase.secondary_icd10.map((sec) => (
                          <div key={sec.code} className="pt-1 border-t border-[#1B212B]">
                            <span className="px-1.5 py-0.5 rounded bg-[#1B212B] text-[#8B98AB] font-mono text-[10px] mr-2">
                              SEC
                            </span>
                            <span className="font-mono font-bold text-white mr-2">
                              {sec.code}
                            </span>
                            <span className="text-[#C5D0DF]">{sec.description}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Practitioner Notes & Query Replies */}
                  {activeCase.clinical_notes && (() => {
                    const parsed = splitNotesAndResolution(activeCase.clinical_notes);
                    return (
                      <div className="p-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-[#8B98AB]">
                          <FileText className="w-3.5 h-3.5 text-[#00D2C6]" />
                          <span>Practitioner Notes &amp; Replies</span>
                        </div>
                        {parsed.baseNotes && (
                          <p className="text-xs text-[#E2E8F0]">{parsed.baseNotes}</p>
                        )}
                        {parsed.resolutionReplies.map((rep, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg bg-purple-500/15 border border-purple-400/35 text-xs text-purple-100"
                          >
                            <strong className="font-mono text-[10px] uppercase text-purple-300 block mb-0.5">
                              Query Resolution Reply
                            </strong>
                            {rep}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {actionFeedback && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-xs text-red-200">
                      {actionFeedback}
                    </div>
                  )}

                  {/* Office Reconciliation Controls */}
                  <div className="pt-2 border-t border-[#232B38] space-y-4">
                    {/* Mark as Billed with Prominent PMS Account Number */}
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 space-y-2">
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                        PMS Account Number / Invoice Ref *
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={invoiceRefInput}
                          onChange={(e) => setInvoiceRefInput(e.target.value)}
                          placeholder="e.g. ACC-40821 / INV-0841"
                          className="flex-1 h-11 px-3.5 rounded-xl bg-[#090B0E] border border-emerald-500/40 focus:border-emerald-300 focus:outline-none font-mono text-sm font-bold text-white placeholder-[#4E5B6E]"
                        />
                        <button
                          type="button"
                          disabled={actionSubmitting}
                          onClick={handleMarkAsBilled}
                          className="h-11 px-5 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-[#090B0E] font-extrabold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark Billed</span>
                        </button>
                      </div>
                    </div>

                    {/* Send Actionable Query Back to Practitioner */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-amber-300">
                        Query Practitioner (Actionable Request)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_QUERY_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl}
                            type="button"
                            onClick={() => setQueryNoteInput(tpl)}
                            className="px-2 py-1 rounded bg-[#0E1218] hover:bg-[#1B212B] border border-[#232B38] text-[11px] text-[#C5D0DF] hover:text-amber-200 transition"
                          >
                            + {tpl}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={queryNoteInput}
                          onChange={(e) => setQueryNoteInput(e.target.value)}
                          placeholder="Specify exact action required from practitioner..."
                          className="flex-1 h-10 px-3 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-amber-400 focus:outline-none text-xs text-white placeholder-[#4E5B6E]"
                        />
                        <button
                          type="button"
                          disabled={actionSubmitting}
                          onClick={handleSendQuery}
                          className="h-10 px-4 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 disabled:opacity-50 text-amber-200 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition"
                        >
                          <MessageSquareWarning className="w-4 h-4" />
                          <span>Send Query</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}