export interface ProcedureItem {
  procedure_code: string;
  procedure_description: string;
  category?:
    | 'PERFUSION'
    | 'CATH_LAB'
    | 'CARDIAC_RHYTHM'
    | 'CRITICAL_CARE'
    | 'DIAGNOSTICS'
    | 'MODIFIER';
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
    procedure_code: '75011',
    procedure_description:
      'AM PREPARATION OF EXTRA-CORPOREAL EQUIPMENT FOR SURGICAL PROCEDURES.',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75013',
    procedure_description:
      'AM CONTINUED OPERATION OF EXTRA-CORPOREAL EQUIPMENT DURING SURGERY FOR A TIME IN EXCESS OF ONE HOUR IN 30 MINUTE INCREMENTS',
    category: 'PERFUSION',
    is_time_addon: true,
    paired_base_code: '75011',
  },
  {
    procedure_code: '75014',
    procedure_description: 'PM RADIOFREQUENCY CATHETER ABLATIONS',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75015',
    procedure_description:
      'AM PREPARATION AND OPERATION OF PRE-OPERATIVE, INTRA-OPERATIVE OR POST OPERATIVE PHYSIOLOGICAL MONITORING PER PATIENT, PER PROCEDURE',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75021',
    procedure_description:
      'PM PREPARATION AND OPERATION OF INTRA-AORTIC BALLOON PUMP IN THEATRE, INTENSIVE CARE UNIT AND CATHETERISATION LABORATORY',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75027',
    procedure_description:
      'AM PREPARATION AND OPERATION OF A PRE- AND POST-OPERATIVE BLOOD SALVAGE DEVICE.',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75029',
    procedure_description:
      'PM PREPARATION AND OPERATION OF AN AUTOTRANSFUSION CELL WASHING SYSTEM.',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75031',
    procedure_description:
      'AM DETERMINATION AND MONITORING OF HAEMODYNAMIC/PULMONARY PARAMETERS, METABOLISM, ARTERIAL/VENOUS PRESSURE FLOW STUDIES',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75033',
    procedure_description:
      'AM ASSISTANCE WITH BRONCHOSCOPY PROCEDURES, PLACEMENT OF ARTERIAL/VENOUS CATHETERS, ULTRASOUND EXAMINATIONS OR PHOTOGRAPHY',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75049',
    procedure_description: 'AM EXERCISE TESTING (EIA).',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75062',
    procedure_description: 'ASSIST IN PREP AND OP OF RROTABLATOR PROCEDURE',
    category: 'CATH_LAB',
  },
  {
    procedure_code: '75063',
    procedure_description: 'CARDIAC CATH FOR FIRST HOUR',
    category: 'CATH_LAB',
  },
  {
    procedure_code: '75064',
    procedure_description: 'INTRAVASCULA ULTRASOUND',
    category: 'CATH_LAB',
  },
  {
    procedure_code: '75065',
    procedure_description:
      'EACH ADDITIONAL 30 MIN OR PART THEREOF PROVIDED PART IS 50% OR MORE OF TIME',
    category: 'CATH_LAB',
    is_time_addon: true,
    paired_base_code: '75063',
  },
  {
    procedure_code: '75066',
    procedure_description:
      'EACH ADDITIONAL 30 MIN OR PART THEREOF PROVIDED PART IS 50% OR MORE OF TIME',
    category: 'CATH_LAB',
    is_time_addon: true,
    paired_base_code: '75068',
  },
  {
    procedure_code: '75067',
    procedure_description:
      'CARDIAC ELECTRO PHYSIOLOGY AND RELATED PROCEDURES FOR FIRST FOUR HOURS',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75068',
    procedure_description: 'CARDIAC CATH TIGHT HEART STUDIES',
    category: 'CATH_LAB',
  },
  {
    procedure_code: '75069',
    procedure_description: 'TEMP AND SINGLE PACEMAKERS',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75070',
    procedure_description:
      'PERMANENT AND DUAL PACEMAKER PROCEDURE OR IMPLANTATION AND TESTING OF ICD DEVICES NOT CHARGED WITH 063 OR 065',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75071',
    procedure_description:
      'EACH ADDITIONAL 30 MIN OR PART THEREOF PROVIDED PART IS 50% OR MORE OF TIME',
    category: 'CARDIAC_RHYTHM',
    is_time_addon: true,
    paired_base_code: '75070',
  },
  {
    procedure_code: '75072',
    procedure_description: 'MULTISITE PACING (BI-VENTRICULAR PACING)',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75073',
    procedure_description: 'DILITATION PROCEDURES AND STENTS',
    category: 'CATH_LAB',
  },
  {
    procedure_code: '75074',
    procedure_description:
      'WAVEMAP-MEASUREMENT OF FRACTIONAL FLOW RESERVE TO ASSESS THE FUNCTIONAL SEVERITY OF CORONARY ARTERY STENOSIS',
    category: 'CATH_LAB',
  },
  {
    procedure_code: '75075',
    procedure_description: 'PACEMAKER CHECKING AND OR REPROGRAMMING',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75077',
    procedure_description: '24 HOUR HOLTER AMBULATORY MONITORING',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75079',
    procedure_description: 'CARDIAC EXCERSIZE STRESS TESTING',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75081',
    procedure_description: 'RECORDING OF TWELVE LEAD ECG',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75085',
    procedure_description:
      'AM EACH ADDITIONAL 30 MINUTES OR PART THEREOF, PROVIDED THAT SUCH PART COMPRISES 50% OR MORE OF THE TIME.',
    category: 'CRITICAL_CARE',
    is_time_addon: true,
    paired_base_code: '75145',
  },
  {
    procedure_code: '75087',
    procedure_description: 'M MODE ECHOCARDIOGRAM',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75089',
    procedure_description: '2D ECHOCARDIOGRAM',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75091',
    procedure_description: 'DOPPLER FLOW',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75093',
    procedure_description: 'COLOR IMAGING',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75095',
    procedure_description: 'ECG SIGNAL AVERAGING',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75097',
    procedure_description: 'AMBULATORY BLOOD PRESSURE MONITORING',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75099',
    procedure_description: 'VECTOR CARDIOGRAM',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75111',
    procedure_description: 'TRANSOESOPHAGEAL ECHOCARDIOGRAM',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75145',
    procedure_description:
      'AM PREPARATION OF EXTRA-CORPOREAL EQUIPMENT: HAEMOPERFUSION (HP), HAEMOFILTRATION (HF), HAEMOCONCENTRATION (HC), CONTINUOUS RENAL REPLACEMENT THERAPY (CRRT)',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75149',
    procedure_description:
      'AM TREATMENT PROCEDURE PER 1 HOUR (EXCLUDING ACUTE HAEMODIALYSIS, CHRONIC HAEMODIALYSIS AND CRRT)',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75157',
    procedure_description:
      'AM STANDBY WITH EXTRA CORPOREAL EQUIPMENT (MAXIMUM 4 HOURS) (PER EVENT).',
    category: 'PERFUSION',
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
  { code: 'G47.3', description: 'Sleep apnoea' },
  { code: 'J45.9', description: 'Asthma, unspecified' },
];

