# Animación de bienvenida de Markus

Markus Halloween se asoma en la esquina inferior derecha de **Inicio**, se transforma en Markus criollo, toca la guitarra y se va. El componente es [`src/components/DragonPeek.tsx`](../src/components/DragonPeek.tsx), se muestra desde `Inicio.tsx`, y la regla de "ya la vio" está en [`src/lib/bienvenida.ts`](../src/lib/bienvenida.ts).

## Qué se ve (5,6 s)

| Tiempo | Fase |
|---|---|
| 0,0 – 2,0 s | **Saludo:** Markus Halloween se asoma desde la esquina y saluda con la mano. |
| 2,0 – 2,8 s | **Transformación:** una ola de magia dorada con destellos lo cruza de izquierda a derecha y le cambia el traje a Markus criollo. |
| 2,8 – 4,5 s | **Guitarra y guiño:** Markus criollo toca, guiña un ojo y salen notas musicales (♪ ♫) hacia la página. |
| 4,5 – 5,6 s | **Salida:** toma impulso y sale por la derecha con dos saltitos; la esquina queda vacía. |

- Aparece solo en Inicio.
- Es decorativa: `pointer-events: none` y `position: fixed`, así que no bloquea clics ni mueve el layout.
- Tamaño: unos 385 px de ancho en una pantalla de 1366 px (como máximo 413 px) y unos 153 px en celular (menos de 640 px).

## Cuándo se reproduce sola

Una única vez por cada versión de la animación: la primera vez que la persona entra a Inicio después de que se publica. Después ya no aparece sola: ni en sus siguientes sesiones, ni al volver a Inicio desde otra sección, ni al recargar. Desde ahí, se ve solo con el botón.

No aparece sola si:

1. Ya la vio en esa versión, en ese navegador.
2. Tiene **ahorro de datos** activado o una red **2G/3G** (Network Information API; solo la informan Chrome, Edge y Android).
3. No logra empezar en **4 segundos** por conexión lenta. Esto también cubre Safari y Firefox.

Con **reducir movimiento** (`prefers-reduced-motion`) activado sí aparece sola, a propósito: es una sola vez, dura 5,6 s y ocupa solo una esquina.

En los casos 2 y 3 no se marca como vista: en la siguiente visita lo vuelve a intentar sola. El video arranca en `canplaythrough`, es decir, cuando el navegador estima que puede reproducirlo completo sin trabarse.

## El botón del ojo

- Círculo `pq-brand` con un ojo blanco, dibujado en SVG, abajo a la derecha y solo en Inicio.
- Al pulsarlo reproduce la animación completa, siempre, aunque ya la haya visto, porque es una acción de la persona.
- Mientras la animación se ve, el botón se oculta y reaparece al terminar.
- Con internet lento, el botón late mientras la animación se descarga y no acepta otro clic.
- Se puede usar con teclado; los lectores de pantalla lo anuncian como "Ver la animación de Markus".

## Archivos por navegador

Están en `public/media/dragon/`. Cada persona descarga solo el que le corresponde, y al repetir con el botón no se vuelve a descargar.

| Navegador | Archivo | Peso |
|---|---|---|
| Chrome, Edge, Firefox | `dragon-esquina.webm`: VP9 con transparencia, 760×720 | 1,9 MB |
| Safari en pantalla grande (Mac) | `dragon-esquina.webp`: WebP animado, 760×720 | 4,0 MB |
| iPhone, iPad y celulares con Safari | `dragon-esquina-movil.webp`: WebP animado, 570×540 | 2,8 MB |

Safari no muestra el canal alfa de WebM, y en iOS todos los navegadores usan su motor; por eso ahí va el WebP.

## Publicar una animación nueva

1. Reemplazar los archivos de `public/media/dragon/`, con los mismos nombres y la misma proporción (760×720, que deja espacio transparente a la izquierda del personaje).
2. Cambiar el texto de `VERSION_ANIMACION` en `src/lib/bienvenida.ts`, por ejemplo de `'2026-10-dragon-halloween-criollo'` a `'2026-12-dragon-navidad'`.

Con eso, todas las personas la verán sola una vez más. Si la nueva no dura 5,6 s, ajustar también `DURACION_MS` en `DragonPeek.tsx`, porque el WebP no avisa cuándo termina.

## Limitaciones

- "Ya la vio" se guarda en `localStorage`, por usuario y por navegador. Desde otro dispositivo, o tras borrar los datos del navegador, la persona la verá sola una vez más. Para que sea una sola vez en total habría que guardarlo en la base de datos, con una migración en el repositorio del backend.
- No se probó en un Safari ni en un iPhone reales; ese comportamiento se verificó simulando el navegador desde Edge.
