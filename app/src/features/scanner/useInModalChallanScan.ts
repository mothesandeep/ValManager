import { useState, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { CameraSource, captureChallanPhoto, type CapturedPhoto } from '@/utils/camera'
import { compressImage } from '@/utils/imageCompressor'
import { triggerHaptic } from '@/utils/haptics'
import { ImpactStyle } from '@capacitor/haptics'
import { scanChallanImage, type ExtractedChallanData } from '@/services/aiScanner'
import type { Party } from '@/features/parties/types'
import { resolvePartyMatch } from '@/features/parties/utils'
import { useToast } from '@/context/ToastContext'
import { saveChallanImageOffline } from '@/lib/offline/db'

export interface AttachedChallanPhoto {
  file?: Blob
  previewUrl: string
  base64?: string
}

export interface UseInModalChallanScanOptions {
  challanType: 'INWARD' | 'OUTWARD'
  parties: Party[]
  onScanSuccess: (
    extracted: ExtractedChallanData,
    matchedParty: Party | null,
    photo: AttachedChallanPhoto
  ) => void
}

export function useInModalChallanScan({
  challanType,
  parties,
  onScanSuccess,
}: UseInModalChallanScanOptions) {
  const { showToast } = useToast()
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [scanningStatus, setScanningStatus] = useState<string>('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [attachedPhoto, setAttachedPhoto] = useState<AttachedChallanPhoto | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    async (rawFile: File | Blob, preloadedPreviewUrl?: string) => {
      try {
        setIsScanning(true)
        setScanError(null)
        setScanningStatus('Optimizing image for Gemini AI...')
        void triggerHaptic(ImpactStyle.Light)

        // 1. Compress image to reduce base64 size & upload bandwidth
        let blobToUse: Blob = rawFile
        let previewUrl: string = preloadedPreviewUrl || ''
        let base64String: string = ''

        try {
          const comp = await compressImage(rawFile, 1600, 0.78)
          blobToUse = comp.compressedBlob
          previewUrl = comp.base64
          base64String = comp.base64
        } catch {
          blobToUse = rawFile
          previewUrl = previewUrl || (typeof window !== 'undefined' ? URL.createObjectURL(rawFile) : '')
        }

        const photoData: AttachedChallanPhoto = {
          file: blobToUse,
          previewUrl,
          base64: base64String,
        }
        setAttachedPhoto(photoData)

        // 2. Perform AI vision OCR extraction
        setScanningStatus('Extracting party, challan no, date & bag weights...')
        const extracted = await scanChallanImage(blobToUse, challanType, parties)

        // 3. Resolve party match if party name found
        let matchedParty: Party | null = null
        if (extracted.party_name && parties.length > 0) {
          const match = resolvePartyMatch(parties, extracted.party_name)
          if (match) {
            matchedParty = match
          }
        }

        // 4. Save photo to offline Dexie storage safely
        if (base64String) {
          void saveChallanImageOffline({
            id: `latest_inmodal_${challanType}`,
            challan_no: extracted.challan_no || undefined,
            date: extracted.date || undefined,
            base64: base64String,
          }).catch(() => {})
        }

        // 5. Invoke autofill callback
        onScanSuccess(extracted, matchedParty, photoData)

        void triggerHaptic(ImpactStyle.Medium)
        showToast('Challan details autofilled from receipt', 'success')
      } catch (err: unknown) {
        console.error('[InModalScan] Extraction failed:', err)
        const msg = err instanceof Error ? err.message : 'Could not scan challan.'
        setScanError(msg)
        showToast(msg, 'error')
      } finally {
        setIsScanning(false)
        setScanningStatus('')
      }
    },
    [challanType, parties, onScanSuccess, showToast]
  )

  const triggerScan = useCallback(async () => {
    try {
      setScanError(null)
      if (Capacitor.isNativePlatform()) {
        const photo: CapturedPhoto = await captureChallanPhoto(CameraSource.Camera)
        void triggerHaptic(ImpactStyle.Light)
        if (photo.file) {
          await processFile(photo.file, photo.previewUrl)
        }
      } else {
        fileInputRef.current?.click()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.toLowerCase().includes('cancelled') && !msg.toLowerCase().includes('cancel')) {
        setScanError(msg)
      }
    }
  }, [processFile])

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      await processFile(file)
      // Reset input value so re-selecting same file works
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [processFile]
  )

  const clearAttachedPhoto = useCallback(() => {
    if (attachedPhoto?.previewUrl && attachedPhoto.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(attachedPhoto.previewUrl)
      } catch {}
    }
    setAttachedPhoto(null)
  }, [attachedPhoto])

  return {
    isScanning,
    scanningStatus,
    scanError,
    attachedPhoto,
    setAttachedPhoto,
    triggerScan,
    fileInputRef,
    handleFileInputChange,
    clearAttachedPhoto,
  }
}
