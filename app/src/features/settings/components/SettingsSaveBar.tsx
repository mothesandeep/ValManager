import { Check, RefreshCw, Save } from 'lucide-react'

interface SettingsSaveBarProps {
  isDirty: boolean
  allSaved: boolean
  isSavingAll: boolean
  onDiscard: () => void
  onSaveAll: () => void
}

export function SettingsSaveBar({
  isDirty,
  allSaved,
  isSavingAll,
  onDiscard,
  onSaveAll,
}: SettingsSaveBarProps) {
  return (
    <div
      className={`fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-8 max-w-md z-40 transition-all duration-300 ease-out transform ${
        isDirty || allSaved ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-16 opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {allSaved ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Check size={14} strokeWidth={2.5} />
              <span>All changes saved</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200">
              <span className="size-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>Unsaved changes in settings</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isDirty && !allSaved && (
            <button
              type="button"
              onClick={onDiscard}
              className="px-3 py-1.5 h-9 min-h-[36px] text-xs font-semibold rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Discard
            </button>
          )}
          <button
            type="button"
            data-save-shortcut="true"
            onClick={onSaveAll}
            disabled={isSavingAll || (!isDirty && !allSaved)}
            className="px-4 py-1.5 h-9 min-h-[36px] rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSavingAll ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Saving…</span>
              </>
            ) : allSaved ? (
              <>
                <Check size={13} strokeWidth={2.5} />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>Save All</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

