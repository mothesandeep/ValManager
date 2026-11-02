import { useContext } from 'react'
import { DataContext, type DataContextValue } from '../context/DataContext'

export function useData(): DataContextValue {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
