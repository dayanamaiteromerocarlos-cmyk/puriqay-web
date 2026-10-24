import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { todayInLima } from '../lib/dates';
import { fetchLugaresPublicos, type LugarPublico } from '../lib/jornadas';
import { EncabezadoPagina, TarjetaJornada } from './JornadaUI';
import LoadError from './LoadError';

type Filtro = 'todas' | 'confirmadas' | 'por_responder';

const FILTROS: { id: Filtro; nombre: string; vacio: string }[] = [
  { id: 'todas', nombre: 'Todas', vacio: '' },
  { id: 'confirmadas', nombre: 'Confirmadas', vacio: 'Aún no te inscribes a ninguna de las próximas jornadas.' },
  { id: 'por_responder', nombre: 'Por responder', vacio: 'Ya respondiste a todas las próximas jornadas.' },
];

// "Próximas Jornadas": todas las jornadas de hoy en adelante. Inscribirse o justificar
// una inasistencia se hace desde el detalle (JornadaDetalle); aquí se filtran según la
// respuesta de la persona: Confirmadas = ASISTIRÁ, Por responder = sin inscripción.
// Las que respondió con NO ASISTIRÁ solo aparecen en "Todas".
export default function AvailableJornadas({ onVerDetalle }: { onVerDetalle: (jornadaId: string) => void }) {
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [lugares, setLugares] = useState<Record<string, LugarPublico>>({});
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id ?? '';

    // Jornadas, lugares y respuestas en paralelo: se piden todos los lugares (catálogo
    // corto) para no esperar a las jornadas antes de pedirlos. Las inscripciones se
    // filtran por volunteer_id porque el equipo interno puede leer las de otras personas.
    const [{ data: jorData, error: jorError }, { lugares: lug, error: lugError }, { data: insData, error: insError }] = await Promise.all([
      supabase
        .from('jornadas')
        .select('id, name, date, start_time, end_time, location_id')
        .gte('date', todayInLima())
        .order('date', { ascending: true })
        .order('start_time', { ascending: true }),
      fetchLugaresPublicos(),
      supabase.from('inscripciones').select('jornada_id, status').eq('volunteer_id', userId),
    ]);

    setJornadas(jorData || []);
    setLugares(lug);
    const resp: Record<string, string> = {};
    (insData || []).forEach(i => { resp[i.jornada_id] = i.status; });
    setRespuestas(resp);
    // Si alguna consulta falla, se avisa en vez de mostrar una lista vacía que
    // parece "no hay jornadas".
    const failure = jorError || lugError || insError;
    setLoadError(failure ? failure.message : null);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-10"><p className="text-pq-teal-dark font-medium animate-pulse">Cargando jornadas disponibles...</p></div>;

  if (loadError) return <LoadError message={loadError} onRetry={loadData} />;

  const deFiltro = (f: Filtro) => jornadas.filter(j =>
    f === 'todas' ? true : f === 'confirmadas' ? respuestas[j.id] === 'ASISTIRÁ' : !respuestas[j.id]);
  const visibles = deFiltro(filtro);

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      <EncabezadoPagina titulo="Próximas Jornadas" />

      {jornadas.length === 0 ? (
        <div className="flex flex-col items-center gap-4 p-10 rounded-[20px] bg-white shadow-pq-card text-center">
          <img src="/img/markus-saludo.png" alt="Markus saludando" className="w-32 h-32 object-contain" />
          <p className="text-pq-ink-muted">Por ahora no hay jornadas programadas. ¡Vuelve pronto!</p>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Filtrar por tu respuesta" className="w-full sm:w-auto sm:self-start flex bg-pq-cream p-1 rounded-xl border border-pq-cream-dark text-[13px] sm:text-sm font-semibold">
            {FILTROS.map(f => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filtro === f.id}
                onClick={() => setFiltro(f.id)}
                className={`flex-1 sm:flex-none min-w-0 min-h-9 px-1.5 sm:px-4 py-1.5 rounded-[9px] leading-tight sm:whitespace-nowrap transition-colors ${filtro === f.id ? 'bg-white text-pq-teal-deep shadow-sm' : 'text-pq-ink-muted hover:text-pq-teal-dark'}`}
              >
                {f.nombre} ({deFiltro(f.id).length})
              </button>
            ))}
          </div>

          {visibles.length === 0 ? (
            <p className="p-6 rounded-[20px] bg-white border border-pq-cream-dark text-pq-ink-muted">
              {FILTROS.find(f => f.id === filtro)?.vacio}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {visibles.map(jor => {
                const lugar = lugares[jor.location_id];
                return (
                  <TarjetaJornada
                    key={jor.id}
                    jornada={jor}
                    linea={lugar?.action_line}
                    lugar={lugar?.name}
                    onVerDetalle={() => onVerDetalle(jor.id)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
