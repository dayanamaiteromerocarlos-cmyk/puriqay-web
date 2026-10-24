// Patrones de validación compartidos entre el registro (fase 1, Register.tsx) y el
// modal de perfil progresivo (CompleteProfileModal.tsx), para que las reglas no
// diverjan entre ambos formularios.
//
// Se usan como atributo `pattern` de HTML5: el navegador los ancla automáticamente
// (equivale a ^...$), y el atributo `title` es el mensaje que muestra al fallar.
//
// Nota: se usan clases explícitas ([0-9] en vez de \d) a propósito. En un string de
// JS, "\d" se colapsa a "d" y el patrón terminaría exigiendo la letra d.
//
// IMPORTANTE: dentro de una clase [...] hay que escapar el guion y la barra (\- y \/).
// Los navegadores compilan `pattern` con la bandera `v`, que los trata como caracteres
// reservados, y si el patrón no compila la spec manda IGNORARLO por completo: el campo
// se queda SIN validación, en silencio y sin error en consola. No quitar esos escapes
// aunque parezcan innecesarios (con la bandera `u` antigua sí lo serían).

const LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";

export const PATTERNS = {
  // Solo letras y espacios; permite nombres compuestos ("Ana María", "D'Angelo", "Vargas-Llosa").
  // Tolera espacios de más al inicio, al final o entre palabras (un espacio final al
  // pegar o autocompletar no tenía salida); limpiarNombre() los quita al guardar.
  // El guion va dentro de [...]: fuera de una clase, "\-" no compila con la bandera `v`.
  soloLetras: ` *[${LETRAS}]+(?:(?: +|['\\-])[${LETRAS}]+)* *`,

  // DNI peruano: exactamente 8 dígitos.
  dni: "[0-9]{8}",

  // Celular peruano: exactamente 9 dígitos.
  celular: "[0-9]{9}",

  // Dirección: debe combinar letras y números (ej. "Av. Los Olivos 123").
  direccion: `(?=.*[${LETRAS}])(?=.*[0-9])[${LETRAS}0-9 .,#°\\/\\-]+`,

  // Contraseña: mínimo 10 caracteres, con minúscula, mayúscula, número y símbolo.
  password: "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{10,}",
} as const;

export const TITLES = {
  soloLetras: 'Solo se permiten letras y espacios.',
  dni: 'El DNI debe tener exactamente 8 números.',
  celular: 'El celular debe tener exactamente 9 números.',
  direccion: 'La dirección debe combinar letras y números (ej. Av. Los Olivos 123).',
  password: 'Mínimo 10 caracteres, con mayúscula, minúscula, número y símbolo (ej. Puriqay2026!).',
} as const;

// Quita los espacios de los extremos y deja uno solo entre palabras, para guardar
// "Anthony Melgarejo" aunque se haya escrito "Anthony  Melgarejo ".
export const limpiarNombre = (valor: string) => valor.trim().replace(/\s+/g, ' ');

// Límites para la fecha de nacimiento: entre 15 y 100 años de edad.
// Se arma la clave con componentes locales para evitar el corrimiento de día de toISOString().
const pad = (n: number) => n.toString().padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const birthDateLimits = () => {
  const hoy = new Date();
  const max = new Date(hoy.getFullYear() - 15, hoy.getMonth(), hoy.getDate());
  const min = new Date(hoy.getFullYear() - 100, hoy.getMonth(), hoy.getDate());
  return { min: dateKey(min), max: dateKey(max) };
};
