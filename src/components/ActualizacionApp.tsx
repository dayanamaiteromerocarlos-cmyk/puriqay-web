import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useRegisterSW } from 'virtual:pwa-register/react';

const CADA_HORA = 60 * 60 * 1000;

// Registra el service worker de la PWA y avisa cuando hay una versión nueva desplegada.
// No recarga sola: la persona podría estar llenando un formulario. Si elige "Más tarde",
// la versión nueva entra la próxima vez que cierre y vuelva a abrir la app.
// En `npm run dev` no hay service worker y esto no hace nada.
export default function ActualizacionApp() {
  const {
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (!registro) return;
      // Una app instalada puede quedar abierta días: se busca versión nueva cada hora
      // y cada vez que vuelve a primer plano.
      const buscar = () => {
        if (navigator.onLine) registro.update().catch(() => {});
      };
      setInterval(buscar, CADA_HORA);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') buscar();
      });
    },
  });

  useEffect(() => {
    if (!hayVersionNueva) return;
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <span>Hay una versión nueva de Puriqay.</span>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { toast.dismiss(t.id); setHayVersionNueva(false); }}
              className="min-h-10 px-4 rounded-xl text-pq-teal-deep font-semibold hover:bg-white/60 transition-colors"
            >
              Más tarde
            </button>
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              className="min-h-10 px-4 rounded-xl bg-pq-teal hover:bg-pq-teal-dark text-white font-semibold transition-colors"
            >
              Actualizar
            </button>
          </div>
        </div>
      ),
      { id: 'version-nueva', duration: Infinity },
    );
  }, [hayVersionNueva, setHayVersionNueva, updateServiceWorker]);

  return null;
}
