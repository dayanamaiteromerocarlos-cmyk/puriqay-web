import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Pencil, Trash2, Lock, EllipsisVertical, Eye, Plus } from 'lucide-react';
import { ChipLinea, EncabezadoPagina, ImagenJornada, Modal, BotonPrimario, BotonSecundario, inputClass, labelClass } from './JornadaUI';
import { estadoJornada, fechaCorta, horario, type EstadoJornada } from '../lib/jornadas';
import LoadError from './LoadError';
import ConfirmDialog from './ConfirmDialog';
import toast from 'react-hot-toast';
import { todayInLima } from '../lib/dates';
import { fetchNombres } from '../lib/permisos';
import { esBorradoBloqueado } from '../lib/dbErrors';

type JornadaForm = {
  name: string;
  location_id: string;
  coordinator_id: string;
  date: string;
  start_time: string;
  end_time: string;
  valid_hours: string;
  type: string;
  description: string;
};

const emptyForm: JornadaForm = {
  name: '',
  location_id: '',
  coordinator_id: '',
  date: '',
  start_time: '',
  end_time: '',
  valid_hours: '',
  type: 'Jornada de Campo',
  description: ''
};

const ESTILO_ESTADO: Record<EstadoJornada, string> = {
  'Hoy': 'bg-pq-teal text-white',
  'Próxima': 'bg-pq-marku-50 text-pq-marku-ink',
  'Pasada': 'bg-pq-cream text-pq-ink-muted border border-pq-cream-dark',
};

// Orden de las tarjetas: las de hoy, luego las próximas (la más cercana primero) y
// al final las pasadas (la más reciente primero).
const ORDEN_ESTADO: Record<EstadoJornada, number> = { 'Hoy': 0, 'Próxima': 1, 'Pasada': 2 };
const ordenarJornadas = (lista: any[], hoy: string) => [...lista].sort((a, b) => {
  const ea = estadoJornada(a.date, hoy), eb = estadoJornada(b.date, hoy);
  if (ea !== eb) return ORDEN_ESTADO[ea] - ORDEN_ESTADO[eb];
  const porFecha = `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`);
  return ea === 'Pasada' ? -porFecha : porFecha;
});

