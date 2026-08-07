'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/axios';
import { BrandPanel } from '../components/brand-panel';
import { PasswordField } from '../components/password-field';
import { Spinner } from '../components/spinner';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', { name, email, password });
      router.push('/?registered=1');
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo completar el registro.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <BrandPanel
        eyebrow="Únete"
        title="Crea tu cuenta"
        description="Tu nombre y correo se cifran con AES-256 antes de guardarse; nunca se almacenan en texto plano en la base de datos."
      />

      <div className="auth-form-wrap">
        <div className="auth-card">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Crear cuenta
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Se registrará con permisos de Cliente.
          </p>

          <form onSubmit={handleRegister} className="mt-7 space-y-4">
            {error && <div className="alert-error">{error}</div>}

            <div>
              <label htmlFor="name" className="field-label">Nombre completo</label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                className="field-input"
                placeholder="Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="email" className="field-label">Correo electrónico</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="field-input"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <PasswordField
              id="password"
              label="Contraseña"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              minLength={6}
              hint="Mínimo 6 caracteres."
            />

            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <Spinner />}
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/" className="link-accent">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
