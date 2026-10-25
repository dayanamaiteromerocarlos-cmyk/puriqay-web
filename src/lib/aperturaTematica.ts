// Apertura temática de la app instalada (Halloween + Canción Criolla), al estilo de la
// de Pinterest. Sigue a la pantalla de inicio que dibuja el sistema (fondo blanco del
// manifest con el ícono): el ícono crece; luego salen murciélagos desde detrás de él y
// dos maracas se agitan encima; al final fondo e ícono se desvanecen y los murciélagos
// siguen un instante sobre la app.
// El recurso completo, con otros temas y una página de prueba, está en
// recursos/apertura-tematica/.
import './aperturaTematica.css';

// Contorno de la "P" de Puriqay en una caja de 100×100.
const RUTA_P = 'M58.33 29.75 L56.97 29.30 L53.12 29.30 L50.59 30.14 L47.66 32.36 L46.61 33.66 L45.70 35.94 L45.38 38.41 L45.77 39.97 L46.61 41.67 L47.33 42.38 L48.70 42.90 L49.09 42.45 L47.98 39.39 L47.98 37.89 L49.15 35.87 L51.56 34.31 L53.45 34.31 L55.86 35.87 L57.03 38.28 L56.58 40.36 L55.08 42.58 L51.30 44.86 L43.95 46.94 L39.91 48.96 L34.11 54.36 L32.55 56.32 L30.53 59.96 L28.91 65.23 L28.91 67.51 L28.52 68.36 L28.91 72.98 L30.14 77.08 L32.16 81.12 L34.18 83.07 L35.94 83.53 L36.78 83.46 L37.04 83.07 L37.04 81.51 L35.48 75.72 L35.48 72.66 L35.09 71.81 L35.09 64.84 L35.87 61.33 L37.57 57.10 L39.26 54.95 L42.25 52.41 L47.46 49.61 L54.17 46.68 L57.10 44.60 L59.24 41.93 L59.70 40.56 L59.70 37.50 L58.79 35.22 L56.51 32.94 L54.75 32.29 L54.17 31.71 L56.97 31.58 L59.24 32.49 L61.20 34.05 L62.50 36.72 L62.50 40.17 L60.03 44.79 L56.90 47.92 L53.26 49.93 L48.24 51.63 L43.42 54.43 L40.76 57.10 L38.80 60.22 L37.50 63.67 L37.11 67.90 L36.72 68.75 L37.11 79.30 L37.50 81.32 L38.35 82.62 L39.71 82.62 L41.34 80.01 L41.34 75.00 L41.73 74.15 L42.12 67.97 L43.29 62.89 L44.53 59.18 L45.38 57.88 L49.09 54.10 L50.85 52.80 L57.94 49.87 L61.20 47.85 L62.70 46.35 L63.93 44.27 L65.17 40.17 L65.17 38.28 L64.32 35.35 L63.48 33.66 L61.78 31.90ZM58.92 15.62 L54.62 14.84 L49.22 15.23 L43.95 16.47 L39.52 18.49 L36.00 20.83 L32.16 24.67 L30.14 28.32 L28.91 32.42 L28.97 35.68 L30.53 37.70 L33.79 39.13 L33.59 44.08 L34.44 47.79 L35.29 49.48 L35.94 49.93 L36.59 49.80 L38.74 47.33 L42.38 45.57 L41.34 42.90 L41.34 38.67 L43.42 32.88 L46.94 29.75 L52.34 27.67 L54.30 27.28 L57.36 27.28 L59.51 27.73 L62.76 29.36 L66.28 33.27 L67.97 37.50 L67.97 41.34 L67.12 43.88 L65.49 46.74 L62.76 49.48 L60.42 51.04 L56.38 53.06 L52.54 54.36 L48.11 56.77 L46.22 58.59 L45.38 59.96 L45.38 61.00 L46.29 61.59 L47.53 61.13 L51.76 58.20 L59.11 55.34 L63.93 52.93 L67.06 50.59 L70.12 46.74 L72.14 42.71 L73.37 38.61 L73.37 32.03 L72.53 28.71 L70.51 24.67 L68.55 21.94 L65.89 19.27 L63.54 17.71Z';

