import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { PATTERNS, TITLES, birthDateLimits, limpiarNombre } from '../lib/validations';
import { traducirErrorAuth } from '../lib/authErrors';
import FondoParticulas from './FondoParticulas';

// Fase 1 del registro (fricción cero): solo lo mínimo para crear la cuenta.
// El resto de los datos del voluntario (DNI, contacto de emergencia, centro de
// estudios, dirección, tallas, etc.) se piden después mediante el modal de
// "Completado de Perfil Progresivo" en Dashboard.tsx la primera vez que inicia sesión.
export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const [formData, setFormData] = useState({
    email: '', password: '', firstName: '', lastName: '', birthDate: '', phone: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Los datos del perfil viajan como metadata del signUp: el trigger
    // handle_new_user los copia a la tabla profiles al crear la cuenta.
    // Así funciona igual con o sin verificación de correo activada, porque no
    // dependemos de tener sesión iniciada para guardarlos.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: limpiarNombre(formData.firstName),
          last_name: limpiarNombre(formData.lastName),
          birth_date: formData.birthDate,
          phone: formData.phone,
        },
      },
    });

    if (authError) {
      // Con "Confirm email" activo (producción) Supabase no devuelve error si el correo ya
      // existe, para no revelar qué correos están registrados. Aquí se imita ese mismo
      // comportamiento cuando sí devuelve el error (p. ej. en entornos sin confirmación).
      if (authError.code === 'user_already_exists') {
        setEmailSent(true);
      } else {
        setErrorMsg(traducirErrorAuth(authError));
      }
      setLoading(false);
      return;
    }

    // Con "Confirm email" activado en Supabase, signUp no devuelve sesión:
    // la cuenta existe pero recién se activa al hacer clic en el correo.
    if (authData.user && !authData.session) {
      setEmailSent(true);
    } else if (authData.session) {
      toast.success('¡Registro exitoso! Bienvenido a Puriqay.');
      navigate('/dashboard', { replace: true });
    }

    setLoading(false);
  };

  const { min: minBirthDate, max: maxBirthDate } = birthDateLimits();
  const inputClass = "w-full px-4 py-3 border-[1.5px] border-pq-border rounded-xl bg-white focus:border-pq-teal focus:shadow-pq-focus outline-none transition-all font-medium text-pq-ink";
  const labelClass = "block text-sm font-bold text-pq-teal-dark mb-2";


  // Pantalla posterior al registro cuando Supabase exige verificar el correo.
  if (emailSent) {
    return (
      <div className="min-h-screen relative isolate bg-white py-10 px-4 flex justify-center items-center">
        <FondoParticulas />
        <div className="w-full max-w-md bg-white/30 backdrop-blur-[2px] p-8 md:p-12 rounded-3xl shadow-xl border border-white/70 border-t-[6px] border-t-pq-brand text-center">
          <div className="w-16 h-16 rounded-full bg-pq-teal/10 border-2 border-pq-teal/30 flex items-center justify-center mx-auto mb-6">
            <MailCheck size={30} className="text-pq-teal" />
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-pq-teal-deep flex items-center justify-center gap-2">
            Revisa tu correo <span className="w-2.5 h-2.5 rounded-full bg-pq-marku mt-2"></span>
          </h2>

          <p className="text-pq-ink/70 font-medium text-sm mt-4">
            Te enviamos un enlace de confirmación a <span className="font-black text-pq-teal-deep">{formData.email}</span>.
            Haz clic en ese enlace para activar tu cuenta y poder ingresar.
          </p>

          <p className="text-xs text-pq-ink/50 font-medium mt-4">
            Si no lo ves en unos minutos, revisa tu carpeta de spam o correo no deseado.
          </p>

          <Link to="/" className="block w-full bg-pq-teal hover:bg-pq-teal-dark text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-pq-teal/30 hover:-translate-y-0.5 transition-all duration-200 mt-8">
            Ir a Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen relative isolate bg-white py-10 px-4 flex justify-center items-center">
      <FondoParticulas />
      <div className="w-full max-w-lg bg-white/30 backdrop-blur-[2px] p-8 md:p-12 rounded-3xl shadow-xl border border-white/70 border-t-[6px] border-t-pq-brand">

        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black text-pq-teal-deep flex items-center justify-center gap-2">
            Únete a Puriqay <span className="w-2.5 h-2.5 rounded-full bg-pq-marku mt-2"></span>
          </h2>
          <p className="text-pq-teal-dark/70 font-bold uppercase tracking-widest text-xs mt-2">Crea tu cuenta en un minuto</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className={labelClass}>Nombres</label><input type="text" name="firstName" required pattern={PATTERNS.soloLetras} title={TITLES.soloLetras} value={formData.firstName} onChange={handleChange} className={inputClass} /></div>
            <div><label className={labelClass}>Apellidos</label><input type="text" name="lastName" required pattern={PATTERNS.soloLetras} title={TITLES.soloLetras} value={formData.lastName} onChange={handleChange} className={inputClass} /></div>
          </div>

          <div>
            <label className={labelClass}>Correo Electrónico</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Contraseña <span className="text-xs font-medium text-pq-ink/50">(Mín. 10, con mayúscula, número y símbolo)</span></label>
            <input type="password" name="password" required minLength={10} pattern={PATTERNS.password} title={TITLES.password} value={formData.password} onChange={handleChange} className={inputClass} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className={labelClass}>Fecha de Nacimiento</label><input type="date" name="birthDate" required min={minBirthDate} max={maxBirthDate} value={formData.birthDate} onChange={handleChange} className={inputClass} /></div>
            <div><label className={labelClass}>Celular <span className="text-xs font-medium text-pq-ink/50">(9 números)</span></label><input type="tel" name="phone" required maxLength={9} inputMode="numeric" pattern={PATTERNS.celular} title={TITLES.celular} value={formData.phone} onChange={handleChange} className={inputClass} /></div>
          </div>

          {errorMsg && <div className="bg-pq-error-50 text-pq-error text-sm text-center font-bold p-3 rounded-xl border border-pq-error/20">{errorMsg}</div>}

          <div className="pt-4 border-t-2 border-dashed border-pq-cream-dark mt-8">
            <button type="submit" disabled={loading} className="w-full bg-pq-teal hover:bg-pq-teal-dark text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-pq-teal/30 hover:-translate-y-0.5 transition-all duration-200">
              {loading ? 'Procesando registro...' : 'Completar Registro'}
            </button>
            <p className="text-center text-xs text-pq-ink/50 font-medium mt-3">Te pediremos algunos datos adicionales la primera vez que ingreses.</p>
          </div>

          <p className="text-center text-sm text-pq-ink/70 mt-6 font-medium">
            ¿Ya tienes una cuenta? <Link to="/" className="text-pq-teal font-black hover:text-pq-teal-dark transition-colors hover:underline">Inicia sesión aquí</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
