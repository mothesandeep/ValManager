import type { Party } from './types'

/**
 * Normalizes a name string by trimming, lowercasing, and collapsing whitespace.
 */
export function normalizePartyString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Strips common Indian/Gujarati honorifics like "bhai", "seth", "ji", "kumar"
 * for lenient fuzzy matching between spoken and formal business names.
 */
export function stripHonorifics(str: string): string {
  return normalizePartyString(str)
    .replace(/(?:bhai|kumar|babu|seth|ji|kaka|mama)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Computes up to 2 uppercase initials from a party or person's name.
 */
export function getPartyInitials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/**
 * Extract clean, unique aliases for a party.
 * Reads both party.aliases (string array or comma-delimited string)
 * and checks party.notes for embedded alias declarations (e.g., "Aliases: Vijay Bhai, Vijay").
 */
export function getPartyAliases(party: Party | { aliases?: unknown; notes?: string | null }): string[] {
  const result: string[] = []

  const addAlias = (item: unknown) => {
    if (typeof item === 'string') {
      const clean = item.trim()
      if (clean && !result.some((existing) => existing.toLowerCase() === clean.toLowerCase())) {
        result.push(clean)
      }
    }
  }

  // 1. Array aliases from DB column
  if (Array.isArray(party.aliases)) {
    for (const a of party.aliases) {
      addAlias(a)
    }
  } else if (typeof party.aliases === 'string' && party.aliases.trim()) {
    // In case stored as comma-separated string
    const parts = party.aliases.split(/[,|]/)
    for (const part of parts) addAlias(part)
  }

  // 2. Parse from party.notes if present (e.g., "Aliases: Vijay Bhai, Vijay")
  if (party.notes) {
    const match = party.notes.match(/(?:aliases|alias)\s*:\s*([^;\n]+)/i)
    if (match && match[1]) {
      const parts = match[1].split(/[,|/]/)
      for (const p of parts) {
        addAlias(p)
      }
    }
  }

  return result
}

/**
 * Resolves a raw scanned or typed name to an existing party by checking:
 * 1. Exact name match
 * 2. Exact alias match
 * 3. Normalized / stripped honorific match (e.g. "Vijay Bhai" -> "Vijay")
 * 4. Substring name or alias match
 */
export function resolvePartyMatch(
  parties: Party[],
  rawSearch: string | null | undefined
): Party | null {
  if (!rawSearch || !parties || parties.length === 0) return null

  const target = rawSearch.trim()
  if (!target) return null

  const normTarget = normalizePartyString(target)
  const strippedTarget = stripHonorifics(target)

  // 1. Exact name match (case-insensitive)
  const exactName = parties.find(
    (p) => p.name.trim().toLowerCase() === target.toLowerCase()
  )
  if (exactName) return exactName

  // 2. Exact alias match
  for (const party of parties) {
    const aliases = getPartyAliases(party)
    if (aliases.some((a) => a.trim().toLowerCase() === target.toLowerCase())) {
      return party
    }
  }

  // 3. Normalized name match
  const normName = parties.find(
    (p) => normalizePartyString(p.name) === normTarget
  )
  if (normName) return normName

  // 4. Normalized alias match
  for (const party of parties) {
    const aliases = getPartyAliases(party)
    if (aliases.some((a) => normalizePartyString(a) === normTarget)) {
      return party
    }
  }

  // 5. Stripped honorifics match on name or aliases (e.g. "Vijay Bhai" matches "Vijay Navadiya" or "Vijay")
  if (strippedTarget && strippedTarget.length >= 3) {
    for (const party of parties) {
      const partyStripped = stripHonorifics(party.name)
      if (partyStripped === strippedTarget) return party

      const aliases = getPartyAliases(party)
      for (const a of aliases) {
        if (stripHonorifics(a) === strippedTarget) return party
      }
    }
  }

  // 6. Substring match on name
  const subName = parties.find((p) => {
    const pNorm = normalizePartyString(p.name)
    return pNorm.includes(normTarget) || normTarget.includes(pNorm)
  })
  if (subName) return subName

  // 7. Substring match on aliases
  for (const party of parties) {
    const aliases = getPartyAliases(party)
    for (const a of aliases) {
      const aNorm = normalizePartyString(a)
      if (aNorm.includes(normTarget) || normTarget.includes(aNorm)) {
        return party
      }
    }
  }

  return null
}

export interface DeletePartyCheckResult {
  canDelete: boolean
  reason?: string
  hasReceipts: boolean
  hasDispatches: boolean
  hasPayments: boolean
}

/**
 * Validates whether a party can be safely deleted.
 * Prevents orphan records by verifying the party has zero associated receipts, dispatches, or payments.
 */
export function checkCanDeleteParty(
  partyId: string,
  receipts: Array<{ party_id?: string | null }>,
  dispatches: Array<{ party_id?: string | null }>,
  payments: Array<{ party_id?: string | null }>,
  partyName?: string
): DeletePartyCheckResult {
  const hasReceipts = receipts.some((r) => r.party_id === partyId)
  const hasDispatches = dispatches.some((d) => d.party_id === partyId)
  const hasPayments = payments.some((p) => p.party_id === partyId)

  if (hasReceipts || hasDispatches || hasPayments) {
    const activeItems: string[] = []
    if (hasReceipts) activeItems.push('inward receipts')
    if (hasDispatches) activeItems.push('outward dispatches')
    if (hasPayments) activeItems.push('payments')
    const name = partyName || 'Party'
    return {
      canDelete: false,
      reason: `Cannot delete "${name}" because they have existing ${activeItems.join(', ')}. Please delete or reassign them first.`,
      hasReceipts,
      hasDispatches,
      hasPayments,
    }
  }

  return {
    canDelete: true,
    hasReceipts: false,
    hasDispatches: false,
    hasPayments: false,
  }
}

/**
 * Checks if a party name is already registered by another party.
 */
export function checkDuplicatePartyName(
  name: string,
  parties: Array<{ id: string; name: string }>,
  currentId?: string | null
): boolean {
  const clean = name.trim().toLowerCase()
  if (!clean) return false
  return parties.some((p) => p.id !== currentId && p.name.trim().toLowerCase() === clean)
}

