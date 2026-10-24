import { supabase } from './supabase';
import { todayInLima } from './dates';

// Lo que cualquier persona puede leer de un lugar (vista `locations_publicas`). La
// tabla `locations` completa, con el contacto del aliado, es solo de quien gestiona
// jornadas, así que no se puede embeber `locations(...)` en un select de jornadas.
export type LugarPublico = {
  id: string;
  name: string;
  district: string;
  meeting_point: string | null;
  action_line: string;
  address: string;
  special_instructions: string | null;
  maps_link: string | null;
};

export async function fetchLugaresPublicos(ids?: (string | null)[]) {
  let query = supabase
    .from('locations_publicas')
    .select('id, name, district, meeting_point, action_line, address, special_instructions, maps_link');
  if (ids) {
    const unicos = [...new Set(ids.filter((id): id is string => !!id))];
    if (unicos.length === 0) return { lugares: {} as Record<string, LugarPublico>, error: null };
    query = query.in('id', unicos);
  }
  const { data, error } = await query;
  const lugares: Record<string, LugarPublico> = {};
  (data || []).forEach(l => { lugares[l.id] = l; });
  return { lugares, error };
}

// "2026-10-25" -> "Sábado 25 de octubre". Se lee a mediodía para que no cambie el día.
export const fechaLarga = (date: string) => {
  const texto = new Date(date + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// "2026-10-25" -> "25 oct 2026"
export const fechaCorta = (date: string) =>
  new Date(date + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');

export const horario = (j: { start_time: string; end_time: string }) =>
  `${j.start_time.slice(0, 5)} - ${j.end_time.slice(0, 5)}`;

export type EstadoJornada = 'Hoy' | 'Próxima' | 'Pasada';

export const estadoJornada = (date: string, hoy = todayInLima()): EstadoJornada =>
  date === hoy ? 'Hoy' : date > hoy ? 'Próxima' : 'Pasada';

// Días entre una fecha y hoy en Lima: "Hoy", "Ayer", "Hace 5 días".
export const haceDias = (date: string, hoy = todayInLima()) => {
  const dias = Math.round((new Date(hoy + 'T12:00:00').getTime() - new Date(date + 'T12:00:00').getTime()) / 86_400_000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return `Hace ${dias} días`;
};

export type EstadoAsistencia = 'Asistió' | 'Faltó' | 'Justificó';

export type EntradaHistorial = {
  jornada: { id: string; name: string; date: string; valid_hours: number; location_id: string | null };
  lugar: LugarPublico | null;
  estado: EstadoAsistencia;
};

// Historial de una persona, armado con lo que ella misma puede leer:
//   Asistió   = tiene asistencia registrada (cuenta sus horas válidas).
//   Faltó     = dijo ASISTIRÁ, la jornada ya pasó y no tiene asistencia.
//   Justificó = dijo NO ASISTIRÁ a una jornada que ya pasó.
// Se filtra por volunteer_id aunque RLS ya lo limite: el equipo interno puede leer
// asistencias e inscripciones de otras personas.
export async function fetchHistorial(userId: string) {
  const hoy = todayInLima();
  const [asis, insc] = await Promise.all([
    supabase.from('asistencias').select('jornada_id').eq('volunteer_id', userId),
    supabase.from('inscripciones').select('jornada_id, status').eq('volunteer_id', userId),
  ]);
  const error = asis.error || insc.error;
  if (error) return { entradas: [] as EntradaHistorial[], error };

  const asistio = new Set((asis.data || []).map(a => a.jornada_id));
  const respuesta: Record<string, string> = {};
  (insc.data || []).forEach(i => { respuesta[i.jornada_id] = i.status; });

  const ids = [...new Set([...asistio, ...Object.keys(respuesta)])];
  if (ids.length === 0) return { entradas: [], error: null };

  const { data: jorData, error: jorError } = await supabase
    .from('jornadas')
    .select('id, name, date, valid_hours, location_id')
    .in('id', ids);
  if (jorError) return { entradas: [], error: jorError };

  const { lugares, error: lugError } = await fetchLugaresPublicos((jorData || []).map(j => j.location_id));

  const entradas: EntradaHistorial[] = [];
  (jorData || []).forEach(j => {
    let estado: EstadoAsistencia | null = null;
    if (asistio.has(j.id)) estado = 'Asistió';
    else if (j.date < hoy && respuesta[j.id] === 'ASISTIRÁ') estado = 'Faltó';
    else if (j.date < hoy && respuesta[j.id] === 'NO ASISTIRÁ') estado = 'Justificó';
    if (estado) entradas.push({ jornada: j, lugar: lugares[j.location_id ?? ''] || null, estado });
  });
  entradas.sort((a, b) => b.jornada.date.localeCompare(a.jornada.date));
  return { entradas, error: lugError };
}

export const horasDe = (entradas: EntradaHistorial[]) =>
  entradas.filter(e => e.estado === 'Asistió').reduce((total, e) => total + Number(e.jornada.valid_hours || 0), 0);

// 12.5 -> "12.5", 12 -> "12"
export const formatoHoras = (horas: number) => String(Math.round(horas * 10) / 10);
