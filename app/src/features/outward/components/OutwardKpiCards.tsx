import { KpiCard } from '@/components/common/KpiCard'
import { fmtKg } from '@/utils/format'

interface OutwardKpiCardsProps {
  monthValGrossKg: number
  monthValNetKg: number
  monthRolaGrossKg: number
  monthRolaCount: number
  monthBilling: number
  formattedMonth: string
  selectedPartyName?: string
  loading: boolean
}

export function OutwardKpiCards({
  monthValGrossKg,
  monthValNetKg,
  monthRolaGrossKg,
  monthRolaCount,
  monthBilling,
  formattedMonth,
  selectedPartyName,
  loading,
}: OutwardKpiCardsProps) {
  const partyPrefix = selectedPartyName ? `${selectedPartyName} • ` : ''

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
      <KpiCard
        label="VAL FINISHED GROSS"
        dotColor="blue"
        value={fmtKg(monthValGrossKg)}
        subtitle={`${partyPrefix}Bore Scale: ${formattedMonth}`}
        loading={loading}
      />
      <KpiCard
        label="NET FINISHED VAL"
        dotColor="indigo"
        value={fmtKg(monthValNetKg)}
        subtitle={`${partyPrefix}Net Weight: ${formattedMonth}`}
        loading={loading}
      />
      <KpiCard
        label="EMPTY ROLA RETURN"
        dotColor="amber"
        value={`${fmtKg(monthRolaGrossKg)} (${monthRolaCount}p)`}
        subtitle={`${partyPrefix}Returned: ${formattedMonth}`}
        loading={loading}
      />
      <KpiCard
        label="TOTAL BILLING"
        dotColor="emerald"
        value={`₹${Math.round(monthBilling).toLocaleString('en-IN')}`}
        subtitle={`${partyPrefix}Billing: ${formattedMonth}`}
        loading={loading}
      />
    </div>
  )
}

