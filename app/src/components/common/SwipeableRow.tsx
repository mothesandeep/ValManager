import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { ImpactStyle } from '@capacitor/haptics';

export interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

const SWIPE_REVEAL_WIDTH = 84;
const HAPTIC_THRESHOLD = -50;

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  onDelete,
  onClick,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const x = useMotionValue(0);
  const hasTriggeredHapticRef = useRef(false);
  const isDraggingRef = useRef(false);

  // Transform opacity and scale of the background delete button as user swipes
  const deleteOpacity = useTransform(x, [0, -40, -SWIPE_REVEAL_WIDTH], [0, 0.7, 1]);
  const deleteScale = useTransform(x, [0, -SWIPE_REVEAL_WIDTH], [0.8, 1]);

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    isDraggingRef.current = true;
    if (info.offset.x <= HAPTIC_THRESHOLD && !hasTriggeredHapticRef.current) {
      hasTriggeredHapticRef.current = true;
      triggerHaptic(ImpactStyle.Medium);
    } else if (info.offset.x > HAPTIC_THRESHOLD) {
      hasTriggeredHapticRef.current = false;
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    hasTriggeredHapticRef.current = false;
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);

    // If dragged with high velocity or past half the reveal width, snap open
    if (info.offset.x < -40 || info.velocity.x < -300) {
      setIsOpen(true);
      // If dragged extensively past threshold (e.g. -160px), trigger delete confirmation directly
      if (info.offset.x < -160) {
        onDelete();
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDraggingRef.current) return;
    if (isOpen) {
      e.stopPropagation();
      setIsOpen(false);
      return;
    }
    onClick?.();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(ImpactStyle.Medium);
    onDelete();
    setIsOpen(false);
  };

  return (
    <div className={`relative overflow-hidden rounded-xl select-none ${className}`}>
      {/* Background Red Delete Action Button */}
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-y-0 right-0 flex items-center justify-end z-0 bg-rose-600 rounded-r-xl"
      >
        <motion.button
          type="button"
          style={{ scale: deleteScale, width: SWIPE_REVEAL_WIDTH }}
          onClick={handleDeleteClick}
          className="h-full bg-rose-600 text-white flex flex-col items-center justify-center font-medium text-xs px-5 rounded-r-xl cursor-pointer active:brightness-90 transition-all gap-1"
          aria-label="Delete"
        >
          <Trash2 size={16} strokeWidth={2.2} />
          <span className="text-[11px] font-semibold tracking-wide">Delete</span>
        </motion.button>
      </motion.div>

      {/* Foreground Swipeable Item */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: -SWIPE_REVEAL_WIDTH, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: isOpen ? -SWIPE_REVEAL_WIDTH : 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350, mass: 0.8 }}
        style={{ x }}
        onClick={handleClick}
        className="relative z-10 bg-white dark:bg-slate-900 active:bg-slate-100 dark:active:bg-slate-800 transition-colors cursor-pointer"
      >
        {children}
      </motion.div>
    </div>
  );
};
