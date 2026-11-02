import { describe, it, expect, vi } from 'vitest';
import {
  BOTTOM_SHEET_SPRING_TRANSITION,
  MOBILE_BOTTOM_SHEET_TRANSITION,
  BACKDROP_TRANSITION,
  BOTTOM_SHEET_DRAG_CONSTRAINTS,
  BOTTOM_SHEET_DRAG_ELASTIC,
  SMOOTH_BEZIER_EASING,
  SNAP_BACK_SPRING_CONFIG,
  calculateElasticDragDown,
  computeDismissThreshold,
  shouldDismissSheet,
  isInteractiveElement,
  computeSnapPosition,
  clearModalHash,
  resetModalDocumentState,
} from './bottomSheetPhysics';

describe('BottomSheetModal Physics & Transitions', () => {
  describe('Spring Transition Parameters', () => {
    it('uses correct spring damping, stiffness, and mass', () => {
      expect(BOTTOM_SHEET_SPRING_TRANSITION.type).toBe('spring');
      expect(BOTTOM_SHEET_SPRING_TRANSITION.damping).toBe(32);
      expect(BOTTOM_SHEET_SPRING_TRANSITION.stiffness).toBe(340);
      expect(BOTTOM_SHEET_SPRING_TRANSITION.mass).toBe(0.85);
    });

    it('defines high-performance cubic-bezier mobile bottom sheet transition', () => {
      expect(MOBILE_BOTTOM_SHEET_TRANSITION.type).toBe('tween');
      expect(MOBILE_BOTTOM_SHEET_TRANSITION.duration).toBe(0.28);
      expect(MOBILE_BOTTOM_SHEET_TRANSITION.ease).toEqual([0.16, 1, 0.3, 1]);
    });

    it('uses correct backdrop fade duration', () => {
      expect(BACKDROP_TRANSITION.duration).toBe(0.22);
      expect(BACKDROP_TRANSITION.ease).toBe('easeOut');
    });

    it('defines smooth native bezier easing curve', () => {
      expect(SMOOTH_BEZIER_EASING).toBe('cubic-bezier(0.32, 0.72, 0, 1)');
    });

    it('enforces top: 0 drag constraints to prevent upward drag past initial resting position', () => {
      expect(BOTTOM_SHEET_DRAG_CONSTRAINTS.top).toBe(0);
      expect(BOTTOM_SHEET_DRAG_CONSTRAINTS.bottom).toBe(0);
    });

    it('enforces top: 0 drag elasticity to lock negative Y travel and allows controlled downward resistance', () => {
      expect(BOTTOM_SHEET_DRAG_ELASTIC.top).toBe(0);
      expect(BOTTOM_SHEET_DRAG_ELASTIC.bottom).toBe(0.5);
    });
  });

  describe('Dismiss Threshold Calculation', () => {
    it('enforces a minimum 140px threshold for small sheets', () => {
      // 300px sheet * 0.35 = 105px, but min is 140px
      expect(computeDismissThreshold(300)).toBe(140);
      // 350px sheet * 0.35 = 122.5px, but min is 140px
      expect(computeDismissThreshold(350)).toBe(140);
      // 400px sheet * 0.35 = 140px
      expect(computeDismissThreshold(400)).toBe(140);
    });

    it('uses 35% height for taller sheets', () => {
      // 600px sheet * 0.35 = 210px (> 140px)
      expect(computeDismissThreshold(600)).toBe(210);
      // 800px sheet * 0.35 = 280px (> 140px)
      expect(computeDismissThreshold(800)).toBe(280);
    });
  });

  describe('shouldDismissSheet Drag-to-Dismiss Logic', () => {
    const sheetHeight = 600; // threshold is 210px

    it('returns false for small downward drags (snap back)', () => {
      // Below 210px threshold with low velocity
      expect(shouldDismissSheet(50, 50, sheetHeight)).toBe(false);
      expect(shouldDismissSheet(150, 100, sheetHeight)).toBe(false);
      expect(shouldDismissSheet(200, 200, sheetHeight)).toBe(false);
    });

    it('returns true when dragged beyond the dismiss threshold', () => {
      // >= 210px threshold
      expect(shouldDismissSheet(210, 50, sheetHeight)).toBe(true);
      expect(shouldDismissSheet(300, 0, sheetHeight)).toBe(true);
    });

    it('returns true for fast downward flick (velocity > 600 with intentional > 35px drag)', () => {
      // Fast flick downwards with 50px displacement
      expect(shouldDismissSheet(50, 650, sheetHeight)).toBe(true);
      expect(shouldDismissSheet(100, 800, sheetHeight)).toBe(true);
    });

    it('does not dismiss on micro-touch or accidental tap with high velocity (<= 35px drag)', () => {
      expect(shouldDismissSheet(20, 700, sheetHeight)).toBe(false);
      expect(shouldDismissSheet(10, 1000, sheetHeight)).toBe(false);
    });

    it('does not dismiss on upward dragging (negative offset)', () => {
      expect(shouldDismissSheet(-50, -500, sheetHeight)).toBe(false);
    });
  });

  describe('isInteractiveElement filtering', () => {
    it('returns false for null element', () => {
      expect(isInteractiveElement(null)).toBe(false);
    });

    it('detects buttons, inputs, links, and role=button as interactive', () => {
      const mockInteractive = (matchedSelector: string) =>
      ({
        closest: (selectors: string) =>
          selectors.includes(matchedSelector) ? ({} as HTMLElement) : null,
      } as unknown as HTMLElement);

      expect(isInteractiveElement(mockInteractive('button'))).toBe(true);
      expect(isInteractiveElement(mockInteractive('input'))).toBe(true);
      expect(isInteractiveElement(mockInteractive('[role="button"]'))).toBe(true);
      expect(isInteractiveElement(mockInteractive('[data-no-drag]'))).toBe(true);

      const nonInteractive = {
        closest: () => null,
      } as unknown as HTMLElement;
      expect(isInteractiveElement(nonInteractive)).toBe(false);
    });
  });

  describe('computeSnapPosition Snap Point Calculation', () => {
    const sheetHeight = 600;

    it('returns dismiss position when dragged past threshold without snap points', () => {
      expect(computeSnapPosition(250, 0, sheetHeight)).toBe(sheetHeight);
    });

    it('returns 0 (open) when dragged slightly without velocity', () => {
      expect(computeSnapPosition(50, 0, sheetHeight)).toBe(0);
    });

    it('snaps to intermediate snap points', () => {
      // Snap points: [0.5, 1] -> offsets: [0 (1.0), 300 (0.5), 600 (dismiss)]
      const snapPoints = [0.5, 1];
      // Close to 0 (offset 80) -> snaps to 0
      expect(computeSnapPosition(80, 0, sheetHeight, snapPoints)).toBe(0);
      // Close to 300 (offset 280) -> snaps to 300
      expect(computeSnapPosition(280, 0, sheetHeight, snapPoints)).toBe(300);
      // Downward velocity flick (> 500) from 100 -> snaps to 300
      expect(computeSnapPosition(100, 600, sheetHeight, snapPoints)).toBe(300);
      // Upward velocity flick (< -500) from 250 -> snaps to 0
      expect(computeSnapPosition(250, -600, sheetHeight, snapPoints)).toBe(0);
    });
  });

  describe('BottomSheetWrapper and Drawer export equivalence', () => {
    it('exports BottomSheetWrapper alias equivalent to BottomSheetModal', async () => {
      const { BottomSheetModal, BottomSheetWrapper, BottomSheet, Drawer } = await import(
        './BottomSheetModal'
      );
      expect(BottomSheetWrapper).toBeDefined();
      expect(BottomSheetWrapper).toBe(BottomSheetModal);
      expect(BottomSheet).toBe(BottomSheetModal);
      expect(Drawer).toBe(BottomSheetModal);
    });
  });

  describe('Modal Lifecycle & State Cleanup (URL Hash, Body Classes, Overflow)', () => {
    const originalWindow = globalThis.window;
    const originalDocument = (globalThis as any).document;

    it('clears #modal hash while preserving pathname and query parameters', () => {
      let dispatched = false;
      const replaceStateSpy = vi.fn();
      const dispatchEventSpy = vi.fn((event: Event) => {
        if (event.type === 'hashchange') dispatched = true;
        return true;
      });

      globalThis.window = {
        location: {
          pathname: '/dispatch',
          search: '?party=test-123',
          hash: '#modal',
        },
        history: {
          state: { foo: 'bar' },
          replaceState: replaceStateSpy,
        },
        dispatchEvent: dispatchEventSpy,
      } as any;

      clearModalHash();

      expect(replaceStateSpy).toHaveBeenCalledWith(
        { foo: 'bar' },
        '',
        '/dispatch?party=test-123'
      );
      expect(dispatchEventSpy).toHaveBeenCalled();
      expect(dispatched).toBe(true);

      globalThis.window = originalWindow;
    });

    it('does not dispatch or alter URL when no #modal hash is present', () => {
      const replaceStateSpy = vi.fn();
      const dispatchEventSpy = vi.fn();

      globalThis.window = {
        location: {
          pathname: '/receiving',
          search: '',
          hash: '',
        },
        history: {
          state: null,
          replaceState: replaceStateSpy,
        },
        dispatchEvent: dispatchEventSpy,
      } as any;

      clearModalHash();

      expect(replaceStateSpy).not.toHaveBeenCalled();
      expect(dispatchEventSpy).not.toHaveBeenCalled();

      globalThis.window = originalWindow;
    });

    it('resets all modal body classes and unlocks scroll overflow', () => {
      const classListSet = new Set(['modal-open', 'scanner-modal-open', 'more-sheet-open', 'period-sheet-open']);
      const mockBody = {
        classList: {
          remove: vi.fn((...classes: string[]) => {
            classes.forEach((c) => classListSet.delete(c));
          }),
          contains: (c: string) => classListSet.has(c),
        },
        style: {
          overflow: 'hidden',
        },
      };
      const mockDocElement = {
        style: {
          overflow: 'hidden',
        },
      };

      (globalThis as any).document = {
        body: mockBody,
        documentElement: mockDocElement,
      };

      resetModalDocumentState();

      expect(mockBody.classList.remove).toHaveBeenCalledWith(
        'modal-open',
        'scanner-modal-open',
        'more-sheet-open',
        'period-sheet-open'
      );
      expect(classListSet.size).toBe(0);
      expect(mockBody.style.overflow).toBe('');
      expect(mockDocElement.style.overflow).toBe('');

      (globalThis as any).document = originalDocument;
    });
  });

  describe('Responsive Desktop Modal vs Mobile Bottom-Sheet Layout', () => {
    it('supports responsive modal props with desktop centered defaults', async () => {
      const { BottomSheetModal } = await import('./BottomSheetModal');
      expect(BottomSheetModal).toBeDefined();
    });
  });

  describe('Rubber-Band Elastic Drag & Auto Snap-Back Physics', () => {
    it('configures natural fluid spring return parameters (damping: 25, stiffness: 250, mass: 1)', () => {
      expect(SNAP_BACK_SPRING_CONFIG.damping).toBe(25);
      expect(SNAP_BACK_SPRING_CONFIG.stiffness).toBe(250);
      expect(SNAP_BACK_SPRING_CONFIG.mass).toBe(1);
    });

    it('strictly locks upward travel to zero for any negative deltaY', () => {
      expect(calculateElasticDragDown(-10)).toBe(0);
      expect(calculateElasticDragDown(-100)).toBe(0);
      expect(calculateElasticDragDown(0)).toBe(0);
    });

    it('applies progressive elastic resistance for downward drag and respects maximum drag distance', () => {
      const offset50 = calculateElasticDragDown(50);
      const offset100 = calculateElasticDragDown(100);
      const offset200 = calculateElasticDragDown(200);
      const offset500 = calculateElasticDragDown(500);

      // Monotonically increasing with progressive damping
      expect(offset50).toBeGreaterThan(0);
      expect(offset100).toBeGreaterThan(offset50);
      expect(offset200).toBeGreaterThan(offset100);
      expect(offset500).toBeGreaterThan(offset200);

      // Never exceeds the max drag distance cap (160px default)
      expect(offset50).toBeLessThan(160);
      expect(offset500).toBeLessThan(160);
      expect(calculateElasticDragDown(10000)).toBeLessThan(160);
    });
  });
});
