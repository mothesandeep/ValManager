/**
 * Converts a Blob or File to a Base64 string safely via native asynchronous FileReader
 */
export function blobToBase64(blob: Blob): Promise<string> {
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
 * Parses diverse challan date formats (ISO, D-M-YY, DD/MM/YYYY, embedded date tokens)
 * into a normalized ISO YYYY-MM-DD string.
 */
export function parseChallanDate(rawDate: unknown): string | null {
  if (rawDate == null) return null;
  const str = String(rawDate).trim();
  if (!str) return null;

  // Already standard ISO: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // D-M-YY or DD-MM-YYYY format: e.g. 2-10-26, 02/10/2026, 2.10.26, 2-10-2026
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmyMatch) {
    const [, dayStr, monthStr, yearStr] = dmyMatch;
    const d = parseInt(dayStr, 10);
    const m = parseInt(monthStr, 10);
    let y = parseInt(yearStr, 10);

    // Convert 2-digit year (e.g. 26 -> 2026, 25 -> 2025)
    if (yearStr.length === 2) {
      y = y < 70 ? 2000 + y : 1900 + y;
    }

    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2099) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Also check if date is embedded in a label like "Date: 2-10-26" or "Ta. 02-10-2026"
  const embeddedMatch = str.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (embeddedMatch) {
    const [, dayStr, monthStr, yearStr] = embeddedMatch;
    const d = parseInt(dayStr, 10);
    const m = parseInt(monthStr, 10);
    let y = parseInt(yearStr, 10);
    if (yearStr.length === 2) {
      y = y < 70 ? 2000 + y : 1900 + y;
    }
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2099) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Sanitizes quality / tar labels by stripping any duplicate "Tar" words.
 * Examples: "12 Tar Tar" -> "12 Tar", "12 Tar" -> "12 Tar", "12" -> "12 Tar"
 */
export function sanitizeQualityTarLabel(val?: unknown): string {
  if (val === null || val === undefined) return '10 Tar';
  const str = String(val).trim();
  if (!str) return '10 Tar';
  const digits = str.match(/\b(10|12|14|15|16|18|20|22|24|28|30|32|36|40)\b/) || str.match(/\d+/);
  const num = digits ? digits[0] : '10';
  return `${num} Tar`;
}

/**
 * Extracts Tar Category (e.g. "10 Tar", "12 Tar") and Twist Type ('S' | 'Z' | 'S+Z')
 * from challan description handwriting like "10 Z", "12 Z", "12 S", "10 S+Z".
 */
export function parseTarAndTwist(
  descriptionText?: unknown,
  explicitTar?: unknown,
  explicitTwist?: unknown
): { tar: string; twist: 'S' | 'Z' | 'S+Z' } {
  const combined = `${descriptionText || ''} ${explicitTar || ''} ${explicitTwist || ''}`.trim();
  const upper = combined.toUpperCase();

  // Twist resolution:
  let twist: 'S' | 'Z' | 'S+Z' = 'S';
  if (
    upper.includes('S+Z') ||
    upper.includes('S/Z') ||
    upper.includes('SZ') ||
    upper.includes('S + Z') ||
    explicitTwist === 'S+Z'
  ) {
    twist = 'S+Z';
  } else if (
    /\bZ\b/.test(upper) ||
    upper.includes(' Z ') ||
    upper.endsWith(' Z') ||
    upper.endsWith('-Z') ||
    upper.endsWith('/Z') ||
    /\d+\s*Z\b/.test(upper) ||
    explicitTwist === 'Z'
  ) {
    twist = 'Z';
  } else if (
    /\bS\b/.test(upper) ||
    upper.includes(' S ') ||
    upper.endsWith(' S') ||
    upper.endsWith('-S') ||
    upper.endsWith('/S') ||
    /\d+\s*S\b/.test(upper) ||
    explicitTwist === 'S'
  ) {
    twist = 'S';
  }

  // Tar resolution: Look for cord/tar numbers: 10, 12, 14, 15, 16, 18, 20, 22, 24, 28, 30, 32, 36, 40
  let tarNumber = '10';
  const explicitTarStr = String(explicitTar || '').trim();
  const descStr = String(descriptionText || '').trim();
  const explicitNum = explicitTarStr.match(/\b(10|12|14|15|16|18|20|22|24|28|30|32|36|40)\b/) || explicitTarStr.match(/\d+/);
  if (explicitNum) {
    tarNumber = explicitNum[0];
  } else {
    // If multiple numbers in description (e.g. "12 10 C" where 12 is bungari count and 10 is tar):
    const numberBeforeTwist = descStr.match(/(\d+)\s*([CSZ]|$)/i);
    if (numberBeforeTwist && /\b(10|12|14|15|16|18|20|22|24|28|30|32|36|40)\b/.test(numberBeforeTwist[1])) {
      tarNumber = numberBeforeTwist[1];
    } else {
      const numMatch = combined.match(/\b(10|12|14|15|16|18|20|22|24|28|30|32|36|40)\b/) || combined.match(/\d+/);
      if (numMatch) {
        tarNumber = numMatch[0];
      }
    }
  }

  return {
    tar: sanitizeQualityTarLabel(tarNumber),
    twist,
  };
}

