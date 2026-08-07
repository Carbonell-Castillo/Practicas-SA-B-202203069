'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/axios';
import { Spinner } from '../components/spinner';

export default function AdminPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/protected/ruta1');
        setMessage(response.data.message);
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          router.push('/');
        } else {
          setError(err.response?.data?.message || 'Error de conexión');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text-muted)]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-9">
        <div>
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--accent)]">
            Acceso de administrador
          </span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">
            Panel de Administrador
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Ruta 1 · Solo Admin</p>
        </div>

        {error ? (
          <div className="alert-error">{error}</div>
        ) : (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-sm text-[var(--text)]">
            {message}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--accent)]/50"
          >
            Ir a Dashboard (Ruta 2)
          </button>
          <button
            onClick={async () => {
              await api.post('/auth/logout');
              router.push('/');
            }}
            className="flex-1 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-2.5 text-sm font-medium text-[#ffb3b6] transition-colors hover:brightness-110"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
