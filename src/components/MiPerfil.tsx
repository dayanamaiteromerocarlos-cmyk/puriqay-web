import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import LoadError from './LoadError';
import { PATTERNS, TITLES, birthDateLimits } from '../lib/validations';
import { MapPin } from 'lucide-react';

type MiPerfilProps = {
  userId: string;
  // Para que el menú lateral muestre el nombre nuevo sin recargar.
  onSaved: (firstName: string, lastName: string) => void;
};

// Las columnas que cada persona puede editar de su propio perfil (las demás —rol,
// área, estado, correo, QR— no tienen permiso de escritura desde la app).
const EDITABLES = [
  'first_name', 'last_name', 'phone', 'birth_date', 'document_id', 'emergency_phone',
  'study_center', 'career', 'address', 'medical_conditions', 'shirt_size',
] as const;

type Campo = typeof EDITABLES[number];
type Form = Record<Campo, string>;

type Datos = Form & {
  email: string | null;
  role: string | null;
  area: string | null;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
};

const vacio = Object.fromEntries(EDITABLES.map(c => [c, ''])) as Form;

export default function MiPerfil({ userId, onSaved }: MiPerfilProps) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [form, setForm] = useState<Form>(vacio);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const fetchPerfil = async () => {
    setLoadError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select(`email, role, area, is_active, latitude, longitude, ${EDITABLES.join(', ')}`)
      .eq('id', userId)
      .single();
    if (error) {
      setLoadError(error.message);
      return;
    }
    const perfil = data as unknown as Datos;
    setDatos(perfil);
    setForm(Object.fromEntries(EDITABLES.map(c => [c, perfil[c] ?? ''])) as Form);
  };

  useEffect(() => {
    fetchPerfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Guarda solo las columnas editables; un campo vacío se guarda como vacío (null).
  const guardar = async (payload: Record<string, string | number | null>, mensaje: string) => {
    const { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select('id');
    if (error) {
      toast.error('No se pudo guardar: ' + error.message);
      return false;
    }
    if (!data || data.length === 0) {
      toast.error('No se pudo guardar: la base de datos no actualizó tu perfil.');
      return false;
    }
    toast.success(mensaje);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = Object.fromEntries(EDITABLES.map(c => [c, form[c].trim() || null]));
    if (await guardar(payload, 'Tus datos se guardaron.')) {
      onSaved(form.first_name.trim(), form.last_name.trim());
      fetchPerfil();
    }
    setSaving(false);
  };

  const actualizarUbicacion = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no permite obtener la ubicación.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (await guardar({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, 'Ubicación actualizada.')) fetchPerfil();
        setLocating(false);
      },
      () => {
        toast.error('No pudimos obtener tu ubicación. Permítela desde el candado de la barra de direcciones.');
        setLocating(false);
      }
    );
  };

  if (loadError) return <LoadError message={loadError} onRetry={fetchPerfil} />;
  if (!datos) return <p className="text-pq-teal-dark font-bold animate-pulse p-10 text-center">Cargando tu perfil...</p>;

  // El equipo interno tiene obligatorios los datos que pide el modal de perfil
  // progresivo; para un voluntario externo son opcionales. Celular y fecha de
  // nacimiento son opcionales para todos: hay internos sin ellos (el modal no los
  // pide) y no deben quedar sin poder guardar otros cambios por eso.
  const esInterno = datos.role === 'ADMIN' || datos.role === 'COORDINADOR';
  const { min, max } = birthDateLimits();
  const inputClass = "w-full px-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:bg-white focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none transition-all font-medium text-pq-ink";
  const labelClass = "block text-sm font-bold text-pq-teal-dark mb-2";

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-pq-cream-dark shadow-sm">
        <h2 className="text-2xl font-black text-pq-teal-deep mb-2 flex items-center gap-2">
          Mi Perfil <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
        </h2>
        <p className="text-pq-ink/70 mb-6 font-medium">Revisa y actualiza tus datos.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-pq-cream/40 p-4 rounded-xl border border-pq-cream-dark">
            <p className="text-xs font-bold text-pq-teal-dark uppercase tracking-wider">Correo</p>
            <p className="font-bold text-pq-ink/80 break-all">{datos.email}</p>
          </div>
          <div className="bg-pq-cream/40 p-4 rounded-xl border border-pq-cream-dark">
            <p className="text-xs font-bold text-pq-teal-dark uppercase tracking-wider">Rol y área</p>
            <p className="font-bold text-pq-ink/80">
              {datos.role === 'VOLUNTARIO' ? 'Voluntario externo' : `${datos.role} · ${datos.area}`}
            </p>
          </div>
          <div className="bg-pq-cream/40 p-4 rounded-xl border border-pq-cream-dark">
            <p className="text-xs font-bold text-pq-teal-dark uppercase tracking-wider">Estado</p>
            <p className={`font-black ${datos.is_active ? 'text-green-700' : 'text-red-600'}`}>
              {datos.is_active ? 'Activo' : 'Inactivo'}
            </p>
          </div>
        </div>
        <p className="text-xs text-pq-ink/50 font-medium -mt-4 mb-8">
          El correo, el rol, el área y el estado no se cambian desde aquí: el rol, el área y el estado los cambian Gerencia, TI o Gestión Humana.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Nombres</label>
              <input type="text" name="first_name" required pattern={PATTERNS.soloLetras} title={TITLES.soloLetras} value={form.first_name} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Apellidos</label>
              <input type="text" name="last_name" required pattern={PATTERNS.soloLetras} title={TITLES.soloLetras} value={form.last_name} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Celular</label>
              <input type="tel" name="phone" maxLength={9} inputMode="numeric" pattern={PATTERNS.celular} title={TITLES.celular} value={form.phone} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Fecha de nacimiento</label>
              <input type="date" name="birth_date" min={min} max={max} value={form.birth_date} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>DNI</label>
              <input type="text" name="document_id" required={esInterno} maxLength={8} inputMode="numeric" pattern={PATTERNS.dni} title={TITLES.dni} value={form.document_id} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Celular de emergencia</label>
              <input type="tel" name="emergency_phone" required={esInterno} maxLength={9} inputMode="numeric" pattern={PATTERNS.celular} title={TITLES.celular} value={form.emergency_phone} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Centro de estudios</label>
              <input type="text" name="study_center" required={esInterno} value={form.study_center} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Carrera / Profesión</label>
              <input type="text" name="career" required={esInterno} pattern={PATTERNS.soloLetras} title={TITLES.soloLetras} value={form.career} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Dirección</label>
              <input type="text" name="address" required={esInterno} pattern={PATTERNS.direccion} title={TITLES.direccion} value={form.address} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Alergias / Condiciones médicas</label>
              <input type="text" name="medical_conditions" required={esInterno} value={form.medical_conditions} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Talla de polo / chaleco</label>
              <select name="shirt_size" required={esInterno} value={form.shirt_size} onChange={handleChange} className={inputClass}>
                <option value="">Selecciona tu talla</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Ubicación</label>
              <button type="button" onClick={actualizarUbicacion} disabled={locating} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold border-2 bg-pq-cream/50 text-pq-teal-dark border-pq-cream-dark hover:bg-pq-cream transition-all disabled:opacity-60">
                <MapPin size={18} /> {locating ? 'Obteniendo...' : datos.latitude !== null ? 'Actualizar mi ubicación' : 'Registrar mi ubicación'}
              </button>
              <p className="text-xs text-pq-ink/50 font-medium mt-1">
                {datos.latitude !== null ? 'Ya tienes una ubicación registrada.' : 'Todavía no tienes una ubicación registrada.'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t-2 border-dashed border-pq-cream-dark flex justify-end">
            <button type="submit" disabled={saving} className="w-full md:w-auto bg-pq-teal hover:bg-pq-teal-dark text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-pq-teal/30 transition-all disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
