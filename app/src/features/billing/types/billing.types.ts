import type { Payment as ZodPayment } from '@/lib/validation/schemas'

export type Payment = ZodPayment


export interface PaymentWithParty extends Payment {
  party: { name: string; default_rola_weight_g?: number | null } | null
}
