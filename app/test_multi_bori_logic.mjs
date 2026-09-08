import assert from 'node:assert'

console.log('--- Testing Multi-Bori Calculations and Workflow ---')

// Helper functions matching types/index.ts & Receiving.tsx
function fmtKg(n) {
  if (n === null || n === undefined) return '—'
  const val = Number(n) || 0
  return `${val.toFixed(3)} kg`
}

function kgToGrams(kg) {
  if (kg === null || kg === undefined || kg === '') return ''
  const val = typeof kg === 'string' ? parseFloat(kg) : kg
  if (isNaN(val)) return ''
  return String(Math.round(val * 1000))
}

function calculateBori(grossGramsStr, rolaCountStr, perRolaGramsStr) {
  const grossG = parseInt(grossGramsStr, 10) || 0
  const rolaCnt = parseInt(rolaCountStr, 10) || 0
  const perRolaG = parseInt(perRolaGramsStr, 10) || 0
  const tareG = rolaCnt * perRolaG
  const netG = Math.max(0, grossG - tareG)

  const grossKg = grossG / 1000
  const tareKg = tareG / 1000
  const netKg = netG / 1000

  return {
    grossG,
    rolaCnt,
    perRolaG,
    tareG,
    netG,
    grossKg,
    tareKg,
    netKg,
    isTareInvalid: grossG > 0 && tareG >= grossG,
  }
}

// ── Test 1: Single Bori ───────────────────────────────────────────────────
console.log('\n[Test 1] Single Bori (23535g, 60 rola, 200g/rola)');
const b1 = calculateBori('23535', '60', '200');
assert.strictEqual(b1.grossG, 23535);
assert.strictEqual(b1.tareG, 12000);
assert.strictEqual(b1.netG, 11535);
assert.strictEqual(fmtKg(b1.grossKg), '23.535 kg');
assert.strictEqual(fmtKg(b1.tareKg), '12.000 kg');
assert.strictEqual(fmtKg(b1.netKg), '11.535 kg');
assert.strictEqual(b1.isTareInvalid, false);
console.log('✓ Single bori calculated correctly: 23.535 kg gross, 12.000 kg tare, 11.535 kg net');

// ── Test 2: Multiple Boris (Batch of 3) ────────────────────────────────────
console.log('\n[Test 2] Multiple Boris Batch:');
const borisData = [
  { grossGrams: '23535', rolaCount: '60', perRolaGrams: '200' },
  { grossGrams: '24200', rolaCount: '50', perRolaGrams: '200' },
  { grossGrams: '21800', rolaCount: '55', perRolaGrams: '200' },
];

const batchResults = borisData.map((b) => calculateBori(b.grossGrams, b.rolaCount, b.perRolaGrams));

assert.strictEqual(batchResults[0].netG, 11535); // 23535 - 12000
assert.strictEqual(batchResults[1].tareG, 10000); // 50 * 200
assert.strictEqual(batchResults[1].netG, 14200);  // 24200 - 10000
assert.strictEqual(batchResults[2].tareG, 11000); // 55 * 200
assert.strictEqual(batchResults[2].netG, 10800);  // 21800 - 11000

const batchSummary = batchResults.reduce(
  (acc, b) => ({
    totalBoris: acc.totalBoris + 1,
    totalGrossG: acc.totalGrossG + b.grossG,
    totalRola: acc.totalRola + b.rolaCnt,
    totalTareG: acc.totalTareG + b.tareG,
    totalNetG: acc.totalNetG + b.netG,
  }),
  { totalBoris: 0, totalGrossG: 0, totalRola: 0, totalTareG: 0, totalNetG: 0 }
);

