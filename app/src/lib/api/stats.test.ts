import { describe, it, expect } from 'vitest'
import { computePartyStats } from './stats'
import type { Party } from '@/features/parties/types'
import type { ReceiptWithParty } from '@/features/inward/types'
import type { DispatchWithParty } from '@/features/outward/types'
import type { PaymentWithParty } from '@/features/billing/types'

describe('computePartyStats cross-module integrity', () => {
  const partyA: Party = {
    id: 'party-a',
    name: 'Sardar Textiles',
    phone: '9876543210',
    address: 'Surat',
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
  }

  const partyB: Party = {
    id: 'party-b',
    name: 'Ganesh Silks',
    phone: '9876543211',
    address: 'Katargam',
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
  }

  it('calculates rola pending, receivable, received, and balance accurately across modules', () => {
    // 1. Party A receives 500 rolas (100kg net kasab)
    const receipts: ReceiptWithParty[] = [
      {
        id: 'rcpt-1',
        party_id: 'party-a',
        date: '2026-10-01',
        challan_no: 'CH-101',
        gross_weight: 120,
        tare_weight: 20,
        net_weight: 100,
        rola_count: 500,
        color: 'M.gold',
        created_at: '2026-10-01T00:00:00Z',
        party: { name: partyA.name },
      },
    ]

    // 2. Party A is dispatched:
    //    - 60kg net Val worth Rs 12,000 (rate 200/kg)
    //    - 200 returned rolas
    const dispatches: DispatchWithParty[] = [
      {
        id: 'disp-1',
        party_id: 'party-a',
        date: '2026-10-05',
        challan_no: 'CH-201',
        dispatch_type: 'Val',
        cord_count: 10,
        twist_type: 'S',
        bungari_count: 50,
        bungari_weight_g: 70,
        bore_gross_weight: 63.5,
        net_val_weight: 60,
        rate_per_kg: 200,
        amount: 12000,
        rola_count: 0,
        created_at: '2026-10-05T00:00:00Z',
        party: { name: partyA.name },
      },
      {
        id: 'disp-2',
        party_id: 'party-a',
        date: '2026-10-06',
        challan_no: 'CH-202',
        dispatch_type: 'Rola',
        cord_count: null,
        twist_type: null,
        bungari_count: 0,
        bungari_weight_g: null,
        bore_gross_weight: 10,
        net_val_weight: 0,
        rate_per_kg: null,
        amount: null,
        rola_count: 200,
        created_at: '2026-10-06T00:00:00Z',
        party: { name: partyA.name },
      },
    ]

    // 3. Party A pays Rs 8,000
    const payments: PaymentWithParty[] = [
      {
        id: 'pay-1',
        party_id: 'party-a',
        date: '2026-10-10',
        amount: 8000,
        note: 'UPI • Axis Bank',
        created_at: '2026-10-10T00:00:00Z',
        party: { name: partyA.name },
      },
    ]

    const stats = computePartyStats([partyA, partyB], receipts, dispatches, payments)

    const statsA = stats['party-a']
    expect(statsA).toBeDefined()
    // Rola pending = 500 received - 200 returned = 300
    expect(statsA.rolaPending).toBe(300)
    // Kasab net weight received = 100
    expect(statsA.totalReceivedWeight).toBe(100)
    // Val dispatched = 60kg
    expect(statsA.totalDispatchWeight).toBe(60)
    // Unprocessed kasab = 100 - 60 = 40kg
    expect(statsA.unprocessedKasabWeight).toBe(40)
    // Financials: Receivable = 12,000, Received = 8,000, Balance = 4,000
    expect(statsA.receivable).toBe(12000)
    expect(statsA.received).toBe(8000)
    expect(statsA.balance).toBe(4000)

    // Party B with no records has zeroed stats
    const statsB = stats['party-b']
    expect(statsB).toBeDefined()
    expect(statsB.rolaPending).toBe(0)
    expect(statsB.receivable).toBe(0)
    expect(statsB.received).toBe(0)
    expect(statsB.balance).toBe(0)
  })

  it('updates ledger balance when dispatches or payments are modified', () => {
    const receipts: ReceiptWithParty[] = []
    const dispatches: DispatchWithParty[] = [
      {
        id: 'disp-1',
        party_id: 'party-a',
        date: '2026-10-05',
        challan_no: 'CH-201',
        dispatch_type: 'Val',
        cord_count: 10,
        twist_type: 'S',
        bungari_count: 10,
        bungari_weight_g: 70,
        bore_gross_weight: 10.7,
        net_val_weight: 10,
        rate_per_kg: 100,
        amount: 1000,
        rola_count: 0,
        created_at: '2026-10-05T00:00:00Z',
        party: { name: partyA.name },
      },
    ]
    const payments: PaymentWithParty[] = [
      {
        id: 'pay-1',
        party_id: 'party-a',
        date: '2026-10-06',
        amount: 1000,
        note: 'Cash',
        created_at: '2026-10-06T00:00:00Z',
        party: { name: partyA.name },
      },
    ]

    // Balance is 0 initially (fully paid)
    let stats = computePartyStats([partyA], receipts, dispatches, payments)
    expect(stats['party-a'].balance).toBe(0)

    // Add extra dispatch of Rs 500
    const updatedDispatches: DispatchWithParty[] = [
      ...dispatches,
      {
        id: 'disp-2',
        party_id: 'party-a',
        date: '2026-10-07',
        challan_no: 'CH-202',
        dispatch_type: 'Val',
        cord_count: 8,
        twist_type: 'S',
        bungari_count: 5,
        bungari_weight_g: 70,
        bore_gross_weight: 5.35,
        net_val_weight: 5,
        rate_per_kg: 100,
        amount: 500,
        rola_count: 0,
        created_at: '2026-10-07T00:00:00Z',
        party: { name: partyA.name },
      },
    ]

    stats = computePartyStats([partyA], receipts, updatedDispatches, payments)
    expect(stats['party-a'].receivable).toBe(1500)
    expect(stats['party-a'].balance).toBe(500)
  })
})
