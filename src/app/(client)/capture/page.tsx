'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  BookmarkPlus,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  FileText,
  FolderPlus,
  Hash,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Minus,
  Package,
  Phone,
  Plus,
  RotateCcw,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLicenseEntitlement } from '@/hooks/useLicenseEntitlement';
import { LicenseBanner } from '@/components/LicenseBanner';
import {
  compressStickerImage,
  runStickerOcr,
  type StickerOcrPayload,
} from '@/lib/stickerOcr';
import {
  ALL_TIME_ADDON_CODES,
  calculateTheatreTiming,
  DEFAULT_ICD10_CODES,
  DISCIPLINE_075_PROCEDURES,
  evaluateDiscipline075Guardrails,
  type Icd10Item,
  type ProcedureItem,
  type SelectedTariff,
} from '@/data/discipline075';

interface CaseRecord {
  id: string;
  case_ref: string;
  patient_first_name: string;
  patient_surname: string;
  medical_aid_name: string | null;
  medical_aid_number: string | null;
  dependent_code: string | null;
  patient_cellphone: string | null;
  facility_name: string | null;
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

interface CustomCodeBasket {
  id: string;
  name: string;
  items: SelectedTariff[];
  createdAt: string;
}

type ProcCategoryFilter =
  | 'ALL'
  | 'PERFUSION'
  | 'CATH_LAB'
  | 'CARDIAC_RHYTHM'
  | 'CRITICAL_CARE'
  | 'DIAGNOSTICS';

const CATEGORY_TABS: Array<{ id: ProcCategoryFilter; label: string }> = [
  { id: 'ALL', label: 'All Codes' },
  { id: 'PERFUSION', label: 'Perfusion' },
  { id: 'CATH_LAB', label: 'Cath Lab' },
  { id: 'CARDIAC_RHYTHM', label: 'Pacing & EP' },
  { id: 'CRITICAL_CARE', label: 'Critical Care' },
  { id: 'DIAGNOSTICS', label: 'Diagnostics' },
];

// Codes where practitioners routinely adjust QTY (hours, standby, or 30-min increments)
const QTY_HIGHLIGHT_CODES = new Set([
  '75149',
  '17149',
  '75157',
  '75013',
  '75065',
  '75066',
  '75071',
  '75085',
]);

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
  const entitlement = useLicenseEntitlement();

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

