import { PageHeader, type PageHeaderProps } from './PageHeader'

export interface MobilePageHeaderProps extends PageHeaderProps {
  sticky?: boolean
}

export function MobilePageHeader({
  sticky: _sticky,
  className = '',
  ...props
}: MobilePageHeaderProps) {
  return (
    <div className={`md:hidden ${className}`}>
      <PageHeader {...props} />
    </div>
  )
}


