;

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 32, showText = true, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo.png"
        alt="ValManager Logo"
        width={size}
        height={size}
        className="shrink-0 shadow-sm rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
      {showText && (
        <div className="hidden xs:flex flex-col justify-center">
          <span className="font-black text-[15px] sm:text-[17px] leading-tight text-gray-900 tracking-tight">ValManager</span>
          <span className="text-[9px] sm:text-[10px] font-bold text-[#a57b3f] uppercase tracking-widest leading-none">Manager</span>
        </div>
      )}
    </div>
  );
}
