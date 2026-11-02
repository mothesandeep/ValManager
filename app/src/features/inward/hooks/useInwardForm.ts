import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '@/hooks/useData'
import { useMonth } from '@/context/MonthContext'
import { useToast } from '@/context/ToastContext'
import { insertParty } from '@/services/api/parties'
import {
  insertReceipts,
  updateReceipt,
  deleteReceipts,
  updateReceiptPartyByChallan,
  updateReceiptDateByChallan,
  type ReceiptPayload,
} from '@/services/api/receipts'
import { checkDuplicateInwardChallan } from '@/features/inward/sheets/RecordInwardModal'
import {
  saveInwardManualDraft,
  loadInwardManualDraft,
  clearInwardManualDraft,
  loadScannerDraftSync,
  isScannerDraftDirty,
  registerAppBackgroundListener,
} from '@/services/storage/challanDraftStorage'
import { clearModalHash } from '@/components/sheets/bottomSheetPhysics'
import {
  resolvePartyRolaWeight,
  resolvePartyBigRolaWeight,
  getGlobalSettings,
} from '@/features/settings/utils'
import { resolvePartyMatch } from '@/features/parties/utils'
import { parseChallanDate, type ExtractedChallanData, type InwardBagExtraction } from '@/services/aiScanner'
import { useInModalChallanScan, type AttachedChallanPhoto } from '@/features/scanner/useInModalChallanScan'
import { InwardReceiptFormSchema, formatZodErrors } from '@/lib/validation/schemas'
import { sanitizeNumericInput, sanitizeIntegerInput } from '@/utils/numberInput'
import { todayStr } from '@/utils/date'
import { extractErrorMessage } from '@/utils/format'
import type { Party } from '@/features/parties/types'
import type { ReceiptWithParty } from '@/features/inward/types/inward.types'
import type { ChallanFormData, InwardFormData } from '@/features/inward/sheets/InwardScannerSheet'

export interface BagItem {
  id: string
  gross: string
  rolaCount: string
  perRolaGrams: string
  color: string | null
  twist: 'S' | 'Z' | null
  twistType: 'S' | 'Z' | null
  sizeType: 'Norm' | 'Big'
}

export interface InwardFormHeader {
  partyId: string
  date: string
  challanNo: string
}

const STORAGE_KEY_PER_ROLA = 'kasab_inward_remembered_per_rola'

