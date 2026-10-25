# Apertura temática (Halloween + Canción Criolla)

Recurso guardado para más adelante: **no está conectado a la app**, no lo importa nada de `src/` y no entra en el build.

Es una animación de apertura al estilo de la de Pinterest: el ícono de Puriqay sobre el color sólido de siempre, el fondo pasa a un degradado temático, salen murciélagos desde detrás del ícono y dos maracas se agitan encima de él; al final el fondo se desvanece y los murciélagos siguen volando un instante sobre la vista siguiente. Dura unos 2,6 s, no usa imágenes ni librerías, y con "reducir movimiento" activado solo hace un desvanecimiento.

- `apertura.js` y `apertura.css`: la animación. El comentario al inicio de `apertura.js` explica cómo usarla (`PuriqayApertura.mostrar({ tema })`).
- `demo.html`: un marco de celular con un inicio de sesión simulado, para probarla con los tres temas (`atardecer`, `claro`, `noche`) y a distintas velocidades. Se abre servida por HTTP desde la raíz del repo (por ejemplo `npx serve .` → `/recursos/apertura-tematica/demo.html`); abierta como archivo no carga el logo.
