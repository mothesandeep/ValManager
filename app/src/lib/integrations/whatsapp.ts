import type { Party, PartyStats } from '../../features/parties/types'
import type { DispatchWithParty } from '../../features/dispatch/types'
import type { ReceiptWithParty } from '../../features/receiving/types'

/**
 * Format a date string (YYYY-MM-DD) to "10 September 2026"
 */
export function fmtDateLong(d?: string | null): string {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Clean phone number: remove non-digits, format with India code 91 if 10 digits
 */
export function formatWhatsAppPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const digits = phone.replace(/[^0-9]/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  return digits
}

/**
 * Open WhatsApp with pre-filled text (and phone number if available)
 */
export function openWhatsApp(text: string, phone?: string | null) {
  const cleanPhone = formatWhatsAppPhone(phone)
  const encodedText = encodeURIComponent(text)
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`
  window.open(url, '_blank')
}

/**
 * Helper to get polite party salutation ("Harish Sheladiya ji")
 */
function getPartySalutation(name?: string | null): string {
  if (!name || !name.trim()) return 'Party ji'
  const clean = name.trim()
  if (/(\bji\b|\bJi\b)$/i.test(clean)) return clean
  return `${clean} ji`
}

/**
 * Share a Val Dispatch Delivery Slip in local textile hisab format
 */
export function shareDispatchSlip(d: DispatchWithParty, party?: Party | null) {
  const partyName = d.party?.name || party?.name || 'Customer'
  const salutation = getPartySalutation(partyName)
  const isKali = d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola'
  const dateStr = fmtDateLong(d.date)

  let text = ''

  if (isKali) {
    const gross = Number(d.bore_gross_weight) || 0
    const rolaCount = Number(d.rola_count) || 0

    text = `*${salutation}*\n\n` +
      `📅 ${dateStr}\n` +
      (d.challan_no ? `📄 Challan: #${d.challan_no}\n` : '') +
      `\n*ROLA / KALI DISPATCH*\n\n` +
      `Total Weight: ${gross.toFixed(3)} kg\n` +
      (rolaCount > 0 ? `Rola Count: ${rolaCount} pcs\n` : '') +
      `\n_Sent via ValManager_`
  } else {
    const gross = Number(d.bore_gross_weight) || 0
    const bungariCount = Number(d.bungari_count) || 0
    const bungariWeightG = Number(d.bungari_weight_g) || Number(party?.default_bungari_weight_g) || 70
    const tareKg = (bungariCount * bungariWeightG) / 1000
    const netVal = d.net_val_weight !== null && d.net_val_weight !== undefined
      ? Number(d.net_val_weight)
      : Math.max(0, gross - tareKg)
    const rate = Number(d.rate_per_kg) || 0
    const amount = d.amount !== null && d.amount !== undefined
      ? Number(d.amount)
      : Math.round(netVal * rate)
    const rolaCount = Number(d.rola_count) || 0

    text = `*${salutation}*\n\n` +
      `📅 ${dateStr}\n` +
      (d.challan_no ? `📄 Challan: #${d.challan_no}\n` : '') +
      `\n*VAL HISAB*\n\n` +
      (d.cord_count ? `Type: ${d.cord_count} Tar${d.twist_type ? ` (${d.twist_type})` : ''}\n` : '') +
      `Total Val: ${gross.toFixed(3)} kg\n\n` +
      `Bungari: ${bungariCount} × ${bungariWeightG}g = ${tareKg.toFixed(3)} kg\n\n` +
      `Net Val:\n` +
      `${gross.toFixed(3)} − ${tareKg.toFixed(3)}\n` +
      `= *${netVal.toFixed(3)} kg*\n\n` +
      `Rate: ₹${rate}/kg\n\n` +
      `Amount:\n` +
      `${netVal.toFixed(3)} × ₹${rate}\n` +
      `= *₹${amount.toLocaleString('en-IN')}*\n`

    if (rolaCount > 0) {
      text += `\n*ROLA*\n\n` +
        `Rola Count: ${rolaCount} pcs\n`
    }

    text += `\n*TOTAL AMOUNT: ₹${amount.toLocaleString('en-IN')}*\n\n` +
      `_Sent via ValManager_`
  }

  openWhatsApp(text, party?.phone)
}

/**
 * Share a Kasab Raw Material Receiving Slip in local textile hisab format
 */
