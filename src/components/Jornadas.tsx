import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, MapPin, UserSquare2, Activity, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { getActionLineColor } from '../lib/catalogs';
import LoadError from './LoadError';

export default function Jornadas() {
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // La descripción de cada jornada se muestra solo al hacer clic, para que la lista
  // se mantenga compacta.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggleExpand = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  const [formData, setFormData] = useState({
    name: '',
    location_id: '',
    coordinator_id: '', 
    date: '',
    start_time: '',
    end_time: '',
    valid_hours: '',
    type: 'Jornada de Campo',
    description: ''
  });

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

    const { data: coordData, error: coordError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('role', ['ADMIN', 'COORDINADOR']);
    if (coordData) setCoordinators(coordData);

    const { data: jorData, error: jorError } = await supabase
      .from('jornadas')
      .select('*, locations(name, district, action_line), profiles(first_name, last_name)')
      .order('date', { ascending: false });

    if (jorData) setJornadas(jorData);

    // Si alguna consulta falló, se avisa: los desplegables vacíos y la lista vacía
    // parecerían "no hay datos" cuando en realidad fue un error de red o de permisos.
    const failure = locError || coordError || jorError;
    if (failure) setLoadError(failure.message);
    setFetching(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        valid_hours: parseFloat(formData.valid_hours),
        type: formData.type,
        description: formData.description
      }]);

    if (error) {
      alert('Error al crear la jornada: ' + error.message);
    } else {
      alert('¡Jornada programada con éxito!');
      setFormData({
        ...formData, name: '', location_id: '', coordinator_id: '', date: '', start_time: '', end_time: '', valid_hours: '', description: ''
      });
      fetchData();
    }
    setLoading(false);
  };

  // Clases reutilizables para mantener el código limpio
  // La línea de acción no se elige a mano: la hereda el lugar del voluntariado,
  // para que no se pueda marcar "Ambiental" en un albergue animalista.
  const selectedLocation = locations.find(l => l.id === formData.location_id);

  const inputClass = "w-full px-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:bg-white focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none transition-all font-medium text-pq-ink";
  const labelClass = "block text-sm font-bold text-pq-teal-dark mb-2";

  return (
    <div className="space-y-8">
      {loadError && <LoadError message={loadError} onRetry={fetchData} />}
      
      {/* FORMULARIO DE CREACIÓN */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-pq-cream-dark shadow-sm">
        <h2 className="text-2xl font-black text-pq-teal-deep mb-6 flex items-center gap-2">
          Programar Nueva Jornada <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelClass}>Nombre de la Jornada <span className="text-red-500">*</span></label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className={inputClass} placeholder="Ej: Limpieza de Verano" />
            </div>
            <div>
              <label className={labelClass}>Lugar del Voluntariado <span className="text-red-500">*</span></label>
              <select name="location_id" required value={formData.location_id} onChange={handleChange} className={inputClass}>
                <option value="">-- Selecciona un Lugar Aliado --</option>
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
              <select name="coordinator_id" required value={formData.coordinator_id} onChange={handleChange} className={inputClass}>
                <option value="">-- Selecciona Responsable --</option>
                {coordinators.map(coord => (
                  <option key={coord.id} value={coord.id}>{coord.first_name} {coord.last_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className={labelClass}>Fecha <span className="text-red-500">*</span></label>
              <input type="date" name="date" required value={formData.date} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Hora Inicio <span className="text-red-500">*</span></label>
              <input type="time" name="start_time" required value={formData.start_time} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Hora Fin <span className="text-red-500">*</span></label>
              <input type="time" name="end_time" required value={formData.end_time} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Horas Válidas <span className="text-red-500">*</span></label>
              <input type="number" step="0.5" name="valid_hours" required value={formData.valid_hours} onChange={handleChange} className={inputClass} placeholder="Ej: 3" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className={labelClass}>Tipo de Actividad <span className="text-red-500">*</span></label>
              <select name="type" required value={formData.type} onChange={handleChange} className={inputClass}>
                <option value="Jornada de Campo">Jornada de Campo</option>
                <option value="Taller / Charla">Taller / Charla</option>
                <option value="Reunión Virtual">Reunión Virtual</option>
                <option value="Capacitación">Capacitación</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Descripción de Actividades <span className="text-red-500">*</span></label>
              <textarea name="description" required value={formData.description} onChange={handleChange} rows={1} className={`${inputClass} resize-none`} placeholder="¿Qué se hará exactamente?"></textarea>
            </div>
          </div>

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
            {jornadas.map((jor) => (
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
                    </span>
                    <span className="bg-pq-cream/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-pq-cream-dark/50">
                      <UserSquare2 size={16} className="text-pq-teal-dark"/> 
                      {jor.profiles ? `${jor.profiles.first_name} ${jor.profiles.last_name}` : 'Sin asignar'}
                    </span>
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

                <div className="flex flex-wrap gap-4 text-sm bg-pq-cream/30 p-3 rounded-xl border border-pq-cream-dark w-full xl:w-auto">
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

              </div>
            ))}
            
            {jornadas.length === 0 && (
              <div className="text-center p-10 bg-pq-cream/50 rounded-2xl border-2 border-dashed border-pq-cream-dark">
                <p className="text-pq-teal-dark font-medium">Aún no hay jornadas registradas.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}