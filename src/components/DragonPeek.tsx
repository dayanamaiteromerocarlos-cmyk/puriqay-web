import { useEffect, useRef, useState } from 'react';
import { bienvenidaVista, marcarBienvenida } from '../lib/bienvenida';

// Markus se asoma desde la esquina inferior derecha de Inicio una vez por sesión:
// Markus Halloween saluda, se transforma en Markus criollo, este toca la guitarra y
// sale de la pantalla por la derecha (el video termina vacío). Al volver a Inicio en
// la misma sesión no se muestra. Es decorativo: no recibe clics (pointer-events:
// none) y, al ser position: fixed, no mueve nada del layout.
const RUTA = '/media/dragon/dragon-esquina';

// Safari no muestra el canal alfa de WebM: ahí va el WebP animado. En iPhone/iPad
// todos los navegadores usan el motor de Safari (también Chrome o Firefox para iOS).
const usaWebP = () => {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/.test(ua);
  return ios || safari;
};

const movimientoReducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// El cuadro mide 760×720: a la izquierda del dragón deja espacio transparente para
// las notas musicales que salen de la guitarra.
const estilo = {
  position: 'fixed',
  right: 0,
  bottom: 0,
  height: 'auto',
  aspectRatio: '760 / 720',
  pointerEvents: 'none',
  zIndex: 30,
} as const;

// Anchos de 560 px de dragón (clamp(160px, 26vw, 380px)) llevados al cuadro de 760.
// En celular es más chico para no tapar el botón "Ver detalles" de las tarjetas.
const ancho = 'w-[clamp(136px,40.7vw,217px)] sm:w-[clamp(217px,35.3vw,516px)]';

type Modo = 'video' | 'webp' | 'poster' | 'nada';

export default function DragonPeek({ marcaSesion }: { marcaSesion: string }) {
  // Es una SPA sin render en servidor, así que se puede decidir al montar. Con
  // movimiento reducido se muestra quieto (el criollo) en vez de animarse.
  const [modo] = useState<Modo>(() =>
    movimientoReducido() ? 'poster' : bienvenidaVista(marcaSesion) ? 'nada' : usaWebP() ? 'webp' : 'video');
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (modo === 'video' || modo === 'webp') marcarBienvenida(marcaSesion);
  }, [modo, marcaSesion]);

  // React no escribe el atributo `muted` en el HTML, y sin él algunos navegadores
  // bloquean el autoplay; se fija la propiedad y se intenta reproducir.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => { /* sin autoplay: no se ve nada, el primer cuadro es vacío */ });
  }, []);

  if (modo === 'nada') return null;

  if (modo === 'video') {
    return (
      <video
        ref={video}
        src={`${RUTA}.webm`}
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
        tabIndex={-1}
        className={ancho}
        style={estilo}
      />
    );
  }

  return (
    <img
      src={modo === 'webp' ? `${RUTA}.webp` : `${RUTA}-poster.png`}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
      className={ancho}
      style={estilo}
    />
  );
}
