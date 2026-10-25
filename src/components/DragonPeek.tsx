import { useCallback, useEffect, useRef, useState } from 'react';
import { animacionVista, marcarAnimacion } from '../lib/bienvenida';

// Markus se asoma desde la esquina inferior derecha de Inicio: Markus Halloween
// saluda, se transforma en Markus criollo, este toca la guitarra y sale de la
// pantalla por la derecha (el video termina vacío). Se reproduce sola solo la
// primera vez que la persona ve esta versión (ver bienvenida.ts) y si su conexión
// alcanza; si no, o después, con el botón del ojo. La animación es decorativa: no
// recibe clics (pointer-events: none) y, al ser position: fixed, no mueve el layout.
const RUTA = '/media/dragon/dragon-esquina';
const DURACION_MS = 5600;
// Si sola no logra empezar en este tiempo (conexión lenta), se cancela sin marcarla
// como vista: queda el botón y se vuelve a intentar sola en la siguiente visita.
const ESPERA_AUTOMATICA_MS = 4000;

// Safari no muestra el canal alfa de WebM: ahí va el WebP animado. En iPhone/iPad
// todos los navegadores usan el motor de Safari (también Chrome o Firefox para iOS).
const usaWebP = () => {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/.test(ua);
  return ios || safari;
};

// Ahorro de datos activado o red 2G/3G. Solo Chrome/Edge (y Android) lo informan;
// en Safari y Firefox lo cubre ESPERA_AUTOMATICA_MS.
const conexionLenta = () => {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (!!c.saveData || /2g|3g/.test(c.effectiveType ?? ''));
};

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
// Desde 640 px (sm) es un 20 % menor que el tamaño original (clamp(217px,35.3vw,516px)).
const ancho = 'w-[clamp(136px,40.7vw,217px)] sm:w-[clamp(174px,28.2vw,413px)]';

// El WebP se descarga una vez (el de 570 px en pantallas chicas, el de 760 en las
// demás); cada repetición usa una URL blob nueva para que empiece desde el principio.
let webp: Promise<Blob> | null = null;
const cargarWebP = () => (webp ??= fetch(
  window.matchMedia('(max-width: 639px)').matches ? `${RUTA}-movil.webp` : `${RUTA}.webp`,
).then(r => {
  if (!r.ok) throw new Error(String(r.status));
  return r.blob();
}).catch(e => { webp = null; throw e; }));

type PropsAnimacion = { automatica: boolean; onEmpieza: () => void; onTerminar: () => void };

function Animacion({ automatica, onEmpieza, onTerminar }: PropsAnimacion) {
  const [modo] = useState(() => (usaWebP() ? 'webp' : 'video'));
  const video = useRef<HTMLVideoElement>(null);
  const [blob, setBlob] = useState<string | null>(null);
  const empezo = useRef(false);

  const empezar = useCallback(() => {
    if (empezo.current) return;
    empezo.current = true;
    onEmpieza();
  }, [onEmpieza]);

  // Sola, si no empieza a tiempo se abandona.
  useEffect(() => {
    if (!automatica) return;
    const t = setTimeout(() => { if (!empezo.current) onTerminar(); }, ESPERA_AUTOMATICA_MS);
    return () => clearTimeout(t);
  }, [automatica, onTerminar]);

  // El video arranca cuando el navegador estima que puede reproducirlo completo sin
  // detenerse (canplaythrough), no apenas tiene el primer cuadro. React no escribe
  // el atributo `muted` en el HTML y sin él se puede bloquear: se fija la propiedad.
  const reproducir = () => {
    const v = video.current;
    if (!v || empezo.current) return;
    v.muted = true;
    v.play().then(empezar).catch(onTerminar);
  };

  useEffect(() => {
    if (modo !== 'webp') return;
    let url: string | null = null;
    let vivo = true;
    cargarWebP()
      .then(b => { if (vivo) { url = URL.createObjectURL(b); setBlob(url); empezar(); } })
      .catch(() => { if (vivo) onTerminar(); });
    return () => { vivo = false; if (url) URL.revokeObjectURL(url); };
  }, [modo, empezar, onTerminar]);

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
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
        tabIndex={-1}
        onCanPlayThrough={reproducir}
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
// Mientras la animación se descarga tras pulsarlo, late y no acepta otro clic.
function BotonVerAnimacion({ cargando, onClick }: { cargando: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={cargando}
      aria-busy={cargando}
      aria-label={cargando ? 'Cargando la animación de Markus' : 'Ver la animación de Markus'}
      title={cargando ? 'Cargando la animación…' : 'Ver la animación de Markus'}
      className={`fixed right-4 bottom-4 z-30 w-12 h-12 rounded-full shadow-pq-card transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:shadow-pq-focus ${cargando ? 'animate-pulse cursor-wait' : ''}`}
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

type Estado = 'quieto' | 'cargando' | 'en_curso';

export default function DragonPeek({ userId }: { userId: string }) {
  // Sola, solo si esta versión es nueva para la persona y su conexión no es lenta.
  // También con "reducir movimiento": es una sola vez, breve y en una esquina.
  // Con el botón se reproduce siempre: es una acción suya.
  const [automatica, setAutomatica] = useState(
    () => !animacionVista(userId) && !conexionLenta());
  const [ronda, setRonda] = useState(automatica ? 1 : 0);
  const [estado, setEstado] = useState<Estado>(automatica ? 'cargando' : 'quieto');

  // Se da por vista solo cuando de verdad empezó sola.
  const empieza = useCallback(() => {
    setEstado('en_curso');
    if (automatica) marcarAnimacion(userId);
  }, [automatica, userId]);
  const terminar = useCallback(() => setEstado('quieto'), []);

  const verDeNuevo = () => {
    setAutomatica(false);
    setRonda(r => r + 1);
    setEstado('cargando');
  };

  return (
    <>
      {estado !== 'quieto' && (
        <Animacion key={ronda} automatica={automatica} onEmpieza={empieza} onTerminar={terminar} />
      )}
      {(estado === 'quieto' || (estado === 'cargando' && !automatica)) && (
        <BotonVerAnimacion cargando={estado === 'cargando'} onClick={verDeNuevo} />
      )}
    </>
  );
}
