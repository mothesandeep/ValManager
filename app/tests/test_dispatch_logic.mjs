import assert from 'node:assert'

console.log('--- Testing Dispatch Multi-Bag Workflow (Val & Kali) ---')

function fmtKg(n) {
  if (n === null || n === undefined) return '—'
  const val = Number(n) || 0
  return `${val.toFixed(3)} kg`
}

function fmtMoney(n) {
  if (n === null || n === undefined) return '—'
  const val = Number(n) || 0
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function sanitizeNumberString(str) {
  const clean = str.replace(/[^0-9]/g, '')
  if (!clean) return ''
  return String(parseInt(clean, 10))
}

function validateBag(bag, dispatchType, rateStr) {
  let grossError = null
  let bungariError = null
  let rolaError = null
  let tareError = null

  // 1. Gross Weight
  if (!bag.grossGrams || !bag.grossGrams.trim()) {
    grossError = 'Gross weight is required'
  } else {
    const g = parseInt(bag.grossGrams, 10)
    if (isNaN(g) || g <= 0) {
      grossError = 'Gross weight must be greater than 0'
    }
  }

  const grossG = parseInt(bag.grossGrams, 10) || 0

  if (dispatchType === 'Val') {
    // 2. Bungari Count
    if (!bag.bungariCount || !bag.bungariCount.trim()) {
      bungariError = 'Bungari count is required'
    } else {
      const b = parseInt(bag.bungariCount, 10)
      if (isNaN(b) || b < 0) {
        bungariError = 'Bungari count cannot be negative'
      }
    }

    const bCount = parseInt(bag.bungariCount?.trim() || '0', 10)
    const bungariCnt = isNaN(bCount) ? 0 : bCount
    const bungariWtG = parseInt(bag.bungariWeightGrams?.trim() || '70', 10) || 70
    const bungariTareG = bungariCnt * bungariWtG
    const netValG = Math.max(0, grossG - bungariTareG)

    if (!grossError && !bungariError && grossG > 0) {
      if (bungariTareG >= grossG) {
        tareError = 'Bungari weight cannot exceed gross weight'
      }
    }

    const rate = parseFloat(rateStr)
    const amount =
      !isNaN(rate) && rate > 0
        ? Math.round((netValG / 1000) * rate * 100) / 100
        : null

    const isValid =
      !grossError &&
      !bungariError &&
      !tareError &&
      !isNaN(rate) &&
      rate > 0

    return {
      grossError,
      bungariError,
      bungariWeightError: null,
      rolaError: null,
      tareError,
      isValid,
      grossG,
      bungariCount: bungariCnt,
      bungariWeightG: bungariWtG,
      bungariTareG,
      netValG,
      amount,
      rolaCount: 0,
    }
  } else {
    // Kali
    if (!bag.rolaCount || !bag.rolaCount.trim()) {
      rolaError = 'Rola count is required'
    } else {
      const r = parseInt(bag.rolaCount, 10)
      if (isNaN(r) || r < 0) {
        rolaError = 'Rola count cannot be negative'
      }
    }

    const rCount = parseInt(bag.rolaCount?.trim() || '0', 10)
    const rolaCnt = isNaN(rCount) ? 0 : rCount
    const isValid = !grossError && !rolaError

    return {
      grossError,
      bungariError: null,
      bungariWeightError: null,
      rolaError,
      tareError: null,
      isValid,
      grossG,
      bungariCount: 0,
      bungariWeightG: 0,
      bungariTareG: 0,
      netValG: grossG,
      amount: null,
      rolaCount: rolaCnt,
    }
  }
}

// ── Test 1: Single Val Bag (18500g, 12 bungari @ ₹20/kg) ─────────────────
console.log('\n[Test 1] Single Val Bag (18500g, 12 bungari, 70g/pc, Rate ₹20)');
const vb1 = validateBag({ grossGrams: '18500', bungariCount: '12', bungariWeightGrams: '70' }, 'Val', '20');
assert.strictEqual(vb1.bungariTareG, 840);
assert.strictEqual(vb1.netValG, 17660);
assert.strictEqual(fmtKg(vb1.netValG / 1000), '17.660 kg');
assert.strictEqual(vb1.amount, 353.20);
assert.strictEqual(fmtMoney(vb1.amount), '₹353.20');
assert.strictEqual(vb1.isValid, true);
console.log('✓ Val Bag 1 verified: Tare = 840g, Net Val = 17.660 kg, Amount = ₹353.20');

// ── Test 2: Val Bag 2 (28250g, 16 bungari @ ₹25/kg) ──────────────────────
console.log('\n[Test 2] Val Bag 2 (28250g, 16 bungari, 70g/pc, Rate ₹25)');
const vb2 = validateBag({ grossGrams: '28250', bungariCount: '16', bungariWeightGrams: '70' }, 'Val', '25');
assert.strictEqual(vb2.bungariTareG, 1120);
assert.strictEqual(vb2.netValG, 27130);
assert.strictEqual(fmtKg(vb2.netValG / 1000), '27.130 kg');
assert.strictEqual(vb2.amount, 678.25);
assert.strictEqual(fmtMoney(vb2.amount), '₹678.25');
assert.strictEqual(vb2.isValid, true);
console.log('✓ Val Bag 2 verified: Tare = 1120g, Net Val = 27.130 kg, Amount = ₹678.25');

// ── Test 3: Multiple Val Bags Batch (Example from User Prompt) ─────────────
console.log('\n[Test 3] Val Batch of 3 Bags (Rate ₹20/kg):');
const valBags = [
  { grossGrams: '18500', bungariCount: '12', bungariWeightGrams: '70' },
  { grossGrams: '22000', bungariCount: '15', bungariWeightGrams: '70' },
  { grossGrams: '19500', bungariCount: '10', bungariWeightGrams: '70' },
];

const valResults = valBags.map(b => validateBag(b, 'Val', '20'));
assert.strictEqual(valResults[0].netValG, 17660); // 18500 - 840
assert.strictEqual(valResults[1].bungariTareG, 1050); // 15 * 70
assert.strictEqual(valResults[1].netValG, 20950); // 22000 - 1050
assert.strictEqual(valResults[2].bungariTareG, 700);  // 10 * 70
assert.strictEqual(valResults[2].netValG, 18800); // 19500 - 700

const valSummary = valResults.reduce(
  (acc, b) => ({
    totalBags: acc.totalBags + 1,
    totalGrossG: acc.totalGrossG + b.grossG,
    totalBungari: acc.totalBungari + b.bungariCount,
    totalBungariTareG: acc.totalBungariTareG + b.bungariTareG,
    totalNetValG: acc.totalNetValG + b.netValG,
    totalAmount: Math.round((acc.totalAmount + b.amount) * 100) / 100,
  }),
  { totalBags: 0, totalGrossG: 0, totalBungari: 0, totalBungariTareG: 0, totalNetValG: 0, totalAmount: 0 }
);

assert.strictEqual(valSummary.totalBags, 3);
assert.strictEqual(fmtKg(valSummary.totalGrossG / 1000), '60.000 kg');
assert.strictEqual(valSummary.totalBungari, 37);
assert.strictEqual(fmtKg(valSummary.totalBungariTareG / 1000), '2.590 kg');
assert.strictEqual(fmtKg(valSummary.totalNetValG / 1000), '57.410 kg');
assert.strictEqual(valSummary.totalAmount, 1148.20);
assert.strictEqual(fmtMoney(valSummary.totalAmount), '₹1,148.20');
console.log('✓ Val Batch Summary matched prompt exactly:');
console.log(`  Total Bags:          ${valSummary.totalBags}`);
console.log(`  Total Bore Gross:    ${fmtKg(valSummary.totalGrossG / 1000)}`);
console.log(`  Total Bungari:       ${valSummary.totalBungari} pcs`);
console.log(`  Total Bungari Tare:  ${fmtKg(valSummary.totalBungariTareG / 1000)}`);
console.log(`  Total Net Val:       ${fmtKg(valSummary.totalNetValG / 1000)}`);
console.log(`  Total Amount:        ${fmtMoney(valSummary.totalAmount)}`);

// ── Test 4: Kali Batch ───────────────────────────────────────────────────
console.log('\n[Test 4] Kali Batch:');
const kaliBags = [
  { grossGrams: '15000', rolaCount: '50' },
  { grossGrams: '20000', rolaCount: '70' },
];

const kaliResults = kaliBags.map(b => validateBag(b, 'Kali', ''));
assert.strictEqual(kaliResults[0].bungariCount, 0);
assert.strictEqual(kaliResults[0].bungariTareG, 0);
assert.strictEqual(kaliResults[0].amount, null);
assert.strictEqual(kaliResults[0].rolaCount, 50);
assert.strictEqual(kaliResults[0].isValid, true);
assert.strictEqual(kaliResults[1].isValid, true);

const kaliSummary = kaliResults.reduce(
  (acc, b) => ({
    totalBags: acc.totalBags + 1,
    totalGrossG: acc.totalGrossG + b.grossG,
    totalRola: acc.totalRola + b.rolaCount,
  }),
  { totalBags: 0, totalGrossG: 0, totalRola: 0 }
);

assert.strictEqual(kaliSummary.totalBags, 2);
assert.strictEqual(fmtKg(kaliSummary.totalGrossG / 1000), '35.000 kg');
assert.strictEqual(kaliSummary.totalRola, 120);
console.log('✓ Kali Batch verified: no Bungari tare, no payment amount, correct rola & gross totals');

// ── Test 5: Bungari Count Sanitization ───────────────────────────────────
console.log('\n[Test 5] Sanitizing Bungari count leading zeros:');
assert.strictEqual(sanitizeNumberString('030'), '30');
assert.strictEqual(sanitizeNumberString('005'), '5');
assert.strictEqual(sanitizeNumberString('0'), '0');
console.log('✓ Leading zeros stripped cleanly: 030 → 30, 005 → 5');

// ── Test 6: Validation & Error Detection ─────────────────────────────────
console.log('\n[Test 6] Validation error detection:');
// Gross empty
const errGross = validateBag({ grossGrams: '', bungariCount: '10', bungariWeightGrams: '70' }, 'Val', '20');
assert.strictEqual(errGross.grossError, 'Gross weight is required');
assert.strictEqual(errGross.isValid, false);

// Bungari empty
const errBungari = validateBag({ grossGrams: '18500', bungariCount: '', bungariWeightGrams: '70' }, 'Val', '20');
assert.strictEqual(errBungari.bungariError, 'Bungari count is required');
assert.strictEqual(errBungari.isValid, false);

// Tare >= Gross (Tare 7000g >= Gross 5000g)
const errTare = validateBag({ grossGrams: '5000', bungariCount: '100', bungariWeightGrams: '70' }, 'Val', '20');
assert.strictEqual(errTare.tareError, 'Bungari weight cannot exceed gross weight');
assert.strictEqual(errTare.isValid, false);

// Rate empty in Val
const errRate = validateBag({ grossGrams: '18500', bungariCount: '12', bungariWeightGrams: '70' }, 'Val', '');
assert.strictEqual(errRate.isValid, false);

console.log('✓ Validation cases correctly caught all invalid states');

console.log('\nALL DISPATCH TESTS PASSED SUCCESSFULLY! ✓');
