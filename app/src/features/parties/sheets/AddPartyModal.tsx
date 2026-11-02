import React from 'react'
import { BottomSheetModal, type BottomSheetModalProps } from '@/components/sheets/BottomSheetModal'

export interface AddPartyModalProps extends BottomSheetModalProps {}

export const AddPartyModal: React.FC<AddPartyModalProps> = (props) => {
  return <BottomSheetModal {...props} />
}

export default AddPartyModal