export const CLINICAL_MACROS: ClinicalMacro[] = [
  {
    id: 'cpb-cell-saver',
    label: 'CPB Bypass + Cell Saver',
    subtitle: '75011 + 75013 (time) + 75029',
    codes: ['75011', '75013', '75029'],
    defaultIcd10: {
      code: 'I25.1',
      description: 'Atherosclerotic heart disease of native coronary artery',
    },
  },
  {
    id: 'cpb-iabp',
    label: 'CPB + Cell Saver + IABP',
    subtitle: '75011 + 75013 (time) + 75029 + 75021',
    codes: ['75011', '75013', '75029', '75021'],
    defaultIcd10: {
      code: 'I35.0',
      description: 'Nonrheumatic aortic (valve) stenosis',
    },
  },
  {
    id: 'cath-stent',
    label: 'Cardiac Cath + Stents',
    subtitle: '75063 + 75065 (time) + 75073',
    codes: ['75063', '75065', '75073'],
    defaultIcd10: {
      code: 'I21.9',
      description: 'Acute myocardial infarction, unspecified',
    },
  },
  {
    id: 'ppm-dual-icd',
    label: 'Dual Pacemaker / ICD',
    subtitle: '75070 + 75071 (time)',
    codes: ['75070', '75071'],
    defaultIcd10: {
      code: 'I44.2',
      description: 'Atrioventricular block, complete',
    },
  },
  {
    id: 'ep-ablation',
    label: 'EP Study + RF Ablation',
    subtitle: '75067 (First 4h) + 75014',
    codes: ['75067', '75014'],
    defaultIcd10: {
      code: 'I48.0',
      description: 'Paroxysmal atrial fibrillation',
    },
  },
  {
    id: 'crrt-hf',
    label: 'CRRT / Haemofiltration',
    subtitle: '75145 + 75085 (time)',
    codes: ['75145', '75085'],
    defaultIcd10: {
      code: 'N17.9',
      description: 'Acute kidney failure, unspecified',
    },
  },
];

