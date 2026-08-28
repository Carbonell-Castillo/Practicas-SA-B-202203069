'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/axios';
import { ShieldCheck, LogOut, ArrowLeft, CheckCircle2, ShieldAlert, ShoppingBag } from 'lucide-react';

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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-6 w-6 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-[500px] space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 shrink-0 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-sm">
            <ShieldCheck size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Panel de Administrador
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Ruta 1 · Acceso Restringido</p>
          </div>
        </div>

        {error ? (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 flex items-start gap-3 text-zinc-700 text-sm">
            <CheckCircle2 size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <p>{message}</p>
          </div>
        )}

        <button
          onClick={() => router.push('/products')}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          <ShoppingBag size={16} />
          <span>Ver catálogo y crear una orden</span>
        </button>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
          >
            <ArrowLeft size={16} />
            <span>Ir a Dashboard</span>
          </button>
          <button
            onClick={async () => {
              await api.post('/auth/logout');
              sessionStorage.removeItem('user');
              router.push('/');
            }}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}
