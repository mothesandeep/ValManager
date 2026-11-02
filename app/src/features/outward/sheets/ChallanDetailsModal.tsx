import React from 'react'
import { BottomSheetModal } from '@/components/sheets/BottomSheetModal'
import {
  PreviewHeader,
  ChallanSlipBanner,
  MetricCardGrid,
  BreakdownList,
  BreakdownItemRow,
  ModalBottomActions,
} from '@/components/preview'
import { fmtKg, fmtMoney } from '@/utils/format'
import type { ChallanGroup, DispatchWithParty } from '../types/outward.types'

export interface ChallanDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  group: ChallanGroup | null
  activeReceiptImage?: string | null
  onPrint: () => void
  onEditChallan: () => void
  onDeleteChallan: () => void
  onPreviewImage?: () => void
  onAttachImage?: () => void
  onEditBag?: (entry: DispatchWithParty) => void
  onDeleteBag?: (entry: DispatchWithParty) => void
  className?: string
}

export const ChallanDetailsModal: React.FC<ChallanDetailsModalProps> = ({
  isOpen,
  onClose,
  group,
  activeReceiptImage,
  onPrint,
  onEditChallan,
  onDeleteChallan,
  onPreviewImage,
  onAttachImage,
  onEditBag,
  onDeleteBag,
}) => {
  if (!group) return null

  const receiptImg = activeReceiptImage || group.imageUrl || null

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm:max-w-2xl"
      maxHeight="max-h-[90dvh] md:max-h-[85vh]"
      customHeader={
        <PreviewHeader
          partyName={group.partyName}
          challanNo={group.challanNo}
          date={group.date}
          onClose={onClose}
          onDelete={onDeleteChallan}
          deleteLabel="Delete Entire Challan"
        />
      }
      bodyClassName="p-3.5 sm:p-5 flex-1 overflow-y-auto overscroll-contain touch-pan-y [webkit-overflow-scrolling:touch] transform-gpu flex flex-col gap-3 pb-6 scrollbar-thin pr-1 sm:pr-2"
      footer={
        <ModalBottomActions
          primaryLabel="Print Delivery Challan"
          onPrimaryClick={onPrint}
          secondaryLabel="Edit Challan"
          onSecondaryClick={onEditChallan}
          destructiveLabel="Delete Entire Challan"
          onDestructiveClick={onDeleteChallan}
        />
      }
    >
      {/* 1. Compact Receipt Attachment Preview or Minimal State */}
      <ChallanSlipBanner
        imageUrl={receiptImg}
        challanNo={group.challanNo}
        onPreview={onPreviewImage || (() => {})}
        onAttach={onAttachImage}
        showFallback={true}
      />

      {/* 2. Compact Key Metrics Strip (unified card with emphasized Total Billing & Net Val) */}
      <MetricCardGrid
        metrics={[
          {
            label: 'Net Val',
            value: fmtKg(group.totalValNet),
          },
          {
            label: 'Total Billing',
            value: fmtMoney(group.totalAmount),
            highlight: true,
          },
          {
            label: 'Rola Wt',
            value: fmtKg(group.totalRolaGross),
          },
          {
            label: 'Rola Return',
            value: `${group.totalRolaCount} pcs`,
          },
        ]}
      />

      {/* 3. Clean & Readable Bag Breakdown Cards */}
      <BreakdownList
        title="Bag Breakdown"
        count={group.entries.length}
        totalGross={group.totalGross}
      >
        {group.entries.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            No bags remaining in this challan.
          </div>
        ) : (
          group.entries.map((item, idx) => {
            const isRolaOrKali = item.dispatch_type === 'Rola' || item.dispatch_type === 'Kali'
            const qualityTitle = isRolaOrKali ? 'Rola Return' : 'Val Finished'
            const tareKg =
              item.net_val_weight !== null && item.net_val_weight !== undefined
                ? Math.max(
                    0,
                    Math.round((item.bore_gross_weight - item.net_val_weight) * 1000) / 1000
                  )
                : null

            return (
              <BreakdownItemRow
                key={item.id}
                index={idx + 1}
                title={qualityTitle}
                tags={
                  <>
                    {item.cord_count && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded border border-blue-200/60 dark:border-blue-800/60">
                        {String(item.cord_count).replace(/\s*tar/gi, '').trim()} Tar
                      </span>
                    )}
                    {item.twist_type && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200/60 dark:border-slate-700">
                        {item.twist_type}
                      </span>
                    )}
                  </>
                }
                trailingValue={
                  item.amount
                    ? fmtMoney(item.amount)
                    : item.net_val_weight !== null
                      ? fmtKg(item.net_val_weight)
                      : null
                }
                gross={fmtKg(item.bore_gross_weight)}
                tare={tareKg !== null ? fmtKg(tareKg) : undefined}
                net={item.net_val_weight !== null ? fmtKg(item.net_val_weight) : undefined}
                extraBadges={
                  <>
                    {item.bungari_count > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                        <span className="text-[9px] uppercase font-semibold text-slate-400 dark:text-slate-500">
                          Bungari
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.bungari_count}
                        </span>
                      </span>
                    )}
                    {item.rola_count && item.rola_count > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300">
                        <span className="text-[9px] uppercase font-semibold text-amber-600/80 dark:text-amber-400/80">
                          Rola
                        </span>
                        <span className="font-semibold">{item.rola_count}</span>
                      </span>
                    ) : null}
                    {item.rate_per_kg ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                        <span className="text-[9px] uppercase font-semibold text-slate-400 dark:text-slate-500">
                          Rate
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          ₹{item.rate_per_kg}/kg
                        </span>
                      </span>
                    ) : null}
                  </>
                }
                onEdit={onEditBag ? () => onEditBag(item) : undefined}
                onDelete={onDeleteBag ? () => onDeleteBag(item) : undefined}
              />
            )
          })
        )}
      </BreakdownList>
    </BottomSheetModal>
  )
}

export default ChallanDetailsModal

