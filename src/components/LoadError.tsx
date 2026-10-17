import { AlertCircle } from 'lucide-react';

// Aviso de que una consulta falló, con botón para reintentar. Sin esto, un fallo de
// red o de permisos se veía como una lista vacía ("no hay jornadas") y no como un error.
export default function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <AlertCircle size={22} className="shrink-0" />
      <div className="flex-1">
        <p className="font-bold text-sm">No pudimos cargar los datos.</p>
        <p className="text-xs font-medium mt-1 break-words">{message}</p>
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
