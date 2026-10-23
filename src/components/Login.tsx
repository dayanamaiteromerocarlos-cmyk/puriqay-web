import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { traducirErrorAuth } from '../lib/authErrors';
import FondoParticulas from './FondoParticulas';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  // Si la cuenta existe pero el correo no está confirmado, se puede pedir otro enlace.
  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) toast.error(traducirErrorAuth(error));
    else toast.success('Te reenviamos el correo de confirmación. Revisa tu bandeja y el spam.');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setNeedsConfirmation(false);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(traducirErrorAuth(error));
      setNeedsConfirmation(error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message));
    } else {
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative isolate bg-white flex justify-center items-center p-4">
      <FondoParticulas />
      <div className="w-full max-w-md bg-white/30 backdrop-blur-[2px] p-8 md:p-10 rounded-3xl shadow-xl border border-white/70">
        
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black text-pq-teal-deep flex items-center justify-center gap-1.5 tracking-tight">
            Puriqay
            <span className="w-2.5 h-2.5 rounded-full bg-pq-marku mt-2"></span>
          </h2>
          <p className="text-pq-teal-dark/70 font-bold uppercase tracking-widest text-xs mt-2">Plataforma de Voluntariado</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-pq-teal-dark mb-2">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:bg-white focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none transition-all font-medium text-pq-ink"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-pq-teal-dark mb-2">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:bg-white focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none transition-all font-medium text-pq-ink"
              placeholder="••••••••"
            />
          </div>

          <div className="text-right -mt-3">
            <Link to="/forgot-password" className="text-sm text-pq-teal font-bold hover:text-pq-teal-dark transition-colors hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 text-sm text-center font-bold p-3 rounded-xl border border-red-100">
              {errorMsg}
              {needsConfirmation && (
                <button type="button" onClick={handleResend} disabled={resending} className="block mx-auto mt-2 text-pq-teal font-black hover:underline disabled:opacity-60">
                  {resending ? 'Enviando...' : 'Reenviar correo de confirmación'}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pq-teal hover:bg-pq-teal-dark text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-pq-teal/30 hover:-translate-y-0.5 transition-all duration-200 mt-2"
          >
            {loading ? 'Cargando...' : 'Ingresar al sistema'}
          </button>
          
          <p className="text-center text-sm text-pq-ink/70 mt-6 font-medium">
            ¿No tienes una cuenta? <Link to="/register" className="text-pq-teal font-black hover:text-pq-teal-dark transition-colors hover:underline">Regístrate aquí</Link>
          </p>
        </form>
      </div>
    </div>
  );
}