import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import type React from 'react'
import {
  scanChallanImage,
  parseChallanDate,
  parseTarAndTwist,
  type ExtractedChallanData,
  type InwardBagExtraction,
  type OutwardBagExtraction,
} from '@/services/aiScanner'
import { uploadChallanImage } from '@/services/storage/storage'
import { saveChallanImageOffline } from '@/services/storage/db'
import { fetchParties } from '@/services/api/parties'
import type { Party } from '@/features/parties/types'
import { resolvePartyMatch } from '@/features/parties/utils'
import {
  resolvePartyBungariWeight,
  resolvePartyRolaWeight,
  resolvePartyBigRolaWeight,
  getGlobalSettings,
  getTarRate,
  getTarRates,
} from '@/features/settings/utils'
import { sanitizeNumericInput, sanitizeIntegerInput } from '@/utils/numberInput'
import { todayStr } from '@/utils/date'
import { useToast } from '@/context/ToastContext'
import { useData } from '@/hooks/useData'
import {
  saveScannerDraft,
  loadScannerDraft,
  clearScannerDraft,
  isScannerDraftDirty,
  registerAppBackgroundListener,
} from '@/services/storage/challanDraftStorage'
import { captureChallanPhoto, pickChallanGalleryPhoto, CameraSource, type CapturedPhoto } from '@/utils/camera'
import { compressImage } from '@/utils/imageCompressor'
import type {
  InwardReviewBag,
  InwardFormData,
  OutwardReviewBag,
  OutwardFormData,
  ChallanFormData,
} from '@/features/inward/sheets/InwardScannerSheet'

interface UseScannerReviewFormProps {
  type: 'INWARD' | 'OUTWARD'
  isOpen: boolean
  onClose: () => void
  onConfirmSave: (data: ChallanFormData) => Promise<void>
  partiesProp?: Party[]
}

