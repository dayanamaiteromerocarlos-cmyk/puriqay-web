import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchNombres, type Nombre } from '../lib/permisos';
import LoadError from './LoadError';
import { ChevronDown, ChevronUp, History } from 'lucide-react';

type Cambio = {
  id: string;
  created_at: string;
  editor_id: string | null;
  persona_id: string | null;
  role_antes: string | null;
  role_despues: string | null;
  area_antes: string | null;
  area_despues: string | null;
  activo_antes: boolean | null;
  activo_despues: boolean | null;
};

const LIMITE = 50;

const nombreDe = (nombres: Record<string, Nombre>, id: string | null) => {
  const n = id ? nombres[id] : null;
  return n ? `${n.first_name ?? ''} ${n.last_name ?? ''}`.trim() || 'Sin nombre' : 'Persona eliminada';
};

const cargo = (role: string | null, area: string | null) =>
  role === 'VOLUNTARIO' ? 'voluntario externo' : `${role ?? '?'} de ${area ?? 'sin área'}`;

// Quién cambió el rol, el área o el estado de quién, y cuándo. Lo escriben solas las
// funciones cambiar_rol_area y cambiar_estado; la app solo lo lee.
export default function HistorialCambios() {
  const [open, setOpen] = useState(false);
  const [cambios, setCambios] = useState<Cambio[]>([]);
  const [nombres, setNombres] = useState<Record<string, Nombre>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchCambios = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('perfiles_cambios')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(LIMITE);
    const ids = (data || []).flatMap(c => [c.editor_id, c.persona_id]);
    const { nombres: n, error: nombresError } = await fetchNombres(ids);
    if (error || nombresError) {
      setLoadError((error || nombresError)!.message);
    } else {
      setCambios(data || []);
      setNombres(n);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchCambios();
  }, [open]);

  // "activó a", "desactivó a" o "cambió a ... de X a Y".
  const describir = (c: Cambio) => {
    if (c.activo_antes !== null && c.activo_despues !== null && c.activo_antes !== c.activo_despues) {
      return { verbo: c.activo_despues ? 'activó a' : 'desactivó a', detalle: '' };
    }
    return { verbo: 'cambió a', detalle: `de ${cargo(c.role_antes, c.area_antes)} a ${cargo(c.role_despues, c.area_despues)}` };
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl border border-pq-cream-dark shadow-sm">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-left">
        <h2 className="text-xl font-black text-pq-teal-deep flex items-center gap-2">
          <History size={22} /> Historial de cambios <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
        </h2>
        {open ? <ChevronUp className="text-pq-teal-dark" /> : <ChevronDown className="text-pq-teal-dark" />}
      </button>

      {open && (
        <div className="mt-6">
          <p className="text-sm text-pq-ink/70 font-medium mb-4">
            Cambios de rol, área y estado (activo / inactivo) hechos desde la app. Se muestran los {LIMITE} más recientes.
          </p>
          {loading ? (
            <p className="text-pq-teal-dark font-bold animate-pulse">Cargando historial...</p>
          ) : loadError ? (
            <LoadError message={loadError} onRetry={fetchCambios} />
          ) : cambios.length === 0 ? (
            <p className="text-center p-6 bg-pq-cream/50 rounded-2xl border-2 border-dashed border-pq-cream-dark text-pq-teal-dark font-medium">
              Todavía no hay cambios registrados.
            </p>
          ) : (
            <ul className="divide-y-2 divide-pq-cream-dark">
              {cambios.map(c => (
                <li key={c.id} className="py-3 flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                  <span className="text-xs font-bold text-pq-ink/50 md:w-40 shrink-0">
                    {new Date(c.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <span className="text-sm text-pq-ink/80 font-medium">
                    <strong className="text-pq-teal-deep">{nombreDe(nombres, c.editor_id)}</strong> {describir(c).verbo}{' '}
                    <strong className="text-pq-teal-deep">{nombreDe(nombres, c.persona_id)}</strong> {describir(c).detalle}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
