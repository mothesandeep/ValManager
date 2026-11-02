import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  moduleName?: string
  fallback?: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showTechnicalLog: boolean
}

export function parseContextClue(error: Error | null, moduleName?: string): string | null {
  if (!error) return null
  const msg = (error.message || error.toString()).toLowerCase()

  if (
    msg.includes('bag') ||
    msg.includes('inward') ||
    msg.includes('receipt') ||
    msg.includes('lineitem') ||
    msg.includes('rolacount') ||
    msg.includes('sizetype') ||
    msg.includes('twisttype') ||
    moduleName?.toLowerCase().includes('inward')
  ) {
    return 'Notice: Inward bag data structure mismatch'
  }
  if (msg.includes('party') || msg.includes('partyid')) {
    return 'Notice: Party directory reference discrepancy'
  }
  if (
    msg.includes('cannot read propert') ||
    msg.includes('null is not') ||
    msg.includes('undefined is not')
  ) {
    return 'Notice: Missing or uninitialized record data'
  }
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('failed to fetch') ||
    msg.includes('timeout')
  ) {
    return 'Notice: Network synchronization hiccup'
  }
  return 'Notice: Unexpected rendering condition'
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showTechnicalLog: false,
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[ErrorBoundary - ${this.props.moduleName || 'App'}] Caught error:`, error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleReset = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null, errorInfo: null, showTechnicalLog: false })
  }

  private handleGoDashboard = () => {
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const contextClue = parseContextClue(this.state.error, this.props.moduleName)

      return (
        <div className="min-h-[460px] flex items-center justify-center p-6">
          <div className="w-full max-w-sm mx-auto p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Soft tinted circular badge */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center text-2xl font-semibold shadow-2xs">
              <AlertCircle size={28} strokeWidth={2.2} />
            </div>

            {/* Human-Centered Typography */}
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-950 dark:text-white tracking-tight">
                Something went wrong
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                We ran into a hiccup while loading this section. Your recorded challans and offline data remain completely safe.
              </p>
            </div>

            {/* Inline Context Clue */}
            {contextClue && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 max-w-full">
                <span className="truncate">{contextClue}</span>
              </div>
            )}

            {/* Collapsible Technical Log */}
            {this.state.error && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showTechnicalLog: !prev.showTechnicalLog }))}
                  className="h-8 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200/50 dark:border-slate-700/50"
                  title="Toggle technical details"
                >
                  <span>Technical Log</span>
                  {this.state.showTechnicalLog ? (
                    <ChevronUp size={13} strokeWidth={2.2} />
                  ) : (
                    <ChevronDown size={13} strokeWidth={2.2} />
                  )}
                </button>

                {this.state.showTechnicalLog && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-rose-600 dark:text-rose-400 text-left whitespace-pre-wrap break-words max-h-36 overflow-y-auto animate-in fade-in duration-150">
                    {this.state.error.toString()}
                  </div>
                )}
              </div>
            )}

            {/* Action CTAs */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleReset}
                className="h-11 px-5 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} strokeWidth={2.4} />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoDashboard}
                className="h-11 px-4 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors flex items-center justify-center cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

