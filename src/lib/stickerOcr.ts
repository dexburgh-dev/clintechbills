export interface StickerOcrPayload {
  patient_first_name: string;
  patient_surname: string;
  main_member_name: string;
  patient_id_number: string;
  patient_dob: string;
  postal_address: string;
  medical_aid_name: string;
  medical_aid_option: string;
  medical_aid_number: string;
  dependent_code: string;
  authorisation_number: string;
  patient_cellphone: string;
  facility_name: string;
  referring_surgeon: string;
  surgeon_practice_no: string;
  confidence: 'high' | 'medium' | 'low';
}

export async function compressStickerImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<{ compressedFile: File; base64DataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read sticker image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid sticker image format.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const base64DataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed.'));
              return;
            }
            const cleanName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
            });
            resolve({ compressedFile, base64DataUrl });
          },
          'image/jpeg',
          quality
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function runStickerOcr(
  file: File,
  accessToken: string
): Promise<{ compressedFile: File; ocr: StickerOcrPayload }> {
  const { compressedFile, base64DataUrl } = await compressStickerImage(file);

  const res = await fetch('/api/ocr-sticker', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ imageDataUrl: base64DataUrl }),
  });

  const json = await res.json();
  if (!res.ok || !json.ocr) {
    throw new Error(json.error || 'Sticker OCR extraction failed.');
  }

  return {
    compressedFile,
    ocr: json.ocr as StickerOcrPayload,
  };
}