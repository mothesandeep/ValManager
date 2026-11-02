import { ChallanDocumentUploader, type ChallanDocumentUploaderProps } from '@/features/inward/components/scanner/ChallanDocumentUploader'

export interface ScannerPreviewProps extends ChallanDocumentUploaderProps {
  className?: string
}

export function ScannerPreview({ className = '', ...props }: ScannerPreviewProps) {
  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      <ChallanDocumentUploader {...props} />
    </div>
  )
}
export default ScannerPreview