export function shareReceiptSlip(r: ReceiptWithParty, party?: Party | null) {
  const partyName = r.party?.name || party?.name || 'Customer'
  const salutation = getPartySalutation(partyName)
  const dateStr = fmtDateLong(r.date)

  const gross = Number(r.gross_weight) || 0
  const rolaCount = Number(r.rola_count) || 0
  const tare = Number(r.tare_weight) || 0
  const totalTareG = Math.round(tare * 1000)
  const rolaTareGWithBori = totalTareG - 100
  let rolaWeightG = party?.default_rola_weight_g || 205
  let rolaTareKg = 0
  let boriTareKg = 0.100

  if (rolaCount > 0) {
    if (
      rolaTareGWithBori > 0 &&
      Math.abs(Math.round(rolaTareGWithBori / rolaCount) * rolaCount - rolaTareGWithBori) <= 2
    ) {
      rolaWeightG = Math.round(rolaTareGWithBori / rolaCount)
      rolaTareKg = rolaTareGWithBori / 1000
    } else if (
      Math.abs(Math.round(totalTareG / rolaCount) * rolaCount - totalTareG) <= 2
    ) {
      rolaWeightG = Math.round(totalTareG / rolaCount)
      rolaTareKg = totalTareG / 1000
      boriTareKg = 0
    } else {
      rolaWeightG = Math.max(0, Math.round(rolaTareGWithBori / rolaCount))
      rolaTareKg = (rolaWeightG * rolaCount) / 1000
    }
  }

  const netKasab = Number(r.net_weight) || Math.max(0, gross - tare)
  const isBig = rolaWeightG >= 240

  const text = `*${salutation}*\n\n` +
    `📅 ${dateStr}\n` +
    (r.challan_no ? `📄 Challan: #${r.challan_no}\n` : '') +
    (r.color ? `🎨 Color: ${r.color}\n` : '') +
    `\n*KASAB RECEIVING HISAB*\n\n` +
    `Total Kasab: ${gross.toFixed(3)} kg\n\n` +
    `Rola Tare: ${rolaCount} × ${rolaWeightG}g${isBig ? ' (Big Rola)' : ''} = ${rolaTareKg.toFixed(3)} kg\n` +
    (boriTareKg > 0 ? `Bori Tare: 1 × 100g = ${boriTareKg.toFixed(3)} kg\n` : '') +
    `Total Tare: -${tare.toFixed(3)} kg\n\n` +
    `Net Kasab:\n` +
    `${gross.toFixed(3)} − ${tare.toFixed(3)}\n` +
    `= *${netKasab.toFixed(3)} kg*\n\n` +
    `*ROLA*\n\n` +
    `Rola Received: ${rolaCount} pcs${isBig ? ' (Big Rola)' : ''}\n\n` +
    `_Sent via ValManager_`

  openWhatsApp(text, party?.phone)
}

/**
 * Share a complete Delivery Challan Receipt Slip with all bags breakdown
 */
export function shareChallanReceiptSlip(
  entries: ReceiptWithParty[],
  party?: Party | null,
  challanNo?: string | null
) {
  if (!entries || entries.length === 0) return
  const first = entries[0]
  const partyName = first.party?.name || party?.name || 'Customer'
  const salutation = getPartySalutation(partyName)
  const dateStr = fmtDateLong(first.date)
  const chNum = challanNo || first.challan_no

  const totalGross = entries.reduce((s, e) => s + (Number(e.gross_weight) || 0), 0)
  const totalTare = entries.reduce((s, e) => s + (Number(e.tare_weight) || 0), 0)
  const totalNet = entries.reduce((s, e) => s + (Number(e.net_weight) || 0), 0)
  const totalRola = entries.reduce((s, e) => s + (Number(e.rola_count) || 0), 0)
  const totalBoriKg = entries.length * 0.100

  let bagLines = ''
  entries.forEach((e, idx) => {
    const g = Number(e.gross_weight) || 0
    const r = Number(e.rola_count) || 0
    const col = e.color ? ` - ${e.color}` : ''
    bagLines += `${idx + 1}. ${g.toFixed(3)} kg (${r} pcs${col})\n`
  })

  const text = `*${salutation}*\n\n` +
    `📅 ${dateStr}\n` +
    (chNum ? `📄 Challan: #${chNum}\n` : '') +
    `\n*KASAB DELIVERY CHALLAN HISAB*\n` +
    `--------------------------------\n` +
    `${bagLines}` +
    `--------------------------------\n` +
    `📦 Total Bags: ${entries.length} (${totalBoriKg.toFixed(3)} kg bori tare)\n` +
    `⚖️ Total Gross: ${totalGross.toFixed(3)} kg\n` +
    `🔄 Total Tare: -${totalTare.toFixed(3)} kg (${totalRola} rolas + ${entries.length} bori)\n` +
    `✨ *TOTAL NET KASAB: ${totalNet.toFixed(3)} kg*\n\n` +
    `_Sent via ValManager_`

  openWhatsApp(text, party?.phone)
}

/**
 * Share Party Khata / Hisaab Summary in clean local language format
 */
export function sharePartyKhata(party: Party, stats: PartyStats) {
  const salutation = getPartySalutation(party.name)
  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const text = `*${salutation}*\n\n` +
    `📅 ${todayStr}\n\n` +
    `*KHATA STATEMENT (HISAB)*\n` +
    `--------------------------------\n` +
    `📥 Kasab Aaya: ${stats.totalReceivedWeight.toFixed(3)} kg\n` +
    `📤 Val Bheja: ${stats.totalDispatchWeight.toFixed(3)} kg\n` +
    `🏭 Workshop Me Kasab: ${stats.unprocessedKasabWeight.toFixed(3)} kg\n` +
    `--------------------------------\n` +
    `💵 Total Bill: ₹${stats.receivable.toLocaleString('en-IN')}\n` +
    `💳 Jama (Received): ₹${stats.received.toLocaleString('en-IN')}\n` +
    `🔴 *BAAKI RAKAM: ₹${stats.balance.toLocaleString('en-IN')}*\n` +
    `🔄 *ROLA BAAKI: ${stats.rolaPending} pcs*\n` +
    `--------------------------------\n\n` +
    `_Sent via ValManager_`

  openWhatsApp(text, party.phone)
}

