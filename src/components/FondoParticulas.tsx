import { useEffect, useRef } from 'react';

// Colores de la paleta (los mismos tokens de index.css, en RGB para dibujar en canvas)
const COLORES = ['17,143,140', '18,114,110', '33,81,77', '245,166,35', '79,179,173'];
// Pavesas: sobre todo naranjas y ámbar (el naranja de Marku), con algún verde agua de la marca
const COLORES_PAVESA = ['245,166,35', '245,166,35', '255,196,92', '240,120,40', '255,196,92', '17,143,140', '79,179,173'];

// Tras soltar el dedo, cuánto se queda el anillo donde tocaste antes de volver a deambular
const ESPERA_TACTIL_MS = 2500;

// Partículas por cada 10 000 px² de pantalla (guiones del anillo / pavesas)
const DENSIDAD_ANILLO = 2.5;
const DENSIDAD_PAVESAS = 3.5;

const azar = (min: number, max: number) => min + Math.random() * (max - min);
const elegir = (lista: string[]) => lista[Math.floor(Math.random() * lista.length)];

type Particula = {
  x: number;
  y: number;
  fase: number;
  vel: number;
  color: string;
  // Solo pavesas: subida (px/s), vaivén lateral (px), tamaño (px), parpadeo (rad/s) y vida (0 → 1 en `duracion` s)
  sube: number;
  vaiven: number;
  tam: number;
  parpadeo: number;
  vida: number;
  duracion: number;
};

/**
 * Fondo animado detrás de las pantallas de acceso. Con mouse: guiones de colores
 * que forman un anillo alrededor del cursor (inspirado en la portada de Google
 * Antigravity). En pantallas táctiles: pavesas que suben solas, se mecen y
 * parpadean. En ambos, mantener pulsado (click o dedo) reúne lo de alrededor
 * hacia ese punto; al soltar vuelve a su sitio.
 * Va `fixed` detrás del contenido: el contenedor padre debe tener `isolate` para
 * que el `-z-10` no lo esconda.
 */
