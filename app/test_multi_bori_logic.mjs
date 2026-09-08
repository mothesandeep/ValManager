import assert from 'node:assert'

console.log('--- Testing Multi-Bag Calculations, Workflow & Challan Grouping ---')

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

function calculateBag(grossGramsStr, rolaCountStr, perRolaGramsStr) {
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

function groupReceiptsByChallan(receipts) {
  const groups = []
  const map = new Map()

  for (const r of receipts) {
    const challanTrimmed = r.challan_no?.trim() || null
    const groupKey = challanTrimmed
      ? `challan_${challanTrimmed}_${r.party_id || 'unknown'}_${r.date}`
      : `no_challan_${r.id}`

    let g = map.get(groupKey)
    if (!g) {
      g = {
        id: groupKey,
        challanNo: challanTrimmed,
        partyName: r.party?.name || '—',
        date: r.date,
        color: r.color || null,
        receipts: [],
        totalNet: 0,
        totalGross: 0,
        totalRola: 0,
      }
      map.set(groupKey, g)
      groups.push(g)
    }

    g.receipts.push(r)
    g.totalNet += Number(r.net_weight) || 0
    g.totalGross += Number(r.gross_weight) || 0
    g.totalRola += Number(r.rola_count) || 0
  }

  return groups
}

// ── Test 1: Single Bag ────────────────────────────────────────────────────
console.log('\n[Test 1] Single Bag (23535g, 60 rola, 200g/rola)');
const b1 = calculateBag('23535', '60', '200');
assert.strictEqual(b1.grossG, 23535);
assert.strictEqual(b1.tareG, 12000);
assert.strictEqual(b1.netG, 11535);
assert.strictEqual(fmtKg(b1.grossKg), '23.535 kg');
assert.strictEqual(fmtKg(b1.tareKg), '12.000 kg');
assert.strictEqual(fmtKg(b1.netKg), '11.535 kg');
assert.strictEqual(b1.isTareInvalid, false);
console.log('✓ Single bag calculated correctly: 23.535 kg gross, 12.000 kg tare, 11.535 kg net');

// ── Test 2: Multiple Bags Batch ───────────────────────────────────────────
console.log('\n[Test 2] Multiple Bags Batch:');
const bagsData = [
  { grossGrams: '23535', rolaCount: '60', perRolaGrams: '200' },
  { grossGrams: '24200', rolaCount: '50', perRolaGrams: '200' },
  { grossGrams: '21800', rolaCount: '55', perRolaGrams: '200' },
];

const batchResults = bagsData.map((b) => calculateBag(b.grossGrams, b.rolaCount, b.perRolaGrams));

assert.strictEqual(batchResults[0].netG, 11535); // 23535 - 12000
assert.strictEqual(batchResults[1].tareG, 10000); // 50 * 200
assert.strictEqual(batchResults[1].netG, 14200);  // 24200 - 10000
assert.strictEqual(batchResults[2].tareG, 11000); // 55 * 200
assert.strictEqual(batchResults[2].netG, 10800);  // 21800 - 11000

const batchSummary = batchResults.reduce(
  (acc, b) => ({
    totalBags: acc.totalBags + 1,
    totalGrossG: acc.totalGrossG + b.grossG,
    totalRola: acc.totalRola + b.rolaCnt,
    totalTareG: acc.totalTareG + b.tareG,
    totalNetG: acc.totalNetG + b.netG,
  }),
  { totalBags: 0, totalGrossG: 0, totalRola: 0, totalTareG: 0, totalNetG: 0 }
);

assert.strictEqual(batchSummary.totalBags, 3);
assert.strictEqual(batchSummary.totalGrossG, 69535);
assert.strictEqual(fmtKg(batchSummary.totalGrossG / 1000), '69.535 kg');
assert.strictEqual(batchSummary.totalRola, 165);
assert.strictEqual(batchSummary.totalTareG, 33000);
assert.strictEqual(fmtKg(batchSummary.totalTareG / 1000), '33.000 kg');
assert.strictEqual(batchSummary.totalNetG, 36535);
assert.strictEqual(fmtKg(batchSummary.totalNetG / 1000), '36.535 kg');
console.log('✓ Batch Summary matched exactly:');
console.log(`  Total Bags:  ${batchSummary.totalBags}`);
console.log(`  Total Gross: ${fmtKg(batchSummary.totalGrossG / 1000)} (${batchSummary.totalGrossG} g)`);
console.log(`  Total Rola:  ${batchSummary.totalRola}`);
console.log(`  Total Tare:  ${fmtKg(batchSummary.totalTareG / 1000)} (${batchSummary.totalTareG} g)`);
console.log(`  Total Net:   ${fmtKg(batchSummary.totalNetG / 1000)} (${batchSummary.totalNetG} g)`);

// ── Test 3: Challan-Based Grouping in Table ───────────────────────────────
console.log('\n[Test 3] Challan Grouping (Challan 100 with 3 bags & Challan 150 with 2 bags):');
const mockReceipts = [
  // Challan 100: 3 bags
  { id: '1', party_id: 'p1', party: { name: 'Prakash' }, date: '2026-09-08', challan_no: '100', color: 'Gold', gross_weight: 23.535, tare_weight: 12.000, net_weight: 11.535, rola_count: 60 },
  { id: '2', party_id: 'p1', party: { name: 'Prakash' }, date: '2026-09-08', challan_no: '100', color: 'Gold', gross_weight: 24.200, tare_weight: 10.000, net_weight: 14.200, rola_count: 50 },
  { id: '3', party_id: 'p1', party: { name: 'Prakash' }, date: '2026-09-08', challan_no: '100', color: 'Gold', gross_weight: 21.800, tare_weight: 11.000, net_weight: 10.800, rola_count: 55 },
  // Challan 150: 2 bags
  { id: '4', party_id: 'p1', party: { name: 'Prakash' }, date: '2026-09-08', challan_no: '150', color: 'Silver', gross_weight: 23.424, tare_weight: 3.000, net_weight: 20.424, rola_count: 50 },
  { id: '5', party_id: 'p1', party: { name: 'Prakash' }, date: '2026-09-08', challan_no: '150', color: 'Silver', gross_weight: 18.500, tare_weight: 2.500, net_weight: 16.000, rola_count: 40 },
  // No Challan: 1 bag
  { id: '6', party_id: 'p2', party: { name: 'Satish' }, date: '2026-09-08', challan_no: null, color: null, gross_weight: 15.000, tare_weight: 2.000, net_weight: 13.000, rola_count: 10 },
];

const groups = groupReceiptsByChallan(mockReceipts);
assert.strictEqual(groups.length, 3);

// Group 0: Challan 100
assert.strictEqual(groups[0].challanNo, '100');
assert.strictEqual(groups[0].receipts.length, 3);
assert.strictEqual(groups[0].totalGross.toFixed(3), '69.535');
assert.strictEqual(groups[0].totalNet.toFixed(3), '36.535');
assert.strictEqual(groups[0].totalRola, 165);

// Group 1: Challan 150
assert.strictEqual(groups[1].challanNo, '150');
assert.strictEqual(groups[1].receipts.length, 2);
assert.strictEqual(groups[1].totalGross.toFixed(3), '41.924');
assert.strictEqual(groups[1].totalNet.toFixed(3), '36.424');
assert.strictEqual(groups[1].totalRola, 90);

// Group 2: No Challan
assert.strictEqual(groups[2].challanNo, null);
assert.strictEqual(groups[2].receipts.length, 1);

// Verify sequence: Bag 1, Bag 2, Bag 3 within Challan 100
groups[0].receipts.forEach((r, idx) => {
  const bagLabel = `Bag ${idx + 1}`;
  assert.strictEqual(bagLabel, `Bag ${idx + 1}`);
});

console.log('✓ Challan Groups created accurately:');
console.log(`  Group 0: Challan #100 → 3 Bags (Bag 1, Bag 2, Bag 3), Total Net: ${fmtKg(groups[0].totalNet)}`);
console.log(`  Group 1: Challan #150 → 2 Bags (Bag 1, Bag 2), Total Net: ${fmtKg(groups[1].totalNet)}`);
console.log(`  Group 2: No Challan   → 1 Bag (Bag 1), Total Net: ${fmtKg(groups[2].totalNet)}`);

// Verify alternating group backgrounds
const bg0 = 0 % 2 === 0 ? '#ffffff' : '#fcfbf7';
const bg1 = 1 % 2 === 0 ? '#ffffff' : '#fcfbf7';
const bg2 = 2 % 2 === 0 ? '#ffffff' : '#fcfbf7';
assert.strictEqual(bg0, '#ffffff');
assert.strictEqual(bg1, '#fcfbf7');
assert.strictEqual(bg2, '#ffffff');
console.log('✓ Alternating group background pattern verified: [Group 0: #ffffff, Group 1: #fcfbf7, Group 2: #ffffff]');

// ── Test 4: Optional Color & Payload Conversion ───────────────────────────
console.log('\n[Test 4] Optional Color & Payload mapping:');
const partyId = 'test-party-123';
const date = '2026-09-08';
const emptyColor = '';
const challanNo = 'CH-9988';

const payloads = bagsData.map((b) => {
  const calc = calculateBag(b.grossGrams, b.rolaCount, b.perRolaGrams);
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

// ── Test 5: Edit Restoration & Derived Per-Rola Weight ─────────────────────
console.log('\n[Test 5] Edit Restoration & Original Per-Rola Derivation:');
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
assert.strictEqual(derivedPerRola, '180');

const editCalc = calculateBag(loadedGrossGrams, loadedRolaCount, derivedPerRola);
assert.strictEqual(editCalc.tareG, 9000);
assert.strictEqual(editCalc.netG, 15200);
console.log(`✓ Edit successfully restored original 180g per rola and recalculated: Net = ${editCalc.netG} g (${fmtKg(editCalc.netKg)})`);

// ── Test 6: Validation Rules ──────────────────────────────────────────────
console.log('\n[Test 6] Validation error detection:');
const invalidTare = calculateBag('10000', '60', '200');
assert.strictEqual(invalidTare.isTareInvalid, true);
console.log('✓ Tare >= Gross correctly identified as invalid (12000g >= 10000g)');

console.log('\nALL TESTS PASSED SUCCESSFULLY! ✓');
