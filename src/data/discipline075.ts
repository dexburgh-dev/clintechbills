export interface ProcedureItem {
  procedure_code: string;
  procedure_description: string;
  category?:
    | 'PERFUSION'
    | 'CATH_LAB'
    | 'CARDIAC_RHYTHM'
    | 'CRITICAL_CARE'
    | 'NEURO'
    | 'PULMONOLOGY'
    | 'DIAGNOSTICS';
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
  extraHoursAfterFirstHour: number;
  extraThirtyMinAfterFourHours: number;
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

export interface ConsumableItemEntry {
  name: string;
  qty: number;
  expiryDate?: string;
}

export interface FilterItemEntry {
  type: string;
  qty: number;
}

export interface BloodBankUnitEntry {
  bloodType: string;
  unitNumber: string;
}

export interface PerfusionCaseMetadata {
  mainMemberName?: string;
  medicalAidOption?: string;
  patientIdNumber?: string;
  patientDob?: string;
  postalAddress?: string;
  authorisationNumber?: string;
  surgeonPracticeNo?: string;
  referringDoctor?: string;
  procedurePerformed?: string;
  bloodLossMl?: string;
  cellSavedMl?: string;
  cellSavedHct?: string;
  hepsalineStrength?: '40 000' | '30 000' | '25 000' | '';
  hepsalineQty?: number;
  consumables?: ConsumableItemEntry[];
  infusionFilters?: FilterItemEntry[];
  bloodBankUnits?: BloodBankUnitEntry[];
  theatreSister?: string;
}

export const DISCIPLINE_075_PROCEDURES: ProcedureItem[] = [
  {
    procedure_code: '75010',
    procedure_description: 'ABLATIONS',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75011',
    procedure_description:
      'PREPARATION OF EXTRA-CORPOREAL EQUIPMENT FOR SURGICAL PROCEDURES.',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75012',
    procedure_description:
      'OPERATION OF HEART LASER DURING MYOCARDIAL REVASCULARISATION',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75013',
    procedure_description:
      'CONTINUED OPERATION OF EXTRA-CORPOREAL EQUIPMENT DURING SURGERY FOR A TIME IN EXCESS OF ONE HOUR IN 30 MINUTE INCREMENTS OR PART THEREOF PROVIDED THAT SUCH PART COMPRISES 50% OR MORE OF THE TIME',
    category: 'PERFUSION',
    is_time_addon: true,
    paired_base_code: '75011',
  },
  {
    procedure_code: '75014',
    procedure_description: 'RADIOFREQUENCY CATHETER ABLATIONS',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75015',
    procedure_description:
      'PREPARATION AND OPERATION OF PRE-OPERATIVE, INTRA-OPERATIVE OR POST OPERATIVE PHYSIOLOGICAL MONITORING PER PATIENT, PER ADMISSION',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75017',
    procedure_description:
      'STANDBY WITH EXTRA-CORPOREAL EQUIPMENT FOR SURGERY WITHIN HOSPITAL',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75019',
    procedure_description:
      'STANDBY WITHIN THE HOSPITAL FOR CORONARY ANGIOPLASTY.',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75021',
    procedure_description:
      'PREPARATION AND OPERATION OF INTRA-AORTIC BALLOON PUMP IN THEATRE, INTENSIVE CARE UNIT AND CATHETERISATION LABORATORY.',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75023',
    procedure_description:
      'GLOBAL FEE FOR PREPARATION AND OPERATION AND REMOVAL OF CARDIO ASSIST DEVICE (LVAD, RVAD, BVAD) IN THEATRE AND INTENSIVE CARE UNIT.',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75027',
    procedure_description:
      'PREPARATION AND OPERATION OF A PRE- AND POST-OPERATIVE BLOOD SALVAGE DEVICE.',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75029',
    procedure_description:
      'PREPARATION AND OPERATION OF AN AUTOTRANSFUSION CELL WASHING SYSTEM.',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75031',
    procedure_description:
      'DETERMINATION AND MONITORING OF HAEMODYNAMIC/PULMONARY PARAMETERS, METABOLISM, ARTERIAL/VENOUS PRESSURE FLOW STUDIES IN HIGH CARE/ICU (PER PATIENT PER MULTIPLE PROCEDURES PER DAY)',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75033',
    procedure_description:
      'ASSISTANCE WITH BRONCHOSCOPY PROCEDURES, PLACEMENT OF ARTERIAL/VENOUS CATHETERS, ULTRASOUND EXAMINATIONS OR PHOTOGRAPHY.',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75034',
    procedure_description: 'LYMPH COMPRESSION TREATMENT.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75035',
    procedure_description: 'NEBULIZATION (PER ONE PROCEDURE).',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75037',
    procedure_description:
      'MEASUREMENT OF LUNG VOLUMES AND CAPACITIES BY MEANS OF CLOSED CIRCUIT (HE) OR (N2) WASHOUT OR BODY PLETHYSMOGRAPHY.',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75039',
    procedure_description: 'FLOW-VOLUME DETERMINATIONS.',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75041',
    procedure_description: 'FLOW-VOLUME (PRE-POST B-D).',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75043',
    procedure_description:
      'AIRWAYS RESISTANCE AND CONDUCTANCE MEASUREMENTS USING PLETHYSMOGRAPH OR SIMILAR APPARATUS.',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75045',
    procedure_description: 'GAS DISTRIBUTION MEASUREMENTS.',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75047',
    procedure_description: 'DIFFUSION DETERMINATIONS.',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75049',
    procedure_description: 'EXERCISE TESTING (EIA).',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75050',
    procedure_description: 'ECMO CHANGE-OUT AND RE-ESTABLISHMENT.',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75051',
    procedure_description:
      'EXERCISE TESTING WITH RECORDING OF : VT, VO2, HR, RR, ECG AND OXIMETRY',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75053',
    procedure_description: 'ALLERGY TESTS.',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75055',
    procedure_description: 'IF RAST INCLUDED ADD (PER ALLERGEN).',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75057',
    procedure_description: 'BRONCHIAL PROVOCATION TESTING.',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75059',
    procedure_description: 'COMPLIANCE MEASUREMENTS.',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75061',
    procedure_description:
      'MAXIMUM INSPIRATORY (MIP) AND/OR EXPIRATORY (MEP) PRESSURES AND/OR VITAL CAPACITY AND/OR PEFR.',
    category: 'PULMONOLOGY',
  },
  {
    procedure_code: '75062',
    procedure_description:
      'ASSIST IN PREPARATIONS AND OPERATIONS OF ROTABLATOR PROCEDURES',
    category: 'CATH_LAB',
  },
  {
    procedure_code: '75063',
    procedure_description: 'CARDIAC CATHETERISATION FOR THE FIRST HOUR.',
    category: 'CATH_LAB',
  },
  {
    procedure_code: '75064',
    procedure_description: 'INTRAVASCULAR ULTRASOUND (IVUS)',
    category: 'CATH_LAB',
  },
  {
    procedure_code: '75065',
    procedure_description:
      'EACH ADDITIONAL 30 MINUTES OR PART THEREOF PROVIDED THAT SUCH PART COMPRISES 50% OR MORE OF THE TIME',
    category: 'CATH_LAB',
    is_time_addon: true,
    paired_base_code: '75063',
  },
  {
    procedure_code: '75066',
    procedure_description: 'CARDIAC CATH RIGHT HEART STUDIES',
    category: 'CATH_LAB',
  },
  {
    procedure_code: '75067',
    procedure_description:
      'CARDIAC ELECTRO PHYSIOLOGY AND RELATED PROCEDURES FOR FIRST FOUR HOURS.',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75068',
    procedure_description:
      'EACH ADDITIONAL 30 MINUTES OR PART THEREOF PROVIDED THAT SUCH PART COMPRISES 50% OR MORE OF THE TIME.',
    category: 'CARDIAC_RHYTHM',
    is_time_addon: true,
    paired_base_code: '75067',
  },
  {
    procedure_code: '75069',
    procedure_description: 'TEMPORARY AND SINGLE PACEMAKER PROCEDURES.',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75070',
    procedure_description:
      'PERMANENT AND DUAL PACEMAKER PROCEDURES OR IMPLANTATION AND TESTING OF ICD DEVICES.',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75071',
    procedure_description:
      'EACH ADDITIONAL 30 MINUTES OR PART THEREOF PROVIDED THAT SUCH PART COMPRISES 50% OR MORE OF THE TIME.',
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
    procedure_description: 'DILATATION PROCEDURES AND STENTS.',
    category: 'CATH_LAB',
  },
  {
    procedure_code: '75074',
    procedure_description:
      'WAVEMAP - MEASUREMENT OF FRACTIONAL FLOW RESERVE TO ASSESS THE FUNCTIONAL SEVERITY OF CORONARY ARTERY STENOSES',
    category: 'CATH_LAB',
  },
  {
    procedure_code: '75075',
    procedure_description: 'PACEMAKER CHECKING AND/OR REPROGRAMMING.',
    category: 'CARDIAC_RHYTHM',
  },
  {
    procedure_code: '75077',
    procedure_description: '24 HOUR HOLTER AMBULATORY MONITORING.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75079',
    procedure_description: 'CARDIAC EXERCISE STRESS TESTING.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75081',
    procedure_description: 'RECORDING OF TWELVE LEAD ECG.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75085',
    procedure_description:
      'EACH ADDITIONAL 30 MINUTES OR PART THEREOF, PROVIDED THAT SUCH PART COMPRISES 50% OR MORE OF THE TIME.',
    category: 'CRITICAL_CARE',
    is_time_addon: true,
    paired_base_code: '75145',
  },
  {
    procedure_code: '75087',
    procedure_description: 'M MODE ECHOCARDIOGRAM.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75089',
    procedure_description: '2D ECHOCARDIOGRAM.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75091',
    procedure_description: 'DOPPLER FLOW.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75093',
    procedure_description: 'COLOUR IMAGING.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75095',
    procedure_description: 'ECG SIGNAL AVERAGING (HI-RES).',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75097',
    procedure_description: 'AMBULATORY BLOODPRESSURE MONITORING.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75099',
    procedure_description: 'VECTOR CARDIOGRAM.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75111',
    procedure_description: 'TRANSOESOPHAGEAL ECHOCARDIOGRAM.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75115',
    procedure_description:
      'ADDITIONAL 2 NERVES (USED AS ADJUNCT WITH NERVE CONDUCTION STUDIES, INCLUDING F-WAVES, H-REFLEXES OR ADDITIONAL NERVES REQUIRED FOR DIAGNOSIS)',
    category: 'NEURO',
  },
  {
    procedure_code: '75116',
    procedure_description:
      'PREPARATION AND OPERATION OF AN ARTIFICIAL HEART (BERLIN-HEART)',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75117',
    procedure_description:
      'ELECTRORETINOGRAPHY (ERG) - UNILATERAL OR ELECTRO-OCULOGRAPHY (EOG)',
    category: 'NEURO',
  },
  {
    procedure_code: '75118',
    procedure_description:
      'DAILY MONITORING OF ARTIFICIAL HEART, PER HOUR',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75119',
    procedure_description: 'SLEEP EEG.',
    category: 'NEURO',
  },
  {
    procedure_code: '75125',
    procedure_description: 'MULTIPLE SLEEP LATENCY TEST (MSLT)',
    category: 'NEURO',
  },
  {
    procedure_code: '75127',
    procedure_description: 'OVERNIGHT CPAP TITRATION.',
    category: 'NEURO',
  },
  {
    procedure_code: '75132',
    procedure_description:
      'MOBILE EEG SETUP IN ICU (TO BE ADDED TO ITEM 133 IF APPROPRIATE)',
    category: 'NEURO',
  },
  {
    procedure_code: '75133',
    procedure_description: 'EEG WITH SPECIAL ACTIVATION.',
    category: 'NEURO',
  },
  {
    procedure_code: '75135',
    procedure_description:
      'ELECTROMYOGRAPHY : NEEDLE EXAMINATION PER MUSCLE/CONDUCTION VELOCITY (MOTOR/SENSORY) EACH, TO A MAXIMUM OF 5.',
    category: 'NEURO',
  },
  {
    procedure_code: '75137',
    procedure_description:
      'INTRA-OPERATIVE EVOKED POTENTIALS FOR THE 1ST HOUR',
    category: 'NEURO',
  },
  {
    procedure_code: '75139',
    procedure_description:
      'EACH ADDITIONAL HOUR OR PART THEREOF PROVIDED THAT SUCH PART COMPRISES 50% OR MORE OF THE TIME.',
    category: 'NEURO',
    is_time_addon: true,
    paired_base_code: '75137',
  },
  {
    procedure_code: '75141',
    procedure_description: 'INTRA-OPERATIVE EEG (CAROTID ENDARTERECTOMY).',
    category: 'NEURO',
  },
  {
    procedure_code: '75143',
    procedure_description: 'TRANSCRANIAL OR CAROTID DOPPLER (BILATERAL).',
    category: 'NEURO',
  },
  {
    procedure_code: '75145',
    procedure_description:
      'PREPARATION OF EXTRA-CORPOREAL EQUIPMENT: HAEMOPERFUSION (HP), HAEMOFILTRATION (HF), HAEMOCONCENTRATION (HC), CONTINUOUS RENAL REPLACEMENT THERAPY (CRRT), APHAERESIS, AUTO TRANSFUSION AND CELL RECOVERY (AT).',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75146',
    procedure_description: 'CHRONIC HAEMODIALYSIS (ACETATE DIALYSATE)',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75147',
    procedure_description: 'PERITONEAL DIALYSIS, PER DAY',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75148',
    procedure_description: 'CHRONIC HAEMODIALYSIS (BICARBONATE DIALYSATE)',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75149',
    procedure_description:
      'TREATMENT PROCEDURE PER 1 HOUR (EXCLUDING ACUTE HAEMODIALYSIS, CHRONIC HAEMODIALYSIS AND CRRT)',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75150',
    procedure_description: 'ACUTE HAEMODIALYSIS',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75151',
    procedure_description:
      'TREATMENT PROCEDURES FOR CRRT UP TO 6 HOURS OR PART THEREOF PROVIDED THAT SUCH PART COMPRISES 50% OR MORE OF THE TIME',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75152',
    procedure_description:
      'TREATMENT PROCEDURE FOR CRRT UP TO 12 HOURS OR PART THEREOF PROVIDED THAT SUCH PART COMPRISES MORE THAN 6 HOURS OF THE TIME',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75153',
    procedure_description:
      'PATIENT TRAINING IN CENTRE FOR DIALYSIS, CPAP TRAINING AND PROBLEM-SOLVING, HOME VENTILATORS AND NEBULISERS, PER 30 MINUTES (TO MAXIMUM OF 24 HOURS)',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75154',
    procedure_description:
      'TREATMENT PROCEDURE FOR CRRT UP TO 18 HOURS OR PART THEREOF PROVIDED THAT SUCH PART COMPRISES MORE THAN 12 HOURS OF THE TIME',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75155',
    procedure_description:
      "PATIENT TRAINING OR FOLLOW-UP AT PATIENT'S HOME, FOR DIALYSIS, HOME VENTILATORS AND NEBULISERS, PER 30 MINUTES (TO MAXIMUM OF 24 HOURS).",
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75156',
    procedure_description:
      'TREATMENT PROCEDURE FOR CRRT UP TO 24 HOURS OR PART THEREOF PROVIDED THAT SUCH PART COMPRISES MORE THAN 18 HOURS OF THE TIME',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75157',
    procedure_description:
      'STANDBY WITH EXTRA CORPOREAL EQUIPMENT (MAXIMUM 4 HOURS) (PER EVENT).',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75159',
    procedure_description: 'POST VASECTOMY SEMEN ANALYSIS.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75161',
    procedure_description: 'COMPLETE SEMEN ANALYSIS.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75163',
    procedure_description: 'SEMEN WASH FOR A I.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75165',
    procedure_description:
      'IVF, GIFT, PROST WITH SEMEN AND SERUM PREPARATION INCLUDING OVUM AND EMBRYO HANDLING AND TRANSFER',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75167',
    procedure_description: 'OVUM AND EMBRYO FREEZING.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75169',
    procedure_description: 'SEMEN FREEZING.',
    category: 'DIAGNOSTICS',
  },
  {
    procedure_code: '75171',
    procedure_description: 'TRAVELLING PER KM IN EXCESS OF 16KM (IN OWN CAR).',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75173',
    procedure_description: 'EQUIPMENT HIRE (BY ARRANGEMENT WITH SCHEME).',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75175',
    procedure_description: 'MEDICATION / MATERIAL',
    category: 'PERFUSION',
  },
  {
    procedure_code: '75176',
    procedure_description:
      'GLOBAL FEE FOR CONTINUOUS AMBULATORY PERITONEAL DIALYSIS (CAPD), PER 30 DAY PERIOD.',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75177',
    procedure_description:
      'GLOBAL FEE FOR AUTOMATED PERITONEAL DIALYSIS (APD), PER 30 DAY PERIOD.',
    category: 'CRITICAL_CARE',
  },
  {
    procedure_code: '75178',
    procedure_description:
      'SHORT LATENCY BRAINSTEM AUDITORY EVOKED POTENTIALS, NEUROLOGICAL EXAMINATION, BILATERAL',
    category: 'NEURO',
  },
  {
    procedure_code: '75179',
    procedure_description:
      'AUDITORY EVOKED POTENTIALS, FULL AUDIOLOGICAL EXAMINATION, BILATERAL',
    category: 'NEURO',
  },
  {
    procedure_code: '75180',
    procedure_description:
      'PATTERN-REVERSAL VISUAL EVOKED POTENTIALS: FULL EVALUATION OF VISUAL PATHWAYS, UNILATERAL',
    category: 'NEURO',
  },
  {
    procedure_code: '75181',
    procedure_description:
      'SOMATOSENSORY EVOKED POTENTIALS, UNILATERAL, UPPER LIMB',
    category: 'NEURO',
  },
  {
    procedure_code: '75182',
    procedure_description:
      'SOMATOSENSORY EVOKED POTENTIALS, UNILATERAL, LOWER LIMB',
    category: 'NEURO',
  },
  {
    procedure_code: '75183',
    procedure_description:
      'ELECTRONYSTAGMOGRAPHY FOR SPONTANEOUS AND POSITIONAL NYSTAGMUS (3253)',
    category: 'NEURO',
  },
  {
    procedure_code: '75184',
    procedure_description:
      'CALORIC TEST DONE WITH ELECTRONYSTAGMOGRAPHY (3255)',
    category: 'NEURO',
  },
  {
    procedure_code: '75185',
    procedure_description: 'OVERNIGHT POLYSOMNOGRAPHY',
    category: 'NEURO',
  },
  {
    procedure_code: '75186',
    procedure_description: 'OBSTRUCTIVE SLEEP APNEA SCREENING',
    category: 'NEURO',
  },
  {
    procedure_code: '75187',
    procedure_description:
      'LONG TERM EEG MONITORING WITH A MINIMUM OF 8 HOURS (BUT LESS THAN 16 HOURS) RECORDING TIME, INCLUDING PREPARATION (COLLODION ADHESIVE TECHNIQUE WITH AT LEAST 21 ELECTRODES) AND INTERPRETATION',
    category: 'NEURO',
  },
  {
    procedure_code: '75188',
    procedure_description:
      'LONG TERM EEG MONITORING WITH 16 TO 24 HOURS RECORDING TIME, INCLUDING PREPARATION (COLLODION ADHESIVE TECHNIQUE WITH AT LEAST 21 ELECTRODES) AND INTERPRETATION',
    category: 'NEURO',
  },
  {
    procedure_code: '75418',
    procedure_description: 'CHRONIC HAEMODIALYSIS (BICARBONATE DIALYSATE)',
    category: 'CRITICAL_CARE',
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
  { code: 'M00.06', description: 'Staphylococcal arthritis and polyarthritis, lower leg' },
  { code: 'M86.46', description: 'Chronic osteomyelitis with draining sinus, lower leg' },
  { code: 'D26.9', description: 'Other benign neoplasm of uterus, unspecified' },
  { code: 'N83.0', description: 'Follicular cyst of ovary' },
  { code: 'G47.3', description: 'Sleep apnoea' },
  { code: 'J45.9', description: 'Asthma, unspecified' },
];

export const TIME_ADDON_PAIRINGS: Array<{
  baseCode: string;
  addonCode: string;
  baseThresholdMinutes: number;
  incrementMinutes: number;
  label: string;
}> = [
  {
    baseCode: '75011',
    addonCode: '75013',
    baseThresholdMinutes: 60,
    incrementMinutes: 30,
    label: 'Extra-Corporeal Surgical Equipment (> 60m)',
  },
  {
    baseCode: '75063',
    addonCode: '75065',
    baseThresholdMinutes: 60,
    incrementMinutes: 30,
    label: 'Cardiac Catheterisation (> 60m)',
  },
  {
    baseCode: '75067',
    addonCode: '75068',
    baseThresholdMinutes: 240,
    incrementMinutes: 30,
    label: 'Cardiac Electrophysiology (> 4 hrs)',
  },
  {
    baseCode: '75070',
    addonCode: '75071',
    baseThresholdMinutes: 60,
    incrementMinutes: 30,
    label: 'Permanent / Dual Pacemaker or ICD (> 60m)',
  },
  {
    baseCode: '75137',
    addonCode: '75139',
    baseThresholdMinutes: 60,
    incrementMinutes: 60,
    label: 'Intra-Operative Evoked Potentials (> 60m, per hour)',
  },
  {
    baseCode: '75145',
    addonCode: '75085',
    baseThresholdMinutes: 60,
    incrementMinutes: 30,
    label: 'HP / HF / HC / CRRT Extra-Corporeal Run (> 60m)',
  },
];

export const ALL_TIME_ADDON_CODES = new Set([
  '75013',
  '75065',
  '75068',
  '75071',
  '75085',
  '75139',
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
      extraHoursAfterFirstHour: 0,
      extraThirtyMinAfterFourHours: 0,
      isAfterHours: false,
      isWeekend: false,
      afterHoursReason: null,
    };
  }

  const startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;

  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }

  const durationMinutes = Math.max(0, endTotal - startTotal);
  const thirtyMinUnits = durationMinutes > 0 ? Math.ceil(durationMinutes / 30) : 0;

  // 30-min increments after 1st hour (part >= 50% i.e. >= 15 mins)
  const extraMinutes60 = Math.max(0, durationMinutes - 60);
  const full30Blocks = Math.floor(extraMinutes60 / 30);
  const rem30 = extraMinutes60 % 30;
  const extraThirtyMinAfterFirstHour =
    extraMinutes60 > 0 ? full30Blocks + (rem30 >= 15 ? 1 : 0) : 0;

  // 60-min increments after 1st hour (part >= 50% i.e. >= 30 mins) for 75139
  const full60Blocks = Math.floor(extraMinutes60 / 60);
  const rem60 = extraMinutes60 % 60;
  const extraHoursAfterFirstHour =
    extraMinutes60 > 0 ? full60Blocks + (rem60 >= 30 ? 1 : 0) : 0;

  // 30-min increments after first 4 hours (240 mins) for 75068
  const extraMinutes240 = Math.max(0, durationMinutes - 240);
  const full240Blocks = Math.floor(extraMinutes240 / 30);
  const rem240 = extraMinutes240 % 30;
  const extraThirtyMinAfterFourHours =
    extraMinutes240 > 0 ? full240Blocks + (rem240 >= 15 ? 1 : 0) : 0;

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
    extraHoursAfterFirstHour,
    extraThirtyMinAfterFourHours,
    isAfterHours,
    isWeekend,
    afterHoursReason,
  };
}

