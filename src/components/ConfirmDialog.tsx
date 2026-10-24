import type { ReactNode } from 'react';
import { Modal, BotonSecundario } from './JornadaUI';

// Ventana de confirmación para acciones que no se deshacen solas (borrar,
// archivar). Reemplaza a `confirm()`: se ve como el resto de la app y no bloquea
// la página. El primer párrafo es la pregunta; los siguientes, la explicación.
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
    <Modal
      titulo={title}
      corto
      pie={<>
        <BotonSecundario onClick={onCancel} disabled={busy}>Cancelar</BotonSecundario>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`min-h-12 px-7 py-3 text-white font-semibold rounded-xl shadow-lg transition-colors disabled:opacity-60 ${
            danger ? 'bg-pq-error hover:bg-pq-error/90 shadow-pq-error/25' : 'bg-pq-teal hover:bg-pq-teal-dark shadow-pq-teal/30'
          }`}
        >
          {busy ? 'Procesando...' : confirmLabel}
        </button>
      </>}
    >
      <div className="text-[15px] leading-relaxed text-pq-ink flex flex-col gap-2 [&>p+p]:text-pq-ink-muted">{children}</div>
    </Modal>
  );
}
