# Pendientes de configuración — Puriqay

Checklist de cosas que se hacen **fuera del código** (panel de Supabase, Resend, DNS).
Marca con [x] lo que vayas completando.

---

## TAREA 1 — Desbloquear el registro (URGENTE, 2 minutos)

**Problema:** "Confirm email" está activado pero no hay servidor de correo configurado.
El correo interno de Supabase solo entrega a miembros de la organización, así que
**ningún voluntario externo puede registrarse hoy**: se registra, ve "Revisa tu correo",
y ese correo nunca llega.

**Qué hacer:**

- [x] Supabase → `Authentication` → `Sign In / Providers` → abre **Email**
- [x] Busca **"Confirm email"** y **apágalo**
- [x] Baja hasta el final y dale **Save** (si no guardas, no se aplica)

Se reactiva cuando la TAREA 3 esté lista. No hay que tocar código: `Register.tsx`
funciona igual con la verificación prendida o apagada.

---

## TAREA 2 — Ver en qué estado está el dominio en Resend

- [x] Entra a resend.com → menú **Domains**
- [x] Mira qué dice `puriqay.org`: **VERIFIED** (confirmado 20-sep)
  - **Verified** (verde) → puedes hacer la TAREA 3
  - **Pending / Not Started** → tu amigo aún no puso los registros DNS en Cloudflare;
    sin eso no se puede avanzar

---

## TAREA 3 — Conectar Resend a Supabase ✅ COMPLETADA (28-sep)

### 3.1 Crear la API key
- [x] Resend → `API Keys` → **Create API Key** (permiso: Sending access, dominio: puriqay.org)
- [x] Nombre: `supabase-smtp` · Permiso: **Sending access**
- [x] Cópiala (empieza con `re_`). Solo se muestra una vez.
- [x] **NO la guardes en este archivo ni en ningún otro del repo**: va directo al campo
      Password de Supabase. GitHub bloquea los push que contienen claves.

### 3.2 Configurar el SMTP
- [x] Supabase → `Authentication` → `Emails` → pestaña **SMTP Settings**
      (o: `Project Settings` → `Authentication` → sección **SMTP Settings**)
- [x] Activa **Enable Custom SMTP** y llena:

| Campo | Valor |
|---|---|
| Sender email | `no-responder@puriqay.org` |
| Sender name | `Puriqay` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` (esa palabra literal, no tu correo) |
| Password | la API key `re_...` |

- [x] **Save**

### 3.3 Subir el límite de correos
- [x] Supabase → `Authentication` → `Rate Limits` → busca **"Emails per hour"**
- [x] Súbelo a **100** → Save

### 3.4 Poner el diseño Puriqay al correo
- [x] Supabase → `Authentication` → `Emails` → `Templates` → **"Confirm signup"**
- [x] Borra todo el contenido y pega el archivo `supabase/email-templates/confirm-signup.html`
- [x] Save

### 3.4b PROBAR el SMTP antes de reactivar la verificación

No reactives "Confirm email" a ciegas: si el SMTP quedó mal, vuelves a bloquear
el registro de todos. Pruébalo primero con un correo de invitación:

- [x] Supabase → `Authentication` → `Users` → botón **Invite user**
- [x] Escribe un correo externo (uno que NO sea de tu organización Supabase)
- [x] Si el correo **llega** → el SMTP funciona ✅ (llegó a spam, ver nota al final)
  _(Si no hubiera llegado: revisar Host/Port/Username/Password. El Username es la_
  _palabra `resend`, no tu correo. Y en Resend → `Logs` se ve si el envío salió.)_
- [x] Borra ese usuario de prueba después

### 3.5 Reactivar la verificación
- [x] Vuelve a `Authentication` → `Sign In / Providers` → **Email** → activa **"Confirm email"** → Save
- [x] `Authentication` → `URL Configuration` → **Site URL**: pon la URL real de la app
      (la de Netlify o el dominio), NO `localhost`

### 3.6 Probar
- [x] Regístrate con un correo que NO sea el tuyo (pídele a alguien del equipo)
- [x] Debe llegar el correo con diseño Puriqay desde `no-responder@puriqay.org`

---

## TAREA 4 — Cerrar la lectura de `locations` (seguridad)

**Problema:** cualquier usuario registrado puede leer la tabla `locations` completa,
incluyendo `contact_phone`, `manager_name`, `address` y `special_instructions` de los
aliados. La app solo necesita mostrarles nombre, distrito y punto de encuentro.

**El código ya está listo y desplegado** (`AvailableJornadas.tsx` lee de una vista).
Solo falta el SQL.

### 4.1 Antes de correr nada, verifica el deploy
- [x] Abre la app **publicada** (no localhost), entra con una cuenta de VOLUNTARIO
- [x] Ve a "Próximas Jornadas" y confirma que **se ve el nombre del lugar**
- [x] Si no ves jornadas o no aparece el lugar, **no sigas**: falta desplegar el código

### 4.2 Correr el SQL (Supabase → SQL Editor)

```sql
-- Vista con solo lo que un voluntario necesita ver del lugar
create or replace view public.locations_publicas as
select id, name, district, meeting_point from public.locations;

