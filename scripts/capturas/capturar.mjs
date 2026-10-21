// Capturas de pantalla de la app, una carpeta por cuenta de prueba.
//
// Entra con cada cuenta, recorre todas las pestañas que esa cuenta ve en el menú
// lateral y guarda una captura de cada una en scripts/capturas/salida/<cuenta>/.
// Sirve para revisar un cambio de interfaz sin tener que entrar con cada rol.
//
// Necesita la app corriendo (npm run dev) contra un Supabase LOCAL con datos de
// prueba, nunca contra producción: las cuentas de abajo solo existen ahí (las crea
// el seed del repo del backend). Uso:
//
//   node scripts/capturas/capturar.mjs                 # todas las cuentas
//   node scripts/capturas/capturar.mjs gh.coord cd.admin
//
// Variables opcionales: CAPTURAS_URL (por defecto http://127.0.0.1:5173),
// CAPTURAS_PASSWORD, CHROMIUM_PATH (si Playwright no trae su propio navegador) y
// CAPTURAS_ANCHO (ancho de la ventana en px; 390 para ver la versión de celular).
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_APP = process.env.CAPTURAS_URL || 'http://127.0.0.1:5173';
const PASSWORD = process.env.CAPTURAS_PASSWORD || 'Puriqay-Prueba-2026';
const ANCHO = Number(process.env.CAPTURAS_ANCHO || 1366);
const SALIDA = join(dirname(fileURLToPath(import.meta.url)), 'salida');

const CUENTAS = [
  'gerente', 'ti.admin', 'ti.coord', 'gh.admin', 'gh.coord', 'ps.admin', 'ps.coord',
  'cd.admin', 'cd.coord', 'fl.admin', 'inactivo', 'voluntario1',
];

const elegidas = process.argv.slice(2);
const cuentas = elegidas.length ? CUENTAS.filter(c => elegidas.includes(c)) : CUENTAS;

const nombreArchivo = texto => texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const cuenta of cuentas) {
  const carpeta = join(SALIDA, cuenta);
  rmSync(carpeta, { recursive: true, force: true });
  mkdirSync(carpeta, { recursive: true });

  const page = await browser.newPage({ viewport: { width: ANCHO, height: 900 }, locale: 'es-PE', timezoneId: 'America/Lima' });
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));

  await page.goto(URL_APP + '/');
  await page.fill('input[type="email"]', `${cuenta}@puriqay.test`);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  // El menú lateral aparece cuando terminó de cargar el perfil.
  const menu = page.locator('nav button');
  await menu.first().waitFor();

  // Con el menú plegado (celular) los botones no tienen texto, solo `title`.
  const pestañas = await menu.evaluateAll(bs => bs.map(b => b.textContent.trim() || b.title));
  // En celular el menú está escondido: se abre con el botón de la barra superior.
  const abrirMenu = page.locator('div.md\\:hidden button');
  for (const [i, nombre] of pestañas.entries()) {
    if (ANCHO < 768) await abrirMenu.click();
    await menu.nth(i).click();
    // Da tiempo a que cada pestaña haga sus consultas y pinte el resultado.
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(carpeta, `${i + 1}-${nombreArchivo(nombre)}.png`), fullPage: true });
  }

  // "Mi Perfil" no está en el menú: se abre con el nombre, arriba de "Cerrar Sesión".
  if (ANCHO < 768) await abrirMenu.click();
  await page.locator('button[title*="Ver mi perfil"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(carpeta, `${pestañas.length + 1}-mi-perfil.png`), fullPage: true });

  console.log(`${cuenta}: ${pestañas.length} pestañas (${pestañas.join(', ')})` +
    (errores.length ? `\n  errores de la página: ${errores.join(' | ')}` : ''));
  await page.close();
}

await browser.close();
console.log(`\nCapturas en ${SALIDA}`);
