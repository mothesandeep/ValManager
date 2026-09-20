import { useState, useEffect, useCallback } from 'react'
import { Save, Check, Trash2, Plus } from 'lucide-react'
import { fetchParties, updateParty } from '../lib/api/parties'

import {
  getGlobalSettings,
  saveGlobalSettings,
  getTarRates,
  saveTarRates,
  type TarRateConfig,
  getPartyBigRolaMap,
  savePartyBigRolaWeight,
} from '../features/settings/utils'
import type { Party } from '../features/parties/types'
import { PageHeader } from '../components/ui/PageHeader'

// ── Small reusable label/input pair ─────────────────────────────────────────
function SettingRow({
  label,
  value,
  onChange,
  unit,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  unit: string
  placeholder?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-gray-100 last:border-0 group">
      <span className="text-[15px] font-extrabold text-gray-700 tracking-tight group-hover:text-gray-900 transition-colors">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder={placeholder}
          className="w-24 h-11 px-3 rounded-[12px] bg-gray-50/50 border border-gray-200 text-[15px] font-black text-center tabular-nums text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-xs"
        />
        <span className="text-[13px] font-bold text-gray-400 w-10">{unit}</span>
      </div>
    </div>
  )
}

// ── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-xl)] p-6 sm:p-7 bg-[var(--color-card)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] relative overflow-hidden transition-all hover:shadow-[var(--shadow-md)]">
      <div className="mb-6">
        <h2 className="text-[19px] font-black text-[var(--color-ink)] tracking-tight mb-1">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[13px] font-medium text-[var(--color-ink-soft)] leading-relaxed max-w-lg">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  // ── Global weights ───────────────────────────────────────────────────────
  const [rolaWeight, setRolaWeight] = useState('200')
  const [bigRolaWeight, setBigRolaWeight] = useState('250')
  const [bungriWeight, setBungriWeight] = useState('70')
  const [boriWeight, setBoriWeight] = useState('100')
  const [weightSaved, setWeightSaved] = useState(false)

  useEffect(() => {
    const s = getGlobalSettings()
    setRolaWeight(String(s.defaultRolaGrams))
    setBigRolaWeight(String(s.defaultBigRolaGrams))
    setBungriWeight(String(s.defaultBungariGrams))
    setBoriWeight(String(s.defaultBoriGrams || 100))
  }, [])

  const saveWeights = () => {
    const r = parseInt(rolaWeight, 10)
    const br = parseInt(bigRolaWeight, 10)
    const b = parseInt(bungriWeight, 10)
    const bo = parseInt(boriWeight, 10)
    if (!r || !b) return
    saveGlobalSettings({
      defaultRolaGrams: r,
      defaultBigRolaGrams: br || 250,
      defaultBungariGrams: b,
      defaultBoriGrams: bo || 100,
    })
    setWeightSaved(true)
    setTimeout(() => setWeightSaved(false), 2500)
  }

  // ── Tar rates ────────────────────────────────────────────────────────────
  const [tarRates, setTarRates] = useState<TarRateConfig[]>([])
  const [ratesSaved, setRatesSaved] = useState(false)
  const [newTar, setNewTar] = useState('')
  const [newRate, setNewRate] = useState('')
  const [addError, setAddError] = useState('')

  useEffect(() => {
    setTarRates(getTarRates())
  }, [])

  const updateRate = (tar: number, value: string) => {
    const clean = value.replace(/[^0-9.]/g, '')
    setTarRates((prev) =>
      prev.map((r) => (r.tar === tar ? { ...r, rate: parseFloat(clean) || 0 } : r))
    )
    setRatesSaved(false)
  }

  const deleteTar = (tar: number) => {
    setTarRates((prev) => prev.filter((r) => r.tar !== tar))
    setRatesSaved(false)
  }

  const addTar = () => {
    const t = parseInt(newTar, 10)
    const r = parseFloat(newRate)
    if (!t || t <= 0) { setAddError('Valid Tar required'); return }
    if (!r || r <= 0) { setAddError('Valid Rate required'); return }
    if (tarRates.find((x) => x.tar === t)) { setAddError(`${t} Tar already exists`); return }
    setAddError('')
    const updated = [...tarRates, { tar: t, rate: r }].sort((a, b) => a.tar - b.tar)
    setTarRates(updated)
    setNewTar('')
    setNewRate('')
    setRatesSaved(false)
  }

  const saveRates = () => {
    saveTarRates(tarRates)
    setRatesSaved(true)
    setTimeout(() => setRatesSaved(false), 2500)
  }

  // ── Party-wise weights ───────────────────────────────────────────────────
  const [parties, setParties] = useState<Party[]>([])
  const [partyLoading, setPartyLoading] = useState(true)
  const [partyEdits, setPartyEdits] = useState<Record<string, { rola: string; bigRola: string }>>({})
  const [partySaved, setPartySaved] = useState<Record<string, boolean>>({})

  const loadParties = useCallback(async () => {
    setPartyLoading(true)
    try {
      const data = await fetchParties()
      setParties(data)
      const bigMap = getPartyBigRolaMap()
      const edits: Record<string, { rola: string; bigRola: string }> = {}
      data.forEach((p) => {
        edits[p.id] = {
          rola: p.default_rola_weight_g != null ? String(p.default_rola_weight_g) : '',
          bigRola: bigMap[p.id] ? String(bigMap[p.id]) : '',
        }
      })
      setPartyEdits(edits)
    } finally {
      setPartyLoading(false)
    }
  }, [])

  useEffect(() => { void loadParties() }, [loadParties])

  const saveParty = async (partyId: string) => {
    const e = partyEdits[partyId]
    if (!e) return
    await updateParty(partyId, {
      default_rola_weight_g: e.rola ? parseInt(e.rola, 10) : null,
    })
    savePartyBigRolaWeight(partyId, e.bigRola ? parseInt(e.bigRola, 10) : null)
    setPartySaved((prev) => ({ ...prev, [partyId]: true }))
    setTimeout(() => setPartySaved((prev) => ({ ...prev, [partyId]: false })), 2500)
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12 animate-in fade-in duration-500">
      <PageHeader
        title="Settings"
        description="Configure default weights and rates. These will apply automatically across all receiving and dispatch entries."
      />

      {/* ── 1. Global Weights ─────────────────────────────────────────────── */}
      <Card title="Default Weights" subtitle="The baseline configuration for all new entries.">
        <div className="mb-6">
          <SettingRow label="Normal Rola Weight" value={rolaWeight} onChange={setRolaWeight} unit="grams" placeholder="200" />
          <SettingRow label="Big Rola Weight" value={bigRolaWeight} onChange={setBigRolaWeight} unit="grams" placeholder="250" />
          <SettingRow label="Bungri Weight" value={bungriWeight} onChange={setBungriWeight} unit="grams" placeholder="70" />
          <SettingRow label="Bori (Bag) Tare" value={boriWeight} onChange={setBoriWeight} unit="grams" placeholder="100" />
        </div>
        <div>
          <button
            onClick={saveWeights}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[14px] font-black text-white bg-gradient-to-b from-[#b58c50] to-[#997036] hover:from-[#a57b3f] hover:to-[#8a632b] shadow-[0_4px_12px_rgba(165,123,63,0.3)] transition-all cursor-pointer text-[14px]"
          >
            {weightSaved ? <><Check size={18} strokeWidth={3} /> Saved</> : <><Save size={18} strokeWidth={2.5} /> Save Weights</>}
          </button>
        </div>
      </Card>

      {/* ── 2. Tar Rate Table ─────────────────────────────────────────────── */}
      <Card title="Tar Rate (₹/kg)" subtitle="Set the Paisa per kg based on Tar. Rate applies to both S and Z twists.">
        <div className="rounded-[16px] border border-gray-200/60 overflow-hidden mb-5 shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200/60">
                <th className="text-left px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Tar</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Rate (₹/kg)</th>
                <th className="px-5 py-3.5 w-14" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tarRates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-10">
                    <p className="text-[13px] font-bold text-gray-400">No rates configured. Add one below.</p>
                  </td>
                </tr>
              ) : (
                tarRates.map((r) => (
                  <tr key={r.tar} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="text-[15px] font-black text-gray-900 tracking-tight">{r.tar} Tar</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-gray-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={r.rate || ''}
                          onChange={(e) => updateRate(r.tar, e.target.value)}
                          className="w-24 h-11 px-3 rounded-[12px] bg-white border border-gray-200 text-[15px] font-black tabular-nums text-gray-900 focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-xs"
                          placeholder="0"
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => deleteTar(r.tar)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all cursor-pointer opacity-50 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 size={18} strokeWidth={2.5} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add new Tar row */}
        <div className="p-4 bg-gray-50/50 rounded-[16px] border border-gray-100 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5 pl-1">Tar (number)</label>
              <input
                type="number"
                min="1"
                value={newTar}
                onChange={(e) => { setNewTar(e.target.value); setAddError('') }}
                placeholder="e.g. 9"
                className={`w-full h-11 px-4 rounded-[12px] bg-white border ${addError ? 'border-red-300 focus:border-red-400 focus:ring-red-400/10' : 'border-gray-200 focus:border-[#a57b3f] focus:ring-[#a57b3f]/10'} text-[15px] font-black tabular-nums focus:outline-none focus:ring-4 transition-all shadow-xs`}
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5 pl-1">Rate (₹/kg)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-gray-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newRate}
                  onChange={(e) => { setNewRate(e.target.value); setAddError('') }}
                  placeholder="e.g. 22"
                  className={`w-full h-11 pl-8 pr-4 rounded-[12px] bg-white border ${addError ? 'border-red-300 focus:border-red-400 focus:ring-red-400/10' : 'border-gray-200 focus:border-[#a57b3f] focus:ring-[#a57b3f]/10'} text-[15px] font-black tabular-nums focus:outline-none focus:ring-4 transition-all shadow-xs`}
                />
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <button
                type="button"
                onClick={addTar}
                className="w-full sm:w-auto h-11 px-5 rounded-[12px] text-[13px] font-black bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer border border-amber-200/50 flex items-center justify-center gap-2 tracking-wide"
              >
                <Plus size={16} strokeWidth={3} /> Add Tar
              </button>
            </div>
          </div>
          {addError && <p className="text-[11px] font-bold text-red-500 mt-2.5 pl-1">{addError}</p>}
        </div>

        <div>
          <button
            onClick={saveRates}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[14px] font-black text-white bg-gradient-to-b from-[#b58c50] to-[#997036] hover:from-[#a57b3f] hover:to-[#8a632b] shadow-[0_4px_12px_rgba(165,123,63,0.3)] transition-all cursor-pointer text-[14px]"
          >
            {ratesSaved ? <><Check size={18} strokeWidth={3} /> Saved</> : <><Save size={18} strokeWidth={2.5} /> Save Rates</>}
          </button>
        </div>
      </Card>

      {/* ── 3. Party-wise weights (optional overrides) ─────────────────────── */}
      <Card title="Party-wise Weights" subtitle="Optional overrides for specific parties. Leave blank to use defaults.">
        {partyLoading ? (
          <div className="py-10 text-center text-[13px] font-bold text-gray-400 animate-pulse">Loading parties...</div>
        ) : parties.length === 0 ? (
          <div className="py-10 text-center text-[13px] font-bold text-gray-400">No parties found. Please add a party first.</div>
        ) : (
          <div className="mt-4 rounded-[16px] border border-gray-100 overflow-hidden divide-y divide-gray-100 bg-white shadow-sm">
            {parties.map((p) => {
              const e = partyEdits[p.id] || { rola: '', bigRola: '' }
              return (
                <div key={p.id} className="px-5 py-4 hover:bg-gray-50/30 transition-colors group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-5">
                    
                    {/* Left: Party Name */}
                    <div className="sm:w-1/4 shrink-0">
                      <span className="font-extrabold text-[15px] text-gray-900 tracking-tight group-hover:text-[#a57b3f] transition-colors">{p.name}</span>
                    </div>

                    {/* Right: Inputs & Save */}
                    <div className="flex flex-row items-end gap-3 flex-1 mt-1 sm:mt-0">
                      {/* Middle: Inputs Grid */}
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <div>
                          <label className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1 truncate">Normal Rola</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              placeholder="Def"
                              value={e.rola}
                              onChange={(v) =>
                                setPartyEdits((prev) => ({ ...prev, [p.id]: { ...e, rola: v.target.value.replace(/[^0-9]/g, '') } }))
                              }
                              className="w-full h-9 px-2 rounded-[8px] bg-gray-50 border border-gray-200 text-[13px] font-black text-center tabular-nums focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-xs"
                            />
                            <span className="text-[10px] font-bold text-gray-400 hidden sm:inline">g</span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1 truncate">Big Rola</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              placeholder="Def"
                              value={e.bigRola}
                              onChange={(v) =>
                                setPartyEdits((prev) => ({ ...prev, [p.id]: { ...e, bigRola: v.target.value.replace(/[^0-9]/g, '') } }))
                              }
                              className="w-full h-9 px-2 rounded-[8px] bg-gray-50 border border-gray-200 text-[13px] font-black text-center tabular-nums focus:outline-none focus:bg-white focus:border-[#a57b3f] focus:ring-4 focus:ring-[#a57b3f]/10 transition-all shadow-xs"
                            />
                            <span className="text-[10px] font-bold text-gray-400 hidden sm:inline">g</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Save Button */}
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => saveParty(p.id)}
                          className={`flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-[8px] text-[11px] font-black transition-all cursor-pointer shadow-sm w-auto ${
                            partySaved[p.id]
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                              : 'bg-white text-gray-700 border border-gray-200 hover:border-[#a57b3f] hover:text-[#a57b3f]'
                          }`}
                        >
                          {partySaved[p.id] ? <><Check size={14} strokeWidth={3} /> Saved</> : <><Save size={14} strokeWidth={2.5} /> Save</>}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
