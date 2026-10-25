# Sistema de diseño: reglas para editar el frontend

Reglas visuales de Puriqay Web. Salen del Design System "Puriqay" (un artefacto de Claude que vive fuera de este repo) y del lienzo de diseño donde se rediseñaron las vistas. Si algo de aquí choca con el código, manda esta guía; si choca con el Design System, se conversa antes de cambiar cualquiera de los dos.

Regla general: **usar siempre lo mismo y, si se hace algo nuevo, que no desentone con lo anterior.**

## Tokens

Están definidos una sola vez en `src/index.css` (`@theme`) y se usan como utilidades `bg-pq-*`, `text-pq-*`, `border-pq-*`. No se escriben colores sueltos en los componentes.

| Token | Valor | Uso |
|---|---|---|
| `pq-teal` | `#0e7a77` | Botón primario, enlaces, foco, elemento activo del menú |
| `pq-teal-dark` | `#0b6663` | Hover del primario, etiquetas de formulario, iconos del menú |
| `pq-teal-deep` | `#0b4d4b` | Títulos, texto sobre `pq-teal-50` |
| `pq-brand` | `#299a94` | Color del logo: barras, iconos, texto de 24px o más. **Nunca texto pequeño** |
| `pq-teal-50` | `#e3f4f2` | Fondos suaves, chips neutros, círculos de iconos |
| `pq-ink` / `pq-ink-muted` | `#1f2b2a` / `#5b6b69` | Texto principal / secundario, ayudas y placeholders |
| `pq-cream` | `#fdf8ec` | Fondo de página y de bloques internos |
| `pq-cream-dark` | `#e6dfcf` | **Solo** bordes decorativos y separadores |
| `pq-border` | `#768784` | **Borde de inputs, selects, textareas y controles** |
| `pq-marku` / `pq-marku-50` / `pq-marku-ink` | `#f5b72f` / `#fff4d6` / `#7a5300` | Acento puntual (el punto de los títulos, insignias). Avisos de atención: fondo `-50` con texto `-ink` |
| `pq-error` / `pq-error-50` | `#b42318` / `#fdecea` | Errores y acciones destructivas |
| `shadow-pq-card` | `0 8px 24px rgba(31,43,42,.08)` | La única sombra de tarjeta |
| `shadow-pq-focus` | anillo `pq-teal` 35 % | Foco de controles |

Proporción orientativa por pantalla: 70 % crema y blanco, 20 % verde, 10 % o menos de amarillo.

## Reglas que no se rompen

- **Sin degradados.** Colores planos.
- **Nunca texto blanco sobre amarillo.** Sobre `pq-marku` va `pq-ink`; sobre `pq-marku-50`, `pq-marku-ink`.
- **Contraste 4.5:1 en todo el texto.** Por eso `pq-brand` no se usa para texto chico.
- **Controles con borde `pq-border`** (3:1 o más). `pq-cream-dark` no sirve como borde de un control.
- **Objetivos táctiles de 44px como mínimo** (48px en botones de formulario y en celular).
- **Sin emojis en la interfaz nueva.** Se usan iconos de `lucide-react`. (Las vistas que se quedaron como estaban todavía tienen algunos.)
- **Errores claros y serios**: dicen qué pasó y qué hacer. Markus no aparece en errores.

## Tipografía

- **Montserrat** (`font-display`) para títulos; **Poppins** (`font-sans`) para todo lo demás.
- Títulos de página: 32px, peso **800** (`font-extrabold`), `pq-teal-deep`. En celular, 24–28px.
- Títulos de sección y de modal: 20–24px, peso 800, seguidos del **punto ámbar** (`w-2 h-2 rounded-full bg-pq-marku`).
- Las vistas rediseñadas usan 800; las que se dejaron como estaban (Marketing, Control de Asistencia, Mi Código QR, Completar perfil, Mi Perfil) conservan su 900 hasta que se rediseñen.
- Etiquetas de formulario: 14px, negrita, `pq-teal-dark`. El asterisco de obligatorio va en `pq-error`.

## Forma y espacio

- Radios: **12px** (`rounded-xl`) en inputs, botones y bloques internos; **20px** (`rounded-[20px]`) en tarjetas y modales; círculo completo en chips y avatares.
- Espaciado en múltiplos de 4px.
- Tarjetas: fondo blanco, sin borde grueso, `shadow-pq-card`. Las listas densas (filas de voluntarios, tarjetas de lugares) usan borde de 1px `pq-cream-dark` en vez de sombra; la fila o tarjeta abierta pasa a borde `pq-teal` de 1.5px.
- La barra superior verde (`border-t-[6px] border-t-pq-brand`) es exclusiva de las tarjetas de acceso (login, registro, contraseña).

## Componentes y patrones

Las piezas reutilizables están en `src/components/JornadaUI.tsx` (`EncabezadoPagina`, `ChipLinea`, `TarjetaJornada`, `ImagenJornada`, `Modal`, `BotonPrimario`, `BotonSecundario`, `inputClass`, `labelClass`). Las imágenes (logo, Markus) están en `public/img/`.

