'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  FileText,
  Hash,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  ALL_TIME_ADDON_CODES,
  CLINICAL_MACROS,
  calculateTheatreTiming,
  DEFAULT_ICD10_CODES,
  DISCIPLINE_075_PROCEDURES,
  evaluateDiscipline075Guardrails,
  type ClinicalMacro,
  type Icd10Item,
  type ProcedureItem,
  type SelectedTariff,
} from '@/data/discipline075';

interface CaseRecord {
  id: string;
  case_ref: string;
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
  created_at: string;
}

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

export default function PractitionerCapturePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formTopRef = useRef<HTMLDivElement | null>(null);
  const queryReplyInputRef = useRef<HTMLInputElement | null>(null);

  // Auth & Profile State
  const [userId, setUserId] = useState<string | null>(null);
  const [practitionerName, setPractitionerName] = useState<string>('Practitioner');
  const [practiceName, setPracticeName] = useState<string>('Clinical Technology (075)');
  const [authLoading, setAuthLoading] = useState(true);

  // Catalogue Data (Embedded + JSON from public/data)
  const [icdCatalogue, setIcdCatalogue] = useState<Icd10Item[]>(DEFAULT_ICD10_CODES);
  const [procedureCatalogue, setProcedureCatalogue] = useState<ProcedureItem[]>(
    DISCIPLINE_075_PROCEDURES
  );

  // Edit / Resubmit State (when resolving a QUERIED case)
  const [editingCase, setEditingCase] = useState<CaseRecord | null>(null);
  const [existingStickerPath, setExistingStickerPath] = useState<string | null>(null);
  const [queryReplyText, setQueryReplyText] = useState('');

  // Sticker Upload
  const [stickerFile, setStickerFile] = useState<File | null>(null);
  const [stickerPreviewUrl, setStickerPreviewUrl] = useState<string | null>(null);

  // Core Capture Fields
  const [patientFirstName, setPatientFirstName] = useState('');
  const [patientSurname, setPatientSurname] = useState('');
  const [serviceDate, setServiceDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [referringSurgeon, setReferringSurgeon] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');

  // Multi-Select Discipline 075 Procedure Codes
  const [procQuery, setProcQuery] = useState('');
  const [procDropdownOpen, setProcDropdownOpen] = useState(false);
  const [selectedTariffs, setSelectedTariffs] = useState<SelectedTariff[]>([]);

  // Multi-Select ICD-10 Codes
  const [icdQuery, setIcdQuery] = useState('');
  const [icdDropdownOpen, setIcdDropdownOpen] = useState(false);
  const [selectedIcds, setSelectedIcds] = useState<Icd10Item[]>([]);

  // Notes & Feedback
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [copiedPmsId, setCopiedPmsId] = useState<string | null>(null);

  // Submitted Cases Tracker
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);

  // Live Timing & After-Hours Detection
  const timing = useMemo(
    () => calculateTheatreTiming(startTime, endTime, serviceDate),
    [startTime, endTime, serviceDate]
  );

  // Live Discipline 075 Coding Guardrails
  const guardrailAlerts = useMemo(
    () =>
      evaluateDiscipline075Guardrails({
        selectedTariffs,
        timing,
      }),
    [selectedTariffs, timing]
  );

  const queriedCount = useMemo(
    () => cases.filter((c) => c.status === 'QUERIED').length,
    [cases]
  );

  const fetchMyCases = useCallback(
    async (uid: string) => {
      setCasesLoading(true);
      setCasesError(null);

      const { data, error } = await supabase
        .from('cases')
        .select(
          'id, case_ref, patient_first_name, patient_surname, sticker_storage_path, service_date, referring_surgeon, start_time, end_time, duration_minutes, calculated_time_units, primary_icd10, primary_icd10_desc, secondary_icd10, tariffs, clinical_notes, status, office_query_note, billed_invoice_ref, created_at'
        )
        .eq('client_id', uid)
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) {
        setCasesError(error.message);
      } else {
        setCases((data as CaseRecord[]) || []);
      }
      setCasesLoading(false);
    },
    [supabase]
  );

  // 1. Load optional JSON catalogues from /public/data/
  useEffect(() => {
    let active = true;

    async function loadCatalogues() {
      try {
        const procRes = await fetch('/data/procedure.json');
        if (procRes.ok) {
          const raw = (await procRes.json()) as Array<Record<string, unknown>>;
          const parsed: ProcedureItem[] = raw
            .map((row) => ({
              procedure_code: String(
                row.procedure_code ?? row.code ?? row.tariff_code ?? ''
              ).trim(),
              procedure_description: String(
                row.procedure_description ?? row.description ?? ''
              ).trim(),
            }))
            .filter((item) => item.procedure_code && item.procedure_description);

          if (active && parsed.length > 0) {
            setProcedureCatalogue(parsed);
          }
        }
      } catch {
        // Fallback to embedded DISCIPLINE_075_PROCEDURES
      }

      try {
        const icdRes = await fetch('/data/icd10.json');
        if (icdRes.ok) {
          const raw = (await icdRes.json()) as Array<Record<string, unknown>>;
          const parsed: Icd10Item[] = raw
            .map((row) => ({
              code: String(
                row.code ?? row.icd10_code ?? row.ICD10_Code ?? row.Code ?? ''
              ).trim(),
              description: String(
                row.description ??
                  row.icd10_description ??
                  row.ICD10_Description ??
                  row.Description ??
                  ''
              ).trim(),
            }))
            .filter((item) => item.code && item.description);

          if (active && parsed.length > 0) {
            setIcdCatalogue(parsed);
          }
        }
      } catch {
        // Fallback to DEFAULT_ICD10_CODES
      }
    }

    loadCatalogues();
    return () => {
      active = false;
    };
  }, []);

  // 2. Authenticate User & Load Cases
  useEffect(() => {
    let active = true;

    async function initSession() {
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

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, practice_name, role')
          .eq('id', user.id)
          .maybeSingle();

        if (!active) return;

        if (profile) {
          if (profile.role === 'office' || profile.role === 'admin') {
            router.replace('/queue');
            return;
          }
          setPractitionerName(profile.full_name || user.email || 'Practitioner');
          setPracticeName(profile.practice_name || 'Clinical Technology (075)');
        } else {
          const fallbackName =
            (user.user_metadata?.full_name as string) ||
            user.email?.split('@')[0] ||
            'Practitioner';
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email ?? '',
            full_name: fallbackName,
            practice_name: 'Clinical Technology (075)',
            role: 'client',
          });
          setPractitionerName(fallbackName);
        }

        await fetchMyCases(user.id);
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    initSession();
    return () => {
      active = false;
    };
  }, [fetchMyCases, router, supabase]);

  // 3. Realtime Sync when Billing Office Queries or Bills a Case
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`client-cases-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases',
          filter: `client_id=eq.${userId}`,
        },
        () => {
          fetchMyCases(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMyCases, supabase, userId]);

  // Filtered Discipline 075 Procedure Suggestions
  const filteredProcedures = useMemo(() => {
    const q = procQuery.trim().toLowerCase();
    const selectedSet = new Set(selectedTariffs.map((t) => t.procedure_code));
    const pool = procedureCatalogue.filter(
      (item) => !selectedSet.has(item.procedure_code)
    );
    if (!q) return pool.slice(0, 15);
    return pool
      .filter(
        (item) =>
          item.procedure_code.toLowerCase().includes(q) ||
          item.procedure_description.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [procedureCatalogue, procQuery, selectedTariffs]);

  // Filtered ICD-10 Suggestions
  const filteredIcds = useMemo(() => {
    const q = icdQuery.trim().toLowerCase();
    const selectedSet = new Set(selectedIcds.map((item) => item.code.toUpperCase()));
    const pool = icdCatalogue.filter(
      (item) => !selectedSet.has(item.code.toUpperCase())
    );
    if (!q) return pool.slice(0, 12);
    return pool
      .filter(
        (item) =>
          item.code.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [icdCatalogue, icdQuery, selectedIcds]);

  // Handlers: Sticker Photo
  function handleStickerSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStickerFile(file);
    const objectUrl = URL.createObjectURL(file);
    setStickerPreviewUrl(objectUrl);
  }

  function clearSticker() {
    setStickerFile(null);
    if (stickerPreviewUrl) {
      URL.revokeObjectURL(stickerPreviewUrl);
      setStickerPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleCopyPmsNumber(caseId: string, pmsRef: string) {
    await navigator.clipboard.writeText(pmsRef);
    setCopiedPmsId(caseId);
    setTimeout(() => setCopiedPmsId(null), 2000);
  }

  // Load a QUERIED Case into the Form for Actionable Editing & Resubmission
  function startEditingCase(
    record: CaseRecord,
    options?: { openStickerPicker?: boolean; focusReply?: boolean }
  ) {
    setFormError(null);
    setFormSuccess(null);
    clearSticker();

    const parsedNotes = splitNotesAndResolution(record.clinical_notes);

    setEditingCase(record);
    setExistingStickerPath(record.sticker_storage_path);
    setQueryReplyText('');
    setPatientFirstName(record.patient_first_name);
    setPatientSurname(record.patient_surname);
    setServiceDate(record.service_date);
    setReferringSurgeon(record.referring_surgeon);
    setStartTime(record.start_time?.slice(0, 5) || '08:00');
    setEndTime(record.end_time?.slice(0, 5) || '09:30');
    setSelectedTariffs(Array.isArray(record.tariffs) ? record.tariffs : []);

    const rebuiltIcds: Icd10Item[] = [
      { code: record.primary_icd10, description: record.primary_icd10_desc },
      ...(Array.isArray(record.secondary_icd10) ? record.secondary_icd10 : []),
    ];
    setSelectedIcds(rebuiltIcds);
    setClinicalNotes(parsedNotes.baseNotes);

    formTopRef.current?.scrollIntoView({ behavior: 'smooth' });

    if (options?.openStickerPicker) {
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 200);
    } else if (options?.focusReply) {
      setTimeout(() => {
        queryReplyInputRef.current?.focus();
      }, 250);
    }
  }

  function cancelEditingCase() {
    setEditingCase(null);
    setExistingStickerPath(null);
    setQueryReplyText('');
    setPatientFirstName('');
    setPatientSurname('');
    setSelectedTariffs([]);
    setSelectedIcds([]);
    setClinicalNotes('');
    clearSticker();
    setFormError(null);
  }

  // Apply One-Tap Clinical Macro
  function applyClinicalMacro(macro: ClinicalMacro) {
    const nextTariffs: SelectedTariff[] = [];

    for (const code of macro.codes) {
      const found =
        procedureCatalogue.find((p) => p.procedure_code === code) ||
        DISCIPLINE_075_PROCEDURES.find((p) => p.procedure_code === code);
      if (!found) continue;

      const isTimeAddon = ALL_TIME_ADDON_CODES.has(code);
      if (isTimeAddon && timing.extraThirtyMinAfterFirstHour <= 0) {
        continue;
      }

      const units = isTimeAddon ? timing.extraThirtyMinAfterFirstHour : 1;
      nextTariffs.push({ ...found, units });
    }

    setSelectedTariffs(nextTariffs);

    if (macro.defaultIcd10 && selectedIcds.length === 0) {
      setSelectedIcds([macro.defaultIcd10]);
    }
  }

  // Apply Guardrail Quick Fix
  function applyGuardrailFix(code: string, units = 1) {
    const existing = selectedTariffs.find((t) => t.procedure_code === code);
    if (existing) {
      updateTariffUnits(code, units);
      return;
    }

    const found =
      procedureCatalogue.find((p) => p.procedure_code === code) ||
      DISCIPLINE_075_PROCEDURES.find((p) => p.procedure_code === code);
    if (!found) return;

    setSelectedTariffs((prev) => [...prev, { ...found, units }]);
  }

  // Handlers: Multi-Select Discipline 075 Tariffs
  function addProcedureCode(item: ProcedureItem) {
    if (selectedTariffs.some((existing) => existing.procedure_code === item.procedure_code)) {
      return;
    }

    const isExtra30MinCode = ALL_TIME_ADDON_CODES.has(item.procedure_code);
    const defaultUnits =
      isExtra30MinCode && timing.extraThirtyMinAfterFirstHour > 0
        ? timing.extraThirtyMinAfterFirstHour
        : 1;

    setSelectedTariffs((prev) => [...prev, { ...item, units: defaultUnits }]);
    setProcQuery('');
    setProcDropdownOpen(false);
  }

  function updateTariffUnits(code: string, nextUnits: number) {
    const clamped = Math.max(1, Math.min(99, Math.floor(nextUnits) || 1));
    setSelectedTariffs((prev) =>
      prev.map((item) =>
        item.procedure_code === code ? { ...item, units: clamped } : item
      )
    );
  }

  function removeTariffCode(code: string) {
    setSelectedTariffs((prev) => prev.filter((item) => item.procedure_code !== code));
  }

  // Handlers: Multi-Select ICD-10
  function addIcdCode(item: Icd10Item) {
    if (selectedIcds.some((existing) => existing.code === item.code)) return;
    setSelectedIcds((prev) => [...prev, item]);
    setIcdQuery('');
    setIcdDropdownOpen(false);
  }

  function removeIcdCode(code: string) {
    setSelectedIcds((prev) => prev.filter((item) => item.code !== code));
  }

  function promoteIcdToPrimary(code: string) {
    setSelectedIcds((prev) => {
      const target = prev.find((item) => item.code === code);
      if (!target) return prev;
      return [target, ...prev.filter((item) => item.code !== code)];
    });
  }

  // Submit New Case OR Resubmit Queried Case
  async function handleSubmitCase(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setFormError(null);
    setFormSuccess(null);

    if (!patientFirstName.trim() || !patientSurname.trim()) {
      setFormError('Patient name and surname are required.');
      return;
    }
    if (!referringSurgeon.trim()) {
      setFormError('Surgeon name are required.');
      return;
    }
    if (!startTime || !endTime || timing.durationMinutes <= 0) {
      setFormError('Enter valid start and end times.');
      return;
    }
    if (selectedTariffs.length === 0) {
      setFormError('Select at least one Discipline 075 procedure code.');
      return;
    }
    if (selectedIcds.length === 0) {
      setFormError('Select at least one ICD-10 diagnosis code.');
      return;
    }

    setSubmitting(true);

    try {
      let stickerStoragePath: string | null = existingStickerPath;

      if (stickerFile) {
        const ext = stickerFile.name.split('.').pop() || 'jpg';
        const filePath = `${userId}/${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('stickers')
          .upload(filePath, stickerFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Sticker upload failed: ${uploadError.message}`);
        }
        stickerStoragePath = filePath;
      }

      const primaryIcd = selectedIcds[0];
      const secondaryIcds = selectedIcds.slice(1);

      if (editingCase) {
        const priorParsed = splitNotesAndResolution(editingCase.clinical_notes);
        const combinedReplies = [...priorParsed.resolutionReplies];

        if (queryReplyText.trim()) {
          combinedReplies.push(queryReplyText.trim());
        } else if (stickerFile) {
          combinedReplies.push('Uploaded updated hospital sticker photo');
        }

        const formattedNotesParts: string[] = [];
        if (clinicalNotes.trim()) {
          formattedNotesParts.push(clinicalNotes.trim());
        }
        for (const r of combinedReplies) {
          formattedNotesParts.push(`[Query Reply: ${r}]`);
        }
        const finalClinicalNotes =
          formattedNotesParts.length > 0 ? formattedNotesParts.join('\n') : null;

        const { error: updateError } = await supabase
          .from('cases')
          .update({
            patient_first_name: patientFirstName.trim(),
            patient_surname: patientSurname.trim(),
            sticker_storage_path: stickerStoragePath,
            service_date: serviceDate,
            referring_surgeon: referringSurgeon.trim(),
            start_time: startTime,
            end_time: endTime,
            duration_minutes: timing.durationMinutes,
            calculated_time_units: timing.thirtyMinUnits,
            primary_icd10: primaryIcd.code,
            primary_icd10_desc: primaryIcd.description,
            secondary_icd10: secondaryIcds,
            tariffs: selectedTariffs,
            clinical_notes: finalClinicalNotes,
            status: 'SUBMITTED',
            office_query_note: null,
          })
          .eq('id', editingCase.id)
          .eq('client_id', userId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        await supabase.from('case_audit_logs').insert({
          case_id: editingCase.id,
          actor_id: userId,
          action: 'CASE_RESUBMITTED',
          details: {
            previous_query: editingCase.office_query_note,
            resolution_reply: queryReplyText.trim() || null,
            new_sticker_uploaded: Boolean(stickerFile),
            tariff_count: selectedTariffs.length,
          },
        });

        const resolvedRef = editingCase.case_ref;
        setEditingCase(null);
        setExistingStickerPath(null);
        setQueryReplyText('');
        setPatientFirstName('');
        setPatientSurname('');
        setSelectedTariffs([]);
        setSelectedIcds([]);
        setClinicalNotes('');
        clearSticker();

        setFormSuccess(
          `Case ${resolvedRef} updated and resubmitted to the billing office.`
        );
        await fetchMyCases(userId);
        return;
      }

      // Insert brand-new case
      const { data: insertedCase, error: insertError } = await supabase
        .from('cases')
        .insert({
          client_id: userId,
          patient_first_name: patientFirstName.trim(),
          patient_surname: patientSurname.trim(),
          medical_aid_name: 'On Sticker',
          medical_aid_number: 'On Sticker',
          dependent_code: '00',
          patient_cellphone: null,
          sticker_storage_path: stickerStoragePath,
          service_date: serviceDate,
          facility_name: 'On Sticker',
          referring_surgeon: referringSurgeon.trim(),
          start_time: startTime,
          end_time: endTime,
          duration_minutes: timing.durationMinutes,
          calculated_time_units: timing.thirtyMinUnits,
          primary_icd10: primaryIcd.code,
          primary_icd10_desc: primaryIcd.description,
          secondary_icd10: secondaryIcds,
          tariffs: selectedTariffs,
          clinical_notes: clinicalNotes.trim() || null,
          validation_status: 'CLEARED',
          status: 'SUBMITTED',
        })
        .select('id, case_ref')
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (insertedCase?.id) {
        await supabase.from('case_audit_logs').insert({
          case_id: insertedCase.id,
          actor_id: userId,
          action: 'CASE_SUBMITTED',
          details: {
            tariff_count: selectedTariffs.length,
            icd_count: selectedIcds.length,
            duration_minutes: timing.durationMinutes,
          },
        });
      }

      // Reset patient fields while keeping Surgeon & Service Date sticky
      setPatientFirstName('');
      setPatientSurname('');
      setSelectedTariffs([]);
      setSelectedIcds([]);
      setClinicalNotes('');
      clearSticker();

      setFormSuccess(
        `Case ${insertedCase?.case_ref ?? ''} submitted to billing office. Ready for next patient.`
      );
      await fetchMyCases(userId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit case.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#090B0E] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#00D2C6] font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>INITIALISING PRACTITIONER CONSOLE...</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={formTopRef} className="min-h-screen bg-[#090B0E] text-[#F3F6FA] pb-16">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#090B0E]/90 backdrop-blur-md border-b border-[#232B38]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
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
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#00D2C6]/10 text-[#00D2C6] border border-[#00D2C6]/30">
                  DISCIPLINE 075
                </span>
              </div>
              <p className="text-[11px] text-[#8B98AB] truncate max-w-[200px] sm:max-w-xs">
                {practitionerName} · {practiceName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#14181F] hover:bg-[#1B212B] border border-[#232B38] text-xs font-medium text-[#C5D0DF] hover:text-white transition"
          >
            <LogOut className="w-3.5 h-3.5 text-[#00D2C6]" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Queried Cases Action Banner */}
        {queriedCount > 0 && !editingCase && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-200">
                  {queriedCount} case{queriedCount === 1 ? '' : 's'} require your action
                </p>
                <p className="text-xs text-amber-100/80">
                  Use the action buttons on the amber cards in Recent Case Tracker below
                  to re-upload a sticker, edit codes, or reply directly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Active Query Resolution Banner */}
        {editingCase && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/15 border-2 border-amber-400/60 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">
                  Resolving Queried Case · {editingCase.case_ref}
                </span>
                <h2 className="text-base font-bold text-white">
                  {editingCase.patient_first_name} {editingCase.patient_surname}
                </h2>
              </div>

              <button
                type="button"
                onClick={cancelEditingCase}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#090B0E] border border-[#2C3545] text-xs font-medium text-[#C5D0DF] hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>

            {editingCase.office_query_note && (
              <div className="p-3 rounded-xl bg-[#090B0E]/80 border border-amber-500/40 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 block">
                  Billing Office Request
                </span>
                <p className="text-sm font-medium text-amber-100">
                  {editingCase.office_query_note}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-amber-200">
                Your Reply / Action Taken (Sent to Billing Office)
              </label>
              <input
                ref={queryReplyInputRef}
                type="text"
                value={queryReplyText}
                onChange={(e) => setQueryReplyText(e.target.value)}
                placeholder="e.g. Uploaded clearer sticker — member no 10492811, dep 01 / confirmed emergency callout"
                className="w-full h-11 px-3.5 rounded-xl bg-[#090B0E] border border-amber-400/50 focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#6A7689]"
              />
            </div>
          </div>
        )}

        {/* Page Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#00D2C6]">
              {editingCase ? 'Query Resolution Mode' : 'Practitioner Case Capture'}
            </p>
            <h1 className="font-[family-name:var(--font-montserrat)] text-2xl sm:text-3xl font-bold text-white mt-1">
              {editingCase
                ? `Update & Resubmit ${editingCase.case_ref}`
                : 'New Case Submission'}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8B98AB]">
            <ShieldCheck className="w-4 h-4 text-[#00D2C6]" />
            <span>POPIA Encrypted · Instant Office Sync</span>
          </div>
        </div>

        {/* Status Alerts */}
        {formError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-200 text-sm flex items-start justify-between gap-3">
            <span>{formError}</span>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="text-red-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {formSuccess && (
          <div className="p-4 rounded-xl bg-[#00D2C6]/10 border border-[#00D2C6]/40 text-[#9FF7F1] text-sm flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#00D2C6] shrink-0" />
              <span>{formSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setFormSuccess(null)}
              className="text-[#00D2C6] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Capture Form */}
        <form onSubmit={handleSubmitCase} className="space-y-6">
          {/* 1. Hospital Sticker Photo */}
          <section className="bg-[#14181F] border border-[#232B38] rounded-2xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-[#00D2C6]" />
                <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm uppercase tracking-wider text-white">
                  1. Hospital Patient Sticker
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#8B98AB]">
                SCHEME / MEMBER NO ON STICKER
              </span>
            </div>

            {existingStickerPath && !stickerPreviewUrl && (
              <div className="px-3.5 py-2.5 rounded-xl bg-[#00D2C6]/10 border border-[#00D2C6]/30 flex items-center justify-between gap-3 text-xs">
                <span className="inline-flex items-center gap-2 text-[#9FF7F1]">
                  <ImageIcon className="w-4 h-4 text-[#00D2C6]" />
                  Existing sticker attached — upload a new photo below only if replacing it
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleStickerSelect}
              className="hidden"
            />

            {!stickerPreviewUrl ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 px-4 rounded-xl border-2 border-dashed border-[#2C3545] hover:border-[#00D2C6]/60 bg-[#0E1218] hover:bg-[#121822] transition flex flex-col items-center justify-center gap-2 text-center"
              >
                <Camera className="w-7 h-7 text-[#00D2C6]" />
                <span className="text-sm font-semibold text-white">
                  {existingStickerPath
                    ? 'Tap to Upload Replacement Hospital Sticker'
                    : 'Tap to Snap or Upload Hospital Sticker'}
                </span>
                <span className="text-xs text-[#8B98AB]">
                  Captures medical aid, member number, dependent code &amp; contact details
                </span>
              </button>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-[#2C3545] bg-[#0E1218] p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={stickerPreviewUrl}
                    alt="Hospital sticker preview"
                    className="w-16 h-16 object-cover rounded-lg border border-[#232B38]"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {stickerFile?.name}
                    </p>
                    <p className="text-xs text-[#00D2C6] font-mono">
                      Ready for encrypted upload
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSticker}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                  title="Remove sticker"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>

          {/* 2. Patient Name, Surname, Service Date & Surgeon */}
          <section className="bg-[#14181F] border border-[#232B38] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-[#00D2C6]" />
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm uppercase tracking-wider text-white">
                2. Patient &amp; Case Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8B98AB] mb-1.5">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={patientFirstName}
                  onChange={(e) => setPatientFirstName(e.target.value)}
                  placeholder="e.g. Johan"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8B98AB] mb-1.5">
                  Surname *
                </label>
                <input
                  type="text"
                  required
                  value={patientSurname}
                  onChange={(e) => setPatientSurname(e.target.value)}
                  placeholder="e.g. Van Der Merwe"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8B98AB] mb-1.5">
                  Service Date *
                </label>
                <input
                  type="date"
                  required
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8B98AB] mb-1.5">
                  Surgeon *
                </label>
                <input
                  type="text"
                  required
                  value={referringSurgeon}
                  onChange={(e) => setReferringSurgeon(e.target.value)}
                  placeholder="e.g. Dr. K. Naidoo"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                />
              </div>
            </div>
          </section>

          {/* 3. Start and End Time + After-Hours Indicator */}
          <section className="bg-[#14181F] border border-[#232B38] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#00D2C6]" />
                <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm uppercase tracking-wider text-white">
                  3. Start &amp; End Time
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {timing.isAfterHours && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-400/40 font-mono text-[11px] font-semibold text-purple-200">
                    After-Hours / Weekend
                  </span>
                )}

                {timing.durationMinutes > 0 && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#00D2C6]/10 border border-[#00D2C6]/30 font-mono text-xs text-[#00D2C6]">
                    <span>{timing.durationMinutes} mins</span>
                    <span>·</span>
                    <span>{timing.thirtyMinUnits} × 30m units</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#00D2C6] mb-1.5">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#00D2C6] mb-1.5">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm font-mono text-white"
                />
              </div>

              <div className="bg-[#0E1218] border border-[#232B38] rounded-xl px-3.5 py-2 flex flex-col justify-center">
                <span className="text-[10px] font-mono uppercase text-[#8B98AB]">
                  Duration
                </span>
                <span className="font-mono text-base font-bold text-white">
                  {timing.durationMinutes} min
                </span>
              </div>

              <div className="bg-[#0E1218] border border-[#232B38] rounded-xl px-3.5 py-2 flex flex-col justify-center">
                <span className="text-[10px] font-mono uppercase text-[#8B98AB]">
                  30-Min Units
                </span>
                <span className="font-mono text-base font-bold text-[#00D2C6]">
                  {timing.thirtyMinUnits}{' '}
                  <span className="text-xs font-normal text-[#8B98AB]">
                    (+{timing.extraThirtyMinAfterFirstHour} after 1h)
                  </span>
                </span>
              </div>
            </div>
          </section>

          {/* 4. Multi-Select Procedure Codes (Discipline 075) + Quick-Pick Macros + Guardrails */}
          <section className="bg-[#14181F] border border-[#232B38] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-[#00D2C6]" />
                <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm uppercase tracking-wider text-white">
                  4. Procedure Codes (Discipline 075) *
                </h2>
              </div>
              <span className="text-xs font-mono text-[#8B98AB]">
                {selectedTariffs.length} selected
              </span>
            </div>

            {/* One-Tap Clinical Technology Macros */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#8B98AB]">
                <Zap className="w-3.5 h-3.5 text-[#00D2C6]" />
                <span>Quick-Pick Protocol Bundles (Auto-Syncs Time Units)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {CLINICAL_MACROS.map((macro) => (
                  <button
                    key={macro.id}
                    type="button"
                    onClick={() => applyClinicalMacro(macro)}
                    className="p-2.5 rounded-xl bg-[#0E1218] hover:bg-[#19202B] border border-[#232B38] hover:border-[#00D2C6]/50 text-left transition group"
                  >
                    <p className="text-xs font-bold text-white group-hover:text-[#00D2C6] transition">
                      {macro.label}
                    </p>
                    <p className="text-[11px] font-mono text-[#8B98AB] mt-0.5">
                      {macro.subtitle}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Searchable Dropdown */}
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-[#8B98AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={procQuery}
                  onFocus={() => setProcDropdownOpen(true)}
                  onChange={(e) => {
                    setProcQuery(e.target.value);
                    setProcDropdownOpen(true);
                  }}
                  placeholder="Search Discipline 075 code or keyword (75063, 75065, pacemaker, CRRT, ECMO, IONM)..."
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                />
                {procQuery && (
                  <button
                    type="button"
                    onClick={() => setProcQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B98AB] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {procDropdownOpen && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl bg-[#0E1218] border border-[#2C3545] shadow-2xl divide-y divide-[#1B212B]">
                  {filteredProcedures.length === 0 ? (
                    <div className="p-3 text-xs text-[#8B98AB]">
                      No matching Discipline 075 procedure codes found.
                    </div>
                  ) : (
                    filteredProcedures.map((proc) => (
                      <button
                        key={proc.procedure_code}
                        type="button"
                        onClick={() => addProcedureCode(proc)}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-[#1B212B] transition flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-[#00D2C6] mr-2.5">
                            {proc.procedure_code}
                          </span>
                          <span className="text-xs sm:text-sm text-[#E2E8F0]">
                            {proc.procedure_description}
                          </span>
                        </div>
                        <Plus className="w-4 h-4 text-[#00D2C6] shrink-0 mt-0.5" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Live Discipline 075 Coding Guardrails */}
            {guardrailAlerts.length > 0 && (
              <div className="space-y-2">
                {guardrailAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      alert.severity === 'warning'
                        ? 'bg-amber-500/10 border-amber-400/45 text-amber-100'
                        : 'bg-[#1D7AFC]/10 border-[#1D7AFC]/40 text-[#CFE2FF]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          alert.severity === 'warning'
                            ? 'text-amber-300'
                            : 'text-[#7FB3FF]'
                        }`}
                      />
                      <div className="text-xs">
                        <p className="font-bold">{alert.title}</p>
                        <p className="opacity-85 mt-0.5">{alert.detail}</p>
                      </div>
                    </div>

                    {alert.fixCode && alert.fixActionLabel && (
                      <button
                        type="button"
                        onClick={() =>
                          applyGuardrailFix(alert.fixCode as string, alert.fixUnits ?? 1)
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold shrink-0 transition ${
                          alert.severity === 'warning'
                            ? 'bg-amber-400 hover:bg-amber-300 text-[#090B0E]'
                            : 'bg-[#00D2C6] hover:bg-[#00E5D8] text-[#090B0E]'
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>{alert.fixActionLabel}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Selected Tariffs List */}
            {selectedTariffs.length > 0 && (
              <div className="space-y-2.5 pt-1">
                {selectedTariffs.map((tariff) => {
                  const isTimeAddon = ALL_TIME_ADDON_CODES.has(tariff.procedure_code);

                  return (
                    <div
                      key={tariff.procedure_code}
                      className="p-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#00D2C6]/15 border border-[#00D2C6]/35 font-mono text-xs font-bold text-[#00D2C6]">
                            {tariff.procedure_code}
                          </span>
                          {isTimeAddon && timing.extraThirtyMinAfterFirstHour > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateTariffUnits(
                                  tariff.procedure_code,
                                  timing.extraThirtyMinAfterFirstHour
                                )
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1D7AFC]/20 text-[#7FB3FF] text-[10px] font-mono hover:bg-[#1D7AFC]/30"
                            >
                              <Sparkles className="w-3 h-3" />
                              Sync {timing.extraThirtyMinAfterFirstHour} time units
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-[#C5D0DF] leading-relaxed">
                          {tariff.procedure_description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                        <label className="text-[11px] font-mono text-[#8B98AB]">
                          UNITS
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={tariff.units}
                          onChange={(e) =>
                            updateTariffUnits(
                              tariff.procedure_code,
                              Number(e.target.value)
                            )
                          }
                          className="w-16 h-9 px-2 rounded-lg bg-[#14181F] border border-[#2C3545] focus:border-[#00D2C6] focus:outline-none font-mono text-sm text-center text-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeTariffCode(tariff.procedure_code)}
                          className="p-2 rounded-lg bg-[#14181F] hover:bg-red-500/15 text-[#8B98AB] hover:text-red-400 transition"
                          title="Remove procedure code"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 5. Multi-Select ICD-10 Codes */}
          <section className="bg-[#14181F] border border-[#232B38] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-4 h-4 text-[#00D2C6]" />
                <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm uppercase tracking-wider text-white">
                  5. ICD-10 Codes (Multi-Select) *
                </h2>
              </div>
              <span className="text-xs font-mono text-[#8B98AB]">
                {selectedIcds.length} selected
              </span>
            </div>

            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-[#8B98AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={icdQuery}
                  onFocus={() => setIcdDropdownOpen(true)}
                  onChange={(e) => {
                    setIcdQuery(e.target.value);
                    setIcdDropdownOpen(true);
                  }}
                  placeholder="Search ICD-10 code or diagnosis (e.g. I25.1, I35.0, N17.9, J80, atrial, renal)..."
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                />
                {icdQuery && (
                  <button
                    type="button"
                    onClick={() => setIcdQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B98AB] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {icdDropdownOpen && (
                <div className="mt-2 max-h-60 overflow-y-auto rounded-xl bg-[#0E1218] border border-[#2C3545] shadow-2xl divide-y divide-[#1B212B]">
                  {filteredIcds.length === 0 ? (
                    <div className="p-3 text-xs text-[#8B98AB] flex items-center justify-between">
                      <span>No matching ICD-10 codes in list.</span>
                      {icdQuery.trim().length >= 3 && (
                        <button
                          type="button"
                          onClick={() =>
                            addIcdCode({
                              code: icdQuery.trim().toUpperCase(),
                              description: 'Clinical ICD-10 entry',
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00D2C6] text-[#090B0E] font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add {icdQuery.trim().toUpperCase()}
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredIcds.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => addIcdCode(item)}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-[#1B212B] transition flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-[#00D2C6] mr-2.5">
                            {item.code}
                          </span>
                          <span className="text-xs sm:text-sm text-[#E2E8F0]">
                            {item.description}
                          </span>
                        </div>
                        <Plus className="w-4 h-4 text-[#00D2C6] shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedIcds.length > 0 && (
              <div className="space-y-2 pt-1">
                {selectedIcds.map((item, idx) => (
                  <div
                    key={item.code}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#0E1218] border border-[#232B38]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          idx === 0
                            ? 'bg-[#00D2C6]/20 text-[#00D2C6] border border-[#00D2C6]/40'
                            : 'bg-[#1B212B] text-[#8B98AB]'
                        }`}
                      >
                        {idx === 0 ? 'Primary' : `Secondary #${idx}`}
                      </span>
                      <span className="font-mono text-xs font-bold text-white">
                        {item.code}
                      </span>
                      <span className="text-xs text-[#C5D0DF] truncate">
                        {item.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => promoteIcdToPrimary(item.code)}
                          className="text-[11px] font-mono text-[#8B98AB] hover:text-[#00D2C6] px-2 py-1 rounded bg-[#14181F]"
                        >
                          Make Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeIcdCode(item.code)}
                        className="p-1 text-[#8B98AB] hover:text-red-400"
                        title="Remove ICD-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 6. Notes & Submit */}
          <section className="bg-[#14181F] border border-[#232B38] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-[#00D2C6]" />
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm uppercase tracking-wider text-white">
                6. Notes
              </h2>
            </div>

            <textarea
              rows={3}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Consumables used, emergency callout details, PMB motivation notes..."
              className="w-full p-3.5 rounded-xl bg-[#0E1218] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
            />

            <div className="flex flex-col sm:flex-row gap-3">
              {editingCase && (
                <button
                  type="button"
                  onClick={cancelEditingCase}
                  className="sm:w-44 h-12 rounded-xl bg-[#0E1218] hover:bg-[#1B212B] border border-[#2C3545] text-xs font-mono font-bold uppercase tracking-wider text-[#C5D0DF] hover:text-white transition"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 h-12 rounded-xl disabled:opacity-50 text-[#090B0E] font-[family-name:var(--font-montserrat)] font-extrabold text-sm tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-lg ${
                  editingCase
                    ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-400/20'
                    : 'bg-[#00D2C6] hover:bg-[#00E5D8] shadow-[#00D2C6]/20'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{editingCase ? 'Resubmitting Case...' : 'Submitting Case...'}</span>
                  </>
                ) : editingCase ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Save &amp; Resubmit to Billing Office</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Case &amp; Load Next</span>
                  </>
                )}
              </button>
            </div>
          </section>
        </form>

        {/* 7. Submitted Case Tracker */}
        <section className="bg-[#14181F] border border-[#232B38] rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#00D2C6]">
                Your Submissions · Live Sync
              </p>
              <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-lg text-white">
                Recent Case Tracker
              </h2>
            </div>
            <span className="font-mono text-xs text-[#8B98AB]">
              {cases.length} case{cases.length === 1 ? '' : 's'}
            </span>
          </div>

          {casesLoading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs font-mono text-[#8B98AB]">
              <Loader2 className="w-4 h-4 animate-spin text-[#00D2C6]" />
              <span>Loading submitted cases...</span>
            </div>
          ) : casesError ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              Error loading cases: {casesError}
            </div>
          ) : cases.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#8B98AB]">
              No cases submitted yet. Capture your first case above.
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map((c) => {
                const parsedNotes = splitNotesAndResolution(c.clinical_notes);

                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-xl bg-[#0E1218] border space-y-3 ${
                      c.status === 'QUERIED'
                        ? 'border-amber-500/60'
                        : c.status === 'BILLED'
                        ? 'border-emerald-500/40'
                        : 'border-[#232B38]'
                    }`}
                  >
                    {/* Header Row: Ref, Patient, Status & Prominent PMS Account Number */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#00D2C6]">
                          {c.case_ref}
                        </span>
                        <span className="text-base font-bold text-white">
                          {c.patient_first_name} {c.patient_surname}
                        </span>
                        <span className="text-xs text-[#8B98AB]">
                          · {c.referring_surgeon}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {c.status === 'BILLED' && c.billed_invoice_ref && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyPmsNumber(c.id, c.billed_invoice_ref as string)
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 font-mono text-xs sm:text-sm font-extrabold tracking-wide transition"
                            title="Copy PMS Account Number"
                          >
                            <Hash className="w-3.5 h-3.5 text-emerald-300" />
                            <span>PMS ACC: {c.billed_invoice_ref}</span>
                            {copiedPmsId === c.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-300 ml-0.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-emerald-300/80 ml-0.5" />
                            )}
                          </button>
                        )}

                        <span
                          className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold uppercase ${
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
                    </div>

                    {/* Date, Time & Codes */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8B98AB]">
                      <span>{c.service_date}</span>
                      <span>·</span>
                      <span>
                        {c.start_time?.slice(0, 5)} – {c.end_time?.slice(0, 5)} (
                        {c.duration_minutes}m / {c.calculated_time_units}u)
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-[#14181F] border border-[#232B38] font-mono text-[11px] text-[#E2E8F0]">
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

                    {/* Clinical Notes & Previous Query Replies */}
                    {(parsedNotes.baseNotes || parsedNotes.resolutionReplies.length > 0) && (
                      <div className="p-3 rounded-lg bg-[#14181F] border border-[#232B38] space-y-1.5 text-xs">
                        {parsedNotes.baseNotes && (
                          <p className="text-[#C5D0DF]">
                            <span className="font-mono text-[10px] uppercase text-[#8B98AB] mr-2">
                              Notes:
                            </span>
                            {parsedNotes.baseNotes}
                          </p>
                        )}
                        {parsedNotes.resolutionReplies.map((rep, i) => (
                          <p key={i} className="text-[#9FF7F1]">
                            <span className="font-mono text-[10px] uppercase text-[#00D2C6] mr-2">
                              Your Reply:
                            </span>
                            {rep}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Actionable Billing Office Query Box */}
                    {c.status === 'QUERIED' && (
                      <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 block">
                            Action Required · Billing Office Query
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-amber-100">
                            {c.office_query_note ||
                              'Billing office requested clarification on this case.'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              startEditingCase(c, { openStickerPicker: true })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#090B0E] hover:bg-[#14181F] border border-amber-400/50 text-amber-200 font-bold text-xs transition"
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-300" />
                            <span>Re-Upload Sticker</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => startEditingCase(c, { focusReply: true })}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#090B0E] font-extrabold text-xs transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Fix &amp; Reply</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* MediBurgh Brand Footer */}
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#1A202B] mt-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/mediburgh-logo.png"
          alt="MediBurgh · Precision Billing. Protected Revenue."
          className="h-7 w-auto object-contain opacity-90"
        />
        <p className="font-mono text-[11px] text-[#6A7689]">
          Precision Billing. Protected Revenue. · Discipline 075
        </p>
      </footer>
    </div>
  );
}