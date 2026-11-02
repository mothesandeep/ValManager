import React from 'react'
import { BottomSheetModal, type BottomSheetModalProps } from '@/components/sheets/BottomSheetModal'

export interface LogExpenseModalProps extends BottomSheetModalProps {}

export const LogExpenseModal: React.FC<LogExpenseModalProps> = (props) => {
  return <BottomSheetModal {...props} />
}

export default LogExpenseModal
