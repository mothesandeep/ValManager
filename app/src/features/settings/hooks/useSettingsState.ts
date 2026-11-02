import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/context/ToastContext'
import type { Party } from '@/features/parties/types'
import { fetchParties, updateParty } from '@/services/api/parties'
import {
  getGlobalSettings,
  saveGlobalSettings,
  getCompanySettings,
  saveCompanySettings,
  getTarRates,
  saveTarRates,
  getPartyBigRolaMap,
  savePartyBigRolaWeight,
  type CompanySettings,
  type TarRateConfig,
} from '@/features/settings/utils'

export function useSettingsState() {
  const { showToast } = useToast()

  // Save feedback states
  const [companySaved, setCompanySaved] = useState(false)
  const [weightsSaved, setWeightsSaved] = useState(false)
  const [ratesSaved, setRatesSaved] = useState(false)
  const [partiesSaved, setPartiesSaved] = useState(false)
  const [isSavingAll, setIsSavingAll] = useState(false)
  const [allSaved, setAllSaved] = useState(false)

  // Company State
  const [company, setCompany] = useState<CompanySettings>(() => getCompanySettings())
  const handleSaveCompany = () => {
    saveCompanySettings(company)
    setCompanySaved(true)
    showToast('Company details & unit standards saved successfully')
    setTimeout(() => setCompanySaved(false), 3000)
  }

  // Global Weights State
  const [rolaWeight, setRolaWeight] = useState(() => {
    const s = getGlobalSettings()
    return String(s.defaultRolaGrams <= 10 ? 200 : s.defaultRolaGrams)
  })
  const [bigRolaWeight, setBigRolaWeight] = useState(() => String(getGlobalSettings().defaultBigRolaGrams || 250))
  const [bungriWeight, setBungriWeight] = useState(() => String(getGlobalSettings().defaultBungariGrams || 70))
  const [boriWeight, setBoriWeight] = useState(() => String(getGlobalSettings().defaultBoriGrams || 100))

  const handleSaveWeights = () => {
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

  // Tar Rates State
  const [tarRates, setTarRates] = useState<TarRateConfig[]>(() => getTarRates())
  const handleSaveRates = () => {
    saveTarRates(tarRates)
    setRatesSaved(true)
    showToast('Tar rate master table saved successfully')
    setTimeout(() => setRatesSaved(false), 3000)
  }

  // Party Overrides State
  const [parties, setParties] = useState<Party[]>([])
  const [partyLoading, setPartyLoading] = useState(true)
  const [partyEdits, setPartyEdits] = useState<Record<string, { rola: string; bigRola: string }>>({})
  const [savingParties, setSavingParties] = useState(false)

  const loadParties = useCallback(async () => {
    setPartyLoading(true)
    try {
      const data = await fetchParties()
      if (Array.isArray(data)) {
        setParties(data)
        const bigMap = getPartyBigRolaMap() || {}
        const edits: Record<string, { rola: string; bigRola: string }> = {}
        data.forEach((p) => {
          if (p && p.id) {
            edits[p.id] = {
              rola: p.default_rola_weight_g != null ? String(p.default_rola_weight_g) : '',
              bigRola: bigMap[p.id] ? String(bigMap[p.id]) : '',
            }
          }
        })
        setPartyEdits(edits)
      }
    } catch (err) {
      console.warn('[SettingsPage] Error loading parties:', err)
    } finally {
      setPartyLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadParties()
  }, [loadParties])

  const handleSaveAllParties = async () => {
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
    } catch {
      showToast('Failed to save party overrides')
    } finally {
      setSavingParties(false)
    }
  }

  // Dirty state tracking for floating save bar
  const [initialSnapshot, setInitialSnapshot] = useState<string>('')
  useEffect(() => {
    if (!partyLoading && !initialSnapshot) {
      setInitialSnapshot(
        JSON.stringify({ company, rolaWeight, bigRolaWeight, bungriWeight, boriWeight, tarRates, partyEdits })
      )
    }
  }, [partyLoading, initialSnapshot, company, rolaWeight, bigRolaWeight, bungriWeight, boriWeight, tarRates, partyEdits])

  const currentSnapshot = JSON.stringify({ company, rolaWeight, bigRolaWeight, bungriWeight, boriWeight, tarRates, partyEdits })
  const isDirty = Boolean(initialSnapshot && currentSnapshot !== initialSnapshot)

  const handleSaveAll = async () => {
    setIsSavingAll(true)
    try {
      handleSaveCompany()
      handleSaveWeights()
      handleSaveRates()
      await handleSaveAllParties()
      setInitialSnapshot(currentSnapshot)
      setAllSaved(true)
      showToast('All system settings saved successfully')
      setTimeout(() => setAllSaved(false), 2500)
    } catch {
      showToast('Failed to save some settings')
    } finally {
      setIsSavingAll(false)
    }
  }

  const handleDiscardChanges = () => {
    if (!initialSnapshot) return
    try {
      const snap = JSON.parse(initialSnapshot)
      if (snap.company) setCompany(snap.company)
      if (snap.rolaWeight) setRolaWeight(snap.rolaWeight)
      if (snap.bigRolaWeight) setBigRolaWeight(snap.bigRolaWeight)
      if (snap.bungriWeight) setBungriWeight(snap.bungriWeight)
      if (snap.boriWeight) setBoriWeight(snap.boriWeight)
      if (snap.tarRates) setTarRates(snap.tarRates)
      if (snap.partyEdits) setPartyEdits(snap.partyEdits)
      showToast('All unsaved modifications discarded', 'info')
    } catch {
      // noop
    }
  }

  return {
    company,
    setCompany,
    companySaved,
    handleSaveCompany,
    rolaWeight,
    setRolaWeight,
    bigRolaWeight,
    setBigRolaWeight,
    bungriWeight,
    setBungriWeight,
    boriWeight,
    setBoriWeight,
    weightsSaved,
    handleSaveWeights,
    tarRates,
    setTarRates,
    ratesSaved,
    handleSaveRates,
    parties,
    partyLoading,
    partyEdits,
    setPartyEdits,
    partiesSaved,
    savingParties,
    handleSaveAllParties,
    isDirty,
    allSaved,
    isSavingAll,
    handleSaveAll,
    handleDiscardChanges,
  }
}
