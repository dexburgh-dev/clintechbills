'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  PracticeLicense,
  getEffectiveMonthlyLimit,
  isLicenseExpired,
} from '@/lib/licensing';

const STORAGE_KEY = 'clintechbills_active_license_key';
const DEFAULT_STARTER_KEY = 'MB-CTB-STARTER-FREE';

export interface LicenseEntitlementState {
  loading: boolean;
  license: PracticeLicense | null;
  activeKey: string;
  casesUsedThisMonth: number;
  effectiveMonthlyLimit: number | null;
  remainingCases: number | null;
  canSubmitCase: boolean;
  blockReason: string | null;
  activateLicenseKey: (key: string) => Promise<{ ok: boolean; error?: string }>;
  refreshUsage: () => Promise<void>;
}

export function useLicenseEntitlement(): LicenseEntitlementState {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string>(DEFAULT_STARTER_KEY);
  const [license, setLicense] = useState<PracticeLicense | null>(null);
  const [casesUsedThisMonth, setCasesUsedThisMonth] = useState<number>(0);

  const loadEntitlement = useCallback(
    async (keyToLoad: string) => {
      setLoading(true);
      try {
        const normalized = keyToLoad.trim().toUpperCase() || DEFAULT_STARTER_KEY;

        const { data: licData, error: licError } = await supabase
          .from('practice_licenses')
          .select('*')
          .eq('license_key', normalized)
          .maybeSingle();

        let resolvedLicense: PracticeLicense | null = licData as PracticeLicense | null;

        if ((licError || !resolvedLicense) && normalized !== DEFAULT_STARTER_KEY) {
          const { data: starterData } = await supabase
            .from('practice_licenses')
            .select('*')
            .eq('license_key', DEFAULT_STARTER_KEY)
            .maybeSingle();
          resolvedLicense = starterData as PracticeLicense | null;
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, DEFAULT_STARTER_KEY);
          }
          setActiveKey(DEFAULT_STARTER_KEY);
        } else {
          setActiveKey(normalized);
        }

        setLicense(resolvedLicense);

        const now = new Date();
        const monthStart = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
        ).toISOString();

        let query = supabase
          .from('cases')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', monthStart);

        if (resolvedLicense?.id) {
          query = query.eq('license_id', resolvedLicense.id);
        }

        const { count, error: countError } = await query;

        if (countError) {
          const { count: totalCount } = await supabase
            .from('cases')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', monthStart);
          setCasesUsedThisMonth(totalCount ?? 0);
        } else {
          setCasesUsedThisMonth(count ?? 0);
        }
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    const saved =
      typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY) || DEFAULT_STARTER_KEY
        : DEFAULT_STARTER_KEY;
    loadEntitlement(saved);
  }, [loadEntitlement]);

  const activateLicenseKey = useCallback(
    async (rawKey: string): Promise<{ ok: boolean; error?: string }> => {
      const cleaned = rawKey.trim().toUpperCase();
      if (!cleaned) {
        return { ok: false, error: 'Please enter a valid MB-CTB licence key.' };
      }

      const { data, error } = await supabase
        .from('practice_licenses')
        .select('*')
        .eq('license_key', cleaned)
        .maybeSingle();

      if (error || !data) {
        return {
          ok: false,
          error: 'Licence key not found. Check spelling or contact MediBurgh.',
        };
      }

      const found = data as PracticeLicense;
      if (found.status === 'suspended') {
        return {
          ok: false,
          error: 'This licence has been suspended. Contact MediBurgh support.',
        };
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, found.license_key);
      }
      await loadEntitlement(found.license_key);
      return { ok: true };
    },
    [loadEntitlement, supabase]
  );

  const effectiveLimit = getEffectiveMonthlyLimit(license);
  const expired = license ? isLicenseExpired(license) : false;

  let canSubmitCase = true;
  let blockReason: string | null = null;
  let remainingCases: number | null = null;

  if (license?.status === 'suspended') {
    canSubmitCase = false;
    blockReason =
      'Licence suspended. Please contact MediBurgh Billing Support to restore capture.';
  } else if (expired && license?.plan_tier !== 'PRO_TRIAL') {
    canSubmitCase = false;
    blockReason = `Licence expired on ${new Date(
      license!.expires_at!
    ).toLocaleDateString('en-ZA')}. Renew to resume submissions.`;
  } else if (effectiveLimit !== null) {
    remainingCases = Math.max(0, effectiveLimit - casesUsedThisMonth);
    if (casesUsedThisMonth >= effectiveLimit) {
      canSubmitCase = false;
      blockReason = `Monthly Starter quota reached (${casesUsedThisMonth}/${effectiveLimit} cases). Enter a Pro or Complimentary licence key to unlock unlimited captures.`;
    }
  }

  return {
    loading,
    license,
    activeKey,
    casesUsedThisMonth,
    effectiveMonthlyLimit: effectiveLimit,
    remainingCases,
    canSubmitCase,
    blockReason,
    activateLicenseKey,
    refreshUsage: () => loadEntitlement(activeKey),
  };
}