### Menú lateral (escritorio)
- Blanco, 256px, borde derecho `pq-cream-dark`.
- Cabecera de 80px con el logotipo "Puriqay +" (`public/img/puriqay-plus-wordmark.png`, 44px de alto) a la izquierda y el botón de contraer a la derecha. Contraído (80px de ancho) solo se ve el isotipo "P" en círculo (`puriqay-p-circulo.png`, 44×44), que es a la vez el botón de expandir.
- Tarjeta de rol en `pq-cream`: rol en mayúsculas y, debajo, el área.
- Ítems: 16px, icono de 22px. Activo: fondo `pq-teal`, texto blanco y sombra suave. Inactivo: texto `pq-ink` al 70 % con icono `pq-teal-dark` al 70 %.
- Pie: el nombre corto (abre Mi Perfil) y "Cerrar Sesión" en `pq-error`.
- En pantallas de 800px de alto o menos (variante `pantalla-baja:`, p. ej. laptops de 1366×768) la cabecera baja a 64px, los ítems a 40px y los espacios se reducen, para que entren todas las secciones sin desplazar. Contraído, el menú nunca muestra barra de desplazamiento.
- **Inicio** y **Mis asistencias** los ven todos: voluntarios externos, personal interno y admins. El resto de secciones dependen del rol y el área (`permisos.ts`).

### Celular
- Cabecera de 72px: logotipo "Puriqay +" de 40px de alto a la izquierda y botón ☰ de 44px a la derecha (el panel del menú usa el mismo logotipo).
- El menú se abre como panel lateral desde la derecha (300px), con el fondo oscurecido y una ✕ para cerrar.
- Todo en una columna; los botones principales ocupan el ancho completo.
- Los modales largos ocupan toda la pantalla, con los botones fijos abajo; los cortos salen desde abajo.

### Encabezado de página
Título de página y, debajo, una línea de descripción en `pq-ink-muted`.

### Botones
- **Primario**: fondo `pq-teal`, texto blanco, sombra `shadow-lg shadow-pq-teal/30`.
- **Secundario** (incluye "Cancelar" y "Ver detalles"): fondo blanco, borde 1.5px `pq-teal`, texto `pq-teal`.
- **Peligro**: fondo `pq-error`, texto blanco ("Confirmar Inasistencia", "Borrar"). Variante con borde `pq-error` para acciones como "No asistiré" o "Desactivar".
- Botones de icono (editar, archivar, borrar): 36px, fondo `pq-cream`, icono `pq-teal-dark`; borrar en `pq-error`; deshabilitado al 25 % de opacidad.

### Formularios
- Input: `border-[1.5px] border-pq-border rounded-xl bg-white`, mínimo 48px de alto, foco `focus:border-pq-teal focus:shadow-pq-focus`.
- Campo bloqueado (por ejemplo, fecha de una jornada con asistencias): fondo `pq-cream`, texto `pq-ink-muted`, candado junto a la etiqueta en lugar del asterisco y un aviso `pq-marku-50` que explica por qué.
- Separador antes de los botones del pie: `border-t border-pq-cream-dark` (línea fina, no punteada, en las vistas rediseñadas).

### Modales
- Fondo `pq-ink` al 45 %, tarjeta blanca de radio 20px y 32px de padding.
- Título de 24px peso 800 con el punto ámbar; descripción opcional en `pq-ink-muted`.
- ✕ de cerrar (44px, fondo `pq-cream`) en los modales de formulario.
- Pie alineado a la derecha: secundario "Cancelar" y luego la acción principal.
- Confirmaciones (archivar, restaurar, borrar): `ConfirmDialog`, nunca `confirm()`.

### Chips
- **Línea de acción: un color por línea**, los de `getActionLineColor` en `src/lib/catalogs.ts` (Animalista naranja, Ambiental verde, Social azul, Educativo morado, Salud rojo). Son categóricos a propósito.
- **Estado de asistencia**: Asistió `pq-teal-50`/`pq-teal-deep`; Faltó `pq-marku-50`/`pq-marku-ink`; Justificó `pq-cream` con borde `pq-cream-dark` y texto `pq-ink-muted`.
- **Estado de jornada** (admin): Hoy `pq-teal` sólido; Próxima `pq-marku-50`; Pasada neutro.
- **Activo/Inactivo**: `pq-teal-50` / `pq-error-50`. **Externo**: `pq-marku-50`.
- Estados de Marketing: se mantienen los actuales (Pendiente gris, En Revisión azul, Observado ámbar, Publicado verde; extensión de plazo morado).

### Tarjetas de jornada
Imagen arriba (por ahora Markus con lentes, `public/img/markus-lentes.png`; componente `ImagenJornada` de `JornadaUI.tsx`) sobre fondo `pq-marku-50`, chip de línea, nombre en Montserrat 700, fecha, horario y lugar con iconos de 16px en `pq-ink-muted`, y la acción al pie separada por una línea `pq-cream-dark`. Sin cupos ni avatares de inscritos.

### Error de carga
Tarjeta blanca con borde 1.5px `pq-error` al 25 %, icono en círculo `pq-error-50`, título "No pudimos cargar los datos" (Montserrat 700), el mensaje en `pq-ink-muted` (monoespaciado si es técnico) y botón "Reintentar" con borde `pq-error`.

## Markus

Aparece en bienvenidas, estados vacíos, cargas y como imagen provisional de las jornadas. Nunca dentro de formularios ni tablas, ni en errores. Los mensajes de carga pueden tener su voz; los de error, no.

## Tono

Tratar de "tú", frases cortas y verbos directos ("Inscribirme", "Guardar cambios"). Los errores dicen qué pasó y qué hacer.
