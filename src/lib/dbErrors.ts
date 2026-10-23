// Códigos de error de Postgres que la app traduce a mensajes propios.

type ErrorConCodigo = { code?: string } | null | undefined;

// Un borrado rechazado porque otras filas dependen de la que se borra (llave
// foránea con ON DELETE RESTRICT): una jornada con asistencias, un lugar con
// jornadas. Postgres 17 (producción) responde 23503; versiones más nuevas, 23001.
export function esBorradoBloqueado(error: ErrorConCodigo) {
  return error?.code === '23503' || error?.code === '23001';
}
