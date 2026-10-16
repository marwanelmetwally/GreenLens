import type { PlantAnalysis } from '../types/plant';

const MAX_API_PIXELS = 2_000_000;

async function fileToDataUrl(file: File): Promise<string> {
  const originalDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('تعذر قراءة الصورة المختارة.'));
    };
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة المختارة.'));
    reader.readAsDataURL(file);
  });

  const image = new Image();
  image.src = originalDataUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('تعذر تجهيز الصورة للتحليل.'));
  });

  const scale = Math.min(1, Math.sqrt(MAX_API_PIXELS / (image.naturalWidth * image.naturalHeight)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذر تجهيز الصورة للتحليل.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

/** Sends the image to the local proxy, which keeps the Plant.id key on the server. */
export async function analyzePlantImage(image: File): Promise<PlantAnalysis> {
  const dataUrl = await fileToDataUrl(image);
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: dataUrl }),
  });

  const payload = await response.json().catch(() => null) as { message?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.message || 'تعذر الوصول إلى خدمة تحليل النباتات.');
  }

  return payload as PlantAnalysis;
}
