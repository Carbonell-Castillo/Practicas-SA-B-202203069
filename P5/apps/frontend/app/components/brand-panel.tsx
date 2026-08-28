const FEATURES = [
  'JWT firmado, guardado en cookie HttpOnly',
  'Datos sensibles cifrados con AES-256',
  'Autorización resuelta por un microservicio propio',
];

export function BrandPanel({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="auth-brand">
      <div className="auth-brand-grid" />

      <div className="relative flex items-center gap-2.5">
        <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="9" fill="var(--accent)" />
          <path
            d="M16 8L23 11.5V16.8C23 20.9 20 24.6 16 25.6C12 24.6 9 20.9 9 16.8V11.5L16 8Z"
            stroke="var(--accent-foreground)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M13 16.3L15.2 18.5L19.3 14"
            stroke="var(--accent-foreground)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
          Nimbus Access
        </span>
      </div>

      <div className="relative max-w-md">
        <span className="text-xs font-medium uppercase tracking-widest text-[var(--accent)]">
          {eyebrow}
        </span>
        <h2 className="mt-3 text-[34px] font-semibold leading-[1.15] tracking-tight text-[var(--text)]">
          {title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      <ul className="relative space-y-3">
        {FEATURES.map((feature) => (
          <li key={feature} className="flex items-center gap-2.5 text-sm text-[var(--text-muted)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <circle cx="8" cy="8" r="8" fill="var(--accent)" fillOpacity="0.15" />
              <path
                d="M4.8 8.2L6.8 10.2L11.2 5.8"
                stroke="var(--accent)"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
