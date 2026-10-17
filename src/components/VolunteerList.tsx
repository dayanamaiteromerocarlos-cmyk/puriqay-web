import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import LoadError from './LoadError';
import { Search, ChevronDown, ChevronUp, Phone, HeartPulse, GraduationCap, MapPin, UserSquare2, Shirt, AlertCircle } from 'lucide-react';

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

export default function VolunteerList() {
  const [volunteers, setVolunteers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Controles de búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('TODOS');
  
  // Control de la tarjeta desplegable
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar voluntarios:', error);
      setLoadError(error.message);
    } else {
      setVolunteers(data || []);
    }
    setLoading(false);
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
          <p className="text-pq-ink/70 mb-6 font-medium">Gestiona y consulta la información de todo tu equipo y voluntarios externos.</p>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-pq-teal-dark/50" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por nombre, DNI o correo..." 
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
              <div className="col-span-3">Contacto</div>
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
                        <span className="text-sm font-bold text-pq-teal-dark flex items-center gap-1.5"><Phone size={14} className="text-pq-ink/40"/> {vol.phone || 'Sin número'}</span>
                        <span className="text-xs font-medium text-pq-ink/50 flex items-center gap-1.5"><UserSquare2 size={12}/> DNI: {vol.document_id || 'N/A'}</span>
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
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}