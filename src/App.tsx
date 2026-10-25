import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // <-- 1. Importamos el Toaster
import Login from './components/Login';
import ActualizacionApp from './components/ActualizacionApp';
import AperturaTematica from './components/AperturaTematica';

// Solo el login va en la descarga inicial; el resto se pide al entrar a su ruta.
const cargarDashboard = () => import('./components/Dashboard');
const Dashboard = lazy(cargarDashboard);
const Register = lazy(() => import('./components/Register'));
const ForgotPassword = lazy(() => import('./components/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));

function App() {
  // Mientras la persona escribe su contraseña, el panel ya se va descargando.
  useEffect(() => { cargarDashboard(); }, []);

  return (
    <>
      {/* 2. El Toaster maestro que controla los pop-ups en toda la app */}
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#e3f4f2', /* pq-teal-50 */
            color: '#0b4d4b',      /* pq-teal-deep */
            fontWeight: 600,
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(31, 43, 42, 0.08)', /* shadow-pq-card */
          },
          success: {
            iconTheme: {
              primary: '#0e7a77', /* pq-teal */
              secondary: '#ffffff',
            },
          },
          error: {
            style: {
              background: '#fdecea', /* pq-error-50 */
              color: '#b42318',      /* pq-error */
            },
          }
        }}
      />
      <ActualizacionApp />
      <AperturaTematica />

      {/* 3. Tus rutas intactas */}
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          
            {/* Ruta Interna */}
            {/* Cada pestaña tiene su dirección (/dashboard/jornadas, ...) para que "Atrás"
                las recorra; Dashboard lee el resto de la ruta. */}
            <Route path="/dashboard/*" element={<Dashboard />} />
          
            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}

export default App;