export const TIME_ADDON_PAIRINGS: Array<{
  baseCode: string;
  addonCode: string;
  label: string;
}> = [
  {
    baseCode: '75011',
    addonCode: '75013',
    label: 'Extra-Corporeal Surgical Equipment (> 60m)',
  },
  {
    baseCode: '75063',
    addonCode: '75065',
    label: 'Cardiac Catheterisation (> 60m)',
  },
  {
    baseCode: '75068',
    addonCode: '75066',
    label: 'Cardiac Cath Right Heart Studies (> 60m)',
  },
  {
    baseCode: '75070',
    addonCode: '75071',
    label: 'Permanent / Dual Pacemaker or ICD (> 60m)',
  },
  {
    baseCode: '75145',
    addonCode: '75085',
    label: 'HP / HF / HC / CRRT Extra-Corporeal Run (> 60m)',
  },
];

export const ALL_TIME_ADDON_CODES = new Set([
  '75013',
  '75065',
  '75066',
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
  // Subsequent 30-min increments apply after first 60m (provided part is >= 50% i.e. >= 15 mins)
  const extraMinutes = Math.max(0, durationMinutes - 60);
  const fullBlocks = Math.floor(extraMinutes / 30);
  const remainderMinutes = extraMinutes % 30;
  const extraThirtyMinAfterFirstHour =
    extraMinutes > 0 ? fullBlocks + (remainderMinutes >= 15 ? 1 : 0) : 0;

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

  // 1. Check missing time add-on codes when duration > 60 minutes (with >=15 min part rule)
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

  // 3. Enforce tariff 75070 rule: NOT CHARGED WITH 75063 OR 75065
  if (
    selectedMap.has('75070') &&
    (selectedMap.has('75063') || selectedMap.has('75065'))
  ) {
    alerts.push({
      id: 'conflict-75070-063-065',
      severity: 'warning',
      title: 'Tariff Exclusion Conflict (75070 vs 75063/75065)',
      detail:
        'Per Discipline 075 rules, tariff 75070 (Permanent/Dual Pacemaker or ICD) may NOT be charged together with 75063 or 75065. Remove 75063/75065 or use 75071 for additional 30-min time.',
    });
  }

  // 4. After-hours / weekend reminder
  if (timing.isAfterHours) {
    alerts.push({
      id: 'after-hours-note',
      severity: 'info',
      title: 'After-Hours / Weekend Case Detected',
      detail: `${timing.afterHoursReason}. Verify whether after-hours motivation / emergency callout notes apply for the bureau.`,
    });
  }

  return alerts;
}