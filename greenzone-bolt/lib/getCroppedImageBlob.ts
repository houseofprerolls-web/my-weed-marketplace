import type { Area } from 'react-easy-crop';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error('Image failed to load')));
    img.src = src;
  });
}

function scaleCanvasToMaxLongEdge(source: HTMLCanvasElement, maxLongEdge: number): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const long = Math.max(w, h);
  if (long <= maxLongEdge) return source;
  const scale = maxLongEdge / long;
  const nw = Math.max(1, Math.round(w * scale));
  const nh = Math.max(1, Math.round(h * scale));
  const out = document.createElement('canvas');
  out.width = nw;
  out.height = nh;
  const ctx = out.getContext('2d');
  if (!ctx) return source;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, nw, nh);
  return out;
}

/**
 * Renders the `pixelCrop` region from `imageSrc` to a JPEG blob (for upload).
 * Optionally downscales so the longest edge is at most `maxLongEdge`.
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  maxLongEdge?: number
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const w = Math.max(1, Math.round(pixelCrop.width));
  const h = Math.max(1, Math.round(pixelCrop.height));
  canvas.width = w;
  canvas.height = h;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    Math.round(pixelCrop.x),
    Math.round(pixelCrop.y),
    w,
    h,
    0,
    0,
    w,
    h
  );

  const finalCanvas =
    maxLongEdge != null && maxLongEdge > 0 ? scaleCanvasToMaxLongEdge(canvas, maxLongEdge) : canvas;

  return new Promise((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not encode image'));
      },
      'image/jpeg',
      0.92
    );
  });
}
