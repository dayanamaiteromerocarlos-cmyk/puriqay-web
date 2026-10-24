import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { todayInLima } from '../lib/dates';
import { fetchLugaresPublicos, type LugarPublico } from '../lib/jornadas';
import { EncabezadoPagina, TarjetaJornada } from './JornadaUI';
import LoadError from './LoadError';

// "Próximas Jornadas": todas las jornadas de hoy en adelante. Inscribirse o justificar
// una inasistencia se hace desde el detalle (JornadaDetalle).
export default function AvailableJornadas({ onVerDetalle }: { onVerDetalle: (jornadaId: string) => void }) {
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [lugares, setLugares] = useState<Record<string, LugarPublico>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);

    // Jornadas y lugares en paralelo: se piden todos los lugares (catálogo corto)
    // para no esperar a las jornadas antes de pedirlos.
    const [{ data: jorData, error: jorError }, { lugares: lug, error: lugError }] = await Promise.all([
      supabase
        .from('jornadas')
        .select('id, name, date, start_time, end_time, location_id')
        .gte('date', todayInLima())
        .order('date', { ascending: true })
        .order('start_time', { ascending: true }),
      fetchLugaresPublicos(),
    ]);

    setJornadas(jorData || []);
    setLugares(lug);
    // Si alguna consulta falla, se avisa en vez de mostrar una lista vacía que
    // parece "no hay jornadas".
    const failure = jorError || lugError;
    setLoadError(failure ? failure.message : null);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-10"><p className="text-pq-teal-dark font-medium animate-pulse">Cargando jornadas disponibles...</p></div>;

  if (loadError) return <LoadError message={loadError} onRetry={loadData} />;

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      <EncabezadoPagina titulo="Próximas Jornadas" />

      {jornadas.length === 0 ? (
        <div className="flex flex-col items-center gap-4 p-10 rounded-[20px] bg-white shadow-pq-card text-center">
          <img src="/img/markus-saludo.png" alt="Markus saludando" className="w-32 h-32 object-contain" />
          <p className="text-pq-ink-muted">Por ahora no hay jornadas programadas. ¡Vuelve pronto!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {jornadas.map(jor => {
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
    </div>
  );
}
