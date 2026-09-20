// Test suite for Settings & Party-wise Rola/Bungri logic
import assert from 'node:assert'

const STANDARD_ROLA_WEIGHT_G = 200
const STANDARD_BUNGARI_WEIGHT_G = 70

function resolvePartyRolaWeight(party, globalSettings = { defaultRolaGrams: STANDARD_ROLA_WEIGHT_G }) {
  if (party && party.default_rola_weight_g !== null && party.default_rola_weight_g !== undefined) {
    const val = Number(party.default_rola_weight_g)
    if (!isNaN(val) && val > 0) return val
  }
  return globalSettings.defaultRolaGrams
}

function resolvePartyBungariWeight(party, globalSettings = { defaultBungariGrams: STANDARD_BUNGARI_WEIGHT_G }) {
  if (party && party.default_bungari_weight_g !== null && party.default_bungari_weight_g !== undefined) {
    const val = Number(party.default_bungari_weight_g)
    if (!isNaN(val) && val > 0) return val
  }
  return globalSettings.defaultBungariGrams
}

function calcReceiptNet(grossKg, rolaCount, perRolaGrams) {
  const tare = (rolaCount * perRolaGrams) / 1000
  return Math.max(0, grossKg - tare)
}

function calcDispatchNet(grossKg, bungariCount, bungariWeightGrams) {
  const tare = (bungariCount * bungariWeightGrams) / 1000
  return Math.max(0, grossKg - tare)
}

console.log('--- Running Settings & Party Weight Tests ---')

// 1. Global resolution tests
const partyWithoutCustom = { name: 'Party A', default_rola_weight_g: null, default_bungari_weight_g: null }
assert.strictEqual(resolvePartyRolaWeight(partyWithoutCustom), 200, 'Party without custom rola should return 200g')
assert.strictEqual(resolvePartyBungariWeight(partyWithoutCustom), 70, 'Party without custom bungari should return 70g')

// 2. Party custom weights
const partyWithCustom = { name: 'Party B', default_rola_weight_g: 215, default_bungari_weight_g: 80 }
assert.strictEqual(resolvePartyRolaWeight(partyWithCustom), 215, 'Party with custom rola should return 215g')
assert.strictEqual(resolvePartyBungariWeight(partyWithCustom), 80, 'Party with custom bungari should return 80g')

// 3. Partial custom weights
const partyWithOnlyRola = { name: 'Party C', default_rola_weight_g: 190, default_bungari_weight_g: null }
assert.strictEqual(resolvePartyRolaWeight(partyWithOnlyRola), 190, 'Party with only rola should return 190g')
assert.strictEqual(resolvePartyBungariWeight(partyWithOnlyRola), 70, 'Party with only rola should fallback to 70g bungari')

// 4. Custom global defaults
const customGlobal = { defaultRolaGrams: 205, defaultBungariGrams: 65 }
assert.strictEqual(resolvePartyRolaWeight(partyWithoutCustom, customGlobal), 205, 'Should inherit custom global rola')
assert.strictEqual(resolvePartyBungariWeight(partyWithoutCustom, customGlobal), 65, 'Should inherit custom global bungari')
assert.strictEqual(resolvePartyRolaWeight(partyWithCustom, customGlobal), 215, 'Party custom should override custom global')

// 5. Receiving tare calculation with custom rola weight
// 10 rolas @ 215g = 2.150 kg tare. Gross = 25.500 kg => Net = 23.350 kg
const rNet = calcReceiptNet(25.500, 10, resolvePartyRolaWeight(partyWithCustom))
assert.strictEqual(rNet, 23.350, 'Receiving net weight should accurately reflect 215g spool tare')

// 6. Dispatch tare calculation with custom bungari weight
// 12 bungari @ 80g = 0.960 kg tare. Gross = 20.000 kg => Net = 19.040 kg
const dNet = calcDispatchNet(20.000, 12, resolvePartyBungariWeight(partyWithCustom))
assert.strictEqual(dNet, 19.040, 'Dispatch net weight should accurately reflect 80g bungari tare')

console.log('✅ All Settings & Party Weight Tests Passed Successfully!')
