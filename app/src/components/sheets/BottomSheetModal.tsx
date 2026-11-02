import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion';
import { X } from 'lucide-react';
import { SyncIndicator } from '@/components/common/SyncIndicator';
import {
  MOBILE_BOTTOM_SHEET_TRANSITION,
  BACKDROP_TRANSITION,
  SNAP_BACK_SPRING_CONFIG,
  calculateElasticDragDown,
  shouldDismissSheet,
  isInteractiveElement,
  clearModalHash,
  resetModalDocumentState,
} from './bottomSheetPhysics';

export interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerExtra?: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  className?: string;
  bodyClassName?: string;
  hideHeader?: boolean;
  customHeader?: React.ReactNode;
  hideDragHandle?: boolean;
  hideScrollbar?: boolean;
  containerProps?: HTMLMotionProps<'div'>;
  syncHashModal?: boolean;
  syncFabState?: boolean;
  showSyncIndicator?: boolean;
  enableContentDrag?: boolean;
  closeOnBackdropClick?: boolean;
  dismissOnDrag?: boolean;
  closeOnEsc?: boolean;
  children: React.ReactNode;
}

export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  isOpen,
  onClose,
  category,
  title,
  subtitle,
  headerExtra,
  headerRight,
  footer,
  maxWidth = 'md:max-w-4xl',
  maxHeight = 'max-h-[90dvh] md:max-h-[85vh]',
  className = '',
  bodyClassName = '',
  hideHeader = false,
  customHeader,
  hideDragHandle = false,
  hideScrollbar = false,
  containerProps,
  syncHashModal = true,
  syncFabState = true,
  showSyncIndicator = false,
  enableContentDrag: _enableContentDrag = false,
  closeOnBackdropClick = false,
  dismissOnDrag = false,
  closeOnEsc = true,
  children,
}) => {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const openTimeRef = useRef<number>(0);
  const hadHashRef = useRef(false);

  // Drag-and-snap spring physics state & refs
  const isDraggingRef = useRef<boolean>(false);
  const [, setIsDragging] = useState<boolean>(false);
  const startYRef = useRef<number>(0);
  const currentOffsetRef = useRef<number>(0);
  const snapRafId = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  // Responsive layout tracking: disable drag & center dialog on desktop (>= 768px / md)
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mql.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    } else if (mql.addListener) {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, []);

  const cancelSnapAnimation = useCallback(() => {
    if (snapRafId.current !== null) {
      cancelAnimationFrame(snapRafId.current);
      snapRafId.current = null;
    }
  }, []);

  // Smooth fluid spring return simulation (damping: 25, stiffness: 250, mass: 1)
  const runSpringSnapBack = useCallback(() => {
    cancelSnapAnimation();
    let currentY = currentOffsetRef.current;
    if (currentY <= 0) {
      currentOffsetRef.current = 0;
      if (sheetRef.current) {
        sheetRef.current.style.transform = '';
      }
      setIsDragging(false);
      return;
    }

    let velocity = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.032, (now - lastTime) / 1000);
      lastTime = now;

      const springForce = -SNAP_BACK_SPRING_CONFIG.stiffness * currentY;
      const dampingForce = -SNAP_BACK_SPRING_CONFIG.damping * velocity;
      const acceleration = (springForce + dampingForce) / SNAP_BACK_SPRING_CONFIG.mass;

      velocity += acceleration * dt;
      currentY += velocity * dt;

      if (Math.abs(currentY) < 0.2 && Math.abs(velocity) < 2) {
        currentOffsetRef.current = 0;
        if (sheetRef.current) {
          sheetRef.current.style.transform = '';
        }
        setIsDragging(false);
        snapRafId.current = null;
        return;
      }

      currentOffsetRef.current = currentY;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translate3d(0, ${currentY.toFixed(2)}px, 0)`;
      }
      snapRafId.current = requestAnimationFrame(step);
    };

    snapRafId.current = requestAnimationFrame(step);
  }, [cancelSnapAnimation]);

  // Canonical dismissal handler: synchronously marks sheet, cleans URL hash and modal classes
  const handleDismiss = useCallback(() => {
    cancelSnapAnimation();
    isDraggingRef.current = false;
    currentOffsetRef.current = 0;
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
      sheetRef.current.setAttribute('data-closing', 'true');
      sheetRef.current.style.pointerEvents = 'none';
    }
    if (syncHashModal) {
      clearModalHash();
    }
    if (syncFabState) {
      resetModalDocumentState();
      window.dispatchEvent(new CustomEvent('kasab:modal-state', { detail: { open: false } }));
    }
    onClose();
  }, [onClose, syncHashModal, syncFabState, cancelSnapAnimation]);

  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now();
      if (sheetRef.current) {
        sheetRef.current.removeAttribute('data-closing');
        sheetRef.current.style.pointerEvents = '';
      }
      if (window.location.hash.includes('modal')) {
        hadHashRef.current = true;
      }
    } else {
      hadHashRef.current = false;
      cancelSnapAnimation();
      isDraggingRef.current = false;
      currentOffsetRef.current = 0;
      if (sheetRef.current) {
        sheetRef.current.style.transform = '';
        sheetRef.current.setAttribute('data-closing', 'true');
        sheetRef.current.style.pointerEvents = 'none';
      }
    }
    return () => {
      cancelSnapAnimation();
    };
  }, [isOpen, cancelSnapAnimation]);

  // Smoothly center focused input in visible viewport when on-screen keyboard appears
  useEffect(() => {
    if (!isOpen) return;
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.getAttribute('contenteditable') === 'true')
      ) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      }
    };

    contentEl.addEventListener('focusin', handleFocusIn);
    return () => contentEl.removeEventListener('focusin', handleFocusIn);
  }, [isOpen]);

  // Handle mobile hardware back button (#modal hash & custom back event)
  useEffect(() => {
    if (!isOpen) return;
    const handleCloseActive = () => {
      handleDismiss();
    };
    window.addEventListener('kasab:close-active-modal', handleCloseActive);
    return () => window.removeEventListener('kasab:close-active-modal', handleCloseActive);
  }, [isOpen, handleDismiss]);

  // Handle mobile hardware back button (#modal hash)
  useEffect(() => {
    if (!syncHashModal) return;
    if (isOpen && window.location.hash.includes('modal')) {
      hadHashRef.current = true;
    }
    const handleHashChange = () => {
      if (window.location.hash.includes('modal')) {
        hadHashRef.current = true;
      } else if (hadHashRef.current && isOpen) {
        hadHashRef.current = false;
        handleDismiss();
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isOpen, handleDismiss, syncHashModal]);

  // Handle Escape key (only if closeOnEsc is explicitly enabled; default is explicit 'X' button only)
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDismiss, closeOnEsc]);

  // Synchronize modal state with document body and FAB event
  useEffect(() => {
    if (!syncFabState) return;
    if (isOpen) {
      document.body.classList.add('modal-open');
      window.dispatchEvent(new CustomEvent('kasab:modal-state', { detail: { open: true } }));
    } else {
      resetModalDocumentState();
      window.dispatchEvent(new CustomEvent('kasab:modal-state', { detail: { open: false } }));
      if (syncHashModal) {
        clearModalHash();
      }
    }
    return () => {
      resetModalDocumentState();
      window.dispatchEvent(new CustomEvent('kasab:modal-state', { detail: { open: false } }));
      if (syncHashModal) {
        clearModalHash();
      }
    };
  }, [isOpen, syncFabState, syncHashModal]);

  // Pointer drag on top drag handle pill or header bar (mobile only)
  const handlePointerDownHeader = useCallback(
    (e: React.PointerEvent) => {
      if (isDesktop) return;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (isInteractiveElement(target) || target?.closest('[data-no-drag]')) {
        return;
      }

      cancelSnapAnimation();
      isDraggingRef.current = true;
      startYRef.current = e.clientY - currentOffsetRef.current;
      activePointerIdRef.current = e.pointerId;
      setIsDragging(true);

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback for environments lacking PointerCapture
      }
    },
    [isDesktop, cancelSnapAnimation]
  );

  const handlePointerMoveHeader = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current || isDesktop) return;
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

      const rawDeltaY = e.clientY - startYRef.current;
      // Requirement 2: Upward drag strictly locked (y <= 0 blocked)
      // Downward drag has smooth elastic resistance (max 150-200px)
      const dampedY = calculateElasticDragDown(rawDeltaY, 160);

      currentOffsetRef.current = dampedY;
      if (sheetRef.current) {
        sheetRef.current.style.transform = dampedY > 0 ? `translate3d(0, ${dampedY.toFixed(2)}px, 0)` : '';
      }
    },
    [isDesktop]
  );

  const handlePointerUpHeader = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      activePointerIdRef.current = null;

      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Safe fallback
      }

      // Check optional dismiss if dismissOnDrag is explicitly true
      const sheetHeight =
        sheetRef.current?.offsetHeight ||
        (typeof window !== 'undefined' ? window.innerHeight * 0.85 : 600);
      if (dismissOnDrag && shouldDismissSheet(currentOffsetRef.current, 0, sheetHeight)) {
        handleDismiss();
        return;
      }

      // Requirement 3: When released, smoothly spring/snap back to full top position (never dismiss)
      runSpringSnapBack();
    },
    [dismissOnDrag, handleDismiss, runSpringSnapBack]
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    e.stopPropagation();
    if (!closeOnBackdropClick) {
      // Outside dismiss disabled by default: clicking backdrop does not close sheet
      return;
    }
    // Prevent accidental dismissal from bubbled click or touch events within 150ms of opening
    if (Date.now() - openTimeRef.current < 150) {
      return;
    }
    handleDismiss();
  };

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        if (syncFabState) {
          resetModalDocumentState();
        }
        if (syncHashModal) {
          clearModalHash();
        }
      }}
    >
      {isOpen && (
        <motion.div
          key="bottom-sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={BACKDROP_TRANSITION}
          onClick={handleBackdropClick}
          className={`fixed inset-0 z-40 bg-slate-950/60 dark:bg-black/70 md:backdrop-blur-xs ${
            closeOnBackdropClick ? 'cursor-pointer' : 'cursor-default'
          }`}
          aria-hidden="true"
        />
      )}

      {isOpen && (
        <motion.div
          key="bottom-sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-0 md:p-6 overflow-hidden pointer-events-none"
        >
          <motion.div
            key="bottom-sheet-container"
            role="dialog"
            aria-modal="true"
            data-modal-open="true"
            data-bottom-sheet="true"
            ref={sheetRef}
            initial={isDesktop ? { opacity: 0, scale: 0.96, y: 16 } : { y: '100%', opacity: 0 }}
            animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0, opacity: 1 }}
            exit={isDesktop ? { opacity: 0, scale: 0.96, y: 16, pointerEvents: 'none' } : { y: '100%', opacity: 0, pointerEvents: 'none' }}
            transition={isDesktop ? { duration: 0.2, ease: 'easeOut' } : MOBILE_BOTTOM_SHEET_TRANSITION}
            onClick={(e) => e.stopPropagation()}
            style={{
              willChange: 'transform',
              transform: 'translate3d(0, 0, 0)',
              WebkitTransform: 'translate3d(0, 0, 0)',
              ...containerProps?.style,
            }}
            className={`pointer-events-auto w-full rounded-t-3xl md:rounded-3xl bg-white dark:bg-slate-900 shadow-xl md:shadow-2xl flex flex-col border-t md:border border-slate-200/80 dark:border-slate-800 md:border-slate-200 dark:md:border-slate-800 overflow-hidden ${
              maxHeight || 'max-h-[92vh] md:max-h-[85vh]'
            } ${
              maxWidth || 'md:max-w-4xl'
            } ${className}`}
            {...containerProps}
          >
            {/* Top Drag Handle Bar (pill) - mobile only, completely hidden on desktop */}
            {!hideDragHandle && (
              <div
                className="flex md:hidden justify-center pt-2.5 pb-1 bg-white dark:bg-slate-900 shrink-0 z-20 cursor-grab active:cursor-grabbing touch-none select-none"
                onPointerDown={handlePointerDownHeader}
                onPointerMove={handlePointerMoveHeader}
                onPointerUp={handlePointerUpHeader}
                onPointerCancel={handlePointerUpHeader}
                data-drag-handle
                aria-label="Modal drag handle"
              >
                <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
              </div>
            )}

            {/* Modal Header */}
            {!hideHeader &&
              (customHeader ? (
                <div
                  className="shrink-0 z-20 touch-none select-none cursor-grab active:cursor-grabbing md:cursor-default"
                  onPointerDown={handlePointerDownHeader}
                  onPointerMove={handlePointerMoveHeader}
                  onPointerUp={handlePointerUpHeader}
                  onPointerCancel={handlePointerUpHeader}
                  data-drag-header
                >
                  {customHeader}
                </div>
              ) : (
                <div
                  className="px-5 sm:px-6 pt-3 pb-3 bg-white dark:bg-slate-900 flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 shrink-0 z-20 touch-none select-none cursor-grab active:cursor-grabbing md:cursor-default"
                  onPointerDown={handlePointerDownHeader}
                  onPointerMove={handlePointerMoveHeader}
                  onPointerUp={handlePointerUpHeader}
                  onPointerCancel={handlePointerUpHeader}
                  data-drag-header
                >
                  <div className="min-w-0 flex-1">
                    {category && (
                      <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">
                        {category}
                      </p>
                    )}
                    {title && (
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {subtitle}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {showSyncIndicator && <SyncIndicator compact={true} />}
                    {headerRight}
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-0 sm:min-h-0 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                      aria-label="Close modal"
                    >
                      <X size={18} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
              ))}

            {headerExtra}

            {/* Modal Body / Scrollable Content with prioritized native scrolling */}
            <div
              ref={contentRef}
              data-no-drag
              className={`flex-1 overflow-y-auto overscroll-contain touch-pan-y [webkit-overflow-scrolling:touch] transform-gpu ${
                hideScrollbar ? 'no-scrollbar' : 'scrollbar-thin'
              } ${bodyClassName || ''}`}
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorY: 'contain',
                touchAction: 'pan-y',
                willChange: 'scroll-position',
                transform: 'translateZ(0)',
              }}
            >
              {children}
            </div>

            {/* Fixed Sticky Footer Slot */}
            {footer && (
              <div className="shrink-0 w-full z-30">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const BottomSheet = BottomSheetModal;
export const Drawer = BottomSheetModal;
export const BottomSheetWrapper = BottomSheetModal;

export type BottomSheetProps = BottomSheetModalProps;
export type DrawerProps = BottomSheetModalProps;
export type BottomSheetWrapperProps = BottomSheetModalProps;

export default BottomSheetModal;
