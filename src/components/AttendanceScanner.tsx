import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Scanner } from '@yudiel/react-qr-scanner';
import LoadError from './LoadError';

export default function AttendanceScanner() {
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [selectedJornada, setSelectedJornada] = useState('');
  
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isScanning, setIsScanning] = useState(true);

  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [jornadasError, setJornadasError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [stats, setStats] = useState({ inscritos: 0, total: 0, internos: 0, externos: 0 });

  useEffect(() => {
    fetchJornadas();
  }, []);

  useEffect(() => {
    if (selectedJornada) {
      fetchAsistencias(selectedJornada);
    } else {
      setAsistencias([]);
      setStats({ inscritos: 0, total: 0, internos: 0, externos: 0 });
    }
  }, [selectedJornada]);

  const fetchJornadas = async () => {
    const todayObj = new Date();
    todayObj.setHours(todayObj.getHours() - 5);
    const today = todayObj.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('jornadas')
      .select('id, name, date')
      .gte('date', today)
      .order('date', { ascending: true });

    if (data) setJornadas(data);
    // Sin esto, un fallo se veía como "No hay jornadas programadas".
    setJornadasError(error ? error.message : null);
  };

  const fetchAsistencias = async (jornadaId: string) => {
    setLoadingStats(true);
    setStatsError(null);
    const { data: insData, error: insError } = await supabase.from('inscripciones').select('id').eq('jornada_id', jornadaId).eq('status', 'ASISTIRÁ');
    const totalInscritos = insData ? insData.length : 0;

    const { data, error } = await supabase
      .from('asistencias')
      .select('*, profiles(first_name, last_name, role)')
      .eq('jornada_id', jornadaId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAsistencias(data);
      let internos = 0; let externos = 0;
      data.forEach(asist => { if (asist.profiles?.role === 'VOLUNTARIO') externos++; else internos++; });
      setStats({ inscritos: totalInscritos, total: data.length, internos, externos });
    }
    const failure = error || insError;
    if (failure) setStatsError(failure.message);
    setLoadingStats(false);
  };

  const handleScan = async (scannedData: any) => {
    if (!scannedData || !isScanning) return;
    setIsScanning(false);
    const token = Array.isArray(scannedData) ? scannedData[0].rawValue : scannedData;
    setMessage({ text: 'Buscando voluntario...', type: 'blue' });

    const { data: profile } = await supabase.from('profiles').select('id, first_name, last_name').eq('qr_token', token).single();

    if (!profile) {
      setMessage({ text: '❌ QR no válido o no encontrado.', type: 'red' });
      setTimeout(() => setIsScanning(true), 3000);
      return;
    }

    const { error } = await supabase.from('asistencias').insert([{ jornada_id: selectedJornada, volunteer_id: profile.id }]);

    if (error) {
      if (error.code === '23505') setMessage({ text: `⚠️ ${profile.first_name} ya estaba registrado.`, type: 'yellow' });
      else setMessage({ text: '❌ Error al guardar asistencia.', type: 'red' });
    } else {
      setMessage({ text: `✅ ¡${profile.first_name} ${profile.last_name} registrado!`, type: 'green' });
      fetchAsistencias(selectedJornada);
    }

    setTimeout(() => { setMessage({ text: '', type: '' }); setIsScanning(true); }, 2500);
  };

  return (
    <div className="space-y-6">
      {jornadasError && <LoadError message={jornadasError} onRetry={fetchJornadas} />}
      {statsError && <LoadError message={statsError} onRetry={() => fetchAsistencias(selectedJornada)} />}

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-pq-cream-dark shadow-sm">
        <label className="block text-sm font-bold text-pq-teal-dark mb-3">Selecciona la Jornada Activa para iniciar el control:</label>
        <select 
          value={selectedJornada} 
          onChange={(e) => setSelectedJornada(e.target.value)} 
          className="w-full md:w-1/2 px-4 py-3 border-2 border-pq-cream-dark rounded-xl bg-pq-cream/30 focus:border-pq-teal focus:ring-4 focus:ring-pq-teal/10 outline-none font-bold text-pq-teal-deep transition-all"
        >
          <option value="">-- Elige una jornada --</option>
          {jornadas.map(j => (
            <option key={j.id} value={j.id}>{j.name} ({new Date(j.date + 'T12:00:00').toLocaleDateString('es-PE')})</option>
          ))}
        </select>
        {jornadas.length === 0 && <p className="text-sm font-bold text-pq-marku mt-3">No hay jornadas programadas para hoy o el futuro.</p>}
      </div>

      {selectedJornada && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CÁMARA */}
          <div className="lg:col-span-1 flex flex-col items-center bg-white p-6 md:p-8 rounded-3xl border border-pq-cream-dark shadow-sm h-fit">
            <h3 className="font-black text-xl text-pq-teal-deep mb-6 w-full text-center flex items-center justify-center gap-2">
              Cámara de Registro <span className="w-2 h-2 rounded-full bg-pq-marku"></span>
            </h3>
            
            {message.text && (
              <div className={`w-full p-3 mb-5 rounded-xl font-bold text-center text-sm border-2 ${
                message.type === 'green' ? 'bg-green-50 text-green-700 border-green-200' :
                message.type === 'red' ? 'bg-red-50 text-red-700 border-red-200' :
                message.type === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {message.text}
              </div>
            )}

            <div className="w-full max-w-[280px] rounded-3xl overflow-hidden border-8 border-pq-cream shadow-inner relative">
              {isScanning ? (
                <Scanner onScan={handleScan} />
              ) : (
                <div className="w-full aspect-square bg-pq-cream/50 flex items-center justify-center">
                  <p className="text-pq-teal-dark font-bold animate-pulse">Procesando...</p>
                </div>
              )}
            </div>
            <p className="text-xs font-medium text-pq-ink/60 mt-5 text-center">Apunta el código QR del voluntario al centro del recuadro.</p>
          </div>

          {/* ESTADÍSTICAS Y TABLA */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border-2 border-pq-cream-dark shadow-sm text-center border-t-4 border-t-pq-teal-deep">
                <p className="text-pq-ink/60 text-[10px] font-black uppercase tracking-widest">Esperados</p>
                <p className="text-3xl font-black text-pq-teal-deep mt-1">{stats.inscritos}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border-2 border-pq-cream-dark shadow-sm text-center border-t-4 border-t-pq-teal">
                <p className="text-pq-ink/60 text-[10px] font-black uppercase tracking-widest">Asistencia</p>
                <p className="text-3xl font-black text-pq-teal mt-1">{stats.total}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border-2 border-pq-cream-dark shadow-sm text-center">
                <p className="text-pq-ink/60 text-[10px] font-black uppercase tracking-widest">Internos</p>
                <p className="text-2xl font-black text-pq-teal-dark mt-1">{stats.internos}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border-2 border-pq-cream-dark shadow-sm text-center border-t-4 border-t-pq-marku">
                <p className="text-pq-ink/60 text-[10px] font-black uppercase tracking-widest">Externos</p>
                <p className="text-2xl font-black text-pq-marku mt-1">{stats.externos}</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border-2 border-pq-cream-dark shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: '420px' }}>
              <div className="p-5 border-b-2 border-pq-cream-dark bg-pq-cream/30 flex justify-between items-center">
                <h3 className="font-black text-pq-teal-deep flex items-center gap-2">
                  Últimos Registros <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">EN VIVO</span>
                </h3>
                {loadingStats && <span className="text-[10px] text-pq-teal-dark font-black uppercase tracking-wider animate-pulse">Actualizando...</span>}
              </div>
              <div className="overflow-y-auto flex-1 p-0">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white sticky top-0 shadow-sm z-10">
                    <tr className="text-pq-teal-dark text-[10px] font-black uppercase tracking-wider">
                      <th className="p-4 border-b-2 border-pq-cream-dark">Voluntario</th>
                      <th className="p-4 border-b-2 border-pq-cream-dark">Tipo</th>
                      <th className="p-4 border-b-2 border-pq-cream-dark">Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asistencias.map((asist) => (
                      <tr key={asist.id} className="hover:bg-pq-cream/50 transition-colors">
                        <td className="p-4 border-b border-pq-cream-dark font-bold text-pq-teal-deep text-sm">
                          {asist.profiles?.first_name || 'Sin nombre'} {asist.profiles?.last_name || ''}
                        </td>
                        <td className="p-4 border-b border-pq-cream-dark">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            asist.profiles?.role === 'VOLUNTARIO' ? 'bg-pq-marku/10 text-orange-600 border border-pq-marku/20' : 'bg-pq-teal/10 text-pq-teal-dark border border-pq-teal/20'
                          }`}>
                            {asist.profiles?.role === 'VOLUNTARIO' ? 'Externo' : 'Interno'}
                          </span>
                        </td>
                        <td className="p-4 border-b border-pq-cream-dark text-pq-ink/60 text-sm font-bold">
                          {new Date(asist.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                    {asistencias.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-10 text-center text-pq-teal-dark/50 font-bold">Nadie ha registrado asistencia aún.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}