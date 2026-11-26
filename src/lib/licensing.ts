export type PlanTier =
  | 'FREE_STARTER'
  | 'FREE_COMP'
  | 'PRO_TRIAL'
  | 'PRO_PAID'
  | 'GROUP_PAID'
  | 'BUREAU_STARTER'
  | 'BUREAU_SCALE'
  | 'BUREAU_PAID';

export type LicenseStatus = 'active' | 'suspended' | 'expired';

export interface PracticeLicense {
  id: string;
  practice_name: string;
  contact_email: string;
  license_key: string;
  plan_tier: PlanTier;
  status: LicenseStatus;
  monthly_case_limit: number | null;
  max_practitioners: number;
  expires_at: string | null;
  issued_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface PlanPreset {
  tier: PlanTier;
  label: string;
  badgeColor: string;
  priceLabel: string;
  defaultMonthlyLimit: number | null;
  defaultPractitioners: number;
  defaultTrialDays: number | null;
  description: string;
}

export const PLAN_PRESETS: Record<PlanTier, PlanPreset> = {
  FREE_STARTER: {
    tier: 'FREE_STARTER',
    label: 'Starter (Free)',
    badgeColor: 'bg-slate-800 text-slate-200 border-slate-600',
    priceLabel: 'R0 / mo',
    defaultMonthlyLimit: 15,
    defaultPractitioners: 1,
    defaultTrialDays: null,
    description: '1 Practitioner • Capped at 15 cases per calendar month',
  },
  FREE_COMP: {
    tier: 'FREE_COMP',
    label: 'Free Complimentary (VIP / Bureau)',
    badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    priceLabel: 'R0 / mo (Comp)',
    defaultMonthlyLimit: null,
    defaultPractitioners: 3,
    defaultTrialDays: null,
    description: 'Unlimited cases • Full Pro features waived for KOLs or MediBurgh bureau clients',
  },
  PRO_TRIAL: {
    tier: 'PRO_TRIAL',
    label: 'Pro Trial (30 Days)',
    badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    priceLabel: 'R0 (30-Day Trial)',
    defaultMonthlyLimit: null,
    defaultPractitioners: 1,
    defaultTrialDays: 30,
    description: 'Unlimited cases for 30 days • Auto-falls back to 15-case Starter cap on expiry',
  },
  PRO_PAID: {
    tier: 'PRO_PAID',
    label: 'Pro Practitioner',
    badgeColor: 'bg-cyan-950/80 text-[#00C2D1] border-[#00C2D1]/40',
    priceLabel: 'R495 / mo',
    defaultMonthlyLimit: null,
    defaultPractitioners: 1,
    defaultTrialDays: null,
    description: '1 Practitioner + 2 Admin seats • Unlimited cases, guardrails & PMS CSV export',
  },
  GROUP_PAID: {
    tier: 'GROUP_PAID',
    label: 'Practice Group',
    badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
    priceLabel: 'R1,195 / mo',
    defaultMonthlyLimit: null,
    defaultPractitioners: 5,
    defaultTrialDays: null,
    description: 'Up to 5 Practitioners + 3 Admin seats • Shared directories & centralized queue',
  },
  BUREAU_STARTER: {
    tier: 'BUREAU_STARTER',
    label: 'Bureau Office Starter',
    badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
    priceLabel: 'R1,950 / mo',
    defaultMonthlyLimit: null,
    defaultPractitioners: 5,
    defaultTrialDays: null,
    description: 'Dedicated /queue tenant • Up to 5 ClinTechs + 3 Office Clerks',
  },
  BUREAU_SCALE: {
    tier: 'BUREAU_SCALE',
    label: 'Bureau Office Scale',
    badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
    priceLabel: 'R3,450 / mo',
    defaultMonthlyLimit: null,
    defaultPractitioners: 15,
    defaultTrialDays: null,
    description: 'Dedicated /queue tenant • Up to 15 ClinTechs + 10 Office Clerks',
  },
  BUREAU_PAID: {
    tier: 'BUREAU_PAID',
    label: 'Bureau Enterprise',
    badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
    priceLabel: 'R5,950 / mo',
    defaultMonthlyLimit: null,
    defaultPractitioners: 35,
    defaultTrialDays: null,
    description: 'Dedicated /queue tenant • Up to 35 ClinTechs + Unlimited Office Clerks',
  },
};

export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `MB-CTB-${block()}-${block()}`;
}

export function isLicenseExpired(license: PracticeLicense): boolean {
  if (license.status === 'expired') return true;
  if (!license.expires_at) return false;
  return new Date(license.expires_at).getTime() < Date.now();
}

export function getEffectiveMonthlyLimit(license: PracticeLicense | null): number | null {
  if (!license) return 15;
  if (license.status === 'suspended') return 0;
  if (isLicenseExpired(license)) {
    return license.plan_tier === 'PRO_TRIAL' ? 15 : 0;
  }
  return license.monthly_case_limit;
}
