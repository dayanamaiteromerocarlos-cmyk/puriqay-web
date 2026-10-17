import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    // Mensaje genérico a propósito: no revela si el correo está registrado.
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-pq-cream flex justify-center items-center p-4">
      <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-pq-cream-dark">

        <div className="text-center mb-10">
          <h2 className="text-4xl font-black text-pq-teal-deep flex items-center justify-center gap-1.5 tracking-tight">
            Puriqay
            <span className="w-2.5 h-2.5 rounded-full bg-pq-marku mt-2"></span>
          </h2>
          <p className="text-pq-teal-dark/70 font-bold uppercase tracking-widest text-xs mt-2">Recuperar contraseña</p>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="bg-pq-cream/50 text-pq-teal-deep text-sm text-center font-bold p-4 rounded-xl border border-pq-cream-dark">
              Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa también tu carpeta de spam.
            </div>
            <p className="text-center text-sm text-pq-ink/70 font-medium">
              <Link to="/" className="text-pq-teal font-black hover:text-pq-teal-dark transition-colors hover:underline">Volver a iniciar sesión</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm text-pq-ink/70 font-medium text-center">
              Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
            </p>

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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pq-teal hover:bg-pq-teal-dark text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-pq-teal/30 hover:-translate-y-0.5 transition-all duration-200 mt-2"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>

            <p className="text-center text-sm text-pq-ink/70 mt-6 font-medium">
              <Link to="/" className="text-pq-teal font-black hover:text-pq-teal-dark transition-colors hover:underline">Volver a iniciar sesión</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
