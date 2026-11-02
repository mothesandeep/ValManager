import { useId } from 'react'

export interface LogoProps {
  size?: number
  showText?: boolean
  className?: string
  textClassName?: string
}

export function LogoIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  const rawId = useId()
  // Clean alphanumeric ID for SVG defs
  const id = `val_logo_${rawId.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      width={size}
      height={size}
      className={`shrink-0 select-none shadow-sm rounded-xl overflow-hidden ${className}`}
      aria-label="ValManager Logo"
      role="img"
    >
      <defs>
        {/* Background Squircle Gradient: slate-900 via zinc-900 to black */}
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="45%" stopColor="#18181b" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>

        {/* Crisp 1px Ring Border */}
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
        </linearGradient>

        {/* Metallic Spindle / Core Cylinder Gradient */}
        <linearGradient id={`${id}-core`} x1="0" y1="28" x2="0" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="25%" stopColor="#cbd5e1" />
          <stop offset="60%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        {/* Metallic Flange Discs */}
        <linearGradient id={`${id}-flange`} x1="0" y1="18" x2="0" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="20%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="80%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Golden Zari / Val Thread Gradient: from-amber-400 via-amber-300 to-amber-500 */}
        <linearGradient id={`${id}-zari`} x1="0" y1="18" x2="0" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="18%" stopColor="#fbbf24" />
          <stop offset="40%" stopColor="#fef08a" />
          <stop offset="65%" stopColor="#f59e0b" />
          <stop offset="85%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        {/* Thread Flow Stroke Gradient */}
        <linearGradient id={`${id}-flow`} x1="32" y1="45" x2="55" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>

        {/* Soft Ambient Core Glow */}
        <radialGradient id={`${id}-glow`} cx="32" cy="32" r="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1. Squircle Container with dark gradient and shadow */}
      <rect width="64" height="64" rx="16" fill={`url(#${id}-bg)`} />
      <rect x="0.5" y="0.5" width="63" height="63" rx="15.5" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="1" />

      {/* Ambient Center Glow */}
      <circle cx="32" cy="32" r="22" fill={`url(#${id}-glow)`} />

      {/* 2. Metallic Spool Core & Spindles */}
      {/* Left spindle shaft */}
      <path d="M 8,28.5 L 16,28.5 L 16,35.5 L 8,35.5 Z" fill={`url(#${id}-core)`} />
      <ellipse cx="8" cy="32" rx="1.5" ry="3.5" fill="#94a3b8" />

      {/* Right spindle shaft */}
      <path d="M 48,28.5 L 56,28.5 L 56,35.5 L 48,35.5 Z" fill={`url(#${id}-core)`} />
      <ellipse cx="56" cy="32" rx="1.8" ry="3.5" fill="#cbd5e1" />
      <ellipse cx="56" cy="32" rx="0.8" ry="1.8" fill="#0f172a" />

      {/* Left Flange Disc */}
      <ellipse cx="16" cy="32" rx="2.8" ry="13.5" fill={`url(#${id}-flange)`} />
      <ellipse cx="16" cy="32" rx="1.2" ry="13.5" fill="#f8fafc" opacity="0.35" />

      {/* 3. Wound Golden Zari/Val Thread Body (Rich Volume & Curvature) */}
      <path
        d="M 16,19 C 26,17.2 38,17.2 48,19 L 48,45 C 38,46.8 26,46.8 16,45 Z"
        fill={`url(#${id}-zari)`}
      />

      {/* Right Flange Disc */}
      <ellipse cx="48" cy="32" rx="2.8" ry="13.5" fill={`url(#${id}-flange)`} />

      {/* Thread Winding Grooves / Texture */}
      <path d="M 23,18.5 Q 22,32 23.5,45.5" fill="none" stroke="#b45309" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <path d="M 31,18 Q 30,32 31.5,46" fill="none" stroke="#b45309" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <path d="M 39,18.5 Q 38,32 39.5,45.5" fill="none" stroke="#b45309" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />

      {/* Top Sheen / Specular Light Reflection */}
      <path
        d="M 19,22.5 C 28,21.2 36,21.2 45,22.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* 4. Dynamic Delivery / Dispatch Flowing Thread Stroke */}
      <path
        d="M 32,46 C 36,51.5 45,52 54,45"
        fill="none"
        stroke="#000000"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M 32,46 C 36,51.5 45,52 54,45"
        fill="none"
        stroke={`url(#${id}-flow)`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M 34,47 C 38,51.5 45,51.5 53,45.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Thread Tip Spark / Delivery Glow Accent */}
      <circle cx="54" cy="45" r="2" fill="#fde047" />
      <circle cx="54" cy="45" r="3.5" fill="#fbbf24" opacity="0.4" />
    </svg>
  )
}

export function Logo({ size = 32, showText = true, className = '', textClassName = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 shrink-0 select-none ${className}`}>
      <LogoIcon size={size} />
      {showText && (
        <div className={`flex flex-col justify-center shrink-0 ${textClassName}`}>
          <span className="font-semibold text-[15px] sm:text-[16px] leading-tight text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
            <span className="text-blue-600 dark:text-blue-400 font-bold">Val</span>
            <span className="text-slate-900 dark:text-white font-semibold">Manager</span>
          </span>
          <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none mt-0.5 whitespace-nowrap">
            Jari Kasab &amp; Val Portal
          </span>
        </div>
      )}
    </div>
  )
}

export default Logo
