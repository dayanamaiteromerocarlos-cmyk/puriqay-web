import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { todayInLima } from '../lib/dates';
import { Search, ChevronDown, ChevronUp, AlertCircle, MapPin, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadError from './LoadError';

export default function AvailableJornadas() {
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [inscripciones, setInscripciones] = useState<any>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedJornadas, setExpandedJornadas] = useState<string[]>([]);
  
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    const today = new Date();
    const currentYear = today.getFullYear().toString();
    const currentMonthStr = today.toLocaleString('es-PE', { month: 'long' });
    const capitalizedMonth = currentMonthStr.charAt(0).toUpperCase() + currentMonthStr.slice(1);
    return [`${currentYear}-${capitalizedMonth}`];
  });

  const [showModal, setShowModal] = useState(false);
  const [selectedJornadaId, setSelectedJornadaId] = useState('');
  const [justificationType, setJustificationType] = useState('Salud');
  const [justificationText, setJustificationText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Sin sesión no hay nada que cargar; Dashboard se encarga de mandar al login.
      setLoading(false);
      return;
    }
    setUserId(user.id);

    // Primer error de cualquier consulta: si alguna falla, se avisa en vez de mostrar
    // una lista vacía que parece "no hay jornadas".
    let failure: string | null = null;

    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile) setUserRole(profile.role);
    if (profileError) failure = profileError.message;

    const today = todayInLima();
    const { data: jorData, error: jorError } = await supabase
      .from('jornadas')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true });
    if (jorError) failure = failure ?? jorError.message;

    // El lugar se lee de la vista locations_publicas, que expone solo nombre,
    // distrito y punto de encuentro. La tabla locations completa (con telefonos
    // y direccion de los aliados) queda reservada al equipo interno, asi que no
    // se puede usar el join embebido de PostgREST: unimos aqui por location_id.
    const { data: locData, error: locError } = await supabase
      .from('locations_publicas')
      .select('id, name, district, meeting_point');
    if (locError) failure = failure ?? locError.message;

    if (jorData) {
      const lugares: Record<string, any> = {};
      (locData || []).forEach(loc => { lugares[loc.id] = loc; });
      setJornadas(jorData.map(jor => ({ ...jor, locations: lugares[jor.location_id] || null })));
    }

    const { data: insData, error: insError } = await supabase
      .from('inscripciones')
      .select('*')
      .eq('volunteer_id', user.id);
    if (insError) failure = failure ?? insError.message;

    if (insData) {
      const inscMap: any = {};
      insData.forEach(ins => { inscMap[ins.jornada_id] = ins; });
      setInscripciones(inscMap);
    }
    setLoadError(failure);
    setLoading(false);
  };

  const handleCommitment = async (jornadaId: string, status: string, type: string = '', text: string = '') => {
    if (!userId) return;
    
    const existing = inscripciones[jornadaId];
    let hasChanged = false;

    if (existing) {
      if (existing.status === status) return;
      hasChanged = true;
    }

    const payload = {
      jornada_id: jornadaId,
      volunteer_id: userId,
      status: status,
      justification_type: type,
      justification_text: text,
      has_changed: existing ? hasChanged : false,
      updated_at: new Date().toISOString()
    };

    let error;
    if (existing) {
      const { error: updateError } = await supabase.from('inscripciones').update(payload).eq('id', existing.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('inscripciones').insert([payload]);
      error = insertError;
    }

    if (error) {
      toast.error('Error al guardar la respuesta: ' + error.message);
    } else {
      setShowModal(false);
      setJustificationText('');
      setJustificationType('Salud');
      loadData(); 
    }
  };

  const openJustificationModal = (jornadaId: string) => {
    setSelectedJornadaId(jornadaId);
    setShowModal(true);
  };

  const toggleExpandJornada = (id: string) => {
    setExpandedJornadas(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => prev.includes(groupKey) ? prev.filter(item => item !== groupKey) : [...prev, groupKey]);
  };

  const groupedJornadas = useMemo(() => {
    const filtered = jornadas.filter(jor => 
      jor.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.reduce((acc: any, jor) => {
      const [yearStr, monthNumStr] = jor.date.split('-');
      const year = yearStr;
      
      const dateObj = new Date(parseInt(yearStr), parseInt(monthNumStr) - 1, 1);
      const month = dateObj.toLocaleString('es-PE', { month: 'long' });
      const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

      if (!acc[year]) acc[year] = {};
      if (!acc[year][capitalizedMonth]) acc[year][capitalizedMonth] = [];
      
      acc[year][capitalizedMonth].push(jor);
      return acc;
    }, {});
  }, [jornadas, searchQuery]);

  if (loading) return <div className="flex justify-center p-10"><p className="text-pq-teal-dark font-medium animate-pulse">Cargando jornadas disponibles...</p></div>;

  if (loadError) return <LoadError message={loadError} onRetry={loadData} />;

  return (
    <div className="space-y-6 relative">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-pq-cream-dark shadow-sm">
        
        <div className="mb-8">
          <h2 className="text-2xl font-black text-pq-teal-deep mb-2 flex items-center gap-2">
            {userRole === 'VOLUNTARIO' ? "Próximas Jornadas" : "Confirmación de Asistencia"}
            <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
          </h2>
          <p className="text-pq-ink/70 mb-6 font-medium">
            {userRole === 'VOLUNTARIO' 
              ? "Explora las actividades y anótate para participar." 
              : "Como equipo interno, es tu deber confirmar o justificar tu asistencia a cada jornada."}
          </p>
          
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-pq-teal-dark/50" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre de jornada..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:bg-white focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none transition-all text-pq-ink placeholder-pq-ink/40 font-medium"
            />
          </div>
        </div>

        {Object.keys(groupedJornadas).length === 0 ? (
          <div className="text-center p-10 bg-pq-cream/50 rounded-2xl border-2 border-dashed border-pq-cream-dark">
            <p className="text-pq-teal-dark font-medium">No se encontraron jornadas futuras.</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {Object.keys(groupedJornadas).sort().reverse().map(year => (
              <div key={year}>
                <h3 className="text-3xl font-black text-pq-teal-deep border-b-4 border-pq-teal-dark/20 pb-2 mb-6 inline-block pr-8">{year}</h3>
                
                {Object.keys(groupedJornadas[year]).map(month => {
                  const groupKey = `${year}-${month}`;
                  const isGroupExpanded = expandedGroups.includes(groupKey);
                  const jornadasDelMes = groupedJornadas[year][month];

                  const hayPendientes = jornadasDelMes.some((jor: any) => {
                    const miEstado = inscripciones[jor.id] ? inscripciones[jor.id].status : null;
                    return userRole !== 'VOLUNTARIO' && !miEstado;
                  });

                  return (
                    <div key={groupKey} className="mb-4">
                      
                      <button 
                        onClick={() => toggleGroup(groupKey)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-200 border-2 ${
                          isGroupExpanded 
                            ? 'bg-pq-teal text-white border-pq-teal shadow-md shadow-pq-teal/20' 
                            : 'bg-pq-cream/50 text-pq-teal-deep border-pq-cream-dark hover:bg-pq-cream hover:border-pq-teal/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-black uppercase tracking-wider">{month}</h4>
                          {userRole !== 'VOLUNTARIO' && (
                            hayPendientes ? (
                              <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200 shadow-sm">
                                <AlertCircle size={14} /> Pendientes
                              </span>
                            ) : (
                              <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                ✅ Completo
                              </span>
                            )
                          )}
                        </div>
                        {isGroupExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                      </button>
                      
                      {isGroupExpanded && (
                        <div className="space-y-4 mt-4 ml-2 md:ml-6 border-l-4 border-pq-cream-dark pl-4 md:pl-6">
                          {jornadasDelMes.map((jor: any) => {
                            const miInscripcion = inscripciones[jor.id];
                            const miEstado = miInscripcion ? miInscripcion.status : null;
                            const isExpanded = expandedJornadas.includes(jor.id);
                            const isPending = userRole !== 'VOLUNTARIO' && !miEstado;

                            return (
                              <div key={jor.id} className={`border-2 rounded-2xl transition-all duration-300 overflow-hidden ${
                                isExpanded ? 'shadow-lg border-pq-teal bg-white scale-[1.01]' : 'shadow-sm border-pq-cream-dark hover:border-pq-teal/50 bg-white hover:shadow-md'
                              }`}>
                                
                                <button 
                                  onClick={() => toggleExpandJornada(jor.id)}
                                  className={`w-full text-left p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                                    isExpanded ? 'bg-pq-teal/5' : 'bg-white'
                                  }`}
                                >
                                  <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <h5 className="font-black text-pq-teal-deep text-xl">{jor.name}</h5>
                                      
                                      {isPending && (
                                        <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-1 rounded-full border border-yellow-200">
                                          <AlertCircle size={14} /> Pendiente
                                        </span>
                                      )}
                                      {miInscripcion?.has_changed && (
                                        <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                          ⚠️ Cambió
                                        </span>
                                      )}
                                      {miEstado === 'ASISTIRÁ' && !miInscripcion?.has_changed && (
                                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">Confirmado</span>
                                      )}
                                      {miEstado === 'NO ASISTIRÁ' && !miInscripcion?.has_changed && (
                                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">No asistirá</span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-pq-teal-dark font-medium">
                                      <span className="flex items-center gap-1 bg-pq-cream px-3 py-1 rounded-lg"><Calendar size={14} /> {new Date(jor.date + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric' })}</span>
                                      <span className="flex items-center gap-1 bg-pq-cream px-3 py-1 rounded-lg"><Clock size={14} /> {jor.start_time.slice(0,5)}</span>
                                    </div>
                                  </div>
                                  <div className={`p-2 rounded-full ${isExpanded ? 'bg-pq-teal text-white' : 'bg-pq-cream text-pq-teal-dark'}`}>
                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div className="p-6 border-t-2 border-pq-cream-dark bg-white">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                      <div className="bg-pq-cream/30 p-4 rounded-xl border border-pq-cream-dark">
                                        <p className="text-xs font-bold text-pq-teal-dark uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={14}/> Ubicación</p>
                                        <p className="font-bold text-pq-teal-deep text-lg">{jor.locations?.name}</p>
                                        <p className="text-sm text-pq-ink/70">{jor.locations?.district}</p>
                                      </div>
                                      <div className="bg-pq-cream/30 p-4 rounded-xl border border-pq-cream-dark">
                                        <p className="text-xs font-bold text-pq-teal-dark uppercase tracking-wider mb-1">📌 Punto de Encuentro</p>
                                        <p className="font-bold text-pq-teal-deep">{jor.locations?.meeting_point || 'Por definir'}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="pt-4 border-t-2 border-dashed border-pq-cream-dark">
                                      {userRole === 'VOLUNTARIO' ? (
                                        <button 
                                          onClick={() => handleCommitment(jor.id, 'ASISTIRÁ')}
                                          disabled={miEstado === 'ASISTIRÁ'}
                                          className={`w-full md:w-auto py-3 px-8 rounded-xl font-bold transition-all duration-200 text-lg ${
                                            miEstado === 'ASISTIRÁ'
                                              ? 'bg-green-100 text-green-700 cursor-not-allowed opacity-80' 
                                              : 'bg-pq-teal hover:bg-pq-teal-dark text-white shadow-lg shadow-pq-teal/30 hover:shadow-pq-teal/50 transform hover:-translate-y-0.5'
                                          }`}
                                        >
                                          {miEstado === 'ASISTIRÁ' ? '✅ Ya estás inscrito' : '✋ Inscribirme a esta jornada'}
                                        </button>
                                      ) : (
                                        <div>
                                          <p className="text-sm font-black text-pq-teal-deep mb-3 uppercase tracking-wider">Tu respuesta es obligatoria:</p>
                                          <div className="flex flex-col sm:flex-row gap-4">
                                            <button 
                                              onClick={() => handleCommitment(jor.id, 'ASISTIRÁ')}
                                              className={`flex-1 py-3 rounded-xl font-bold transition-all duration-200 border-2 ${
                                                miEstado === 'ASISTIRÁ' 
                                                  ? 'bg-pq-teal text-white border-pq-teal shadow-lg shadow-pq-teal/30 ring-4 ring-pq-teal/20' 
                                                  : 'bg-white text-pq-teal border-pq-teal hover:bg-pq-teal hover:text-white'
                                              }`}
                                            >
                                              Sí, asistiré
                                            </button>
                                            <button 
                                              onClick={() => openJustificationModal(jor.id)}
                                              className={`flex-1 py-3 rounded-xl font-bold transition-all duration-200 border-2 ${
                                                miEstado === 'NO ASISTIRÁ' 
                                                  ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/30 ring-4 ring-red-500/20' 
                                                  : 'bg-white text-red-500 border-red-500 hover:bg-red-500 hover:text-white'
                                              }`}
                                            >
                                              No asistiré
                                            </button>
                                          </div>
                                          {miEstado === 'NO ASISTIRÁ' && (
                                            <div className="mt-4 bg-red-50 p-4 rounded-xl border border-red-100">
                                              <p className="text-sm text-red-800">
                                                <strong>Motivo de inasistencia:</strong> {miInscripcion.justification_type}
                                              </p>
                                              {miInscripcion.justification_text && (
                                                <p className="text-sm text-red-600 italic mt-1">"{miInscripcion.justification_text}"</p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE JUSTIFICACIÓN */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pq-ink/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-pq-cream-dark">
            <h3 className="text-2xl font-black text-pq-teal-deep mb-2 flex items-center gap-2">
              Justificar Inasistencia <span className="w-2 h-2 rounded-full bg-pq-marku inline-block"></span>
            </h3>
            <p className="text-sm text-pq-ink/70 mb-6 font-medium">Como miembro del equipo interno, es obligatorio registrar el motivo de tu inasistencia.</p>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-pq-teal-dark mb-2">Motivo Principal</label>
                <select value={justificationType} onChange={(e) => setJustificationType(e.target.value)} className="w-full px-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none font-medium text-pq-ink transition-all">
                  <option value="Salud">Salud (Enfermedad/Cita médica)</option>
                  <option value="Trabajo/Estudio">Cruce con Trabajo / Estudios</option>
                  <option value="Problema Familiar">Urgencia Familiar</option>
                  <option value="Cruce de Horarios">Cruce con otra actividad de Puriqay</option>
                  <option value="Otro">Otro motivo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-pq-teal-dark mb-2">Detalle (Opcional)</label>
                <textarea value={justificationText} onChange={(e) => setJustificationText(e.target.value)} rows={3} placeholder="Explica brevemente..." className="w-full px-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none font-medium text-pq-ink transition-all resize-none"></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-pq-ink/70 font-bold hover:bg-pq-cream rounded-xl transition-colors">Cancelar</button>
              <button onClick={() => handleCommitment(selectedJornadaId, 'NO ASISTIRÁ', justificationType, justificationText)} className="px-5 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all">Confirmar Inasistencia</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}