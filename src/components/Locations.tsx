import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Phone, User, Map, Info, ChevronDown, ChevronUp, Pencil, Home, Flag, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DISTRITOS_LIMA, DISTRITOS_CALLAO, ACTION_LINES } from '../lib/catalogs';
import { PATTERNS, TITLES, limpiarNombre } from '../lib/validations';
import { esBorradoBloqueado } from '../lib/dbErrors';
import ConfirmDialog from './ConfirmDialog';
import { ChipLinea, EncabezadoPagina, Modal, BotonPrimario, BotonSecundario, inputClass, labelClass } from './JornadaUI';

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
      .update({ ...editForm, manager_name: limpiarNombre(editForm.manager_name) })
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

    const { error } = await supabase.from('locations').insert([{ ...formData, manager_name: limpiarNombre(formData.manager_name) }]);

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

  // Botón de icono de las tarjetas (editar, archivar, borrar, mapa).
  const iconBtn = "w-11 h-11 md:w-9 md:h-9 rounded-[10px] bg-pq-cream text-pq-teal-dark flex items-center justify-center hover:bg-pq-cream-dark transition-colors disabled:bg-transparent disabled:text-pq-ink/25 disabled:cursor-not-allowed";

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
    <div className="flex flex-col gap-6 md:gap-7">
      <EncabezadoPagina titulo="Lugares aliados" descripcion="Registra los lugares donde se hacen las jornadas y mantén su información al día." />

      {/* FORMULARIO DE CREACIÓN */}
      <section className="bg-white p-5 md:p-7 rounded-[20px] shadow-pq-card">
        <h2 className="text-xl md:text-[22px] font-extrabold text-pq-teal-deep mb-5 flex items-center gap-2">
          Registrar Nuevo Lugar / Aliado <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
        </h2>

        <form onSubmit={handleSubmit} className="@container space-y-5">
          <div className="grid grid-cols-1 @xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
            <div className="min-w-0">
              <label className={labelClass}>Nombre del Lugar / Organización <span className="text-pq-error">*</span></label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className={inputClass} placeholder="Ej: Albergue 4 Patas" />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Línea de Acción <span className="text-pq-error">*</span></label>
              <ActionLineSelect value={formData.action_line} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 @xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
            <div className="min-w-0">
              <label className={labelClass}>Encargado(a) <span className="text-pq-error">*</span></label>
              <input type="text" name="manager_name" required pattern={PATTERNS.soloLetras} title={TITLES.soloLetras} value={formData.manager_name} onChange={handleChange} className={inputClass} placeholder="Nombre del contacto principal" />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Teléfono de Contacto <span className="text-xs font-medium text-pq-ink-muted">(9 números)</span> <span className="text-pq-error">*</span></label>
              <input type="text" name="contact_phone" required maxLength={9} inputMode="numeric" pattern={PATTERNS.celular} title={TITLES.celular} value={formData.contact_phone} onChange={handleChange} className={inputClass} placeholder="Ej: 999888777" />
            </div>
          </div>

          <div className="grid grid-cols-1 @xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
            <div className="min-w-0">
              <label className={labelClass}>Dirección Exacta <span className="text-pq-error">*</span></label>
              <input type="text" name="address" required value={formData.address} onChange={handleChange} className={inputClass} />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Distrito <span className="text-pq-error">*</span></label>
              <DistrictSelect value={formData.district} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 @xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
            <div className="min-w-0">
              <label className={labelClass}>Punto de Encuentro <span className="text-pq-error">*</span></label>
              <input type="text" name="meeting_point" required value={formData.meeting_point} onChange={handleChange} className={inputClass} placeholder="Ej: Puerta principal / Estación de tren" />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Link de Google Maps <span className="text-pq-error">*</span></label>
              <input type="url" name="maps_link" required value={formData.maps_link} onChange={handleChange} className={inputClass} placeholder="https://maps.app.goo.gl/..." />
            </div>
          </div>

          <div>
            <label className={labelClass}>Indicaciones Especiales <span className="text-pq-error">*</span></label>
            <textarea name="special_instructions" required value={formData.special_instructions} onChange={handleChange} rows={2} className={`${inputClass} resize-none`} placeholder="Ej: Llevar botas de agua, tocar timbre rojo..."></textarea>
          </div>

          <div className="flex justify-end pt-5 border-t border-pq-cream-dark">
            <BotonPrimario type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Guardando...' : 'Guardar Lugar'}
            </BotonPrimario>
          </div>
        </form>
      </section>

      {/* DIRECTORIO DE LUGARES */}
      <section className="bg-white p-5 md:p-7 rounded-[20px] shadow-pq-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-xl md:text-[22px] font-extrabold text-pq-teal-deep flex items-center gap-2">
            Directorio de Lugares Aliados <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
          </h2>
          <div role="tablist" className="flex bg-pq-cream p-1 rounded-xl border border-pq-cream-dark text-sm font-semibold">
            {[false, true].map(archivados => (
              <button
                key={String(archivados)}
                type="button"
                role="tab"
                aria-selected={verArchivados === archivados}
                onClick={() => setVerArchivados(archivados)}
                className={`min-h-9 px-4 py-1.5 rounded-[9px] transition-colors ${verArchivados === archivados ? 'bg-white text-pq-teal-deep shadow-sm' : 'text-pq-ink-muted hover:text-pq-teal-dark'}`}
              >
                {archivados ? 'Archivados' : 'Activos'} ({locations.filter(l => (l.status === 'ARCHIVADO') === archivados).length})
              </button>
            ))}
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center p-10"><p className="text-pq-teal-dark font-bold animate-pulse">Cargando directorio...</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
            {visibles.map((loc) => {
              const isExpanded = expandedId === loc.id;
              const archivado = loc.status === 'ARCHIVADO';
              const nJornadas = jornadasPorLugar[loc.id] || 0;

              return (
                <article key={loc.id} className={`rounded-2xl p-5 transition-all flex flex-col gap-3 ${archivado ? 'bg-pq-cream/40' : 'bg-white'} ${
                  isExpanded ? 'border-[1.5px] border-pq-teal shadow-pq-card' : 'border border-pq-cream-dark'
                }`}>

                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ChipLinea linea={loc.action_line} />
                      {archivado && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border border-pq-cream-dark bg-pq-cream text-pq-ink-muted">Archivado</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEdit(loc)} aria-label="Editar lugar" title="Editar lugar" className={iconBtn}>
                        <Pencil size={16} />
                      </button>
                      {archivaLugares && (archivado ? (
                        <button type="button" onClick={() => setAccion({ tipo: 'restaurar', loc })} aria-label="Restaurar lugar" title="Restaurar lugar" className={iconBtn}>
                          <ArchiveRestore size={16} />
                        </button>
                      ) : (
                        <button type="button" onClick={() => setAccion({ tipo: 'archivar', loc })} aria-label="Archivar lugar" title="Archivar lugar" className={iconBtn}>
                          <Archive size={16} />
                        </button>
                      ))}
                      {archivaLugares && (
                        <button
                          type="button"
                          onClick={() => setAccion({ tipo: 'borrar', loc })}
                          disabled={nJornadas > 0}
                          aria-label="Borrar lugar"
                          title={nJornadas > 0 ? `Tiene ${nJornadas} jornada(s): archívalo en vez de borrarlo` : 'Borrar lugar'}
                          className={`${iconBtn} text-pq-error`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {loc.maps_link && (
                        <a href={loc.maps_link} target="_blank" rel="noreferrer" className={iconBtn} aria-label="Ver en Maps" title="Ver en Maps">
                          <Map size={16} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-pq-ink leading-snug">{loc.name}</h3>
                    <p className="mt-1 text-sm text-pq-ink-muted flex items-center gap-1.5">
                      <MapPin size={14} className="min-w-[14px]" aria-hidden="true" /> {loc.district}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 bg-pq-cream p-3 rounded-xl text-sm">
                    <span className="flex items-center gap-2 font-semibold">
                      <User size={14} className="text-pq-teal-dark" aria-hidden="true" />
                      {loc.manager_name || 'Sin encargado'}
                    </span>
                    {loc.contact_phone && (
                      <span className="flex items-center gap-2 text-pq-ink-muted">
                        <Phone size={14} className="text-pq-teal-dark" aria-hidden="true" />
                        {loc.contact_phone}
                      </span>
                    )}
                  </div>

                  {/* DETALLES COLAPSABLES: dirección, punto de encuentro e indicaciones */}
                  {(loc.address || loc.meeting_point || loc.special_instructions) && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleExpand(loc.id)}
                        aria-expanded={isExpanded}
                        className="w-full flex items-center justify-between min-h-10 pt-2 border-t border-pq-cream-dark text-sm font-semibold text-pq-teal hover:text-pq-teal-dark transition-colors"
                      >
                        {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {isExpanded && (
                        <div className="flex flex-col gap-2.5 text-[13px] text-pq-ink-muted">
                          {loc.address && (
                            <p className="flex gap-2 items-start">
                              <Home size={14} className="text-pq-teal-dark mt-0.5 min-w-[14px]" aria-hidden="true" />
                              <span>{loc.address}</span>
                            </p>
                          )}
                          {loc.meeting_point && (
                            <p className="flex gap-2 items-start">
                              <Flag size={14} className="text-pq-teal-dark mt-0.5 min-w-[14px]" aria-hidden="true" />
                              <span><strong className="text-pq-ink">Punto de encuentro:</strong> {loc.meeting_point}</span>
                            </p>
                          )}
                          {loc.special_instructions && (
                            <p className="flex gap-2 items-start px-2.5 py-2 rounded-lg bg-pq-marku-50 text-pq-marku-ink">
                              <Info size={14} className="mt-0.5 min-w-[14px]" aria-hidden="true" />
                              <span>{loc.special_instructions}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </article>
              );
            })}

            {visibles.length === 0 && (
              <div className="col-span-full text-center p-10 bg-pq-cream rounded-2xl border border-pq-cream-dark">
                <p className="text-pq-ink-muted">
                  {verArchivados ? 'No hay lugares archivados.' : 'No tienes lugares aliados registrados aún.'}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

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
        <form onSubmit={handleUpdate}>
          <Modal
            titulo="Editar Lugar"
            onCerrar={() => setEditingId(null)}
            ancho="max-w-[680px]"
            pie={<>
              <BotonSecundario onClick={() => setEditingId(null)} disabled={savingEdit}>Cancelar</BotonSecundario>
              <BotonPrimario type="submit" disabled={savingEdit}>{savingEdit ? 'Guardando...' : 'Guardar Cambios'}</BotonPrimario>
            </>}
          >
            <div className="@container space-y-5">
              <div className="grid grid-cols-1 @xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
                <div className="min-w-0">
                  <label className={labelClass}>Nombre del Lugar / Organización <span className="text-pq-error">*</span></label>
                  <input type="text" name="name" required value={editForm.name} onChange={handleEditChange} className={inputClass} />
                </div>
                <div className="min-w-0">
                  <label className={labelClass}>Línea de Acción <span className="text-pq-error">*</span></label>
                  <ActionLineSelect value={editForm.action_line} onChange={handleEditChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 @xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
                <div className="min-w-0">
                  <label className={labelClass}>Encargado(a) <span className="text-pq-error">*</span></label>
                  <input type="text" name="manager_name" required pattern={PATTERNS.soloLetras} title={TITLES.soloLetras} value={editForm.manager_name} onChange={handleEditChange} className={inputClass} />
                </div>
                <div className="min-w-0">
                  <label className={labelClass}>Teléfono de Contacto <span className="text-xs font-medium text-pq-ink-muted">(9 números)</span> <span className="text-pq-error">*</span></label>
                  <input type="text" name="contact_phone" required maxLength={9} inputMode="numeric" pattern={PATTERNS.celular} title={TITLES.celular} value={editForm.contact_phone} onChange={handleEditChange} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 @xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
                <div className="min-w-0">
                  <label className={labelClass}>Dirección Exacta <span className="text-pq-error">*</span></label>
                  <input type="text" name="address" required value={editForm.address} onChange={handleEditChange} className={inputClass} />
                </div>
                <div className="min-w-0">
                  <label className={labelClass}>Distrito <span className="text-pq-error">*</span></label>
                  <DistrictSelect value={editForm.district} onChange={handleEditChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 @xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
                <div className="min-w-0">
                  <label className={labelClass}>Punto de Encuentro <span className="text-pq-error">*</span></label>
                  <input type="text" name="meeting_point" required value={editForm.meeting_point} onChange={handleEditChange} className={inputClass} />
                </div>
                <div className="min-w-0">
                  <label className={labelClass}>Link de Google Maps <span className="text-pq-error">*</span></label>
                  <input type="url" name="maps_link" required value={editForm.maps_link} onChange={handleEditChange} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Indicaciones Especiales <span className="text-pq-error">*</span></label>
                <textarea name="special_instructions" required value={editForm.special_instructions} onChange={handleEditChange} rows={3} className={`${inputClass} resize-none`}></textarea>
              </div>
            </div>
          </Modal>
        </form>
      )}
    </div>
  );
}
