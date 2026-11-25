export interface ProcedureItem {
  procedure_code: string;
  procedure_description: string;
  category?: 'PERFUSION' | 'CRITICAL_CARE' | 'CARDIAC_RHYTHM' | 'NEURO' | 'PULMONOLOGY' | 'MODIFIER';
  is_time_addon?: boolean;
  paired_base_code?: string;
}

export interface SelectedTariff extends ProcedureItem {
  units: number;
}

export interface Icd10Item {
  code: string;
  description: string;
}

export interface ClinicalMacro {
  id: string;
  label: string;
  subtitle: string;
  codes: string[];
  defaultIcd10?: Icd10Item;
}

export interface TheatreTimingResult {
  durationMinutes: number;
  thirtyMinUnits: number;
  extraThirtyMinAfterFirstHour: number;
  isAfterHours: boolean;
  isWeekend: boolean;
  afterHoursReason: string | null;
}

export interface CodingGuardrailAlert {
  id: string;
  severity: 'warning' | 'info';
  title: string;
  detail: string;
  fixActionLabel?: string;
  fixCode?: string;
  fixUnits?: number;
}

export const DISCIPLINE_075_PROCEDURES: ProcedureItem[] = [
  {
    procedure_code: '75003',
    procedure_description:
      'Emergency after-hours callout / unscheduled theatre or ICU attendance (18:00–07:00 weekdays, weekends & public holidays)',
    category: 'MODIFIER',
  },
  {
    procedure_code: '75011',
    procedure_description:
      'Continuous Renal Replacement Therapy (CRRT) / Acute Haemodialysis: Initiation, priming & first hour',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75013',
    procedure_description:
      'CRRT / Acute Haemodialysis: Each subsequent 30 minutes or major part thereof after first hour',
    category: 'CRITICAL_CARE',
    is_time_addon: true,
    paired_base_code: '75011',
  },
  {
    procedure_code: '75021',
    procedure_description:
      'Pacemaker / ICD / CRT interrogation, threshold testing & programming (in-theatre or ward)',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75023',
    procedure_description:
      'Permanent Pacemaker / ICD implantation: Intra-operative electrophysiological & pacing support',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75025',
    procedure_description:
      'Electrophysiology (EP) study / Radiofrequency ablation technical mapping support',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75031',
    procedure_description:
      'Complete Pulmonary Function Testing (Spirometry, Lung Volumes & DLCO)',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75041',
    procedure_description:
      'Intra-operative Neurophysiological Monitoring (IONM / SSEP / MEP): Setup & first hour',
    category: 'NEURO',
  },
  {
    procedure_code: '75043',
    procedure_description:
      'Intra-operative Neurophysiological Monitoring (IONM): Each subsequent 30 minutes after first hour',
    category: 'NEURO',
    is_time_addon: true,
    paired_base_code: '75041',
  },
  {
    procedure_code: '75051',
    procedure_description:
      'Full Polysomnography / Diagnostic Sleep Study technical setup & scoring',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75063',
    procedure_description:
      'Cardiopulmonary Bypass (Heart-Lung Machine): Setup, priming & first hour of perfusion',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75065',
    procedure_description:
      'Cardiopulmonary Bypass: Each subsequent 30 minutes or major part thereof after first hour',
    category: 'PERFUSION',
    is_time_addon: true,
    paired_base_code: '75063',
  },
  {
    procedure_code: '75067',
    procedure_description:
      'Paediatric / Neonatal Cardiopulmonary Bypass: Setup, priming & first hour',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75068',
    procedure_description:
      'Paediatric / Neonatal Cardiopulmonary Bypass: Each subsequent 30 minutes after first hour',
    category: 'PERFUSION',
    is_time_addon: true,
    paired_base_code: '75067',
  },
  {
    procedure_code: '75070',
    procedure_description:
      'Modified Ultrafiltration (MUF) / Intra-operative haemofiltration during bypass',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75071',
    procedure_description:
      'Left / Right Heart Bypass (Minimally Invasive / Thoracoabdominal): Subsequent 30 minutes',
    category: 'PERFUSION',
    is_time_addon: true,
  },
  {
    procedure_code: '75075',
    procedure_description:
      'Intra-Aortic Balloon Pump (IABP): Console setup, ECG/pressure triggering & initiation',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75079',
    procedure_description:
      'Intra-operative Autotransfusion / Cell Saver blood salvage & washing',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75083',
    procedure_description:
      'Extracorporeal Membrane Oxygenation (VA / VV ECMO): Circuit priming, cannulation support & first hour',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75085',
    procedure_description:
      'Extracorporeal Membrane Oxygenation (ECMO): Each subsequent 30 minutes or major part thereof',
    category: 'CRITICAL_CARE',
    is_time_addon: true,
    paired_base_code: '75083',
  },
];

