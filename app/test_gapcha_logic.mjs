import assert from 'node:assert'

console.log('=== Testing Batch-Reconciled Gapcha / Surplus Weight Logic ===\n')

function fmtKg(n) {
  if (n === null || n === undefined) return '—'
  const val = Number(n) || 0
  return `${val.toFixed(3)} kg`
}

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  const val = Number(n) || 0
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

// 1. Pure calculation functions mirroring lib/calculations.ts
function calcReceiptNetWeight(grossKg, rolaCount, perRolaGrams = 200) {
  const g = Number(grossKg) || 0
  const r = Number(rolaCount) || 0
  const tare = (r * (Number(perRolaGrams) || 200)) / 1000
  return Math.max(0, g - tare)
}

function calcDispatchNetWeight(boreGrossKg, bungariCount = 0, bungariWeightG = 70, dispatchType = 'Val') {
  const gross = Number(boreGrossKg) || 0
  if (dispatchType === 'Kali') {
    return gross
  }
  const bCount = Number(bungariCount) || 0
  const tare = (bCount * (Number(bungariWeightG) || 70)) / 1000
  return Math.max(0, gross - tare)
}

function calcBatchGapcha(inputKasabNet, outputValNet, outputKaliNet = 0) {
  const input = Number(inputKasabNet) || 0
  const output = (Number(outputValNet) || 0) + (Number(outputKaliNet) || 0)
  return Math.max(0, input - output)
}

function calcRemainingGapcha(gapchaGenerated, gapchaSold) {
  const gen = Number(gapchaGenerated) || 0
  const sold = Number(gapchaSold) || 0
  return Math.max(0, gen - sold)
}

function calcSaleAmount(weightKg, ratePerKg) {
  const wt = Number(weightKg) || 0
  const rate = Number(ratePerKg)
  if (isNaN(rate) || rate <= 0 || wt <= 0) return null
  return Math.round(wt * rate * 100) / 100
}

function computeOverallGapchaStats(receipts, dispatches, gapchaSales, reconciliations = []) {
  const totalReceivedNetWeight = receipts.reduce(
    (sum, r) => sum + (Number(r.net_weight) || 0),
    0
  )

  const totalReturnedNetWeight = dispatches.reduce((sum, d) => {
    const isKali = d.dispatch_type === 'Kali'
    const wt = isKali
      ? Number(d.bore_gross_weight) || 0
      : Number(d.net_val_weight) || 0
    return sum + wt
  }, 0)

  const reconciledInputWeight = reconciliations.reduce(
    (sum, rc) => sum + (Number(rc.input_kasab_weight) || 0),
    0
  )

  const reconciledOutputWeight = reconciliations.reduce(
    (sum, rc) => sum + (Number(rc.reconciled_output) || 0),
    0
  )

  const unprocessedKasabWeight = Math.max(
    0,
    totalReceivedNetWeight - reconciledInputWeight
  )

  const totalGapchaGenerated = reconciliations.reduce(
    (sum, rc) => sum + (Number(rc.gapcha_weight) || 0),
    0
  )

  const totalGapchaSold = gapchaSales.reduce(
    (sum, s) => sum + (Number(s.weight_kg) || 0),
    0
  )

  const remainingGapchaWeight = Math.max(
    0,
    totalGapchaGenerated - totalGapchaSold
  )

  const totalGapchaRevenue = gapchaSales.reduce(
    (sum, s) => sum + (Number(s.amount) || 0),
    0
  )

  const round3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000

  return {
    totalReceivedNetWeight: round3(totalReceivedNetWeight),
    unprocessedKasabWeight: round3(unprocessedKasabWeight),
    reconciledInputWeight: round3(reconciledInputWeight),
    reconciledOutputWeight: round3(reconciledOutputWeight),
    totalReturnedNetWeight: round3(totalReturnedNetWeight),
    totalGapchaGenerated: round3(totalGapchaGenerated),
    totalGapchaSold: round3(totalGapchaSold),
    remainingGapchaWeight: round3(remainingGapchaWeight),
    totalGapchaRevenue: Math.round(totalGapchaRevenue * 100) / 100,
  }
}

// ── Test 1: Prakash Real Data Scenario (Before Reconciling Batch) ──────────────
console.log('[Test 1] Prakash Real Data (149.267 kg received, 42.130 kg dispatched, 0 batches reconciled):')
const receiptsPrakash = [
  { id: '1', net_weight: 18.500 },
  { id: '2', net_weight: 20.424 },
  { id: '3', net_weight: 13.053 },
  { id: '4', net_weight: 25.240 },
  { id: '5', net_weight: 28.252 },
  { id: '6', net_weight: 24.245 },
  { id: '7', net_weight: 11.814 },
  { id: '8', net_weight: 7.739 },
]

const dispatchesPrakash = [
  { id: 'd1', dispatch_type: 'Val', net_val_weight: 27.130 },
  { id: 'd2', dispatch_type: 'Kali', bore_gross_weight: 15.000 },
]

