import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export interface StickerOcrPayload {
  patient_first_name: string;
  patient_surname: string;
  medical_aid_name: string;
  medical_aid_number: string;
  dependent_code: string;
  patient_cellphone: string;
  facility_name: string;
  referring_surgeon: string;
  confidence: 'high' | 'medium' | 'low';
}

const STICKER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'patient_first_name',
    'patient_surname',
    'medical_aid_name',
    'medical_aid_number',
    'dependent_code',
    'patient_cellphone',
    'facility_name',
    'referring_surgeon',
    'confidence',
  ],
  properties: {
    patient_first_name: {
      type: 'string',
      description: 'Patient first name(s) or initials if full first name is not printed. Empty string if unreadable.',
    },
    patient_surname: {
      type: 'string',
      description: 'Patient surname / family name. Empty string if unreadable.',
    },
    medical_aid_name: {
      type: 'string',
      description: 'South African medical scheme name (e.g. Discovery Health, Bonitas, GEMS, Momentum, Medihelp, Bestmed, CompCare, Fedhealth, Polmed). Empty string if private/unreadable.',
    },
    medical_aid_number: {
      type: 'string',
      description: 'Medical aid membership number only (digits/letters without dependent suffix). Empty string if unreadable.',
    },
    dependent_code: {
      type: 'string',
      description: 'Two-digit dependent code if shown (e.g. 00, 01, 02). Empty string if not shown.',
    },
    patient_cellphone: {
      type: 'string',
      description: 'South African mobile number normalized to 10 digits starting with 0 (e.g. 0821234567). Empty string if not shown.',
    },
    facility_name: {
      type: 'string',
      description: 'Hospital or clinic name printed on the sticker (e.g. Netcare Sunninghill, Life Fourways, Mediclinic Morningside). Empty string if not shown.',
    },
    referring_surgeon: {
      type: 'string',
      description: 'Treating or admitting doctor/surgeon printed on the sticker (e.g. Dr. K. Naidoo). Empty string if not shown.',
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'Overall print legibility confidence.',
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const body = await req.json();
    const imageDataUrl = String(body?.imageDataUrl || '');

    if (!imageDataUrl.startsWith('data:image/') || imageDataUrl.length > 4_500_000) {
      return NextResponse.json(
        { error: 'Invalid or oversized sticker image payload.' },
        { status: 400 }
      );
    }

    const model = process.env.OPENAI_OCR_MODEL || 'gpt-4o-mini';

    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 350,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'sa_hospital_sticker',
            strict: true,
            schema: STICKER_SCHEMA,
          },
        },
        messages: [
          {
            role: 'system',
            content:
              'You extract patient billing demographics from South African hospital admission stickers (Netcare, Life Healthcare, Mediclinic, NHN). Never guess missing digits; return an empty string "" for any field not clearly visible.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the patient demographics, medical scheme details, hospital facility, and admitting doctor from this hospital sticker.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
      }),
    });

    if (!openAiRes.ok) {
      const errText = await openAiRes.text();
      console.error('OpenAI OCR error:', errText);
      return NextResponse.json(
        { error: 'Sticker OCR service failed to read image.' },
        { status: 502 }
      );
    }

    const completion = await openAiRes.json();
    const rawContent = completion?.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json(
        { error: 'No structured extraction returned from OCR.' },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(rawContent) as StickerOcrPayload;
    return NextResponse.json({ data: parsed });
  } catch (err) {
    console.error('Sticker OCR route error:', err);
    return NextResponse.json(
      { error: 'Unexpected error processing sticker OCR.' },
      { status: 500 }
    );
  }
}