export function useScannerReviewForm({
  type,
  isOpen,
  onClose,
  onConfirmSave,
  partiesProp,
}: UseScannerReviewFormProps) {
  const { showToast } = useToast()
  const { receipts = [], dispatches = [] } = useData()

  // Capture / Image state
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null)
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null)
  const [compressedBase64, setCompressedBase64] = useState<string | null>(null)
  const [isPdfFile, setIsPdfFile] = useState<boolean>(false)

  // Pan & Zoom
  const [scale, setScale] = useState<number>(1)
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isFileDragging, setIsFileDragging] = useState<boolean>(false)

  const imageContainerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const initialPinchDistRef = useRef<number>(0)
  const initialPinchScaleRef = useRef<number>(1)
  const scaleRef = useRef<number>(1)
  const positionRef = useRef<{ x: number; y: number }>(position)

  useEffect(() => {
    scaleRef.current = scale
    positionRef.current = position
  }, [scale, position])

  const handleResetZoom = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setIsDragging(false)
  }, [])

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(4, Number((prev + 0.5).toFixed(2))))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(1, Number((prev - 0.5).toFixed(2)))
      if (next <= 1) {
        setPosition({ x: 0, y: 0 })
      } else {
        const el = imageContainerRef.current
        const width = el ? el.clientWidth : 400
        const height = el ? el.clientHeight : 300
        const maxPanX = Math.max(0, (width * (next - 1)) / 2 + 40)
        const maxPanY = Math.max(0, (height * (next - 1)) / 2 + 40)
        setPosition((pos) => ({
          x: Math.min(Math.max(pos.x, -maxPanX), maxPanX),
          y: Math.min(Math.max(pos.y, -maxPanY), maxPanY),
        }))
      }
      return next
    })
  }, [])

  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    imageContainerRef.current = el
  }, [])

  const handleSyntheticWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const zoomDelta = e.deltaY < 0 ? 0.25 : -0.25
    setScale((prev) => {
      const next = Math.min(4, Math.max(1, Number((prev + zoomDelta).toFixed(2))))
      if (next <= 1) setPosition({ x: 0, y: 0 })
      return next
    })
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (scaleRef.current <= 1) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      initialPinchDistRef.current = dist
      initialPinchScaleRef.current = scaleRef.current
    } else if (e.touches.length === 1 && scaleRef.current > 1) {
      setIsDragging(true)
      dragStartRef.current = { x: e.touches[0].clientX - positionRef.current.x, y: e.touches[0].clientY - positionRef.current.y }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      if (initialPinchDistRef.current > 0) {
        const factor = dist / initialPinchDistRef.current
        const next = Math.min(4, Math.max(1, Number((initialPinchScaleRef.current * factor).toFixed(2))))
        setScale(next)
      }
    } else if (e.touches.length === 1 && scaleRef.current > 1) {
      setPosition({ x: e.touches[0].clientX - dragStartRef.current.x, y: e.touches[0].clientY - dragStartRef.current.y })
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Scanner status
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const challanInputRef = useRef<HTMLInputElement>(null)

  // Parties
  const [internalParties, setInternalParties] = useState<Party[]>([])
  const parties = partiesProp && partiesProp.length > 0 ? partiesProp : internalParties
  const [partySearch, setPartySearch] = useState<string>('')
  const [showPartyDropdown, setShowPartyDropdown] = useState<boolean>(false)

  // Header
  const [challanNo, setChallanNo] = useState<string>('')
  const [date, setDate] = useState<string>(todayStr())
  const [selectedPartyName, setSelectedPartyName] = useState<string>('')
  const [selectedPartyId, setSelectedPartyId] = useState<string>('')
  const [tareOverride, setTareOverride] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Inward bags
  const createBlankInwardBag = useCallback(
    (defaultPerRola = '125'): InwardReviewBag => ({
      id: crypto.randomUUID(),
      gross: '',
      grossNum: 0,
      rola: 0,
      rolaCount: '',
      perRolaGrams: defaultPerRola,
      color: null,
      twist: null,
      twistType: null,
      spool_type: 'NORMAL',
      rolaType: 'NORM',
      sizeType: 'Norm',
      tare: 0,
      net: 0,
    }),
    []
  )

  const [inwardBags, setInwardBags] = useState<InwardReviewBag[]>([createBlankInwardBag()])

  // Outward bags
  const [outwardDispatchType, setOutwardDispatchType] = useState<'Val' | 'Rola'>('Val')
  const [manualTotalOverride, setManualTotalOverride] = useState<string | null>(null)

  const createBlankOutwardBag = useCallback(
    (): OutwardReviewBag => ({
      id: crypto.randomUUID(),
      gross: '',
      bungariCount: '',
      rolaCount: '',
      tar: '',
      twistType: '',
    }),
    []
  )

  const [outwardValBags, setOutwardValBags] = useState<OutwardReviewBag[]>([createBlankOutwardBag()])
  const [outwardRolaBags, setOutwardRolaBags] = useState<OutwardReviewBag[]>([createBlankOutwardBag()])

  // Duplicate notice
  const duplicateChallanInfo = useMemo(() => {
    const cleanNo = challanNo.trim().toLowerCase()
    const partyId = selectedPartyId
    const cleanParty = selectedPartyName.trim().toLowerCase()
    if (!cleanNo || (!partyId && !cleanParty)) return null

    const match =
      type === 'INWARD'
        ? receipts.find((r) => (r.challan_no || '').trim().toLowerCase() === cleanNo && (r.party_id === partyId || (r.party?.name || '').toLowerCase() === cleanParty))
        : dispatches.find((d) => (d.challan_no || '').trim().toLowerCase() === cleanNo && (d.party_id === partyId || (d.party?.name || '').toLowerCase() === cleanParty))

    return match ? { challanNo: match.challan_no || '', date: match.date, partyName: match.party?.name || selectedPartyName } : null
  }, [challanNo, selectedPartyId, selectedPartyName, type, receipts, dispatches])

  // Fetch parties if needed
  useEffect(() => {
    if (isOpen && (!partiesProp || partiesProp.length === 0)) {
      void fetchParties().then((list) => setInternalParties(list || []))
    }
  }, [isOpen, partiesProp])

  // Drafts
  const [isRestoredFromDraft, setIsRestoredFromDraft] = useState<boolean>(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false)

  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase()
    if (!q) return parties.slice(0, 8)
    return parties.filter((p) => p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q))).slice(0, 8)
  }, [parties, partySearch])

  const handlePartySelect = useCallback(
    (party: Party) => {
      setSelectedPartyId(party.id)
      setSelectedPartyName(party.name)
      setPartySearch(party.name)
      setShowPartyDropdown(false)
      const partyRola = String(resolvePartyRolaWeight(party))
      setInwardBags((prev) => prev.map((b) => ({ ...b, perRolaGrams: partyRola })))
    },
    []
  )

  // Bag mutations
  const updateInwardBag = useCallback((id: string, field: keyof InwardReviewBag, val: string) => {
    setInwardBags((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: val } : b)))
  }, [])

  const removeInwardBag = useCallback((id: string) => {
    setInwardBags((prev) => (prev.length <= 1 ? prev : prev.filter((b) => b.id !== id)))
  }, [])

  const addInwardBag = useCallback(() => {
    setInwardBags((prev) => [...prev, createBlankInwardBag()])
  }, [createBlankInwardBag])

  const handleInwardBagSizeTypeChange = useCallback((id: string, sizeType: 'Norm' | 'Big') => {
    setInwardBags((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b
        const defaultRolaG = sizeType === 'Big' ? resolvePartyBigRolaWeight() : resolvePartyRolaWeight()
        return { ...b, sizeType, rolaType: sizeType === 'Big' ? 'BIG' : 'NORM', perRolaGrams: String(defaultRolaG) }
      })
    )
  }, [])

  // Inward Bag calculations
  const inwardBagCalculations = useMemo(() => {
    return inwardBags.map((b) => {
      let gross = parseFloat(b.gross) || 0
      if (gross > 500) gross = gross / 1000
      const rola = parseInt(b.rolaCount || '0', 10) || 0
      const perRola = parseFloat(b.perRolaGrams || '125') || 125
      const bori = gross > 0 ? 0.1 : 0
      const tare = Math.round(((rola * perRola) / 1000 + bori) * 1000) / 1000
      const net = Math.max(0, Math.round((gross - tare) * 1000) / 1000)
      return { bag: b, grossKg: gross, rolaCount: rola, tareKg: tare, netKasabKg: net, netKg: net }
    })
  }, [inwardBags])

  const inwardTotals = useMemo(() => {
    const valid = inwardBagCalculations.filter((c) => c.grossKg > 0)
    const totalGross = valid.reduce((s, c) => s + c.grossKg, 0)
    const calculatedTotalTare = valid.reduce((s, c) => s + c.tareKg, 0)
    const totalRola = valid.reduce((s, c) => s + c.rolaCount, 0)
    const override = parseFloat(tareOverride)
    const totalTare = !isNaN(override) && override > 0 ? override : calculatedTotalTare
    const totalNet = Math.max(0, Math.round((totalGross - totalTare) * 1000) / 1000)
    return { count: valid.length, totalGross, calculatedTotalTare, totalTare, totalNet, totalRola }
  }, [inwardBagCalculations, tareOverride])

  // Photo handlers
  const handleSnapPhoto = useCallback(async () => {
    try {
      setIsProcessingPhoto(true)
      const captured = await captureChallanPhoto(CameraSource.Camera)
      setCapturedPhoto(captured)
      if (captured.file) {
        setIsScanning(true)
        const result = await scanChallanImage(captured.file, type, parties)
        if (result) {
          if (result.challan_no) setChallanNo(result.challan_no)
          if (result.date) setDate(parseChallanDate(result.date) || result.date)
          if (result.party_name) {
            setSelectedPartyName(result.party_name)
            setPartySearch(result.party_name)
            const m = resolvePartyMatch(parties, result.party_name)
            if (m) setSelectedPartyId(m.id)
          }
          if (result.inward_data?.bags && result.inward_data.bags.length > 0) {
            setInwardBags(
              result.inward_data.bags.map((b) => ({
                id: crypto.randomUUID(),
                gross: String(b.gross || ''),
                grossNum: parseFloat(String(b.gross)) || 0,
                rola: parseInt(String(b.rola || '0'), 10) || 0,
                rolaCount: String(b.rola || ''),
                perRolaGrams: String(resolvePartyRolaWeight()),
                color: b.color || null,
                twist: (b.twist === 'S' || b.twist === 'Z' ? b.twist : null),
                twistType: (b.twist === 'S' || b.twist === 'Z' ? b.twist : null),
                rolaType: 'NORM',
                sizeType: 'Norm',
                tare: 0,
                net: 0,
              }))
            )
          }
          setScanSuccessMsg('Challan scanned successfully!')
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Photo capture error'
      if (!msg.toLowerCase().includes('cancel')) setScanError(msg)
    } finally {
      setIsProcessingPhoto(false)
      setIsScanning(false)
    }
  }, [parties])

  const handleOpenFileBrowser = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click()
  }, [])

  const handleFileSelected = useCallback(
    async (file: File) => {
      try {
        setIsProcessingPhoto(true)
        const isPdf = file.type === 'application/pdf'
        setIsPdfFile(isPdf)
        const { compressedBlob: compressed } = isPdf ? { compressedBlob: file } : await compressImage(file, 1400, 0.8)
        const preview = URL.createObjectURL(compressed)
        setCapturedPhoto({ file: compressed, previewUrl: preview })
        setIsScanning(true)
        const result = await scanChallanImage(compressed, type, parties)
        if (result) {
          if (result.challan_no) setChallanNo(result.challan_no)
          if (result.date) setDate(parseChallanDate(result.date) || result.date)
          if (result.party_name) {
            setSelectedPartyName(result.party_name)
            setPartySearch(result.party_name)
            const m = resolvePartyMatch(parties, result.party_name)
            if (m) setSelectedPartyId(m.id)
          }
          setScanSuccessMsg('Challan scanned successfully!')
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to scan image'
        setScanError(msg)
      } finally {
        setIsProcessingPhoto(false)
        setIsScanning(false)
      }
    },
    [parties]
  )

  const handleSave = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      if (!challanNo.trim()) {
        setScanError('Challan number is required before saving')
        return
      }
      setIsSaving(true)
      try {
        const payload: InwardFormData = {
          challan_no: challanNo.trim(),
          date,
          party_name: selectedPartyName,
          party_id: selectedPartyId || undefined,
          gross_kg: inwardTotals.totalGross.toFixed(3),
          tare_deduction_kg: inwardTotals.totalTare.toFixed(3),
          net_kasab_kg: inwardTotals.totalNet,
          rola_pcs: String(inwardTotals.totalRola),
          rola_type: 'NORMAL',
          bags_count: String(inwardTotals.count),
          notes,
          image_preview: capturedPhoto?.previewUrl,
        }
        await onConfirmSave(payload)
        clearScannerDraft(type)
        onClose()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save'
        setScanError(msg)
      } finally {
        setIsSaving(false)
      }
    },
    [challanNo, date, selectedPartyName, selectedPartyId, inwardTotals, notes, capturedPhoto, onConfirmSave, type, onClose]
  )

  const isFormDirty = useCallback(() => {
    return Boolean(challanNo.trim() || selectedPartyId || inwardBags.some((b) => b.gross.trim()))
  }, [challanNo, selectedPartyId, inwardBags])

  const handleRequestClose = useCallback(() => {
    if (isFormDirty()) setShowDiscardConfirm(true)
    else onClose()
  }, [isFormDirty, onClose])

  return {
    capturedPhoto,
    isPdfFile,
    scale,
    position,
    isDragging,
    isFileDragging,
    setContainerRef,
    handleSyntheticWheel,
    handleMouseDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleResetZoom,
    handleZoomIn,
    handleZoomOut,
    isScanning,
    isProcessingPhoto,
    isSaving,
    scanError,
    setScanError,
    scanSuccessMsg,
    fileInputRef,
    challanInputRef,
    parties,
    partySearch,
    setPartySearch,
    showPartyDropdown,
    setShowPartyDropdown,
    filteredParties,
    handlePartySelect,
    challanNo,
    setChallanNo,
    date,
    setDate,
    selectedPartyName,
    setSelectedPartyName,
    selectedPartyId,
    setSelectedPartyId,
    tareOverride,
    setTareOverride,
    notes,
    setNotes,
    inwardBags,
    updateInwardBag,
    removeInwardBag,
    addInwardBag,
    handleInwardBagSizeTypeChange,
    inwardBagCalculations,
    inwardTotals,
    outwardDispatchType,
    setOutwardDispatchType,
    outwardValBags,
    outwardRolaBags,
    duplicateChallanInfo,
    isRestoredFromDraft,
    showDiscardConfirm,
    setShowDiscardConfirm,
    handleSnapPhoto,
    handleOpenFileBrowser,
    handleFileSelected,
    handleSave,
    handleRequestClose,
  }
}
