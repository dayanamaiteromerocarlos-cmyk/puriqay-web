// Piezas visuales que comparten las vistas de jornadas (ver docs/sistema-de-diseno.md).
import type { ReactNode } from 'react';
import { PawPrint, TreePine, CookingPot, GraduationCap, HeartPulse, CalendarDays, Clock, MapPin, X } from 'lucide-react';
import { getActionLineColor } from '../lib/catalogs';
import { fechaLarga, horario } from '../lib/jornadas';

export function EncabezadoPagina({ titulo, descripcion }: { titulo: string; descripcion?: string }) {
  return (
    <div>
      <h1 className="text-[26px] md:text-[32px] font-extrabold text-pq-teal-deep leading-tight">{titulo}</h1>
      {descripcion && <p className="mt-2 text-pq-ink-muted">{descripcion}</p>}
    </div>
  );
}

// Chip de línea de acción: un color por línea (los de getActionLineColor).
export function ChipLinea({ linea }: { linea?: string | null }) {
  if (!linea) return null;
  return (
    <span className={`self-start px-2.5 py-0.5 rounded-lg border text-xs font-semibold ${getActionLineColor(linea)}`}>
      {linea}
    </span>
  );
}

const ICONOS_LINEA: Record<string, typeof PawPrint> = {
  Animalista: PawPrint,
  Ambiental: TreePine,
  Social: CookingPot,
  Educativo: GraduationCap,
  Salud: HeartPulse,
};

export function IconoLinea({ linea, size = 24 }: { linea?: string | null; size?: number }) {
  const Icono = ICONOS_LINEA[linea ?? ''] ?? CalendarDays;
  return <Icono size={size} aria-hidden="true" />;
}

// Imagen provisional de las jornadas: Markus con lentes sobre fondo pq-marku-50.
export function ImagenJornada({ alto = 'h-[180px]' }: { alto?: string }) {
  return (
    <div className={`${alto} rounded-xl bg-pq-marku-50 flex items-center justify-center overflow-hidden`}>
      <img src="/img/markus-lentes.png" alt="Markus con lentes de sol" className="h-3/4 object-contain" />
    </div>
  );
}

type JornadaTarjeta = { id: string; name: string; date: string; start_time: string; end_time: string };

// Tarjeta de "Próximas Jornadas": imagen, línea, nombre, fecha, horario y lugar.
export function TarjetaJornada({ jornada, linea, lugar, onVerDetalle }: {
  jornada: JornadaTarjeta; linea?: string | null; lugar?: string | null; onVerDetalle: () => void;
}) {
  return (
    <article className="flex flex-col p-3 rounded-[20px] bg-white shadow-pq-card">
      <ImagenJornada alto="h-40 md:h-[180px]" />
      <div className="flex flex-col gap-2.5 flex-1 px-1.5 md:px-2 pt-4 pb-1">
        <ChipLinea linea={linea} />
        <h3 className="text-lg md:text-xl font-bold leading-snug text-pq-ink">{jornada.name}</h3>
        <div className="flex flex-col gap-2 mt-1 text-sm text-pq-ink-muted">
          <span className="flex items-center gap-2"><CalendarDays size={16} aria-hidden="true" />{fechaLarga(jornada.date)}</span>
          <span className="flex items-center gap-2"><Clock size={16} aria-hidden="true" />{horario(jornada)}</span>
          {lugar && <span className="flex items-center gap-2"><MapPin size={16} aria-hidden="true" />{lugar}</span>}
        </div>
        <div className="mt-auto pt-4 border-t border-pq-cream-dark">
          <BotonSecundario onClick={onVerDetalle} className="w-full">Ver detalles</BotonSecundario>
        </div>
      </div>
    </article>
  );
}

export function BotonSecundario({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`min-h-12 px-6 py-3 rounded-xl border-[1.5px] border-pq-teal bg-white text-pq-teal font-semibold hover:bg-pq-teal-50 transition-colors disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function BotonPrimario({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`min-h-12 px-7 py-3 rounded-xl bg-pq-teal hover:bg-pq-teal-dark text-white font-semibold shadow-lg shadow-pq-teal/30 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2.5 ${className}`}
    >
      {children}
    </button>
  );
}

// Modal del sistema de diseño: fondo pq-ink al 45 %, tarjeta de radio 20, título con
// el punto ámbar y ✕ opcional. En celular los modales largos ocupan toda la pantalla.
// `corto`: en celular sale desde abajo en vez de ocupar toda la pantalla.
export function Modal({ titulo, descripcion, onCerrar, ancho = 'max-w-[480px]', corto = false, pie, children }: {
  titulo: string; descripcion?: ReactNode; onCerrar?: () => void; ancho?: string; corto?: boolean; pie: ReactNode; children: ReactNode;
}) {
  return (
    <div className={`fixed inset-0 z-50 flex justify-center bg-pq-ink/45 md:items-center md:p-6 ${corto ? 'items-end' : 'items-stretch'}`}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-modal" className={`w-full ${ancho} bg-white shadow-xl flex flex-col md:rounded-[20px] md:max-h-[90vh] ${corto ? 'rounded-t-[20px] max-h-[90vh]' : 'max-h-full'}`}>
        <div className="flex items-start justify-between gap-4 px-5 md:px-8 pt-6 md:pt-8">
          <div>
            <h2 id="titulo-modal" className="flex items-center gap-2 text-xl md:text-2xl font-extrabold text-pq-teal-deep">
              {titulo}<span className="w-2 h-2 rounded-full bg-pq-marku" />
            </h2>
            {descripcion && <p className="mt-2 text-[15px] text-pq-ink-muted">{descripcion}</p>}
          </div>
          {onCerrar && (
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="w-11 h-11 shrink-0 rounded-xl bg-pq-cream text-pq-teal-deep flex items-center justify-center hover:bg-pq-cream-dark transition-colors">
              <X size={22} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-5 md:px-8 py-6">{children}</div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 md:px-8 py-4 md:pb-8 md:pt-5 border-t border-pq-cream-dark">
          {pie}
        </div>
      </div>
    </div>
  );
}

export const inputClass = 'w-full min-h-12 px-4 py-3 border-[1.5px] border-pq-border rounded-xl bg-white focus:border-pq-teal focus:shadow-pq-focus outline-none transition-all font-medium text-pq-ink placeholder:text-pq-ink-muted disabled:bg-pq-cream disabled:text-pq-ink-muted disabled:cursor-not-allowed';
export const labelClass = 'flex items-center gap-1.5 text-sm font-bold text-pq-teal-dark mb-2';
