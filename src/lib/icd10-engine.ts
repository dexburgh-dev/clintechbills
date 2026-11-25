import {
  ICD10Item,
  SelectedICD10,
  TariffCatalogItem,
  ValidationIssue,
  ValidationStatus,
} from '@/types/case';

/**
 * Schema-agnostic normalizer for public/data/icd10.json
 */
export function normalizeICD10Catalogue(raw: unknown): {
  items: ICD10Item[];
  byCode: Map<string, ICD10Item>;
} {
  let records: Record<string, unknown>[] = [];

  if (Array.isArray(raw)) {
    records = raw.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object');
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const listCandidate = obj.codes ?? obj.data ?? obj.icd10 ?? obj.items;
    if (Array.isArray(listCandidate)) {
      records = listCandidate.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object');
    } else {
      records = Object.entries(obj).map(([k, v]) => {
        if (typeof v === 'string') return { code: k, description: v };
        if (v && typeof v === 'object') return { code: k, ...(v as Record<string, unknown>) };
        return { code: k };
      });
    }
  }

  const parsed: (ICD10Item & { explicitPrimary: boolean | null })[] = [];

  for (const r of records) {
    const rawCode = String(
      r.code ?? r.icd10 ?? r.icd10_code ?? r.ICD10_Code ?? r.Code ?? r.id ?? ''
    )
      .trim()
      .toUpperCase();
    if (!rawCode) continue;

    const description = String(
      r.description ?? r.who_description ?? r.WHO_Full_Desc ?? r.desc ?? r.title ?? r.name ?? 'No description'
    ).trim();

    const chapter = String(
      r.chapter ?? r.chapter_desc ?? r.Chapter_Desc ?? r.chapter_name ?? 'General Classification'
    ).trim();

    const group = String(
      r.group ?? r.group_desc ?? r.Group_Desc ?? r.block ?? r.category ?? ''
    ).trim();

    const cleanCode = rawCode.replace(/[†*+]/g, '');
    const firstChar = cleanCode.charAt(0);
    const isExternalCause = ['V', 'W', 'X', 'Y'].includes(firstChar);
    const isTrauma = ['S', 'T'].includes(firstChar);
    const isAsterisk = rawCode.includes('*') || r.asterisk === true || r.is_asterisk === true;
    const isDagger =
      rawCode.includes('†') || rawCode.includes('+') || r.dagger === true || r.is_dagger === true;

    let explicitPrimary: boolean | null = null;
    if (typeof r.valid_primary === 'boolean') explicitPrimary = r.valid_primary;
    else if (typeof r.primary === 'boolean') explicitPrimary = r.primary;
    else if (typeof r.valid_clinical === 'boolean') explicitPrimary = r.valid_clinical;
    else if (typeof r.billable === 'boolean') explicitPrimary = r.billable;
    else if (typeof r.Valid_ICD10_Primary === 'string') {
      explicitPrimary = r.Valid_ICD10_Primary.trim().toUpperCase() === 'Y';
    }

    const genderRaw = String(r.gender ?? r.sex ?? r.Gender ?? '').trim().toUpperCase();
    const gender: 'M' | 'F' | null = genderRaw === 'M' || genderRaw === 'F' ? genderRaw : null;

    const ageLowRaw = r.age_low ?? r.min_age ?? r.Age_Low ?? null;
    const ageHighRaw = r.age_high ?? r.max_age ?? r.Age_High ?? null;

    parsed.push({
      code: rawCode,
      cleanCode,
      description,
      chapter,
      group,
      explicitPrimary,
      hasChildren: false,
      validPrimary: true,
      isExternalCause,
      isTrauma,
      isAsterisk,
      isDagger,
      gender,
      ageLow: ageLowRaw !== null && ageLowRaw !== '' ? Number(ageLowRaw) : null,
      ageHigh: ageHighRaw !== null && ageHighRaw !== '' ? Number(ageHighRaw) : null,
    });
  }

  const parentPrefixes = new Set<string>();
  for (const item of parsed) {
    if (item.cleanCode.includes('.')) {
      const [base, dec] = item.cleanCode.split('.');
      parentPrefixes.add(base);
      if (dec && dec.length > 1) {
        parentPrefixes.add(`${base}.${dec.charAt(0)}`);
      }
    }
  }

  const byCode = new Map<string, ICD10Item>();
  const items: ICD10Item[] = parsed.map(({ explicitPrimary, ...rest }) => {
    const hasChildren = parentPrefixes.has(rest.cleanCode);
    const validPrimary =
      explicitPrimary !== null
        ? explicitPrimary && !rest.isExternalCause && !rest.isAsterisk
        : !hasChildren && !rest.isExternalCause && !rest.isAsterisk;

    const finalItem: ICD10Item = {
      ...rest,
      hasChildren,
      validPrimary,
    };

    byCode.set(finalItem.code, finalItem);
    byCode.set(finalItem.cleanCode, finalItem);
    return finalItem;
  });

  return { items, byCode };
}

