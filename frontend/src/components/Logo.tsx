interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizes = { sm: 28, md: 36, lg: 48 };

export default function Logo({ size = "md", showText = true }: LogoProps) {
  const px = sizes[size];
  const textSize = size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm";

  return (
    <div className="flex items-center gap-3 shrink-0">
      <svg width={px} height={px} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="48" y2="48">
            <stop offset="0%" stopColor="hsl(173 80% 36%)" />
            <stop offset="100%" stopColor="hsl(188 95% 43%)" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#logo-grad)" />
        <path
          d="M18 16h12v4h-4v12h-4V20h-4v-4z"
          fill="white"
        />
        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <path
          d="M24 6C24 6 32 14 32 24C32 34 24 42 24 42"
          stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span className={`font-bold tracking-tight text-foreground ${textSize}`}>
          Mendly
        </span>
      )}
    </div>
  );
}
