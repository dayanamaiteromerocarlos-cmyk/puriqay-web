import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // <-- 1. Importamos el Toaster
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';

function App() {
  return (
    <>
      {/* 2. El Toaster maestro que controla los pop-ups en toda la app */}
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#f1e6d5', /* pq-cream */
            color: '#21514d',      /* pq-teal-deep */
            border: '2px solid #eae1d3', /* pq-cream-dark */
            fontWeight: 'bold',
            borderRadius: '1rem',
            boxShadow: '0 10px 15px -3px rgba(17, 143, 140, 0.2)',
          },
          success: {
            iconTheme: {
              primary: '#118f8c', /* pq-teal */
              secondary: '#ffffff',
            },
          },
          error: {
            style: {
              background: '#fef2f2',
              color: '#991b1b',
              border: '2px solid #fecaca',
            },
          }
        }} 
      />

      {/* 3. Tus rutas intactas */}
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Ruta Interna */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;