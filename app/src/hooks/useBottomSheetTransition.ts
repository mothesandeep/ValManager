import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseBottomSheetTransitionOptions {
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
  dismissOnDrag?: boolean;
}

export function useBottomSheetTransition({
  isOpen,
  onClose,
  duration = 250,
  dismissOnDrag = false,
}: UseBottomSheetTransitionOptions) {
  const [isRendered, setIsRendered] = useState<boolean>(isOpen);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSnapping, setIsSnapping] = useState<boolean>(false);

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastTouchY = useRef<number>(0);
  const lastTouchTime = useRef<number>(0);
  const velocityY = useRef<number>(0);
  const rawDiffRef = useRef<number>(0);

  const isClosingRef = useRef<boolean>(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      isClosingRef.current = false;
      setIsRendered(true);
      const rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      return () => cancelAnimationFrame(rafId);
    } else if (isRendered && !isClosingRef.current) {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, isRendered]);

  const handleDismiss = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsVisible(false);
    setDragOffset(0);
    setIsDragging(false);
    setIsSnapping(false);
    setTimeout(() => {
      onCloseRef.current();
      setIsRendered(false);
      isClosingRef.current = false;
    }, duration);
  }, [duration]);

  // Touch Swipe-Down logic with elastic resistance and target isolation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Isolate from interactive child controls (buttons, inputs, dropdowns)
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, input, select, textarea, a, [role="button"], [data-no-drag]')) {
      return;
    }

    const clientY = e.touches[0].clientY;
    touchStartY.current = clientY;
    lastTouchY.current = clientY;
    lastTouchTime.current = performance.now();
    velocityY.current = 0;
    rawDiffRef.current = 0;

    setIsDragging(true);
    setIsSnapping(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const now = performance.now();
    const rawDiff = currentY - touchStartY.current;
    rawDiffRef.current = rawDiff;

    // Upward dragging locked (dragConstraints top: 0, dragElastic top: 0)
    if (rawDiff <= 0) {
      setDragOffset(0);
      velocityY.current = 0;
      return;
    }

    // Downward elastic resistance physics (dragElastic bottom: 0.5):
    // Progressive dampening gives tangible weight so it feels controlled
    const dampedOffset = rawDiff < 80 
      ? rawDiff * 0.7 
      : 56 + (rawDiff - 80) * 0.5;

    setDragOffset(dampedOffset);

    // Track instantaneous velocity (pixels/second)
    const dt = now - lastTouchTime.current;
    if (dt > 8) {
      const dy = currentY - lastTouchY.current;
      velocityY.current = (dy / dt) * 1000;
      lastTouchY.current = currentY;
      lastTouchTime.current = now;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartY.current === null) return;
    touchStartY.current = null;
    setIsDragging(false);

    // Inspect sheet height for threshold calculation
    const sheetHeight = sheetRef.current?.offsetHeight || (typeof window !== 'undefined' ? window.innerHeight * 0.88 : 700);

    // Dismiss threshold: 35% of sheet height or minimum 150px
    const dismissThreshold = Math.max(150, sheetHeight * 0.35);

    // Velocity check: Fast flick/swipe down (> 600 px/s with intentional > 35px drag)
    const isFastFlick = velocityY.current > 600 && rawDiffRef.current > 35;
    const isPastThreshold = rawDiffRef.current >= dismissThreshold || dragOffset >= dismissThreshold * 0.65;

    if (dismissOnDrag && (isPastThreshold || isFastFlick)) {
      handleDismiss();
    } else {
      // Snap-Back Spring Animation:
      // Release smoothly snaps back to 0 with spring damping without dismissing
      setIsSnapping(true);
      setDragOffset(0);
      setTimeout(() => {
        setIsSnapping(false);
      }, 350);
    }
  }, [dragOffset, handleDismiss, dismissOnDrag]);

  const handleTouchCancel = useCallback(() => {
    touchStartY.current = null;
    setIsDragging(false);
    setIsSnapping(true);
    setDragOffset(0);
    setTimeout(() => {
      setIsSnapping(false);
    }, 350);
  }, []);

  // Escape key dismiss support
  useEffect(() => {
    if (!isRendered) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRendered, handleDismiss]);

  // Backdrop opacity and blur interpolation based on drag progress
  const thresholdDist = typeof window !== 'undefined' ? Math.max(150, window.innerHeight * 0.3) : 220;
  const dragFraction = Math.min(1, Math.max(0, dragOffset / (thresholdDist * 0.85)));

  const backdropOpacity = isVisible
    ? isDragging
      ? Math.max(0.2, 1 - dragFraction * 0.75)
      : 1
    : 0;

  const backdropBlurPx = isVisible
    ? isDragging
      ? Math.max(0, 8 * (1 - dragFraction * 0.8))
      : 8
    : 0;

  const backdropStyle: React.CSSProperties = {
    opacity: backdropOpacity,
    backdropFilter: `blur(${backdropBlurPx}px)`,
    WebkitBackdropFilter: `blur(${backdropBlurPx}px)`,
    transition: isDragging
      ? 'none'
      : 'opacity 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.15), backdrop-filter 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.15), -webkit-backdrop-filter 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.15)',
  };

  const sheetStyle: React.CSSProperties = {
    transform: dragOffset > 0 ? `translate3d(0, ${dragOffset}px, 0)` : undefined,
    transition: isDragging
      ? 'none'
      : isSnapping
        ? 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.15)'
        : undefined,
  };

  return {
    sheetRef,
    isRendered,
    isVisible,
    dragOffset,
    isDragging,
    isSnapping,
    backdropOpacity,
    backdropBlurPx,
    backdropStyle,
    sheetStyle,
    handleDismiss,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  };
}
