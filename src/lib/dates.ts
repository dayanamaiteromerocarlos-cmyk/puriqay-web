// Fecha de "hoy" en Lima como 'YYYY-MM-DD', sin importar la zona horaria del dispositivo.
//
// No usar `new Date().toISOString()` para esto: devuelve la fecha en UTC, que va 5 horas
// por delante de Perú, así que desde las 7 p. m. ya es "mañana" y las jornadas del día
// dejaban de listarse. Es la misma definición de "hoy" que aplica la base de datos en las
// políticas de `inscripciones` (`now() at time zone 'America/Lima'`).
//
// Se arma con formatToParts en vez de confiar en el formato de un locale concreto.
export const todayInLima = (now: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};
