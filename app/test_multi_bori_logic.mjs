import assert from 'node:assert'

console.log('--- Testing Strict Per-Bag Validation Cases 1 to 6 ---')

function fmtKg(n) {
  if (n === null || n === undefined) return '—'
  const val = Number(n) || 0
  return `${val.toFixed(3)} kg`
}

function validateBag(bag) {
  let grossError = null
  let rolaError = null
  let perRolaError = null
  let tareError = null

  // 1. Gross Weight validation
  if (!bag.grossGrams || !bag.grossGrams.trim()) {
    grossError = 'Gross weight is required'
  } else {
    const g = parseInt(bag.grossGrams, 10)
    if (isNaN(g) || g <= 0) {
      grossError = 'Gross weight must be greater than 0'
    }
  }

  // 2. Rola Count validation
  if (!bag.rolaCount || !bag.rolaCount.trim()) {
    rolaError = 'Rola count is required'
  } else {
    const r = parseInt(bag.rolaCount, 10)
    if (isNaN(r) || r < 0) {
      rolaError = 'Rola count cannot be negative'
    }
  }

  // 3. Per Rola Weight validation
  const rCount = parseInt(bag.rolaCount?.trim() || '0', 10)
  if (bag.perRolaGrams?.trim()) {
    const pr = parseInt(bag.perRolaGrams, 10)
    if (isNaN(pr) || pr <= 0) {
      perRolaError = 'Per rola weight must be greater than 0'
    }
  } else if (!isNaN(rCount) && rCount > 0) {
    perRolaError = 'Per rola weight is required'
  }

  const grossG = parseInt(bag.grossGrams, 10) || 0
  const rolaCnt = isNaN(rCount) ? 0 : rCount
  const perRolaG = parseInt(bag.perRolaGrams?.trim() || '0', 10) || 0
  const tareG = rolaCnt * perRolaG
  const netG = Math.max(0, grossG - tareG)

  // 4. Tare vs Gross validation
  if (!grossError && !rolaError && !perRolaError && grossG > 0) {
    if (tareG >= grossG) {
      tareError = `Tare (${fmtKg(tareG / 1000)}) cannot exceed gross weight (${fmtKg(grossG / 1000)})`
    }
  }

  const isValid = !grossError && !rolaError && !perRolaError && !tareError

  return {
    grossError,
    rolaError,
    perRolaError,
    tareError,
    isValid,
    grossG,
    rolaCnt,
    perRolaG,
    tareG,
    netG,
  }
}

function checkBatchCanSave(bags, header = { partyId: 'p1', date: '2026-09-08' }) {
  const isHeaderValid = Boolean(header.partyId && header.date)
  const allBagsValid = bags.length > 0 && bags.every(b => validateBag(b).isValid)
  return isHeaderValid && allBagsValid
}

// ── Case 1: Gross empty, Rola empty ────────────────────────────────────────
console.log('\n[Case 1] Gross empty, Rola empty');
const c1 = validateBag({ grossGrams: '', rolaCount: '', perRolaGrams: '200' });
assert.strictEqual(c1.grossError, 'Gross weight is required');
assert.strictEqual(c1.rolaError, 'Rola count is required');
assert.strictEqual(c1.isValid, false);
assert.strictEqual(checkBatchCanSave([{ grossGrams: '', rolaCount: '', perRolaGrams: '200' }]), false);
console.log('✓ Case 1 passed: both fields show required errors, Save is disabled');

// ── Case 2: Gross = 23535, Rola empty ───────────────────────────────────────
console.log('\n[Case 2] Gross = 23535, Rola empty');
const c2 = validateBag({ grossGrams: '23535', rolaCount: '', perRolaGrams: '200' });
assert.strictEqual(c2.grossError, null);
assert.strictEqual(c2.rolaError, 'Rola count is required');
assert.strictEqual(c2.isValid, false);
assert.strictEqual(checkBatchCanSave([{ grossGrams: '23535', rolaCount: '', perRolaGrams: '200' }]), false);
console.log('✓ Case 2 passed: Rola Count shows "Rola count is required", Save is disabled');

// ── Case 3: Gross empty, Rola = 60 ──────────────────────────────────────────
console.log('\n[Case 3] Gross empty, Rola = 60');
const c3 = validateBag({ grossGrams: '', rolaCount: '60', perRolaGrams: '200' });
assert.strictEqual(c3.grossError, 'Gross weight is required');
assert.strictEqual(c3.rolaError, null);
assert.strictEqual(c3.isValid, false);
assert.strictEqual(checkBatchCanSave([{ grossGrams: '', rolaCount: '60', perRolaGrams: '200' }]), false);
console.log('✓ Case 3 passed: Gross Weight shows "Gross weight is required", Save is disabled');

// ── Case 4: Gross = 23535, Rola = 60, Per Rola = 200 ────────────────────────
console.log('\n[Case 4] Gross = 23535, Rola = 60, Per Rola = 200');
const c4 = validateBag({ grossGrams: '23535', rolaCount: '60', perRolaGrams: '200' });
assert.strictEqual(c4.grossError, null);
assert.strictEqual(c4.rolaError, null);
assert.strictEqual(c4.tareG, 12000);
assert.strictEqual(c4.netG, 11535);
assert.strictEqual(c4.isValid, true);
assert.strictEqual(checkBatchCanSave([{ grossGrams: '23535', rolaCount: '60', perRolaGrams: '200' }]), true);
console.log('✓ Case 4 passed: Tare = 12000 g, Net = 11535 g, Bag marked Complete, Save is enabled');

// ── Case 5: Bag 1 valid, Bag 2 incomplete ──────────────────────────────────
console.log('\n[Case 5] Bag 1 valid, Bag 2 incomplete');
const bag1Valid = { id: 'b1', grossGrams: '23535', rolaCount: '60', perRolaGrams: '200' };
const bag2Incomplete = { id: 'b2', grossGrams: '', rolaCount: '', perRolaGrams: '200' };
const batchCase5 = [bag1Valid, bag2Incomplete];
assert.strictEqual(validateBag(bag1Valid).isValid, true);
assert.strictEqual(validateBag(bag2Incomplete).isValid, false);
assert.strictEqual(checkBatchCanSave(batchCase5), false);
console.log('✓ Case 5 passed: Bag 1 is Complete, Bag 2 is Incomplete, Save is disabled');

// ── Case 6: Bag 1 valid, Bag 2 incomplete, User removes Bag 2 ───────────────
console.log('\n[Case 6] User removes Bag 2 from batch');
const batchCase6 = batchCase5.filter(b => b.id !== 'b2');
assert.strictEqual(batchCase6.length, 1);
assert.strictEqual(checkBatchCanSave(batchCase6), true);
console.log('✓ Case 6 passed: Removing Bag 2 leaves valid Bag 1, Save becomes enabled immediately');

console.log('\nALL 6 TEST CASES PASSED SUCCESSFULLY! ✓');
