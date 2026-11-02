import React from 'react'
import { AlertCircle } from 'lucide-react'

export interface FieldErrorProps {
  error?: string | null
  className?: string
}

export const FieldError: React.FC<FieldErrorProps> = ({ error, className = '' }) => {
  if (!error) return null

  return (
    <div
      role="alert"
      className={`flex items-center gap-1.5 mt-1 text-[11.5px] font-medium text-rose-600 dark:text-rose-400 animate-in fade-in slide-in-from-top-1 duration-150 ${className}`}
    >
      <AlertCircle size={12} className="shrink-0 text-rose-500" />
      <span className="leading-tight">{error}</span>
    </div>
  )
}