-- OJO: hay que revocar de AMBOS roles. Supabase da INSERT/UPDATE/DELETE por defecto
-- a anon y authenticated sobre objetos nuevos del esquema public, y como esta vista
-- es actualizable y corre con permisos del owner, eso permitiria borrar locations
-- saltandose RLS.
revoke all on public.locations_publicas from anon, authenticated;
grant select on public.locations_publicas to authenticated;

-- La tabla completa pasa a ser solo del equipo interno
drop policy if exists "locations_select" on public.locations;
drop policy if exists "locations_select_interno" on public.locations;

create policy "locations_select_interno" on public.locations
for select to authenticated using (public.es_equipo_interno());
```

### 4.3 Verificar
- [x] Recarga la app como VOLUNTARIO → en "Próximas Jornadas" el lugar **sigue apareciendo**
- [x] Entra como ADMIN → el módulo "Lugares" sigue mostrando todo (teléfonos incluidos)

### 4.4 Si algo se rompió, revertir

```sql
drop policy if exists "locations_select_interno" on public.locations;
create policy "locations_select" on public.locations
for select to authenticated using (true);
```

**Nota:** después de esto el Security Advisor va a mostrar un warning de
"Security Definer View" sobre `locations_publicas`. Es intencional: esa vista existe
justamente para exponer 4 columnas inofensivas sin dar acceso a la tabla completa.

---

## Ya completado (referencia)

- [x] Políticas RLS en las 6 tablas (antes todo era `ALL / true`, abierto a cualquiera)
- [x] Escalada de privilegios cerrada: `role`, `area`, `is_active` y `qr_token` ya no se
      pueden modificar desde la app (permisos por columna en `profiles`)
- [x] Trigger `handle_new_user` con `search_path` fijo y copiando la metadata del registro
- [x] Limpieza de datos de prueba (todo menos usuarios)

## Pendientes menores (sin urgencia)

- Leaked Password Protection: solo disponible en plan Pro, no se puede activar en Free
- Política de UPDATE para que un ADMIN pueda editar perfiles ajenos (hoy solo el propio).
  Hará falta si se quiere un botón "promover a Coordinador" en el módulo Voluntarios
- Template de correo para "Reset password" (recuperar contraseña): sigue con el diseño
  genérico de Supabase

---

## Nota: correos que caen en spam

Es normal al principio: un dominio recién verificado no tiene reputación de envío,
y los filtros desconfían de correos cortos con un solo enlace.

Qué ayuda:
1. Marcar "No es spam" y mover a Recibidos (pedírselo también al equipo en los
   primeros correos) — entrena los filtros rápido
2. El template con diseño puntúa mejor que el genérico: más texto real, estructura
   y el enlace en dos formatos
3. Consistencia: la reputación de `puriqay.org` mejora con envíos legítimos sostenidos
4. Opcional: en Resend → `Domains` → Configuration → "Enable tracking metrics" con
   subdominio propio, que ellos recomiendan para deliverability

NO subir el DMARC de `p=none` a `p=quarantine` todavía: hacerlo antes de tener
envíos estables puede tumbar correos legítimos.

---

## Lección aprendida: las vistas NO heredan la seguridad de la tabla

Al crear `locations_publicas`, Supabase le dio automáticamente INSERT/UPDATE/DELETE
a `anon` y `authenticated` (son los permisos por defecto del esquema `public`).

Como una vista simple sobre una sola tabla **es actualizable** y corre con los
permisos de su dueño (`postgres`), eso permitía hacer `delete from locations_publicas`
y borrar la tabla base **saltándose las políticas RLS**.

Regla para cualquier vista nueva:

```sql
revoke all on public.<vista> from anon, authenticated;
grant select on public.<vista> to authenticated;
```

Y verificar siempre con:

```sql
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = '<vista>'
order by grantee, privilege_type;
```

---

# PLAN DE PRUEBAS

Cosas que se cambiaron y conviene probar antes de considerar el sistema listo.
Ordenadas por riesgo: las primeras son las que podrían estar rotas por RLS.

## A. Flujos que dependen de políticas RLS (alto riesgo)

- [x] **Voluntario se inscribe a una jornada** → botón "Inscribirme a esta jornada".
      Debe guardar y mostrar "Ya estás inscrito". (Política `inscripciones_propias`)
- [x] **Coordinador confirma/justifica asistencia** → "Sí, asistiré" / "No asistiré".
- [x] **Coordinador escanea un QR** → módulo "Control de Asistencia".
      Debe encontrar al voluntario y registrar la asistencia.
      (Necesita leer `profiles` por `qr_token` + insertar en `asistencias`)
- [x] **Admin edita un lugar** → botón del lápiz en Lugares, cambia algo y guarda.
      Si sale el error rojo de "no actualizó ninguna fila", falta política de UPDATE.
- [x] **Módulo Marketing** → crear tarea, enviar a revisión, aprobar, extender plazo,
      archivar. (Política `marketing_interno`)
- [x] **Coordinador con perfil incompleto** → debe salirle el modal pidiendo SOLO
      los campos vacíos, y al guardar no debe volver a pedirlos en el siguiente login.

## B. Prueba de seguridad (la que demuestra que locations quedó cerrado)

Con sesión de **VOLUNTARIO** abierta, F12 → Console. Reemplaza TU_URL y TU_ANON_KEY
por los valores de tu archivo `.env`:

```js
const k = Object.keys(localStorage).find(x => x.includes('auth-token'));
const token = JSON.parse(localStorage.getItem(k)).access_token;
const r = await fetch('TU_URL/rest/v1/locations?select=*', {
  headers: { apikey: 'TU_ANON_KEY', Authorization: 'Bearer ' + token }
});
console.log(await r.json());
```

- [x] Debe devolver `[]` (vacío). Si devuelve los lugares con `contact_phone`,
      el cierre no quedó aplicado.

## C. Validaciones de formularios (recién desplegadas)

- [x] **Crear lugar**: teléfono con letras o con más de 9 dígitos debe ser rechazado;
      los campos nuevos no deben dejar guardar vacíos
- [x] **Registro**: contraseña corta o sin símbolo debe ser rechazada antes de enviar;
      nombres con números deben ser rechazados

> **Bug encontrado y corregido el 28-sep:** 7 campos estaban SIN validar (Nombres,
> Apellidos, Carrera, Dirección, Centro de estudios "Otro", y Nombre del encargado
> en Lugares, tanto al crear como al editar). Los patrones `soloLetras` y `direccion`
> llevaban `-` y `/` sin escapar dentro de la clase de caracteres, así que no
> compilaban con la bandera `v` que usan los navegadores — y la spec de HTML manda
> ignorar por completo un `pattern` que no compila, dejando el campo sin ninguna
> regla, en silencio. **Reprobado en la app publicada tras el deploy: los 7 campos
> rechazan números y siguen aceptando nombres compuestos.**

## D. Correo (después de terminar la Tarea 3)

- [x] Registro con correo externo → llega el correo CON diseño Puriqay
- [x] El enlace del correo funciona y activa la cuenta
- [x] Tras confirmar, el nombre y celular ya están guardados en `profiles`

---

## [x] Endurecimiento de permisos (completado 28-sep)

Aplicado con `supabase/sql/endurecer_permisos.sql`:

- `anon` (visitante sin sesión) quedó sin ningún permiso sobre las 5 tablas
- `TRUNCATE`, `REFERENCES` y `TRIGGER` revocados a `authenticated`
  (importante: **TRUNCATE no pasa por RLS**, permitía vaciar una tabla entera)
- Trigger `trg_profiles_guard`: bloquea cambios a `role`, `area`, `is_active`,
  `qr_token`, `email` e `id` salvo que la sesión sea ADMIN o backend
  > **Corrección (12-oct):** esto resultó falso. El trigger existe pero **no bloquea
  > nada**; lo que frena esos cambios son los permisos por columna. Ver la sección
  > "PENDIENTE (12-oct)" al final.

Estado verificado:

| tabla | authenticated |
|---|---|
| asistencias, inscripciones, jornadas, locations, marketing_tasks | DELETE, INSERT, SELECT, UPDATE |
| profiles | SELECT (+ UPDATE en 13 columnas no sensibles) |
| locations_publicas | SELECT |

`anon`: sin permisos en ninguna tabla.

---

## Nota: la etiqueta roja "UNRESTRICTED" en `locations_publicas`

En el Table Editor, `locations_publicas` aparece con una etiqueta roja
**UNRESTRICTED**. **No es un problema y no hay que arreglarlo.**

Esa etiqueta significa literalmente "este objeto no tiene RLS activado".
En Postgres **las vistas no pueden tener RLS** — RLS es una característica de
tablas. Así que Supabase marca en rojo toda vista del esquema `public`, aunque
esté bien protegida. Por eso ninguna tabla de la lista la tiene y la vista sí.

La vista está protegida por otras dos vías:

1. **Solo contiene 4 columnas inofensivas** (`id`, `name`, `district`,
   `meeting_point`). `contact_phone`, `manager_name`, `address` y
   `special_instructions` ni siquiera existen dentro de la vista, no hay forma de
   leerlos desde ahí.
2. **Permisos:** `anon` no tiene ninguno (hace falta sesión iniciada) y
   `authenticated` solo tiene `SELECT` (no se puede escribir ni borrar a través
   de ella).

Y es **a propósito** que la vista se salte el RLS de `locations`: justamente
existe para que un voluntario vea el nombre y el punto de encuentro del lugar
sin poder leer la tabla completa.

Verificar cuando haga falta:

```sql
-- 1. Qué columnas expone realmente la vista (deben ser solo 4)
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'locations_publicas';

