'use client';

import React, { useState } from 'react';
import { Check, Copy, Droplets, Package, ShieldCheck, UserCheck } from 'lucide-react';
import {
  hasAnyPerfusionMetadata,
  parseCaseNotesWithMetadata,
} from '@/data/discipline075';

interface PerfusionCaseSummaryProps {
  notes: string | null;
}

export function PerfusionCaseSummary({ notes }: PerfusionCaseSummaryProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { baseNotes, resolutionReplies, metadata } =
    parseCaseNotesWithMetadata(notes);

  const hasMeta = hasAnyPerfusionMetadata(metadata);

  if (!baseNotes && resolutionReplies.length === 0 && !hasMeta) {
    return null;
  }

  async function copyVal(key: string, val: string) {
    await navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1600);
  }

  return (
    <div className="p-3 rounded-xl bg-[#14181F] border border-[#232B38] space-y-2.5 text-xs">
      {/* Extended Patient / Scheme / Auth / Doctor Metadata */}
      {hasMeta && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {metadata.procedurePerformed && (
              <span className="px-2 py-0.5 rounded bg-[#00D2C6]/12 border border-[#00D2C6]/35 text-[#9FF7F1] font-semibold">
                Proc: {metadata.procedurePerformed}
              </span>
            )}
            {metadata.authorisationNumber && (
              <button
                type="button"
                onClick={() =>
                  copyVal('auth', metadata.authorisationNumber as string)
                }
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/35 font-mono text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25"
                title="Copy Authorisation Number"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Auth: {metadata.authorisationNumber}</span>
                {copiedField === 'auth' ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3 opacity-75" />
                )}
              </button>
            )}
            {metadata.surgeonPracticeNo && (
              <button
                type="button"
                onClick={() =>
                  copyVal('drprac', metadata.surgeonPracticeNo as string)
                }
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0E1218] border border-[#2C3545] font-mono text-[11px] text-[#C5D0DF] hover:border-[#00D2C6]"
                title="Copy Surgeon Practice No."
              >
                <span>Dr Prac: {metadata.surgeonPracticeNo}</span>
                {copiedField === 'drprac' ? (
                  <Check className="w-3 h-3 text-[#00D2C6]" />
                ) : (
                  <Copy className="w-3 h-3 opacity-75" />
                )}
              </button>
            )}
            {metadata.referringDoctor && (
              <span className="px-2 py-0.5 rounded bg-[#0E1218] border border-[#232B38] text-[#C5D0DF]">
                Ref Dr: {metadata.referringDoctor}
              </span>
            )}
            {metadata.patientIdNumber && (
              <button
                type="button"
                onClick={() =>
                  copyVal('idno', metadata.patientIdNumber as string)
                }
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0E1218] border border-[#232B38] font-mono text-[11px] text-[#C5D0DF] hover:border-[#00D2C6]"
                title="Copy Patient ID Number"
              >
                <span>ID: {metadata.patientIdNumber}</span>
                {copiedField === 'idno' ? (
                  <Check className="w-3 h-3 text-[#00D2C6]" />
                ) : (
                  <Copy className="w-3 h-3 opacity-75" />
                )}
              </button>
            )}
            {metadata.patientDob && (
              <span className="px-2 py-0.5 rounded bg-[#0E1218] border border-[#232B38] font-mono text-[11px] text-[#8B98AB]">
                DOB: {metadata.patientDob}
              </span>
            )}
            {metadata.mainMemberName && (
              <span className="px-2 py-0.5 rounded bg-[#0E1218] border border-[#232B38] text-[#C5D0DF]">
                Main Member: {metadata.mainMemberName}
              </span>
            )}
            {metadata.medicalAidOption && (
              <span className="px-2 py-0.5 rounded bg-[#0E1218] border border-[#232B38] text-[#C5D0DF]">
                Plan: {metadata.medicalAidOption}
              </span>
            )}
          </div>

          {metadata.postalAddress && (
            <p className="text-[11px] text-[#8B98AB]">
              <span className="font-mono uppercase text-[10px] mr-1.5">
                Address:
              </span>
              {metadata.postalAddress}
            </p>
          )}

          {/* Cell-Saver Volumes, Hepsaline & Consumables */}
          {(metadata.bloodLossMl ||
            metadata.cellSavedMl ||
            metadata.hepsalineStrength ||
            (metadata.consumables && metadata.consumables.length > 0) ||
            (metadata.infusionFilters && metadata.infusionFilters.length > 0) ||
            (metadata.bloodBankUnits && metadata.bloodBankUnits.length > 0) ||
            metadata.theatreSister) && (
            <div className="p-2.5 rounded-lg bg-[#0E1218] border border-[#232B38] space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                {(metadata.bloodLossMl || metadata.cellSavedMl) && (
                  <span className="inline-flex items-center gap-1 font-mono text-rose-300 font-semibold">
                    <Droplets className="w-3.5 h-3.5" />
                    {metadata.bloodLossMl ? `Loss: ${metadata.bloodLossMl}ml` : ''}
                    {metadata.bloodLossMl && metadata.cellSavedMl ? ' · ' : ''}
                    {metadata.cellSavedMl
                      ? `Cell-Saved: ${metadata.cellSavedMl}ml${
                          metadata.cellSavedHct
                            ? ` @ ${metadata.cellSavedHct}%`
                            : ''
                        }`
                      : ''}
                  </span>
                )}
                {metadata.hepsalineStrength && (
                  <span className="font-mono text-[#9FF7F1]">
                    Hepsaline 1L: {metadata.hepsalineStrength} IU ×
                    {metadata.hepsalineQty ?? 1}
                  </span>
                )}
              </div>

              {metadata.consumables && metadata.consumables.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-[#8B98AB]">
                    <Package className="w-3 h-3 text-[#00D2C6]" />
                    Consumables:
                  </span>
                  {metadata.consumables.map((c, idx) => (
                    <span
                      key={`${c.name}-${idx}`}
                      className="px-2 py-0.5 rounded bg-[#14181F] border border-[#2C3545] font-mono text-[11px] text-white"
                    >
                      {c.name} ×{c.qty}
                      {c.expiryDate ? ` (Exp ${c.expiryDate})` : ''}
                    </span>
                  ))}
                </div>
              )}

              {metadata.infusionFilters && metadata.infusionFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-mono text-[10px] uppercase text-[#8B98AB]">
                    Filters:
                  </span>
                  {metadata.infusionFilters.map((f, idx) => (
                    <span
                      key={`${f.type}-${idx}`}
                      className="px-2 py-0.5 rounded bg-[#14181F] border border-[#232B38] font-mono text-[11px] text-[#C5D0DF]"
                    >
                      {f.type} ×{f.qty}
                    </span>
                  ))}
                </div>
              )}

              {metadata.bloodBankUnits && metadata.bloodBankUnits.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-mono text-[10px] uppercase text-[#8B98AB]">
                    Blood Bank Washed:
                  </span>
                  {metadata.bloodBankUnits.map((b, idx) => (
                    <span
                      key={`${b.unitNumber}-${idx}`}
                      className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-400/30 font-mono text-[11px] text-rose-200"
                    >
                      {b.bloodType || 'Unit'} #{b.unitNumber}
                    </span>
                  ))}
                </div>
              )}

              {metadata.theatreSister && (
                <p className="inline-flex items-center gap-1 text-[11px] text-[#8B98AB]">
                  <UserCheck className="w-3 h-3 text-[#00D2C6]" />
                  <span>Theatre Sister: {metadata.theatreSister}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Plain Clinical Notes & Query Replies */}
      {baseNotes && (
        <p className="text-[#C5D0DF]">
          <span className="font-mono text-[10px] uppercase text-[#8B98AB] mr-2">
            Notes:
          </span>
          {baseNotes}
        </p>
      )}
      {resolutionReplies.map((rep, i) => (
        <p key={i} className="text-[#9FF7F1]">
          <span className="font-mono text-[10px] uppercase text-[#00D2C6] mr-2">
            Your Reply:
          </span>
          {rep}
        </p>
      ))}
    </div>
  );
}