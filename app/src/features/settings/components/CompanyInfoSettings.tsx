import { Save, Check, IndianRupee } from 'lucide-react'
import type { CompanySettings } from '@/features/settings/utils'

interface CompanyInfoSettingsProps {
  company: CompanySettings
  setCompany: (company: CompanySettings) => void
  onSave: () => void
  isSaved: boolean
}

export function CompanyInfoSettings({
  company,
  setCompany,
  onSave,
  isSaved,
}: CompanyInfoSettingsProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Company Identity &amp; Challan Header
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official registered identity, GSTIN, and terms displayed on printed challans and vouchers
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          className={`w-full sm:w-auto h-11 sm:h-9 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0 ${
            isSaved
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-white bg-blue-600 hover:bg-blue-700 shadow-xs'
          }`}
        >
          {isSaved ? <Check size={14} strokeWidth={3} /> : <Save size={14} />}
          <span>{isSaved ? 'Saved!' : 'Save Company Details'}</span>
        </button>
      </div>

      {/* Form Fields: Structured 2-column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Company Name */}
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5 block">
            Registered Company / Trade Name *
          </label>
          <input
            type="text"
            value={company.companyName}
            onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
            placeholder="e.g. Kasab Val Processors"
            className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-blue-500 focus:border-slate-900 dark:focus:border-blue-500 transition-all shadow-2xs"
          />
        </div>

        {/* GSTIN */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5 block">
            GSTIN Registration Number
          </label>
          <input
            type="text"
            value={company.gstin}
            onChange={(e) => setCompany({ ...company, gstin: e.target.value.toUpperCase() })}
            placeholder="e.g. 24AABCK1234F1Z5"
            maxLength={15}
            className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-blue-500 focus:border-slate-900 dark:focus:border-blue-500 transition-all uppercase tracking-wider shadow-2xs"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5 block">
            Official Contact Phone / Mobile
          </label>
          <input
            type="tel"
            value={company.phone}
            onChange={(e) => setCompany({ ...company, phone: e.target.value })}
            placeholder="e.g. +91 98765 43210"
            className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-blue-500 focus:border-slate-900 dark:focus:border-blue-500 transition-all shadow-2xs"
          />
        </div>

        {/* Factory Address */}
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5 block">
            Factory / Office Address
          </label>
          <input
            type="text"
            value={company.address}
            onChange={(e) => setCompany({ ...company, address: e.target.value })}
            placeholder="e.g. Plot No. 42, GIDC Industrial Estate, Katargam, Surat - 395004, Gujarat"
            className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-blue-500 focus:border-slate-900 dark:focus:border-blue-500 transition-all shadow-2xs"
          />
        </div>

        {/* Email */}
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5 block">
            Email Address
          </label>
          <input
            type="email"
            value={company.email}
            onChange={(e) => setCompany({ ...company, email: e.target.value })}
            placeholder="e.g. accounts@kasabval.com"
            className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-blue-500 focus:border-slate-900 dark:focus:border-blue-500 transition-all shadow-2xs"
          />
        </div>

        {/* Challan Terms & Conditions */}
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5 block">
            Challan Terms &amp; Conditions (Footer Note)
          </label>
          <textarea
            rows={2}
            value={company.challanTerms}
            onChange={(e) => setCompany({ ...company, challanTerms: e.target.value })}
            placeholder="e.g. Subject to Surat jurisdiction. Goods once delivered are non-refundable."
            className="w-full min-h-[64px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-blue-500 focus:border-slate-900 dark:focus:border-blue-500 transition-all resize-none shadow-2xs"
          />
        </div>
      </div>

      {/* System Measurement Units Setting Card */}
      <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            System Measurement Units
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Standard unit denominations used across scale weighments, stock logs, and accounting
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Weight Unit Segmented Toggle */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Default Weight Unit</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Gross &amp; net yarn standards</span>
            </div>
            <div className="bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg inline-flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setCompany({ ...company, weightUnit: 'kg' })}
                className={`px-3 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                  company.weightUnit === 'kg'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                kg
              </button>
              <button
                type="button"
                onClick={() => setCompany({ ...company, weightUnit: 'g' })}
                className={`px-3 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                  company.weightUnit === 'g'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                g
              </button>
            </div>
          </div>

          {/* Currency Display Tag with INR Symbol */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">System Currency</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Invoicing &amp; ledger denomination</span>
            </div>
            <div className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold font-mono inline-flex items-center gap-1.5 shadow-2xs">
              <IndianRupee size={13} className="text-emerald-700 dark:text-emerald-400" />
              <span>INR (₹)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Challan & Voucher Header Realistic Preview Box */}
      <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-950/50 space-y-2.5 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Live Challan &amp; Voucher Header Preview
          </span>
          <span className="text-[10px] font-medium text-slate-400 italic">
            Exact print alignment preview
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs text-center space-y-1.5 w-full max-w-full overflow-hidden break-words">
          <div className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-slate-100 uppercase break-words">
            {company.companyName || 'KASAB VAL PROCESSORS'}
          </div>
          {company.gstin && (
            <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 break-words">
              GSTIN: {company.gstin}
            </div>
          )}
          {company.address && (
            <div className="text-xs text-slate-600 dark:text-slate-400 max-w-lg mx-auto break-words leading-relaxed">
              {company.address}
            </div>
          )}
          {(company.phone || company.email) && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-0.5 break-words">
              {company.phone && <span>Tel: {company.phone}</span>}
              {company.phone && company.email && <span>•</span>}
              {company.email && <span className="break-all">Email: {company.email}</span>}
            </div>
          )}
          {company.challanTerms && (
            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 max-w-md mx-auto break-words">
              Note: {company.challanTerms}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

