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

const PLAN_LABELS: Record<string, string> = {
  PRO_PAID: 'Pro Practitioner (R495/mo)',
  GROUP_PAID: 'Practice Group (R1,195/mo)',
  BUREAU_STARTER: 'Bureau Office Starter (R1,950/mo)',
  BUREAU_SCALE: 'Bureau Office Scale (R3,450/mo)',
  BUREAU_PAID: 'Bureau Office Enterprise (R5,950/mo)',
};

async function sendWelcomeEmail(params: {
  to: string;
  practiceName: string;
  planTier: string;
  licenseKey: string;
  appOrigin: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey || !params.to) return;

  const isBureau = params.planTier.startsWith('BUREAU_');
  const launchUrl = isBureau ? `${params.appOrigin}/queue` : `${params.appOrigin}/capture`;
  const planName = PLAN_LABELS[params.planTier] || params.planTier;

  const html = `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background-color:#08080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F3F6FA;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#08080B;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#14181F;border:1px solid #232B38;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;border-bottom:1px solid #232B38;background-color:#0E1218;">
                <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#00D2C6;font-weight:700;">
                  MEDIBURGH · CLINTECHBILLS (DISCIPLINE 075)
                </p>
                <h1 style="margin:8px 0 0 0;font-size:22px;color:#FFFFFF;font-weight:800;">
                  Welcome to ClinTechBills, ${params.practiceName}
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px;font-size:14px;line-height:1.6;color:#C5D0DF;">
                <p style="margin-top:0;">
                  Your subscription to <strong style="color:#FFFFFF;">${planName}</strong> is active. Your theatre-to-bureau capture and Discipline 075 billing workspace is ready.
                </p>

                <div style="margin:24px 0;padding:18px 20px;background-color:#0E1218;border:1px solid #00D2C6;border-radius:12px;">
                  <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8B98AB;">
                    Your Active Licence Key
                  </p>
                  <p style="margin:0;font-family:'Courier New',monospace;font-size:20px;font-weight:800;letter-spacing:2px;color:#00D2C6;">
                    ${params.licenseKey}
                  </p>
                </div>

                <h3 style="margin:24px 0 10px 0;font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#FFFFFF;">
                  Quick-Start Activation (60 Seconds)
                </h3>
                <ol style="margin:0;padding-left:20px;color:#C5D0DF;">
                  <li style="margin-bottom:8px;">Open <a href="${launchUrl}" style="color:#00D2C6;text-decoration:none;font-weight:600;">${launchUrl}</a> and sign in with your account.</li>
                  <li style="margin-bottom:8px;">Tap <strong>${isBureau ? 'Bureau Licence' : 'Upgrade / Key'}</strong> at the top of your screen and paste <code style="color:#00D2C6;">${params.licenseKey}</code>.</li>
                  <li style="margin-bottom:8px;">${
                    isBureau
                      ? 'Share this key with your contracted Clinical Technologists so their cases route directly into your Bureau Queue.'
                      : 'Install ClinTechBills to your phone Home Screen (Chrome → Add to Home Screen / Safari → Share → Add to Home Screen).'
                  }</li>
                </ol>

                <div style="margin:28px 0;">
                  <a href="${launchUrl}" style="display:inline-block;background-color:#00D2C6;color:#08080B;font-weight:800;font-size:13px;text-decoration:none;padding:13px 24px;border-radius:10px;">
                    Launch ClinTechBills Workspace →
                  </a>
                </div>

                <hr style="border:none;border-top:1px solid #232B38;margin:24px 0;" />

                <p style="margin:0 0 8px 0;font-size:13px;color:#FFFFFF;font-weight:700;">
                  Need Help Onboarding Your Practice or Billing Desk?
                </p>
                <p style="margin:0;font-size:13px;color:#8B98AB;">
                  Email our support desk anytime at
                  <a href="mailto:support@mediburgh.co.za" style="color:#00D2C6;text-decoration:none;">support@mediburgh.co.za</a>
                  or visit <a href="https://mediburgh.co.za" style="color:#00D2C6;text-decoration:none;">mediburgh.co.za</a>.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px;background-color:#0E1218;border-top:1px solid #232B38;font-size:12px;color:#8B98AB;">
                <p style="margin:0 0 8px 0;">
                  <strong style="color:#FFFFFF;">MediBurgh</strong> · Precision Billing. Protected Revenue.
                </p>
                <p style="margin:0;">
                  <a href="https://mediburgh.co.za" style="color:#00D2C6;text-decoration:none;">Website</a> &nbsp;·&nbsp;
                  <a href="https://www.linkedin.com/company/mediburgh" style="color:#00D2C6;text-decoration:none;">LinkedIn</a> &nbsp;·&nbsp;
                  <a href="https://www.instagram.com/mediburgh.sa" style="color:#00D2C6;text-decoration:none;">Instagram</a> &nbsp;·&nbsp;
                  <a href="https://www.facebook.com/mediburgh" style="color:#00D2C6;text-decoration:none;">Facebook</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'MediBurgh ClinTechBills <support@mediburgh.co.za>',
      to: [params.to],
      reply_to: 'support@mediburgh.co.za',
      subject: `Welcome to ClinTechBills — Your ${planName} Licence Key`,
      html,
    }),
  });
}

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

    const nextExpiry = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString();
    const maxSeats = SEAT_ALLOWANCES[planTier] ?? 1;
    let activeLicenseKey = existingKey;

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
      activeLicenseKey = generateLicenseKey();
      await supabaseAdmin.from('practice_licenses').insert({
        practice_name: practiceName,
        contact_email: email,
        license_key: activeLicenseKey,
        plan_tier: planTier,
        status: 'active',
        monthly_case_limit: null,
        max_practitioners: maxSeats,
        expires_at: nextExpiry,
        issued_by: 'PayFast Auto-Subscription',
        notes: `Auto-provisioned via PayFast ITN (${email})`,
      });
    }

    await sendWelcomeEmail({
      to: email,
      practiceName,
      planTier,
      licenseKey: activeLicenseKey,
      appOrigin: req.nextUrl.origin,
    });

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('PayFast ITN Error:', err);
    return new NextResponse('ITN Error', { status: 500 });
  }
}
