
import type { Party, PartyStats } from '../../features/parties/types'
import type { Receipt } from '../../features/receiving/types'
import type { Dispatch } from '../../features/dispatch/types'
import type { RolaReturn } from '../../features/rola/types'
import type { Payment } from '../../features/payments/types'
import type { GapchaSale, GapchaReconciliation } from '../../features/gapcha/types'


// ── Derived stats & aggregate helper ──────────────────────────────────────────

export function computePartyStats(
  parties: Party[],
  receipts: Receipt[],
  rolaReturns: RolaReturn[],
  dispatches: Dispatch[],
  payments: Payment[],
  gapchaSales: GapchaSale[] = [],
  reconciliations: GapchaReconciliation[] = []
): Record<string, PartyStats> {
  const stats: Record<string, PartyStats> = {}

  for (const p of parties) {
    const rolaReceived = receipts
      .filter((r) => r.party_id === p.id)
      .reduce((sum, r) => sum + (Number(r.rola_count) || 0), 0)

    const rolaReturned = rolaReturns
      .filter((r) => r.party_id === p.id)
      .reduce((sum, r) => sum + (Number(r.rola_count) || 0), 0)

    const partyReceipts = receipts.filter((r) => r.party_id === p.id)
    const totalReceivedWeight = partyReceipts.reduce(
      (sum, r) => sum + (Number(r.net_weight) || 0),
      0
    )

    const partyDispatches = dispatches.filter((d) => d.party_id === p.id)
    const totalDispatchWeight = partyDispatches.reduce((sum, d) => {
      const isRola = d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'
      const wt = isRola
        ? Number(d.bore_gross_weight) || 0
        : Number(d.net_val_weight) || 0
      return sum + wt
    }, 0)

    const partyReconciliations = reconciliations.filter((rc) => rc.party_id === p.id)
    const reconciledInputWeight = partyReconciliations.reduce(
      (sum, rc) => sum + (Number(rc.input_kasab_weight) || 0),
      0
    )
    const reconciledOutputWeight = partyReconciliations.reduce(
      (sum, rc) => sum + (Number(rc.reconciled_output) || 0),
      0
    )

    // Unprocessed/Outstanding material currently pending in workshop: Received - Returned
    const unprocessedKasabWeight = Math.max(
      0,
      totalReceivedWeight - totalDispatchWeight
    )

    const totalDispatchValue = partyDispatches.reduce(
      (sum, d) => sum + (Number(d.amount) || 0),
      0
    )

    const received = payments
      .filter((pay) => pay.party_id === p.id)
      .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0)

    // Gapcha is strictly computed from created/logged surplus records
    const gapchaWeight = partyReconciliations.reduce(
      (sum, rc) => sum + (Number(rc.gapcha_weight) || 0),
      0
    )

    const partyGapchaSales = gapchaSales.filter((s) => s.party_id === p.id)
    const gapchaSold = partyGapchaSales.reduce(
      (sum, s) => sum + (Number(s.weight_kg) || 0),
      0
    )

    const remainingGapcha = Math.max(0, gapchaWeight - gapchaSold)

    stats[p.id] = {
      rolaPending: rolaReceived - rolaReturned,
      receivable: totalDispatchValue,
      received,
      balance: totalDispatchValue - received,
      totalReceivedWeight,
      unprocessedKasabWeight,
      reconciledInputWeight,
      reconciledOutputWeight,
      totalDispatchWeight,
      totalDispatchValue,
      gapchaWeight,
      gapchaSold,
      remainingGapcha,
    }
  }

  return stats
}

