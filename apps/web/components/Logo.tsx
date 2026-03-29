interface LogoProps {
  variant?: 'icon' | 'full';
  size?: number;
  className?: string;
}

export function Logo({ variant = 'icon', size = 32, className = '' }: LogoProps) {
  const iconSize = size;
  const textSize = size * 0.5;

  const Icon = () => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Dark background */}
      <rect width="32" height="32" rx="8" fill="#18181b" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke="#3f3f46" strokeOpacity="0.5" />

      {/* Connection lines */}
      <path
        d="M16 8 L8 22 M16 8 L24 22 M11 17 L21 17"
        stroke="#71717a"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Nodes */}
      <circle cx="16" cy="8" r="3" fill="#fafafa" />
      <circle cx="8" cy="22" r="3" fill="#fafafa" />
      <circle cx="24" cy="22" r="3" fill="#fafafa" />
      <circle cx="16" cy="17" r="2" fill="#a1a1aa" />
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
    <div className={`flex items-center gap-2 ${className}`}>
      <Icon />
      <span
        className="font-semibold text-zinc-100"
        style={{ fontSize: `${textSize}px` }}
      >
        ShipWith.AI
      </span>
    </div>
  );
}