/**
 * Schema-agnostic normalizer for public/data/tariffs.json (Discipline 075)
 */
export function normalizeTariffCatalogue(raw: unknown): TariffCatalogItem[] {
  let records: Record<string, unknown>[] = [];

  if (Array.isArray(raw)) {
    records = raw.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object');
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const listCandidate = obj.tariffs ?? obj.codes ?? obj.data ?? obj.items;
    if (Array.isArray(listCandidate)) {
      records = listCandidate.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object');
    } else {
      records = Object.entries(obj).map(([k, v]) => {
        if (typeof v === 'string') return { code: k, description: v };
        if (v && typeof v === 'object') return { code: k, ...(v as Record<string, unknown>) };
        return { code: k };
      });
    }
  }

  const normalized: TariffCatalogItem[] = [];
  for (const r of records) {
    const code = String(
      r.code ?? r.tariff_code ?? r.item_code ?? r.Tariff_Code ?? r.Code ?? r.id ?? ''
    )
      .trim()
      .toUpperCase();
    if (!code) continue;

    const description = String(
      r.description ?? r.desc ?? r.procedure ?? r.title ?? r.name ?? 'Discipline 075 Procedure'
    ).trim();

    const category = String(r.category ?? r.group ?? r.section ?? 'Discipline 075').trim();
    const rawUnits = Number(r.units ?? r.default_units ?? r.unit_value ?? 1);
    const default_units = Number.isFinite(rawUnits) && rawUnits > 0 ? rawUnits : 1;

    const descLower = description.toLowerCase();
    const is_time_based =
      r.is_time_based === true ||
      descLower.includes('per 15 min') ||
      descLower.includes('per 30 min') ||
      descLower.includes('time') ||
      descLower.includes('perfusion') ||
      descLower.includes('monitoring');

    normalized.push({
      code,
      description,
      category,
      default_units,
      is_time_based,
    });
  }

  return normalized;
}

/**
 * Computes duration in minutes and standard 15-minute clinical technology time units
 */
export function calculateTheatreTiming(startTime: string, endTime: string): {
  durationMinutes: number;
  timeUnits15Min: number;
} {
  if (!startTime || !endTime) return { durationMinutes: 0, timeUnits15Min: 0 };

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) {
    return { durationMinutes: 0, timeUnits15Min: 0 };
  }

  const startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;
  // Support overnight / past-midnight theatre cases
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }

  const durationMinutes = endTotal - startTotal;
  const timeUnits15Min = durationMinutes > 0 ? Math.ceil(durationMinutes / 15) : 0;
  return { durationMinutes, timeUnits15Min };
}

/**
 * SA PHISC / CMS Pre-Switch Diagnosis Validator
 */
