import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import LoadError from './LoadError';
import toast from 'react-hot-toast';
import { permisos, type Perfil } from '../lib/permisos';
import HistorialCambios from './HistorialCambios';
import ConfirmDialog from './ConfirmDialog';
import { EncabezadoPagina, Modal, BotonPrimario, BotonSecundario, inputClass, labelClass } from './JornadaUI';
import { Search, ChevronDown, ChevronUp, Phone, HeartPulse, GraduationCap, MapPin, Shirt, AlertCircle, UserCog, Power } from 'lucide-react';

// Actualizamos el perfil con TODOS los datos que trae el registro
type Profile = {
  id: string;
  email: string;
  role: string;
  area: string;
  first_name: string;
  last_name: string;
  document_id: string;
  phone: string;
  emergency_phone: string;
  birth_date: string;
  study_center: string;
  career: string;
  address: string;
  medical_conditions: string;
  shirt_size: string;
  is_active: boolean;
};

type OpcionRolArea = { role: string; area: string | null };

const SIN_AREA = '';

export default function VolunteerList({ userId, perfil }: { userId: string | null; perfil: Perfil }) {
  const p = permisos(perfil);
  const [volunteers, setVolunteers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Controles de búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('TODOS');
  
  // Control de la tarjeta desplegable
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal "Editar rol y área". Las opciones las calcula la base (opciones_rol_area)
  // según quién edita y a quién; la app solo arma los desplegables con ellas.
  const [editing, setEditing] = useState<Profile | null>(null);
  const [opciones, setOpciones] = useState<OpcionRolArea[]>([]);
  const [newRole, setNewRole] = useState('');
  const [newArea, setNewArea] = useState(SIN_AREA);
  const [saving, setSaving] = useState(false);

  // Persona a activar o desactivar (pendiente de confirmación).
  const [cambiandoEstado, setCambiandoEstado] = useState<Profile | null>(null);
  const [procesandoEstado, setProcesandoEstado] = useState(false);

  // El perfil de quien mira no cambia mientras la pestaña está abierta: se carga una vez.
  useEffect(() => {
    fetchVolunteers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchVolunteers = async () => {
    setLoading(true);
    setLoadError(null);
    // Quien no ve datos personales (p. ej. un coordinador de TI, que solo edita rol y
    // área) lee la vista con nombre, rol y área; `profiles` solo le mostraría su fila.
    const { data, error } = p.veDatosPersonales
      ? await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      : await supabase.from('perfiles_basicos').select('id, first_name, last_name, role, area, is_active').order('last_name');

    if (error) {
      console.error('Error al cargar voluntarios:', error);
      setLoadError(error.message);
    } else {
      setVolunteers((data || []) as Profile[]);
    }
    setLoading(false);
  };

  const openEdit = async (vol: Profile) => {
    const { data, error } = await supabase.rpc('opciones_rol_area', { p_persona: vol.id });
    if (error) {
      toast.error('No se pudieron cargar las opciones: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      toast.error('No tienes permiso para cambiar el rol o el área de esta persona.');
      return;
    }
    setOpciones(data);
    setNewRole(vol.role);
    setNewArea(vol.area ?? SIN_AREA);
    setEditing(vol);
  };

  // Mismas reglas que editar rol y área; la base decide y, si no se puede, lo dice.
  const nombreDe = (vol: Profile) => vol.first_name ? `${vol.first_name} ${vol.last_name}` : 'esta persona';

  const toggleActive = async (vol: Profile) => {
    const nombre = nombreDe(vol);
    setProcesandoEstado(true);
    const { error } = await supabase.rpc('cambiar_estado', { p_persona: vol.id, p_activo: !vol.is_active });
    setProcesandoEstado(false);
    setCambiandoEstado(null);
    if (error) {
      toast.error('No se pudo cambiar el estado: ' + error.message);
      return;
    }
    toast.success(vol.is_active ? `${nombre} quedó inactivo/a.` : `${nombre} quedó activo/a.`);
    fetchVolunteers();
  };

  const rolesPermitidos = [...new Set(opciones.map(o => o.role))];
  const areasPermitidas = opciones.filter(o => o.role === newRole).map(o => o.area ?? SIN_AREA);

  const changeRole = (role: string) => {
    setNewRole(role);
    const areas = opciones.filter(o => o.role === role).map(o => o.area ?? SIN_AREA);
    if (!areas.includes(newArea)) setNewArea(areas[0] ?? SIN_AREA);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.rpc('cambiar_rol_area', {
      p_persona: editing.id, p_role: newRole, p_area: newArea || null,
    });
    setSaving(false);
    if (error) {
      toast.error('No se pudo guardar: ' + error.message);
      return;
    }
    toast.success(`Se actualizó a ${editing.first_name ?? 'la persona'}.`);
    setEditing(null);
    fetchVolunteers();
  };

  // Filtrador Inteligente
  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(vol => {
      // 1. Filtro por Rol
      const matchesRole = 
        roleFilter === 'TODOS' ? true : 
        roleFilter === 'INTERNOS' ? (vol.role === 'ADMIN' || vol.role === 'COORDINADOR') :
        vol.role === 'VOLUNTARIO';
      
      // 2. Filtro por Búsqueda (Nombre, Apellido, DNI o Email)
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        (vol.first_name?.toLowerCase().includes(searchLower)) ||
        (vol.last_name?.toLowerCase().includes(searchLower)) ||
        (vol.document_id?.includes(searchLower)) ||
        (vol.email?.toLowerCase().includes(searchLower));

      return matchesRole && matchesSearch;
    });
  }, [volunteers, searchQuery, roleFilter]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // Función para calcular edad
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Iniciales para el avatar: "Ana Pérez" -> "AP".
  const iniciales = (vol: Profile) =>
    [vol.first_name, vol.last_name].map(s => s?.trim()[0] ?? '').join('').toUpperCase() || '?';

  const chip = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';
  const etiquetaFicha = 'text-xs font-bold uppercase tracking-[0.06em] flex items-center gap-1.5';

  return (
    <div className="flex flex-col gap-6 md:gap-7">
      <EncabezadoPagina
        titulo="Voluntarios"
        descripcion={p.veDatosPersonales
          ? 'Gestiona y consulta la información de todo tu equipo y voluntarios externos.'
          : 'Ves el nombre, el rol y el área de cada persona. Los datos personales solo los ve Gestión Humana.'}
      />

      <section className="bg-white p-5 md:p-7 rounded-[20px] shadow-pq-card flex flex-col gap-5">
        <h2 className="text-xl md:text-[22px] font-extrabold text-pq-teal-deep flex items-center gap-2">
          Base de Datos de Voluntarios <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
        </h2>

        {/* BUSCADOR Y FILTRO */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-[1_1_320px]">
            <Search className="absolute left-4 top-3.5 text-pq-ink-muted" size={20} aria-hidden="true" />
            <label htmlFor="buscar-vol" className="sr-only">Buscar</label>
            <input
              id="buscar-vol"
              type="text"
              placeholder={p.veDatosPersonales ? 'Buscar por nombre, DNI o correo...' : 'Buscar por nombre...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputClass} pl-12`}
            />
          </div>
          <label htmlFor="filtro-vol" className="sr-only">Filtrar por tipo</label>
          <select
            id="filtro-vol"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={`${inputClass} flex-[1_1_200px] sm:flex-[0_1_220px] font-semibold text-pq-teal-deep`}
          >
            <option value="TODOS">Todos</option>
            <option value="INTERNOS">Equipo Interno</option>
            <option value="EXTERNOS">Voluntarios Externos</option>
          </select>
        </div>

        {/* LISTADO DE VOLUNTARIOS */}
        {loading ? (
          <div className="flex justify-center p-10"><p className="text-pq-teal-dark font-bold animate-pulse">Cargando directorio...</p></div>
        ) : loadError ? (
          <LoadError message={loadError} onRetry={fetchVolunteers} />
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="hidden md:flex gap-4 px-5 pb-2 text-[11px] font-bold text-pq-ink-muted uppercase tracking-[0.08em] border-b border-pq-cream-dark">
              <span className="flex-[4_1_200px]">Voluntario</span>
              <span className="flex-[3_1_140px]">{p.veDatosPersonales ? 'Contacto' : ''}</span>
              <span className="flex-[3_1_140px]">Rol / Área</span>
              <span className="flex-[2_1_120px] text-right">Estado</span>
            </div>

            {filteredVolunteers.length === 0 ? (
              <div className="text-center p-10 bg-pq-cream rounded-2xl border border-pq-cream-dark">
                <p className="text-pq-ink-muted">No se encontraron voluntarios con esos filtros.</p>
              </div>
            ) : (
              filteredVolunteers.map((vol) => {
                const isExpanded = expandedId === vol.id;
                const isExterno = vol.role === 'VOLUNTARIO';

                return (
                  <article key={vol.id} className={`rounded-2xl bg-white overflow-hidden transition-all ${
                    isExpanded ? 'border-[1.5px] border-pq-teal shadow-pq-card' : 'border border-pq-cream-dark'
                  }`}>

                    {/* FILA RESUMEN (Siempre visible) */}
                    <button
                      onClick={() => toggleExpand(vol.id)}
                      aria-expanded={isExpanded}
                      className={`w-full text-left px-4 md:px-5 py-4 flex flex-wrap items-center gap-4 transition-colors ${
                        isExpanded ? 'bg-pq-teal-50/50' : 'bg-white hover:bg-pq-cream/50'
                      }`}
                    >
                      <span className="flex-[4_1_200px] min-w-0 flex items-center gap-3">
                        <span className="w-10 h-10 shrink-0 rounded-full bg-pq-teal-50 text-pq-teal-deep flex items-center justify-center text-sm font-bold">{iniciales(vol)}</span>
                        <span className="min-w-0 flex flex-col">
                          <span className="font-semibold text-pq-ink">
                            {vol.first_name ? `${vol.first_name} ${vol.last_name}` : 'Sin nombre registrado'}
                          </span>
                          {vol.email && <span className="text-[13px] text-pq-ink-muted truncate">{vol.email}</span>}
                        </span>
                      </span>

                      {p.veDatosPersonales && (
                        <span className="flex-[3_1_140px] flex flex-col gap-0.5 text-sm">
                          <span className="font-semibold flex items-center gap-1.5"><Phone size={14} className="text-pq-ink-muted" aria-hidden="true" /> {vol.phone || 'Sin número'}</span>
                          <span className="text-[13px] text-pq-ink-muted">DNI: {vol.document_id || 'N/A'}</span>
                        </span>
                      )}
                      {!p.veDatosPersonales && <span className="hidden md:block flex-[3_1_140px]" />}

                      <span className="flex-[3_1_140px] flex flex-col items-start gap-1">
                        <span className={`${chip} ${isExterno ? 'bg-pq-marku-50 text-pq-marku-ink' : 'bg-pq-teal-50 text-pq-teal-deep'}`}>
                          {isExterno ? 'Externo' : vol.role}
                        </span>
                        {!isExterno && vol.area && (
                          <span className="text-xs text-pq-ink-muted">{vol.area}</span>
                        )}
                      </span>

                      <span className="flex-[2_1_120px] flex justify-between md:justify-end items-center gap-3">
                        <span className={`${chip} ${vol.is_active ? 'bg-pq-teal-50 text-pq-teal-deep' : 'bg-pq-error-50 text-pq-error'}`}>
                          {vol.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-pq-teal text-white' : 'bg-pq-cream text-pq-teal-dark'}`}>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </span>
                      </span>
                    </button>

                    {/* FICHA TÉCNICA EXPANDIDA */}
                    {isExpanded && (
                      <div className="p-4 md:p-5 border-t border-pq-cream-dark flex flex-col gap-5">
                        {p.editaRolArea && vol.id !== userId && (
                          <div className="flex flex-col sm:flex-row flex-wrap sm:justify-end gap-3">
                            <button
                              onClick={() => setCambiandoEstado(vol)}
                              className={`inline-flex items-center justify-center gap-2 min-h-11 px-[18px] py-2.5 rounded-xl border-[1.5px] bg-white text-sm font-semibold transition-colors ${
                                vol.is_active
                                  ? 'border-pq-error text-pq-error hover:bg-pq-error-50'
                                  : 'border-pq-teal text-pq-teal hover:bg-pq-teal-50'
                              }`}
                            >
                              <Power size={16} aria-hidden="true" /> {vol.is_active ? 'Desactivar' : 'Activar'}
                            </button>
                            <button
                              onClick={() => openEdit(vol)}
                              className="inline-flex items-center justify-center gap-2 min-h-11 px-[18px] py-2.5 rounded-xl border-[1.5px] border-pq-teal bg-white text-pq-teal text-sm font-semibold hover:bg-pq-teal-50 transition-colors"
                            >
                              <UserCog size={16} aria-hidden="true" /> Editar rol y área
                            </button>
                          </div>
                        )}
                        {p.veDatosPersonales && (
                        <div className="flex flex-wrap gap-4">

                          {/* Columna 1: Emergencia y Salud */}
                          <div className="flex-[1_1_220px] flex flex-col gap-3.5 bg-pq-error-50 p-4 rounded-xl">
                            <div>
                              <p className={`${etiquetaFicha} text-pq-error`}><AlertCircle size={14} aria-hidden="true" /> Emergencia</p>
                              <p className="mt-1 text-lg font-bold text-pq-error">{vol.emergency_phone || 'No registrado'}</p>
                            </div>
                            <div>
                              <p className={`${etiquetaFicha} text-pq-error`}><HeartPulse size={14} aria-hidden="true" /> Condiciones / Alergias</p>
                              <p className="mt-1 text-[15px] font-semibold">{vol.medical_conditions || 'Ninguna'}</p>
                            </div>
                          </div>

                          {/* Columna 2: Estudios */}
                          <div className="flex-[1_1_220px] flex flex-col gap-3.5 bg-pq-cream p-4 rounded-xl">
                            <div>
                              <p className={`${etiquetaFicha} text-pq-teal-dark`}><GraduationCap size={14} aria-hidden="true" /> Centro de estudios</p>
                              <p className="mt-1 text-[15px] font-semibold">{vol.study_center || 'No registrado'}</p>
                            </div>
                            <div>
                              <p className={`${etiquetaFicha} text-pq-teal-dark`}>Carrera / Profesión</p>
                              <p className="mt-1 text-[15px] font-semibold">{vol.career || 'No registrado'}</p>
                            </div>
                          </div>

                          {/* Columna 3: Extras */}
                          <div className="flex-[1_1_220px] flex flex-col gap-3.5 bg-pq-cream p-4 rounded-xl">
                            <div>
                              <p className={`${etiquetaFicha} text-pq-teal-dark`}><MapPin size={14} aria-hidden="true" /> Dirección</p>
                              <p className="mt-1 text-sm font-semibold">{vol.address || 'No registrado'}</p>
                            </div>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className={`${etiquetaFicha} text-pq-teal-dark`}>Edad</p>
                                <p className="mt-1 text-[15px] font-bold">{calculateAge(vol.birth_date)} años</p>
                              </div>
                              <div className="text-right">
                                <p className={`${etiquetaFicha} text-pq-teal-dark justify-end`}><Shirt size={14} aria-hidden="true" /> Talla</p>
                                <p className="mt-1 font-display text-xl font-extrabold">{vol.shirt_size || '-'}</p>
                              </div>
                            </div>
                          </div>

                        </div>
                        )}
                        {!p.veDatosPersonales && !(p.editaRolArea && vol.id !== userId) && (
                          <p className="text-sm text-pq-ink-muted">No hay más datos que puedas ver de esta persona.</p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        )}
      </section>

      {p.veHistorialCambios && <HistorialCambios />}

      {/* CONFIRMAR ACTIVAR / DESACTIVAR */}
      {cambiandoEstado && (
        <ConfirmDialog
          title={cambiandoEstado.is_active ? 'Desactivar persona' : 'Activar persona'}
          confirmLabel={cambiandoEstado.is_active ? 'Desactivar' : 'Activar'}
          danger={cambiandoEstado.is_active}
          busy={procesandoEstado}
          onConfirm={() => toggleActive(cambiandoEstado)}
          onCancel={() => setCambiandoEstado(null)}
        >
          {cambiandoEstado.is_active ? (
            <>
              <p>¿Desactivar a <strong>{nombreDe(cambiandoEstado)}</strong>?</p>
              <p>Perderá sus permisos de equipo interno hasta que la vuelvan a activar.</p>
            </>
          ) : (
            <p>¿Activar de nuevo a <strong>{nombreDe(cambiandoEstado)}</strong>?</p>
          )}
        </ConfirmDialog>
      )}

      {editing && (
        <Modal
          titulo="Editar rol y área"
          descripcion={`${editing.first_name} ${editing.last_name} · hoy es ${editing.role === 'VOLUNTARIO' ? 'voluntario externo' : `${editing.role} de ${editing.area}`}`}
          onCerrar={() => setEditing(null)}
          corto
          pie={<>
            <BotonSecundario onClick={() => setEditing(null)}>Cancelar</BotonSecundario>
            <BotonPrimario
              onClick={saveEdit}
              disabled={saving || (newRole === editing.role && newArea === (editing.area ?? SIN_AREA)) || !areasPermitidas.includes(newArea)}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </BotonPrimario>
          </>}
        >
          <div className="flex flex-col gap-5">
            <div>
              <label htmlFor="nuevo-rol" className={labelClass}>Rol</label>
              <select id="nuevo-rol" value={newRole} onChange={(e) => changeRole(e.target.value)} className={inputClass}>
                {!rolesPermitidos.includes(newRole) && <option value={newRole} disabled>{newRole}</option>}
                {rolesPermitidos.map(r => <option key={r} value={r}>{r === 'VOLUNTARIO' ? 'VOLUNTARIO (externo)' : r}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="nueva-area" className={labelClass}>Área</label>
              <select id="nueva-area" value={newArea} onChange={(e) => setNewArea(e.target.value)} className={inputClass}>
                {!areasPermitidas.includes(newArea) && <option value={newArea} disabled>{newArea || 'Sin área'}</option>}
                {areasPermitidas.map(a => <option key={a || 'sin-area'} value={a}>{a || 'Sin área'}</option>)}
              </select>
              <p className="text-xs text-pq-ink-muted mt-2">Solo aparecen las opciones que tu cargo te permite asignar.</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