export function getExpectedAddonUnits(
  addonCode: string,
  timing: TheatreTimingResult
): number {
  if (addonCode === '75139') return timing.extraHoursAfterFirstHour;
  if (addonCode === '75068') return timing.extraThirtyMinAfterFourHours;
  return timing.extraThirtyMinAfterFirstHour;
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

  for (const pair of TIME_ADDON_PAIRINGS) {
    const expectedUnits = getExpectedAddonUnits(pair.addonCode, timing);
    if (expectedUnits > 0) {
      if (selectedMap.has(pair.baseCode) && !selectedMap.has(pair.addonCode)) {
        alerts.push({
          id: `missing-addon-${pair.addonCode}`,
          severity: 'warning',
          title: `Missing Time Units (${pair.addonCode})`,
          detail: `${pair.label} ran ${timing.durationMinutes} mins (${expectedUnits} extra unit${expectedUnits === 1 ? '' : 's'}).`,
          fixActionLabel: `Add ${pair.addonCode} (×${expectedUnits})`,
          fixCode: pair.addonCode,
          fixUnits: expectedUnits,
        });
      }

      const addon = selectedMap.get(pair.addonCode);
      if (addon && addon.units !== expectedUnits) {
        alerts.push({
          id: `sync-addon-${pair.addonCode}`,
          severity: 'info',
          title: `Time Units Mismatch on ${pair.addonCode}`,
          detail: `Duration is ${timing.durationMinutes} mins (${expectedUnits} unit${expectedUnits === 1 ? '' : 's'}), but ${pair.addonCode} is set to ×${addon.units}.`,
          fixActionLabel: `Set ${pair.addonCode} to ×${expectedUnits}`,
          fixCode: pair.addonCode,
          fixUnits: expectedUnits,
        });
      }
    }
  }

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

// Structured Perfusion / Sheet Metadata Serializer & Parser (stored cleanly inside clinical_notes)
const META_BLOCK_PREFIX = '[PERFUSION_META]:';

export function hasAnyPerfusionMetadata(meta: PerfusionCaseMetadata): boolean {
  return Boolean(
    meta.mainMemberName?.trim() ||
      meta.medicalAidOption?.trim() ||
      meta.patientIdNumber?.trim() ||
      meta.patientDob?.trim() ||
      meta.postalAddress?.trim() ||
      meta.authorisationNumber?.trim() ||
      meta.surgeonPracticeNo?.trim() ||
      meta.referringDoctor?.trim() ||
      meta.procedurePerformed?.trim() ||
      meta.bloodLossMl?.trim() ||
      meta.cellSavedMl?.trim() ||
      meta.cellSavedHct?.trim() ||
      meta.hepsalineStrength?.trim() ||
      (meta.consumables && meta.consumables.some((c) => c.qty > 0)) ||
      (meta.infusionFilters && meta.infusionFilters.some((f) => f.qty > 0)) ||
      (meta.bloodBankUnits &&
        meta.bloodBankUnits.some(
          (b) => b.bloodType.trim() || b.unitNumber.trim()
        )) ||
      meta.theatreSister?.trim()
  );
}

export function cleanPerfusionMetadata(
  meta: PerfusionCaseMetadata
): PerfusionCaseMetadata {
  const cleaned: PerfusionCaseMetadata = {};
  if (meta.mainMemberName?.trim()) cleaned.mainMemberName = meta.mainMemberName.trim();
  if (meta.medicalAidOption?.trim())
    cleaned.medicalAidOption = meta.medicalAidOption.trim();
  if (meta.patientIdNumber?.trim())
    cleaned.patientIdNumber = meta.patientIdNumber.trim();
  if (meta.patientDob?.trim()) cleaned.patientDob = meta.patientDob.trim();
  if (meta.postalAddress?.trim()) cleaned.postalAddress = meta.postalAddress.trim();
  if (meta.authorisationNumber?.trim())
    cleaned.authorisationNumber = meta.authorisationNumber.trim();
  if (meta.surgeonPracticeNo?.trim())
    cleaned.surgeonPracticeNo = meta.surgeonPracticeNo.trim();
  if (meta.referringDoctor?.trim())
    cleaned.referringDoctor = meta.referringDoctor.trim();
  if (meta.procedurePerformed?.trim())
    cleaned.procedurePerformed = meta.procedurePerformed.trim();
  if (meta.bloodLossMl?.trim()) cleaned.bloodLossMl = meta.bloodLossMl.trim();
  if (meta.cellSavedMl?.trim()) cleaned.cellSavedMl = meta.cellSavedMl.trim();
  if (meta.cellSavedHct?.trim()) cleaned.cellSavedHct = meta.cellSavedHct.trim();
  if (meta.hepsalineStrength?.trim()) {
    cleaned.hepsalineStrength = meta.hepsalineStrength;
    cleaned.hepsalineQty = meta.hepsalineQty && meta.hepsalineQty > 0 ? meta.hepsalineQty : 1;
  }
  const activeConsumables = (meta.consumables || []).filter((c) => c.qty > 0);
  if (activeConsumables.length > 0) cleaned.consumables = activeConsumables;

  const activeFilters = (meta.infusionFilters || []).filter((f) => f.qty > 0);
  if (activeFilters.length > 0) cleaned.infusionFilters = activeFilters;

  const activeUnits = (meta.bloodBankUnits || []).filter(
    (b) => b.bloodType.trim() || b.unitNumber.trim()
  );
  if (activeUnits.length > 0) cleaned.bloodBankUnits = activeUnits;

  if (meta.theatreSister?.trim()) cleaned.theatreSister = meta.theatreSister.trim();
  return cleaned;
}

export function serializeCaseNotesWithMetadata(params: {
  plainNotes: string;
  resolutionReplies: string[];
  metadata: PerfusionCaseMetadata;
}): string | null {
  const lines: string[] = [];
  if (params.plainNotes.trim()) {
    lines.push(params.plainNotes.trim());
  }
  for (const r of params.resolutionReplies) {
    if (r.trim()) {
      lines.push(`[Query Reply: ${r.trim()}]`);
    }
  }
  const cleanedMeta = cleanPerfusionMetadata(params.metadata);
  if (hasAnyPerfusionMetadata(cleanedMeta)) {
    lines.push(`${META_BLOCK_PREFIX}${JSON.stringify(cleanedMeta)}`);
  }
  return lines.length > 0 ? lines.join('\n') : null;
}

export function parseCaseNotesWithMetadata(rawNotes: string | null): {
  baseNotes: string;
  resolutionReplies: string[];
  metadata: PerfusionCaseMetadata;
} {
  if (!rawNotes) {
    return { baseNotes: '', resolutionReplies: [], metadata: {} };
  }
  const lines = rawNotes.split('\n');
  const baseLines: string[] = [];
  const replies: string[] = [];
  let metadata: PerfusionCaseMetadata = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(META_BLOCK_PREFIX)) {
      try {
        const parsed = JSON.parse(
          trimmed.slice(META_BLOCK_PREFIX.length)
        ) as PerfusionCaseMetadata;
        if (parsed && typeof parsed === 'object') {
          metadata = parsed;
        }
      } catch {
        // Ignore malformed metadata line
      }
    } else if (trimmed.startsWith('[Query Reply:') && trimmed.endsWith(']')) {
      replies.push(trimmed.slice('[Query Reply:'.length, -1).trim());
    } else if (trimmed.length > 0) {
      baseLines.push(line);
    }
  }

  return {
    baseNotes: baseLines.join('\n').trim(),
    resolutionReplies: replies,
    metadata,
  };
}
