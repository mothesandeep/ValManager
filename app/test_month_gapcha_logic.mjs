import assert from 'node:assert'

console.log('=== Testing Automatic Month-Wise Gapcha Calculations ===\n')

function round3(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000
}

function fmtKg(n) {
  if (n === null || n === undefined) return '—'
  return `${round3(n).toFixed(3)} kg`
}

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  const val = Number(n) || 0
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function currentMonthStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function formatMonthYear(monthStr) {
  if (!monthStr || monthStr === 'all') return 'All Time'
  const [y, m] = monthStr.split('-').map(Number)
  if (!y || !m) return monthStr
  const dt = new Date(y, m - 1, 1)
  return dt.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function shiftMonth(monthStr, offsetMonths) {
  if (!monthStr || monthStr === 'all') {
    monthStr = currentMonthStr()
  }
  const [y, m] = monthStr.split('-').map(Number)
  const dt = new Date(y, m - 1 + offsetMonths, 1)
  const newY = dt.getFullYear()
  const newM = String(dt.getMonth() + 1).padStart(2, '0')
  return `${newY}-${newM}`
}

function computeMonthGapchaStats(
  receipts,
  dispatches,
  sales,
  reconciliations = [],
  selectedMonth = null
) {
  const filterByMonth = (items) => {
    if (!selectedMonth || selectedMonth === 'all') return items
    return items.filter((item) => item.date && item.date.startsWith(selectedMonth))
  }

  const mReceipts = filterByMonth(receipts)
  const mDispatches = filterByMonth(dispatches)
  const mSales = filterByMonth(sales)
  const mRecons = filterByMonth(reconciliations)

  const totalReceivedNetWeight = mReceipts.reduce(
    (sum, r) => sum + (Number(r.net_weight) || 0),
    0
  )

  const totalReturnedNetWeight = mDispatches.reduce((sum, d) => {
    const isKali = d.dispatch_type === 'Kali'
    const wt = isKali
      ? Number(d.bore_gross_weight) || 0
      : Number(d.net_val_weight) || 0
    return sum + wt
  }, 0)

  // Outstanding / in-process stock remaining in workshop
  const unprocessedKasabWeight = Math.max(
    0,
    totalReceivedNetWeight - totalReturnedNetWeight
  )

  const totalGapchaGenerated = mRecons.reduce(
    (sum, rc) => sum + (Number(rc.gapcha_weight) || 0),
    0
  )

  const totalGapchaSold = mSales.reduce(
    (sum, s) => sum + (Number(s.weight_kg) || 0),
    0
  )

  const remainingGapchaWeight = Math.max(
    0,
    totalGapchaGenerated - totalGapchaSold
  )

  const totalGapchaRevenue = mSales.reduce(
    (sum, s) => sum + (Number(s.amount) || 0),
    0
  )

  return {
    totalReceivedNetWeight: round3(totalReceivedNetWeight),
    totalReturnedNetWeight: round3(totalReturnedNetWeight),
    unprocessedKasabWeight: round3(unprocessedKasabWeight),
    totalGapchaGenerated: round3(totalGapchaGenerated),
    totalGapchaSold: round3(totalGapchaSold),
    remainingGapchaWeight: round3(remainingGapchaWeight),
    totalGapchaRevenue: Math.round(totalGapchaRevenue * 100) / 100,
  }
}

// ── Test 1: Month Shift and Formatting ─────────────────────────────────────────
console.log('[Test 1] Month Navigation Helpers:')
assert.strictEqual(formatMonthYear('2026-09'), 'September 2026')
assert.strictEqual(shiftMonth('2026-09', -1), '2026-08')
assert.strictEqual(shiftMonth('2026-09', 1), '2026-10')
assert.strictEqual(shiftMonth('2026-01', -1), '2025-12')
assert.strictEqual(formatMonthYear('all'), 'All Time')
console.log('✓ Month helpers working correctly.')

// ── Test 2: Real September 2026 Data for Prakash ──────────────────────────────
console.log('\n[Test 2] September 2026 Auto Calculation for Prakash:')
const sampleReceipts = [
  { id: '1', party_id: 'p-1', date: '2026-09-08', net_weight: 18.500 },
  { id: '2', party_id: 'p-1', date: '2026-09-08', net_weight: 20.424 },
  { id: '3', party_id: 'p-1', date: '2026-09-08', net_weight: 13.053 },
  { id: '4', party_id: 'p-1', date: '2026-09-08', net_weight: 25.240 },
  { id: '5', party_id: 'p-1', date: '2026-09-08', net_weight: 28.252 },
  { id: '6', party_id: 'p-1', date: '2026-09-08', net_weight: 24.245 },
  { id: '7', party_id: 'p-1', date: '2026-09-08', net_weight: 11.814 },
  { id: '8', party_id: 'p-1', date: '2026-09-08', net_weight: 7.739 },
  // August receipt (should be excluded when Sep 2026 selected)
  { id: '9', party_id: 'p-1', date: '2026-08-15', net_weight: 50.000 },
]

const sampleDispatches = [
  { id: 'd1', party_id: 'p-1', date: '2026-09-08', dispatch_type: 'Val', net_val_weight: 27.130 },
  { id: 'd2', party_id: 'p-1', date: '2026-09-08', dispatch_type: 'Kali', bore_gross_weight: 15.000 },
  // August dispatch
  { id: 'd3', party_id: 'p-1', date: '2026-08-20', dispatch_type: 'Val', net_val_weight: 40.000 },
]

const sepStats = computeMonthGapchaStats(sampleReceipts, sampleDispatches, [], [], '2026-09')
assert.strictEqual(sepStats.totalReceivedNetWeight, 149.267)
assert.strictEqual(sepStats.totalReturnedNetWeight, 42.130)
assert.strictEqual(sepStats.unprocessedKasabWeight, 107.137)
assert.strictEqual(sepStats.totalGapchaGenerated, 0)
assert.strictEqual(sepStats.totalGapchaSold, 0)
assert.strictEqual(sepStats.remainingGapchaWeight, 0)

console.log(`✓ Received:       ${fmtKg(sepStats.totalReceivedNetWeight)} (149.267 kg)`)
console.log(`✓ Returned:       ${fmtKg(sepStats.totalReturnedNetWeight)} (42.130 kg)`)
console.log(`✓ Outstanding:    ${fmtKg(sepStats.unprocessedKasabWeight)} (107.137 kg - correctly NOT Gapcha)`)

// ── Test 3: Adding Gapcha Surplus and Gapcha Sale ─────────────────────────────
console.log('\n[Test 3] Adding Legitimate Surplus & Recording Sale:')
const sampleSurplus = [
  { id: 'surplus-1', party_id: 'p-1', date: '2026-09-09', gapcha_weight: 2.500 },
]

const sampleSales = [
  { id: 's-1', party_id: 'p-1', buyer_name: 'Ramesh Bhai', date: '2026-09-09', weight_kg: 1.500, rate_per_kg: 250, amount: 375 },
]

const statsWithSurplus = computeMonthGapchaStats(
  sampleReceipts,
  sampleDispatches,
  sampleSales,
  sampleSurplus,
  '2026-09'
)

assert.strictEqual(statsWithSurplus.totalGapchaGenerated, 2.500)
assert.strictEqual(statsWithSurplus.totalGapchaSold, 1.500)
assert.strictEqual(statsWithSurplus.remainingGapchaWeight, 1.000)
assert.strictEqual(statsWithSurplus.totalGapchaRevenue, 375)

console.log(`✓ Gapcha Created:   ${fmtKg(statsWithSurplus.totalGapchaGenerated)}`)
console.log(`✓ Gapcha Sold:      ${fmtKg(statsWithSurplus.totalGapchaSold)}`)
console.log(`✓ Available Gapcha: ${fmtKg(statsWithSurplus.remainingGapchaWeight)}`)
console.log(`✓ Revenue:          ${fmtMoney(statsWithSurplus.totalGapchaRevenue)}`)

// ── Test 4: All-Time View ─────────────────────────────────────────────────────
console.log('\n[Test 4] All-Time View:')
const allTimeStats = computeMonthGapchaStats(
  sampleReceipts,
  sampleDispatches,
  sampleSales,
  sampleSurplus,
  'all'
)
assert.strictEqual(allTimeStats.totalReceivedNetWeight, 199.267) // 149.267 + 50.000
assert.strictEqual(allTimeStats.totalReturnedNetWeight, 82.130)  // 42.130 + 40.000
assert.strictEqual(allTimeStats.unprocessedKasabWeight, 117.137)

console.log(`✓ All-Time Received:    ${fmtKg(allTimeStats.totalReceivedNetWeight)}`)
console.log(`✓ All-Time Returned:    ${fmtKg(allTimeStats.totalReturnedNetWeight)}`)
console.log(`✓ All-Time Outstanding: ${fmtKg(allTimeStats.unprocessedKasabWeight)}`)

console.log('\n======================================================')
console.log('ALL MONTH-WISE GAPCHA LOGIC TESTS PASSED! ✓')
console.log('======================================================')
