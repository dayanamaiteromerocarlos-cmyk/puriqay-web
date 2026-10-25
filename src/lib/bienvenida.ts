// Qué animación de Markus (DragonPeek.tsx) ya vio cada persona en este navegador.
// Se reproduce sola una única vez por versión: la primera vez que la persona entra
// a Inicio después de publicarla. Luego solo con el botón del ojo.
// Cuando TI publique una animación nueva, cambia VERSION_ANIMACION.
export const VERSION_ANIMACION = '2026-10-dragon-halloween-criollo';

const clave = (userId: string) => `puriqay:animacion:${userId}`;

// Sin almacenamiento (modo privado estricto) se da por vista: no se repite sola en
// cada visita a Inicio, y el botón sigue funcionando.
export const animacionVista = (userId: string) => {
  try { return localStorage.getItem(clave(userId)) === VERSION_ANIMACION; } catch { return true; }
};

export const marcarAnimacion = (userId: string) => {
  try { localStorage.setItem(clave(userId), VERSION_ANIMACION); } catch { /* sin almacenamiento */ }
};
