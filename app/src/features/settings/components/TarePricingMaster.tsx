import { WeightsTareSettings } from './WeightsTareSettings'
import { TarRatesPricingSettings } from './TarRatesPricingSettings'
import type { TarRateConfig } from '@/features/settings/utils'

interface TarePricingMasterProps {
  // Weights props
  rolaWeight: string
  setRolaWeight: (val: string) => void
  bigRolaWeight: string
  setBigRolaWeight: (val: string) => void
  bungriWeight: string
  setBungriWeight: (val: string) => void
  boriWeight: string
  setBoriWeight: (val: string) => void
  onSaveWeights: () => void
  weightsSaved: boolean

  // Tar Rates props
  tarRates: TarRateConfig[]
  setTarRates: React.Dispatch<React.SetStateAction<TarRateConfig[]>>
  onSaveRates: () => void
  ratesSaved: boolean

  // Optional section selector if used inside tab
  viewMode?: 'all' | 'weights' | 'tar'
}

export function TarePricingMaster({
  rolaWeight,
  setRolaWeight,
  bigRolaWeight,
  setBigRolaWeight,
  bungriWeight,
  setBungriWeight,
  boriWeight,
  setBoriWeight,
  onSaveWeights,
  weightsSaved,
  tarRates,
  setTarRates,
  onSaveRates,
  ratesSaved,
  viewMode = 'all',
}: TarePricingMasterProps) {
  return (
    <div className="space-y-6">
      {(viewMode === 'all' || viewMode === 'weights') && (
        <WeightsTareSettings
          rolaWeight={rolaWeight}
          setRolaWeight={setRolaWeight}
          bigRolaWeight={bigRolaWeight}
          setBigRolaWeight={setBigRolaWeight}
          bungriWeight={bungriWeight}
          setBungriWeight={setBungriWeight}
          boriWeight={boriWeight}
          setBoriWeight={setBoriWeight}
          onSave={onSaveWeights}
          isSaved={weightsSaved}
        />
      )}

      {(viewMode === 'all' || viewMode === 'tar') && (
        <TarRatesPricingSettings
          tarRates={tarRates}
          setTarRates={setTarRates}
          onSave={onSaveRates}
          isSaved={ratesSaved}
        />
      )}
    </div>
  )
}

