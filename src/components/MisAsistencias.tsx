import { useEffect, useState } from 'react';
import { todayInLima } from '../lib/dates';
import { fetchHistorial, fechaCorta, horasDe, formatoHoras, type EntradaHistorial, type EstadoAsistencia } from '../lib/jornadas';
import { EncabezadoPagina, IconoLinea, BotonSecundario } from './JornadaUI';
import LoadError from './LoadError';
import { Clock, CalendarRange, History, CalendarDays, CircleCheck, CircleX, FileText } from 'lucide-react';

const POR_PAGINA = 10;

const ESTILO_ESTADO: Record<EstadoAsistencia, { clase: string; Icono: typeof CircleCheck }> = {
  'Asistió': { clase: 'bg-pq-teal-50 text-pq-teal-deep', Icono: CircleCheck },
  'Faltó': { clase: 'bg-pq-marku-50 text-pq-marku-ink', Icono: CircleX },
  'Justificó': { clase: 'bg-pq-cream border border-pq-cream-dark text-pq-ink-muted', Icono: FileText },
};

export function EstadoChip({ estado }: { estado: EstadoAsistencia }) {
  const { clase, Icono } = ESTILO_ESTADO[estado];
  return (
    <span className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-semibold ${clase}`}>
      <Icono size={14} aria-hidden="true" />{estado}
    </span>
  );
}

export default function MisAsistencias({ userId }: { userId: string }) {
  const [entradas, setEntradas] = useState<EntradaHistorial[]>([]);
  const [visibles, setVisibles] = useState(POR_PAGINA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    const { entradas, error } = await fetchHistorial(userId);
    setEntradas(entradas);
    setLoadError(error ? error.message : null);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-10"><p className="text-pq-teal-dark font-medium animate-pulse">Cargando tu historial...</p></div>;

  if (loadError) return <LoadError message={loadError} onRetry={loadData} />;

  const anio = todayInLima().slice(0, 4);
  const delAnio = entradas.filter(e => e.jornada.date.startsWith(anio));

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <EncabezadoPagina titulo="Historial de Impacto" />

      <section className="relative overflow-hidden flex flex-wrap rounded-[20px] bg-white shadow-pq-card">
        <div aria-hidden="true" className="absolute -right-[60px] -top-[60px] w-40 h-40 rounded-full bg-pq-marku-50" />
        <div className="relative flex-[1_1_240px] px-6 py-8 flex flex-col items-center gap-2 text-center">
          <Clock size={32} className="text-pq-teal" aria-hidden="true" />
          <span className="font-display text-5xl font-extrabold leading-tight text-pq-ink">{formatoHoras(horasDe(entradas))}</span>
          <span className="text-xs font-semibold tracking-[0.08em] uppercase text-pq-ink-muted">Total de horas históricas</span>
        </div>
        <div aria-hidden="true" className="relative w-full h-px mx-8 sm:w-px sm:h-auto sm:mx-0 sm:my-8 bg-pq-cream-dark" />
        <div className="relative flex-[1_1_240px] px-6 py-8 flex flex-col items-center gap-2 text-center">
          <CalendarRange size={32} className="text-pq-teal" aria-hidden="true" />
          <span className="font-display text-5xl font-extrabold leading-tight text-pq-ink">{formatoHoras(horasDe(delAnio))}</span>
          <span className="text-xs font-semibold tracking-[0.08em] uppercase text-pq-ink-muted">Horas este año</span>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2.5 text-xl md:text-2xl font-bold text-pq-teal-deep">
          <History size={24} className="text-pq-teal" aria-hidden="true" />Jornadas Pasadas
        </h2>

        {entradas.length === 0 && (
          <p className="p-6 rounded-2xl bg-white border border-pq-cream-dark text-pq-ink-muted">
            Aquí verás las jornadas en las que participes.
          </p>
        )}

        {entradas.slice(0, visibles).map(({ jornada, lugar, estado }) => (
          <article key={jornada.id} className="flex items-center gap-4 px-4 md:px-5 py-4 rounded-2xl bg-white border border-pq-cream-dark">
            <span className="w-12 h-12 shrink-0 rounded-xl bg-pq-teal-50 text-pq-teal flex items-center justify-center">
              <IconoLinea linea={lugar?.action_line} />
            </span>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="font-semibold text-pq-ink">{jornada.name}</span>
              <span className="flex items-center gap-1.5 text-sm text-pq-ink-muted">
                <CalendarDays size={14} aria-hidden="true" />
                {fechaCorta(jornada.date)}{estado === 'Asistió' && ` · ${formatoHoras(Number(jornada.valid_hours))} horas`}
              </span>
            </div>
            <EstadoChip estado={estado} />
          </article>
        ))}

        {visibles < entradas.length && (
          <BotonSecundario onClick={() => setVisibles(v => v + POR_PAGINA)} className="self-center mt-2 px-8">Cargar más</BotonSecundario>
        )}
      </section>
    </div>
  );
}
