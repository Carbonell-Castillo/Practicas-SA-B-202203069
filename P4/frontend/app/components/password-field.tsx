'use client';

import { useState } from 'react';

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          className="field-input pr-11"
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 3l14 14M8.6 8.7a2 2 0 002.7 2.7M6.3 6.4C4.3 7.6 2.8 9.4 2 10c1.4 2.4 4.4 5.5 8 5.5 1.4 0 2.7-.4 3.8-1M10 4.5c3.6 0 6.6 3.1 8 5.5-.5.9-1.3 2-2.4 3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M2 10c1.4-2.4 4.4-5.5 8-5.5s6.6 3.1 8 5.5c-1.4 2.4-4.4 5.5-8 5.5S3.4 12.4 2 10z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          )}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
