import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, MapPin, UserSquare2, Activity, ChevronDown, ChevronUp, FileText, Pencil, Trash2, Lock } from 'lucide-react';
import { getActionLineColor } from '../lib/catalogs';
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

export default function Jornadas() {
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Cuántas asistencias tiene cada jornada. Con asistencias, la jornada no se borra
  // y su fecha, horario y horas válidas no cambian (la base lo impide igual).
  const [asistenciasPorJornada, setAsistenciasPorJornada] = useState<Record<string, number>>({});

  // La descripción de cada jornada se muestra solo al hacer clic, para que la lista
  // se mantenga compacta.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggleExpand = (id: string) => setExpandedId(prev => (prev === id ? null : id));

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

  const inputClass = "w-full px-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:bg-white focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none transition-all font-medium text-pq-ink disabled:opacity-60 disabled:cursor-not-allowed";
  const labelClass = "block text-sm font-bold text-pq-teal-dark mb-2";

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
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={labelClass}>Nombre de la Jornada <span className="text-red-500">*</span></label>
            <input type="text" name="name" required value={form.name} onChange={onChange} className={inputClass} placeholder="Ej: Limpieza de Verano" />
          </div>
          <div>
            <label className={labelClass}>Lugar del Voluntariado <span className="text-red-500">*</span></label>
            <select name="location_id" required value={form.location_id} onChange={onChange} className={inputClass}>
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
              <p className="mt-2 text-xs font-medium text-pq-ink/60 flex items-center gap-1.5">
                Línea de acción:
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border flex items-center gap-1 ${getActionLineColor(selectedLocation.action_line)}`}>
                  <Activity size={10}/> {selectedLocation.action_line}
                </span>
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Responsable (Interno) <span className="text-red-500">*</span></label>
            <select name="coordinator_id" required value={form.coordinator_id} onChange={onChange} className={inputClass}>
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
          <p className="text-xs font-bold text-pq-marku flex items-center gap-1.5">
            <Lock size={14} /> Esta jornada ya tiene asistencias registradas: la fecha, el horario y las horas válidas no se pueden cambiar.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className={labelClass}>Fecha <span className="text-red-500">*</span></label>
            <input type="date" name="date" required disabled={bloqueado} min={actual ? undefined : todayInLima()} value={form.date} onChange={onChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Hora Inicio <span className="text-red-500">*</span></label>
            <input type="time" name="start_time" required disabled={bloqueado} value={form.start_time} onChange={onChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Hora Fin <span className="text-red-500">*</span></label>
            <input type="time" name="end_time" required disabled={bloqueado} value={form.end_time} onChange={onChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Horas Válidas <span className="text-red-500">*</span></label>
            <input type="number" step="0.5" min="0.5" name="valid_hours" required disabled={bloqueado} value={form.valid_hours} onChange={onChange} className={inputClass} placeholder="Ej: 3" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div>
            <label className={labelClass}>Tipo de Actividad <span className="text-red-500">*</span></label>
            <select name="type" required value={form.type} onChange={onChange} className={inputClass}>
              <option value="Jornada de Campo">Jornada de Campo</option>
              <option value="Taller / Charla">Taller / Charla</option>
              <option value="Reunión Virtual">Reunión Virtual</option>
              <option value="Capacitación">Capacitación</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Descripción de Actividades <span className="text-red-500">*</span></label>
            <textarea name="description" required value={form.description} onChange={onChange} rows={1} className={`${inputClass} resize-none`} placeholder="¿Qué se hará exactamente?"></textarea>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-8">
      {loadError && <LoadError message={loadError} onRetry={fetchData} />}

      {/* FORMULARIO DE CREACIÓN */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-pq-cream-dark shadow-sm">
        <h2 className="text-2xl font-black text-pq-teal-deep mb-6 flex items-center gap-2">
          Programar Nueva Jornada <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {campos(formData, handleChange)}

          <div className="flex justify-end mt-6 pt-4 border-t-2 border-dashed border-pq-cream-dark">
            <button type="submit" disabled={loading || locations.length === 0} className="bg-pq-teal hover:bg-pq-teal-dark text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-pq-teal/30 hover:-translate-y-0.5 transition-all duration-200">
              {loading ? 'Guardando...' : 'Crear Jornada'}
            </button>
          </div>
        </form>
      </div>

      {/* LISTA DE JORNADAS */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-pq-cream-dark shadow-sm">
        <h2 className="text-2xl font-black text-pq-teal-deep mb-6 flex items-center gap-2">
          Jornadas Programadas <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
        </h2>

        {fetching ? (
          <div className="flex justify-center p-10"><p className="text-pq-teal-dark font-bold animate-pulse">Cargando jornadas...</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {jornadas.map((jor) => {
              const nAsistencias = asistenciasPorJornada[jor.id] || 0;

              return (
              <div key={jor.id} className="border-2 border-pq-cream-dark rounded-2xl p-5 flex flex-col xl:flex-row gap-5 justify-between items-start xl:items-center bg-white hover:border-pq-teal/40 hover:shadow-md transition-all">

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="bg-pq-teal/10 text-pq-teal-dark text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-pq-teal/20 flex items-center gap-1">
                      <Activity size={12}/> {jor.type}
                    </span>
                    {jor.locations?.action_line && (
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border flex items-center gap-1 ${getActionLineColor(jor.locations.action_line)}`}>
                        {jor.locations.action_line}
                      </span>
                    )}
                    <h3 className="font-black text-xl text-pq-teal-deep">{jor.name}</h3>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-pq-ink/80 font-medium">
                    <span className="bg-pq-cream/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-pq-cream-dark/50">
                      <MapPin size={16} className="text-pq-teal-dark"/>
                      {jor.locations?.name} <span className="text-xs text-pq-ink/50 ml-1">({jor.locations?.district})</span>
                      {jor.locations?.status === 'ARCHIVADO' && <span className="text-[10px] font-black uppercase text-pq-ink/50 ml-1">archivado</span>}
                    </span>
                    <span className="bg-pq-cream/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-pq-cream-dark/50">
                      <UserSquare2 size={16} className="text-pq-teal-dark"/>
                      {jor.coordinador ? `${jor.coordinador.first_name} ${jor.coordinador.last_name}` : 'Sin asignar'}
                    </span>
                    {nAsistencias > 0 && (
                      <span className="bg-pq-marku/10 text-pq-ink/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-pq-marku/30">
                        {nAsistencias} asistencia(s)
                      </span>
                    )}
                  </div>

                  {jor.description && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleExpand(jor.id)}
                        className="flex items-center gap-1.5 mt-3 text-xs font-black text-pq-teal-dark uppercase tracking-wider hover:text-pq-teal transition-colors"
                      >
                        <FileText size={14} />
                        {expandedId === jor.id ? 'Ocultar actividades' : 'Ver actividades'}
                        {expandedId === jor.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {expandedId === jor.id && (
                        <p className="mt-2 text-sm text-pq-ink/70 font-medium bg-pq-cream/30 p-3 rounded-xl border border-pq-cream-dark/50">
                          {jor.description}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full xl:w-auto">
                  <div className="flex flex-wrap gap-4 text-sm bg-pq-cream/30 p-3 rounded-xl border border-pq-cream-dark flex-1 xl:flex-none">
                    <div>
                      <p className="text-xs font-bold text-pq-teal-dark uppercase tracking-wider mb-0.5 flex items-center gap-1"><Calendar size={14}/> Fecha</p>
                      <p className="font-black text-pq-teal-deep">{jor.date.split('-').reverse().join('/')}</p>
                    </div>
                    <div className="border-l-2 border-pq-cream-dark pl-4">
                      <p className="text-xs font-bold text-pq-teal-dark uppercase tracking-wider mb-0.5 flex items-center gap-1"><Clock size={14}/> Horario</p>
                      <p className="font-black text-pq-teal-deep">{jor.start_time.slice(0,5)} - {jor.end_time.slice(0,5)}</p>
                    </div>
                    <div className="border-l-2 border-pq-cream-dark pl-4 pr-2">
                      <p className="text-xs font-bold text-pq-teal-dark uppercase tracking-wider mb-0.5">Horas</p>
                      <p className="font-black text-pq-marku text-lg leading-none">{jor.valid_hours}h</p>
                    </div>
                  </div>
                  <div className="flex xl:flex-col gap-2">
                    <button type="button" onClick={() => openEdit(jor)} title="Editar jornada" className="text-pq-teal-dark hover:text-pq-teal transition-colors p-1">
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBorrando(jor)}
                      disabled={nAsistencias > 0}
                      title={nAsistencias > 0 ? 'Tiene asistencias registradas: no se puede borrar' : 'Borrar jornada'}
                      className="text-red-600 hover:text-red-700 transition-colors p-1 disabled:text-pq-ink/25 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

              </div>
              );
            })}

            {jornadas.length === 0 && (
              <div className="text-center p-10 bg-pq-cream/50 rounded-2xl border-2 border-dashed border-pq-cream-dark">
                <p className="text-pq-teal-dark font-medium">Aún no hay jornadas registradas.</p>
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* MODAL DE EDICIÓN DE JORNADA */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pq-ink/60 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-8 border border-pq-cream-dark my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-pq-teal-deep mb-6 flex items-center gap-2">
              Editar Jornada <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
            </h3>

            <form onSubmit={handleUpdate} className="space-y-5">
              {campos(editForm, handleEditChange, { actual: editing, bloqueado: (asistenciasPorJornada[editing.id] || 0) > 0 })}

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t-2 border-dashed border-pq-cream-dark">
                <button type="button" onClick={() => setEditing(null)} className="px-5 py-2.5 text-pq-ink/70 font-bold hover:bg-pq-cream rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={savingEdit} className="px-5 py-2.5 bg-pq-teal text-white font-bold rounded-xl hover:bg-pq-teal-dark shadow-lg shadow-pq-teal/30 transition-all">
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
