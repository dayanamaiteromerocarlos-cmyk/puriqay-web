import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Phone, User, Map, Info, Activity, ChevronDown, ChevronUp, Pencil, Home, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DISTRITOS_LIMA, DISTRITOS_CALLAO, ACTION_LINES, getActionLineColor } from '../lib/catalogs';
import { PATTERNS, TITLES } from '../lib/validations';
import { esBorradoBloqueado } from '../lib/dbErrors';
import ConfirmDialog from './ConfirmDialog';

type Location = {
  id: string;
  name: string;
  action_line: string;
  district: string;
  address: string;
  manager_name: string;
  contact_phone: string;
  maps_link: string;
  meeting_point: string;
  special_instructions: string;
  status: string;
};

const emptyForm = {
  name: '',
  action_line: 'Animalista',
  manager_name: '',
  contact_phone: '',
  address: '',
  district: '',
  maps_link: '',
  meeting_point: '',
  special_instructions: '',
  status: 'ACTIVO'
};

type Accion = { tipo: 'archivar' | 'restaurar' | 'borrar'; loc: Location };

// `archivaLugares`: puede archivar, restaurar y borrar (ADMIN de Gerencia General,
// TI o Proyectos). La base aplica la misma regla; esto solo decide qué botones ver.
export default function Locations({ archivaLugares = false }: { archivaLugares?: boolean }) {
  const [locations, setLocations] = useState<Location[]>([]);
  // Cuántas jornadas tiene cada lugar: un lugar con jornadas no se borra, se archiva.
  const [jornadasPorLugar, setJornadasPorLugar] = useState<Record<string, number>>({});
  const [verArchivados, setVerArchivados] = useState(false);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState(emptyForm);

  // Tarjetas minimalistas: la dirección, el punto de encuentro y las indicaciones
  // especiales quedan ocultas hasta que se hace clic en "Ver detalles".
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Edición de un lugar ya registrado (la directora puede corregir los datos).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLocations(data);
    }

    const { data: jorData } = await supabase.from('jornadas').select('location_id');
    const conteo: Record<string, number> = {};
    (jorData || []).forEach(j => { if (j.location_id) conteo[j.location_id] = (conteo[j.location_id] || 0) + 1; });
    setJornadasPorLugar(conteo);

    setFetching(false);
  };

  const confirmarAccion = async () => {
    if (!accion) return;
    const { tipo, loc } = accion;
    setProcesando(true);

    const { data, error } = tipo === 'borrar'
      ? await supabase.from('locations').delete().eq('id', loc.id).select('id')
      : await supabase.from('locations').update({ status: tipo === 'archivar' ? 'ARCHIVADO' : 'ACTIVO' }).eq('id', loc.id).select('id');

    if (error) {
      toast.error(esBorradoBloqueado(error)
        ? `"${loc.name}" tiene jornadas registradas: archívalo en vez de borrarlo.`
        : 'No se pudo completar la acción: ' + error.message);
    } else if (!data || data.length === 0) {
      // RLS: PostgREST responde OK con 0 filas cuando no hay permiso.
      toast.error('No tienes permiso para esta acción.');
    } else {
      toast.success(tipo === 'borrar' ? 'Lugar borrado.' : tipo === 'archivar' ? 'Lugar archivado.' : 'Lugar restaurado.');
      fetchLocations();
    }
    setProcesando(false);
    setAccion(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const openEdit = (loc: Location) => {
    setEditingId(loc.id);
    setEditForm({
      name: loc.name || '',
      action_line: loc.action_line || 'Animalista',
      manager_name: loc.manager_name || '',
      contact_phone: loc.contact_phone || '',
      address: loc.address || '',
      district: loc.district || '',
      maps_link: loc.maps_link || '',
      meeting_point: loc.meeting_point || '',
      special_instructions: loc.special_instructions || '',
      status: loc.status || 'ACTIVO',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);

    const { data, error } = await supabase
      .from('locations')
      .update(editForm)
      .eq('id', editingId)
      .select('id'); // .select() nos devuelve las filas realmente afectadas

    if (error) {
      toast.error('Error al actualizar el lugar: ' + error.message);
    } else if (!data || data.length === 0) {
      // Si RLS bloquea el UPDATE, PostgREST responde OK con 0 filas y sin error.
      toast.error('No se pudo actualizar: la base de datos no modificó ninguna fila. Revisa las políticas RLS de la tabla locations en Supabase.');
    } else {
      toast.success('¡Lugar actualizado!');
      setEditingId(null);
      fetchLocations();
    }
    setSavingEdit(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('locations').insert([formData]);

    if (error) {
      toast.error('Error al registrar el lugar: ' + error.message);
    } else {
      toast.success('¡Lugar registrado con éxito!');
      setFormData(emptyForm);
      fetchLocations();
    }
    setLoading(false);
  };

  const visibles = locations.filter(l => (l.status === 'ARCHIVADO') === verArchivados);

  const inputClass = "w-full px-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:bg-white focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none transition-all font-medium text-pq-ink";
  const labelClass = "block text-sm font-bold text-pq-teal-dark mb-2";

  // Selector de distrito reutilizado por el formulario de alta y el de edición.
  const DistrictSelect = ({ value, onChange }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <select name="district" required value={value} onChange={onChange} className={inputClass}>
      <option value="">-- Selecciona un distrito --</option>
      <optgroup label="Lima Metropolitana">
        {DISTRITOS_LIMA.map(d => <option key={d} value={d}>{d}</option>)}
      </optgroup>
      <optgroup label="Callao">
        {DISTRITOS_CALLAO.map(d => <option key={d} value={d}>{d}</option>)}
      </optgroup>
    </select>
  );

  const ActionLineSelect = ({ value, onChange }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <select name="action_line" required value={value} onChange={onChange} className={inputClass}>
      {ACTION_LINES.map(l => <option key={l} value={l}>{l}</option>)}
    </select>
  );

  return (
    <div className="space-y-8">

      {/* FORMULARIO DE CREACIÓN */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-pq-cream-dark shadow-sm">
        <h2 className="text-2xl font-black text-pq-teal-deep mb-6 flex items-center gap-2">
          Registrar Nuevo Lugar / Aliado <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className={labelClass}>Nombre del Lugar / Organización <span className="text-red-500">*</span></label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className={inputClass} placeholder="Ej: Albergue 4 Patas" />
            </div>
            <div>
              <label className={labelClass}>Línea de Acción <span className="text-red-500">*</span></label>
              <ActionLineSelect value={formData.action_line} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Encargado(a) <span className="text-red-500">*</span></label>
              <input type="text" name="manager_name" required pattern={PATTERNS.soloLetras} title={TITLES.soloLetras} value={formData.manager_name} onChange={handleChange} className={inputClass} placeholder="Nombre del contacto principal" />
            </div>
            <div>
              <label className={labelClass}>Teléfono de Contacto <span className="text-xs font-medium text-pq-ink/50">(9 números)</span> <span className="text-red-500">*</span></label>
              <input type="text" name="contact_phone" required maxLength={9} inputMode="numeric" pattern={PATTERNS.celular} title={TITLES.celular} value={formData.contact_phone} onChange={handleChange} className={inputClass} placeholder="Ej: 999888777" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className={labelClass}>Dirección Exacta <span className="text-red-500">*</span></label>
              <input type="text" name="address" required value={formData.address} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Distrito <span className="text-red-500">*</span></label>
              <DistrictSelect value={formData.district} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Punto de Encuentro <span className="text-red-500">*</span></label>
              <input type="text" name="meeting_point" required value={formData.meeting_point} onChange={handleChange} className={inputClass} placeholder="Ej: Puerta principal / Estación de tren" />
            </div>
            <div>
              <label className={labelClass}>Link de Google Maps <span className="text-red-500">*</span></label>
              <input type="url" name="maps_link" required value={formData.maps_link} onChange={handleChange} className={inputClass} placeholder="https://maps.app.goo.gl/..." />
            </div>
          </div>

          <div>
            <label className={labelClass}>Indicaciones Especiales <span className="text-red-500">*</span></label>
            <textarea name="special_instructions" required value={formData.special_instructions} onChange={handleChange} rows={2} className={`${inputClass} resize-none`} placeholder="Ej: Llevar botas de agua, tocar timbre rojo..."></textarea>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t-2 border-dashed border-pq-cream-dark">
            <button type="submit" disabled={loading} className="bg-pq-teal hover:bg-pq-teal-dark text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-pq-teal/30 hover:-translate-y-0.5 transition-all duration-200">
              {loading ? 'Guardando...' : 'Guardar Lugar'}
            </button>
          </div>
        </form>
      </div>

      {/* DIRECTORIO DE LUGARES */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-pq-cream-dark shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl font-black text-pq-teal-deep flex items-center gap-2">
            Directorio de Lugares Aliados <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
          </h2>
          <div className="flex bg-pq-cream/50 p-1 rounded-xl border border-pq-cream-dark text-sm font-bold">
            {[false, true].map(archivados => (
              <button
                key={String(archivados)}
                type="button"
                onClick={() => setVerArchivados(archivados)}
                className={`px-4 py-1.5 rounded-lg transition-colors ${verArchivados === archivados ? 'bg-white text-pq-teal-deep shadow-sm' : 'text-pq-ink/60 hover:text-pq-teal-dark'}`}
              >
                {archivados ? 'Archivados' : 'Activos'} ({locations.filter(l => (l.status === 'ARCHIVADO') === archivados).length})
              </button>
            ))}
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center p-10"><p className="text-pq-teal-dark font-bold animate-pulse">Cargando directorio...</p></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {visibles.map((loc) => {
              const isExpanded = expandedId === loc.id;
              const archivado = loc.status === 'ARCHIVADO';
              const nJornadas = jornadasPorLugar[loc.id] || 0;

              return (
                <div key={loc.id} className={`border-2 rounded-2xl p-5 transition-all flex flex-col group ${archivado ? 'bg-pq-cream/30' : 'bg-white'} ${
                  isExpanded ? 'border-pq-teal shadow-lg' : 'border-pq-cream-dark hover:border-pq-teal/40 hover:shadow-lg'
                }`}>

                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border flex items-center gap-1 ${getActionLineColor(loc.action_line)}`}>
                        <Activity size={12}/> {loc.action_line}
                      </span>
                      {archivado && (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-pq-ink/20 bg-pq-ink/5 text-pq-ink/60">Archivado</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openEdit(loc)} title="Editar lugar" className="text-pq-teal-dark hover:text-pq-teal transition-colors">
                        <Pencil size={16} />
                      </button>
                      {archivaLugares && (archivado ? (
                        <button type="button" onClick={() => setAccion({ tipo: 'restaurar', loc })} title="Restaurar lugar" className="text-pq-teal-dark hover:text-pq-teal transition-colors">
                          <ArchiveRestore size={16} />
                        </button>
                      ) : (
                        <button type="button" onClick={() => setAccion({ tipo: 'archivar', loc })} title="Archivar lugar" className="text-pq-teal-dark hover:text-pq-teal transition-colors">
                          <Archive size={16} />
                        </button>
                      ))}
                      {archivaLugares && (
                        <button
                          type="button"
                          onClick={() => setAccion({ tipo: 'borrar', loc })}
                          disabled={nJornadas > 0}
                          title={nJornadas > 0 ? `Tiene ${nJornadas} jornada(s): archívalo en vez de borrarlo` : 'Borrar lugar'}
                          className="text-red-600 hover:text-red-700 transition-colors disabled:text-pq-ink/25 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {loc.maps_link && (
                        <a href={loc.maps_link} target="_blank" rel="noreferrer" className="text-pq-teal-dark hover:text-pq-teal transition-colors" title="Ver en Maps">
                          <Map size={18} />
                        </a>
                      )}
                    </div>
                  </div>

                  <h3 className="font-black text-xl text-pq-teal-deep mb-1 leading-tight group-hover:text-pq-teal transition-colors">{loc.name}</h3>
                  <p className="text-sm text-pq-ink/70 font-medium flex items-center gap-1.5 mb-4">
                    <MapPin size={14} className="text-pq-teal-dark/60 min-w-[14px]"/> {loc.district}
                  </p>

                  <div className="space-y-2 bg-pq-cream/30 p-3 rounded-xl border border-pq-cream-dark/50">
                    <div className="flex items-center gap-2 text-sm text-pq-ink/80">
                      <User size={14} className="text-pq-teal-dark"/>
                      <span className="font-bold">{loc.manager_name || 'Sin encargado'}</span>
                    </div>
                    {loc.contact_phone && (
                      <div className="flex items-center gap-2 text-sm text-pq-ink/80">
                        <Phone size={14} className="text-pq-teal-dark"/>
                        <span className="font-medium">{loc.contact_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* DETALLES COLAPSABLES: dirección, punto de encuentro e indicaciones */}
                  {(loc.address || loc.meeting_point || loc.special_instructions) && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleExpand(loc.id)}
                        className="w-full flex items-center justify-between mt-3 pt-3 border-t-2 border-dashed border-pq-cream-dark text-xs font-black text-pq-teal-dark uppercase tracking-wider hover:text-pq-teal transition-colors"
                      >
                        {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          {loc.address && (
                            <p className="text-xs text-pq-ink/70 flex gap-1.5 items-start">
                              <Home size={12} className="text-pq-teal-dark mt-0.5 min-w-[12px]"/>
                              <span>{loc.address}</span>
                            </p>
                          )}
                          {loc.meeting_point && (
                            <p className="text-xs text-pq-ink/70 flex gap-1">
                              <span className="font-bold text-pq-teal-dark min-w-[50px]">Punto:</span> {loc.meeting_point}
                            </p>
                          )}
                          {loc.special_instructions && (
                            <p className="text-xs text-pq-ink/70 flex gap-1 items-start">
                              <Info size={12} className="text-pq-marku mt-0.5 min-w-[12px]"/>
                              <span className="italic">{loc.special_instructions}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {visibles.length === 0 && (
              <div className="col-span-full text-center p-10 bg-pq-cream/50 rounded-2xl border-2 border-dashed border-pq-cream-dark">
                <p className="text-pq-teal-dark font-medium">
                  {verArchivados ? 'No hay lugares archivados.' : 'No tienes lugares aliados registrados aún.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONFIRMAR ARCHIVAR / RESTAURAR / BORRAR */}
      {accion && (
        <ConfirmDialog
          title={accion.tipo === 'borrar' ? 'Borrar lugar' : accion.tipo === 'archivar' ? 'Archivar lugar' : 'Restaurar lugar'}
          confirmLabel={accion.tipo === 'borrar' ? 'Borrar' : accion.tipo === 'archivar' ? 'Archivar' : 'Restaurar'}
          danger={accion.tipo === 'borrar'}
          busy={procesando}
          onConfirm={confirmarAccion}
          onCancel={() => setAccion(null)}
        >
          {accion.tipo === 'borrar' && (
            <p>¿Borrar definitivamente <strong>{accion.loc.name}</strong>? No se puede deshacer.</p>
          )}
          {accion.tipo === 'archivar' && (
            <>
              <p>¿Archivar <strong>{accion.loc.name}</strong>?</p>
              <p>Dejará de aparecer al programar jornadas nuevas. Sus jornadas e historial se conservan y puedes restaurarlo cuando quieras.</p>
            </>
          )}
          {accion.tipo === 'restaurar' && (
            <p>¿Restaurar <strong>{accion.loc.name}</strong>? Volverá a aparecer al programar jornadas.</p>
          )}
        </ConfirmDialog>
      )}

      {/* MODAL DE EDICIÓN DE LUGAR */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pq-ink/60 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 border border-pq-cream-dark my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-pq-teal-deep mb-6 flex items-center gap-2">
              Editar Lugar <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
            </h3>

            <form onSubmit={handleUpdate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className={labelClass}>Nombre del Lugar / Organización <span className="text-red-500">*</span></label>
                  <input type="text" name="name" required value={editForm.name} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Línea de Acción <span className="text-red-500">*</span></label>
                  <ActionLineSelect value={editForm.action_line} onChange={handleEditChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Encargado(a) <span className="text-red-500">*</span></label>
                  <input type="text" name="manager_name" required pattern={PATTERNS.soloLetras} title={TITLES.soloLetras} value={editForm.manager_name} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Teléfono de Contacto <span className="text-xs font-medium text-pq-ink/50">(9 números)</span> <span className="text-red-500">*</span></label>
                  <input type="text" name="contact_phone" required maxLength={9} inputMode="numeric" pattern={PATTERNS.celular} title={TITLES.celular} value={editForm.contact_phone} onChange={handleEditChange} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className={labelClass}>Dirección Exacta <span className="text-red-500">*</span></label>
                  <input type="text" name="address" required value={editForm.address} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Distrito <span className="text-red-500">*</span></label>
                  <DistrictSelect value={editForm.district} onChange={handleEditChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Punto de Encuentro <span className="text-red-500">*</span></label>
                  <input type="text" name="meeting_point" required value={editForm.meeting_point} onChange={handleEditChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Link de Google Maps <span className="text-red-500">*</span></label>
                  <input type="url" name="maps_link" required value={editForm.maps_link} onChange={handleEditChange} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Indicaciones Especiales <span className="text-red-500">*</span></label>
                <textarea name="special_instructions" required value={editForm.special_instructions} onChange={handleEditChange} rows={3} className={`${inputClass} resize-none`}></textarea>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t-2 border-dashed border-pq-cream-dark">
                <button type="button" onClick={() => setEditingId(null)} className="px-5 py-2.5 text-pq-ink/70 font-bold hover:bg-pq-cream rounded-xl transition-colors">Cancelar</button>
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
