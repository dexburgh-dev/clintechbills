import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase environment variables not configured.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await req.json();
    const imageDataUrl = String(body?.imageDataUrl || '');
    const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid base64 image payload.' },
        { status: 400 }
      );
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const prompt = `You are a South African medical billing OCR specialist extracting patient admission sticker data (Netcare, Life Healthcare, Mediclinic, Lenmed, NHN).
Inspect the hospital patient sticker image carefully and extract ONLY valid JSON matching this exact schema (use empty string "" if unreadable or absent):
{
  "patient_first_name": "Patient's first / given names (e.g. Fritz C or Nicolene Allouise)",
  "patient_surname": "Patient's surname / family name",
  "main_member_name": "Main medical aid member full name if listed (e.g. Mr FC Relling)",
  "patient_id_number": "13-digit South African ID number if printed (digits only)",
  "patient_dob": "Date of birth formatted as YYYY-MM-DD if printed (or derived from SA ID)",
  "postal_address": "Street/postal address and postal code on single line",
  "medical_aid_name": "Medical scheme name (e.g. Discovery Health, Bonitas, GEMS, Momentum, Medihelp, Bestmed, Fedhealth)",
  "medical_aid_option": "Plan / option name if printed (e.g. Classic Saver, Executive, Coastal Core)",
  "medical_aid_number": "Membership number only (digits/letters, excluding dependant code)",
  "dependent_code": "2-digit dependant code if present (e.g. 00, 01, 02)",
  "authorisation_number": "Pre-authorisation / auth number if printed",
  "patient_cellphone": "Patient or main member mobile/telephone number",
  "facility_name": "Hospital or clinic name if visible",
  "referring_surgeon": "Admitting / treating doctor name if visible (e.g. Dr RD Kyte)",
  "surgeon_practice_no": "Admitting / treating doctor BHF practice number if printed (e.g. 0157996 or 917583)",
  "confidence": "high" | "medium" | "low"
}
Return ONLY raw JSON without markdown fences.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    const geminiJson = await geminiRes.json();
    if (!geminiRes.ok) {
      return NextResponse.json(
        {
          error:
            geminiJson?.error?.message ||
            'Gemini Vision OCR request failed.',
        },
        { status: 502 }
      );
    }

    const rawText: string =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleanedText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      return NextResponse.json(
        { error: 'Could not parse OCR JSON response.' },
        { status: 502 }
      );
    }

    const ocr = {
      patient_first_name: String(parsed.patient_first_name || '').trim(),
      patient_surname: String(parsed.patient_surname || '').trim(),
      main_member_name: String(parsed.main_member_name || '').trim(),
      patient_id_number: String(parsed.patient_id_number || '').trim(),
      patient_dob: String(parsed.patient_dob || '').trim(),
      postal_address: String(parsed.postal_address || '').trim(),
      medical_aid_name: String(parsed.medical_aid_name || '').trim(),
      medical_aid_option: String(parsed.medical_aid_option || '').trim(),
      medical_aid_number: String(parsed.medical_aid_number || '').trim(),
      dependent_code: String(parsed.dependent_code || '').trim(),
      authorisation_number: String(parsed.authorisation_number || '').trim(),
      patient_cellphone: String(parsed.patient_cellphone || '').trim(),
      facility_name: String(parsed.facility_name || '').trim(),
      referring_surgeon: String(parsed.referring_surgeon || '').trim(),
      surgeon_practice_no: String(parsed.surgeon_practice_no || '').trim(),
      confidence:
        parsed.confidence === 'high' ||
        parsed.confidence === 'medium' ||
        parsed.confidence === 'low'
          ? parsed.confidence
          : 'medium',
    };

    return NextResponse.json({ ocr });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Unexpected error processing sticker OCR.',
      },
      { status: 500 }
    );
  }
}