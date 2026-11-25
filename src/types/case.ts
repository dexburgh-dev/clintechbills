export type UserRole = 'client' | 'office' | 'admin';

export type CaseStatus = 'SUBMITTED' | 'QUERIED' | 'BILLED';

export type ValidationStatus = 'CLEARED' | 'PASS_WITH_WARNINGS' | 'REJECT_BLOCK';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  practice_name: string;
  bhf_practice_no: string | null;
  role: UserRole;
  created_at: string;
}

export interface ICD10Item {
  code: string;
  cleanCode: string;
  description: string;
  chapter: string;
  group: string;
  validPrimary: boolean;
  hasChildren: boolean;
  isExternalCause: boolean;
  isTrauma: boolean;
  isAsterisk: boolean;
  isDagger: boolean;
  gender: 'M' | 'F' | null;
  ageLow: number | null;
  ageHigh: number | null;
}

export interface SelectedICD10 {
  code: string;
  description: string;
  is_external_cause: boolean;
}

export interface TariffCatalogItem {
  code: string;
  description: string;
  category: string;
  default_units: number;
  is_time_based: boolean;
}

export interface SelectedTariff {
  code: string;
  description: string;
  units: number;
  modifier?: string;
}

export interface ValidationIssue {
  level: 'BLOCK' | 'WARN' | 'PASS';
  rule_id: string;
  message: string;
}

export interface CaseRecord {
  id: string;
  case_ref: string;
  client_id: string;
  patient_first_name: string;
  patient_surname: string;
  medical_aid_name: string;
  medical_aid_number: string;
  dependent_code: string;
  patient_cellphone: string | null;
  patient_sex: 'ANY' | 'M' | 'F';
  patient_age: number | null;
  sticker_storage_path: string | null;
  ocr_raw_text: string | null;
  service_date: string;
  facility_name: string;
  referring_surgeon: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  calculated_time_units: number;
  primary_icd10: string;
  primary_icd10_desc: string;
  secondary_icd10: SelectedICD10[];
  tariffs: SelectedTariff[];
  clinical_notes: string | null;
  validation_status: ValidationStatus;
  validation_findings: ValidationIssue[];
  status: CaseStatus;
  office_query_note: string | null;
  billed_invoice_ref: string | null;
  billed_by: string | null;
  billed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    practice_name: string;
    bhf_practice_no: string | null;
  };
}