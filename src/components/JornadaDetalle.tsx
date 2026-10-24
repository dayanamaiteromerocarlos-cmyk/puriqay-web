import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { todayInLima } from '../lib/dates';
import { fechaLarga, horario, fetchLugaresPublicos, type LugarPublico } from '../lib/jornadas';
import { ChipLinea, ImagenJornada, Modal, BotonPrimario, BotonSecundario, inputClass, labelClass } from './JornadaUI';
import LoadError from './LoadError';
import { ArrowLeft, UserRound, CalendarDays, MapPin, Flag, Hand, CircleX, CircleCheck, ExternalLink } from 'lucide-react';

const MIN_JUSTIFICATION_CHARS = 10;

type Props = {
  jornadaId: string;
  // El equipo interno, además de inscribirse, puede decir "No asistiré" con un motivo.
  esInterno: boolean;
  volverA: string;
  onVolver: () => void;
};

export default function JornadaDetalle({ jornadaId, esInterno, volverA, onVolver }: Props) {
  const [jornada, setJornada] = useState<any | null>(null);
  const [lugar, setLugar] = useState<LugarPublico | null>(null);
  const [coordinador, setCoordinador] = useState<string | null>(null);
  const [inscripcion, setInscripcion] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [justificationType, setJustificationType] = useState('Salud');
  const [justificationText, setJustificationText] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadaId]);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    // getSession lee la sesión guardada sin ir al servidor; la base valida el token en cada consulta.
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      // Sin sesión no hay nada que cargar; Dashboard se encarga de mandar al login.
      setLoading(false);
      return;
    }
    setUserId(user.id);

    // Todo en paralelo; el lugar sale del catálogo completo de lugares. El nombre
    // del coordinador sale de nombre_coordinador(): los voluntarios no pueden leer
    // perfiles de otras personas.
    const [{ data: jor, error: jorError }, lug, coord, ins] = await Promise.all([
      supabase
        .from('jornadas')
        .select('id, name, date, start_time, end_time, type, description, location_id')
        .eq('id', jornadaId)
        .maybeSingle(),
      fetchLugaresPublicos(),
      supabase.rpc('nombre_coordinador', { p_jornada: jornadaId }),
      supabase.from('inscripciones').select('id, status, justification_type, justification_text')
        .eq('jornada_id', jornadaId).eq('volunteer_id', user.id).maybeSingle(),
    ]);

    setJornada(jor);
    setLugar(jor?.location_id ? lug.lugares[jor.location_id] ?? null : null);
    const c = coord.data?.[0];
    setCoordinador(c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() : null);
    setInscripcion(ins.data);

    const failure = jorError || lug.error || coord.error || ins.error;
    if (failure) setLoadError(failure.message);
    else if (!jor) setLoadError('La jornada no existe o fue borrada.');
    setLoading(false);
  };

  // La base valida lo demás: solo la propia fila, solo jornadas de hoy en adelante y,
  // con NO ASISTIRÁ, el tipo de motivo. has_changed y las fechas las pone un trigger.
  const responder = async (status: 'ASISTIRÁ' | 'NO ASISTIRÁ', type: string | null = null, text: string | null = null) => {
    if (!userId || guardando) return;
    setGuardando(true);
    const payload = { status, justification_type: type, justification_text: text };
    const { error } = inscripcion
      ? await supabase.from('inscripciones').update(payload).eq('id', inscripcion.id)
      : await supabase.from('inscripciones').insert([{ ...payload, jornada_id: jornadaId, volunteer_id: userId }]);
    setGuardando(false);

    if (error) {
      toast.error('Error al guardar la respuesta: ' + error.message);
      return;
    }
    toast.success(status === 'ASISTIRÁ' ? '¡Listo! Te inscribiste a la jornada.' : 'Registramos tu inasistencia.');
    setShowModal(false);
    setJustificationText('');
    setJustificationType('Salud');
    loadData();
  };

  // La inasistencia del equipo interno exige un motivo escrito (no solo el tipo, que
  // viene preseleccionado).
  const confirmarInasistencia = () => {
    if (justificationText.trim().length < MIN_JUSTIFICATION_CHARS) {
      toast.error(`Escribe el detalle de tu inasistencia (mínimo ${MIN_JUSTIFICATION_CHARS} caracteres).`);
      return;
    }
    responder('NO ASISTIRÁ', justificationType, justificationText.trim());
  };

  const volver = (
    <button type="button" onClick={onVolver} className="self-start inline-flex items-center gap-2 min-h-11 text-[15px] font-semibold text-pq-teal hover:text-pq-teal-dark">
      <ArrowLeft size={20} aria-hidden="true" />Volver a {volverA}
    </button>
  );

  if (loading) return <div className="flex justify-center p-10"><p className="text-pq-teal-dark font-medium animate-pulse">Cargando la jornada...</p></div>;

  if (loadError || !jornada) return (
    <div className="flex flex-col gap-6">
      {volver}
      <LoadError message={loadError ?? ''} onRetry={loadData} />
    </div>
  );

  const pasada = jornada.date < todayInLima();
  const estado = inscripcion?.status ?? null;

  const Dato = ({ icono: Icono, titulo, principal, secundario, children }: any) => (
    <div className="flex-[1_1_220px] min-w-0 flex gap-3.5 p-4 md:p-[18px] rounded-2xl bg-white border border-pq-cream-dark">
      <span className="w-11 h-11 shrink-0 rounded-full bg-pq-teal-50 text-pq-teal flex items-center justify-center"><Icono size={22} aria-hidden="true" /></span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[13px] font-semibold text-pq-ink-muted">{titulo}</span>
        <span className="font-semibold text-pq-ink">{principal}</span>
        {secundario && <span className="text-sm text-pq-ink-muted">{secundario}</span>}
        {children}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {volver}

      <div className="flex flex-wrap gap-6 md:gap-8 items-start">
        <div className="flex-[1_1_300px] md:max-w-[380px] min-w-0 flex flex-col gap-5">
          <section className="p-3 rounded-[20px] bg-white shadow-pq-card">
            <ImagenJornada alto="h-52 md:h-[260px]" />
            <div className="flex flex-wrap items-center justify-between gap-2 px-1.5 pt-3.5 pb-1">
              <span className="text-[13px] font-bold tracking-[0.06em] uppercase text-pq-ink-muted">{jornada.type}</span>
              <ChipLinea linea={lugar?.action_line} />
            </div>
          </section>
          <section className="flex items-center gap-4 p-5 rounded-[20px] bg-white border border-pq-cream-dark">
            <span className="w-[52px] h-[52px] shrink-0 rounded-full bg-pq-teal-50 text-pq-teal flex items-center justify-center"><UserRound size={26} aria-hidden="true" /></span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-semibold text-pq-ink-muted">Organizado por</span>
              <span className="text-[17px] font-semibold text-pq-ink">{coordinador || 'Por confirmar'}</span>
            </div>
          </section>
        </div>

        <div className="flex-[999_1_400px] min-w-0 flex flex-col gap-6">
          <h1 className="text-[26px] md:text-[32px] font-extrabold leading-tight text-pq-teal-deep">{jornada.name}</h1>
          {jornada.description && <p className="leading-relaxed text-pq-ink-muted whitespace-pre-line">{jornada.description}</p>}

          <div className="flex flex-wrap gap-4">
            <Dato icono={CalendarDays} titulo="Fecha y hora" principal={fechaLarga(jornada.date)} secundario={horario(jornada)} />
            <Dato icono={MapPin} titulo="Lugar" principal={lugar?.name ?? 'Por definir'}
              secundario={lugar ? [lugar.address, lugar.district].filter(Boolean).join(', ') : null}>
              {lugar?.maps_link && /^https?:\/\//i.test(lugar.maps_link) && (
                <a href={lugar.maps_link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-pq-teal hover:text-pq-teal-dark">
                  Ver en el mapa <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
            </Dato>
            <Dato icono={Flag} titulo="Punto de encuentro" principal={lugar?.meeting_point || 'Por definir'} secundario={lugar?.special_instructions} />
          </div>

          {pasada ? (
            <p className="p-4 rounded-xl bg-pq-cream border border-pq-cream-dark text-sm text-pq-ink-muted">Esta jornada ya pasó: ya no se pueden registrar respuestas.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {estado === 'NO ASISTIRÁ' && (
                <div className="p-4 rounded-xl bg-pq-error-50 border border-pq-error/20 text-sm text-pq-error">
                  <p><strong>Registraste que no asistirás.</strong> Motivo: {inscripcion.justification_type}</p>
                  {inscripcion.justification_text && <p className="italic mt-1">"{inscripcion.justification_text}"</p>}
                </div>
              )}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                {estado === 'ASISTIRÁ' ? (
                  <span className="min-h-12 px-6 py-3 inline-flex items-center justify-center gap-2.5 rounded-xl bg-pq-teal-50 text-pq-teal-deep font-semibold">
                    <CircleCheck size={22} aria-hidden="true" />Ya estás inscrito
                  </span>
                ) : (
                  <BotonPrimario onClick={() => responder('ASISTIRÁ')} disabled={guardando}>
                    <Hand size={22} aria-hidden="true" />{guardando ? 'Guardando...' : 'Inscribirme'}
                  </BotonPrimario>
                )}
                {esInterno && estado !== 'NO ASISTIRÁ' && (
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    disabled={guardando}
                    className="min-h-12 px-7 py-3 inline-flex items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-pq-error bg-white text-pq-error font-semibold hover:bg-pq-error-50 transition-colors disabled:opacity-60"
                  >
                    <CircleX size={22} aria-hidden="true" />No asistiré
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE JUSTIFICACIÓN (solo equipo interno) */}
      {showModal && (
        <Modal
          titulo="Justificar Inasistencia"
          descripcion="Cuéntanos el motivo de tu inasistencia."
          corto
          pie={<>
            <BotonSecundario onClick={() => setShowModal(false)} disabled={guardando}>Cancelar</BotonSecundario>
            <button
              type="button"
              onClick={confirmarInasistencia}
              disabled={guardando}
              className="min-h-12 px-6 py-3 rounded-xl bg-pq-error hover:bg-pq-error/90 text-white font-semibold shadow-lg shadow-pq-error/25 transition-colors disabled:opacity-60"
            >
              {guardando ? 'Guardando...' : 'Confirmar Inasistencia'}
            </button>
          </>}
        >
          <div className="flex flex-col gap-5">
            <div>
              <label htmlFor="motivo" className={labelClass}>Motivo Principal</label>
              <select id="motivo" value={justificationType} onChange={e => setJustificationType(e.target.value)} className={inputClass}>
                <option value="Salud">Salud (Enfermedad/Cita médica)</option>
                <option value="Trabajo/Estudio">Cruce con Trabajo / Estudios</option>
                <option value="Problema Familiar">Urgencia Familiar</option>
                <option value="Cruce de Horarios">Cruce con otra actividad de Puriqay</option>
                <option value="Otro">Otro motivo</option>
              </select>
            </div>
            <div>
              <label htmlFor="detalle" className={labelClass}>Detalle <span className="text-pq-error">*</span></label>
              <textarea id="detalle" value={justificationText} onChange={e => setJustificationText(e.target.value)} rows={3} placeholder="Explica brevemente..." className={`${inputClass} resize-none`} />
              <p className="text-xs text-pq-ink-muted mt-1">Mínimo {MIN_JUSTIFICATION_CHARS} caracteres.</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
