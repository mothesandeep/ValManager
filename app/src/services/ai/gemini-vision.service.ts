import { supabase } from '@/services/api/client';
import type { Party } from '@/features/parties/types';
import { getPartyAliases } from '@/features/parties/utils';
import type { ExtractedChallanData, ScanEdgeFunctionResponse } from './types';
import { scanViaDirectGemini, getGeminiApiKey } from './geminiClient';
import { normalizeExtractedData } from './normalization';

export * from './types';
export * from './parsers';
export * from './prompts';
export * from './geminiClient';
export * from './normalization';

/**
 * Scans a captured challan image using Google Gemini Vision API
 * with direct fast-path and sub-3-second OCR extraction.
 */
export async function scanChallanImage(
  file: Blob | File,
  challanType: 'INWARD' | 'OUTWARD',
  knownParties?: Party[]
): Promise<ExtractedChallanData> {
  const directApiKey = getGeminiApiKey();

  // Fast Path: When client API key is configured, go directly to Gemini Flash API
  if (directApiKey) {
    const result = await scanViaDirectGemini(file, challanType, knownParties);
    return normalizeExtractedData(result, challanType, knownParties);
  }

  // Fallback: If no client API key, attempt Supabase Edge Function
  try {
    const formData = new FormData();
    const fileToUpload =
      file instanceof File
        ? file
        : new File([file], `challan-${Date.now()}.jpg`, { type: file.type || 'image/jpeg' });

    formData.append('file', fileToUpload);
    formData.append('challan_type', challanType);
    if (knownParties && knownParties.length > 0) {
      formData.append(
        'known_parties',
        JSON.stringify(
          knownParties.map((p) => ({
            name: p.name,
            aliases: getPartyAliases(p),
          }))
        )
      );
    }

    const { data, error } = await supabase.functions.invoke<ScanEdgeFunctionResponse>('scan-challan', {
      body: formData,
    });

    if (error) {
      console.warn('[aiScanner] Edge Function invocation failed:', error);
      throw error;
    }

    if (data?.error) {
      throw new Error(data.error + (data.details ? ` (${data.details})` : ''));
    }

    if (data?.data) {
      return normalizeExtractedData(data.data as Record<string, unknown>, challanType, knownParties);
    }

    throw new Error('No data received from Edge Function.');
  } catch (edgeError: unknown) {
    console.error('[aiScanner] Edge Function failed:', edgeError);
    const msg = edgeError instanceof Error ? edgeError.message : String(edgeError);
    throw new Error(`Challan scan failed: ${msg}. Please configure VITE_GEMINI_API_KEY in .env.local.`);
  }
}
