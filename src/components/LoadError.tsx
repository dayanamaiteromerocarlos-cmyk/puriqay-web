import { CloudOff, RefreshCw } from 'lucide-react';

// Convierte el mensaje técnico de una consulta fallida en algo que entienda quien usa la
// web. Lo desconocido se muestra tal cual (y siempre queda en la consola del navegador).
const explicar = (message: string): { texto: string; tecnico: boolean } => {
  const m = message.toLowerCase();
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed') || m.includes('network request failed')) {
    return { texto: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', tecnico: false };
  }
  if (m.includes('permission denied') || m.includes('row-level security') || m.includes('jwt')) {
    return { texto: 'No tienes permiso para ver estos datos o tu sesión terminó. Si crees que es un error, cierra sesión y vuelve a entrar.', tecnico: false };
  }
  return { texto: message, tecnico: true };
};

// Aviso de que una consulta falló, con botón para reintentar. Sin esto, un fallo de
// red o de permisos se veía como una lista vacía ("no hay jornadas") y no como un error.
export default function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { texto, tecnico } = explicar(message);
  if (tecnico) console.error('Error de carga:', message);

  return (
    <div role="alert" className="p-5 md:p-6 rounded-2xl bg-white border-[1.5px] border-pq-error/25 flex flex-wrap items-center gap-4">
      <span className="w-12 h-12 shrink-0 rounded-full bg-pq-error-50 text-pq-error flex items-center justify-center">
        <CloudOff size={24} aria-hidden="true" />
      </span>
      <div className="flex-[1_1_260px] min-w-0">
        <p className="font-display text-[17px] font-bold text-pq-ink">No pudimos cargar los datos</p>
        <p className={`mt-1 text-pq-ink-muted break-words ${tecnico ? 'text-xs font-mono' : 'text-sm'}`}>{texto}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 rounded-xl border-[1.5px] border-pq-error bg-white text-pq-error text-sm font-semibold hover:bg-pq-error-50 transition-colors w-full sm:w-auto"
      >
        <RefreshCw size={16} aria-hidden="true" />Reintentar
      </button>
    </div>
  );
}
