import React, { useState, useEffect } from 'react'
import {
  Camera,
  UploadCloud,
  RefreshCw,
  Plus,
  Minus,
  FileUp,
  Loader2,
  Sparkles,
  RotateCw,
  Maximize2,
} from 'lucide-react'
import type { CapturedPhoto } from '@/utils/camera'

export interface ChallanDocumentUploaderProps {
  capturedPhoto: CapturedPhoto | null
  isPdfFile: boolean
  scale: number
  isDragging: boolean
  position: { x: number; y: number }
  setContainerRef: (el: HTMLDivElement | null) => void
  handleSyntheticWheel: (e: React.WheelEvent<HTMLDivElement>) => void
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  handleTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void
  handleTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void
  handleTouchEnd: (e?: React.TouchEvent<HTMLDivElement>) => void
  handleResetZoom: () => void
  handleZoomIn: () => void
  handleZoomOut: () => void
  onOpenFileBrowser: () => void
  onCaptureCamera: () => void
  isFileDragging: boolean
  isCapturing?: boolean
  isProcessingPhoto?: boolean
  isScanning?: boolean
}

export function ChallanDocumentUploader({
  capturedPhoto,
  isPdfFile,
  scale,
  isDragging,
  position,
  setContainerRef,
  handleSyntheticWheel,
  handleMouseDown,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleResetZoom,
  handleZoomIn,
  handleZoomOut,
  onOpenFileBrowser,
  onCaptureCamera,
  isFileDragging,
  isCapturing = false,
  isProcessingPhoto = false,
  isScanning = false,
}: ChallanDocumentUploaderProps) {
  const [rotation, setRotation] = useState<number>(0)

  // Auto-reset rotation when photo changes
  useEffect(() => {
    setRotation(0)
  }, [capturedPhoto?.previewUrl])

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleFullReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    handleResetZoom()
    setRotation(0)
  }

  return (
    <div className="lg:col-span-6 p-0 border-b border-slate-200/80 dark:border-slate-800 lg:border-b-0 lg:border-r bg-slate-50/50 dark:bg-slate-950/40 flex flex-col relative shrink-0 h-auto lg:h-full lg:min-h-0 lg:overflow-hidden p-3 lg:p-4">
      {capturedPhoto ? (
        <div className="w-full h-full flex-1 flex flex-col my-1 lg:my-0 min-h-[340px] lg:min-h-0">
          <div
            ref={setContainerRef}
            onWheel={handleSyntheticWheel}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onDoubleClick={handleFullReset}
            className={`w-full h-full flex-1 rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-slate-900/5 dark:bg-slate-950 relative select-none touch-none flex items-center justify-center min-h-[320px] lg:min-h-0 ${
              scale > 1
                ? isDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : 'cursor-default'
            }`}
          >
            {/* Floating Toolstrip (Top-Right inside Frame) */}
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              className="absolute top-3 right-3 z-10 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/60 shadow-md rounded-xl px-2 py-1.5 flex items-center gap-1 select-none pointer-events-auto"
            >
              {!isPdfFile && (
                <>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    title="Zoom Out (-)"
                    disabled={scale <= 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <Minus size={14} strokeWidth={2.4} />
                  </button>

                  <button
                    type="button"
                    onClick={handleResetZoom}
                    title="Click to reset zoom (100%)"
                    className="px-1.5 py-0.5 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer tabular-nums select-none"
                  >
                    {Math.round(scale * 100)}%
                  </button>

                  <button
                    type="button"
                    onClick={handleZoomIn}
                    title="Zoom In (+)"
                    disabled={scale >= 4}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={2.4} />
                  </button>

                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

                  <button
                    type="button"
                    onClick={handleRotate}
                    title="Rotate 90° Clockwise"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RotateCw size={14} strokeWidth={2.2} />
                  </button>

                  <button
                    type="button"
                    onClick={handleFullReset}
                    title="Fit to Screen / Reset View"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Maximize2 size={13} strokeWidth={2.2} />
                  </button>

                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                </>
              )}

              <button
                type="button"
                onClick={onOpenFileBrowser}
                title="Replace Slip"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw size={14} strokeWidth={2.2} />
              </button>
            </div>

            {/* Document View */}
            {isPdfFile ? (
              <iframe
                src={capturedPhoto.previewUrl}
                title="Challan PDF Preview"
                className="w-full h-full rounded-2xl border-none bg-white"
              />
            ) : (
              <img
                src={capturedPhoto.previewUrl}
                alt="Scanned Challan"
                draggable={false}
                style={{
                  transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0, 0, 1)',
                  willChange: 'transform',
                }}
                className="object-contain w-full h-full max-w-full max-h-full rounded-2xl pointer-events-none select-none"
              />
            )}
          </div>
        </div>
      ) : isProcessingPhoto ? (
        /* Instant Full-Card Skeleton / Loading Overlay on Photo Capture */
        <div className="w-full h-full flex-1 flex flex-col justify-center items-center my-1 lg:my-0 min-h-[300px] lg:min-h-0">
          <div className="w-full h-full flex-1 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/30 p-8 text-center animate-pulse flex flex-col items-center justify-center">
            <div className="relative mb-3.5">
              <div className="w-12 h-12 rounded-full border-3 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 animate-spin" />
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 absolute inset-0 m-auto" />
            </div>
            <h3 className="text-sm font-semibold text-indigo-950 dark:text-indigo-100 mb-1">
              Optimizing challan photo & scanning with Gemini...
            </h3>
            <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 max-w-xs leading-relaxed">
              Preparing high-clarity image for instant OCR processing.
            </p>
          </div>
        </div>
      ) : (
        /* Empty State Dropzone - Vertically centered across full left container */
        <div className="w-full h-full flex-1 flex flex-col justify-center items-center my-1 lg:my-0 min-h-[300px] lg:min-h-0">
          <div
            onClick={onOpenFileBrowser}
            className={`w-full h-full flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 shadow-2xs ${
              isFileDragging
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-4 ring-indigo-500/10'
                : ''
            }`}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 mx-auto mb-3.5 shadow-2xs">
              <FileUp className="w-6 h-6" />
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1">
              Upload Challan Document
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5 max-w-xs">
              Drag & drop physical challan or snap camera to automatically extract party and bag records with Gemini AI.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs justify-center mb-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenFileBrowser()
                }}
                disabled={isCapturing || isProcessingPhoto}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>Browse File</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onCaptureCamera()
                }}
                disabled={isCapturing || isProcessingPhoto}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isCapturing || isProcessingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span>Snap Camera</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Supports JPEG, PNG, WebP & PDF • Auto-compressed on-device
            </p>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      {isFileDragging && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-2 border-indigo-600 border-dashed m-3 rounded-2xl pointer-events-none animate-in fade-in duration-150">
          <UploadCloud className="w-10 h-10 text-indigo-600 animate-bounce mb-2" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">Drop Challan File Here</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Release to start instant OCR scan</p>
        </div>
      )}

      {/* Drag Overlay */}
      {isFileDragging && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-2 border-indigo-600 border-dashed m-3 rounded-2xl pointer-events-none animate-in fade-in duration-150">
          <UploadCloud className="w-10 h-10 text-indigo-600 animate-bounce mb-2" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">Drop Challan File Here</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Release to start instant OCR scan</p>
        </div>
      )}

      {/* AI Scanning / Processing Shimmer Skeleton Overlay */}
      {(isProcessingPhoto || isScanning) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs p-6 text-center animate-in fade-in">
          <div className="relative mb-3.5">
            <div className="w-12 h-12 rounded-full border-3 border-indigo-100 dark:border-indigo-950 border-t-indigo-600 animate-spin" />
            <Sparkles className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto" />
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {isProcessingPhoto
              ? 'Optimizing challan photo & scanning with Gemini...'
              : 'Gemini Vision is parsing handwritten text...'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            {isProcessingPhoto
              ? 'Preparing high-clarity image for instant OCR processing.'
              : 'Extracting party, weights, bags, calculations, and notes.'}
          </p>
        </div>
      )}
    </div>
  )
}