export const DEFAULT_ICD10_CODES: Icd10Item[] = [
  { code: 'I25.1', description: 'Atherosclerotic heart disease of native coronary artery' },
  { code: 'I21.9', description: 'Acute myocardial infarction, unspecified' },
  { code: 'I35.0', description: 'Nonrheumatic aortic (valve) stenosis' },
  { code: 'I34.0', description: 'Nonrheumatic mitral (valve) insufficiency' },
  { code: 'I71.0', description: 'Dissection of aorta' },
  { code: 'I48.0', description: 'Paroxysmal atrial fibrillation' },
  { code: 'I44.2', description: 'Atrioventricular block, complete' },
  { code: 'I49.0', description: 'Ventricular fibrillation and flutter' },
  { code: 'I50.0', description: 'Congestive heart failure' },
  { code: 'N17.9', description: 'Acute kidney failure, unspecified' },
  { code: 'N18.5', description: 'Chronic kidney disease, stage 5' },
  { code: 'J80', description: 'Acute respiratory distress syndrome (ARDS)' },
  { code: 'J96.0', description: 'Acute respiratory failure' },
  { code: 'Q21.0', description: 'Ventricular septal defect' },
  { code: 'Q21.1', description: 'Atrial septal defect' },
  { code: 'M41.9', description: 'Scoliosis, unspecified (IONM spinal fusion)' },
  { code: 'G47.3', description: 'Sleep apnoea' },
  { code: 'J45.9', description: 'Asthma, unspecified' },
];

export const CLINICAL_MACROS: ClinicalMacro[] = [
  {
    id: 'cpb-standard',
    label: 'CPB Bypass + Cell Saver',
    subtitle: '75063 + 75065 (time) + 75079',
    codes: ['75063', '75065', '75079'],
    defaultIcd10: {
      code: 'I25.1',
      description: 'Atherosclerotic heart disease of native coronary artery',
    },
  },
  {
    id: 'cpb-valve-muf',
    label: 'Valve Bypass + MUF',
    subtitle: '75063 + 75065 (time) + 75070 + 75079',
    codes: ['75063', '75065', '75070', '75079'],
    defaultIcd10: {
      code: 'I35.0',
      description: 'Nonrheumatic aortic (valve) stenosis',
    },
  },
  {
    id: 'ecmo-init',
    label: 'ECMO Initiation',
    subtitle: '75083 + 75085 (time)',
    codes: ['75083', '75085'],
    defaultIcd10: {
      code: 'J80',
      description: 'Acute respiratory distress syndrome (ARDS)',
    },
  },
  {
    id: 'crrt-icu',
    label: 'ICU CRRT / Dialysis',
    subtitle: '75011 + 75013 (time)',
    codes: ['75011', '75013'],
    defaultIcd10: {
      code: 'N17.9',
      description: 'Acute kidney failure, unspecified',
    },
  },
  {
    id: 'ppm-implant',
    label: 'Pacemaker / ICD Implant',
    subtitle: '75023 intra-op support',
    codes: ['75023'],
    defaultIcd10: {
      code: 'I44.2',
      description: 'Atrioventricular block, complete',
    },
  },
  {
    id: 'ionm-spine',
    label: 'IONM Neuro Monitoring',
    subtitle: '75041 + 75043 (time)',
    codes: ['75041', '75043'],
    defaultIcd10: {
      code: 'M41.9',
      description: 'Scoliosis, unspecified (IONM spinal fusion)',
    },
  },
];

export const TIME_ADDON_PAIRINGS: Array<{
  baseCode: string;
  addonCode: string;
  label: string;
}> = [
  { baseCode: '75063', addonCode: '75065', label: 'Cardiopulmonary Bypass (> 60m)' },
  { baseCode: '75067', addonCode: '75068', label: 'Paediatric CPB (> 60m)' },
  { baseCode: '75083', addonCode: '75085', label: 'ECMO Run (> 60m)' },
  { baseCode: '75011', addonCode: '75013', label: 'CRRT / Haemodialysis (> 60m)' },
  { baseCode: '75041', addonCode: '75043', label: 'IONM Monitoring (> 60m)' },
];

export const ALL_TIME_ADDON_CODES = new Set([
  '75013',
  '75043',
  '75065',
  '75068',
  '75071',
  '75085',
]);