-- 2. Quién puede hacer qué (debe salir solo: authenticated | SELECT)
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'locations_publicas';
```

---

## Resultado de las pruebas funcionales (28-sep) ✅

Se probó el sistema completo con RLS activo. **Las 5 pruebas pasaron**, es decir
las políticas quedaron ni muy flojas (nadie entra de más) ni muy apretadas
(los flujos legítimos siguen funcionando):

| Prueba | Política que valida | Resultado |
|---|---|---|
| Crear lugar y jornada (ADMIN) | `locations_admin`, `jornadas_admin` | OK |
| Voluntario se inscribe | `inscripciones_propias` + `locations_publicas` | OK |
| Coordinador confirma / justifica | `inscripciones_propias` | OK |
| Escanear QR (+ duplicado) | `profiles_select` + `asistencias_interno` | OK |
| Admin edita lugar (persiste tras F5) | `locations_admin` UPDATE | OK |
| Marketing: crear → extender → revisión → publicar → archivar | `marketing_interno` | OK |

Detalle relevante: al escanear, la tabla "Últimos Registros" mostró el **nombre
completo** del voluntario, no "Sin nombre". Eso confirma que el join embebido
`asistencias → profiles` sigue permitido para el equipo interno, que era el
riesgo equivalente al que sí rompió `locations` en su momento.

---

## Verificación del registro por formulario (28-sep) ✅

Se comprobó en vivo que la cadena completa funciona: formulario → metadata del
`signUp` → trigger `handle_new_user` → fila en `profiles` con `first_name`,
`phone`, `role = 'VOLUNTARIO'` y `qr_token` generado.

**Ojo con un falso positivo al auditar esto.** Comparar `profiles` a secas no
sirve: casi todas las cuentas del proyecto fueron sembradas a mano desde el panel
y tienen los campos llenos sin haber pasado nunca por el trigger. La query que sí
distingue compara contra `auth.users.raw_user_meta_data`, que **solo** se llena
cuando la cuenta nace de un `signUp` del formulario:

```sql
select u.email,
       u.raw_user_meta_data->>'first_name' as meta_nombre,
       p.first_name as perfil_nombre,
       (p.qr_token is not null) as tiene_qr
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;
```

### Cuentas huérfanas (sin fila en `profiles`)

Quedaron 4 cuentas en `auth.users` sin perfil, todas anteriores al arreglo del
trigger: `dasdasads@`, `gjalejo.cas@`, `barazordapedro0@` y `sabreraita@`.
Son de prueba y se borran, no se repararon.

Síntoma si vuelve a pasar: el usuario entra y ve la pantalla de error de
`Dashboard.tsx` en vez del panel, porque no encuentra su fila de `profiles`.

**Un trigger roto NO produce esto.** Si `handle_new_user` falla, Postgres cancela
toda la transacción y la cuenta de auth tampoco se crea (el usuario ve "Database
error saving new user"). Que exista la cuenta pero no el perfil significa que en
ese momento el trigger no existía, o que alguien borró la fila de `profiles` a
mano sin borrar el usuario de auth.

### Regla operativa: nunca borrar filas de `profiles` a mano

Para eliminar a un usuario hay que hacerlo desde **Authentication → Users**. Eso
borra el usuario de auth **y** su perfil, por el `ON DELETE CASCADE` de
`profiles_id_fkey`.

Borrar solo la fila de `profiles` (desde el Table Editor o con un `delete`) deja
al usuario de auth vivo pero sin perfil: puede iniciar sesión, pero `Dashboard.tsx`
no encuentra su fila y le muestra la pantalla de error. **El trigger no lo
arregla**, porque `handle_new_user` se dispara con el INSERT en `auth.users`, no
cuando falta el perfil. Hay que recrear la fila a mano o borrar y recrear la cuenta.

Todas las cuentas huérfanas que aparecieron en la auditoría del 28-sep salieron
de ahí, no de un fallo del sistema.

---

# ESTADO FINAL (28-sep) — checklist completo

Todas las casillas de este archivo están marcadas. Resumen de lo que quedó cerrado:

| Bloque | Estado |
|---|---|
| Políticas RLS en las 6 tablas | ✅ aplicadas y **probadas en la app** |
| Escalada de privilegios (`role`, `area`, `qr_token`…) | ✅ cerrada con grants por columna. El trigger guardián **no actuaba** (ver corrección del 12-oct al final) |
| Lectura de `locations` (datos de aliados) | ✅ cerrada, verificada consultando la API como VOLUNTARIO |
| Permisos de `anon` y `TRUNCATE` | ✅ revocados |
| Correo (Resend + dominio + plantilla + verificación) | ✅ funcionando de punta a punta |
| Registro por formulario → trigger → perfil con QR | ✅ verificado en vivo |
| Validaciones de formulario | ✅ bug del flag `v` corregido y reprobado |
| Datos y cuentas de prueba | ✅ limpiados |

Cuentas que quedaron (8, todas con perfil): `spiamicanal@` (ADMIN), `ceo@`,
`dir_proyectos@`, `dir_rrhh@`, `dir_marketing@` (ADMIN), `int_marketing@`,
`int_logistica@` (COORDINADOR) y `externo@puriqay.com` (VOLUNTARIO, se conserva
a propósito para probar permisos).

## Lo único que sigue abierto

**Sincronizar el repo de migraciones con producción.** En `E:\Puriqay\SupabaseItalo`
la migración `20260920184500_fix_profiles_privilege_escalation.sql` nunca se aplicó
y difiere de lo que hay en la base real (13 vs 15 columnas con GRANT, y el trigger
`trg_profiles_guard` no está en ningún archivo del repo). **Si alguien corre esas
migraciones tal cual, reabre el permiso de escritura sobre `area`**, que es la
columna que decide qué módulos ve cada persona. Se arregla con `supabase db pull`.

Menores, sin urgencia:
- Plantilla de "Reset password": sigue con el diseño genérico de Supabase
- Política de UPDATE para que un ADMIN edite perfiles ajenos (hace falta solo si
  se agrega un botón "promover a Coordinador")
- Leaked Password Protection: requiere plan Pro
- `phone` y `birth_date` están vacíos en los internos sembrados y nada los pide,
  porque el modal de perfil progresivo no incluye esos dos campos

---

# PENDIENTE (12-oct) — permisos de `inscripciones` y trigger guardián

**Estado:** 3 migraciones escritas y probadas en local. **Nada aplicado en producción.**
Están en el PR #2 del repo del backend (rama `fix/rls-inscripciones`), a la espera
de la revisión de Pedro. Ese PR va encima del PR #1, que tampoco se ha fusionado.

## Qué se encontró

**1. `inscripciones` permitía de más.** La política era `ALL`, pero solo sobre las
filas propias: nadie podía leer ni tocar inscripciones ajenas (probado). Lo que
sobraba es lo que cada persona podía hacer con **su propia** inscripción hablando
directo con la API: borrarla, apagar la marca "Cambió", poner fechas falsas,
cambiar su respuesta de una jornada ya pasada, escribir un estado inventado o
moverla a otra jornada.

**2. El trigger `trg_profiles_guard` no bloqueaba nada.** Estaba declarado
`SECURITY DEFINER` y decidía con `current_user`, que dentro de una función así
vale `postgres` y no el rol del usuario. Producción **no** estuvo expuesta: los
permisos por columna de `profiles` rechazan esos cambios antes. Lo que no existía
era la segunda capa de protección.

## Qué hacen las migraciones

| Archivo | Qué hace |
|---|---|
| `20261013014000_inscripciones_permisos_minimos.sql` | Crear y modificar solo la inscripción propia y solo si la jornada es de hoy o futura; nadie borra; estado válido obligatorio; "Cambió" y fechas los calcula la base |
| `20261013014500_profiles_guard_security_invoker.sql` | El trigger guardián pasa a `SECURITY INVOKER` y empieza a bloquear de verdad |
| `20261013023500_inscripciones_motivo_obligatorio.sql` | "No asistiré" exige un motivo también en la base (antes solo lo exigía el formulario) |

No hay que tocar el frontend. Decisiones tomadas: la regla de tiempo **sí**; exigir
el motivo en la base **sí**; que los coordinadores sigan leyendo las justificaciones
**sí** (no se cambió).

## Pasos para aplicar (cuando Pedro apruebe)

- [ ] **1. Revisar que no haya datos que choquen.** SQL Editor:

  ```sql
  select
    count(*) filter (where status is null or status not in ('ASISTIRÁ', 'NO ASISTIRÁ')) as estados_invalidos,
    count(*) filter (where status = 'NO ASISTIRÁ' and coalesce(btrim(justification_type), '') = '') as no_asistire_sin_motivo,
    count(*) as total
  from public.inscripciones;
  ```

  Los **dos primeros números deben ser 0** (el tercero puede ser cualquiera).
  Si alguno no es 0, **no seguir** y avisar: hay que corregir esas filas primero.

- [ ] **2. Aplicar las 3 migraciones, en orden.** Para cada archivo de la carpeta
  `supabase/migrations` del backend: abrirlo en VS Code, copiar todo (`Ctrl+A`,
  `Ctrl+C`), pegarlo en el SQL Editor y dar **Run**. Cada una debe responder
  `Success. No rows returned`.
  1. `20261013014000_inscripciones_permisos_minimos.sql`
  2. `20261013014500_profiles_guard_security_invoker.sql`
  3. `20261013023500_inscripciones_motivo_obligatorio.sql`

- [ ] **3. Verificar.** SQL Editor:

  ```sql
  select 'politica' as tipo, policyname as nombre, cmd as detalle
  from pg_policies where schemaname = 'public' and tablename = 'inscripciones'
  union all
  select 'funcion', proname, case when prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end
  from pg_proc
  where pronamespace = 'public'::regnamespace
    and proname in ('profiles_guard_sensible', 'inscripciones_campos_servidor', 'jornada_vigente')
  union all
  select 'permiso', 'authenticated', string_agg(privilege_type, ', ' order by privilege_type)
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'inscripciones' and grantee = 'authenticated'
  union all
  select 'regla', conname, 'activa'
  from pg_constraint where conrelid = 'public.inscripciones'::regclass and contype = 'c'
  order by 1, 2;
  ```

  Deben salir exactamente estas 9 filas:

  | tipo | nombre | detalle |
  |---|---|---|
  | funcion | inscripciones_campos_servidor | SECURITY INVOKER |
  | funcion | jornada_vigente | SECURITY INVOKER |
  | funcion | profiles_guard_sensible | SECURITY INVOKER |
  | permiso | authenticated | INSERT, SELECT, UPDATE |
  | politica | inscripciones_insert_propia | INSERT |
  | politica | inscripciones_select | SELECT |
  | politica | inscripciones_update_propia | UPDATE |
  | regla | inscripciones_justificacion_check | activa |
  | regla | inscripciones_status_check | activa |

- [ ] **4. Probar en la app publicada** (lo mismo que el 28-sep):
  - Como VOLUNTARIO: inscribirse a una jornada → queda "✅ Ya estás inscrito"
  - Como COORDINADOR o ADMIN: "Sí, asistiré" y luego "No asistiré" con motivo →
    debe guardarse y aparecer la marca "⚠️ Cambió"
  - En "Control de Asistencia": el contador de "Esperados" sigue mostrando número

- [ ] **5. Avisar para actualizar la documentación** (`database-schema.md` y
  `CLAUDE.md`), que hoy describen el estado anterior.

## Si algo se rompe, revertir `inscripciones`

Probado: devuelve la tabla al comportamiento de antes.

```sql
drop trigger if exists trg_inscripciones_campos_servidor on public.inscripciones;
drop policy if exists inscripciones_insert_propia on public.inscripciones;
drop policy if exists inscripciones_update_propia on public.inscripciones;
create policy inscripciones_propias on public.inscripciones
  to authenticated
  using (auth.uid() = volunteer_id) with check (auth.uid() = volunteer_id);
