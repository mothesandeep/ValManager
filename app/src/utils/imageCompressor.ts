export interface CompressionResult {
  compressedBlob: Blob;
  base64: string;
}

/**
 * Loads an image Blob/File into an HTMLImageElement safely across browsers and environments.
 */
function loadImage(fileOrBlob: Blob | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(fileOrBlob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression: ' + String(e)));
    };
    img.src = objectUrl;
  });
}

/**
 * Converts a Blob to a base64 data string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64.'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Compresses an image file or blob to standard textile slip dimensions and quality.
 * Maintains aspect ratio while scaling maximum dimension down to maxWidth (default 1600px)
 * and exports a high-quality JPEG blob (~150KB-250KB) keeping handwritten digits crystal clear.
 */
export async function compressImage(
  fileOrBlob: Blob | File,
  maxWidth = 1600,
  quality = 0.8
): Promise<CompressionResult> {
  let width = 0;
  let height = 0;
  let sourceCanvasOrImage: CanvasImageSource;

  // Prefer createImageBitmap if supported in browser environment (faster & avoids DOM hitch)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(fileOrBlob);
      width = bitmap.width;
      height = bitmap.height;
      sourceCanvasOrImage = bitmap;
    } catch {
      const img = await loadImage(fileOrBlob);
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
      sourceCanvasOrImage = img;
    }
  } else {
    const img = await loadImage(fileOrBlob);
    width = img.naturalWidth || img.width;
    height = img.naturalHeight || img.height;
    sourceCanvasOrImage = img;
  }

  // Calculate scaled dimensions maintaining aspect ratio
  let targetWidth = width;
  let targetHeight = height;

  if (width > maxWidth || height > maxWidth) {
    if (width >= height) {
      targetWidth = maxWidth;
      targetHeight = Math.round((height * maxWidth) / width);
    } else {
      targetHeight = maxWidth;
      targetWidth = Math.round((width * maxWidth) / height);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Canvas 2D context could not be created for image compression.');
  }

  // High quality smoothing for clear handwriting and text edge retention
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill canvas with white background before drawing (prevents black background on transparent PNGs)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  ctx.drawImage(sourceCanvasOrImage, 0, 0, targetWidth, targetHeight);

  // Close ImageBitmap if used to release GPU memory
  if (typeof (sourceCanvasOrImage as ImageBitmap).close === 'function') {
    (sourceCanvasOrImage as ImageBitmap).close();
  }

  // Export as image/jpeg
  const compressedBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) {
          resolve(b);
        } else {
          reject(new Error('Canvas export to blob failed.'));
        }
      },
      'image/jpeg',
      quality
    );
  });

  const base64 = await blobToBase64(compressedBlob);

  return {
    compressedBlob,
    base64,
  };
}