export function calculateTheatreTiming(
  startTime: string,
  endTime: string,
  serviceDate?: string
): TheatreTimingResult {
  const [sh, sm] = (startTime || '00:00').split(':').map(Number);
  const [eh, em] = (endTime || '00:00').split(':').map(Number);

  if (
    Number.isNaN(sh) ||
    Number.isNaN(sm) ||
    Number.isNaN(eh) ||
    Number.isNaN(em)
  ) {
    return {
      durationMinutes: 0,
      thirtyMinUnits: 0,
      extraThirtyMinAfterFirstHour: 0,
      isAfterHours: false,
      isWeekend: false,
      afterHoursReason: null,
    };
  }

  const startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;

  // Handle overnight cases crossing midnight
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }

  const durationMinutes = Math.max(0, endTotal - startTotal);
  const thirtyMinUnits = durationMinutes > 0 ? Math.ceil(durationMinutes / 30) : 0;
  const extraThirtyMinAfterFirstHour =
    durationMinutes > 60 ? Math.ceil((durationMinutes - 60) / 30) : 0;

  let isWeekend = false;
  if (serviceDate) {
    const parsed = new Date(`${serviceDate}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      const day = parsed.getDay();
      isWeekend = day === 0 || day === 6;
    }
  }

  const startsAfterHours = sh >= 18 || sh < 7;
  const endsAfterHours = eh >= 18 || (eh === 18 && em > 0) || endTotal > 24 * 60;
  const isAfterHours = isWeekend || startsAfterHours || endsAfterHours;

  let afterHoursReason: string | null = null;
  if (isWeekend) {
    afterHoursReason = 'Weekend service date detected';
  } else if (startsAfterHours) {
    afterHoursReason = `Case started after-hours (${startTime.slice(0, 5)})`;
  } else if (endsAfterHours) {
    afterHoursReason = `Case ran past 18:00 (${endTime.slice(0, 5)})`;
  }

  return {
    durationMinutes,
    thirtyMinUnits,
    extraThirtyMinAfterFirstHour,
    isAfterHours,
    isWeekend,
    afterHoursReason,
  };
}

export function evaluateDiscipline075Guardrails(params: {
  selectedTariffs: SelectedTariff[];
  timing: TheatreTimingResult;
}): CodingGuardrailAlert[] {
  const { selectedTariffs, timing } = params;
  const alerts: CodingGuardrailAlert[] = [];
  if (selectedTariffs.length === 0) return alerts;

  const selectedMap = new Map(
    selectedTariffs.map((t) => [t.procedure_code, t])
  );

  // 1. Check missing time add-on codes when duration > 60 minutes
  if (timing.extraThirtyMinAfterFirstHour > 0) {
    for (const pair of TIME_ADDON_PAIRINGS) {
      if (selectedMap.has(pair.baseCode) && !selectedMap.has(pair.addonCode)) {
        alerts.push({
          id: `missing-addon-${pair.addonCode}`,
          severity: 'warning',
          title: `Missing Time Units (${pair.addonCode})`,
          detail: `${pair.label} ran ${timing.durationMinutes} mins (${timing.extraThirtyMinAfterFirstHour} extra 30-min units after the first hour).`,
          fixActionLabel: `Add ${pair.addonCode} (×${timing.extraThirtyMinAfterFirstHour})`,
          fixCode: pair.addonCode,
          fixUnits: timing.extraThirtyMinAfterFirstHour,
        });
      }
    }
  }

  // 2. Check if selected time add-on units are out of sync with duration
  if (timing.extraThirtyMinAfterFirstHour > 0) {
    for (const pair of TIME_ADDON_PAIRINGS) {
      const addon = selectedMap.get(pair.addonCode);
      if (addon && addon.units !== timing.extraThirtyMinAfterFirstHour) {
        alerts.push({
          id: `sync-addon-${pair.addonCode}`,
          severity: 'info',
          title: `Time Units Mismatch on ${pair.addonCode}`,
          detail: `Case duration is ${timing.durationMinutes} mins (${timing.extraThirtyMinAfterFirstHour} units after 1st hr), but ${pair.addonCode} is set to ×${addon.units}.`,
          fixActionLabel: `Set ${pair.addonCode} to ×${timing.extraThirtyMinAfterFirstHour}`,
          fixCode: pair.addonCode,
          fixUnits: timing.extraThirtyMinAfterFirstHour,
        });
      }
    }
  }

  // 3. Check After-Hours / Weekend modifier 75003
  if (timing.isAfterHours && !selectedMap.has('75003')) {
    alerts.push({
      id: 'after-hours-75003',
      severity: 'info',
      title: 'After-Hours / Weekend Eligible (75003)',
      detail: `${timing.afterHoursReason}. If this was an unscheduled emergency callout, include tariff 75003.`,
      fixActionLabel: 'Add 75003 Emergency Callout',
      fixCode: '75003',
      fixUnits: 1,
    });
  }

  return alerts;
}