export default function Jornadas({ onVerDetalle }: { onVerDetalle: (jornadaId: string) => void }) {
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Cuántas asistencias tiene cada jornada. Con asistencias, la jornada no se borra
  // y su fecha, horario y horas válidas no cambian (la base lo impide igual).
  const [asistenciasPorJornada, setAsistenciasPorJornada] = useState<Record<string, number>>({});

  // Menú ⋮ abierto (id de la jornada).
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

  // Alta de una jornada nueva (modal "Programar Nueva Jornada").
  const [creando, setCreando] = useState(false);
  const [formData, setFormData] = useState<JornadaForm>(emptyForm);

  // Edición de una jornada ya programada.
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<JornadaForm>(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);

  // Jornada a borrar (pendiente de confirmación).
  const [borrando, setBorrando] = useState<any | null>(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadError(null);

    const { data: locData, error: locError } = await supabase
      .from('locations')
      .select('id, name, district, action_line')
      .eq('status', 'ACTIVO');
    if (locData) setLocations(locData);

    // Nombres del equipo interno: salen de `perfiles_basicos`, no de `profiles` (que
    // solo muestra a cada quien su propio perfil, salvo a Gestión Humana).
    const { data: coordData, error: coordError } = await supabase
      .from('perfiles_basicos')
      .select('id, first_name, last_name')
      .in('role', ['ADMIN', 'COORDINADOR'])
      .eq('is_active', true);
    if (coordData) setCoordinators(coordData);

    const { data: jorData, error: jorError } = await supabase
      .from('jornadas')
      .select('*, locations(name, district, action_line, status)')
      .order('date', { ascending: false });

    const { nombres, error: nombresError } = await fetchNombres((jorData || []).map(j => j.coordinator_id));
    if (jorData) setJornadas(jorData.map(j => ({ ...j, coordinador: nombres[j.coordinator_id] || null })));

    const { data: asisData, error: asisError } = await supabase.from('asistencias').select('jornada_id');
    const conteo: Record<string, number> = {};
    (asisData || []).forEach(a => { conteo[a.jornada_id] = (conteo[a.jornada_id] || 0) + 1; });
    setAsistenciasPorJornada(conteo);

    // Si alguna consulta falló, se avisa: los desplegables vacíos y la lista vacía
    // parecerían "no hay datos" cuando en realidad fue un error de red o de permisos.
    const failure = locError || coordError || jorError || nombresError || asisError;
    if (failure) setLoadError(failure.message);
    setFetching(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // Validaciones de sentido común. Son del lado del cliente (se pueden saltar): la
  // regla definitiva, si se quiere, es un CHECK en la base (ver PENDIENTES del backend).
  // Al editar, una fecha pasada solo se rechaza si se cambió.
  const validar = (form: JornadaForm, fechaOriginal?: string) => {
    const horasValidas = parseFloat(form.valid_hours);
    if (form.date !== fechaOriginal && form.date < todayInLima()) {
      toast.error('La fecha de la jornada no puede ser anterior a hoy.');
      return null;
    }
    if (form.end_time.slice(0, 5) <= form.start_time.slice(0, 5)) {
      toast.error('La hora de fin debe ser posterior a la hora de inicio.');
      return null;
    }
    if (!Number.isFinite(horasValidas) || horasValidas <= 0) {
      toast.error('Las horas válidas deben ser mayores que 0.');
      return null;
    }
    return horasValidas;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const horasValidas = validar(formData);
    if (horasValidas === null) return;

    setLoading(true);

    const { error } = await supabase
      .from('jornadas')
      .insert([{
        name: formData.name,
        location_id: formData.location_id,
        coordinator_id: formData.coordinator_id,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        valid_hours: horasValidas,
        type: formData.type,
        description: formData.description
      }]);

    if (error) {
      toast.error('Error al crear la jornada: ' + error.message);
    } else {
      toast.success('¡Jornada programada con éxito!');
      setFormData({ ...emptyForm, type: formData.type });
      setCreando(false);
      fetchData();
    }
    setLoading(false);
  };

  const openEdit = (jor: any) => {
    setEditing(jor);
    setEditForm({
      name: jor.name || '',
      location_id: jor.location_id || '',
      coordinator_id: jor.coordinator_id || '',
      date: jor.date || '',
      start_time: (jor.start_time || '').slice(0, 5),
      end_time: (jor.end_time || '').slice(0, 5),
      valid_hours: String(jor.valid_hours ?? ''),
      type: jor.type || 'Jornada de Campo',
      description: jor.description || ''
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const conAsistencias = (asistenciasPorJornada[editing.id] || 0) > 0;
    const horasValidas = validar(editForm, editing.date);
    if (horasValidas === null) return;

    setSavingEdit(true);

    // Con asistencias no se envían fecha, horario ni horas: no pueden cambiar.
    const cambios: Record<string, unknown> = {
      name: editForm.name,
      location_id: editForm.location_id,
      coordinator_id: editForm.coordinator_id,
      type: editForm.type,
      description: editForm.description,
      ...(conAsistencias ? {} : {
        date: editForm.date,
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        valid_hours: horasValidas
      })
    };

    const { data, error } = await supabase
      .from('jornadas')
      .update(cambios)
      .eq('id', editing.id)
      .select('id');

    if (error) {
      toast.error('No se pudo guardar: ' + error.message);
    } else if (!data || data.length === 0) {
      // RLS: PostgREST responde OK con 0 filas cuando no hay permiso.
      toast.error('No tienes permiso para editar esta jornada.');
    } else {
      toast.success('¡Jornada actualizada!');
      setEditing(null);
      fetchData();
    }
    setSavingEdit(false);
  };

  const confirmarBorrado = async () => {
    if (!borrando) return;
    setProcesando(true);

    const { data, error } = await supabase
      .from('jornadas')
      .delete()
      .eq('id', borrando.id)
      .select('id');

    if (error) {
      toast.error(esBorradoBloqueado(error)
        ? 'Esta jornada ya tiene asistencias registradas: no se puede borrar.'
        : 'No se pudo borrar: ' + error.message);
    } else if (!data || data.length === 0) {
      toast.error('No tienes permiso para borrar esta jornada.');
    } else {
      toast.success('Jornada borrada.');
      fetchData();
    }
    setProcesando(false);
    setBorrando(null);
  };

  // Etiqueta de un campo: asterisco si es obligatorio; candado si está bloqueado.
  const etiqueta = (htmlFor: string, texto: string, bloqueado = false) => (
    <label htmlFor={htmlFor} className={labelClass}>
      {texto} {bloqueado ? <Lock size={14} aria-label="bloqueado" /> : <span className="text-pq-error">*</span>}
    </label>
  );

  // Campos del formulario, compartidos por el alta y la edición.
  // `actual`: la jornada que se edita (su lugar o responsable pueden no estar en las
  // listas si el lugar se archivó o la persona quedó inactiva; se ofrecen igual).
  // `bloqueado`: fecha, horario y horas no editables (la jornada tiene asistencias).
  const campos = (
    form: JornadaForm,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void,
    { actual, bloqueado = false }: { actual?: any; bloqueado?: boolean } = {}
  ) => {
    // La línea de acción no se elige a mano: la hereda el lugar del voluntariado,
    // para que no se pueda marcar "Ambiental" en un albergue animalista.
    const selectedLocation = locations.find(l => l.id === form.location_id)
      ?? (actual && actual.location_id === form.location_id ? actual.locations : null);
    const lugarActualFueraDeLista = actual?.location_id && !locations.some(l => l.id === actual.location_id);
    const responsableFueraDeLista = actual?.coordinator_id && !coordinators.some(c => c.id === actual.coordinator_id);

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-5">
          <div className="flex-[1_1_220px] min-w-0">
            {etiqueta('j-nombre', 'Nombre de la Jornada')}
            <input id="j-nombre" type="text" name="name" required value={form.name} onChange={onChange} className={inputClass} placeholder="Ej: Limpieza de Verano" />
          </div>
          <div className="flex-[1_1_220px] min-w-0">
            {etiqueta('j-lugar', 'Lugar del Voluntariado')}
            <select id="j-lugar" name="location_id" required value={form.location_id} onChange={onChange} className={inputClass}>
              <option value="">-- Selecciona un Lugar Aliado --</option>
              {lugarActualFueraDeLista && (
                <option value={actual.location_id}>
                  {actual.locations?.name} ({actual.locations?.district}){actual.locations?.status === 'ARCHIVADO' ? ' — archivado' : ''}
                </option>
              )}
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name} ({loc.district})</option>
              ))}
            </select>
            {selectedLocation && (
              <p className="mt-2 text-xs font-medium text-pq-ink-muted flex items-center gap-1.5">
                Línea de acción: <ChipLinea linea={selectedLocation.action_line} />
              </p>
            )}
          </div>
          <div className="flex-[1_1_220px] min-w-0">
            {etiqueta('j-responsable', 'Responsable (Interno)')}
            <select id="j-responsable" name="coordinator_id" required value={form.coordinator_id} onChange={onChange} className={inputClass}>
              <option value="">-- Selecciona Responsable --</option>
              {responsableFueraDeLista && (
                <option value={actual.coordinator_id}>
                  {actual.coordinador ? `${actual.coordinador.first_name} ${actual.coordinador.last_name}` : 'Responsable actual'} — no disponible
                </option>
              )}
              {coordinators.map(coord => (
                <option key={coord.id} value={coord.id}>{coord.first_name} {coord.last_name}</option>
              ))}
            </select>
          </div>
        </div>

        {bloqueado && (
          <p className="px-3.5 py-3 rounded-xl bg-pq-marku-50 text-pq-marku-ink text-[13px] font-semibold flex items-start gap-2">
            <Lock size={16} className="shrink-0 mt-0.5" aria-hidden="true" /> Esta jornada ya tiene asistencias registradas: la fecha, el horario y las horas válidas no se pueden cambiar.
          </p>
        )}

        <div className="flex flex-wrap gap-5">
          <div className="flex-[1_1_150px] min-w-0">
            {etiqueta('j-fecha', 'Fecha', bloqueado)}
            <input id="j-fecha" type="date" name="date" required disabled={bloqueado} min={actual ? undefined : todayInLima()} value={form.date} onChange={onChange} className={inputClass} />
          </div>
          <div className="flex-[1_1_150px] min-w-0">
            {etiqueta('j-inicio', 'Hora Inicio', bloqueado)}
            <input id="j-inicio" type="time" name="start_time" required disabled={bloqueado} value={form.start_time} onChange={onChange} className={inputClass} />
          </div>
          <div className="flex-[1_1_150px] min-w-0">
            {etiqueta('j-fin', 'Hora Fin', bloqueado)}
            <input id="j-fin" type="time" name="end_time" required disabled={bloqueado} value={form.end_time} onChange={onChange} className={inputClass} />
          </div>
          <div className="flex-[1_1_150px] min-w-0">
            {etiqueta('j-horas', 'Horas Válidas', bloqueado)}
            <input id="j-horas" type="number" step="0.5" min="0.5" name="valid_hours" required disabled={bloqueado} value={form.valid_hours} onChange={onChange} className={inputClass} placeholder="Ej: 3" />
          </div>
        </div>

        <div className="flex flex-wrap gap-5">
          <div className="flex-[1_1_220px] min-w-0">
            {etiqueta('j-tipo', 'Tipo de Actividad')}
            <select id="j-tipo" name="type" required value={form.type} onChange={onChange} className={inputClass}>
              <option value="Jornada de Campo">Jornada de Campo</option>
              <option value="Taller / Charla">Taller / Charla</option>
              <option value="Reunión Virtual">Reunión Virtual</option>
              <option value="Capacitación">Capacitación</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div className="flex-[2_1_340px] min-w-0">
            {etiqueta('j-descripcion', 'Descripción de Actividades')}
            <textarea id="j-descripcion" name="description" required value={form.description} onChange={onChange} rows={3} className={`${inputClass} resize-none`} placeholder="¿Qué se hará exactamente?"></textarea>
          </div>
        </div>
      </div>
    );
  };

  const hoy = todayInLima();

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <EncabezadoPagina titulo="Gestión de Jornadas" descripcion="Programa, edita y revisa las jornadas de voluntariado." />

      {loadError && <LoadError message={loadError} onRetry={fetchData} />}

      {fetching ? (
        <div className="flex justify-center p-10"><p className="text-pq-teal-dark font-bold animate-pulse">Cargando jornadas...</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          <button
            type="button"
            onClick={() => setCreando(true)}
            disabled={locations.length === 0}
            title={locations.length === 0 ? 'Primero registra un lugar activo' : ''}
            className="min-h-[200px] sm:min-h-[360px] p-6 border-2 border-dashed border-pq-border rounded-[20px] bg-pq-teal-50/50 hover:bg-pq-teal-50 transition-colors flex flex-col items-center justify-center gap-3 text-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="w-14 h-14 rounded-full bg-pq-teal text-white flex items-center justify-center"><Plus size={28} aria-hidden="true" /></span>
            <span className="font-display text-xl font-bold text-pq-teal-deep">Crear nueva jornada</span>
            <span className="text-sm text-pq-ink-muted">Programa un nuevo evento para la comunidad.</span>
          </button>

          {ordenarJornadas(jornadas, hoy).map((jor) => {
            const nAsistencias = asistenciasPorJornada[jor.id] || 0;
            const estado = estadoJornada(jor.date, hoy);
            const abierto = menuAbierto === jor.id;

            return (
              <article key={jor.id} className="flex flex-col p-3 rounded-[20px] bg-white shadow-pq-card">
                <ImagenJornada alto="h-[150px]" />
                <div className="flex flex-col gap-2.5 px-1.5 pt-3.5 pb-1">
                  <div className="relative flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-[0.04em] ${ESTILO_ESTADO[estado]}`}>{estado}</span>
                    <ChipLinea linea={jor.locations?.action_line} />
                    <button
                      type="button"
                      onClick={() => setMenuAbierto(abierto ? null : jor.id)}
                      aria-label="Opciones de la jornada"
                      aria-haspopup="menu"
                      aria-expanded={abierto}
                      className={`ml-auto w-11 h-11 rounded-xl text-pq-teal-deep flex items-center justify-center transition-colors ${abierto ? 'bg-pq-teal-50' : 'hover:bg-pq-teal-50'}`}
                    >
                      <EllipsisVertical size={20} />
                    </button>
                    {abierto && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(null)} aria-hidden="true" />
                        <div role="menu" className="absolute top-12 right-0 z-20 w-48 p-1.5 rounded-xl bg-white border border-pq-cream-dark shadow-[0_8px_24px_rgba(31,43,42,0.16)] flex flex-col">
                          <button type="button" role="menuitem" onClick={() => { setMenuAbierto(null); onVerDetalle(jor.id); }} className="flex items-center gap-2.5 min-h-11 px-3 rounded-lg text-sm font-medium text-pq-ink hover:bg-pq-cream text-left">
                            <Eye size={18} aria-hidden="true" />Ver detalle
                          </button>
                          <button type="button" role="menuitem" onClick={() => { setMenuAbierto(null); openEdit(jor); }} className="flex items-center gap-2.5 min-h-11 px-3 rounded-lg text-sm font-medium text-pq-ink hover:bg-pq-cream text-left">
                            <Pencil size={18} aria-hidden="true" />Editar
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { setMenuAbierto(null); setBorrando(jor); }}
                            disabled={nAsistencias > 0}
                            title={nAsistencias > 0 ? 'Tiene asistencias registradas: no se puede borrar' : ''}
                            className="flex items-center gap-2.5 min-h-11 px-3 rounded-lg text-sm font-medium text-pq-error hover:bg-pq-error-50 text-left disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <Trash2 size={18} aria-hidden="true" />Borrar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <h3 className="text-[19px] font-bold leading-snug text-pq-ink">{jor.name}</h3>
                  <span className="flex items-center gap-1.5 text-sm text-pq-ink-muted">
                    <MapPin size={16} className="shrink-0" aria-hidden="true" />
                    {jor.locations?.name}, {jor.locations?.district}
                    {jor.locations?.status === 'ARCHIVADO' && <span className="text-[10px] font-bold uppercase">(archivado)</span>}
                  </span>
                  <div className="flex mt-1 border border-pq-cream-dark rounded-xl">
                    <div className="flex-1 px-3 py-2.5 flex flex-col gap-0.5">
                      <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-pq-ink-muted">Fecha</span>
                      <span className="text-sm font-semibold">{fechaCorta(jor.date)}</span>
                    </div>
                    <div className="w-px bg-pq-cream-dark" />
                    <div className="flex-1 px-3 py-2.5 flex flex-col gap-0.5">
                      <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-pq-ink-muted">Horario</span>
                      <span className="text-sm font-semibold">{horario(jor)}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!fetching && jornadas.length === 0 && (
        <p className="text-center text-pq-ink-muted">Aún no hay jornadas registradas.</p>
      )}

      {/* CONFIRMAR BORRADO */}
      {borrando && (
        <ConfirmDialog
          title="Borrar jornada"
          confirmLabel="Borrar"
          danger
          busy={procesando}
          onConfirm={confirmarBorrado}
          onCancel={() => setBorrando(null)}
        >
          <p>¿Borrar definitivamente <strong>{borrando.name}</strong> ({borrando.date.split('-').reverse().join('/')})?</p>
          <p>También se borrarán las inscripciones de los voluntarios a esta jornada. No se puede deshacer.</p>
        </ConfirmDialog>
      )}

      {/* MODAL DE ALTA */}
      {creando && (
        <form onSubmit={handleSubmit}>
          <Modal
            titulo="Programar Nueva Jornada"
            descripcion={<>Completa los datos; los campos con <span className="text-pq-error">*</span> son obligatorios.</>}
            onCerrar={() => setCreando(false)}
            ancho="max-w-[860px]"
            pie={<>
              <BotonSecundario onClick={() => setCreando(false)} disabled={loading}>Cancelar</BotonSecundario>
              <BotonPrimario type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Crear Jornada'}</BotonPrimario>
            </>}
          >
            {campos(formData, handleChange)}
          </Modal>
        </form>
      )}

      {/* MODAL DE EDICIÓN */}
      {editing && (
        <form onSubmit={handleUpdate}>
          <Modal
            titulo="Editar Jornada"
            descripcion={<>Completa los datos; los campos con <span className="text-pq-error">*</span> son obligatorios.</>}
            onCerrar={() => setEditing(null)}
            ancho="max-w-[860px]"
            pie={<>
              <BotonSecundario onClick={() => setEditing(null)} disabled={savingEdit}>Cancelar</BotonSecundario>
              <BotonPrimario type="submit" disabled={savingEdit}>{savingEdit ? 'Guardando...' : 'Guardar Cambios'}</BotonPrimario>
            </>}
          >
            {campos(editForm, handleEditChange, { actual: editing, bloqueado: (asistenciasPorJornada[editing.id] || 0) > 0 })}
          </Modal>
        </form>
      )}
    </div>
  );
}
