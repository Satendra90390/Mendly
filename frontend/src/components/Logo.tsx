interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizes = { sm: 28, md: 36, lg: 48 };

export default function Logo({ size = "md", showText = true }: LogoProps) {
  const px = sizes[size];
  const textSize = size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-sm";

  return (
    <div className="flex items-center gap-3 shrink-0">
      <svg width={px} height={px} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="48" y2="48">
            <stop offset="0%" stopColor="hsl(173 80% 36%)" />
            <stop offset="100%" stopColor="hsl(188 95% 43%)" />
          </linearGradient>
          <linearGradient id="lg-ring" x1="0" y1="0" x2="48" y2="48">
            <stop offset="0%" stopColor="hsl(173 80% 36% / 0.35)" />
            <stop offset="100%" stopColor="hsl(188 95% 43% / 0.2)" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#lg)" />
        <rect x="2" y="2" width="44" height="44" rx="12" fill="rgba(255,255,255,0.08)" />
        <circle cx="24" cy="24" r="12" fill="none" stroke="url(#lg-ring)" strokeWidth="1.5" />
        <path d="M20 16h8v4h-4v8h-4V20h-4v-4z" fill="white" />
        <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      </svg>
      {showText && (
        <span className={`font-serif font-semibold tracking-tight ${textSize}`} style={{ color: "hsl(var(--foreground))" }}>
          Mendly
        </span>
      )}
    </div>
  );
}