export function validateClaimDiagnoses(params: {
  primaryCode: string;
  secondaryCodes: SelectedICD10[];
  byCode: Map<string, ICD10Item>;
  patientSex?: 'ANY' | 'M' | 'F';
  patientAge?: number | null;
}): {
  status: ValidationStatus;
  findings: ValidationIssue[];
} {
  const { primaryCode, secondaryCodes, byCode, patientSex = 'ANY', patientAge = null } = params;
  const findings: ValidationIssue[] = [];

  if (!primaryCode) {
    return {
      status: 'REJECT_BLOCK',
      findings: [
        {
          level: 'BLOCK',
          rule_id: 'RULE-ICD-00',
          message: 'Primary ICD-10 diagnosis is required before submission.',
        },
      ],
    };
  }

  const pNorm = primaryCode.trim().toUpperCase();
  const pItem = byCode.get(pNorm) ?? byCode.get(pNorm.replace(/[†*+]/g, ''));

  if (!pItem) {
    return {
      status: 'REJECT_BLOCK',
      findings: [
        {
          level: 'BLOCK',
          rule_id: 'RULE-ICD-00',
          message: `Primary ICD-10 code '${pNorm}' was not found in the loaded SA ICD-10 catalogue.`,
        },
      ],
    };
  }

  const secItems: ICD10Item[] = [];
  for (const s of secondaryCodes) {
    const sNorm = s.code.trim().toUpperCase();
    const found = byCode.get(sNorm) ?? byCode.get(sNorm.replace(/[†*+]/g, ''));
    if (found) secItems.push(found);
  }

  const allItems = [pItem, ...secItems];

  if (pItem.isExternalCause) {
    findings.push({
      level: 'BLOCK',
      rule_id: 'RULE-ICD-01',
      message: `${pItem.code} is an External Cause code (V01–Y98) and cannot be billed as Primary.`,
    });
  }

  if (pItem.isAsterisk) {
    findings.push({
      level: 'BLOCK',
      rule_id: 'RULE-ICD-02',
      message: `${pItem.code} is an Asterisk (*) manifestation code. Pair with a Dagger (†) etiology code as Primary.`,
    });
  }

  if (pItem.hasChildren) {
    findings.push({
      level: 'BLOCK',
      rule_id: 'RULE-ICD-03',
      message: `${pItem.code} is a non-specific parent header. Select a full 4th/5th character subcode.`,
    });
  }

  const hasTrauma = allItems.some((i) => i.isTrauma);
  const hasExternal = secItems.some((i) => i.isExternalCause);
  if (hasTrauma && !hasExternal) {
    findings.push({
      level: 'BLOCK',
      rule_id: 'RULE-ICD-04',
      message: 'Trauma/Injury code (S00–T98) requires an External Cause code (V01–Y98) in Secondary diagnoses.',
    });
  }

  const seen = new Set<string>();
  for (const item of allItems) {
    if (seen.has(item.code)) {
      findings.push({
        level: 'WARN',
        rule_id: 'RULE-ICD-05',
        message: `Duplicate ICD-10 code ${item.code} detected on claim.`,
      });
    }
    seen.add(item.code);
  }

  for (const sec of secItems) {
    if (sec.hasChildren) {
      findings.push({
        level: 'WARN',
        rule_id: 'RULE-ICD-06',
        message: `Secondary code ${sec.code} has deeper subcodes available.`,
      });
    }
  }

  if (pItem.cleanCode.startsWith('R') && secItems.length === 0) {
    findings.push({
      level: 'WARN',
      rule_id: 'RULE-ICD-07',
      message: `${pItem.code} is a Chapter XVIII symptom/sign code; confirm definitive diagnosis if available.`,
    });
  }

  for (const item of allItems) {
    if (item.gender && patientSex !== 'ANY' && item.gender !== patientSex) {
      findings.push({
        level: 'BLOCK',
        rule_id: 'RULE-ICD-08',
        message: `${item.code} is restricted to biological sex '${item.gender}' (patient: '${patientSex}').`,
      });
    }
    if (patientAge !== null && !Number.isNaN(patientAge)) {
      if (item.ageLow !== null && patientAge < item.ageLow) {
        findings.push({
          level: 'BLOCK',
          rule_id: 'RULE-ICD-08',
          message: `${item.code} requires minimum age ${item.ageLow} yrs (patient: ${patientAge}).`,
        });
      }
      if (item.ageHigh !== null && patientAge > item.ageHigh) {
        findings.push({
          level: 'BLOCK',
          rule_id: 'RULE-ICD-08',
          message: `${item.code} restricts maximum age to ${item.ageHigh} yrs (patient: ${patientAge}).`,
        });
      }
    }
  }

  const hasBlock = findings.some((f) => f.level === 'BLOCK');
  const hasWarn = findings.some((f) => f.level === 'WARN');

  if (hasBlock) {
    return { status: 'REJECT_BLOCK', findings };
  }
  if (hasWarn) {
    return { status: 'PASS_WITH_WARNINGS', findings };
  }

  return {
    status: 'CLEARED',
    findings: [
      {
        level: 'PASS',
        rule_id: 'SA-MIT-PASS',
        message: `${pItem.code} cleared all SA PHISC / CMS pre-switch checks.`,
      },
    ],
  };
}