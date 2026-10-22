import type { Party } from '../parties/types'
import { STANDARD_ROLA_WEIGHT_G, STANDARD_BORI_WEIGHT_G } from '../receiving/calculations'
import { STANDARD_BUNGARI_WEIGHT_G } from '../dispatch/calculations'

export { STANDARD_ROLA_WEIGHT_G, STANDARD_BUNGARI_WEIGHT_G, STANDARD_BORI_WEIGHT_G }

export const DEFAULT_BIG_ROLA_WEIGHT_G = 250

export const STORAGE_KEY_GLOBAL_ROLA = 'kasab_global_default_rola_weight_g'
export const STORAGE_KEY_GLOBAL_BIG_ROLA = 'kasab_global_default_big_rola_weight_g'
export const STORAGE_KEY_GLOBAL_BUNGARI = 'kasab_global_default_bungari_weight_g'
export const STORAGE_KEY_GLOBAL_BORI = 'kasab_global_default_bori_weight_g'
export const STORAGE_KEY_PARTY_BIG_ROLA = 'kasab_party_big_rola_weights_map'

// Legacy keys for backward compatibility
const LEGACY_STORAGE_KEY_ROLA = 'kasab_last_per_rola_weight'
const LEGACY_STORAGE_KEY_BUNGARI = 'kasab_last_bungari_weight'

export interface AppGlobalSettings {
  defaultRolaGrams: number       // Normal Rola, default 200 or 205
  defaultBigRolaGrams: number    // Big Rola, default 250
  defaultBungariGrams: number    // Bungari, default 70
  defaultBoriGrams: number       // Bori (Bag), default 100
}

export function getGlobalSettings(): AppGlobalSettings {
  let rola = STANDARD_ROLA_WEIGHT_G
  let bigRola = DEFAULT_BIG_ROLA_WEIGHT_G
  let bungari = STANDARD_BUNGARI_WEIGHT_G
  let bori = STANDARD_BORI_WEIGHT_G

  try {
    const savedRola =
      localStorage.getItem(STORAGE_KEY_GLOBAL_ROLA) ||
      localStorage.getItem(LEGACY_STORAGE_KEY_ROLA)
    if (savedRola) {
      const parsed = parseInt(savedRola, 10)
      if (!isNaN(parsed) && parsed >= 50) {
        rola = parsed
      } else {
        rola = STANDARD_ROLA_WEIGHT_G
        try {
          localStorage.setItem(STORAGE_KEY_GLOBAL_ROLA, String(STANDARD_ROLA_WEIGHT_G))
        } catch {}
      }
    }

    const savedBigRola = localStorage.getItem(STORAGE_KEY_GLOBAL_BIG_ROLA)
    if (savedBigRola) {
      const parsed = parseInt(savedBigRola, 10)
      if (!isNaN(parsed) && parsed > 0) bigRola = parsed
    }

    const savedBungari =
      localStorage.getItem(STORAGE_KEY_GLOBAL_BUNGARI) ||
      localStorage.getItem(LEGACY_STORAGE_KEY_BUNGARI)
    if (savedBungari) {
      const parsed = parseInt(savedBungari, 10)
      if (!isNaN(parsed) && parsed > 0) bungari = parsed
    }

    const savedBori = localStorage.getItem(STORAGE_KEY_GLOBAL_BORI)
    if (savedBori) {
      const parsed = parseInt(savedBori, 10)
      if (!isNaN(parsed) && parsed > 0) bori = parsed
    }
  } catch (err) {
    console.warn('Could not read settings from localStorage:', err)
  }

  return {
    defaultRolaGrams: rola,
    defaultBigRolaGrams: bigRola,
    defaultBungariGrams: bungari,
    defaultBoriGrams: bori,
  }
}

export function saveGlobalSettings(settings: Partial<AppGlobalSettings>): void {
  try {
    if (settings.defaultRolaGrams !== undefined && settings.defaultRolaGrams > 0) {
      localStorage.setItem(STORAGE_KEY_GLOBAL_ROLA, String(settings.defaultRolaGrams))
      localStorage.setItem(LEGACY_STORAGE_KEY_ROLA, String(settings.defaultRolaGrams))
    }
    if (settings.defaultBigRolaGrams !== undefined && settings.defaultBigRolaGrams > 0) {
      localStorage.setItem(STORAGE_KEY_GLOBAL_BIG_ROLA, String(settings.defaultBigRolaGrams))
    }
    if (settings.defaultBungariGrams !== undefined && settings.defaultBungariGrams > 0) {
      localStorage.setItem(STORAGE_KEY_GLOBAL_BUNGARI, String(settings.defaultBungariGrams))
      localStorage.setItem(LEGACY_STORAGE_KEY_BUNGARI, String(settings.defaultBungariGrams))
    }
    if (settings.defaultBoriGrams !== undefined && settings.defaultBoriGrams > 0) {
      localStorage.setItem(STORAGE_KEY_GLOBAL_BORI, String(settings.defaultBoriGrams))
    }
  } catch (err) {
    console.warn('Could not save settings to localStorage:', err)
  }
}

