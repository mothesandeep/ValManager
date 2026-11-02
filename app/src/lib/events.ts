/**
 * Global event bus for cross-module data reactivity and cache invalidation.
 */

export type DataAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'SYNC'

export interface DataChangeEvent {
  table: 'parties' | 'receipts' | 'dispatches' | 'payments' | 'expenses' | '*'
  action: DataAction
  id?: string
  timestamp: number
}

export const dataEventEmitter = new EventTarget()

export function emitDataChange(
  table: DataChangeEvent['table'],
  action: DataAction,
  id?: string
) {
  const event = new CustomEvent<DataChangeEvent>('data-change', {
    detail: {
      table,
      action,
      id,
      timestamp: Date.now(),
    },
  })
  dataEventEmitter.dispatchEvent(event)
}