const statsInitial = computeOverallGapchaStats(receiptsPrakash, dispatchesPrakash, [], [])
assert.strictEqual(Math.round(statsInitial.totalReceivedNetWeight * 1000) / 1000, 149.267)
assert.strictEqual(Math.round(statsInitial.totalReturnedNetWeight * 1000) / 1000, 42.130)
assert.strictEqual(statsInitial.totalGapchaGenerated, 0) // MUST BE 0! NOT 107 kg!
assert.strictEqual(Math.round(statsInitial.unprocessedKasabWeight * 1000) / 1000, 149.267)
assert.strictEqual(statsInitial.remainingGapchaWeight, 0)

console.log(`✓ Total Received:      ${fmtKg(statsInitial.totalReceivedNetWeight)}`)
console.log(`✓ Total Dispatched:    ${fmtKg(statsInitial.totalReturnedNetWeight)}`)
console.log(`✓ In Workshop (Raw):   ${fmtKg(statsInitial.unprocessedKasabWeight)}`)
console.log(`✓ Gapcha Generated:    ${fmtKg(statsInitial.totalGapchaGenerated)} (Correctly 0 kg, not false 107 kg)`)

// ── Test 2: Reconciling Batch #1 (Bags 1 & 6: 18.5 + 24.245 = 42.745 kg vs 42.130 kg dispatched) ─
console.log('\n[Test 2] Closing Batch #1 (Input = 42.745 kg vs Output = 42.130 kg):')
const batch1Input = 18.500 + 24.245 // 42.745 kg
const batch1ValOutput = 27.130
const batch1KaliOutput = 15.000
const batch1TotalOutput = batch1ValOutput + batch1KaliOutput // 42.130 kg
const batch1Gapcha = calcBatchGapcha(batch1Input, batch1ValOutput, batch1KaliOutput) // 0.615 kg

assert.strictEqual(Math.round(batch1Gapcha * 1000) / 1000, 0.615)
assert.strictEqual(fmtKg(batch1Gapcha), '0.615 kg')

const recons = [
  {
    id: 'recon-1',
    input_kasab_weight: batch1Input,
    output_val_weight: batch1ValOutput,
    output_kali_weight: batch1KaliOutput,
    reconciled_output: batch1TotalOutput,
    gapcha_weight: batch1Gapcha,
  },
]

const statsAfterBatch1 = computeOverallGapchaStats(receiptsPrakash, dispatchesPrakash, [], recons)
assert.strictEqual(Math.round(statsAfterBatch1.reconciledInputWeight * 1000) / 1000, 42.745)
assert.strictEqual(Math.round(statsAfterBatch1.reconciledOutputWeight * 1000) / 1000, 42.130)
assert.strictEqual(Math.round(statsAfterBatch1.totalGapchaGenerated * 1000) / 1000, 0.615)
assert.strictEqual(Math.round(statsAfterBatch1.unprocessedKasabWeight * 1000) / 1000, 106.522)
assert.strictEqual(Math.round(statsAfterBatch1.remainingGapchaWeight * 1000) / 1000, 0.615)

console.log(`✓ Reconciled Input:    ${fmtKg(statsAfterBatch1.reconciledInputWeight)}`)
console.log(`✓ Reconciled Output:   ${fmtKg(statsAfterBatch1.reconciledOutputWeight)}`)
console.log(`✓ Legitimate Gapcha:   ${fmtKg(statsAfterBatch1.totalGapchaGenerated)}`)
console.log(`✓ Remaining Workshop:  ${fmtKg(statsAfterBatch1.unprocessedKasabWeight)}`)
console.log(`✓ Available Stock:     ${fmtKg(statsAfterBatch1.remainingGapchaWeight)}`)

// ── Test 3: Selling the 0.615 kg Gapcha ─────────────────────────────────────────
console.log('\n[Test 3] Selling 0.615 kg Gapcha @ ₹250/kg:')
const sale = {
  weight_kg: 0.615,
  rate_per_kg: 250,
  amount: calcSaleAmount(0.615, 250),
}
assert.strictEqual(sale.amount, 153.75)
assert.strictEqual(fmtMoney(sale.amount), '₹153.75')

const statsAfterSale = computeOverallGapchaStats(receiptsPrakash, dispatchesPrakash, [sale], recons)
assert.strictEqual(statsAfterSale.totalGapchaSold, 0.615)
assert.strictEqual(statsAfterSale.remainingGapchaWeight, 0)
assert.strictEqual(statsAfterSale.totalGapchaRevenue, 153.75)

console.log(`✓ Sold Gapcha:         ${fmtKg(statsAfterSale.totalGapchaSold)}`)
console.log(`✓ Remaining Stock:     ${fmtKg(statsAfterSale.remainingGapchaWeight)}`)
console.log(`✓ Revenue Earned:      ${fmtMoney(statsAfterSale.totalGapchaRevenue)}`)

console.log('\n======================================================')
console.log('ALL BATCH RECONCILIATION GAPCHA TESTS PASSED! ✓')
console.log('======================================================')
