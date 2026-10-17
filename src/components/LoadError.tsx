import { AlertCircle } from 'lucide-react';

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
    <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <AlertCircle size={22} className="shrink-0" />
      <div className="flex-1">
        <p className="font-bold text-sm">No pudimos cargar los datos.</p>
        <p className={`mt-1 break-words ${tecnico ? 'text-xs font-mono' : 'text-xs font-medium'}`}>{texto}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
