import { supabase } from '../supabase';

/**
 * Uploads a compressed challan photo blob to the 'challan-images' bucket in Supabase Storage.
 * Handles missing bucket, offline mode, and network errors gracefully by logging and returning null.
 */
export async function uploadChallanImage(
  blob: Blob,
  prefix: string = 'challan'
): Promise<string | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    const fileExt = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_') || 'challan';
    const filePath = `${cleanPrefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('challan-images')
      .upload(filePath, blob, {
        contentType: blob.type || 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.warn('[Storage] Upload to challan-images bucket failed:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('challan-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl || null;
  } catch (err) {
    console.warn('[Storage] Unexpected error during challan image upload:', err);
    return null;
  }
}
