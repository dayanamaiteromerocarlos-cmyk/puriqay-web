import { useCallback, useEffect, useRef, useState } from 'react';
import { animacionVista, marcarAnimacion } from '../lib/bienvenida';

// Markus se asoma desde la esquina inferior derecha de Inicio: Markus Halloween
// saluda, se transforma en Markus criollo, este toca la guitarra y sale de la
// pantalla por la derecha (el video termina vacío). Se reproduce solo la primera
// vez que la persona ve esta versión (ver bienvenida.ts); después, con el botón del
// ojo. La animación es decorativa: no recibe clics (pointer-events: none) y, al ser
// position: fixed, no mueve nada del layout.
const RUTA = '/media/dragon/dragon-esquina';
const DURACION_MS = 5600;

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

// En celular es más chico para no tapar el botón "Ver detalles" de las tarjetas.
const ancho = 'w-[clamp(136px,40.7vw,217px)] sm:w-[clamp(217px,35.3vw,516px)]';

// El WebP se descarga una vez; cada repetición usa una URL blob nueva para que el
// navegador lo reproduzca desde el principio sin volver a bajarlo.
let webp: Promise<Blob> | null = null;
const cargarWebP = () => (webp ??= fetch(`${RUTA}.webp`).then(r => {
  if (!r.ok) throw new Error(String(r.status));
  return r.blob();
}));

function Animacion({ onTerminar }: { onTerminar: () => void }) {
  const [modo] = useState(() => (usaWebP() ? 'webp' : 'video'));
  const video = useRef<HTMLVideoElement>(null);
  const [blob, setBlob] = useState<string | null>(null);

  // React no escribe el atributo `muted` en el HTML, y sin él algunos navegadores
  // bloquean el autoplay; se fija la propiedad y se intenta reproducir.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(onTerminar);
  }, [onTerminar]);

  useEffect(() => {
    if (modo !== 'webp') return;
    let url: string | null = null;
    let vivo = true;
    cargarWebP()
      .then(b => { if (vivo) { url = URL.createObjectURL(b); setBlob(url); } })
      .catch(() => { webp = null; if (vivo) onTerminar(); });
    return () => { vivo = false; if (url) URL.revokeObjectURL(url); };
  }, [modo, onTerminar]);

  // El WebP no avisa cuando termina: se espera lo que dura desde que se muestra.
  useEffect(() => {
    if (!blob) return;
    const t = setTimeout(onTerminar, DURACION_MS);
    return () => clearTimeout(t);
  }, [blob, onTerminar]);

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
        onEnded={onTerminar}
        onError={onTerminar}
        className={ancho}
        style={estilo}
      />
    );
  }
  if (!blob) return null;
  return <img src={blob} alt="" aria-hidden="true" draggable={false} className={ancho} style={estilo} />;
}

// Botón del ojo (color del logo, pq-brand), dibujado en SVG para que se vea nítido.
function BotonVerAnimacion({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ver la animación de Markus"
      title="Ver la animación de Markus"
      className="fixed right-4 bottom-4 z-30 w-12 h-12 rounded-full shadow-pq-card transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:shadow-pq-focus"
    >
      <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
        <circle cx="24" cy="24" r="24" className="fill-pq-brand" />
        <path d="M6 24 C12 14.2 36 14.2 42 24 C36 33.8 12 33.8 6 24 Z" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" />
        <circle cx="24" cy="24" r="8.6" fill="none" stroke="#fff" strokeWidth="2.4" />
        <circle cx="24" cy="24" r="3.7" fill="#fff" />
        <circle cx="25.7" cy="22.3" r="1.5" className="fill-pq-brand" />
      </svg>
    </button>
  );
}

export default function DragonPeek({ userId }: { userId: string }) {
  // Sola, solo si esta versión es nueva para la persona y no pidió menos movimiento.
  // Con el botón se reproduce siempre: es una acción suya.
  const [ronda, setRonda] = useState(() => (!animacionVista(userId) && !movimientoReducido() ? 1 : 0));
  const [enCurso, setEnCurso] = useState(ronda > 0);

  useEffect(() => { marcarAnimacion(userId); }, [userId]);

  const terminar = useCallback(() => setEnCurso(false), []);

  return enCurso
    ? <Animacion key={ronda} onTerminar={terminar} />
    : <BotonVerAnimacion onClick={() => { setRonda(r => r + 1); setEnCurso(true); }} />;
}