export function useInwardForm() {
  const [searchParams] = useSearchParams()
  const { selectedMonth, setSelectedMonth } = useMonth()
  const { showToast } = useToast()
  const { receipts, parties, refreshData } = useData()

  const initialManualDraft = loadInwardManualDraft()

  const [isOpen, setIsOpen] = useState(initialManualDraft?.isOpen ?? false)
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(initialManualDraft?.editingId ?? null)
  const [originalPartyId, setOriginalPartyId] = useState<string | null>(null)
  const [originalBagIds, setOriginalBagIds] = useState<string[]>([])
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [initialEditSnapshot, setInitialEditSnapshot] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [highlightedBagId, setHighlightedBagId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const scannerDraft = loadScannerDraftSync('INWARD')
    if (scannerDraft && scannerDraft.isModalOpen && isScannerDraftDirty(scannerDraft)) {
      setIsScanModalOpen(true)
    }
  }, [])

  const [header, setHeader] = useState<InwardFormHeader>(
    initialManualDraft?.header ?? {
      partyId: '',
      date: todayStr(),
      challanNo: '',
    }
  )

  const [rememberedPerRola, setRememberedPerRola] = useState<string>(() => {
    return initialManualDraft?.rememberedPerRola ?? String(getGlobalSettings().defaultRolaGrams)
  })

  const createBlankBag = useCallback(
    (customPerRola?: string): BagItem => ({
      id: crypto.randomUUID(),
      gross: '',
      rolaCount: '',
      perRolaGrams: customPerRola || rememberedPerRola || '200',
      color: null,
      twist: null,
      twistType: null,
      sizeType: 'Norm',
    }),
    [rememberedPerRola]
  )

  const [bags, setBags] = useState<BagItem[]>(
    initialManualDraft?.bags && initialManualDraft.bags.length > 0
      ? (initialManualDraft.bags as BagItem[])
      : [createBlankBag()]
  )

  const [attachedReceiptPhoto, setAttachedReceiptPhoto] = useState<AttachedChallanPhoto | null>(null)
  const [tareOverride, setTareOverride] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const handleInwardAutofill = useCallback(
    (extracted: ExtractedChallanData, matchedParty: Party | null, photo: AttachedChallanPhoto) => {
      if (matchedParty) {
        setHeader((prev) => ({ ...prev, partyId: matchedParty.id }))
        setRememberedPerRola(String(resolvePartyRolaWeight(matchedParty)))
      }
      if (extracted.challan_no) {
        setHeader((prev) => ({ ...prev, challanNo: String(extracted.challan_no) }))
      }
      if (extracted.date) {
        const parsed = parseChallanDate(extracted.date)
        if (parsed) setHeader((prev) => ({ ...prev, date: parsed }))
      }

      const party = matchedParty || parties.find((p) => p.id === header.partyId) || parties[0]
      const normWeight = resolvePartyRolaWeight(party)
      const bigWeight = resolvePartyBigRolaWeight(party)

      const extractedBags = extracted.inward_data?.bags || (extracted.bags as InwardBagExtraction[]) || []
      if (extractedBags.length > 0) {
        const mappedBags: BagItem[] = extractedBags.map((b) => {
          const isBig =
            (b as { spool_type?: string; rolaType?: string; sizeType?: string; color?: string; description?: string; quality?: string }).spool_type === 'BIG' ||
            b.rolaType === 'BIG' ||
            b.sizeType === 'Big' ||
            /મોટા|mota|mote|big/i.test(String(b.color || '') + ' ' + String((b as Record<string, unknown>).description || '') + ' ' + String((b as Record<string, unknown>).quality || ''))
          const perRola = isBig ? String(bigWeight) : String(normWeight)
          const grossVal = b.gross ?? b.gross_weight ?? b.gross_kg
          const rolaVal = b.rola ?? b.rola_count
          const twistVal = b.twist === 'Z' || b.twistType === 'Z' ? 'Z' : b.twist === 'S' || b.twistType === 'S' ? 'S' : null
          const colorVal = b.color && typeof b.color === 'string' && b.color.trim() ? b.color.trim() : null
          return {
            id: crypto.randomUUID(),
            gross: grossVal !== undefined && grossVal !== null ? String(grossVal) : '',
            rolaCount: rolaVal !== undefined && rolaVal !== null ? String(rolaVal) : '',
            perRolaGrams: perRola,
            color: colorVal,
            twist: twistVal,
            twistType: twistVal,
            sizeType: isBig ? 'Big' : 'Norm',
          }
        })
        setBags(mappedBags)
      }
      setAttachedReceiptPhoto(photo)
    },
    [parties, header.partyId]
  )

  const {
    isScanning,
    scanningStatus,
    triggerScan,
    fileInputRef,
    handleFileInputChange,
    clearAttachedPhoto,
  } = useInModalChallanScan({
    challanType: 'INWARD',
    parties,
    onScanSuccess: handleInwardAutofill,
  })

  // Draft persistence
  const persistManualDraft = useCallback(() => {
    if (!isOpen || editingId) return
    const isDirty =
      header.challanNo.trim().length > 0 ||
      bags.some((b) => b.gross.trim().length > 0 || b.rolaCount.trim().length > 0) ||
      bags.length > 1
    if (isDirty) {
      saveInwardManualDraft({
        isOpen,
        editingId,
        header,
        rememberedPerRola,
        bags,
        savedAt: Date.now(),
      })
    } else {
      clearInwardManualDraft()
    }
  }, [isOpen, editingId, header, rememberedPerRola, bags])

  useEffect(() => {
    if (!isOpen) {
      clearInwardManualDraft()
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
      setRememberedPerRola((prev) => prev || String(resolvePartyRolaWeight(firstParty)))
    }
  }, [parties, header.partyId])

  const handlePartyChange = (partyId: string) => {
    setHeader((prev) => ({ ...prev, partyId }))
    const party = parties.find((p) => p.id === partyId)
    if (party) {
      const pRola = String(resolvePartyRolaWeight(party))
      setRememberedPerRola(pRola)
      setBags((prev) => prev.map((b) => ({ ...b, perRolaGrams: pRola })))
    }
  }

  const addBag = useCallback(() => {
    setBags((prev) => [...prev, createBlankBag(rememberedPerRola)])
  }, [createBlankBag, rememberedPerRola])

  const removeBag = useCallback((id: string) => {
    setBags((prev) => (prev.length <= 1 ? prev : prev.filter((b) => b.id !== id)))
  }, [])

  const updateBag = useCallback((id: string, field: keyof BagItem, val: string | null) => {
    let sanitized = val
    if (field === 'gross' && typeof val === 'string') {
      sanitized = sanitizeNumericInput(val, true)
    } else if (field === 'rolaCount' && typeof val === 'string') {
      sanitized = sanitizeIntegerInput(val)
    } else if (field === 'perRolaGrams' && typeof val === 'string') {
      sanitized = sanitizeIntegerInput(val)
      setRememberedPerRola(sanitized)
      try {
        if (sanitized) localStorage.setItem(STORAGE_KEY_PER_ROLA, sanitized)
      } catch {
        // ignore
      }
    }

    setBags((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: sanitized } : b)))
  }, [])

  // Calculations
  const calcBagValues = useCallback(
    (b: BagItem) => {
      let grossKg = parseFloat(b.gross) || 0
      if (grossKg > 500) grossKg = grossKg / 1000
      const rola = parseInt(b.rolaCount, 10) || 0
      const party = parties.find((p) => p.id === header.partyId)
      const normWeight = resolvePartyRolaWeight(party)
      const bigWeight = resolvePartyBigRolaWeight(party)
      const perRola = b.sizeType === 'Big' ? bigWeight : normWeight
      const boriKg = getGlobalSettings().defaultBoriGrams / 1000 || 0.1
      const tareKg = (rola * perRola) / 1000 + (grossKg > 0 ? boriKg : 0)
      const netKg = Math.max(0, grossKg - tareKg)
      return { grossKg, rola, perRola, tareKg, netKg }
    },
    [parties, header.partyId]
  )

  const bagCalculations = useMemo(() => {
    return bags.map((b) => ({
      bag: b,
      ...calcBagValues(b),
    }))
  }, [bags, calcBagValues])

  const totalGrossWeight = useMemo(() => bagCalculations.reduce((sum, b) => sum + b.grossKg, 0), [bagCalculations])
  const calculatedTotalTare = useMemo(() => bagCalculations.reduce((sum, b) => sum + b.tareKg, 0), [bagCalculations])
  const totalRolaPcs = useMemo(() => bagCalculations.reduce((sum, b) => sum + b.rola, 0), [bagCalculations])

  const finalTotalTare = useMemo(() => {
    if (tareOverride.trim() !== '') {
      const parsed = parseFloat(tareOverride)
      if (!isNaN(parsed) && parsed >= 0) return parsed
    }
    return calculatedTotalTare
  }, [tareOverride, calculatedTotalTare])

  const finalNetKasab = useMemo(() => Math.max(0, totalGrossWeight - finalTotalTare), [totalGrossWeight, finalTotalTare])

  const isFormDirty = useMemo(() => {
    if (editingId) {
      if (!initialEditSnapshot) return false
      const currentSnapshot = JSON.stringify({
        partyId: header.partyId,
        date: header.date,
        challanNo: header.challanNo,
        notes,
        tareOverride,
        bags,
      })
      return currentSnapshot !== initialEditSnapshot
    }
    return header.challanNo.trim().length > 0 || bags.some((b) => b.gross.trim().length > 0 || b.rolaCount.trim().length > 0) || bags.length > 1
  }, [editingId, initialEditSnapshot, header, notes, tareOverride, bags])

  const closeForm = () => {
    clearInwardManualDraft()
    setAttachedReceiptPhoto(null)
    clearAttachedPhoto()
    clearModalHash()
    setNotes('')
    setTareOverride('')
    setIsOpen(false)
    setEditingId(null)
    setOriginalBagIds([])
    setHighlightedBagId(null)
    setInitialEditSnapshot('')
    setOriginalPartyId(null)
    setErrorMsg(null)
    setFieldErrors({})
  }

  const handleRequestClose = () => {
    if (isFormDirty) setShowDiscardConfirm(true)
    else closeForm()
  }

  const duplicateChallan = useMemo(() => {
    return checkDuplicateInwardChallan(header.challanNo, header.partyId, receipts, editingId)
  }, [header.challanNo, header.partyId, editingId, receipts])

  const startAdd = useCallback(() => {
    window.location.hash = 'modal'
    setEditingId(null)
    setAttachedReceiptPhoto(null)
    clearAttachedPhoto()
    const firstParty = parties[0]
    setRememberedPerRola(String(resolvePartyRolaWeight(firstParty)))
    setHeader({
      partyId: firstParty?.id || '',
      date: todayStr(),
      challanNo: '',
    })
    setBags([createBlankBag()])
    setNotes('')
    setTareOverride('')
    setIsOpen(true)
    setErrorMsg(null)
    setFieldErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [parties, createBlankBag, clearAttachedPhoto])

  const startEdit = (r: ReceiptWithParty, allEntries?: ReceiptWithParty[], targetBagId?: string) => {
    window.location.hash = 'modal'
    setEditingId(r.id)
    setAttachedReceiptPhoto(null)
    clearAttachedPhoto()

    const challanBags =
      allEntries && allEntries.length > 0
        ? allEntries
        : r.challan_no?.trim()
        ? receipts.filter((x) => x.party_id === r.party_id && (x.challan_no?.trim() || '') === (r.challan_no?.trim() || ''))
        : [r]

    const loadedBags: BagItem[] = challanBags.map((item) => ({
      id: item.id,
      gross: String(item.gross_weight),
      rolaCount: String(item.rola_count || 0),
      perRolaGrams: '125',
      color: item.color || null,
      twist: ((item as any).twist_type as 'S' | 'Z' | null) || null,
      twistType: ((item as any).twist_type as 'S' | 'Z' | null) || null,
      sizeType: 'Norm',
    }))

    setBags(loadedBags.length > 0 ? loadedBags : [createBlankBag()])
    setHeader({
      partyId: r.party_id || parties[0]?.id || '',
      date: r.date,
      challanNo: r.challan_no || '',
    })

    const existingNotes = r.notes || challanBags.find((x) => x.notes)?.notes || ''
    setNotes(existingNotes)
    setOriginalBagIds(challanBags.map((b) => b.id))
    setHighlightedBagId(targetBagId || r.id)
    setIsOpen(true)
    setErrorMsg(null)
    setFieldErrors({})
    setOriginalPartyId(r.party_id || null)
  }

  const submit = async () => {
    setFieldErrors({})
    setErrorMsg(null)

    if (!header.challanNo?.trim()) {
      setErrorMsg('Challan number is required before saving')
      showToast('Challan number is required before saving', 'error')
      return
    }

    if (!header.partyId) {
      setErrorMsg('Please select a valid party')
      showToast('Party is required before saving', 'error')
      return
    }

    if (totalGrossWeight > 0 && finalTotalTare >= totalGrossWeight) {
      setErrorMsg(`Total tare deduction (${finalTotalTare.toFixed(3)} kg) cannot equal or exceed gross weight (${totalGrossWeight.toFixed(3)} kg).`)
      showToast('Gross weight must strictly exceed Tare deduction', 'error')
      return
    }

    const validationResult = InwardReceiptFormSchema.safeParse({
      partyId: header.partyId,
      date: header.date,
      challanNo: header.challanNo,
      bags: bags.map((b) => ({
        id: b.id,
        gross: b.gross,
        rolaCount: b.rolaCount,
        perRolaGrams: b.perRolaGrams,
        color: b.color,
        twistType: b.twistType,
        sizeType: b.sizeType,
      })),
    })

    if (!validationResult.success) {
      const errs = formatZodErrors(validationResult.error)
      setFieldErrors(errs)
      showToast('Please correct the highlighted input fields.', 'warning')
      return
    }

    setSaving(true)

    try {
      const challanImage = attachedReceiptPhoto?.previewUrl || null
      const safeDate = parseChallanDate(header.date) || header.date || todayStr()

      const hasTareOverride = tareOverride.trim() !== '' && calculatedTotalTare > 0
      const tareRatio = hasTareOverride ? finalTotalTare / calculatedTotalTare : 1

      const payloads: ReceiptPayload[] = bagCalculations.map((b) => ({
        party_id: header.partyId,
        date: safeDate,
        challan_no: header.challanNo.trim() || null,
        gross_weight: b.grossKg,
        tare_weight: hasTareOverride ? Number((b.tareKg * tareRatio).toFixed(3)) : b.tareKg,
        net_weight: hasTareOverride ? Math.max(0, Number((b.grossKg - b.tareKg * tareRatio).toFixed(3))) : b.netKg,
        rola_count: b.rola,
        color: b.bag.color,
        twist_type: b.bag.twistType,
        image_url: challanImage,
        challan_image: challanImage,
        notes: notes.trim() || null,
      }))

      if (editingId) {
        const existingToUpdate = payloads.slice(0, originalBagIds.length)
        const newToInsert = payloads.slice(originalBagIds.length)

        for (let i = 0; i < existingToUpdate.length; i++) {
          await updateReceipt(originalBagIds[i], existingToUpdate[i])
        }
        if (newToInsert.length > 0) {
          await insertReceipts(newToInsert)
        }
        if (originalBagIds.length > payloads.length) {
          const toDelete = originalBagIds.slice(payloads.length)
          await deleteReceipts(toDelete)
        }

        const challanNo = header.challanNo.trim()
        if (originalPartyId && originalPartyId !== header.partyId && challanNo) {
          await updateReceiptPartyByChallan(challanNo, header.partyId, editingId, originalPartyId)
        }
        const originalDate = receipts.find((r) => r.id === editingId)?.date
        if (originalDate && originalDate !== header.date && challanNo) {
          await updateReceiptDateByChallan(challanNo, header.date, editingId, header.partyId)
        }
        showToast('Receipt challan updated successfully', 'success')
      } else {
        await insertReceipts(payloads)
        showToast('Inward receipt recorded successfully', 'success')
      }

      const targetMonth = safeDate.slice(0, 7)
      if (selectedMonth !== 'all' && selectedMonth !== targetMonth) {
        setSelectedMonth(targetMonth)
      }

      clearInwardManualDraft()
      closeForm()
      await refreshData()
    } catch (err: unknown) {
      console.error('Save receipt error:', err)
      const msg = extractErrorMessage(err, 'Failed to save receipt')
      setErrorMsg(`Could not save receipt — ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleScanConfirmSave = async (data: ChallanFormData) => {
    const inward = data as InwardFormData
    try {
      let partyId = inward.party_id
      const partyName = (inward.party_name || '').trim()

      if (!partyId && partyName) {
        const matched = resolvePartyMatch(parties, partyName)
        if (matched) {
          partyId = matched.id
        } else {
          try {
            const newParty = await insertParty({ name: partyName })
            partyId = newParty.id
            await refreshData()
          } catch {
            partyId = parties[0]?.id
          }
        }
      }

      if (!partyId && parties.length > 0) partyId = parties[0].id
      if (!partyId) throw new Error('Please select or specify a valid party name.')

      const challanNo = (inward.challan_no || '').trim()
      if (!challanNo) throw new Error('Challan number is required before saving')

      const challanImage = inward.image_url || inward.challan_image || inward.image_preview || null
      const payloadsToInsert: ReceiptPayload[] = []

      if (inward.bags && inward.bags.length > 0) {
        for (const b of inward.bags) {
          payloadsToInsert.push({
            party_id: partyId,
            date: inward.date || todayStr(),
            challan_no: challanNo || null,
            gross_weight: parseFloat(String(b.gross)) || 0,
            tare_weight: b.tare || 0,
            rola_count: b.rola || 0,
            color: (b as any).color || null,
            image_url: challanImage,
            challan_image: challanImage,
          })
        }
      }

      if (payloadsToInsert.length > 0) {
        await insertReceipts(payloadsToInsert)
      }
      showToast(`Challan #${challanNo} saved successfully!`, 'success')
      await refreshData()
    } catch (err: unknown) {
      console.error('Save scan error:', err)
      const msg = extractErrorMessage(err, 'Failed to save scanned challan.')
      showToast(msg, 'error')
      throw err
    }
  }

  useEffect(() => {
    if (searchParams.get('action') === 'new' && parties.length > 0 && !isOpen && !loadInwardManualDraft()) {
      startAdd()
    }
  }, [searchParams, parties, isOpen, startAdd])

  return {
    isOpen,
    editingId,
    header,
    setHeader,
    bags,
    setBags,
    rememberedPerRola,
    setRememberedPerRola,
    bagCalculations,
    totalGrossWeight,
    calculatedTotalTare,
    finalTotalTare,
    finalNetKasab,
    totalRolaPcs,
    tareOverride,
    setTareOverride,
    notes,
    setNotes,
    saving,
    errorMsg,
    setErrorMsg,
    fieldErrors,
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
    highlightedBagId,
  }
}
