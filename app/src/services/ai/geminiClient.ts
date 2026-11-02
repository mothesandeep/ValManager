import { GoogleGenAI } from '@google/genai';
import { compressImage } from '@/utils/imageCompressor';
import type { Party } from '@/features/parties/types';
import { blobToBase64 } from './parsers';
import {
  INWARD_JSON_SCHEMA,
  OUTWARD_JSON_SCHEMA,
  buildPartyPromptSection,
  getInwardSystemInstruction,
  getInwardUserPrompt,
  getOutwardSystemInstruction,
  getOutwardUserPrompt,
} from './prompts';

/**
 * Default candidate models ordered by speed and accuracy
 */
export const DEFAULT_GEMINI_CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

/**
 * Retrieves the configured Gemini API key from environment or window globals
 */
export function getGeminiApiKey(): string {
  const rawApiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_GOOGLE_API_KEY ||
    (typeof window !== 'undefined' ? (window as unknown as Record<string, string>).GEMINI_API_KEY : '');

  return (rawApiKey || (import.meta.env.VITE_GEMINI_API_KEY || '')).trim().replace(/^["']|["']$/g, '');
}

/**
 * Initializes and returns the official GoogleGenAI client
 */
export function createGeminiClient(apiKey?: string): GoogleGenAI {
  const key = apiKey || getGeminiApiKey();
  if (!key) {
    throw new Error(
      'VITE_GEMINI_API_KEY is not configured in .env.local. Please add VITE_GEMINI_API_KEY to your .env.local file.'
    );
  }
  return new GoogleGenAI({ apiKey: key });
}

/**
 * Directly calls Google Gemini Vision REST API (client-side fast-path)
 */
export async function scanViaDirectGemini(
  file: Blob | File,
  challanType: 'INWARD' | 'OUTWARD',
  knownParties?: Party[]
): Promise<Record<string, unknown>> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'VITE_GEMINI_API_KEY is not configured in .env.local. Please add VITE_GEMINI_API_KEY to your .env.local file.'
    );
  }

  // Pre-compress payload only if oversized (>1.5MB); otherwise use fast native base64 transfer
  let cleanBase64 = '';
  let mimeType = file.type || 'image/jpeg';
  if (file.size <= 1.5 * 1024 * 1024) {
    const rawBase64 = await blobToBase64(file);
    cleanBase64 = rawBase64.includes('base64,')
      ? rawBase64.split('base64,')[1].trim()
      : rawBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
  } else {
    try {
      const compression = await compressImage(file, 1400, 0.8);
      cleanBase64 = compression.base64.includes('base64,')
        ? compression.base64.split('base64,')[1].trim()
        : compression.base64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
      mimeType = 'image/jpeg';
    } catch (compErr) {
      console.warn('[aiScanner] Pre-compression failed, using direct base64:', compErr);
      const rawBase64 = await blobToBase64(file);
      cleanBase64 = rawBase64.includes('base64,')
        ? rawBase64.split('base64,')[1].trim()
        : rawBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
    }
  }

  const ai = createGeminiClient(apiKey);
  const partyPromptSection = buildPartyPromptSection(knownParties);

  const systemInstruction =
    challanType === 'INWARD'
      ? getInwardSystemInstruction(partyPromptSection)
      : getOutwardSystemInstruction(partyPromptSection);

  const userPrompt = challanType === 'INWARD' ? getInwardUserPrompt() : getOutwardUserPrompt();

  const envModel = (
    import.meta.env.VITE_GEMINI_MODEL ||
    (typeof window !== 'undefined' ? (window as unknown as Record<string, string>).GEMINI_MODEL : '') ||
    ''
  ).trim();

  // Target fastest active Flash models directly (with automatic fallback)
  const candidateModels = Array.from(new Set([
    envModel,
    ...DEFAULT_GEMINI_CANDIDATE_MODELS,
  ])).filter(Boolean);

  let lastError: unknown = null;
  const scanStartTime = Date.now();

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(new Error('AI Challan scan timed out after 40 seconds.'));
  }, 40000);

  const targetSchema = challanType === 'INWARD' ? INWARD_JSON_SCHEMA : OUTWARD_JSON_SCHEMA;

  try {
    for (const model of candidateModels) {
      if (Date.now() - scanStartTime > 35000) {
        console.warn('[aiScanner] Stopping model retries: elapsed time exceeded limit.');
        break;
      }

      let perModelTimeoutId: NodeJS.Timeout | null = null;
      try {
        const config: Record<string, unknown> = {
          responseMimeType: 'application/json',
          responseSchema: targetSchema,
          temperature: 0.1,
          maxOutputTokens: 2048,
          abortSignal: abortController.signal,
        };

        const generatePromise = ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemInstruction + '\n\n' + userPrompt },
                {
                  inlineData: {
                    mimeType,
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          config,
        });

        const perModelTimeoutPromise = new Promise<never>((_, reject) => {
          perModelTimeoutId = setTimeout(() => {
            reject(new Error(`Model ${model} request exceeded 12s timeout limit.`));
          }, 12000);
          abortController.signal.addEventListener('abort', () => {
            if (perModelTimeoutId) clearTimeout(perModelTimeoutId);
            reject(new Error('AI Challan scan timed out after 40 seconds.'));
          });
        });

        const response = await Promise.race([generatePromise, perModelTimeoutPromise]);
        if (perModelTimeoutId) clearTimeout(perModelTimeoutId);

        const outputText = response.text;
        if (!outputText) throw new Error('Empty response received from AI model');

        const cleanedJson = outputText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        return JSON.parse(cleanedJson);
      } catch (err: unknown) {
        if (perModelTimeoutId) clearTimeout(perModelTimeoutId);
        console.warn(`[aiScanner] Model ${model} failed:`, err);
        lastError = err;
        if (abortController.signal.aborted) {
          throw new Error('AI Challan scan timed out after 40 seconds.');
        }
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  const errorMsg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Google GenAI scan failed: ${errorMsg}`);
}
