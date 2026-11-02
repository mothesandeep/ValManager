import { Sun, Moon, Laptop, Check } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export function ThemeSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const themeOptions = [
    {
      id: 'light' as const,
      name: 'Light Mode',
      shortName: 'Light',
      description: 'Clean, high-visibility crisp daylight palette',
      icon: Sun,
    },
    {
      id: 'dark' as const,
      name: 'Dark Mode',
      shortName: 'Dark',
      description: 'Deep high-contrast OLED slate palette for reduced eye strain',
      icon: Moon,
    },
    {
      id: 'system' as const,
      name: 'System Default',
      shortName: 'System',
      description: `Automatically syncs with your operating system (${resolvedTheme === 'dark' ? 'currently Dark' : 'currently Light'})`,
      icon: Laptop,
    },
  ]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Appearance &amp; Theme
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
              Active: {theme === 'system' ? `System (${resolvedTheme})` : theme}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Customize interface theme according to your preference or device system settings
          </p>
        </div>
      </div>

      {/* 3-Card Radio Group */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {themeOptions.map((opt) => {
          const isSelected = theme === opt.id
          const Icon = opt.icon
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`relative text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3.5 group select-none ${
                isSelected
                  ? 'border-solid !border-blue-600 dark:!border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/30 shadow-md shadow-blue-500/15'
                  : 'border-solid border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              {/* Top row: Icon + Radio Checkmark */}
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Icon size={18} />
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-xs scale-100'
                      : 'border-2 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
              </div>

              {/* Theme Mockup Visual Preview */}
              <div
                className={`w-full h-14 rounded-lg p-1.5 flex flex-col gap-1 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden ${
                  opt.id === 'light'
                    ? 'bg-slate-100'
                    : opt.id === 'dark'
                    ? 'bg-slate-950'
                    : 'bg-gradient-to-r from-slate-100 via-slate-800 to-slate-950'
                }`}
              >
                <div
                  className={`w-full h-3 rounded flex items-center px-1.5 justify-between ${
                    opt.id === 'light'
                      ? 'bg-slate-900 text-white'
                      : opt.id === 'dark'
                      ? 'bg-slate-900 text-slate-100 border border-slate-800'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  <div className="w-8 h-1 rounded-full bg-current opacity-40" />
                  <div className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                    <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                  </div>
                </div>
                <div className="flex gap-1.5 h-full">
                  <div className="w-5 h-full rounded bg-slate-400/20" />
                  <div
                    className={`flex-1 rounded p-1 flex flex-col justify-between border ${
                      opt.id === 'light'
                        ? 'bg-white border-slate-200'
                        : opt.id === 'dark'
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-12 h-1 rounded ${
                        opt.id === 'light' ? 'bg-slate-300' : 'bg-slate-700'
                      }`}
                    />
                    <div className="flex justify-between items-center">
                      <div
                        className={`w-6 h-1 rounded ${
                          opt.id === 'light' ? 'bg-slate-200' : 'bg-slate-800'
                        }`}
                      />
                      <div className="w-3 h-1.5 rounded-xs bg-blue-600 dark:bg-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {opt.name}
                  </span>
                  {opt.id === 'system' && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Auto
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {opt.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