// Colores: el fondo inicial y el ícono son los del manifest (vite.config.ts) y de
// public/pwa-*.png, para que no se note el paso desde la pantalla del sistema.
const COLORES = {
  base: '#ffffff',
  icono: '#0e7a77', // pq-teal
  p: '#ffffff',
  murcielago: '#2B2230',
  nota: '#0b4d4b', // pq-teal-deep
};

// Destino de cada murciélago: x, y como fracción de medio ancho / medio alto desde el
// centro, escala y giro.
const MURCIELAGOS: [number, number, number, number][] = [
  [-0.72, -0.50, 1.00, -14], [0.78, -0.46, 0.92, 16], [-0.30, -0.78, 0.80, -8],
  [0.34, -0.74, 1.05, 10], [-0.92, -0.16, 0.85, -24], [0.94, -0.10, 0.90, 24],
];

// Momentos de la animación en ms.
const T = {
  tema: 350,        // el ícono crece
  murcielagos: 650, // salen los murciélagos
  maracas: 750,     // salen las maracas
  salida: 2100,     // fondo e ícono se desvanecen
  fin: 2750,        // se quita la apertura
};

const ALA = 'M52 22C60 10 75 6 96 12C88 16 86 22 88 28C82 25 77 26 74 31C70 27 64 27 60 31C58 27 55 26 52 28Z';
const SVG_MURCIELAGO =
  '<svg viewBox="0 0 100 50" aria-hidden="true">' +
  `<g class="pq-ap-ala pq-ap-ala-der"><path d="${ALA}"/></g>` +
  `<g class="pq-ap-ala pq-ap-ala-izq"><path transform="translate(100 0) scale(-1 1)" d="${ALA}"/></g>` +
  '<ellipse cx="50" cy="26" rx="5.5" ry="9"/>' +
  '<path d="M45.5 19L46.5 12L49 17.5H51L53.5 12L54.5 19Z"/>' +
  '</svg>';

// Maraca: cabeza de color con una franja en zigzag y puntos, y mango de madera.
let idClip = 0;
const svgMaraca = (cabeza: string, franja: string, puntos: string) => {
  const id = `pq-ap-clip-${++idClip}`;
  return '<svg viewBox="0 0 60 120" aria-hidden="true">' +
    `<defs><clipPath id="${id}"><ellipse cx="30" cy="42" rx="27" ry="36"/></clipPath></defs>` +
    '<rect x="25" y="70" width="10" height="46" rx="5" fill="#B9773E"/>' +
    '<rect x="24" y="72" width="12" height="7" rx="2" fill="#8E5427"/>' +
    `<ellipse cx="30" cy="42" rx="27" ry="36" fill="${cabeza}"/>` +
    `<g clip-path="url(#${id})">` +
    `<path fill="${franja}" d="M0 38L8 31L16 38L24 31L32 38L40 31L48 38L56 31L62 36V46L56 41L48 48L40 41L32 48L24 41L16 48L8 41L0 48Z"/>` +
    '</g>' +
    `<g fill="${puntos}"><circle cx="18" cy="20" r="3"/><circle cx="40" cy="18" r="3"/><circle cx="30" cy="64" r="3"/><circle cx="14" cy="58" r="2.5"/><circle cx="46" cy="58" r="2.5"/></g>` +
    '<ellipse cx="19" cy="26" rx="5" ry="10" fill="#fff" opacity="0.25"/>' +
    '</svg>';
};

const crear = (clase: string, html?: string) => {
  const el = document.createElement('div');
  el.className = clase;
  if (html) el.innerHTML = html;
  return el;
};

// Ubica una pieza con su centro en el centro de la pantalla.
const centrar = (el: HTMLElement, ancho: number, alto = ancho) => {
  el.style.width = `${ancho}px`;
  el.style.height = `${alto}px`;
  el.style.marginLeft = `${-ancho / 2}px`;
  el.style.marginTop = `${-alto / 2}px`;
};

const anim = (el: Element, cuadros: Keyframe[], op: KeyframeAnimationOptions) =>
  el.animate(cuadros, { fill: 'forwards', ...op });

