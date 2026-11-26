import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const PLAN_PRICING: Record<string, { amount: string; itemName: string }> = {
  PRO_PAID: {
    amount: '495.00',
    itemName: 'ClinTechBills Pro Practitioner (Monthly)',
  },
  GROUP_PAID: {
    amount: '1195.00',
    itemName: 'ClinTechBills Practice Group (Monthly)',
  },
  BUREAU_STARTER: {
    amount: '1950.00',
    itemName: 'ClinTechBills Bureau Office Starter (Monthly)',
  },
  BUREAU_SCALE: {
    amount: '3450.00',
    itemName: 'ClinTechBills Bureau Office Scale (Monthly)',
  },
  BUREAU_PAID: {
    amount: '5950.00',
    itemName: 'ClinTechBills Bureau Office Enterprise (Monthly)',
  },
};

function buildSignature(data: Record<string, string>, passPhrase?: string): string {
  const paramString = Object.entries(data)
    .filter(([, val]) => val !== '' && val !== undefined)
    .map(([key, val]) => `${key}=${encodeURIComponent(val.trim()).replace(/%20/g, '+')}`)
    .join('&');

  const withPass = passPhrase
    ? `${paramString}&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, '+')}`
    : paramString;

  return crypto.createHash('md5').update(withPass).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { planTier, practiceName, contactEmail, licenseKey } = await req.json();
    const plan = PLAN_PRICING[planTier];

    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan tier selected.' }, { status: 400 });
    }

    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;

    if (!merchantId || !merchantKey) {
      return NextResponse.json(
        { error: 'PayFast merchant credentials are not configured yet.' },
        { status: 500 }
      );
    }

    const origin = req.nextUrl.origin;
    const isSandbox = process.env.PAYFAST_SANDBOX === 'true';
    const baseUrl = isSandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    const billingDate = new Date().toISOString().split('T')[0];
    const isBureauPlan = String(planTier).startsWith('BUREAU_');
    const returnPath = isBureauPlan ? '/queue?payment=success' : '/capture?payment=success';
    const cancelPath = isBureauPlan ? '/queue?payment=cancelled' : '/capture?payment=cancelled';

    const payload: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${origin}${returnPath}`,
      cancel_url: `${origin}${cancelPath}`,
      notify_url: `${origin}/api/payfast/itn`,
      email_address: String(contactEmail || '').trim(),
      m_payment_id: `${planTier}_${Date.now()}`,
      amount: plan.amount,
      item_name: plan.itemName,
      custom_str1: planTier,
      custom_str2: String(licenseKey || '').trim().toUpperCase(),
      custom_str3: String(practiceName || 'ClinTech Practice').trim(),
      subscription_type: '1',
      billing_date: billingDate,
      recurring_amount: plan.amount,
      frequency: '3', // Monthly
      cycles: '0', // Indefinite until cancelled
    };

    payload.signature = buildSignature(payload, process.env.PAYFAST_PASSPHRASE);

    const query = Object.entries(payload)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    return NextResponse.json({ checkoutUrl: `${baseUrl}?${query}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout initialization failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
