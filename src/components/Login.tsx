import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LockKeyhole } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'magic'>('login');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signInWithOtp({ email });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage(mode === 'magic'
      ? 'Te envié un link de acceso al correo.'
      : 'Entrando...');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#7c3aed_0,#4a176d_42%,#2b0a4a_100%)] flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-[#210c36]/85 text-violet-50 backdrop-blur rounded-[2rem] shadow-2xl shadow-black/25 border border-violet-300/20 p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-violet-400/20 text-violet-100 flex items-center justify-center">
            <LockKeyhole />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Army-Collector Admin</h1>
            <p className="text-sm text-violet-100/75">Mantenedor privado para Supabase</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-violet-950/60 p-1">
          <button type="button" onClick={() => setMode('login')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === 'login' ? 'bg-violet-100 shadow text-violet-950' : 'text-violet-100/65'}`}>Clave</button>
          <button type="button" onClick={() => setMode('magic')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === 'magic' ? 'bg-violet-100 shadow text-violet-950' : 'text-violet-100/65'}`}>Magic link</button>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-violet-100">Email</span>
          <input className="mt-1 w-full rounded-2xl border border-violet-200/20 bg-[#230c38] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-400/40" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>

        {mode === 'login' && (
          <label className="block">
            <span className="text-sm font-medium text-violet-100">Password</span>
            <input className="mt-1 w-full rounded-2xl border border-violet-200/20 bg-[#230c38] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-400/40" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
        )}

        <button disabled={loading} className="w-full rounded-2xl bg-fuchsia-600 text-white py-3 font-bold shadow-lg shadow-fuchsia-950/20 disabled:opacity-60">
          {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Enviar link'}
        </button>

        {message && <p className="text-sm text-center text-violet-100/80">{message}</p>}
      </form>
    </main>
  );
}
