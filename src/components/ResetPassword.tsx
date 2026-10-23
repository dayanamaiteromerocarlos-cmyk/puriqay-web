import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { PATTERNS, TITLES } from '../lib/validations';
import { traducirErrorAuth } from '../lib/authErrors';
import FondoParticulas from './FondoParticulas';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // 'checking' mientras Supabase procesa el enlace del correo; 'ready' si ya hay sesión de recuperación.
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) setStatus('ready');
    });

    // El evento puede haberse disparado antes de montar el componente: revisamos la sesión también.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus('ready');
    });

    // Si en 4 s no hay sesión, el enlace es inválido, venció o ya se usó.
    const timer = setTimeout(() => setStatus((s) => (s === 'checking' ? 'invalid' : s)), 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirm) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(traducirErrorAuth(error));
      setLoading(false);
      return;
    }

    // Solo aquí, con el cambio ya hecho, se cierran TODAS las sesiones (también las de otros
    // dispositivos): si la contraseña se cambió por una sospecha de acceso ajeno, quien la
    // tenía no puede seguir dentro. Pedir el enlace en "Olvidé mi contraseña" no cierra nada.
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });

    if (signOutError) {
      // La contraseña ya cambió; si el cierre global falla, se dice claramente.
      await supabase.auth.signOut({ scope: 'local' });
      toast.error('Contraseña actualizada, pero no pudimos cerrar tus otras sesiones. Inicia sesión con la nueva y vuelve a cambiarla si sospechas de un acceso ajeno.', { duration: 9000 });
    } else {
      toast.success('Contraseña actualizada. Se cerraron todas tus sesiones activas; inicia sesión con la nueva contraseña.', { duration: 7000 });
    }
    navigate('/', { replace: true });
  };

  const inputClass =
    'w-full px-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:bg-white focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none transition-all font-medium text-pq-ink';

  return (
    <div className="min-h-screen relative isolate bg-white flex justify-center items-center p-4">
      <FondoParticulas />
      <div className="w-full max-w-md bg-white/30 backdrop-blur-[2px] p-8 md:p-10 rounded-3xl shadow-xl border border-white/70">

        <div className="text-center mb-10">
          <h2 className="text-4xl font-black text-pq-teal-deep flex items-center justify-center gap-1.5 tracking-tight">
            Puriqay
            <span className="w-2.5 h-2.5 rounded-full bg-pq-marku mt-2"></span>
          </h2>
          <p className="text-pq-teal-dark/70 font-bold uppercase tracking-widest text-xs mt-2">Nueva contraseña</p>
        </div>

        {status === 'checking' && (
          <p className="text-center text-sm text-pq-ink/70 font-medium">Verificando enlace...</p>
        )}

        {status === 'invalid' && (
          <div className="space-y-6">
            <div className="bg-red-50 text-red-600 text-sm text-center font-bold p-3 rounded-xl border border-red-100">
              El enlace no es válido o ya venció. Solicita uno nuevo.
            </div>
            <p className="text-center text-sm text-pq-ink/70 font-medium">
              <Link to="/forgot-password" className="text-pq-teal font-black hover:text-pq-teal-dark transition-colors hover:underline">Pedir un nuevo enlace</Link>
            </p>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-pq-teal-dark mb-2">Nueva contraseña</label>
              <input
                type="password"
                required
                minLength={10}
                pattern={PATTERNS.password}
                title={TITLES.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••••"
              />
              <p className="text-xs text-pq-ink/60 font-medium mt-2">{TITLES.password}</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-pq-teal-dark mb-2">Repite la contraseña</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
                placeholder="••••••••••"
              />
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 text-sm text-center font-bold p-3 rounded-xl border border-red-100">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pq-teal hover:bg-pq-teal-dark text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-pq-teal/30 hover:-translate-y-0.5 transition-all duration-200 mt-2"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