  // Sticker Upload & Vision OCR State
  const [stickerFile, setStickerFile] = useState<File | null>(null);
  const [stickerPreviewUrl, setStickerPreviewUrl] = useState<string | null>(null);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<StickerOcrPayload | null>(null);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);

  // Extracted Medical Scheme & Hospital Metadata
  const [medicalAidName, setMedicalAidName] = useState('');
  const [medicalAidNumber, setMedicalAidNumber] = useState('');
  const [dependentCode, setDependentCode] = useState('');
  const [patientCellphone, setPatientCellphone] = useState('');
  const [facilityName, setFacilityName] = useState('');

  // Core Capture Fields
  const [patientFirstName, setPatientFirstName] = useState('');
  const [patientSurname, setPatientSurname] = useState('');
  const [serviceDate, setServiceDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [referringSurgeon, setReferringSurgeon] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');

  // Procedure Codes + Custom Client Baskets State
  const [procQuery, setProcQuery] = useState('');
  const [procCategory, setProcCategory] = useState<ProcCategoryFilter>('ALL');
  const [selectedTariffs, setSelectedTariffs] = useState<SelectedTariff[]>([]);

  // Client-Created Custom Code Baskets (Saved per practitioner)
  const [customBaskets, setCustomBaskets] = useState<CustomCodeBasket[]>([]);
  const [basketBuilderOpen, setBasketBuilderOpen] = useState(false);
  const [editingBasketId, setEditingBasketId] = useState<string | null>(null);
  const [basketNameInput, setBasketNameInput] = useState('');
  const [basketDraftItems, setBasketDraftItems] = useState<SelectedTariff[]>([]);
  const [basketCodeSearch, setBasketCodeSearch] = useState('');
  const [quickSaveModalOpen, setQuickSaveModalOpen] = useState(false);
  const [quickSaveName, setQuickSaveName] = useState('');

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

  // Persist Custom Code Baskets per Practitioner
  const persistBaskets = useCallback(
    (nextBaskets: CustomCodeBasket[]) => {
      setCustomBaskets(nextBaskets);
      if (userId && typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            `clintechbills_baskets_${userId}`,
            JSON.stringify(nextBaskets)
          );
        } catch {
          // Ignore storage quota errors
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(`clintechbills_baskets_${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as CustomCodeBasket[];
        if (Array.isArray(parsed)) {
          setCustomBaskets(parsed);
        }
      }
    } catch {
      // Ignore malformed JSON
    }
  }, [userId]);

  const fetchMyCases = useCallback(
    async (uid: string) => {
      setCasesLoading(true);
      setCasesError(null);

      const { data, error } = await supabase
        .from('cases')
        .select(
          'id, case_ref, patient_first_name, patient_surname, medical_aid_name, medical_aid_number, dependent_code, patient_cellphone, facility_name, sticker_storage_path, service_date, referring_surgeon, start_time, end_time, duration_minutes, calculated_time_units, primary_icd10, primary_icd10_desc, secondary_icd10, tariffs, clinical_notes, status, office_query_note, billed_invoice_ref, created_at'
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

  // 1. Load optional JSON catalogues from /public/data/ (preserving category metadata)
  useEffect(() => {
    let active = true;

    async function loadCatalogues() {
      try {
        const procRes = await fetch('/data/procedure.json');
        if (procRes.ok) {
          const raw = (await procRes.json()) as Array<Record<string, unknown>>;
          const categoryLookup = new Map(
            DISCIPLINE_075_PROCEDURES.map((p) => [p.procedure_code, p.category])
          );
          const parsed: ProcedureItem[] = raw
            .map((row) => {
              const code = String(
                row.procedure_code ?? row.code ?? row.tariff_code ?? ''
              ).trim();
              return {
                procedure_code: code,
                procedure_description: String(
                  row.procedure_description ?? row.description ?? ''
                ).trim(),
                category: categoryLookup.get(code),
              };
            })
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

  // Filtered Procedure List (Category + Search)
  const visibleProcedures = useMemo(() => {
    const q = procQuery.trim().toLowerCase();
    return procedureCatalogue.filter((item) => {
      if (procCategory !== 'ALL' && item.category !== procCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.procedure_code.toLowerCase().includes(q) ||
        item.procedure_description.toLowerCase().includes(q)
      );
    });
  }, [procedureCatalogue, procCategory, procQuery]);

  // Filtered Codes for the Custom Basket Builder
  const basketBuilderMatches = useMemo(() => {
    const q = basketCodeSearch.trim().toLowerCase();
    const inDraft = new Set(basketDraftItems.map((i) => i.procedure_code));
    const pool = procedureCatalogue.filter((p) => !inDraft.has(p.procedure_code));
    if (!q) return pool.slice(0, 12);
    return pool
      .filter(
        (p) =>
          p.procedure_code.toLowerCase().includes(q) ||
          p.procedure_description.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [procedureCatalogue, basketCodeSearch, basketDraftItems]);

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

  // Apply extracted OCR payload to form fields
  const applyOcrExtraction = useCallback((ocr: StickerOcrPayload) => {
    setOcrResult(ocr);
    if (ocr.patient_first_name) setPatientFirstName(ocr.patient_first_name);
    if (ocr.patient_surname) setPatientSurname(ocr.patient_surname);
    if (ocr.medical_aid_name) setMedicalAidName(ocr.medical_aid_name);
    if (ocr.medical_aid_number) setMedicalAidNumber(ocr.medical_aid_number);
    if (ocr.dependent_code) setDependentCode(ocr.dependent_code);
    if (ocr.patient_cellphone) setPatientCellphone(ocr.patient_cellphone);
    if (ocr.facility_name) setFacilityName(ocr.facility_name);
    if (ocr.referring_surgeon) {
      setReferringSurgeon((prev) => (prev.trim() ? prev : ocr.referring_surgeon));
    }
  }, []);

  // Handlers: Sticker Photo + Automatic Compression & Vision OCR
  async function handleStickerSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setOcrNotice(null);
    setOcrResult(null);

    if (stickerPreviewUrl) {
      URL.revokeObjectURL(stickerPreviewUrl);
    }
    const immediatePreview = URL.createObjectURL(rawFile);
    setStickerPreviewUrl(immediatePreview);
    setStickerFile(rawFile);

    setOcrScanning(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        const { compressedFile, ocr } = await runStickerOcr(
          rawFile,
          session.access_token
        );
        setStickerFile(compressedFile);
        applyOcrExtraction(ocr);
      } else {
        const { compressedFile } = await compressStickerImage(rawFile);
        setStickerFile(compressedFile);
      }
    } catch (err) {
      try {
        const { compressedFile } = await compressStickerImage(rawFile);
        setStickerFile(compressedFile);
      } catch {
        // Keep rawFile if canvas compression fails
      }
      const msg =
        err instanceof Error
          ? err.message
          : 'Auto-scan unavailable — sticker saved for manual entry.';
      setOcrNotice(msg);
    } finally {
      setOcrScanning(false);
    }
  }

  async function handleRescanSticker() {
    if (!stickerFile || ocrScanning) return;
    setOcrNotice(null);
    setOcrScanning(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session expired — please sign in again.');
      }
      const { compressedFile, ocr } = await runStickerOcr(
        stickerFile,
        session.access_token
      );
      setStickerFile(compressedFile);
      applyOcrExtraction(ocr);
    } catch (err) {
      setOcrNotice(
        err instanceof Error ? err.message : 'Could not re-scan sticker image.'
      );
    } finally {
      setOcrScanning(false);
    }
  }

  function clearSticker() {
    setStickerFile(null);
    setOcrResult(null);
    setOcrNotice(null);
    setOcrScanning(false);
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
    setMedicalAidName(
      record.medical_aid_name && record.medical_aid_name !== 'On Sticker'
        ? record.medical_aid_name
        : ''
    );
    setMedicalAidNumber(
      record.medical_aid_number && record.medical_aid_number !== 'On Sticker'
        ? record.medical_aid_number
        : ''
    );
    setDependentCode(record.dependent_code || '');
    setPatientCellphone(record.patient_cellphone || '');
    setFacilityName(
      record.facility_name && record.facility_name !== 'On Sticker'
        ? record.facility_name
        : ''
    );
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
    setMedicalAidName('');
    setMedicalAidNumber('');
    setDependentCode('');
    setPatientCellphone('');
    setFacilityName('');
    setSelectedTariffs([]);
    setSelectedIcds([]);
    setClinicalNotes('');
    clearSticker();
    setFormError(null);
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

  // Handlers: Procedure Codes & QTY
  function toggleOrAddProcedureCode(item: ProcedureItem) {
    const existing = selectedTariffs.find(
      (t) => t.procedure_code === item.procedure_code
    );
    if (existing) {
      // Increment QTY if already selected so tapping feels fast
      updateTariffUnits(item.procedure_code, existing.units + 1);
      return;
    }

    const isExtra30MinCode = ALL_TIME_ADDON_CODES.has(item.procedure_code);
    const defaultUnits =
      isExtra30MinCode && timing.extraThirtyMinAfterFirstHour > 0
        ? timing.extraThirtyMinAfterFirstHour
        : 1;

    setSelectedTariffs((prev) => [...prev, { ...item, units: defaultUnits }]);
  }

  function addCustomCodeFromSearch() {
    const cleanCode = procQuery.trim().toUpperCase();
    if (!cleanCode) return;

    const existing = selectedTariffs.find(
      (t) => t.procedure_code.toUpperCase() === cleanCode
    );
    if (existing) {
      updateTariffUnits(existing.procedure_code, existing.units + 1);
      setProcQuery('');
      return;
    }

    setSelectedTariffs((prev) => [
      ...prev,
      {
        procedure_code: cleanCode,
        procedure_description: 'Custom Tariff / Procedure Entry',
        units: 1,
      },
    ]);
    setProcQuery('');
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

  // Handlers: Custom Client Code Baskets
  function applyCustomBasket(basket: CustomCodeBasket) {
    setSelectedTariffs((prev) => {
      const map = new Map(prev.map((t) => [t.procedure_code, t]));
      for (const item of basket.items) {
        const isExtra30MinCode = ALL_TIME_ADDON_CODES.has(item.procedure_code);
        const resolvedUnits =
          isExtra30MinCode && timing.extraThirtyMinAfterFirstHour > 0
            ? timing.extraThirtyMinAfterFirstHour
            : item.units;
        map.set(item.procedure_code, { ...item, units: resolvedUnits });
      }
      return Array.from(map.values());
    });
  }

  function openNewBasketBuilder() {
    setEditingBasketId(null);
    setBasketNameInput('');
    setBasketDraftItems(selectedTariffs.map((t) => ({ ...t })));
    setBasketCodeSearch('');
    setBasketBuilderOpen(true);
  }

  function openEditBasketBuilder(basket: CustomCodeBasket) {
    setEditingBasketId(basket.id);
    setBasketNameInput(basket.name);
    setBasketDraftItems(basket.items.map((t) => ({ ...t })));
    setBasketCodeSearch('');
    setBasketBuilderOpen(true);
  }

  function addCodeToBasketDraft(proc: ProcedureItem) {
    if (basketDraftItems.some((i) => i.procedure_code === proc.procedure_code)) {
      return;
    }
    setBasketDraftItems((prev) => [...prev, { ...proc, units: 1 }]);
    setBasketCodeSearch('');
  }

  function addCustomCodeToBasketDraft() {
    const cleanCode = basketCodeSearch.trim().toUpperCase();
    if (!cleanCode) return;
    if (
      basketDraftItems.some(
        (i) => i.procedure_code.toUpperCase() === cleanCode
      )
    ) {
      return;
    }
    setBasketDraftItems((prev) => [
      ...prev,
      {
        procedure_code: cleanCode,
        procedure_description: 'Custom Tariff / Procedure Entry',
        units: 1,
      },
    ]);
    setBasketCodeSearch('');
  }

  function updateBasketDraftUnits(code: string, units: number) {
    const clamped = Math.max(1, Math.min(99, Math.floor(units) || 1));
    setBasketDraftItems((prev) =>
      prev.map((i) =>
        i.procedure_code === code ? { ...i, units: clamped } : i
      )
    );
  }

  function removeCodeFromBasketDraft(code: string) {
    setBasketDraftItems((prev) =>
      prev.filter((i) => i.procedure_code !== code)
    );
  }

  function handleSaveBasketBuilder() {
    const name = basketNameInput.trim();
    if (!name || basketDraftItems.length === 0) return;

    if (editingBasketId) {
      const updated = customBaskets.map((b) =>
        b.id === editingBasketId
          ? { ...b, name, items: basketDraftItems }
          : b
      );
      persistBaskets(updated);
    } else {
      const created: CustomCodeBasket = {
        id: `basket_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        items: basketDraftItems,
        createdAt: new Date().toISOString(),
      };
      persistBaskets([created, ...customBaskets]);
    }

    setBasketBuilderOpen(false);
    setEditingBasketId(null);
    setBasketNameInput('');
    setBasketDraftItems([]);
  }

  function handleQuickSaveCurrentSelection() {
    const name = quickSaveName.trim();
    if (!name || selectedTariffs.length === 0) return;

    const created: CustomCodeBasket = {
      id: `basket_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      items: selectedTariffs.map((t) => ({ ...t })),
      createdAt: new Date().toISOString(),
    };
    persistBaskets([created, ...customBaskets]);
    setQuickSaveName('');
    setQuickSaveModalOpen(false);
  }

  function deleteCustomBasket(id: string) {
    persistBaskets(customBaskets.filter((b) => b.id !== id));
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

    if (!editingCase && !entitlement.canSubmitCase) {
      setFormError(
        entitlement.blockReason ||
          'Monthly licence quota reached. Tap Upgrade / Key below to unlock unlimited cases.'
      );
      return;
    }

    if (!patientFirstName.trim() || !patientSurname.trim()) {
      setFormError('Patient name and surname are required.');
      return;
    }
    if (!referringSurgeon.trim()) {
      setFormError('Surgeon name is required.');
      return;
    }
    if (!startTime || !endTime || timing.durationMinutes <= 0) {
      setFormError('Enter valid start and end times.');
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
            contentType: stickerFile.type || 'image/jpeg',
          });

        if (uploadError) {
          throw new Error(`Sticker upload failed: ${uploadError.message}`);
        }
        stickerStoragePath = filePath;
      }

      const primaryIcd = selectedIcds[0];
      const secondaryIcds = selectedIcds.slice(1);

      const resolvedMedAid = medicalAidName.trim() || 'On Sticker';
      const resolvedMedNo = medicalAidNumber.trim() || 'On Sticker';
      const resolvedDepCode = dependentCode.trim() || '00';
      const resolvedCell = patientCellphone.trim() || null;
      const resolvedFacility = facilityName.trim() || 'On Sticker';

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
            medical_aid_name: resolvedMedAid,
            medical_aid_number: resolvedMedNo,
            dependent_code: resolvedDepCode,
            patient_cellphone: resolvedCell,
            facility_name: resolvedFacility,
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
            ocr_used: Boolean(ocrResult),
            tariff_count: selectedTariffs.length,
          },
        });

        const resolvedRef = editingCase.case_ref;
        setEditingCase(null);
        setExistingStickerPath(null);
        setQueryReplyText('');
        setPatientFirstName('');
        setPatientSurname('');
        setMedicalAidName('');
        setMedicalAidNumber('');
        setDependentCode('');
        setPatientCellphone('');
        setFacilityName('');
        setSelectedTariffs([]);
        setSelectedIcds([]);
        setClinicalNotes('');
        clearSticker();

        setFormSuccess(
          `Case ${resolvedRef} updated and resubmitted to the Medical Bureau.`
        );
        await fetchMyCases(userId);
        return;
      }

      // Insert brand-new case linked to active licence & Medical Bureau
      const { data: insertedCase, error: insertError } = await supabase
        .from('cases')
        .insert({
          client_id: userId,
          bureau_license_id: entitlement.bureauLicenseId,
          license_id: entitlement.license?.id ?? null,
          patient_first_name: patientFirstName.trim(),
          patient_surname: patientSurname.trim(),
          medical_aid_name: resolvedMedAid,
          medical_aid_number: resolvedMedNo,
          dependent_code: resolvedDepCode,
          patient_cellphone: resolvedCell,
          sticker_storage_path: stickerStoragePath,
          service_date: serviceDate,
          facility_name: resolvedFacility,
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
            license_key: entitlement.activeKey,
            ocr_used: Boolean(ocrResult),
          },
        });
      }

      // Reset patient fields while keeping Surgeon & Service Date sticky
      setPatientFirstName('');
      setPatientSurname('');
      setMedicalAidName('');
      setMedicalAidNumber('');
      setDependentCode('');
      setPatientCellphone('');
      setFacilityName('');
      setSelectedTariffs([]);
      setSelectedIcds([]);
      setClinicalNotes('');
      clearSticker();

      setFormSuccess(
        `Case ${insertedCase?.case_ref ?? ''} submitted to Medical Bureau. Ready for next patient.`
      );
      await Promise.all([fetchMyCases(userId), entitlement.refreshUsage()]);
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

  const selectedCodeSet = new Set(
    selectedTariffs.map((t) => t.procedure_code)
  );

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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Discreet Floating Subscription / Key Pill & Closeable Modal */}
        <LicenseBanner entitlement={entitlement} />

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
                  Medical Bureau Request
                </span>
                <p className="text-sm font-medium text-amber-100">
                  {editingCase.office_query_note}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-amber-200">
                Your Reply / Action Taken (Sent to Medical Bureau)
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
            <span>POPIA Encrypted · Instant Bureau Sync</span>
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
          {/* 1. Hospital Sticker Photo + AI OCR Auto-Fill */}
          <section className="bg-[#14181F] border border-[#232B38] rounded-2xl p-5 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-[#00D2C6]" />
                <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm uppercase tracking-wider text-white">
                  1. Hospital Patient Sticker
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#00D2C6]">
                <ScanLine className="w-3.5 h-3.5" />
                <span>AI STICKER OCR AUTO-FILL</span>
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
                    : 'Tap to Snap Hospital Sticker (Auto-Fills Patient & Scheme)'}
                </span>
                <span className="text-xs text-[#8B98AB]">
                  Extracts Name, Surname, Medical Aid, Member #, Dep Code &amp; Cellphone automatically
                </span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-[#2C3545] bg-[#0E1218] p-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={stickerPreviewUrl}
                      alt="Hospital sticker preview"
                      className="w-16 h-16 object-cover rounded-lg border border-[#232B38]"
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium text-white truncate">
                        {stickerFile?.name}
                      </p>
                      {ocrScanning ? (
                        <p className="inline-flex items-center gap-1.5 text-xs text-[#00D2C6] font-mono">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Scanning sticker fields with AI OCR...</span>
                        </p>
                      ) : ocrResult ? (
                        <p className="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-mono">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            Auto-filled ({ocrResult.confidence} confidence) — verify below
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-[#00D2C6] font-mono">
                          Ready for encrypted upload
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={ocrScanning}
                      onClick={handleRescanSticker}
                      className="p-2 rounded-lg bg-[#14181F] hover:bg-[#1B212B] border border-[#232B38] text-[#00D2C6] disabled:opacity-50 transition"
                      title="Re-scan sticker with OCR"
                    >
                      <ScanLine className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={clearSticker}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                      title="Remove sticker"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {ocrNotice && (
                  <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-400/35 text-[11px] text-amber-200">
                    {ocrNotice}
                  </div>
                )}

                {/* Extracted Medical Scheme & Facility Strip */}
                {(medicalAidName ||
                  medicalAidNumber ||
                  patientCellphone ||
                  facilityName) && (
                  <div className="rounded-xl border border-[#00D2C6]/30 bg-[#0E1218] p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <span className="block font-mono text-[10px] uppercase text-[#8B98AB]">
                        Medical Aid
                      </span>
                      <input
                        type="text"
                        value={medicalAidName}
                        onChange={(e) => setMedicalAidName(e.target.value)}
                        placeholder="Scheme"
                        className="mt-0.5 w-full bg-transparent font-semibold text-white focus:outline-none border-b border-transparent focus:border-[#00D2C6]"
                      />
                    </div>
                    <div>
                      <span className="block font-mono text-[10px] uppercase text-[#8B98AB]">
                        Member # / Dep
                      </span>
                      <div className="mt-0.5 flex items-center gap-1 font-mono font-semibold text-[#00D2C6]">
                        <input
                          type="text"
                          value={medicalAidNumber}
                          onChange={(e) => setMedicalAidNumber(e.target.value)}
                          placeholder="Member No"
                          className="w-24 bg-transparent focus:outline-none border-b border-transparent focus:border-[#00D2C6]"
                        />
                        <span>-</span>
                        <input
                          type="text"
                          value={dependentCode}
                          onChange={(e) => setDependentCode(e.target.value)}
                          placeholder="00"
                          className="w-8 bg-transparent focus:outline-none border-b border-transparent focus:border-[#00D2C6]"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-[#8B98AB]">
                        <Phone className="w-2.5 h-2.5" />
                        Cellphone
                      </span>
                      <input
                        type="text"
                        value={patientCellphone}
                        onChange={(e) => setPatientCellphone(e.target.value)}
                        placeholder="082..."
                        className="mt-0.5 w-full bg-transparent font-mono text-white focus:outline-none border-b border-transparent focus:border-[#00D2C6]"
                      />
                    </div>
                    <div>
                      <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-[#8B98AB]">
                        <Building2 className="w-2.5 h-2.5" />
                        Facility
                      </span>
                      <input
                        type="text"
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        placeholder="Hospital"
                        className="mt-0.5 w-full bg-transparent text-white truncate focus:outline-none border-b border-transparent focus:border-[#00D2C6]"
                      />
                    </div>
                  </div>
                )}
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

          {/* 4. Multi-Select ICD-10 Codes */}
          <section className="bg-[#14181F] border border-[#232B38] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-4 h-4 text-[#00D2C6]" />
                <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm uppercase tracking-wider text-white">
                  4. ICD-10 Codes (Multi-Select) *
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

          {/* 5. Tariff Codes, Custom Client Baskets & QTY Selector */}
          <section className="bg-[#14181F] border border-[#232B38] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-[#00D2C6]" />
                <h2 className="font-[family-name:var(--font-montserrat)] font-bold text-sm uppercase tracking-wider text-white">
                  5. Tariff Codes &amp; Custom Baskets
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {selectedTariffs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickSaveName('');
                      setQuickSaveModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D2C6]/15 hover:bg-[#00D2C6]/25 border border-[#00D2C6]/40 font-mono text-[11px] font-bold text-[#00D2C6] transition"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Save Selection as Basket</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={openNewBasketBuilder}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1218] hover:bg-[#1B212B] border border-[#2C3545] hover:border-[#00D2C6]/50 font-mono text-[11px] font-bold text-white transition"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-[#00D2C6]" />
                  <span>+ Create Basket</span>
                </button>
              </div>
            </div>

            {/* Quick-Save Current Selection Popover */}
            {quickSaveModalOpen && (
              <div className="p-3.5 rounded-xl bg-[#0E1218] border border-[#00D2C6]/45 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  value={quickSaveName}
                  onChange={(e) => setQuickSaveName(e.target.value)}
                  placeholder="Basket name (e.g. My Bypass Setup / ICU Dialysis)..."
                  className="flex-1 h-10 px-3 rounded-lg bg-[#14181F] border border-[#2C3545] focus:border-[#00D2C6] focus:outline-none text-xs text-white placeholder-[#4E5B6E]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!quickSaveName.trim()}
                    onClick={handleQuickSaveCurrentSelection}
                    className="h-10 px-4 rounded-lg bg-[#00D2C6] hover:bg-[#00E5D8] disabled:opacity-50 text-xs font-extrabold text-[#08080B]"
                  >
                    Save Basket
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSaveModalOpen(false)}
                    className="h-10 px-3 rounded-lg bg-[#14181F] border border-[#232B38] text-xs text-[#8B98AB] hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Client's Saved Custom Code Baskets */}
            {customBaskets.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#8B98AB]">
                  <Package className="w-3.5 h-3.5 text-[#00D2C6]" />
                  <span>Your Saved Code Baskets (Tap to Apply)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {customBaskets.map((basket) => (
                    <div
                      key={basket.id}
                      className="rounded-xl bg-[#0E1218] hover:bg-[#18202C] border border-[#232B38] hover:border-[#00D2C6]/55 p-3 transition flex items-start justify-between gap-2 group"
                    >
                      <button
                        type="button"
                        onClick={() => applyCustomBasket(basket)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-xs font-bold text-white group-hover:text-[#00D2C6] truncate transition">
                          {basket.name}
                        </p>
                        <p className="text-[11px] font-mono text-[#8B98AB] mt-0.5 truncate">
                          {basket.items
                            .map((i) => `${i.procedure_code} ×${i.units}`)
                            .join(' · ')}
                        </p>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditBasketBuilder(basket)}
                          className="p-1.5 rounded-lg text-[#8B98AB] hover:text-[#00D2C6] hover:bg-[#14181F]"
                          title="Edit basket"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCustomBasket(basket.id)}
                          className="p-1.5 rounded-lg text-[#8B98AB] hover:text-red-400 hover:bg-[#14181F]"
                          title="Delete basket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-3.5 py-2.5 rounded-xl bg-[#0E1218] border border-dashed border-[#2C3545] flex flex-wrap items-center justify-between gap-2 text-xs text-[#8B98AB]">
                <span>
                  No custom code baskets yet. Create reusable bundles with your preferred codes &amp; quantities.
                </span>
                <button
                  type="button"
                  onClick={openNewBasketBuilder}
                  className="font-mono text-[11px] font-bold text-[#00D2C6] hover:underline"
                >
                  + Create your first basket
                </button>
              </div>
            )}

            {/* Custom Basket Builder Panel */}
            {basketBuilderOpen && (
              <div className="p-4 rounded-2xl bg-[#0B0E14] border-2 border-[#00D2C6]/45 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#00D2C6]">
                    {editingBasketId ? 'Edit Code Basket' : 'Create Custom Code Basket'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBasketBuilderOpen(false)}
                    className="p-1 text-[#8B98AB] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  value={basketNameInput}
                  onChange={(e) => setBasketNameInput(e.target.value)}
                  placeholder="Basket Name (e.g. Perfusion Standard, Cath Lab Stent, ICU 75149)..."
                  className="w-full h-10 px-3.5 rounded-xl bg-[#14181F] border border-[#2C3545] focus:border-[#00D2C6] focus:outline-none text-sm text-white placeholder-[#4E5B6E]"
                />

                <div className="relative">
                  <Search className="w-4 h-4 text-[#8B98AB] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={basketCodeSearch}
                    onChange={(e) => setBasketCodeSearch(e.target.value)}
                    placeholder="Search code to add to basket (e.g. 75011, 75063, 75149)..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#14181F] border border-[#232B38] focus:border-[#00D2C6] focus:outline-none text-xs text-white placeholder-[#4E5B6E]"
                  />
                </div>

                {/* Quick search matches inside Basket Builder */}
                <div className="max-h-36 overflow-y-auto rounded-xl bg-[#14181F] border border-[#232B38] divide-y divide-[#1D2430]">
                  {basketBuilderMatches.length === 0 ? (
                    <div className="p-2.5 flex items-center justify-between text-xs text-[#8B98AB]">
                      <span>No matching code in list.</span>
                      {basketCodeSearch.trim() && (
                        <button
                          type="button"
                          onClick={addCustomCodeToBasketDraft}
                          className="px-2.5 py-1 rounded-lg bg-[#00D2C6] text-[#08080B] font-mono font-bold text-[11px]"
                        >
                          + Add {basketCodeSearch.trim().toUpperCase()}
                        </button>
                      )}
                    </div>
                  ) : (
                    basketBuilderMatches.map((proc) => (
                      <button
                        key={proc.procedure_code}
                        type="button"
                        onClick={() => addCodeToBasketDraft(proc)}
                        className="w-full px-3 py-2 text-left hover:bg-[#1E2633] flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="truncate">
                          <span className="font-mono font-bold text-[#00D2C6] mr-2">
                            {proc.procedure_code}
                          </span>
                          <span className="text-[#C5D0DF]">
                            {proc.procedure_description}
                          </span>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-[#00D2C6] shrink-0" />
                      </button>
                    ))
                  )}
                </div>

                {/* Codes inside Draft Basket with Default QTY */}
                {basketDraftItems.length > 0 && (
                  <div className="space-y-2">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-[#8B98AB]">
                      Codes &amp; Default QTY in this Basket ({basketDraftItems.length})
                    </span>
                    {basketDraftItems.map((item) => (
                      <div
                        key={item.procedure_code}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#14181F] border border-[#232B38]"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-[#00D2C6] mr-2">
                            {item.procedure_code}
                          </span>
                          <span className="text-xs text-[#C5D0DF] truncate">
                            {item.procedure_description}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-[10px] text-[#8B98AB]">QTY</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateBasketDraftUnits(item.procedure_code, item.units - 1)
                            }
                            className="w-7 h-7 rounded-lg bg-[#0E1218] border border-[#2C3545] flex items-center justify-center text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center font-mono text-xs font-bold text-white">
                            {item.units}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateBasketDraftUnits(item.procedure_code, item.units + 1)
                            }
                            className="w-7 h-7 rounded-lg bg-[#0E1218] border border-[#2C3545] flex items-center justify-center text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              removeCodeFromBasketDraft(item.procedure_code)
                            }
                            className="p-1.5 text-[#8B98AB] hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setBasketBuilderOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-[#14181F] border border-[#232B38] text-xs font-semibold text-[#8B98AB] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!basketNameInput.trim() || basketDraftItems.length === 0}
                    onClick={handleSaveBasketBuilder}
                    className="px-4 py-2 rounded-xl bg-[#00D2C6] hover:bg-[#00E5D8] disabled:opacity-50 text-xs font-extrabold text-[#08080B]"
                  >
                    Save Basket
                  </button>
                </div>
              </div>
            )}

            {/* Category Filter Pills + Instant Search */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setProcCategory(tab.id)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold transition ${
                      procCategory === tab.id
                        ? 'bg-[#00D2C6] text-[#08080B]'
                        : 'bg-[#0E1218] text-[#8B98AB] hover:text-white border border-[#232B38]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-[#8B98AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={procQuery}
                  onChange={(e) => setProcQuery(e.target.value)}
                  placeholder="Filter by code or keyword (e.g. 75011, 75063, 75149, pacemaker, balloon, echo)..."
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

              {/* Visible One-Tap Code Picker List */}
              <div className="max-h-60 overflow-y-auto rounded-xl bg-[#0E1218] border border-[#232B38] divide-y divide-[#1A202B]">
                {visibleProcedures.length === 0 ? (
                  <div className="p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#8B98AB]">
                    <span>No matching tariff code in list.</span>
                    {procQuery.trim() && (
                      <button
                        type="button"
                        onClick={addCustomCodeFromSearch}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D2C6] text-[#08080B] font-mono font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Custom Code &ldquo;{procQuery.trim().toUpperCase()}&rdquo;</span>
                      </button>
                    )}
                  </div>
                ) : (
                  visibleProcedures.map((proc) => {
                    const isPicked = selectedCodeSet.has(proc.procedure_code);
                    const pickedItem = selectedTariffs.find(
                      (t) => t.procedure_code === proc.procedure_code
                    );

                    return (
                      <button
                        key={proc.procedure_code}
                        type="button"
                        onClick={() => toggleOrAddProcedureCode(proc)}
                        className={`w-full px-3.5 py-2.5 text-left transition flex items-center justify-between gap-3 ${
                          isPicked
                            ? 'bg-[#00D2C6]/10 hover:bg-[#00D2C6]/15'
                            : 'hover:bg-[#19202B]'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded bg-[#14181F] border border-[#2C3545] font-mono text-xs font-extrabold text-[#00D2C6] shrink-0">
                            {proc.procedure_code}
                          </span>
                          <span className="text-xs text-[#E2E8F0] line-clamp-2">
                            {proc.procedure_description}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold shrink-0 ${
                            isPicked
                              ? 'bg-[#00D2C6] text-[#08080B]'
                              : 'bg-[#14181F] border border-[#2C3545] text-[#00D2C6]'
                          }`}
                        >
                          {isPicked ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>QTY {pickedItem?.units ?? 1}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>Add</span>
                            </>
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Live Coding Guardrails */}
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
                          applyGuardrailFix(
                            alert.fixCode as string,
                            alert.fixUnits ?? 1
                          )
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

            {/* Selected Codes with Prominent QTY Controls */}
            {selectedTariffs.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-[#232B38]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#00D2C6]">
                    Selected Codes &amp; Quantities ({selectedTariffs.length})
                  </span>
                </div>

                {selectedTariffs.map((tariff) => {
                  const isTimeAddon = ALL_TIME_ADDON_CODES.has(
                    tariff.procedure_code
                  );
                  const isQtyHighlight = QTY_HIGHLIGHT_CODES.has(
                    tariff.procedure_code
                  );

                  return (
                    <div
                      key={tariff.procedure_code}
                      className="p-3.5 rounded-xl bg-[#0E1218] border border-[#2C3545] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#00D2C6]/15 border border-[#00D2C6]/35 font-mono text-xs font-bold text-[#00D2C6]">
                            {tariff.procedure_code}
                          </span>
                          {isQtyHighlight && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/35 font-mono text-[10px] font-bold text-amber-200">
                              SET QTY / HOURS
                            </span>
                          )}
                          {isTimeAddon &&
                            timing.extraThirtyMinAfterFirstHour > 0 && (
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
                                Sync {timing.extraThirtyMinAfterFirstHour} time
                                units
                              </button>
                            )}
                        </div>
                        <p className="text-xs text-[#C5D0DF] leading-relaxed">
                          {tariff.procedure_description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                        {isQtyHighlight && (
                          <div className="flex items-center gap-1 mr-1">
                            {[1, 2, 3, 4].map((q) => (
                              <button
                                key={q}
                                type="button"
                                onClick={() =>
                                  updateTariffUnits(tariff.procedure_code, q)
                                }
                                className={`w-7 h-7 rounded-lg font-mono text-xs font-bold transition ${
                                  tariff.units === q
                                    ? 'bg-[#00D2C6] text-[#08080B]'
                                    : 'bg-[#14181F] border border-[#232B38] text-[#8B98AB] hover:text-white'
                                }`}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        )}

                        <span className="text-[11px] font-mono font-bold text-[#8B98AB]">
                          QTY
                        </span>

                        <div className="inline-flex items-center rounded-lg bg-[#14181F] border border-[#2C3545]">
                          <button
                            type="button"
                            onClick={() =>
                              updateTariffUnits(
                                tariff.procedure_code,
                                tariff.units - 1
                              )
                            }
                            aria-label="Decrease quantity"
                            className="w-8 h-9 flex items-center justify-center text-[#C5D0DF] hover:text-white"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
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
                            className="w-12 h-9 bg-transparent font-mono text-sm font-bold text-center text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateTariffUnits(
                                tariff.procedure_code,
                                tariff.units + 1
                              )
                            }
                            aria-label="Increase quantity"
                            className="w-8 h-9 flex items-center justify-center text-[#C5D0DF] hover:text-white"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

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
                disabled={submitting || (!editingCase && !entitlement.canSubmitCase)}
                className={`flex-1 h-12 rounded-xl disabled:opacity-50 text-[#090B0E] font-[family-name:var(--font-montserrat)] font-extrabold text-sm tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-lg ${
                  editingCase
                    ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-400/20'
                    : 'bg-[#00D2C6] hover:bg-[#00E5D8] shadow-[#00D2C6]/20'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {editingCase ? 'Resubmitting Case...' : 'Submitting Case...'}
                    </span>
                  </>
                ) : editingCase ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Save &amp; Resubmit to Medical Bureau</span>
                  </>
                ) : !entitlement.canSubmitCase ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>Monthly Limit Reached — Upgrade / Key Below</span>
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
                              handleCopyPmsNumber(
                                c.id,
                                c.billed_invoice_ref as string
                              )
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

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8B98AB]">
                      <span>{c.service_date}</span>
                      <span>·</span>
                      <span>
                        {c.start_time?.slice(0, 5)} – {c.end_time?.slice(0, 5)} (
                        {c.duration_minutes}m / {c.calculated_time_units}u)
                      </span>
                      {c.medical_aid_name && c.medical_aid_name !== 'On Sticker' && (
                        <>
                          <span>·</span>
                          <span className="text-[#C5D0DF]">{c.medical_aid_name}</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-[#14181F] border border-[#232B38] font-mono text-[11px] text-[#E2E8F0]">
                        ICD: {c.primary_icd10}
                        {Array.isArray(c.secondary_icd10) &&
                        c.secondary_icd10.length > 0
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

                    {(parsedNotes.baseNotes ||
                      parsedNotes.resolutionReplies.length > 0) && (
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

                    {c.status === 'QUERIED' && (
                      <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 block">
                            Action Required · Medical Bureau Query
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-amber-100">
                            {c.office_query_note ||
                              'Medical Bureau requested clarification on this case.'}
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
                            onClick={() =>
                              startEditingCase(c, { focusReply: true })
                            }
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