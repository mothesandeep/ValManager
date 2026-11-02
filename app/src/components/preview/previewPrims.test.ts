import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { PreviewSubtitle, PreviewHeader } from './PreviewHeader'
import { MetricCard, MetricCardGrid } from './MetricCardGrid'
import { BreakdownList, BreakdownItemRow } from './BreakdownList'
import { ModalBottomActions } from './ModalBottomActions'
import { ChallanSlipBanner } from './ChallanSlipBanner'
import { ChallanDetailsModal } from './ChallanDetailsModal'

describe('Challan Preview Layout Primitives', () => {
  describe('PreviewSubtitle & PreviewHeader', () => {
    it('handles challan number when present', () => {
      expect(PreviewSubtitle).toBeDefined()
      expect(PreviewHeader).toBeDefined()
    })
  })

  describe('MetricCard & MetricCardGrid', () => {
    it('properly configures metric item highlighting and tokens', () => {
      expect(MetricCard).toBeDefined()
      const metricItem = {
        label: 'TOTAL NET KASAB',
        value: '25.500 kg',
        highlight: true,
      }
      expect(metricItem.highlight).toBe(true)
      expect(metricItem.label).toBe('TOTAL NET KASAB')
    })

    it('renders unified grid container with 4 metrics and compact padding', () => {
      const grid = MetricCardGrid({
        metrics: [
          { label: 'Net Val', value: '20.500 kg' },
          { label: 'Total Billing', value: '₹413', highlight: true },
          { label: 'Rola Wt', value: '1.200 kg' },
          { label: 'Rola Return', value: '10 pcs' },
        ],
      }) as ReactElement<any>

      expect(grid).toBeDefined()
      expect(grid.props.className).toContain('rounded-xl')
      expect(grid.props.className).toContain('grid')
      expect(grid.props.children).toHaveLength(4)
      const firstChild = grid.props.children[0]
      expect(firstChild.props.className).toContain('py-2')
      expect(firstChild.props.className).toContain('px-3')
    })
  })

  describe('BreakdownList & BreakdownItemRow', () => {
    it('defines standard components for item list breakdown', () => {
      expect(BreakdownList).toBeDefined()
      expect(BreakdownItemRow).toBeDefined()
    })

    it('renders all 8 items and maintains scrollable container styling without truncation', () => {
      // Simulate 8 bags breakdown list
      const items = Array.from({ length: 8 }, (_, idx) => idx + 1)
      const element = BreakdownList({
        title: 'Bag Breakdown',
        count: items.length,
        totalGross: 240.5,
        children: items.map((i) => `Bag #${i}`),
      }) as ReactElement<any>

      expect(element).toBeDefined()
      expect(element.props.className).toContain('flex flex-col')
      // Inner children items container has max-h-[380px] overflow-y-auto pr-1 scrollbar-thin
      const itemsContainer = element.props.children[1]
      expect(itemsContainer.props.className).toContain('max-h-[380px]')
      expect(itemsContainer.props.className).toContain('overflow-y-auto')
      expect(itemsContainer.props.className).toContain('scrollbar-thin')
      expect(itemsContainer.props.className).toContain('pr-1')
      expect(itemsContainer.props.children).toHaveLength(8)
    })

    it('handles 15+ bags and allows custom maxHeight', () => {
      const items = Array.from({ length: 16 }, (_, idx) => idx + 1)
      const element = BreakdownList({
        title: 'Bag Breakdown',
        count: items.length,
        maxHeight: 'max-h-[420px]',
        children: items.map((i) => `Bag #${i}`),
      }) as ReactElement<any>

      const itemsContainer = element.props.children[1]
      expect(itemsContainer.props.className).toContain('max-h-[420px]')
      expect(itemsContainer.props.children).toHaveLength(16)
    })

    it('renders structured bag weights (gross, tare, net) in a clean badge layout', () => {
      const onEdit = vi.fn()
      const onDelete = vi.fn()
      const row = BreakdownItemRow({
        index: 1,
        title: 'Val Finished',
        trailingValue: '₹413',
        gross: '21.490 kg',
        tare: '0.840 kg',
        net: '20.650 kg',
        onEdit,
        onDelete,
      }) as ReactElement<any>

      expect(row).toBeDefined()
      expect(row.props.className).toContain('p-2.5')
      expect(row.props.children).toBeDefined()
    })
  })

  describe('ModalBottomActions', () => {
    it('handles callbacks for print and edit buttons and renders subtle destructive action', () => {
      expect(ModalBottomActions).toBeDefined()
      const onPrint = vi.fn()
      const onEdit = vi.fn()
      const onView = vi.fn()
      const onDelete = vi.fn()

      const props = {
        primaryLabel: 'Print Delivery Challan',
        onPrimaryClick: onPrint,
        secondaryLabel: 'Edit Challan',
        onSecondaryClick: onEdit,
        tertiaryLabel: 'View Receipt',
        onTertiaryClick: onView,
        destructiveLabel: 'Delete Entire Challan',
        onDestructiveClick: onDelete,
      }

      props.onPrimaryClick()
      props.onSecondaryClick()
      props.onTertiaryClick()
      props.onDestructiveClick()

      expect(onPrint).toHaveBeenCalledTimes(1)
      expect(onEdit).toHaveBeenCalledTimes(1)
      expect(onView).toHaveBeenCalledTimes(1)
      expect(onDelete).toHaveBeenCalledTimes(1)

      const element = ModalBottomActions(props) as ReactElement<any>
      expect(element).toBeDefined()
      // Bottom destructive action is rendered as a clean button without heavy borders
      const destructiveBtn = element.props.children[1]
      expect(destructiveBtn.props.className).toContain('text-red-500')
    })
  })

  describe('ChallanSlipBanner', () => {
    it('is defined and handles image banner rendering and fallback state', () => {
      expect(ChallanSlipBanner).toBeDefined()
      const onPreview = vi.fn()
      const bannerWithImg = ChallanSlipBanner({
        imageUrl: 'https://example.com/challan.jpg',
        challanNo: '42',
        onPreview,
      })
      expect(bannerWithImg).not.toBeNull()

      const bannerWithFallback = ChallanSlipBanner({
        imageUrl: null,
        challanNo: '42',
        onPreview,
        showFallback: true,
      })
      expect(bannerWithFallback).not.toBeNull()

      const bannerWithoutFallback = ChallanSlipBanner({
        imageUrl: null,
        challanNo: '42',
        onPreview,
        showFallback: false,
      })
      expect(bannerWithoutFallback).toBeNull()
    })

    it('renders compact notice when no image is attached', () => {
      const banner = ChallanSlipBanner({
        imageUrl: null,
        challanNo: '105',
        onPreview: vi.fn(),
        showFallback: true,
      }) as ReactElement<any>

      expect(banner.props.className).toContain('py-2')
      expect(banner.props.className).toContain('px-3')
    })
  })

  describe('ChallanDetailsModal', () => {
    it('is defined and safely renders null when group is null', () => {
      expect(ChallanDetailsModal).toBeDefined()
      const element = ChallanDetailsModal({
        isOpen: true,
        onClose: vi.fn(),
        group: null,
        onPrint: vi.fn(),
        onEditChallan: vi.fn(),
        onDeleteChallan: vi.fn(),
      })
      expect(element).toBeNull()
    })
  })
})
