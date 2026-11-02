import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { compressImage } from './imageCompressor';

export { CameraSource };

export interface CapturedPhoto {
  file?: Blob;
  previewUrl: string;
}

/**
 * Captures a challan photo using Capacitor Camera directly on mobile (Android/iOS)
 * with native downscaling & compression to minimize latency and memory footprint.
 * Default source is CameraSource.Camera (direct 1-tap camera launch with no intermediate prompt).
 */
export async function captureChallanPhoto(
  source: CameraSource = CameraSource.Camera
): Promise<CapturedPhoto> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        width: 1400,
        height: 1800,
        resultType: CameraResultType.Uri,
        source: source,
        correctOrientation: true,
      });

      if (!image.webPath) {
        throw new Error('Could not retrieve photo path from device camera.');
      }

      // Fast read of native downscaled image file into Blob
      const response = await fetch(image.webPath);
      const rawBlob = await response.blob();
      const previewUrl = image.webPath || URL.createObjectURL(rawBlob);

      // If already under 1.5MB (standard output for native 1400x1800 @ 80%), return directly
      if (rawBlob.size <= 1.5 * 1024 * 1024) {
        return {
          file: rawBlob,
          previewUrl,
        };
      }

      // Fallback compression only if image exceeded expected size
      const { compressedBlob } = await compressImage(rawBlob, 1400, 0.8);
      return {
        file: compressedBlob,
        previewUrl: URL.createObjectURL(compressedBlob),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // If user cancelled, rethrow or handle gracefully
      if (message.toLowerCase().includes('cancel') || message.toLowerCase().includes('user cancelled')) {
        throw new Error('Photo capture cancelled by user.');
      }
      // If native camera fails unexpectedly, fallback to browser input picker
      console.warn('Native camera failed, falling back to file picker:', err);
      return capturePhotoWebFallback();
    }
  }

  // Web Browser / PWA Fallback
  return capturePhotoWebFallback();
}

/**
 * Directly opens the native photo library / gallery to select an existing challan photo
 */
export async function pickChallanGalleryPhoto(): Promise<CapturedPhoto> {
  return captureChallanPhoto(CameraSource.Photos);
}

/**
 * Fallback file picker for web browsers with automatic compression
 */
function capturePhotoWebFallback(): Promise<CapturedPhoto> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // Allows mobile web users to trigger camera directly or pick from gallery
    input.setAttribute('capture', 'environment');

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No image was selected.'));
        return;
      }

      try {
        const { compressedBlob } = await compressImage(file, 1600, 0.8);
        const previewUrl = URL.createObjectURL(compressedBlob);
        resolve({
          file: compressedBlob,
          previewUrl,
        });
      } catch (err) {
        console.warn('Image compression failed in web fallback, using original file:', err);
        const previewUrl = URL.createObjectURL(file);
        resolve({
          file,
          previewUrl,
        });
      }
    };

    input.onerror = (e) => {
      reject(new Error('Failed to open file picker: ' + String(e)));
    };

    input.oncancel = () => {
      reject(new Error('Photo selection cancelled by user.'));
    };

    input.click();
  });
}
