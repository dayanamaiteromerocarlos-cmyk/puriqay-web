// Genera los íconos de la PWA en `public/` a partir del isotipo (la "P" de Puriqay).
//
// El isotipo viene en teal sobre transparente; aquí se usa solo su forma (canal alfa)
// para pintarla en blanco sobre `pq-teal`, igual que el logo circular del menú.
// Se corre a mano cuando cambie el isotipo: `node scripts/iconos/generar.mjs`.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const AQUI = fileURLToPath(new URL('.', import.meta.url));
const ORIGEN = join(AQUI, 'isotipo-p.png');
const PUBLIC = join(AQUI, '..', '..', 'public');
const TEAL = '#0e7a77'; // pq-teal

// La P en blanco, escalada para que su alto sea `alto` píxeles.
async function pBlanca(alto) {
  const alfa = await sharp(ORIGEN).resize({ height: alto }).ensureAlpha().extractChannel(3).toBuffer();
  const { width, height } = await sharp(alfa).metadata();
  return sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .joinChannel(alfa)
    .png()
    .toBuffer();
}

// Fondo: `circulo` deja transparente fuera del círculo; si no, cuadrado lleno
// (el sistema recorta las esquinas en los íconos maskable y en iOS).
function fondo(lado, circulo) {
  const forma = circulo
    ? `<circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}" fill="${TEAL}"/>`
    : `<rect width="${lado}" height="${lado}" fill="${TEAL}"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">${forma}</svg>`);
}

// `escala`: alto de la P respecto al lado del ícono.
async function icono(archivo, lado, { circulo, escala }) {
  const p = await pBlanca(Math.round(lado * escala));
  await sharp(fondo(lado, circulo))
    .composite([{ input: p, gravity: 'center' }])
    .png()
    .toFile(join(PUBLIC, archivo));
  console.log(`public/${archivo}`);
}

await icono('favicon.png', 64, { circulo: true, escala: 0.62 });
await icono('pwa-192x192.png', 192, { circulo: true, escala: 0.62 });
await icono('pwa-512x512.png', 512, { circulo: true, escala: 0.62 });
// Maskable: Android puede recortarlo hasta un círculo del 80% del lado; la P queda dentro.
await icono('pwa-maskable-512x512.png', 512, { circulo: false, escala: 0.5 });
await icono('apple-touch-icon.png', 180, { circulo: false, escala: 0.6 });
