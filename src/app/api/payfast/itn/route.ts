import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateLicenseKey } from '@/lib/licensing';

const SEAT_ALLOWANCES: Record<string, number> = {
  PRO_PAID: 1,
  GROUP_PAID: 5,
  BUREAU_STARTER: 5,
  BUREAU_SCALE: 15,
  BUREAU_PAID: 35,
};

export async function POST(req: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return new NextResponse('Missing SUPABASE_SERVICE_ROLE_KEY', { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    const formData = await req.formData();
    const paymentStatus = String(formData.get('payment_status') || '');
    const planTier = String(formData.get('custom_str1') || 'PRO_PAID');
    const existingKey = String(formData.get('custom_str2') || '').trim().toUpperCase();
    const practiceName = String(formData.get('custom_str3') || 'Subscribed Practice').trim();
    const email = String(formData.get('email_address') || '').trim().toLowerCase();

    if (paymentStatus !== 'COMPLETE') {
      return new NextResponse('IGNORED', { status: 200 });
    }

    // 32 days validity gives a 1-day buffer for monthly PayFast recurring billing
    const nextExpiry = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString();
    const maxSeats = SEAT_ALLOWANCES[planTier] ?? 1;

    if (existingKey && existingKey !== 'MB-CTB-STARTER-FREE') {
      await supabaseAdmin
        .from('practice_licenses')
        .update({
          plan_tier: planTier,
          status: 'active',
          monthly_case_limit: null,
          max_practitioners: maxSeats,
          expires_at: nextExpiry,
        })
        .eq('license_key', existingKey);
    } else {
      await supabaseAdmin.from('practice_licenses').insert({
        practice_name: practiceName,
        contact_email: email,
        license_key: generateLicenseKey(),
        plan_tier: planTier,
        status: 'active',
        monthly_case_limit: null,
        max_practitioners: maxSeats,
        expires_at: nextExpiry,
        issued_by: 'PayFast Auto-Subscription',
        notes: `Auto-provisioned via PayFast ITN (${email})`,
      });
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('PayFast ITN Error:', err);
    return new NextResponse('ITN Error', { status: 500 });
  }
}
