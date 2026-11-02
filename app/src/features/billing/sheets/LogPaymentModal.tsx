import React from 'react'
import { BottomSheetModal, type BottomSheetModalProps } from '@/components/sheets/BottomSheetModal'

export interface LogPaymentModalProps extends BottomSheetModalProps {}

export const LogPaymentModal: React.FC<LogPaymentModalProps> = (props) => {
  return <BottomSheetModal {...props} />
}

export default LogPaymentModal