// Pone la apertura encima de la app y la quita sola al terminar.
export function mostrarApertura(): Promise<void> {
  const ancho = window.innerWidth;
  const alto = window.innerHeight;
  const icono = Math.round(Math.min(180, Math.max(120, Math.min(ancho, alto) * 0.42)));
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const raiz = crear('pq-apertura');
  raiz.setAttribute('aria-hidden', 'true');
  Object.entries(COLORES).forEach(([nombre, valor]) => raiz.style.setProperty(`--pq-ap-${nombre}`, valor));

  // Tres capas: fondo blanco, vuelo (murciélagos, maracas y notas) e ícono. El ícono va
  // encima del vuelo, así todo parece salir de detrás de él; y el vuelo se desvanece
  // después que el fondo, por eso queda flotando sobre la app.
  const capaFondo = crear('pq-ap-capa pq-ap-base');

  const capaVuelo = crear('pq-ap-capa');
  const capaIcono = crear('pq-ap-capa');
  // Mismo ícono que public/pwa-512x512.png: la P blanca sobre un círculo pq-teal.
  const ico = crear('pq-ap-pieza pq-ap-icono',
    '<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="translate(50 50) scale(0.9) translate(-50 -50)">' +
    `<path fill="var(--pq-ap-p)" fill-rule="evenodd" d="${RUTA_P}"/></g></svg>`);
  centrar(ico, icono);
  capaIcono.append(ico);

  raiz.append(capaFondo, capaVuelo, capaIcono);
  document.body.append(raiz);

  const salir = 'cubic-bezier(.4,0,.2,1)';

  return new Promise((resolver) => {
    const terminar = (ms: number) => setTimeout(() => { raiz.remove(); resolver(); }, ms);

    if (reducir) {
      anim(raiz, [{ opacity: 1 }, { opacity: 0 }], { delay: 600, duration: 300 });
      terminar(950);
      return;
    }

    // 1. El ícono crece un poco.
    anim(ico, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }],
      { delay: T.tema, duration: 500, easing: 'cubic-bezier(.34,1.56,.64,1)' });

    // 2. Murciélagos: salen del borde de arriba del ícono, se abren en abanico creciendo,
    //    siguen flotando y al final se alejan sobre la app.
    const baseMurcielago = icono * 0.42;
    const salida0 = `translate(0px, ${-icono * 0.18}px)`;
    MURCIELAGOS.forEach(([fx, fy, s, giro], i) => {
      const m = crear('pq-ap-pieza pq-ap-murcielago', SVG_MURCIELAGO);
      centrar(m, baseMurcielago, baseMurcielago / 2);
      m.style.opacity = '0';
      m.querySelectorAll<SVGGElement>('.pq-ap-ala').forEach((ala) => {
        ala.style.animationDuration = `${0.13 + (i % 4) * 0.025}s`;
        ala.style.animationDelay = `${-i * 0.05}s`;
      });
      capaVuelo.append(m);

      const dx = fx * ancho / 2, dy = fy * alto / 2;
      const retraso = T.murcielagos + i * 40;
      // Llegan en ~1,1 s; los últimos en salir, un poco antes, para alcanzar a flotar.
      const llegada = Math.min(0.9, 1100 / (T.salida - retraso));
      const flotando = `translate(${dx * 1.08}px, ${dy * 1.08 - 8}px) scale(${s * 1.04}) rotate(${giro}deg)`;
      anim(m, [
        { offset: 0, opacity: 0, transform: `${salida0} scale(.2) rotate(0deg)` },
        { offset: 0.08, opacity: 1 },
        { offset: llegada / 2, transform: `translate(${dx * 0.45}px, ${dy * 0.7}px) scale(${s * 0.7}) rotate(${giro * 0.5}deg)` },
        { offset: llegada, opacity: 1, transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(${giro}deg)` },
        { offset: 1, opacity: 1, transform: flotando },
      ], { delay: retraso, duration: T.salida - retraso, easing: 'ease-out' });
      anim(m, [
        { opacity: 1, transform: flotando },
        { opacity: 0, transform: `translate(${dx * 1.6}px, ${dy * 1.6 - 30}px) scale(${s * 1.35}) rotate(${giro * 1.3}deg)` },
      ], { delay: T.salida, duration: T.fin - T.salida - 50, easing: 'ease-in' });
    });

    // 3. Maracas: una criolla (roja y blanca) y una de Halloween (naranja y negra). Salen
    //    de detrás del ícono y quedan encima de él en V, con los mangos juntos abajo; se
    //    agitan, sueltan notas y al final se van con los murciélagos.
    const anchoMaraca = icono * 0.18;
    const altoMaraca = anchoMaraca * 2;
    const yMaraca = -(icono * 0.56 + altoMaraca / 2 + 6);
    ([
      [-1, svgMaraca('#D62839', '#FFFFFF', '#F7C548')],
      [1, svgMaraca('#F28C28', '#2B1A2F', '#FFF4D6')],
    ] as const).forEach(([lado, svg], i) => {
      const ma = crear('pq-ap-pieza pq-ap-maraca', svg);
      centrar(ma, anchoMaraca, altoMaraca);
      ma.style.opacity = '0';
      capaVuelo.append(ma);

      const x = lado * icono * 0.16, y = yMaraca, giro = lado * 24;
      const enSuSitio = `translate(${x}px, ${y}px) scale(1) rotate(${giro}deg)`;
      anim(ma, [
        { opacity: 0, transform: 'translate(0px, 0px) scale(.3) rotate(0deg)' },
        { opacity: 1, transform: enSuSitio },
      ], { delay: T.maracas + i * 60, duration: 450, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      anim(ma.querySelector('svg')!, [
        { transform: 'rotate(0deg)' }, { transform: `rotate(${-lado * 16}deg)` },
        { transform: `rotate(${lado * 12}deg)` }, { transform: `rotate(${-lado * 16}deg)` },
        { transform: `rotate(${lado * 12}deg)` }, { transform: `rotate(${-lado * 14}deg)` },
        { transform: `rotate(${lado * 10}deg)` }, { transform: 'rotate(0deg)' },
      ], { delay: T.maracas + 350 + i * 60, duration: 900, easing: 'ease-in-out' });
      anim(ma, [
        { opacity: 1, transform: enSuSitio },
        { opacity: 0, transform: `translate(${x * 2.5}px, ${y - 40}px) scale(1.15) rotate(${giro * 1.4}deg)` },
      ], { delay: T.salida, duration: T.fin - T.salida - 50, easing: 'ease-in' });

      // Notas musicales que suben desde la cabeza de cada maraca.
      ['♪', '♫'].forEach((nota, j) => {
        const n = crear('pq-ap-pieza pq-ap-nota');
        n.textContent = nota;
        centrar(n, 22);
        capaVuelo.append(n);
        const x0 = x + lado * altoMaraca * 0.3, y0 = y - altoMaraca * 0.35;
        anim(n, [
          { opacity: 0, transform: `translate(${x0}px, ${y0}px) scale(.6) rotate(0deg)` },
          { opacity: 1, offset: 0.25 },
          { opacity: 1, offset: 0.7 },
          { opacity: 0, transform: `translate(${x0 + lado * 40}px, ${y0 - 70 - j * 20}px) scale(1.1) rotate(${lado * 15}deg)` },
        ], { delay: T.maracas + 450 + j * 220 + i * 90, duration: 950, easing: 'ease-out' });
      });
    });

    // 4. Salida: fondo e ícono se desvanecen; el vuelo sigue un poco más (arriba).
    anim(capaFondo, [{ opacity: 1 }, { opacity: 0 }], { delay: T.salida, duration: 350, easing: salir });
    anim(ico, [{ opacity: 1, transform: 'scale(1.12)' }, { opacity: 0, transform: 'scale(1.3)' }],
      { delay: T.salida, duration: 320, easing: salir });
    // Desde aquí la app ya se puede tocar.
    setTimeout(() => { raiz.style.pointerEvents = 'none'; }, T.salida);
    terminar(T.fin);
  });
}
