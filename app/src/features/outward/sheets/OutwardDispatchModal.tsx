import React from 'react'
import { BottomSheetModal, type BottomSheetModalProps } from '@/components/sheets/BottomSheetModal'

export interface OutwardDispatchModalProps extends BottomSheetModalProps {}

export const OutwardDispatchModal: React.FC<OutwardDispatchModalProps> = (props) => {
  return <BottomSheetModal {...props} />
}

export default OutwardDispatchModal
