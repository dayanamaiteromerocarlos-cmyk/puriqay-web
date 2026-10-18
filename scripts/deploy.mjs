// Despliegue manual a Cloudflare Pages (proyecto `puriqay-web`, dominio app.puriqay.org).
//
// Construye con las variables de producción de `.env` (NO las de `.env.local`, que
// apuntan al Supabase local y Vite les da prioridad sobre `.env`), comprueba que el
// resultado no apunte a localhost y sube `dist/` con wrangler.
//
// Requiere haber iniciado sesión antes: `npx wrangler login`.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
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

run('npx', ['wrangler', 'pages', 'deploy', 'dist', '--project-name', PROJECT, '--branch', 'main', '--commit-dirty=true'], env);
console.log('\n[deploy] Listo: https://app.puriqay.org');
