import { supabase } from '../supabase'
import type {
  Party,
  PartyStats,
  Receipt,
  ReceiptWithParty,
  ProductionOrder,
  ProductionWithReceipt,
  DispatchWithParty,
  Dispatch,
  RolaReturn,
  RolaReturnWithParty,
  Payment,
  PaymentWithParty,
  Expense,
  GapchaSale,
  GapchaSaleWithParty,
  GapchaReconciliation,
  GapchaReconciliationWithParty,
} from '../../types'


// ── Expenses ──────────────────────────────────────────────────────────────────

export type ExpensePayload = Omit<Expense, 'id' | 'created_at'>

export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function insertExpense(payload: ExpensePayload): Promise<void> {
  const { error } = await supabase.from('expenses').insert(payload)
  if (error) throw error
}

export async function updateExpense(
  id: string,
  payload: ExpensePayload
): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', id)
  if (error) throw error
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

