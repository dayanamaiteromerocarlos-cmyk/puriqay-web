// Marca de "Markus ya se animó en esta sesión" (DragonPeek.tsx). Va en
// localStorage junto a la sesión de Supabase, que también vive ahí, y guarda solo
// "usuario:hora del login", nunca tokens. Al cerrar sesión se borra.
const CLAVE = 'puriqay:bienvenida';

export const bienvenidaVista = (marca: string) => {
  try { return localStorage.getItem(CLAVE) === marca; } catch { return false; }
};

export const marcarBienvenida = (marca: string) => {
  try { localStorage.setItem(CLAVE, marca); } catch { /* sin almacenamiento */ }
};

export const olvidarBienvenida = () => {
  try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
};
