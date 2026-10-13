# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Puriqay is a volunteer-management single-page app for a Peruvian volunteering organization (UI copy is entirely in Spanish, es-PE locale for dates/times). It is a pure client-side React app: there is no backend/API code in this repo — all auth, data, and business logic talk directly to Supabase (Postgres + Auth) from the browser.

## Commands

- `npm run dev` — start the Vite dev server.
- `npm run build` — `tsc -b && vite build`. TypeScript project references (`tsconfig.app.json`/`tsconfig.node.json`) have `noUnusedLocals`/`noUnusedParameters` on, so the build fails on unused imports/vars, not just type errors.
- `npm run lint` — runs `oxlint` (config in `.oxlintrc.json`). This repo uses oxlint, not ESLint — there is no `.eslintrc`.
- `npm run preview` — serve the production build locally.
- There is no test framework configured in this repo (no test runner, no test files).

## Environment

`src/lib/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env` and constructs the single shared `supabase` client used everywhere. There's no other backend config.

## Architecture

**Routing is minimal; `Dashboard` is the real app shell.** `src/App.tsx` (react-router-dom v7) declares only three routes: `/` → `Login`, `/register` → `Register`, `/dashboard` → `Dashboard`, everything else redirects to `/`. Once logged in, `Dashboard` (`src/components/Dashboard.tsx`) fetches the caller's `profiles` row once (`role`, `area`, `qr_token`) and then switches between feature components via local `activeTab` state and a sidebar — **not** nested router routes. To add a dashboard section: add a component in `src/components`, a tab id, a `<SidebarItem>` entry, and a conditional render block in `Dashboard.tsx`.

**Authorization is role/area-based and computed ad hoc, not centralized.** Two columns on `profiles` drive it:
- `role`: `ADMIN` | `COORDINADOR` | `VOLUNTARIO`
- `area`: free-text department (`"Gerencia General"`, `"Tecnologías de la Información"`, `"Gestión de Proyectos Sociales"`, `"Gestión Humana"`, `"Comunicación y Difusión"`, ...)

`Dashboard.tsx` derives flags (`isSuperAdmin`, `isProyectos`, `isRRHH`, `isMarketing`, `isInternal`, `isVoluntario`) from these to decide which sidebar tabs render, and individual components re-derive similar checks locally (e.g. `MarketingBoard` gates its assign-task form on `role === 'ADMIN'`; `AvailableJornadas` renders an entirely different flow for `VOLUNTARIO` vs. internal staff, who must confirm-or-justify attendance). This gating is UI-only — it hides tabs but doesn't secure data. Real access control has to come from Supabase Row Level Security policies, which live in Supabase, not this repo; don't assume a hidden tab is a security boundary.

**Data model** — see [database-schema.md](database-schema.md), a hand-maintained snapshot of the Supabase schema (despite its "generado automáticamente" header, there is no generator script in this repo — update it by hand when you change the schema):
- `profiles` — one row per Supabase auth user (`id` = auth user id). Holds `role`/`area` plus the volunteer application data displayed in `VolunteerList.tsx` (contact info, emergency contact, study center, medical conditions, shirt size, geolocation). Also holds `qr_token`, the value encoded into a volunteer's QR credential (Dashboard's "Mi Código QR" tab, via `react-qr-code`). Onboarding is two-phase (see below) so most of these advanced columns are nullable and may be empty right after signup.
- `locations` — partner sites where activities happen (`Locations.tsx`).
- `jornadas` — a scheduled activity/shift at a `location` with a coordinator (created in `Jornadas.tsx`, listed for RSVP in `AvailableJornadas.tsx`).
- `inscripciones` — a volunteer's RSVP to a `jornada` (`status` = `ASISTIRÁ`/`NO ASISTIRÁ`, plus justification fields required when internal staff can't attend); written by `AvailableJornadas.tsx`.
- `asistencias` — actual check-in records. `AttendanceScanner.tsx` scans a QR (`@yudiel/react-qr-scanner`), looks up the matching `profiles.qr_token`, then inserts a row; a unique-violation (`error.code === '23505'`) is handled explicitly as "already checked in today."
- `marketing_tasks` — content-calendar items for the `"Comunicación y Difusión"` area (`MarketingBoard.tsx`), with status pipeline `Pendiente → En Revisión → Observado/Publicado`; `draft_date` is auto-derived client-side as `post_date - 7 days`. `references` (max 3, enforced by a DB check constraint) is a reserved SQL keyword — always double-quote it (`"references"`) in raw SQL. `submission_link` is filled in by the assignee via a modal when they click "Enviar a Revisión" (not by the supervisor at task-creation time). `extension_days` tracks how many days a supervisor has pushed out `draft_date` via the "Extender Plazo" control (an inline number input, not a fixed increment). `is_active` is a soft-delete flag — the board's fetch always filters `eq('is_active', true)`, and "Archivar" just flips it to `false` rather than deleting the row.

