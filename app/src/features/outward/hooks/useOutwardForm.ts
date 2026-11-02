import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '@/hooks/useData'
import { useMonth } from '@/context/MonthContext'
import { useToast } from '@/context/ToastContext'
import { insertParty } from '@/services/api/parties'
import {
  insertDispatches,
  updateDispatch,
  deleteDispatches,
  updateDispatchPartyByChallan,
  updateDispatchDateByChallan,
  type DispatchPayload,
} from '@/services/api/dispatch'
import {
  validateOutwardChallanRecord,
  checkDuplicateOutwardChallan,
} from '@/features/outward/sheets/NewDispatchModal'
import {
  saveDispatchManualDraft,
  loadDispatchManualDraft,
  clearDispatchManualDraft,
  loadScannerDraftSync,
  isScannerDraftDirty,
  registerAppBackgroundListener,
} from '@/services/storage/challanDraftStorage'
import { clearModalHash } from '@/components/sheets/bottomSheetPhysics'
import {
  resolvePartyBungariWeight,
  getTarRate,
  getTarRates,
} from '@/features/settings/utils'
import { distributeDispatchSettlement } from '@/features/outward/utils/calculations'
import { saveChallanImageOffline } from '@/services/storage/db'
import { resolvePartyMatch } from '@/features/parties/utils'
import { parseChallanDate, type ExtractedChallanData, type OutwardBagExtraction } from '@/services/aiScanner'
import { useInModalChallanScan, type AttachedChallanPhoto } from '@/features/scanner/useInModalChallanScan'
import type { DispatchWithParty } from '@/features/outward/types'
import type { Party } from '@/features/parties/types'
import type { BagItem } from '@/features/outward/components/DispatchEntriesList'
import type { ChallanFormData, OutwardFormData } from '@/features/inward/sheets/InwardScannerSheet'
import { extractErrorMessage } from '@/utils/format'
import { todayStr } from '@/utils/date'

export interface FormHeader {
  partyId: string
  date: string
  dispatchType: 'Val' | 'Rola'
  challanNo: string
}

