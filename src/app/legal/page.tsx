import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, Scale, ShieldCheck } from 'lucide-react';

export default function LegalAndPopiaPage() {
  return (
    <div className="min-h-screen bg-[#06070A] text-[#F3F6FA] py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between border-b border-white/15 pb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#00D2C6] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to ClinTechBills</span>
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#94A3B8]">
            Effective: November 2026
          </span>
        </div>

        <header className="space-y-2">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#00D2C6]">
            MediBurgh Healthcare Intelligence
          </p>
          <h1 className="font-[family-name:var(--font-montserrat)] text-2xl sm:text-4xl font-extrabold text-white">
            POPIA Privacy Policy &amp; Subscription Terms
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Governing the use of ClinTechBills (Discipline 075 Theatre Capture &amp; Medical Bureau Software) operated by MediBurgh / FinPro Holdings (Pty) Ltd in the Republic of South Africa.
          </p>
        </header>

        <section className="rounded-2xl border border-white/15 bg-[#11161F] p-6 space-y-3 text-sm text-[#CBD5E1] leading-relaxed">
          <div className="flex items-center gap-2 text-[#00D2C6] font-bold">
            <ShieldCheck className="h-5 w-5" />
            <h2>1. Protection of Personal Information Act (POPIA) Compliance</h2>
          </div>
          <p>
            ClinTechBills processes clinical billing metadata and patient hospital sticker images strictly as an <strong>Operator</strong> on behalf of registered Healthcare Practitioners (HPCSA Discipline 075) and their authorized Medical Bureaus (<strong>Responsible Parties</strong>) in accordance with the Protection of Personal Information Act 4 of 2013 (POPIA).
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#94A3B8]">
            <li>
              <strong className="text-white">Purpose Specification:</strong> Patient demographics, ICD-10 diagnostic codes, theatre timestamps, and Discipline 075 tariff codes are processed solely for lawful medical scheme claim submission and practice accounting.
            </li>
            <li>
              <strong className="text-white">Encrypted Private Storage:</strong> Hospital sticker images are stored in private, access-controlled cloud buckets and served exclusively via time-limited signed URLs to authenticated users linked to the originating practice or assigned Medical Bureau.
            </li>
            <li>
              <strong className="text-white">Immutable Audit Logs:</strong> Case creation, sticker updates, bureau queries, and PMS billing references are logged with actor ID and timestamp for statutory accountability.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-white/15 bg-[#11161F] p-6 space-y-3 text-sm text-[#CBD5E1] leading-relaxed">
          <div className="flex items-center gap-2 text-[#00D2C6] font-bold">
            <Scale className="h-5 w-5" />
            <h2>2. Subscription Billing, Cancellation &amp; Refund Policy</h2>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-xs text-[#94A3B8]">
            <li>
              <strong className="text-white">Monthly ZAR Subscriptions:</strong> Paid plans (Pro Practitioner R495/mo, Practice Group R1,195/mo, and Medical Bureau tiers from R1,950/mo, excl. VAT) are billed monthly in South African Rand (ZAR) via PayFast.
            </li>
            <li>
              <strong className="text-white">Instant Digital Provisioning:</strong> Upon PayFast payment confirmation, your <code className="text-[#00D2C6]">MB-CTB-XXXX-XXXX</code> licence key is activated immediately and delivered via email.
            </li>
            <li>
              <strong className="text-white">Cancellation Policy:</strong> You may cancel your recurring monthly subscription at any time with zero lock-in penalty by emailing <a href="mailto:support@mediburgh.co.za" className="text-[#00D2C6] underline">support@mediburgh.co.za</a> at least 48 hours prior to your next monthly renewal date. Your workspace remains active until the end of the paid period and then reverts to the free 15-case Starter tier.
            </li>
            <li>
              <strong className="text-white">Refund Policy:</strong> Because software licences are provisioned digitally upon activation, partial-month refunds are not issued once a billing cycle has commenced, except in cases of verified duplicate billing or technical service unavailability exceeding 48 hours, which are refunded in full within 7 business days.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-white/15 bg-[#11161F] p-6 space-y-2 text-xs text-[#94A3B8]">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Lock className="h-4 w-4 text-[#00D2C6]" />
            <h2>3. Information Officer &amp; Support Contact</h2>
          </div>
          <p>
            For POPIA data-subject requests, PAIA manual inquiries, billing support, or subscription cancellations, contact our Information Officer at{' '}
            <a href="mailto:support@mediburgh.co.za" className="text-[#00D2C6] underline">
              support@mediburgh.co.za
            </a>{' '}
            or visit{' '}
            <a href="https://mediburgh.co.za" target="_blank" rel="noreferrer" className="text-[#00D2C6] underline">
              mediburgh.co.za
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
