'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, UserPlus, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../../lib/axios';

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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-[400px]">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 bg-zinc-900 text-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
            <ShieldCheck size={24} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Crear cuenta</h1>
          <p className="text-sm text-zinc-500 mt-2">Únete para acceder a la plataforma</p>
        </div>

        {/* Form Card */}
        <div className="bg-white px-8 py-8 shadow-sm border border-zinc-200 rounded-2xl">
          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
                Nombre completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <User size={18} strokeWidth={1.75} />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 sm:text-sm outline-none transition-all placeholder:text-zinc-400 text-zinc-900 bg-white"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Mail size={18} strokeWidth={1.75} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 sm:text-sm outline-none transition-all placeholder:text-zinc-400 text-zinc-900 bg-white"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Lock size={18} strokeWidth={1.75} />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 sm:text-sm outline-none transition-all placeholder:text-zinc-400 text-zinc-900 bg-white"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">Mínimo 6 caracteres.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} strokeWidth={2} />
                  <span>Crear cuenta</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-zinc-500">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/" className="font-medium text-zinc-900 hover:underline inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
