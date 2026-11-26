import type { StickerOcrPayload } from '@/app/api/ocr/sticker/route';

export type { StickerOcrPayload };

/**
 * Compresses a raw mobile camera sticker photo to max 1280px JPEG (82% quality)
 * so uploads succeed quickly over weak hospital signal and minimize OpenAI vision tokens.
 */
export async function compressStickerImage(
  file: File,
  maxDimension = 1280,
  quality = 0.82
): Promise<{ compressedFile: File; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
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
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error('Failed to encode compressed sticker JPEG'));
              return;
            }
            const cleanName = file.name.replace(/\.[^.]+$/, '') || 'sticker';
            const compressedFile = new File([blob], `${cleanName}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve({ compressedFile, dataUrl });
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode sticker image'));
    };

    img.src = objectUrl;
  });
}

export async function runStickerOcr(
  file: File,
  accessToken: string
): Promise<{ compressedFile: File; ocr: StickerOcrPayload }> {
  const { compressedFile, dataUrl } = await compressStickerImage(file);

  const res = await fetch('/api/ocr/sticker', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ imageDataUrl: dataUrl }),
  });

  const json = await res.json();
  if (!res.ok || !json.data) {
    throw new Error(json.error || 'Could not extract text from sticker.');
  }

  return {
    compressedFile,
    ocr: json.data as StickerOcrPayload,
  };
}
