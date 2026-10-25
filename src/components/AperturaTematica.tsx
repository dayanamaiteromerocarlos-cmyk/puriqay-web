import { useLayoutEffect } from 'react';
import { todayInLima } from '../lib/dates';
// Se importa con el resto (y no al vuelo) para que la apertura tape la app desde el
// primer cuadro, sin dejar ver el login un instante.
import { mostrarApertura } from '../lib/aperturaTematica';

// Último día (en Lima) de la apertura de Halloween + Canción Criolla. Pasada esta fecha
// la app abre normal; para otra temporada, cambiar la fecha (o quitar el componente).
const HASTA = '2026-11-01';
const VISTA = 'pq-apertura-tematica';
// StrictMode (en `npm run dev`) corre el efecto dos veces: así no salen dos aperturas.
let yaMostrada = false;

// Solo en la app instalada: en una pestaña del navegador sería un estorbo cada vez.
const esAppInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Muestra la apertura temática una vez por apertura de la app instalada (sessionStorage
// dura lo que la app siga abierta). `?apertura` en la dirección la fuerza, para probarla
// en el navegador.
export default function AperturaTematica() {
  // Antes de pintar, para que la app no se vea ni un cuadro antes de la apertura.
  useLayoutEffect(() => {
    if (yaMostrada) return;
    const forzada = new URLSearchParams(window.location.search).has('apertura');
    if (!forzada && (todayInLima() > HASTA || !esAppInstalada())) return;
    try {
      if (!forzada && sessionStorage.getItem(VISTA)) return;
      sessionStorage.setItem(VISTA, '1');
    } catch {
      // Sin sessionStorage se muestra igual: como mucho, otra vez al recargar.
    }
    yaMostrada = true;
    mostrarApertura();
  }, []);

  return null;
}