assert.strictEqual(batchSummary.totalBoris, 3);
assert.strictEqual(batchSummary.totalGrossG, 69535);
assert.strictEqual(fmtKg(batchSummary.totalGrossG / 1000), '69.535 kg');
assert.strictEqual(batchSummary.totalRola, 165);
assert.strictEqual(batchSummary.totalTareG, 33000);
assert.strictEqual(fmtKg(batchSummary.totalTareG / 1000), '33.000 kg');
assert.strictEqual(batchSummary.totalNetG, 36535);
assert.strictEqual(fmtKg(batchSummary.totalNetG / 1000), '36.535 kg');
console.log('✓ Batch Summary matched exactly:');
console.log(`  Total Boris: ${batchSummary.totalBoris}`);
console.log(`  Total Gross: ${fmtKg(batchSummary.totalGrossG / 1000)} (${batchSummary.totalGrossG} g)`);
console.log(`  Total Rola:  ${batchSummary.totalRola}`);
console.log(`  Total Tare:  ${fmtKg(batchSummary.totalTareG / 1000)} (${batchSummary.totalTareG} g)`);
console.log(`  Total Net:   ${fmtKg(batchSummary.totalNetG / 1000)} (${batchSummary.totalNetG} g)`);

// ── Test 3: Optional Color & Payload Conversion ───────────────────────────
console.log('\n[Test 3] Optional Color & Payload mapping:');
const partyId = 'test-party-123';
const date = '2026-09-08';
const emptyColor = '';
const challanNo = 'CH-9988';

const payloads = borisData.map((b) => {
  const calc = calculateBori(b.grossGrams, b.rolaCount, b.perRolaGrams);
  return {
    party_id: partyId,
    date: date,
    color: emptyColor.trim() || null,
    challan_no: challanNo.trim() || null,
    gross_weight: calc.grossKg,
    tare_weight: calc.tareKg,
    rola_count: calc.rolaCnt,
  };
});

assert.strictEqual(payloads.length, 3);
assert.strictEqual(payloads[0].color, null);
assert.strictEqual(payloads[0].gross_weight, 23.535);
assert.strictEqual(payloads[0].tare_weight, 12.000);
assert.strictEqual(payloads[0].rola_count, 60);
console.log('✓ Empty color correctly mapped to null in payload, ready to save to database');

// ── Test 4: Edit Restoration & Derived Per-Rola Weight ─────────────────────
console.log('\n[Test 4] Edit Restoration & Original Per-Rola Derivation:');
// Suppose existing record in DB: gross = 24.200 kg, tare = 9.000 kg, rola_count = 50 (i.e. 180g per rola)
const existingRecord = {
  id: 'rec-456',
  party_id: 'party-1',
  date: '2026-09-08',
  color: null,
  gross_weight: 24.2,
  tare_weight: 9.0,
  rola_count: 50,
};

const loadedGrossGrams = kgToGrams(existingRecord.gross_weight);
const loadedRolaCount = String(existingRecord.rola_count);
const derivedPerRola = String(Math.round((existingRecord.tare_weight * 1000) / existingRecord.rola_count));

assert.strictEqual(loadedGrossGrams, '24200');
assert.strictEqual(loadedRolaCount, '50');
assert.strictEqual(derivedPerRola, '180'); // Exact 180g recovered without global conflict!

const editCalc = calculateBori(loadedGrossGrams, loadedRolaCount, derivedPerRola);
assert.strictEqual(editCalc.tareG, 9000);
assert.strictEqual(editCalc.netG, 15200);
console.log(`✓ Edit successfully restored original 180g per rola and recalculated: Net = ${editCalc.netG} g (${fmtKg(editCalc.netKg)})`);

// ── Test 5: Validation Rules ──────────────────────────────────────────────
console.log('\n[Test 5] Validation error detection:');
const invalidTare = calculateBori('10000', '60', '200'); // Tare = 12000g > Gross 10000g
assert.strictEqual(invalidTare.isTareInvalid, true);
console.log('✓ Tare >= Gross correctly identified as invalid (12000g >= 10000g)');

console.log('\nALL TESTS PASSED SUCCESSFULLY! ✓');
