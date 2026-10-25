// Despliegue manual a Cloudflare Pages (proyecto `puriqay-web`, dominio app.puriqay.org).
//
// Construye con las variables de producción de `.env` (NO las de `.env.local`, que
// apuntan al Supabase local y Vite les da prioridad sobre `.env`), comprueba que el
// resultado no apunte a localhost y sube `dist/` con wrangler.
//
// `npm run deploy -- --preview=<rama>` (o `--preview`, rama `prueba`) sube una vista
// previa de Cloudflare en <rama>.<proyecto>.pages.dev sin tocar app.puriqay.org.
// Ojo: usa el mismo Supabase de producción, con datos reales.
//
// Requiere haber iniciado sesión antes: `npx wrangler login`.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT = 'puriqay-web';
const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

function fail(msg) {
  console.error(`\n[deploy] ${msg}`);
  process.exit(1);
}

function readEnvFile(path) {
  const vars = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return vars;
}

function run(cmd, args, env) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, env });
  if (r.status !== 0) fail(`Falló: ${cmd} ${args.join(' ')}`);
}

const previewArg = process.argv.slice(2).find((a) => a === '--preview' || a.startsWith('--preview='));
const branch = previewArg ? (previewArg.split('=')[1] || 'prueba') : 'main';
if (previewArg && (branch === 'main' || !/^[a-z0-9][a-z0-9-]*$/.test(branch))) {
  fail(`Rama de vista previa no válida: "${branch}" (minúsculas, números y guiones; no "main").`);
}

let prod;
try {
  prod = readEnvFile('.env');
} catch {
  fail('No encuentro .env en la raíz del proyecto.');
}
for (const key of REQUIRED) {
  if (!prod[key]) fail(`Falta ${key} en .env.`);
}
if (/localhost|127\.0\.0\.1/.test(prod.VITE_SUPABASE_URL)) {
  fail('VITE_SUPABASE_URL en .env apunta a localhost; no se despliega.');
}

// Las variables del proceso ganan sobre los archivos .env*, incluido .env.local.
const env = { ...process.env, ...prod };

run('npm', ['run', 'build'], env);

const assets = join('dist', 'assets');
const prodHost = new URL(prod.VITE_SUPABASE_URL).host;
let hasProd = false;
for (const file of readdirSync(assets).filter((f) => f.endsWith('.js'))) {
  const code = readFileSync(join(assets, file), 'utf8');
  if (/127\.0\.0\.1:54\d{3}|localhost:54\d{3}/.test(code)) {
    fail(`dist/assets/${file} apunta al Supabase local; revisa .env.local. No se despliega.`);
  }
  if (code.includes(prodHost)) hasProd = true;
}
if (!hasProd) fail('El build no contiene el Supabase de producción; no se despliega.');

// Con `_redirects` un archivo faltante responde index.html con 200, y el navegador
// ignora sin avisar un manifest o un service worker roto.
for (const file of ['sw.js', 'manifest.webmanifest', '_headers', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png']) {
  if (!existsSync(join('dist', file))) fail(`Falta dist/${file}; la PWA quedaría rota. No se despliega.`);
}

run('npx', ['wrangler', 'pages', 'deploy', 'dist', '--project-name', PROJECT, '--branch', branch, '--commit-dirty=true'], env);
console.log(previewArg
  ? `\n[deploy] Vista previa publicada en la rama "${branch}"; su URL está en la salida de wrangler de arriba.`
  : '\n[deploy] Listo: https://app.puriqay.org');
