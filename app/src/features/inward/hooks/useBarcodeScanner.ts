import { useState, useRef, useCallback, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { CameraSource, captureChallanPhoto, pickChallanGalleryPhoto, type CapturedPhoto } from '@/utils/camera'
import { compressImage } from '@/utils/imageCompressor'
import { triggerHaptic } from '@/utils/haptics'
import { ImpactStyle } from '@capacitor/haptics'

export interface BarcodeScannerState {
  isScanning: boolean
  scanningStatus: string
  capturedPhoto: CapturedPhoto | null
  previewUrl: string | null
  error: string | null
  isNative: boolean
}

export function useBarcodeScanner() {
  const isNative = Capacitor.isNativePlatform()

  const [isScanning, setIsScanning] = useState(false)
  const [scanningStatus, setScanningStatus] = useState<string>('')
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  // Track ObjectURL cleanup
  const cleanupPreviewUrl = useCallback(() => {
    if (previewUrlRef.current && previewUrlRef.current.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewUrlRef.current)
      } catch {
        // Ignore cleanup failure
      }
      previewUrlRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      cleanupPreviewUrl()
    }
  }, [cleanupPreviewUrl])

  const setPhoto = useCallback(
    (photo: CapturedPhoto | null) => {
      cleanupPreviewUrl()
      if (photo?.previewUrl) {
        previewUrlRef.current = photo.previewUrl
      }
      setCapturedPhoto(photo)
      setError(null)
    },
    [cleanupPreviewUrl]
  )

  const triggerCamera = useCallback(async (): Promise<CapturedPhoto | null> => {
    setError(null)
    if (!isNative) {
      // Robust Web Browser Fallback: trigger file input dialog
      if (fileInputRef.current) {
        fileInputRef.current.click()
      }
      return null
    }

    try {
      setIsScanning(true)
      setScanningStatus('Opening camera...')
      await triggerHaptic(ImpactStyle.Light)
      const photo = await captureChallanPhoto(CameraSource.Camera)
      setPhoto(photo)
      await triggerHaptic(ImpactStyle.Medium)
      return photo
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.toLowerCase().includes('cancel')) {
        setError(msg || 'Failed to capture photo from camera.')
      }
      return null
    } finally {
      setIsScanning(false)
      setScanningStatus('')
    }
  }, [isNative, setPhoto])

  const triggerGallery = useCallback(async (): Promise<CapturedPhoto | null> => {
    setError(null)
    if (!isNative) {
      if (fileInputRef.current) {
        fileInputRef.current.click()
      }
      return null
    }

    try {
      setIsScanning(true)
      setScanningStatus('Opening gallery...')
      await triggerHaptic(ImpactStyle.Light)
      const photo = await pickChallanGalleryPhoto()
      setPhoto(photo)
      await triggerHaptic(ImpactStyle.Medium)
      return photo
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.toLowerCase().includes('cancel')) {
        setError(msg || 'Failed to select photo from gallery.')
      }
      return null
    } finally {
      setIsScanning(false)
      setScanningStatus('')
    }
  }, [isNative, setPhoto])

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<CapturedPhoto | null> => {
      const file = e.target.files?.[0]
      if (!file) return null

      setError(null)
      setIsScanning(true)
      setScanningStatus('Compressing image...')

      try {
        let photoBlob: Blob = file
        let preview: string

        if (file.type === 'application/pdf') {
          preview = URL.createObjectURL(file)
        } else {
          const { compressedBlob } = await compressImage(file, 1400, 0.8)
          photoBlob = compressedBlob
          preview = URL.createObjectURL(compressedBlob)
        }

        const photo: CapturedPhoto = {
          file: photoBlob,
          previewUrl: preview,
        }
        setPhoto(photo)
        return photo
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error reading selected image.'
        setError(msg)
        return null
      } finally {
        setIsScanning(false)
        setScanningStatus('')
        if (e.target) {
          e.target.value = ''
        }
      }
    },
    [setPhoto]
  )

  const clearPhoto = useCallback(() => {
    setPhoto(null)
    setError(null)
  }, [setPhoto])

  return {
    isScanning,
    setIsScanning,
    scanningStatus,
    setScanningStatus,
    capturedPhoto,
    previewUrl: capturedPhoto?.previewUrl || null,
    error,
    setError,
    isNative,
    fileInputRef,
    triggerCamera,
    triggerGallery,
    handleFileInputChange,
    setPhoto,
    clearPhoto,
  }
}

