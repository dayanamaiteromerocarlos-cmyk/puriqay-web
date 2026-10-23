import { supabase } from './supabase';

// Las áreas son un catálogo cerrado en la base (tabla `areas`): estos textos tienen
// que coincidir exactamente con sus filas, tildes incluidas.
export const AREAS = {
  GERENCIA: 'Gerencia General',
  TI: 'Tecnologías de la Información',
  GESTION_HUMANA: 'Gestión Humana',
  PROYECTOS: 'Gestión de Proyectos Sociales',
  COMUNICACION: 'Comunicación y Difusión',
  FINANZAS: 'Finanzas y Logística',
} as const;

export type Perfil = { role: string | null; area: string | null; is_active: boolean | null };

// Qué módulos y acciones mostrar. Es el espejo, para la interfaz, de las reglas que
// aplica la base (políticas RLS y funciones del backend): ocultar un botón aquí no
// protege nada, y si este archivo y la base no coinciden, manda la base.
export function permisos({ role, area, is_active }: Perfil) {
  const activo = is_active !== false;
  const cargo = (roles: string[], areas: string[]) =>
    activo && !!role && !!area && roles.includes(role) && areas.includes(area);
  const ADMIN = ['ADMIN'];
  const INTERNO = ['ADMIN', 'COORDINADOR'];

  const esInterno = activo && (role === 'ADMIN' || role === 'COORDINADOR');
  const esSuperadmin = cargo(ADMIN, [AREAS.GERENCIA, AREAS.TI]);
  const veDatosPersonales = esSuperadmin || cargo(INTERNO, [AREAS.GESTION_HUMANA]);
  const editaRolArea = cargo(ADMIN, [AREAS.GERENCIA]) || cargo(INTERNO, [AREAS.TI, AREAS.GESTION_HUMANA]);
  const gestionaJornadas = esSuperadmin || cargo(INTERNO, [AREAS.PROYECTOS]);
  const supervisaMarketing = cargo(ADMIN, [AREAS.GERENCIA, AREAS.TI, AREAS.COMUNICACION]);

  return {
    esInterno,
    esVoluntario: role === 'VOLUNTARIO',
    veDatosPersonales,
    // Editar rol y área también da permiso para activar o desactivar (mismas reglas).
    editaRolArea,
    veHistorialCambios: cargo(ADMIN, [AREAS.GERENCIA, AREAS.TI, AREAS.GESTION_HUMANA]),
    veVoluntarios: veDatosPersonales || editaRolArea,
    gestionaJornadas,
    // Archivar, restaurar y borrar lugares (en la base: borra_lugares()). Editar
    // sus demás datos sigue siendo gestionaJornadas.
    archivaLugares: esSuperadmin || cargo(ADMIN, [AREAS.PROYECTOS]),
    supervisaMarketing,
    veMarketing: supervisaMarketing || cargo(INTERNO, [AREAS.COMUNICACION]),
  };
}

export type Nombre = { first_name: string | null; last_name: string | null; role: string | null };

// Nombre, apellido y rol de varias personas, para mostrar junto a jornadas, tareas o
// asistencias. Sale de la vista `perfiles_basicos`: el equipo interno ya no puede leer
// `profiles` completo de otras personas.
export async function fetchNombres(ids: (string | null | undefined)[]) {
  const unicos = [...new Set(ids.filter((id): id is string => !!id))];
  const nombres: Record<string, Nombre> = {};
  if (unicos.length === 0) return { nombres, error: null };

  const { data, error } = await supabase
    .from('perfiles_basicos')
    .select('id, first_name, last_name, role')
    .in('id', unicos);
  (data || []).forEach(p => { nombres[p.id] = p; });
  return { nombres, error };
}
