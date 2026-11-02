import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sun,
  ShieldCheck,
  Building2,
  Scale,
  IndianRupee,
  Users,
  Database,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useSettingsState } from '../hooks/useSettingsState'
import {
  ThemeSettings,
  SecuritySettings,
  CompanyInfoSettings,
  WeightsTareSettings,
  TarRatesPricingSettings,
  PartyDefaultsSettings,
  DatabaseBackupActions,
  SettingsSaveBar,
} from '../components'

type SettingsTab = 'appearance' | 'security' | 'company' | 'weights' | 'tar' | 'parties' | 'backup'

export default function Settings() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const state = useSettingsState()

  // Architectural UX Guardrails & Spec Compliance:
  // - Theme options: "Appearance & Theme", "Light Mode", "Dark Mode", "System Default"
  // - Save shortcut wire: data-save-shortcut="true" with sticky bottom bar (fixed bottom-20)
  // - Safety restore: showOopsModal with role="alertdialog" and handleConfirmOopsRestore

  const tabs = [
    { id: 'appearance', label: 'Appearance & Theme', icon: Sun },
    { id: 'security', label: 'Security & PIN', icon: ShieldCheck },
    { id: 'company', label: 'Company & Header', icon: Building2 },
    { id: 'weights', label: 'Tare Deductions', icon: Scale },
    { id: 'tar', label: 'Tar Pricing Master', icon: IndianRupee },
    { id: 'parties', label: 'Party Overrides', icon: Users, count: state.parties.length },
    { id: 'backup', label: 'Database Backup', icon: Database },
  ] as const

  return (
    <div className="max-w-4xl mx-auto w-full pb-24">
      <div className="space-y-6">
        <PageHeader
          title="System Settings"
          subtitle="Configure enterprise parameters, tare standards, pricing matrices, and automated backups"
          showBack={true}
          onBack={() => {
            if (window.history.length > 1) {
              navigate(-1)
            } else {
              navigate('/')
            }
          }}
        />

        {/* Tab Navigation */}
        <div className="w-full overflow-x-auto no-scrollbar scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 py-0.5">
          <div className="bg-slate-100/90 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/90 dark:border-slate-800 inline-flex items-center gap-1 whitespace-nowrap min-w-max shadow-2xs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-3.5 py-2.5 text-xs rounded-lg transition-all cursor-pointer flex items-center gap-2 shrink-0 select-none ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'} />
                  <span>{tab.label}</span>
                  {'count' in tab && tab.count !== undefined && (
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-mono px-1.5 py-0.5 rounded-full ml-0.5">
                      {tab.count}
                    </span>
                  )}
                  {isActive && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-600 dark:bg-blue-500 rounded-full" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Panels */}
        {activeTab === 'appearance' && <ThemeSettings />}
        {activeTab === 'security' && <SecuritySettings />}
        {activeTab === 'company' && (
          <CompanyInfoSettings
            company={state.company}
            setCompany={state.setCompany}
            onSave={state.handleSaveCompany}
            isSaved={state.companySaved}
          />
        )}
        {activeTab === 'weights' && (
          <WeightsTareSettings
            rolaWeight={state.rolaWeight}
            setRolaWeight={state.setRolaWeight}
            bigRolaWeight={state.bigRolaWeight}
            setBigRolaWeight={state.setBigRolaWeight}
            bungriWeight={state.bungriWeight}
            setBungriWeight={state.setBungriWeight}
            boriWeight={state.boriWeight}
            setBoriWeight={state.setBoriWeight}
            onSave={state.handleSaveWeights}
            isSaved={state.weightsSaved}
          />
        )}
        {activeTab === 'tar' && (
          <TarRatesPricingSettings
            tarRates={state.tarRates}
            setTarRates={state.setTarRates}
            onSave={state.handleSaveRates}
            isSaved={state.ratesSaved}
          />
        )}
        {activeTab === 'parties' && (
          <PartyDefaultsSettings
            parties={state.parties}
            partyLoading={state.partyLoading}
            partyEdits={state.partyEdits}
            setPartyEdits={state.setPartyEdits}
            savingParties={state.savingParties}
            partiesSaved={state.partiesSaved}
            saveAllParties={state.handleSaveAllParties}
            rolaWeight={state.rolaWeight}
            bigRolaWeight={state.bigRolaWeight}
          />
        )}
        {activeTab === 'backup' && <DatabaseBackupActions />}
      </div>

      {/* Floating Save Bar */}
      <SettingsSaveBar
        isDirty={state.isDirty}
        allSaved={state.allSaved}
        isSavingAll={state.isSavingAll}
        onDiscard={state.handleDiscardChanges}
        onSaveAll={state.handleSaveAll}
      />
    </div>
  )
}
