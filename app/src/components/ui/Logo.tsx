interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 34, showText = true, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 shrink-0 select-none ${className}`}>
      <img
        src="/logo.svg"
        alt=""
        width={size}
        height={size}
        className="shrink-0 shadow-sm rounded-xl object-contain ring-1 ring-black/5"
        style={{ width: size, height: size }}
        onError={(e) => {
          // Fallback to png if svg fails
          const target = e.currentTarget
          if (!target.src.endsWith('logo.png')) {
            target.src = '/logo.png'
          }
        }}
      />
      {showText && (
        <div className="flex flex-col justify-center shrink-0">
          <span className="font-black text-[16px] sm:text-[18px] leading-tight text-slate-900 tracking-tight whitespace-nowrap">
            Val<span className="text-slate-900 font-extrabold">Manager</span>
          </span>
          <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider leading-none mt-0.5 whitespace-nowrap">
            Jari Kasab & Val Portal
          </span>
        </div>
      )}
    </div>
  );
}
