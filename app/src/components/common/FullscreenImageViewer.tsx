import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Image as ImageIcon,
} from 'lucide-react';
import { triggerHaptic } from '@/utils/haptics';
import { ImpactStyle } from '@capacitor/haptics';
import { isTouchOrMobileDevice } from '@/utils/device';

export interface FullscreenImageViewerProps {
  isOpen: boolean;
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

export type ChallanPhotoLightboxProps = FullscreenImageViewerProps;

export function FullscreenImageViewer({
  isOpen,
  imageUrl,
  title = 'Challan Slip',
  subtitle,
  onClose,
}: FullscreenImageViewerProps) {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);

  // Motion value for vertical swipe-to-dismiss gesture when scale === 1
  const dismissY = useMotionValue(0);
  const backdropOpacity = useTransform(dismissY, [0, 220], [1, 0.4]);
  const imageScaleOnDismiss = useTransform(dismissY, [0, 220], [1, 0.88]);

  // Reset zoom, rotation & pan when image changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
      setImageError(false);
      dismissY.set(0);
      triggerHaptic(ImpactStyle.Light);

      // Lock document body scroll
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen, imageUrl, dismissY]);

  // Handle ESC key to close, + / - to zoom, r to rotate, 0 to reset
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setScale((prev) => Math.min(4, Number((prev + 0.25).toFixed(2))));
      } else if (e.key === '-') {
        e.preventDefault();
        setScale((prev) => {
          const next = Math.max(1, Number((prev - 0.25).toFixed(2)));
          if (next === 1) setPosition({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        e.preventDefault();
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setRotation((prev) => (prev + 90) % 360);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Non-passive wheel handler to prevent browser webpage zoom on Mac trackpad pinch
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      // Pinch gesture on Mac trackpads or Ctrl+wheel sends ctrlKey = true
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = -e.deltaY * 0.01;
        setScale((prev) => {
          const next = Math.min(4, Math.max(1, Number((prev + zoomDelta).toFixed(2))));
          if (next === 1) setPosition({ x: 0, y: 0 });
          return next;
        });
      } else if (scale > 1) {
        // Pan with normal two-finger swipe when zoomed
        e.preventDefault();
        setPosition((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isOpen, scale]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(4, Number((prev + 0.35).toFixed(2))));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(1, Number((prev - 0.35).toFixed(2)));
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Double-tap or double-click to toggle zoom between 1x and 2.5x
  const handleDoubleTap = () => {
    triggerHaptic(ImpactStyle.Light);
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  const handleContainerTap = (e: React.MouseEvent | React.TouchEvent) => {
    const isImageClick = (e.target as HTMLElement).tagName === 'IMG';

    // Click on the backdrop/overlay outside the image dismisses the viewer
    if (!isImageClick && scale === 1 && !isDragging) {
      triggerHaptic(ImpactStyle.Light);
      onClose();
      return;
    }

    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      e.preventDefault();
      handleDoubleTap();
      lastTapTimeRef.current = 0;
    } else {
      lastTapTimeRef.current = now;
    }
  };

  // Mouse pan handlers (active when scale > 1)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan & pinch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialPinchDistRef.current > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = (dist - initialPinchDistRef.current) * 0.006;
      setScale((prev) => {
        const next = Math.min(4, Math.max(1, Number((prev + diff).toFixed(2))));
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    initialPinchDistRef.current = 0;
  };

  // Downward swipe-to-dismiss when scale === 1
  const handleDragDismissEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (scale === 1 && (info.offset.y > 100 || info.velocity.y > 450)) {
      triggerHaptic(ImpactStyle.Medium);
      onClose();
    } else {
      dismissY.set(0);
    }
  };

  const handleDownload = useCallback(() => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `challan-${(title || 'slip').replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [imageUrl, title]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && imageUrl && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Challan Slip Preview'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ opacity: backdropOpacity }}
          className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col justify-between overflow-hidden select-none"
        >
          {/* Top Header Bar */}
          <div className="w-full flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 z-30 shrink-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            {/* Left: Metadata Title */}
            <div className="flex items-center gap-2.5 min-w-0 pr-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-white/60 truncate mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Right: Circular Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                title="Download Challan Photo"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-sm"
                aria-label="Download"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  onClose();
                }}
                title="Close (Esc)"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-sm"
                aria-label="Close Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Centered Floating Viewport */}
          <div
            ref={containerRef}
            onClick={handleContainerTap}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`flex-1 flex items-center justify-center p-4 overflow-hidden relative ${
              scale > 1
                ? isDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : 'cursor-default'
            }`}
            style={{ touchAction: 'none' }}
          >
            {imageError ? (
              <div className="flex flex-col items-center justify-center text-center p-6 bg-white/5 rounded-2xl border border-white/10 max-w-sm">
                <ImageIcon className="w-12 h-12 text-slate-500 mb-3" />
                <p className="text-sm font-semibold text-slate-300">Unable to load challan photo</p>
                <p className="text-xs text-slate-500 mt-1">
                  The image file or preview data may no longer be available.
                </p>
              </div>
            ) : (
              <motion.div
                drag={scale === 1 ? 'y' : false}
                dragDirectionLock
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.05, bottom: 0.75 }}
                onDragEnd={handleDragDismissEnd}
                style={{ y: dismissY, scale: imageScaleOnDismiss }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 28, stiffness: 350, mass: 0.8 }}
                className="relative flex items-center justify-center w-full h-full pointer-events-auto"
              >
                <img
                  src={imageUrl}
                  alt={title}
                  onError={() => setImageError(true)}
                  draggable={false}
                  className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl select-none transition-transform duration-75"
                  style={{
                    transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                />
              </motion.div>
            )}
          </div>

          {/* Bottom Floating Pill Toolbar & Gesture Hints */}
          <div className="w-full flex flex-col items-center pb-[max(1.25rem,env(safe-area-inset-bottom))] px-4 z-30 shrink-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
            {/* Gesture Hint */}
            <p className="text-[11px] font-medium text-white/50 mb-2 pointer-events-none text-center">
              {scale === 1
                ? isTouchOrMobileDevice()
                  ? 'Swipe down to dismiss • Double-tap to zoom'
                  : 'Click background or press Esc to dismiss • Double-click to zoom'
                : 'Drag to pan • Double-tap or press 100% to reset'}
            </p>

            {/* Glassmorphism Controls Pill */}
            <div className="flex items-center bg-white/10 backdrop-blur-xl border border-white/15 shadow-2xl rounded-full px-3 py-1.5 gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= 1}
                title="Zoom Out (-)"
                className="p-1.5 hover:bg-white/15 rounded-full text-slate-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer active:scale-90"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="px-2 text-xs font-semibold tabular-nums text-white min-w-[46px] text-center font-mono">
                {Math.round(scale * 100)}%
              </span>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 4}
                title="Zoom In (+)"
                className="p-1.5 hover:bg-white/15 rounded-full text-slate-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer active:scale-90"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="w-px h-3.5 bg-white/20 mx-1" />

              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset Zoom & Orientation"
                className="px-2.5 py-1 hover:bg-white/15 rounded-full text-[11px] font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer active:scale-95"
              >
                100%
              </button>

              <button
                type="button"
                onClick={handleRotate}
                title="Rotate 90° (R)"
                className="p-1.5 hover:bg-white/15 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer active:scale-90"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export { FullscreenImageViewer as ChallanPhotoLightbox };
export default FullscreenImageViewer;