grant delete on public.inscripciones to authenticated;
alter table public.inscripciones drop constraint if exists inscripciones_justificacion_check;
alter table public.inscripciones drop constraint if exists inscripciones_status_check;
alter table public.inscripciones alter column status drop not null;
```

## Otros hallazgos del mismo análisis

- **Sin resolver: `asistencias` y `marketing_tasks` sí son `ALL` sobre todas las
  filas** para cualquier COORDINADOR o ADMIN. Probado: una coordinadora se registra
  asistencia a sí misma sin QR, borra la asistencia de otra persona y le cambia la
  hora de ingreso; una coordinadora de Proyectos borra una tarea de Marketing.
- **Arreglado en el código (12-oct), falta desplegar:** "Próximas Jornadas"
  calculaba "hoy" en hora UTC, así que desde las 7 p. m. de Perú las jornadas del
  mismo día dejaban de listarse. Ahora usa `todayInLima()` de `src/lib/dates.ts`.
  Para comprobarlo en la app publicada: entrar después de las 7 p. m. y confirmar
  que una jornada con fecha de hoy sigue apareciendo.

## Lección: un trigger se verifica provocándolo

El 28-sep el trigger guardián se dio por bueno porque existía, estaba activo y su
texto mencionaba `area`. Nunca se disparó en una prueba. Para comprobar una red de
seguridad hay que simular el error contra el que protege (aquí, un `GRANT` de más)
y ver que lo frena.