export default function FondoParticulas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const consultaTactil = window.matchMedia('(hover: none) and (pointer: coarse)');
    let tactil = consultaTactil.matches;
    let ancho = 0;
    let alto = 0;
    let particulas: Particula[] = [];
    // Centro del anillo (suavizado) y hacia dónde se mueve
    const centro = { x: 0, y: 0 };
    const objetivo = { x: 0, y: 0 };
    let hayPuntero = false;
    let pulsado = false;
    // 0 = disperso, 1 = reunido; se acerca a `pulsado` con suavizado
    let reunion = 0;
    let frame = 0;
    let anterior = 0;
    let soltarTactil = 0;

    // Una pavesa nueva nace bajo el borde inferior; al repartir, en cualquier punto de su vida
    const encender = (p: Particula, alInicio: boolean) => {
      p.x = Math.random() * ancho;
      p.y = alInicio ? Math.random() * alto : alto + azar(5, 40);
      p.vida = alInicio ? Math.random() : 0;
    };

    const repartir = () => {
      const cantidad = Math.min(2000, Math.floor((ancho * alto) / 10000 * (tactil ? DENSIDAD_PAVESAS : DENSIDAD_ANILLO)));
      particulas = Array.from({ length: cantidad }, () => {
        const p: Particula = {
          x: Math.random() * ancho,
          y: Math.random() * alto,
          fase: Math.random() * Math.PI * 2,
          vel: azar(0.4, 1.2),
          color: elegir(tactil ? COLORES_PAVESA : COLORES),
          sube: azar(18, 55),
          vaiven: azar(6, 22),
          tam: azar(0.8, 2.2),
          parpadeo: azar(3, 9),
          vida: 0,
          duracion: azar(6, 14),
        };
        if (tactil) encender(p, true);
        return p;
      });
    };

    const redimensionar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const anchoPrevio = ancho;
      ancho = window.innerWidth;
      alto = window.innerHeight;
      canvas.width = ancho * dpr;
      canvas.height = alto * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // En el celular la barra del navegador cambia el alto al hacer scroll: solo
      // se reparten de nuevo si cambia el ancho (giro, ventana nueva)
      if (ancho === anchoPrevio && particulas.length) return;
      tactil = consultaTactil.matches;
      repartir();
    };

    const dibujarAnillo = (t: number) => {
      const base = Math.max(170, Math.min(ancho, alto) * 0.32) * (1 + Math.sin(t * 0.8) * 0.06);
      // Al reunir, el anillo se cierra y atrae lo que hay hasta ~2.5 radios de distancia
      const radio = base * (1 - 0.6 * reunion);
      const sigma = radio * 0.5;
      const alcance = base * 2.5;

      ctx.lineCap = 'round';
      ctx.lineWidth = 2;

      for (const p of particulas) {
        const px = p.x + Math.sin(t * p.vel + p.fase) * 6;
        const py = p.y + Math.cos(t * p.vel * 0.8 + p.fase) * 6;
        const dx = px - centro.x;
        const dy = py - centro.y;
        const d0 = Math.hypot(dx, dy) || 1;
        const ux = dx / d0;
        const uy = dy / d0;
        const atraccion = reunion * Math.exp(-((d0 / alcance) ** 2));
        const d = d0 * (1 - 0.75 * atraccion);
        // Intensidad: máxima sobre el anillo, se apaga hacia dentro y hacia fuera
        const k = Math.exp(-((d - radio) ** 2) / (2 * sigma * sigma));
        const r = d + k * 30;
        const x = centro.x + ux * r;
        const y = centro.y + uy * r;
        const largo = 1 + k * 9;

        ctx.strokeStyle = `rgba(${p.color},${0.18 + k * 0.82})`;
        ctx.beginPath();
        ctx.moveTo(x - ux * largo * 0.5, y - uy * largo * 0.5);
        ctx.lineTo(x + ux * largo * 0.5, y + uy * largo * 0.5);
        ctx.stroke();
      }
    };

    const dibujarPavesas = (t: number, dt: number) => {
      const alcance = Math.max(ancho, alto) * 0.35;

      for (const p of particulas) {
        p.y -= p.sube * dt;
        p.vida += dt / p.duracion;
        if (p.vida >= 1 || p.y < -20) encender(p, false);

        // Se mecen de lado a lado mientras suben, como llevadas por el aire caliente
        let x = p.x + Math.sin(t * p.vel + p.fase) * p.vaiven;
        let y = p.y;
        // Con el dedo apoyado, las de alrededor se acercan a él
        const atraccion = reunion * Math.exp(-((Math.hypot(x - centro.x, y - centro.y) / alcance) ** 2));
        x += (centro.x - x) * 0.7 * atraccion;
        y += (centro.y - y) * 0.7 * atraccion;

        // Aparecen y se apagan suavemente, y titilan mientras viven
        const brillo = Math.sin(Math.PI * p.vida) * (0.55 + 0.45 * Math.sin(t * p.parpadeo + p.fase));
        if (brillo <= 0.01) continue;

        ctx.fillStyle = `rgba(${p.color},${brillo * 0.18})`;
        ctx.beginPath();
        ctx.arc(x, y, p.tam * 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${p.color},${brillo * 0.9})`;
        ctx.beginPath();
        ctx.arc(x, y, p.tam, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const dibujar = (ms: number) => {
      // Suavizado por tiempo transcurrido (no por frame), para que siga igual de rápido a cualquier fps
      const dt = anterior ? Math.min((ms - anterior) / 1000, 0.5) : 0;
      anterior = ms;
      // Con "reducir movimiento" el anillo no se mece solo (pero sigue al cursor).
      // Las pavesas siempre se mueven: moverse solas es justamente el efecto.
      const t = reducirMovimiento && !tactil ? 0 : ms / 1000;
      if (!hayPuntero) {
        // Sin cursor (o en táctil sin tocar) el anillo deambula despacio por el centro
        objetivo.x = ancho / 2 + Math.sin(t * 0.3) * ancho * 0.12;
        objetivo.y = alto / 2 + Math.cos(t * 0.23) * alto * 0.1;
      }
      const s = 1 - Math.exp(-dt * 6);
      centro.x += (objetivo.x - centro.x) * s;
      centro.y += (objetivo.y - centro.y) * s;
      reunion += ((pulsado ? 1 : 0) - reunion) * (1 - Math.exp(-dt * 5));

      ctx.clearRect(0, 0, ancho, alto);
      if (tactil) dibujarPavesas(t, dt);
      else dibujarAnillo(t);

      frame = requestAnimationFrame(dibujar);
    };

    const apuntar = (e: PointerEvent) => {
      hayPuntero = true;
      objetivo.x = e.clientX;
      objetivo.y = e.clientY;
    };
    const alMover = (e: PointerEvent) => {
      // El dedo solo mueve el anillo mientras toca la pantalla
      if (e.pointerType === 'mouse' || pulsado) apuntar(e);
    };
    const alPulsar = (e: PointerEvent) => {
      clearTimeout(soltarTactil);
      pulsado = true;
      apuntar(e);
    };
    const alSoltar = (e: PointerEvent) => {
      pulsado = false;
      if (e.pointerType !== 'mouse') {
        soltarTactil = window.setTimeout(() => { hayPuntero = false; }, ESPERA_TACTIL_MS);
      }
    };
    const alSalir = () => { hayPuntero = false; pulsado = false; };

    redimensionar();
    centro.x = objetivo.x = ancho / 2;
    centro.y = objetivo.y = alto / 2;
    window.addEventListener('resize', redimensionar);
    window.addEventListener('pointermove', alMover);
    window.addEventListener('pointerdown', alPulsar);
    window.addEventListener('pointerup', alSoltar);
    window.addEventListener('pointercancel', alSoltar);
    document.documentElement.addEventListener('pointerleave', alSalir);
    frame = requestAnimationFrame(dibujar);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(soltarTactil);
      window.removeEventListener('resize', redimensionar);
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('pointerdown', alPulsar);
      window.removeEventListener('pointerup', alSoltar);
      window.removeEventListener('pointercancel', alSoltar);
      document.documentElement.removeEventListener('pointerleave', alSalir);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 -z-10 w-full h-full pointer-events-none" />;
}
