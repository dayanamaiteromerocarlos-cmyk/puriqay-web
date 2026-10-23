import type { ReactNode } from 'react';

// Ventana de confirmación para acciones que no se deshacen solas (borrar,
// archivar). Reemplaza a `confirm()`: se ve como el resto de la app y no bloquea
// la página.
export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pq-ink/60 backdrop-blur-sm px-4">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-pq-cream-dark">
        <h3 id="confirm-title" className="text-xl font-black text-pq-teal-deep mb-3">{title}</h3>
        <div className="text-sm text-pq-ink/80 font-medium space-y-2">{children}</div>
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t-2 border-dashed border-pq-cream-dark">
          <button type="button" onClick={onCancel} disabled={busy} className="px-5 py-2.5 text-pq-ink/70 font-bold hover:bg-pq-cream rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-5 py-2.5 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-60 ${
              danger ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30' : 'bg-pq-teal hover:bg-pq-teal-dark shadow-pq-teal/30'
            }`}
          >
            {busy ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
