import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import LoadError from './LoadError';
import toast from 'react-hot-toast';
import { permisos, type Perfil } from '../lib/permisos';
import HistorialCambios from './HistorialCambios';
import { Search, ChevronDown, ChevronUp, Phone, HeartPulse, GraduationCap, MapPin, UserSquare2, Shirt, AlertCircle, UserCog, Power } from 'lucide-react';

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
  const toggleActive = async (vol: Profile) => {
    const nombre = vol.first_name ? `${vol.first_name} ${vol.last_name}` : 'esta persona';
    const pregunta = vol.is_active
      ? `¿Desactivar a ${nombre}? Perderá sus permisos de equipo interno hasta que la vuelvan a activar.`
      : `¿Activar de nuevo a ${nombre}?`;
    if (!confirm(pregunta)) return;

    const { error } = await supabase.rpc('cambiar_estado', { p_persona: vol.id, p_activo: !vol.is_active });
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

  return (
    <div className="space-y-6">
      
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-pq-cream-dark shadow-sm">
        
        {/* CABECERA Y BUSCADOR */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-pq-teal-deep mb-2 flex items-center gap-2">
            Base de Datos de Voluntarios <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
          </h2>
          <p className="text-pq-ink/70 mb-6 font-medium">
            {p.veDatosPersonales
              ? 'Gestiona y consulta la información de todo tu equipo y voluntarios externos.'
              : 'Ves el nombre, el rol y el área de cada persona. Los datos personales solo los ve Gestión Humana.'}
          </p>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-pq-teal-dark/50" size={20} />
              <input 
                type="text" 
                placeholder={p.veDatosPersonales ? 'Buscar por nombre, DNI o correo...' : 'Buscar por nombre...'} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:bg-white focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none transition-all font-medium text-pq-ink"
              />
            </div>
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="md:w-48 px-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:bg-white focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none font-bold text-pq-teal-deep transition-all"
            >
              <option value="TODOS">Todos</option>
              <option value="INTERNOS">Equipo Interno</option>
              <option value="EXTERNOS">Voluntarios Externos</option>
            </select>
          </div>
        </div>

        {/* LISTADO DE VOLUNTARIOS */}
        {loading ? (
          <div className="flex justify-center p-10"><p className="text-pq-teal-dark font-bold animate-pulse">Cargando directorio...</p></div>
        ) : loadError ? (
          <LoadError message={loadError} onRetry={fetchVolunteers} />
        ) : (
          <div className="space-y-3">
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 pb-2 text-[10px] font-black text-pq-teal-dark uppercase tracking-widest border-b-2 border-pq-cream-dark">
              <div className="col-span-4">Voluntario</div>
              <div className="col-span-3">{p.veDatosPersonales ? 'Contacto' : ''}</div>
              <div className="col-span-3">Rol / Área</div>
              <div className="col-span-2 text-right">Estado</div>
            </div>

            {filteredVolunteers.length === 0 ? (
              <div className="text-center p-10 bg-pq-cream/50 rounded-2xl border-2 border-dashed border-pq-cream-dark">
                <p className="text-pq-teal-dark font-medium">No se encontraron voluntarios con esos filtros.</p>
              </div>
            ) : (
              filteredVolunteers.map((vol) => {
                const isExpanded = expandedId === vol.id;
                const isExterno = vol.role === 'VOLUNTARIO';

                return (
                  <div key={vol.id} className={`border-2 rounded-2xl transition-all duration-300 overflow-hidden ${
                    isExpanded ? 'border-pq-teal shadow-lg bg-white' : 'border-pq-cream-dark bg-white hover:border-pq-teal/40 hover:shadow-md'
                  }`}>
                    
                    {/* FILA RESUMEN (Siempre visible) */}
                    <button 
                      onClick={() => toggleExpand(vol.id)}
                      className={`w-full text-left p-4 md:px-5 flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center transition-colors ${
                        isExpanded ? 'bg-pq-teal/5' : 'bg-white'
                      }`}
                    >
                      <div className="col-span-4 w-full">
                        <h3 className="font-black text-pq-teal-deep text-lg leading-tight">
                          {vol.first_name ? `${vol.first_name} ${vol.last_name}` : 'Sin nombre registrado'}
                        </h3>
                        <p className="text-xs font-medium text-pq-ink/60 mt-0.5 truncate">{vol.email}</p>
                      </div>

                      <div className="col-span-3 w-full flex flex-row md:flex-col gap-2 md:gap-0.5">
                        {p.veDatosPersonales && (
                          <>
                            <span className="text-sm font-bold text-pq-teal-dark flex items-center gap-1.5"><Phone size={14} className="text-pq-ink/40"/> {vol.phone || 'Sin número'}</span>
                            <span className="text-xs font-medium text-pq-ink/50 flex items-center gap-1.5"><UserSquare2 size={12}/> DNI: {vol.document_id || 'N/A'}</span>
                          </>
                        )}
                      </div>

                      <div className="col-span-3 w-full">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-1 ${
                          isExterno ? 'bg-pq-marku/10 text-orange-600 border border-pq-marku/20' : 'bg-pq-teal/10 text-pq-teal-dark border border-pq-teal/20'
                        }`}>
                          {isExterno ? 'Externo' : vol.role}
                        </span>
                        {!isExterno && vol.area && (
                          <p className="text-[10px] font-bold text-pq-ink/50 truncate max-w-[150px]">{vol.area}</p>
                        )}
                      </div>

                      <div className="col-span-2 w-full flex justify-between md:justify-end items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          vol.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {vol.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        <div className={`p-1.5 rounded-full transition-colors ${isExpanded ? 'bg-pq-teal text-white' : 'bg-pq-cream text-pq-teal-dark'}`}>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </button>

                    {/* FICHA TÉCNICA EXPANDIDA */}
                    {isExpanded && (
                      <div className="p-5 md:p-6 border-t-2 border-pq-cream-dark bg-white">
                        {p.editaRolArea && vol.id !== userId && (
                          <div className={`flex flex-wrap justify-end gap-3 ${p.veDatosPersonales ? 'mb-5' : ''}`}>
                            <button
                              onClick={() => toggleActive(vol)}
                              className={`flex items-center gap-2 text-sm font-bold py-2 px-4 rounded-xl border-2 transition-colors ${
                                vol.is_active
                                  ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'
                                  : 'text-green-700 bg-green-50 hover:bg-green-100 border-green-200'
                              }`}
                            >
                              <Power size={16} /> {vol.is_active ? 'Desactivar' : 'Activar'}
                            </button>
                            <button
                              onClick={() => openEdit(vol)}
                              className="flex items-center gap-2 text-sm font-bold text-pq-teal-dark bg-pq-teal/5 hover:bg-pq-teal/10 border-2 border-pq-teal/20 py-2 px-4 rounded-xl transition-colors"
                            >
                              <UserCog size={16} /> Editar rol y área
                            </button>
                          </div>
                        )}
                        {p.veDatosPersonales && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          
                          {/* Columna 1: Emergencia y Salud */}
                          <div className="space-y-4 bg-red-50/50 p-4 rounded-xl border border-red-100">
                            <div>
                              <p className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1"><AlertCircle size={14}/> Emergencia</p>
                              <p className="font-black text-red-700 text-lg">{vol.emergency_phone || 'No registrado'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1"><HeartPulse size={14}/> Condiciones / Alergias</p>
                              <p className="font-bold text-pq-ink/80">{vol.medical_conditions || 'Ninguna'}</p>
                            </div>
                          </div>

                          {/* Columna 2: Estudios */}
                          <div className="space-y-4 bg-pq-cream/30 p-4 rounded-xl border border-pq-cream-dark">
                            <div>
                              <p className="text-xs font-bold text-pq-teal-dark uppercase tracking-wider flex items-center gap-1"><GraduationCap size={14}/> Centro de Estudios</p>
                              <p className="font-bold text-pq-teal-deep">{vol.study_center || 'No registrado'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-pq-teal-dark uppercase tracking-wider">Carrera / Profesión</p>
                              <p className="font-bold text-pq-ink/80">{vol.career || 'No registrado'}</p>
                            </div>
                          </div>

                          {/* Columna 3: Extras */}
                          <div className="space-y-4 bg-pq-cream/30 p-4 rounded-xl border border-pq-cream-dark">
                            <div>
                              <p className="text-xs font-bold text-pq-teal-dark uppercase tracking-wider flex items-center gap-1"><MapPin size={14}/> Dirección</p>
                              <p className="font-bold text-pq-ink/80 text-sm">{vol.address || 'No registrado'}</p>
                            </div>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-xs font-bold text-pq-teal-dark uppercase tracking-wider mb-1">Edad</p>
                                <p className="font-black text-pq-teal-deep">{calculateAge(vol.birth_date)} años</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-pq-teal-dark uppercase tracking-wider flex items-center gap-1 justify-end"><Shirt size={14}/> Talla</p>
                                <p className="font-black text-pq-teal-deep text-xl">{vol.shirt_size || '-'}</p>
                              </div>
                            </div>
                          </div>

                        </div>
                        )}
                        {!p.veDatosPersonales && !(p.editaRolArea && vol.id !== userId) && (
                          <p className="text-sm text-pq-ink/60 font-medium">No hay más datos que puedas ver de esta persona.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {p.veHistorialCambios && <HistorialCambios />}

      {editing && (
        <div className="fixed inset-0 bg-pq-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-pq-cream-dark">
            <h3 className="text-xl font-black text-pq-teal-deep mb-1 flex items-center gap-2">
              Editar rol y área <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
            </h3>
            <p className="text-sm text-pq-ink/70 mb-6 font-medium">
              {editing.first_name} {editing.last_name} · hoy es {editing.role === 'VOLUNTARIO' ? 'voluntario externo' : `${editing.role} de ${editing.area}`}
            </p>

            <label className="block text-xs font-bold text-pq-teal-dark uppercase tracking-wider mb-1">Rol</label>
            <select
              value={newRole}
              onChange={(e) => changeRole(e.target.value)}
              className="w-full mb-4 px-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:bg-white focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none font-bold text-pq-teal-deep"
            >
              {!rolesPermitidos.includes(newRole) && <option value={newRole} disabled>{newRole}</option>}
              {rolesPermitidos.map(r => <option key={r} value={r}>{r === 'VOLUNTARIO' ? 'VOLUNTARIO (externo)' : r}</option>)}
            </select>

            <label className="block text-xs font-bold text-pq-teal-dark uppercase tracking-wider mb-1">Área</label>
            <select
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              className="w-full mb-2 px-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:bg-white focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none font-bold text-pq-teal-deep"
            >
              {!areasPermitidas.includes(newArea) && <option value={newArea} disabled>{newArea || 'Sin área'}</option>}
              {areasPermitidas.map(a => <option key={a || 'sin-area'} value={a}>{a || 'Sin área'}</option>)}
            </select>
            <p className="text-xs text-pq-ink/50 font-medium mb-6">Solo aparecen las opciones que tu cargo te permite asignar.</p>

            <div className="flex gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-3 rounded-xl font-bold text-pq-teal-dark bg-pq-cream hover:bg-pq-cream-dark transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || (newRole === editing.role && newArea === (editing.area ?? SIN_AREA)) || !areasPermitidas.includes(newArea)}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-pq-teal hover:bg-pq-teal-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}