import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { todayInLima } from '../lib/dates';
import { fetchHistorial, haceDias, horario, horasDe, formatoHoras, type EntradaHistorial, type LugarPublico } from '../lib/jornadas';
import { ChipLinea, BotonSecundario } from './JornadaUI';
import { EstadoChip } from './MisAsistencias';
import LoadError from './LoadError';
import DragonPeek from './DragonPeek';
import { Clock, MapPin, History, ArrowRight, Star, Heart } from 'lucide-react';

const PROXIMAS_EN_INICIO = 3;

// Cuenta de la presentación (demo): en la tarjeta de Inicio ve la foto del creador
// en vez de Markus. Quitar junto con la cuenta cuando termine la demo.
const CORREO_DEMO = 'vampirar3@gmail.com';

type Props = {
  userId: string;
  nombre: string;
  onVerDetalle: (jornadaId: string) => void;
  onVerTodas: () => void;
};

export default function Inicio({ userId, nombre, onVerDetalle, onVerTodas }: Props) {
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [proximas, setProximas] = useState<any[]>([]);
  const [lugares, setLugares] = useState<Record<string, LugarPublico>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [esDemo, setEsDemo] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) =>
      setEsDemo(session?.user.email === CORREO_DEMO));
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);

    // Las próximas jornadas de toda la organización, esté o no inscrita la persona.
    const [hist, jor] = await Promise.all([
      fetchHistorial(userId),
      supabase
        .from('jornadas')
        .select('id, name, date, start_time, end_time, location_id')
        .gte('date', todayInLima())
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(PROXIMAS_EN_INICIO),
    ]);

    setHistorial(hist.entradas);
    setProximas(jor.data || []);
    setLugares(hist.lugares);
    const failure = hist.error || jor.error;
    setLoadError(failure ? failure.message : null);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-10"><p className="text-pq-teal-dark font-medium animate-pulse">Cargando tu resumen...</p></div>;

  if (loadError) return <LoadError message={loadError} onRetry={loadData} />;

  const asistidas = historial.filter(e => e.estado === 'Asistió').length;
  const ultima = historial[0];

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <DragonPeek userId={userId} />
      <div>
        <h1 className="text-[26px] md:text-[32px] font-extrabold text-pq-teal-deep leading-tight">¡Hola{nombre ? `, ${nombre.split(' ')[0]}` : ''}!</h1>
        <p className="mt-2 text-pq-ink-muted">Qué bueno tenerte aquí de vuelta.</p>
      </div>

      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex-[999_1_480px] min-w-0 flex flex-col gap-6 md:gap-8">

          <section className="p-6 md:p-8 rounded-[20px] bg-pq-teal text-white shadow-pq-card">
            <p className="opacity-90">Tu impacto hasta ahora</p>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-display text-5xl md:text-[64px] font-extrabold leading-none">{formatoHoras(horasDe(historial))}</span>
              <span className="font-display text-xl md:text-2xl font-bold">horas acumuladas</span>
            </p>
            <div className="mt-6 md:mt-8 inline-flex flex-col gap-1 px-4 py-3 rounded-xl bg-white/20">
              <span className="text-sm font-semibold">Jornadas</span>
              <span className="font-display text-2xl font-bold">{asistidas}</span>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xl md:text-2xl font-bold text-pq-teal-deep">Próximas Jornadas</h2>
              <button type="button" onClick={onVerTodas} className="text-sm font-semibold text-pq-teal hover:text-pq-teal-dark">Ver todas</button>
            </div>

            {proximas.length === 0 ? (
              <p className="p-6 rounded-[20px] bg-white border border-pq-cream-dark text-pq-ink-muted">No hay jornadas programadas por ahora.</p>
            ) : proximas.map(j => {
              const fecha = new Date(j.date + 'T12:00:00');
              const lugar = lugares[j.location_id];
              return (
                <article key={j.id} className="flex flex-wrap items-center gap-4 md:gap-6 p-5 md:p-6 rounded-[20px] bg-white shadow-pq-card">
                  <div className="w-20 h-20 shrink-0 rounded-xl bg-pq-marku text-pq-ink flex flex-col items-center justify-center">
                    <span className="text-xs font-semibold uppercase tracking-[0.08em]">{fecha.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')}</span>
                    <span className="font-display text-[28px] font-extrabold leading-tight">{fecha.getDate()}</span>
                  </div>
                  <div className="flex-[1_1_200px] min-w-0 flex flex-col gap-1.5">
                    <ChipLinea linea={lugar?.action_line} />
                    <h3 className="text-lg font-bold text-pq-ink">{j.name}</h3>
                    <span className="flex items-center gap-1.5 text-sm text-pq-ink-muted"><Clock size={16} aria-hidden="true" />{horario(j)}</span>
                    {lugar && <span className="flex items-center gap-1.5 text-sm text-pq-ink-muted"><MapPin size={16} aria-hidden="true" />{lugar.name}</span>}
                  </div>
                  <BotonSecundario onClick={() => onVerDetalle(j.id)} className="w-full sm:w-auto">Ver detalles</BotonSecundario>
                </article>
              );
            })}
          </section>

          <button
            type="button"
            onClick={onVerTodas}
            className="self-stretch sm:self-start inline-flex items-center justify-center gap-3 min-h-12 px-6 py-3.5 rounded-xl bg-pq-teal hover:bg-pq-teal-dark text-white font-semibold shadow-lg shadow-pq-teal/30 transition-colors"
          >
            Explorar jornadas disponibles <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-[1_1_280px] min-w-0 flex flex-col gap-6">
          <section className="relative px-6 py-8 rounded-[20px] bg-pq-teal-50 flex justify-center">
            <Star size={28} className="absolute left-4 top-4 text-pq-marku" aria-hidden="true" />
            <figure className="w-full max-w-[260px] p-3 pb-5 border-[1.5px] border-pq-brand rounded-xl bg-white -rotate-2 shadow-pq-card">
              <div className="aspect-square rounded-lg bg-pq-cream flex items-center justify-center overflow-hidden">
                {esDemo
                  ? <img src="/img/foto-demo.webp" alt="Voluntario de Puriqay con un perro rescatado" className="w-full h-full object-cover" />
                  : <img src="/img/markus-proximamente.png" alt="Markus señalando" className="w-4/5 h-4/5 object-contain" />}
              </div>
              <figcaption className="mt-4 text-center font-display font-bold text-pq-teal-deep">
                {esDemo ? '¡Vamos por una más!' : 'Próximamente'}
              </figcaption>
            </figure>
            <Heart size={28} className="absolute right-4 bottom-4 text-pq-brand" aria-hidden="true" />
          </section>

          <section className="p-6 rounded-[20px] bg-white shadow-pq-card flex flex-col gap-4">
            <h2 className="flex items-center gap-3 text-lg font-bold text-pq-teal-deep">
              <span className="w-10 h-10 rounded-full bg-pq-teal-50 text-pq-teal flex items-center justify-center"><History size={20} aria-hidden="true" /></span>
              Última actividad
            </h2>
            {ultima ? (
              <div className="p-4 border border-pq-cream-dark rounded-xl flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <EstadoChip estado={ultima.estado} />
                  <span className="text-xs text-pq-ink-muted">{haceDias(ultima.jornada.date)}</span>
                </div>
                <span className="font-semibold text-pq-ink">{ultima.jornada.name}</span>
                {ultima.lugar && <span className="flex items-center gap-1.5 text-sm text-pq-ink-muted"><MapPin size={16} aria-hidden="true" />{ultima.lugar.name}</span>}
              </div>
            ) : (
              <p className="text-sm text-pq-ink-muted">Aún no tienes actividades registradas. ¡Inscríbete a tu primera jornada!</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
