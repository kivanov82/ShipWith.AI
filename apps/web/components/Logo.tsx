interface LogoProps {
  variant?: 'icon' | 'full';
  size?: number;
  className?: string;
}

export function Logo({ variant = 'icon', size = 32, className = '' }: LogoProps) {
  const iconSize = size;
  const textSize = size * 0.55;

  const Icon = () => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Dark background with subtle gradient */}
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#141418" />
          <stop offset="100%" stopColor="#0c0c0f" />
        </linearGradient>
        <linearGradient id="logo-accent" x1="8" y1="8" x2="24" y2="24">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-bg)" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke="#2a2a32" strokeOpacity="0.6" />

      {/* Connection lines */}
      <path
        d="M16 8 L8 22 M16 8 L24 22 M11 17 L21 17"
        stroke="#52525b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Nodes — accent gradient on top node */}
      <circle cx="16" cy="8" r="3" fill="url(#logo-accent)" />
      <circle cx="8" cy="22" r="3" fill="#e4e4e7" />
      <circle cx="24" cy="22" r="3" fill="#e4e4e7" />
      <circle cx="16" cy="17" r="2" fill="#71717a" />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={className}>
        <Icon />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Icon />
      <span
        className="font-bold tracking-tight text-zinc-100 font-display"
        style={{ fontSize: `${textSize}px` }}
      >
        ShipWith<span className="text-gradient">.AI</span>
      </span>
    </div>
  );
}
