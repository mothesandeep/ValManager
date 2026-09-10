import { useState, useEffect, useCallback } from 'react'
import { Save, Check, Trash2, Plus } from 'lucide-react'
import { fetchParties, updateParty } from '../lib/queries'
import {
  getGlobalSettings,
  saveGlobalSettings,
  getTarRates,
  saveTarRates,
  type TarRateConfig,
} from '../lib/settings'
import type { Party } from '../types'
import { Button } from '../components/ui/UIComponents'

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
    <div className="flex items-center justify-between gap-4 py-4 border-b border-[var(--color-border-soft)] last:border-0">
      <span className="text-base font-semibold text-[var(--color-ink)]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder={placeholder}
          className="w-24 px-3 py-2 rounded-lg border text-base font-bold text-center text-[var(--color-ink)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]"
          style={{ borderColor: 'var(--color-border)' }}
        />
        <span className="text-sm text-[var(--color-ink-soft)] w-10">{unit}</span>
      </div>
    </div>
  )
}

// ── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border p-5 sm:p-6 space-y-1"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
    >
      <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function Settings() {
  // ── Global weights ───────────────────────────────────────────────────────
  const [rolaWeight, setRolaWeight] = useState('200')
  const [bungriWeight, setBungriWeight] = useState('70')
  const [weightSaved, setWeightSaved] = useState(false)

  useEffect(() => {
    const s = getGlobalSettings()
    setRolaWeight(String(s.defaultRolaGrams))
    setBungriWeight(String(s.defaultBungariGrams))
  }, [])

  const saveWeights = () => {
    const r = parseInt(rolaWeight, 10)
    const b = parseInt(bungriWeight, 10)
    if (!r || !b) return
    saveGlobalSettings({ defaultRolaGrams: r, defaultBungariGrams: b })
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
  const [partyEdits, setPartyEdits] = useState<Record<string, { rola: string; bungri: string }>>({})
  const [partySaved, setPartySaved] = useState<Record<string, boolean>>({})

  const loadParties = useCallback(async () => {
    setPartyLoading(true)
    try {
      const data = await fetchParties()
      setParties(data)
      const edits: Record<string, { rola: string; bungri: string }> = {}
      data.forEach((p) => {
        edits[p.id] = {
          rola: p.default_rola_weight_g != null ? String(p.default_rola_weight_g) : '',
          bungri: p.default_bungari_weight_g != null ? String(p.default_bungari_weight_g) : '',
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
      default_bungari_weight_g: e.bungri ? parseInt(e.bungri, 10) : null,
    })
    setPartySaved((prev) => ({ ...prev, [partyId]: true }))
    setTimeout(() => setPartySaved((prev) => ({ ...prev, [partyId]: false })), 2500)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
          Settings
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">
          Weights aur rates configure karo — dispatch me automatically apply honge.
        </p>
      </div>

      {/* ── 1. Global Weights ─────────────────────────────────────────────── */}
      <Card title="Default Weights">
        <SettingRow
          label="Rola Weight"
          value={rolaWeight}
          onChange={setRolaWeight}
          unit="grams"
          placeholder="200"
        />
        <SettingRow
          label="Bungri Weight"
          value={bungriWeight}
          onChange={setBungriWeight}
          unit="grams"
          placeholder="70"
        />
        <div className="pt-3">
          <Button onClick={saveWeights} className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5">
            {weightSaved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save Weights</>}
          </Button>
        </div>
      </Card>

      {/* ── 2. Tar Rate Table ─────────────────────────────────────────────── */}
      <Card title="Tar Rate (₹/kg)">
        <p className="text-sm text-[var(--color-ink-soft)] mb-4">
          Dispatch me Tar select karo — rate automatic aayega (S aur Z dono ke liye same rate).
        </p>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--color-paper)', borderBottom: '1px solid var(--color-border-soft)' }}>
                <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--color-ink-soft)]">Tar</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--color-ink-soft)]">Rate (₹/kg)</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {tarRates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-sm text-[var(--color-ink-soft)]">
                    Koi Tar nahi hai. "+ Add Tar" se add karo.
                  </td>
                </tr>
              ) : (
                tarRates.map((r, idx) => (
                  <tr
                    key={r.tar}
                    style={{ borderTop: idx > 0 ? '1px solid var(--color-border-soft)' : undefined }}
                  >
                    <td className="px-4 py-3">
                      <span className="text-base font-bold text-[var(--color-ink)]">{r.tar} Tar</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-[var(--color-ink-soft)]">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={r.rate || ''}
                          onChange={(e) => updateRate(r.tar, e.target.value)}
                          className="w-24 px-3 py-2 rounded-lg border text-base font-semibold text-center text-[var(--color-ink)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]"
                          style={{ borderColor: 'var(--color-border)' }}
                          placeholder="0"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => deleteTar(r.tar)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
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

        {/* Add new Tar row */}
        <div className="pt-4 border-t border-[var(--color-border-soft)] mt-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--color-ink-soft)]">Tar (number)</label>
              <input
                type="number"
                min="1"
                value={newTar}
                onChange={(e) => { setNewTar(e.target.value); setAddError('') }}
                placeholder="e.g. 9"
                className="w-24 px-3 py-2.5 rounded-lg border text-base font-semibold text-center text-[var(--color-ink)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]"
                style={{ borderColor: addError ? '#ef4444' : 'var(--color-border)' }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--color-ink-soft)]">Rate (₹/kg)</label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-[var(--color-ink-soft)]">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newRate}
                  onChange={(e) => { setNewRate(e.target.value); setAddError('') }}
                  placeholder="e.g. 22"
                  className="w-24 px-3 py-2.5 rounded-lg border text-base font-semibold text-center text-[var(--color-ink)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]"
                  style={{ borderColor: addError ? '#ef4444' : 'var(--color-border)' }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addTar}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--color-brass)]/10 text-[var(--color-brass)] border border-[var(--color-brass)]/40 hover:bg-[var(--color-brass)]/20 transition-colors cursor-pointer"
            >
              <Plus size={16} /> Add Tar
            </button>
          </div>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
        </div>

        <div className="pt-3">
          <Button onClick={saveRates} className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5">
            {ratesSaved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save Rates</>}
          </Button>
        </div>
      </Card>

      {/* ── 3. Party-wise weights (optional overrides) ─────────────────────── */}
      <Card title="Party-wise Weights (Optional)">
        <p className="text-sm text-[var(--color-ink-soft)] mb-4">
          Kisi party ka weight alag hai toh yahan set karo. Khaali rahega toh default weight lagega.
        </p>

        {partyLoading ? (
          <p className="text-sm text-[var(--color-ink-soft)] py-4">Loading...</p>
        ) : parties.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-soft)] py-4">Koi party nahi mili. Pehle party add karo.</p>
        ) : (
          <div className="space-y-0">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-[var(--color-ink-soft)] uppercase tracking-wide bg-[var(--color-paper)] rounded-lg mb-2">
              <div className="col-span-4">Party</div>
              <div className="col-span-3 text-center">Rola (g)</div>
              <div className="col-span-3 text-center">Bungri (g)</div>
              <div className="col-span-2" />
            </div>

            {parties.map((p) => {
              const e = partyEdits[p.id] || { rola: '', bungri: '' }
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center px-3 py-3 rounded-xl"
                  style={{ borderBottom: '1px solid var(--color-border-soft)' }}
                >
                  {/* Party name */}
                  <div className="sm:col-span-4">
                    <span className="font-semibold text-[var(--color-ink)]">{p.name}</span>
                  </div>

                  {/* Rola */}
                  <div className="sm:col-span-3 flex items-center gap-2 sm:justify-center">
                    <label className="text-xs text-[var(--color-ink-soft)] sm:hidden">Rola:</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Default"
                      value={e.rola}
                      onChange={(v) =>
                        setPartyEdits((prev) => ({ ...prev, [p.id]: { ...e, rola: v.target.value.replace(/[^0-9]/g, '') } }))
                      }
                      className="w-24 px-2 py-1.5 rounded-lg border text-sm font-semibold text-center text-[var(--color-ink)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                    <span className="text-xs text-[var(--color-ink-soft)]">g</span>
                  </div>

                  {/* Bungri */}
                  <div className="sm:col-span-3 flex items-center gap-2 sm:justify-center">
                    <label className="text-xs text-[var(--color-ink-soft)] sm:hidden">Bungri:</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Default"
                      value={e.bungri}
                      onChange={(v) =>
                        setPartyEdits((prev) => ({ ...prev, [p.id]: { ...e, bungri: v.target.value.replace(/[^0-9]/g, '') } }))
                      }
                      className="w-24 px-2 py-1.5 rounded-lg border text-sm font-semibold text-center text-[var(--color-ink)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                    <span className="text-xs text-[var(--color-ink-soft)]">g</span>
                  </div>

                  {/* Save */}
                  <div className="sm:col-span-2 flex justify-start sm:justify-end">
                    <button
                      type="button"
                      onClick={() => saveParty(p.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-brass)] text-white hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      {partySaved[p.id] ? <><Check size={13} /> Saved</> : <><Save size={13} /> Save</>}
                    </button>
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