export function getPartyBigRolaMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PARTY_BIG_ROLA)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, number>
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch {}
  return {}
}

export function savePartyBigRolaWeight(partyId: string, grams: number | null): void {
  try {
    const map = getPartyBigRolaMap()
    if (grams && grams > 0) {
      map[partyId] = grams
    } else {
      delete map[partyId]
    }
    localStorage.setItem(STORAGE_KEY_PARTY_BIG_ROLA, JSON.stringify(map))
  } catch (err) {
    console.warn('Could not save party big rola weight:', err)
  }
}

export function resolvePartyRolaWeight(
  party?: Pick<Party, 'default_rola_weight_g'> | null
): number {
  if (party && party.default_rola_weight_g !== null && party.default_rola_weight_g !== undefined) {
    const val = Number(party.default_rola_weight_g)
    if (!isNaN(val) && val > 0) return val
  }
  return getGlobalSettings().defaultRolaGrams
}

export function resolvePartyBigRolaWeight(
  party?: Pick<Party, 'id'> | null
): number {
  if (party && party.id) {
    const map = getPartyBigRolaMap()
    if (map[party.id] && map[party.id] > 0) return map[party.id]
  }
  return getGlobalSettings().defaultBigRolaGrams
}

export function resolvePartyBungariWeight(
  party?: Pick<Party, 'default_bungari_weight_g'> | null
): number {
  if (party && party.default_bungari_weight_g !== null && party.default_bungari_weight_g !== undefined) {
    const val = Number(party.default_bungari_weight_g)
    if (!isNaN(val) && val > 0) return val
  }
  return getGlobalSettings().defaultBungariGrams
}

// ── Tar Rate Configuration ────────────────────────────────────────────────────
// Single rate per Tar (cord count). S/Z is just a twist type label, not a rate factor.

export const STORAGE_KEY_TAR_RATES = 'kasab_tar_rates_config'

export interface TarRateConfig {
  tar: number    // Cord count, e.g. 4, 8, 9, 10, 12, 14, 18
  rate: number   // ₹/kg (same for both S and Z twist)
}

export const DEFAULT_TAR_RATES: TarRateConfig[] = [
  { tar: 4,  rate: 16 },
  { tar: 6,  rate: 18 },
  { tar: 7,  rate: 19 },
  { tar: 8,  rate: 20 },
  { tar: 9,  rate: 20 },
  { tar: 10, rate: 20 },
  { tar: 11, rate: 22 },
  { tar: 12, rate: 24 },
  { tar: 13, rate: 26 },
  { tar: 14, rate: 28 },
  { tar: 15, rate: 30 },
  { tar: 16, rate: 32 },
  { tar: 18, rate: 34 },
  { tar: 20, rate: 36 },
]

export function getTarRates(): TarRateConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TAR_RATES)
    if (saved) {
      const parsed = JSON.parse(saved) as TarRateConfig[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migrate old format { tar, sRate, zRate } → { tar, rate } if needed
        return parsed.map((r) => {
          if ('rate' in r) return r as TarRateConfig
          const legacy = r as unknown as { tar: number; sRate?: number; zRate?: number }
          return { tar: legacy.tar, rate: legacy.sRate ?? legacy.zRate ?? 20 }
        })
      }
    }
  } catch (err) {
    console.warn('Could not read tar rates from localStorage:', err)
  }
  return DEFAULT_TAR_RATES
}

export function saveTarRates(rates: TarRateConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TAR_RATES, JSON.stringify(rates))
  } catch (err) {
    console.warn('Could not save tar rates to localStorage:', err)
  }
}

/** Resolve ₹/kg rate for a given Tar (cord count). Twist type is ignored — same rate for S & Z. */
export function getTarRate(tar: number | string): number {
  const tarNum = typeof tar === 'string' ? parseInt(tar, 10) : tar
  const rates = getTarRates()
  const found = rates.find((r) => r.tar === tarNum)
  return found ? Number(found.rate) || 0 : 0
}
