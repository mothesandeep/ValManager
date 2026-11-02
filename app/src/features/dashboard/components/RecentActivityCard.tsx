import React from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface RecentActivityCardProps {
  title: string
  viewAllLink: string
  icon?: React.ReactNode
  children: React.ReactNode
}

export function RecentActivityCard({
  title,
  viewAllLink,
  icon,
  children,
}: RecentActivityCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
        </div>
        <Link
          to={viewAllLink}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-0.5"
        >
          <span>View All</span>
          <ChevronRight size={14} />
        </Link>
      </div>
      <div>{children}</div>
    </div>
  )
}

export default RecentActivityCard