export function useOutwardForm() {
  const [searchParams] = useSearchParams()
  const { selectedMonth, setSelectedMonth } = useMonth()
  const { showToast } = useToast()
  const { dispatches, parties, refreshData } = useData()

  const savedRates = getTarRates()
  const availableTarOptions = savedRates.map((r) => r.tar).sort((a, b) => a - b)

  const defaultTarForNewBag = useCallback((): string => {
    if (savedRates.some((r) => r.tar === 10)) return '10'
    if (savedRates.some((r) => r.tar === 8)) return '8'
    if (savedRates.length > 0) return String(savedRates[0].tar)
    return '10'
  }, [savedRates])

  const createBlankBag = useCallback(
    (defaultTar: string = defaultTarForNewBag(), defaultTwist: 'S' | 'Z' | 'S+Z' = 'S'): BagItem => ({
      id: crypto.randomUUID(),
      gross: '',
      bungariCount: '',
      rolaCount: '',
      tar: defaultTar,
      twistType: defaultTwist,
    }),
    [defaultTarForNewBag]
  )

  const initialDraft = loadDispatchManualDraft()

  const [isOpen, setIsOpen] = useState(initialDraft?.isOpen ?? false)
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(initialDraft?.editingId ?? null)
  const [originalPartyId, setOriginalPartyId] = useState<string | null>(null)
  const [originalBagIds, setOriginalBagIds] = useState<string[]>([])
  const [highlightedBagId, setHighlightedBagId] = useState<string | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [initialEditSnapshot, setInitialEditSnapshot] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    const scannerDraft = loadScannerDraftSync('OUTWARD')
    if (scannerDraft && scannerDraft.isModalOpen && isScannerDraftDirty(scannerDraft)) {
      setIsScanModalOpen(true)
    }
  }, [])

  const [header, setHeader] = useState<FormHeader>(
    initialDraft
      ? {
        partyId: initialDraft.header.partyId,
        date: initialDraft.header.date,
        dispatchType: initialDraft.header.dispatchType,
        challanNo: initialDraft.header.challanNo,
      }
      : {
        partyId: '',
        date: todayStr(),
        dispatchType: 'Val',
        challanNo: '',
      }
  )

  const [rememberedBungariWeight, setRememberedBungariWeight] = useState<string>(
    initialDraft?.rememberedBungariWeight ?? '70'
  )

  const [valBags, setValBags] = useState<BagItem[]>(
    initialDraft?.valBags && initialDraft.valBags.length > 0
      ? (initialDraft.valBags as BagItem[])
      : [createBlankBag()]
  )
  const [rolaBags, setRolaBags] = useState<BagItem[]>(
    initialDraft?.rolaBags && initialDraft.rolaBags.length > 0
      ? (initialDraft.rolaBags as BagItem[])
      : [createBlankBag()]
  )

  const [attachedReceiptPhoto, setAttachedReceiptPhoto] = useState<AttachedChallanPhoto | null>(null)
  const [manualTotalAmount, setManualTotalAmount] = useState<string | null>(null)
  const [notes, setNotes] = useState<string>('')

  const handleOutwardAutofill = useCallback(
    (extracted: ExtractedChallanData, matchedParty: Party | null, photo: AttachedChallanPhoto) => {
      if (matchedParty) {
        setHeader((prev) => ({ ...prev, partyId: matchedParty.id }))
        const bungariWeight = resolvePartyBungariWeight(matchedParty)
        setRememberedBungariWeight(String(bungariWeight))
      }

      const chNo = extracted.outward_data?.challan_no || extracted.challan_no || extracted.challanNo
      if (chNo) setHeader((prev) => ({ ...prev, challanNo: String(chNo) }))

      const rawDate = extracted.outward_data?.date || extracted.date
      if (rawDate) {
        const parsed = parseChallanDate(rawDate)
        if (parsed) setHeader((prev) => ({ ...prev, date: parsed }))
      }

      const isRolaType = extracted.outward_data?.dispatch_type === 'ROLA_EMPTY'
      setHeader((prev) => ({ ...prev, dispatchType: isRolaType ? 'Rola' : 'Val' }))

      const extractedValBags =
        extracted.outward_data?.val_bags && extracted.outward_data.val_bags.length > 0
          ? extracted.outward_data.val_bags
          : extracted.outward_data?.bags && extracted.outward_data.bags.length > 0
            ? extracted.outward_data.bags
            : extracted.val_bags && extracted.val_bags.length > 0
              ? extracted.val_bags
              : ((extracted.bags as OutwardBagExtraction[]) || [])

      const defaultTar = extracted.outward_data?.default_tar || defaultTarForNewBag()
      const defaultTwist = extracted.outward_data?.default_twist || 'S'

      if (extractedValBags.length > 0) {
        const mappedValBags: BagItem[] = extractedValBags.map((b) => {
          const grossVal = b.gross || b.gross_weight || b.gross_kg
          let bungariVal =
            b.bungari != null && Number(b.bungari) > 0
              ? String(b.bungari)
              : b.bungari_pcs != null && Number(b.bungari_pcs) > 0
                ? String(b.bungari_pcs)
                : ''
          const rolaVal = (b as unknown as Record<string, unknown>).rola ?? (b as unknown as Record<string, unknown>).rola_count ?? ''
          const tarVal = b.tar || b.tar_rate || defaultTar
          const cleanTar = String(tarVal).match(/\d+/)?.[0] || '10'
          const twistVal = b.twist || b.twistType || defaultTwist
          return {
            id: crypto.randomUUID(),
            gross: grossVal !== undefined && grossVal !== null ? String(grossVal) : '',
            bungariCount: bungariVal,
            rolaCount: rolaVal !== undefined && rolaVal !== null ? String(rolaVal) : '',
            tar: cleanTar,
            twistType: twistVal === 'Z' || twistVal === 'S+Z' ? twistVal : 'S',
          }
        })
        setValBags(mappedValBags)
      }

      const rawEmptyRola =
        extracted.outward_data?.empty_rola_bags && extracted.outward_data.empty_rola_bags.length > 0
          ? extracted.outward_data.empty_rola_bags
          : extracted.empty_rola_bags && extracted.empty_rola_bags.length > 0
            ? extracted.empty_rola_bags
            : []

      if (rawEmptyRola && rawEmptyRola.length > 0) {
        const cleanRolaList = rawEmptyRola
          .filter((r: { is_total?: boolean; description?: string }) => !r.is_total && !String(r.description || '').toLowerCase().includes('total'))
          .map((r: { gross?: string | number; gross_kg?: string | number; rola?: string | number; rola_count?: string | number }) => ({
            id: crypto.randomUUID(),
            gross: r.gross != null ? String(r.gross) : r.gross_kg != null ? String(r.gross_kg) : '',
            bungariCount: '',
            rolaCount: r.rola != null ? String(r.rola) : r.rola_count != null ? String(r.rola_count) : '',
            tar: '10',
            twistType: 'S' as const,
          }))
        if (cleanRolaList.length > 0) setRolaBags(cleanRolaList)
      }

      setAttachedReceiptPhoto(photo)
    },
    [defaultTarForNewBag]
  )

  const {
    isScanning,
    scanningStatus,
    triggerScan,
    fileInputRef,
    handleFileInputChange,
    clearAttachedPhoto,
  } = useInModalChallanScan({
    challanType: 'OUTWARD',
    parties,
    onScanSuccess: handleOutwardAutofill,
  })

  // Draft persistence
  const persistManualDraft = useCallback(() => {
    if (!isOpen || editingId) return
    const isDirty =
      header.challanNo.trim().length > 0 ||
      valBags.some((b) => b.gross.trim().length > 0 || b.bungariCount.trim().length > 0) ||
      valBags.length > 1 ||
      rolaBags.some((b) => b.gross.trim().length > 0) ||
      rolaBags.length > 1
    if (isDirty) {
      saveDispatchManualDraft({
        isOpen,
        editingId,
        header,
        rememberedBungariWeight,
        valBags,
        rolaBags,
        savedAt: Date.now(),
      })
    } else {
      clearDispatchManualDraft()
    }
  }, [isOpen, editingId, header, rememberedBungariWeight, valBags, rolaBags])

  useEffect(() => {
    if (!isOpen) {
      clearDispatchManualDraft()
      return
    }
    const t = window.setTimeout(persistManualDraft, 300)
    return () => window.clearTimeout(t)
  }, [isOpen, persistManualDraft])

  useEffect(() => {
    if (!isOpen || editingId) return
    return registerAppBackgroundListener(persistManualDraft)
  }, [isOpen, editingId, persistManualDraft])

  useEffect(() => {
    if (!header.partyId && parties.length > 0) {
      const firstParty = parties[0]
      setHeader((prev) => ({ ...prev, partyId: prev.partyId || firstParty.id }))
      setRememberedBungariWeight((prev) => prev || String(resolvePartyBungariWeight(firstParty)))
    }
  }, [parties, header.partyId])

  const handlePartyChange = (partyId: string) => {
    setHeader((prev) => ({ ...prev, partyId }))
    const party = parties.find((p) => p.id === partyId)
    if (party) {
      setRememberedBungariWeight(String(resolvePartyBungariWeight(party)))
    }
  }

  const addBag = useCallback(() => {
    if (header.dispatchType === 'Val') {
      const lastBag = valBags[valBags.length - 1]
      const nextTar = lastBag ? lastBag.tar : defaultTarForNewBag()
      const nextTwist = lastBag ? lastBag.twistType : 'S'
      setValBags((prev) => [...prev, createBlankBag(nextTar, nextTwist)])
    } else {
      setRolaBags((prev) => [...prev, createBlankBag()])
    }
  }, [header.dispatchType, valBags, defaultTarForNewBag, createBlankBag])

  const removeBag = useCallback(
    (idOrIndex: string | number) => {
      const matchFn = (b: BagItem, idx: number) =>
        typeof idOrIndex === 'string' ? b.id !== idOrIndex : idx !== idOrIndex
      if (header.dispatchType === 'Val') {
        setValBags((prev) => (prev.length <= 1 ? prev : prev.filter(matchFn)))
      } else {
        setRolaBags((prev) => (prev.length <= 1 ? prev : prev.filter(matchFn)))
      }
    },
    [header.dispatchType]
  )

  const updateBag = useCallback(
    (idOrIndex: string | number, field: keyof BagItem, val: string) => {
      const matchFn = (b: BagItem, idx: number) =>
        typeof idOrIndex === 'string' ? b.id === idOrIndex : idx === idOrIndex
      if (header.dispatchType === 'Val') {
        setValBags((prev) => prev.map((b, idx) => (matchFn(b, idx) ? { ...b, [field]: val } : b)))
      } else {
        setRolaBags((prev) => prev.map((b, idx) => (matchFn(b, idx) ? { ...b, [field]: val } : b)))
      }
    },
    [header.dispatchType]
  )

  // Calculations
  const calcValBag = (b: BagItem) => {
    let grossKg = parseFloat(b.gross) || 0
    if (grossKg > 500) grossKg = grossKg / 1000
    const bungariCount = parseInt(b.bungariCount, 10) || 0
    const bungariWeightG = parseInt(rememberedBungariWeight, 10) || 70
    const tareKg = (bungariCount * bungariWeightG) / 1000
    const netKg = Math.max(0, grossKg - tareKg)
    const bagTar = b.tar || defaultTarForNewBag()
    const rate = getTarRate(bagTar)
    const amount = rate > 0 && grossKg > 0 ? Math.round(netKg * rate * 100) / 100 : null
    return {
      bag: b,
      grossKg,
      bungariCount,
      bungariWeightG,
      tareKg,
      netKg,
      rate,
      amount,
      tar: bagTar,
      twistType: b.twistType || 'S',
      rolaCount: 0,
      hasInput: grossKg > 0 || bungariCount > 0,
    }
  }

  const calcRolaBag = (b: BagItem) => {
    let grossKg = parseFloat(b.gross) || 0
    if (grossKg > 500) grossKg = grossKg / 1000
    const rolaCount = parseInt(b.rolaCount, 10) || 0
    return {
      bag: b,
      grossKg,
      bungariCount: 0,
      bungariWeightG: 0,
      tareKg: 0,
      netKg: grossKg,
      rate: 0,
      amount: null,
      tar: '10',
      twistType: 'S' as const,
      rolaCount,
      hasInput: grossKg > 0 || rolaCount > 0,
    }
  }

  const valCalculations = valBags.map(calcValBag)
  const rolaCalculations = rolaBags.map(calcRolaBag)
  const validValBags = valCalculations.filter((b) => b.grossKg > 0)
  const validRolaBags = rolaCalculations.filter((b) => b.grossKg > 0 || b.rolaCount > 0)

  const currentBags = header.dispatchType === 'Val' ? valBags : rolaBags
  const currentBagCalculations = header.dispatchType === 'Val' ? valCalculations : rolaCalculations

  const totalGross = currentBagCalculations.reduce((sum, b) => sum + b.grossKg, 0)
  const totalTare = currentBagCalculations.reduce((sum, b) => sum + b.tareKg, 0)
  const totalNetVal = currentBagCalculations.reduce((sum, b) => sum + b.netKg, 0)
  const autoCalculatedAmount = Math.round(currentBagCalculations.reduce((sum, b) => sum + (b.amount || 0), 0))
  const grandTotalAmount =
    manualTotalAmount !== null && manualTotalAmount.trim() !== '' ? parseFloat(manualTotalAmount) || 0 : autoCalculatedAmount

  const isFormDirty = useMemo(() => {
    if (editingId) {
      if (!initialEditSnapshot) return false
      const currentSnapshot = JSON.stringify({
        partyId: header.partyId,
        date: header.date,
        challanNo: header.challanNo,
        notes,
        manualTotalAmount,
        valBags,
        rolaBags,
      })
      return currentSnapshot !== initialEditSnapshot
    }
    return (
      header.challanNo.trim().length > 0 ||
      notes.trim().length > 0 ||
      valBags.some((b) => b.gross.trim().length > 0 || b.bungariCount.trim().length > 0) ||
      valBags.length > 1 ||
      rolaBags.some((b) => b.gross.trim().length > 0 || b.rolaCount.trim().length > 0) ||
      rolaBags.length > 1
    )
  }, [editingId, initialEditSnapshot, header, notes, manualTotalAmount, valBags, rolaBags])

  const closeForm = () => {
    clearDispatchManualDraft()
    setAttachedReceiptPhoto(null)
    clearAttachedPhoto()
    clearModalHash()
    setManualTotalAmount(null)
    setNotes('')
    setIsOpen(false)
    setEditingId(null)
    setOriginalBagIds([])
    setHighlightedBagId(null)
    setInitialEditSnapshot('')
    setOriginalPartyId(null)
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleRequestClose = () => {
    if (isFormDirty) setShowDiscardConfirm(true)
    else closeForm()
  }

  const duplicateChallan = useMemo(() => {
    return checkDuplicateOutwardChallan(header.challanNo, header.partyId, dispatches, editingId)
  }, [header.challanNo, header.partyId, editingId, dispatches])

  const startAdd = useCallback(() => {
    window.location.hash = 'modal'
    setEditingId(null)
    setAttachedReceiptPhoto(null)
    clearAttachedPhoto()
    const firstParty = parties[0]
    setRememberedBungariWeight(String(resolvePartyBungariWeight(firstParty)))
    setHeader({
      partyId: firstParty?.id || '',
      date: todayStr(),
      dispatchType: 'Val',
      challanNo: '',
    })
    setValBags([createBlankBag()])
    setRolaBags([createBlankBag()])
    setManualTotalAmount(null)
    setNotes('')
    setIsOpen(true)
    setErrorMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [parties, createBlankBag, clearAttachedPhoto])

  const startEdit = (d: DispatchWithParty, allEntries?: DispatchWithParty[], targetBagId?: string) => {
    window.location.hash = 'modal'
    setEditingId(d.id)
    setAttachedReceiptPhoto(null)
    clearAttachedPhoto()

    const challanBags =
      allEntries && allEntries.length > 0
        ? allEntries
        : d.challan_no?.trim()
          ? dispatches.filter((x) => x.party_id === d.party_id && (x.challan_no?.trim() || '') === (d.challan_no?.trim() || ''))
          : [d]

    const valItems = challanBags.filter((x) => x.dispatch_type !== 'Kali' && x.dispatch_type !== 'Rola')
    const rolaItems = challanBags.filter((x) => x.dispatch_type === 'Kali' || x.dispatch_type === 'Rola')

    const mapToBagItem = (item: DispatchWithParty): BagItem => ({
      id: item.id,
      gross: String(item.bore_gross_weight),
      bungariCount: String(item.bungari_count ?? 0),
      rolaCount: String(item.rola_count ?? 0),
      tar: item.cord_count ? String(item.cord_count) : defaultTarForNewBag(),
      twistType: item.twist_type === 'Z' ? 'Z' : item.twist_type === 'S+Z' ? 'S+Z' : 'S',
    })

    const loadedValBags = valItems.map(mapToBagItem)
    const loadedRolaBags = rolaItems.map(mapToBagItem)

    setValBags(loadedValBags.length > 0 ? loadedValBags : [createBlankBag()])
    setRolaBags(loadedRolaBags.length > 0 ? loadedRolaBags : [createBlankBag()])

    setHeader({
      partyId: d.party_id || parties[0]?.id || '',
      date: d.date,
      dispatchType: d.dispatch_type === 'Kali' || d.dispatch_type === 'Rola' ? 'Rola' : loadedValBags.length > 0 ? 'Val' : 'Rola',
      challanNo: d.challan_no || '',
    })

    const existingNotes = d.notes || challanBags.find((x) => x.notes)?.notes || ''
    setNotes(existingNotes)

    const hasAmounts = challanBags.some((item) => item.amount !== null && item.amount !== undefined)
    const totalExistingAmount = hasAmounts ? Math.round(challanBags.reduce((sum, item) => sum + (item.amount || 0), 0)) : null
    setManualTotalAmount(totalExistingAmount !== null ? String(totalExistingAmount) : null)

    setOriginalBagIds(challanBags.map((b) => b.id))
    setHighlightedBagId(targetBagId || d.id)
    setInitialEditSnapshot(
      JSON.stringify({
        partyId: d.party_id,
        date: d.date,
        challanNo: d.challan_no || '',
        notes: existingNotes,
        manualTotalAmount: totalExistingAmount !== null ? String(totalExistingAmount) : null,
        valBags: loadedValBags,
        rolaBags: loadedRolaBags,
      })
    )
    setIsOpen(true)
    setErrorMsg(null)
    setOriginalPartyId(d.party_id || null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async () => {
    if (!header.challanNo?.trim()) {
      setErrorMsg('Challan number is required before saving')
      return
    }
    if (!header.partyId) {
      setErrorMsg('Please select a party')
      return
    }
    if (!header.date) {
      setErrorMsg('Please select a date')
      return
    }

    const outwardValidation = validateOutwardChallanRecord({
      challan_no: header.challanNo,
      party_id: header.partyId,
      val_bags: validValBags.map((v) => ({ grossKg: v.grossKg, tareKg: v.tareKg })),
      rola_bags: validRolaBags.map((r) => ({ grossKg: r.grossKg, rolaCount: r.rolaCount })),
    })

    if (!outwardValidation.isValid) {
      setErrorMsg(outwardValidation.errors[0])
      showToast(outwardValidation.errors[0], 'error')
      return
    }

    if (duplicateChallan) {
      const confirmed = window.confirm(
        `Challan #${header.challanNo.trim()} is already recorded for this party on ${duplicateChallan.date}.\n\nDo you want to proceed and save with this duplicate challan number?`
      )
      if (!confirmed) {
        setErrorMsg(`Challan #${header.challanNo.trim()} already exists for this party.`)
        return
      }
    }

    if (validValBags.length === 0 && validRolaBags.length === 0) {
      setErrorMsg('Please enter weight for at least one bag in Val or Rola')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    try {
      const challanImage = attachedReceiptPhoto?.previewUrl || null
      const safeDate = parseChallanDate(header.date) || header.date || todayStr()
      if (attachedReceiptPhoto?.base64 && header.challanNo) {
        void saveChallanImageOffline({
          id: `dispatch_${header.challanNo}_${safeDate}`,
          challan_no: header.challanNo,
          date: safeDate,
          base64: attachedReceiptPhoto.base64,
        }).catch(() => { })
      }

      let valPayloads: DispatchPayload[] = []
      if (validValBags.length > 0) {
        if (manualTotalAmount !== null && manualTotalAmount.trim() !== '') {
          const targetTotal = parseFloat(manualTotalAmount) || 0
          const distributed = distributeDispatchSettlement({
            dispatchType: 'Val',
            bags: validValBags.map((v) => ({
              grossKg: v.grossKg,
              bungariCount: v.bungariCount,
              bungariWeightG: v.bungariWeightG,
              tar: parseInt(v.tar, 10) || 10,
              rate: v.rate,
              twistType: v.twistType,
              tareKg: v.tareKg,
              netKg: v.netKg,
              amount: v.amount ?? undefined,
            })),
            grandTotalAmount: targetTotal,
          })
          valPayloads = distributed.map((d) => ({
            party_id: header.partyId,
            date: safeDate,
            dispatch_type: 'Val',
            challan_no: header.challanNo.trim() || null,
            cord_count: d.tar,
            twist_type: d.twistType,
            bungari_count: d.bungariCount,
            bungari_weight_g: d.bungariWeightG,
            bore_gross_weight: d.grossKg,
            net_val_weight: d.netKg,
            rate_per_kg: d.rate,
            amount: d.amount,
            rola_count: 0,
            image_url: challanImage,
            challan_image: challanImage,
            notes: notes.trim() || null,
          }))
        } else {
          valPayloads = validValBags.map((v) => ({
            party_id: header.partyId,
            date: safeDate,
            dispatch_type: 'Val',
            challan_no: header.challanNo.trim() || null,
            cord_count: parseInt(v.tar, 10) || null,
            twist_type: v.twistType,
            bungari_count: v.bungariCount,
            bungari_weight_g: v.bungariWeightG,
            bore_gross_weight: v.grossKg,
            net_val_weight: v.netKg,
            rate_per_kg: v.rate,
            amount: v.amount,
            rola_count: 0,
            image_url: challanImage,
            challan_image: challanImage,
            notes: notes.trim() || null,
          }))
        }
      }

      const rolaPayloads: DispatchPayload[] = validRolaBags.map((r) => ({
        party_id: header.partyId,
        date: safeDate,
        dispatch_type: 'Rola',
        challan_no: header.challanNo.trim() || null,
        cord_count: null,
        twist_type: null,
        bungari_count: 0,
        bungari_weight_g: null,
        bore_gross_weight: r.grossKg,
        net_val_weight: null,
        rate_per_kg: null,
        amount: null,
        rola_count: r.rolaCount,
        image_url: challanImage,
        challan_image: challanImage,
        notes: notes.trim() || null,
      }))

      if (editingId) {
        const payloadsToSave = [...valPayloads, ...rolaPayloads]
        const existingToUpdate = payloadsToSave.slice(0, originalBagIds.length)
        const newToInsert = payloadsToSave.slice(originalBagIds.length)

        for (let i = 0; i < existingToUpdate.length; i++) {
          await updateDispatch(originalBagIds[i], existingToUpdate[i])
        }
        if (newToInsert.length > 0) {
          await insertDispatches(newToInsert)
        }
        if (originalBagIds.length > payloadsToSave.length) {
          const toDelete = originalBagIds.slice(payloadsToSave.length)
          await deleteDispatches(toDelete)
        }

        const challanNo = header.challanNo.trim()
        if (originalPartyId && originalPartyId !== header.partyId && challanNo) {
          await updateDispatchPartyByChallan(challanNo, header.partyId, editingId, originalPartyId)
        }
        const originalDate = dispatches.find((d) => d.id === editingId)?.date
        if (originalDate && originalDate !== header.date && challanNo) {
          await updateDispatchDateByChallan(challanNo, header.date, editingId, header.partyId)
        }
        showToast('Dispatch challan updated successfully', 'success')
      } else {
        await insertDispatches([...valPayloads, ...rolaPayloads])
        showToast('Dispatch challan recorded successfully', 'success')
      }

      const targetMonth = safeDate.slice(0, 7)
      if (selectedMonth !== 'all' && selectedMonth !== targetMonth) {
        setSelectedMonth(targetMonth)
      }

      clearDispatchManualDraft()
      closeForm()
      await refreshData(['dispatches', 'parties'])
    } catch (err: unknown) {
      console.error('Save dispatch error:', err)
      const msg = extractErrorMessage(err, 'Failed to save dispatch')
      setErrorMsg(`Could not save dispatch — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleScanConfirmSave = async (data: ChallanFormData) => {
    const outward = data as OutwardFormData
    try {
      let partyId = outward.party_id
      const partyName = (outward.party_name || '').trim()

      if (!partyId && partyName) {
        const matched = resolvePartyMatch(parties, partyName)
        if (matched) {
          partyId = matched.id
        } else {
          try {
            const newParty = await insertParty({ name: partyName })
            partyId = newParty.id
            await refreshData(['parties'])
          } catch (partyErr) {
            console.warn('Fallback to first party:', partyErr)
            partyId = parties[0]?.id
          }
        }
      }

      if (!partyId && parties.length > 0) partyId = parties[0].id
      if (!partyId) throw new Error('Please select or specify a valid party name.')

      const challanNo = (outward.challan_no || '').trim()
      if (!challanNo) throw new Error('Challan number is required before saving')

      const challanImage = outward.image_url || outward.challan_image || outward.image_preview || outward.image_data || null
      if (challanImage && challanNo) {
        void saveChallanImageOffline({
          id: `dispatch-${challanNo}-${Date.now()}`,
          challan_no: challanNo,
          date: outward.date || todayStr(),
          base64: challanImage.startsWith('data:') ? challanImage : undefined,
          public_url: challanImage.startsWith('http') ? challanImage : undefined,
        }).catch(() => { })
      }

      const selectedParty = parties.find((p) => p.id === partyId)
      const bungariWeight = resolvePartyBungariWeight(selectedParty)
      const payloadsToInsert: DispatchPayload[] = []

      const valBagsToProcess =
        outward.val_bags && outward.val_bags.length > 0 ? outward.val_bags : outward.dispatch_type === 'Val' && outward.bags ? outward.bags : []
      const rolaBagsToProcess =
        outward.rola_bags && outward.rola_bags.length > 0 ? outward.rola_bags : outward.dispatch_type === 'Rola' && outward.bags ? outward.bags : []

      if (valBagsToProcess.length > 0) {
        const distributed = distributeDispatchSettlement({
          dispatchType: 'Val',
          defaultBungariWeightG: bungariWeight,
          bags: valBagsToProcess.map((b) => ({
            grossKg: parseFloat(b.gross) || 0,
            bungariCount: parseInt(b.bungariCount, 10) || 0,
            bungariWeightG: bungariWeight,
            rolaCount: parseInt(b.rolaCount || '0', 10) || 0,
            tar: parseInt(b.tar, 10) || 10,
            rate: b.rate !== undefined && b.rate > 0 ? b.rate : getTarRate(parseInt(b.tar, 10) || 10),
            twistType: b.twistType || 'S',
            tareKg: b.tareKg,
            netKg: b.netKg,
            amount: b.amount,
          })),
          totalTareKg: outward.total_tare_kg,
          totalNetValKg: outward.total_net_val_kg,
          grandTotalAmount: outward.grand_total_amount,
        })
        payloadsToInsert.push(
          ...distributed.map((d) => ({
            party_id: partyId!,
            date: outward.date || todayStr(),
            dispatch_type: 'Val' as const,
            challan_no: challanNo || null,
            bore_gross_weight: d.grossKg,
            bungari_count: d.bungariCount,
            bungari_weight_g: d.bungariWeightG,
            rola_count: d.rolaCount,
            cord_count: d.tar,
            twist_type: d.twistType,
            rate_per_kg: d.rate,
            net_val_weight: d.netKg,
            amount: d.amount,
            image_url: challanImage,
            challan_image: challanImage,
          }))
        )
      }

      if (rolaBagsToProcess.length > 0) {
        payloadsToInsert.push(
          ...rolaBagsToProcess
            .filter((b) => (parseFloat(b.gross) || 0) > 0 || (parseInt(b.rolaCount || '0', 10) || 0) > 0)
            .map((b) => ({
              party_id: partyId!,
              date: outward.date || todayStr(),
              dispatch_type: 'Rola' as const,
              challan_no: challanNo || null,
              bore_gross_weight: parseFloat(b.gross) || 0,
              bungari_count: 0,
              bungari_weight_g: null,
              rola_count: parseInt(b.rolaCount || '0', 10) || 0,
              cord_count: null,
              twist_type: null,
              rate_per_kg: null,
              net_val_weight: null,
              amount: null,
              image_url: challanImage,
              challan_image: challanImage,
            }))
        )
      }

      if (payloadsToInsert.length > 0) {
        await insertDispatches(payloadsToInsert)
      }
      showToast(`Challan #${challanNo || '—'} saved successfully!`, 'success')
      await refreshData(['dispatches', 'parties'])
    } catch (err: unknown) {
      console.error('Save scan error:', err)
      const msg = extractErrorMessage(err, 'Failed to save scanned challan.')
      showToast(msg, 'error')
      throw err
    }
  }

  useEffect(() => {
    if (searchParams.get('action') === 'new' && parties.length > 0 && !isOpen && !loadDispatchManualDraft()) {
      startAdd()
    }
  }, [searchParams, parties, isOpen, startAdd])

  return {
    isOpen,
    editingId,
    header,
    setHeader,
    valBags,
    rolaBags,
    currentBags,
    currentBagCalculations,
    availableTarOptions,
    highlightedBagId,
    totalGross,
    totalTare,
    totalNetVal,
    manualTotalAmount,
    setManualTotalAmount,
    autoCalculatedAmount,
    grandTotalAmount,
    notes,
    setNotes,
    saving,
    errorMsg,
    setErrorMsg,
    successMsg,
    duplicateChallan,
    showDiscardConfirm,
    setShowDiscardConfirm,
    isPhotoLightboxOpen,
    setIsPhotoLightboxOpen,
    isScanModalOpen,
    setIsScanModalOpen,
    attachedReceiptPhoto,
    setAttachedReceiptPhoto,
    isScanning,
    scanningStatus,
    triggerScan,
    fileInputRef,
    handleFileInputChange,
    clearAttachedPhoto,
    handlePartyChange,
    addBag,
    removeBag,
    updateBag,
    startAdd,
    startEdit,
    closeForm,
    handleRequestClose,
    submit,
    handleScanConfirmSave,
  }
}
