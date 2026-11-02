import React from 'react'

export interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  return <>{children}</>
}

export default QueryProvider
