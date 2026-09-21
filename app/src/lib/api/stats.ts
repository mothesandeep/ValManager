import type { Party, PartyStats } from '../../features/parties/types'
import type { Receipt } from '../../features/receiving/types'
import type { Dispatch } from '../../features/dispatch/types'
import type { Payment } from '../../features/payments/types'

// ── Derived stats & aggregate helper ──────────────────────────────────────────

export function computePartyStats(
  parties: Party[],
  receipts: Receipt[], // Keeping parameter to not break function signature immediately, though unused
  dispatches: Dispatch[],
  payments: Payment[]
): Record<string, PartyStats> {
  const stats: Record<string, PartyStats> = {}

  for (const p of parties) {
    const rolaReceived = receipts
      .filter((r) => r.party_id === p.id)
      .reduce((sum, r) => sum + (Number(r.rola_count) || 0), 0)

    const partyDispatches = dispatches.filter((d) => d.party_id === p.id)

    const rolaReturned = partyDispatches
      .reduce((sum, d) => sum + (Number(d.rola_count) || 0), 0)

    const partyReceipts = receipts.filter((r) => r.party_id === p.id)
    const totalReceivedWeight = partyReceipts.reduce(
      (sum, r) => sum + (Number(r.net_weight) || 0),
      0
    )

    const totalDispatchWeight = partyDispatches.reduce(
      (sum, d) => sum + (Number(d.net_val_weight) || 0),
      0
    )
    const totalDispatchValue = partyDispatches.reduce(
      (sum, d) => sum + (Number(d.amount) || 0),
      0
    )

    const partyPayments = payments.filter((py) => py.party_id === p.id)
    const received = partyPayments.reduce(
      (sum, py) => sum + (Number(py.amount) || 0),
      0
    )

    const unprocessedKasabWeight = Math.max(
      0,
      totalReceivedWeight - totalDispatchWeight
    )

    stats[p.id] = {
      rolaPending: rolaReceived - rolaReturned,
      receivable: totalDispatchValue,
      received,
      balance: totalDispatchValue - received,
      totalReceivedWeight,
      unprocessedKasabWeight,
      totalDispatchWeight,
      totalDispatchValue,
    }
  }

  return stats
}