**Onboarding is two-phase, gated by a blocking modal, not by `Register.tsx`.** `Register.tsx` only collects the frictionless minimum at signup (`first_name`, `last_name`, `email`, `password`, `birth_date`, `phone`) — everything else on `profiles` (`document_id`, `emergency_phone`, `study_center`, `career`, `address`, `medical_conditions`, `shirt_size`, plus best-effort geolocation) is deferred. `Dashboard.tsx` re-checks these `ADVANCED_PROFILE_FIELDS` on every login **only for `COORDINADOR`/`ADMIN`** (external `VOLUNTARIO` accounts are never asked for them) and, if any is empty, renders `CompleteProfileModal.tsx` as a full-screen, non-dismissable overlay (`fixed inset-0 z-[100]`, no close button) on top of the whole app shell until the user submits them. If you add a new required field to this advanced set, update `ADVANCED_PROFILE_FIELDS` in `Dashboard.tsx` and the matching form field in `CompleteProfileModal.tsx` together — they're two separate literals, not derived from one schema.

**No shared data/state layer.** There's no Redux/Zustand/Context/React Query — every feature component fetches and mutates Supabase directly inside its own `useEffect`s and handlers, keeping results in local `useState`. Follow this per-component pattern for new features rather than introducing a state library.

**Styling: Tailwind v4 via `@tailwindcss/vite`**, config is CSS-first — there is no `tailwind.config.*` or `postcss.config.*`. The brand palette is defined once in [src/index.css](src/index.css) under `@theme` as custom tokens (`--color-pq-teal`, `-teal-dark`, `-teal-deep`, `-ink`, `-cream`, `-cream-dark`, `-marku`) and consumed everywhere as `bg-pq-*`/`text-pq-*` utilities — reuse these tokens instead of hardcoding new colors. `src/App.css` is unused leftover Vite-template boilerplate (not imported anywhere).

**Feedback conventions:** `react-hot-toast` is the standard for success/error messages, with a single `<Toaster>` styled once in `App.tsx`. `Jornadas.tsx` still uses native `alert()` for its create-jornada flow — that's a legacy holdout, not the pattern to follow for new code.

**Form validation lives in [src/lib/validations.ts](src/lib/validations.ts)** — shared `PATTERNS`/`TITLES` consumed as HTML5 `pattern`/`title` attributes by `Register.tsx`, `CompleteProfileModal.tsx` and `Locations.tsx`. Two traps, both of which silently disable validation rather than erroring: (1) write character classes explicitly (`[0-9]`, never `\d`) because `"\d"` in a JS string collapses to `"d"`; (2) escape `-` and `/` inside a class (`\-`, `\/`) because browsers compile `pattern` with the regex `v` flag, where they're reserved — and when the pattern fails to compile the HTML spec says to ignore it entirely, leaving the field with *no* validation, no console error. The escapes look redundant (they would be under the older `u` flag) — don't "clean them up". These are client-side only and trivially bypassed; they're for typo prevention, not enforcement.

**"Today" means today in Lima.** When a query needs the current date (e.g. `AvailableJornadas` filtering `jornadas.date >= today`), use `todayInLima()` from [src/lib/dates.ts](src/lib/dates.ts). Never derive a date from `new Date().toISOString()`: that is the UTC date, which is already "tomorrow" from 7 p.m. Peru time — the bug that used to hide same-day jornadas every evening. `AttendanceScanner` has its own equivalent inline calculation (it subtracts 5 hours first). For arithmetic on a `YYYY-MM-DD` string, parse it at local noon (`new Date(value + 'T12:00:00')`) as `MarketingBoard` does, so the day cannot shift.

**Email templates:** the Supabase Auth email templates live in [supabase/email-templates/](supabase/email-templates/) — they are **not** compiled with the app; paste them by hand into Supabase under `Authentication → Emails`. They use Go-template vars (`{{ .ConfirmationURL }}`, `{{ .Data.first_name }}` from the `signUp` metadata) and inline-styled tables because email clients do not support flexbox or external CSS.

**Deployment:** `public/_redirects` (`/* /index.html 200`) rewrites all paths to `index.html`, i.e. this is hosted as a static SPA on a Netlify/Cloudflare-Pages-style host. Keep client-side routing working under that rewrite-everything-to-index assumption.
