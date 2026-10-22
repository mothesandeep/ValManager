import { useState, useEffect, useCallback } from 'react'
import {
  Save,
  Check,
  Trash2,
  Plus,
  Scale,
  IndianRupee,
  Users,
} from 'lucide-react'
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
import { useToast } from '../context/ToastContext'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

type SettingsTab = 'weights' | 'tar' | 'parties'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('weights')
  const { showToast } = useToast()

  const [weightsSaved, setWeightsSaved] = useState(false)
  const [ratesSaved, setRatesSaved] = useState(false)
  const [partiesSaved, setPartiesSaved] = useState(false)

  // ── Global weights ───────────────────────────────────────────────────────
  const [rolaWeight, setRolaWeight] = useState('200')
  const [bigRolaWeight, setBigRolaWeight] = useState('250')
  const [bungriWeight, setBungriWeight] = useState('70')
  const [boriWeight, setBoriWeight] = useState('100')

  useEffect(() => {
    const s = getGlobalSettings()
    // Sanitize any corrupt rola value like 2 to standard 200
    const safeRola = s.defaultRolaGrams <= 10 ? 200 : s.defaultRolaGrams
    setRolaWeight(String(safeRola))
    setBigRolaWeight(String(s.defaultBigRolaGrams || 250))
    setBungriWeight(String(s.defaultBungariGrams || 70))
    setBoriWeight(String(s.defaultBoriGrams || 100))
  }, [])

  const saveWeights = () => {
    const r = parseInt(rolaWeight, 10)
    const br = parseInt(bigRolaWeight, 10)
    const b = parseInt(bungriWeight, 10)
    const bo = parseInt(boriWeight, 10)
    if (!r || !b) return

    const finalRola = r <= 10 ? 200 : r
    saveGlobalSettings({
      defaultRolaGrams: finalRola,
      defaultBigRolaGrams: br || 250,
      defaultBungariGrams: b || 70,
      defaultBoriGrams: bo || 100,
    })
    setRolaWeight(String(finalRola))
    setWeightsSaved(true)
    showToast('Default tare weights saved successfully')
    setTimeout(() => setWeightsSaved(false), 3000)
  }

  // ── Tar rates ────────────────────────────────────────────────────────────
  const [tarRates, setTarRates] = useState<TarRateConfig[]>([])
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
  }

  const deleteTar = (tar: number) => {
    setTarRates((prev) => prev.filter((r) => r.tar !== tar))
  }

  const addTar = () => {
    const t = parseInt(newTar, 10)
    const r = parseFloat(newRate)
    if (!t || t <= 0) {
      setAddError('Valid Tar required')
      return
    }
    if (!r || r <= 0) {
      setAddError('Valid Rate required')
      return
    }
    if (tarRates.find((x) => x.tar === t)) {
      setAddError(`${t} Tar already exists`)
      return
    }
    setAddError('')
    const updated = [...tarRates, { tar: t, rate: r }].sort((a, b) => a.tar - b.tar)
    setTarRates(updated)
    setNewTar('')
    setNewRate('')
  }

  const saveRates = () => {
    saveTarRates(tarRates)
    setRatesSaved(true)
    showToast('Tar rate master table saved successfully')
    setTimeout(() => setRatesSaved(false), 3000)
  }

  // ── Party-wise weights ───────────────────────────────────────────────────
  const [parties, setParties] = useState<Party[]>([])
  const [partyLoading, setPartyLoading] = useState(true)
  const [partyEdits, setPartyEdits] = useState<Record<string, { rola: string; bigRola: string }>>({})
  const [savingParties, setSavingParties] = useState(false)

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

  useEffect(() => {
    void loadParties()
  }, [loadParties])

  const saveAllParties = async () => {
    setSavingParties(true)
    try {
      for (const p of parties) {
        const e = partyEdits[p.id]
        if (e) {
          await updateParty(p.id, {
            default_rola_weight_g: e.rola ? parseInt(e.rola, 10) : null,
          })
          savePartyBigRolaWeight(p.id, e.bigRola ? parseInt(e.bigRola, 10) : null)
        }
      }
      setPartiesSaved(true)
      showToast('All party overrides saved successfully')
      setTimeout(() => setPartiesSaved(false), 3000)
    } catch (err) {
      console.error('Error saving party overrides:', err)
      showToast('Failed to save party overrides')
    } finally {
      setSavingParties(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <PageHeader
        title="System Settings"
        description="Configure global tare deduction standards, tar pricing masters, and client-specific overrides"
      />

      {/* ── Sub-Navigation Tabs ───────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200/80 no-scrollbar">
        {[
          { id: 'weights', label: 'Default Weights & Tare', icon: Scale },
          { id: 'tar', label: 'Tar Pricing Master', icon: IndianRupee },
          { id: 'parties', label: 'Party-wise Overrides', icon: Users, count: parties.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab 1: Default Weights & Tare ───────────────────────────── */}
      {activeTab === 'weights' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Default Tare Deductions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Baseline tare deduction standards applied automatically across all receiving and dispatch entries.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {/* Normal Rola Weight */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
              <div>
                <span className="text-[14px] font-bold text-slate-800 tracking-tight">
                  Normal Rola Weight
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standard tare deducted per Kasab rola during inward receipt (default: 200g).
                </p>
              </div>
              <div className="flex w-full sm:w-44 rounded-xl shadow-xs border border-slate-200 overflow-hidden focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-800/10 transition-all bg-white">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={rolaWeight}
                  onChange={(e) => setRolaWeight(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="200"
                  className="w-full h-10 px-3 text-sm font-bold text-slate-900 focus:outline-none tabular-nums text-right"
                />
                <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-500 bg-slate-50 border-l border-slate-200 select-none shrink-0">
                  grams
                </span>
              </div>
            </div>

            {/* Big Rola Weight */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
              <div>
                <span className="text-[14px] font-bold text-slate-800 tracking-tight">
                  Big Rola Weight
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tare deducted for oversized/heavy rolas detected or specified (default: 250g).
                </p>
              </div>
              <div className="flex w-full sm:w-44 rounded-xl shadow-xs border border-slate-200 overflow-hidden focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-800/10 transition-all bg-white">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={bigRolaWeight}
                  onChange={(e) => setBigRolaWeight(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="250"
                  className="w-full h-10 px-3 text-sm font-bold text-slate-900 focus:outline-none tabular-nums text-right"
                />
                <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-500 bg-slate-50 border-l border-slate-200 select-none shrink-0">
                  grams
                </span>
              </div>
            </div>

            {/* Bungri Weight */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
              <div>
                <span className="text-[14px] font-bold text-slate-800 tracking-tight">
                  Bungri Weight
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standard tare per empty wooden/plastic core spindle (default: 70g).
                </p>
              </div>
              <div className="flex w-full sm:w-44 rounded-xl shadow-xs border border-slate-200 overflow-hidden focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-800/10 transition-all bg-white">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={bungriWeight}
                  onChange={(e) => setBungriWeight(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="70"
                  className="w-full h-10 px-3 text-sm font-bold text-slate-900 focus:outline-none tabular-nums text-right"
                />
                <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-500 bg-slate-50 border-l border-slate-200 select-none shrink-0">
                  grams
                </span>
              </div>
            </div>

            {/* Bori (Bag) Tare */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
              <div>
                <span className="text-[14px] font-bold text-slate-800 tracking-tight">
                  Bori (Bag) Tare
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standard tare weight deducted per jute/HDPE transport bag (default: 100g).
                </p>
              </div>
              <div className="flex w-full sm:w-44 rounded-xl shadow-xs border border-slate-200 overflow-hidden focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-800/10 transition-all bg-white">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={boriWeight}
                  onChange={(e) => setBoriWeight(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="100"
                  className="w-full h-10 px-3 text-sm font-bold text-slate-900 focus:outline-none tabular-nums text-right"
                />
                <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-500 bg-slate-50 border-l border-slate-200 select-none shrink-0">
                  grams
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={saveWeights}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                weightsSaved
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-white bg-slate-900 hover:bg-slate-800 shadow-xs'
              }`}
            >
              {weightsSaved ? <Check size={15} strokeWidth={3} /> : <Save size={15} />}
              <span>{weightsSaved ? 'Saved!' : 'Save Weights'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Tab 2: Tar Pricing Master ─────────────────────────────────── */}
      {activeTab === 'tar' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Tar Rate Master (₹/kg)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Paisa per kg conversion rates based on cord thickness (Tar). Rates apply universally to both S and Z twists.
              </p>
            </div>
            <button
              type="button"
              onClick={saveRates}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto shrink-0 ${
                ratesSaved
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-white bg-slate-900 hover:bg-slate-800 shadow-xs'
              }`}
            >
              {ratesSaved ? <Check size={15} strokeWidth={3} /> : <Save size={15} />}
              <span>{ratesSaved ? 'Saved!' : 'Save Rates'}</span>
            </button>
          </div>

          {/* Tar Rate Table */}
          <div className="rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-5">Tar Specification</th>
                  <th className="py-3 px-5">Rate (₹/kg)</th>
                  <th className="py-3 px-5 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tarRates.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-10 text-xs font-semibold text-slate-400">
                      No tar rates configured. Add a tar specification below.
                    </td>
                  </tr>
                ) : (
                  tarRates.map((r) => (
                    <tr key={r.tar} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3.5 px-5">
                        <span className="font-bold text-[14px] text-slate-900 tracking-tight">
                          {r.tar} Tar
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex w-36 rounded-xl shadow-xs border border-slate-200 overflow-hidden focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-800/10 transition-all bg-white">
                          <span className="inline-flex items-center px-2.5 text-xs font-bold text-slate-500 bg-slate-50 border-r border-slate-200 select-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={r.rate || ''}
                            onChange={(e) => updateRate(r.tar, e.target.value)}
                            className="w-full h-9 px-2 text-xs font-bold text-slate-900 focus:outline-none tabular-nums"
                            placeholder="0"
                          />
                          <span className="inline-flex items-center px-2 text-[11px] font-semibold text-slate-500 bg-slate-50 border-l border-slate-200 select-none">
                            /kg
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => deleteTar(r.tar)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={`Delete ${r.tar} Tar`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add New Tar Card */}
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Add New Tar Rate
            </span>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Tar Number
                </label>
                <div className="flex rounded-xl shadow-xs border border-slate-200 overflow-hidden bg-white focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-800/10">
                  <input
                    type="number"
                    min="1"
                    value={newTar}
                    onChange={(e) => {
                      setNewTar(e.target.value)
                      setAddError('')
                    }}
                    placeholder="e.g. 9"
                    className="w-full h-9 px-3 text-xs font-bold text-slate-900 focus:outline-none tabular-nums"
                  />
                  <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-500 bg-slate-50 border-l border-slate-200 select-none">
                    Tar
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Rate (₹/kg)
                </label>
                <div className="flex rounded-xl shadow-xs border border-slate-200 overflow-hidden bg-white focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-800/10">
                  <span className="inline-flex items-center px-2.5 text-xs font-bold text-slate-500 bg-slate-50 border-r border-slate-200 select-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newRate}
                    onChange={(e) => {
                      setNewRate(e.target.value)
                      setAddError('')
                    }}
                    placeholder="e.g. 22"
                    className="w-full h-9 px-2.5 text-xs font-bold text-slate-900 focus:outline-none tabular-nums"
                  />
                  <span className="inline-flex items-center px-2.5 text-[11px] font-semibold text-slate-500 bg-slate-50 border-l border-slate-200 select-none">
                    /kg
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={addTar}
                className="w-full sm:w-auto h-9 px-4 rounded-xl text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Add Tar</span>
              </button>
            </div>
            {addError && <p className="text-[11px] font-bold text-rose-600 mt-1">{addError}</p>}
          </div>
        </div>
      )}

      {/* ── Tab 3: Party-wise Overrides ───────────────────────────────── */}
      {activeTab === 'parties' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Party-wise Weight Overrides
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Client-specific tare gram deductions. Leave blank to automatically inherit system defaults.
              </p>
            </div>
            <button
              type="button"
              onClick={saveAllParties}
              disabled={savingParties || partyLoading}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto shrink-0 disabled:opacity-50 ${
                partiesSaved
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-white bg-slate-900 hover:bg-slate-800 shadow-xs'
              }`}
            >
              {partiesSaved ? (
                <Check size={15} strokeWidth={3} />
              ) : (
                <Save size={15} />
              )}
              <span>{savingParties ? 'Saving All...' : partiesSaved ? 'Saved All!' : 'Save All Overrides'}</span>
            </button>
          </div>

          {partyLoading ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">
              Loading party profiles…
            </div>
          ) : parties.length === 0 ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">
              No parties registered in system.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4 sm:px-6">Party Account</th>
                      <th className="py-3 px-4">Normal Rola (g)</th>
                      <th className="py-3 px-4">Big Rola (g)</th>
                      <th className="py-3 px-4 text-center">Override Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parties.map((p) => {
                      const e = partyEdits[p.id] || { rola: '', bigRola: '' }
                      const hasOverride = Boolean(e.rola || e.bigRola)

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Party Account */}
                          <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                                {getInitials(p.name)}
                              </div>
                              <div>
                                <span className="font-bold text-[13px] text-slate-900 tracking-tight block">
                                  {p.name}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {p.phone ? `+91 ${p.phone}` : 'Account Master'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Normal Rola Input */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex w-36 rounded-xl shadow-xs border border-slate-200 overflow-hidden focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-800/10 transition-all bg-white">
                              <input
                                type="number"
                                min="1"
                                placeholder={`Default (${rolaWeight}g)`}
                                value={e.rola}
                                onChange={(v) =>
                                  setPartyEdits((prev) => ({
                                    ...prev,
                                    [p.id]: {
                                      ...e,
                                      rola: v.target.value.replace(/[^0-9]/g, ''),
                                    },
                                  }))
                                }
                                className="w-full h-9 px-3 text-xs font-bold text-slate-900 focus:outline-none tabular-nums placeholder:text-slate-400 placeholder:font-normal"
                              />
                              <span className="inline-flex items-center px-2.5 text-[11px] font-semibold text-slate-500 bg-slate-50 border-l border-slate-200 select-none">
                                g
                              </span>
                            </div>
                          </td>

                          {/* Big Rola Input */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex w-36 rounded-xl shadow-xs border border-slate-200 overflow-hidden focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-800/10 transition-all bg-white">
                              <input
                                type="number"
                                min="1"
                                placeholder={`Default (${bigRolaWeight}g)`}
                                value={e.bigRola}
                                onChange={(v) =>
                                  setPartyEdits((prev) => ({
                                    ...prev,
                                    [p.id]: {
                                      ...e,
                                      bigRola: v.target.value.replace(/[^0-9]/g, ''),
                                    },
                                  }))
                                }
                                className="w-full h-9 px-3 text-xs font-bold text-slate-900 focus:outline-none tabular-nums placeholder:text-slate-400 placeholder:font-normal"
                              />
                              <span className="inline-flex items-center px-2.5 text-[11px] font-semibold text-slate-500 bg-slate-50 border-l border-slate-200 select-none">
                                g
                              </span>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {hasOverride ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Custom Override
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Default ({rolaWeight}g / {bigRolaWeight}g)
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="px-4 sm:px-6 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Total Parties: <strong className="text-slate-700">{parties.length}</strong> • Custom Overrides:{' '}
                  <strong className="text-slate-700">
                    {parties.filter((p) => Boolean(partyEdits[p.id]?.rola || partyEdits[p.id]?.bigRola)).length}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={saveAllParties}
                  disabled={savingParties || partyLoading}
                  className="text-xs font-bold text-slate-900 hover:underline cursor-pointer disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
