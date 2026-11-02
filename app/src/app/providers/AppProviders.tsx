import React from 'react'
import { ThemeProvider } from '@/context/ThemeContext'
import { MonthProvider } from '@/context/MonthContext'
import { SyncProvider } from '@/context/SyncContext'
import { ToastProvider } from '@/context/ToastContext'
import { DataProvider } from '@/context/DataContext'
import { QueryProvider } from './QueryProvider'

export interface AppProvidersProps {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SyncProvider>
          <DataProvider>
            <MonthProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </MonthProvider>
          </DataProvider>
        </SyncProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}

export default AppProviders
