import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import VolunteerList from './VolunteerList';
import Locations from './Locations';
import QRCode from 'react-qr-code';
import Jornadas from './Jornadas';
import AttendanceScanner from './AttendanceScanner';
import AvailableJornadas from './AvailableJornadas';
import MarketingBoard from './MarketingBoard';
import CompleteProfileModal from './CompleteProfileModal';
import { Users, QrCode, LogOut, ChevronLeft, Menu, CalendarDays, CalendarCheck, MapPin, Camera, Megaphone } from 'lucide-react';

// Campos "avanzados" que Register.tsx ya no pide en la fase 1 (fricción cero).
// Solo se le exigen al equipo interno (COORDINADOR/ADMIN): si a uno de ellos le
// falta alguno, se le bloquea la plataforma con CompleteProfileModal hasta completarlo.
// Los voluntarios externos nunca ven ese modal.
const ADVANCED_PROFILE_FIELDS = [
  'document_id', 'emergency_phone', 'study_center', 'career', 'address', 'medical_conditions', 'shirt_size'
] as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingProfileFields, setMissingProfileFields] = useState<string[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    // Si la pantalla es de celular al cargar, escondemos el menú por defecto
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    checkUserRole();
  }, []);

  // Si la sesión se cierra por fuera de "Cerrar Sesión" (token vencido o revocado,
  // contraseña cambiada en otro dispositivo), las consultas empezarían a fallar o a
  // devolver vacío sin explicación. Mejor avisar y mandar al login.
  const loggingOut = useRef(false);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (!loggingOut.current) toast.error('Tu sesión terminó. Inicia sesión de nuevo.');
        navigate('/', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate('/');
      return;
    }
    setUserId(user.id);

    // Nota: esta lista de columnas debe reflejar ADVANCED_PROFILE_FIELDS de arriba.
    const { data, error } = await supabase
      .from('profiles')
      .select('role, qr_token, area, document_id, emergency_phone, study_center, career, address, medical_conditions, shirt_size, latitude, longitude')
      .eq('id', user.id)
      .single();

    // Si el perfil no se puede leer (RLS, fila inexistente, etc.) no dejamos un
    // dashboard fantasma: mostramos el motivo real en pantalla.
    if (error) {
      console.error("Error al cargar el perfil:", error.message);
      setProfileError(error.message);
    } else if (!data) {
      setProfileError("No encontramos tu fila en la tabla profiles.");
    }

    if (data) {
      setRole(data.role);
      setArea(data.area);
      setQrToken(data.qr_token);
      setActiveTab('available_jornadas');

      // Solo el equipo interno (COORDINADOR/ADMIN) completa los datos avanzados, y
      // se le piden únicamente los campos que tenga vacíos. Un voluntario externo se
      // queda con el registro mínimo de la fase 1 y nunca ve ese modal; si más adelante
      // lo promueven a interno, le aparecerá en su siguiente ingreso.
      const esEquipoInterno = data.role === 'COORDINADOR' || data.role === 'ADMIN';
      const camposVacios: string[] = ADVANCED_PROFILE_FIELDS.filter(field => !data[field]);
      if (!data.latitude || !data.longitude) camposVacios.push('location');
      setMissingProfileFields(esEquipoInterno ? camposVacios : []);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    loggingOut.current = true;
    await supabase.auth.signOut();
    navigate('/');
  };

  const SidebarItem = ({ id, label, icon: Icon }: any) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => {
          setActiveTab(id);
          // Si estamos en celular, cerramos el menú automáticamente al elegir una opción
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center p-3 mb-2 rounded-xl transition-all duration-200 font-medium ${
          isActive 
            ? 'bg-pq-teal text-white shadow-md shadow-pq-teal/30' 
            : 'text-pq-ink/70 hover:bg-pq-cream-dark hover:text-pq-teal-dark'
        }`}
        title={!isSidebarOpen ? label : ''}
      >
        <Icon size={22} className={`min-w-[22px] ${isActive ? 'text-white' : 'text-pq-teal-dark/70'}`} />
        {isSidebarOpen && <span className="ml-3 truncate">{label}</span>}
      </button>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500 font-medium">Cargando Puriqay...</div>;

  // Sin perfil no hay rol, y sin rol el menú saldría vacío: es mejor decir qué pasó.
  if (profileError) {
    return (
      <div className="min-h-screen bg-pq-cream flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-pq-cream-dark text-center">
          <h2 className="text-2xl font-black text-pq-teal-deep">No pudimos cargar tu perfil</h2>
          <p className="text-sm text-pq-ink/70 font-medium mt-3">
            Tu cuenta existe, pero la aplicación no logró leer tus datos de la base.
            Avisa al equipo de Puriqay con este detalle:
          </p>
          <p className="text-xs font-mono text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mt-4 break-words">
            {profileError}
          </p>
          <button
            onClick={handleLogout}
            className="w-full mt-6 bg-pq-teal hover:bg-pq-teal-dark text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-pq-teal/30 transition-all"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  const isSuperAdmin = (area === 'Gerencia General' || area === 'Tecnologías de la Información') && role === 'ADMIN';
  const isProyectos = area === 'Gestión de Proyectos Sociales' && role === 'ADMIN';
  const isRRHH = area === 'Gestión Humana' && role === 'ADMIN';
  const isMarketing = area === 'Comunicación y Difusión'; 
  const isInternal = role === 'ADMIN' || role === 'COORDINADOR';
  const isVoluntario = role === 'VOLUNTARIO';

  return (
    <div className="flex h-screen bg-pq-cream overflow-hidden relative">

      {/* BARRERA DE PERFIL INCOMPLETO: bloquea el uso de la plataforma hasta completarlo */}
      {missingProfileFields.length > 0 && userId && (
        <CompleteProfileModal userId={userId} missingFields={missingProfileFields} onCompleted={() => setMissingProfileFields([])} />
      )}

      {/* FONDO OSCURO PARA CELULARES (Aparece cuando el menú está abierto) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-pq-ink/20 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* BARRA LATERAL (SIDEBAR) */}
      <div className={`fixed md:relative z-50 h-full bg-white border-r border-pq-cream-dark transition-all duration-300 flex flex-col shadow-2xl md:shadow-none ${
        isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'
      }`}>
        
        <div className="h-20 flex items-center justify-between px-5 border-b border-pq-cream-dark shrink-0">
          {isSidebarOpen && (
            <div className="flex flex-col">
              <h1 className="font-black text-2xl text-pq-teal-deep tracking-tight flex items-center gap-1">
                Puriqay
                <span className="w-2 h-2 rounded-full bg-pq-marku"></span>
              </h1>
              <span className="text-[10px] uppercase font-bold text-pq-teal-dark tracking-widest">Voluntariado</span>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 rounded-xl hover:bg-pq-cream text-pq-teal-deep transition-colors ml-auto md:block"
          >
            {isSidebarOpen ? <ChevronLeft size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isSidebarOpen && (
          <div className="px-5 pt-5 pb-3">
            <div className="bg-pq-cream rounded-xl p-3 border border-pq-cream-dark/50">
              <p className="text-xs font-black text-pq-teal-deep">{role}</p>
              <p className="text-[10px] text-pq-ink/60 truncate uppercase font-bold mt-0.5">{area}</p>
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 py-2 overflow-y-auto">
          {(isSuperAdmin || isProyectos) && <SidebarItem id="locations" label="Lugares" icon={MapPin} />}
          {(isSuperAdmin || isProyectos) && <SidebarItem id="jornadas" label="Jornadas" icon={CalendarDays} />}
          {(isSuperAdmin || isRRHH) && <SidebarItem id="volunteers" label="Voluntarios" icon={Users} />}
          {(isSuperAdmin || isMarketing) && <SidebarItem id="marketing" label="Área de Marketing" icon={Megaphone} />}

          {isInternal && (
            <>
              <SidebarItem id="available_jornadas" label="Próximas Jornadas" icon={CalendarCheck} />
              <SidebarItem id="scanner" label="Control de Asistencia" icon={Camera} />
            </>
          )}

          {isVoluntario && (
            <SidebarItem id="available_jornadas" label="Próximas Jornadas" icon={CalendarCheck} />
          )}

          <SidebarItem id="qr" label="Mi Código QR" icon={QrCode} />
        </nav>

        <div className="p-4 border-t border-pq-cream-dark shrink-0">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center p-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all font-medium"
            title={!isSidebarOpen ? 'Cerrar Sesión' : ''}
          >
            <LogOut size={22} className="min-w-[22px]" />
            {isSidebarOpen && <span className="ml-3 truncate">Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        
        {/* BARRA SUPERIOR (SOLO VISIBLE EN CELULARES) */}
        <div className="md:hidden flex items-center justify-between bg-white px-5 py-4 border-b border-pq-cream-dark shrink-0 shadow-sm z-10">
          <h1 className="font-black text-2xl text-pq-teal-deep tracking-tight flex items-center gap-1">
            Puriqay <span className="w-2 h-2 rounded-full bg-pq-marku"></span>
          </h1>
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 rounded-xl bg-pq-cream text-pq-teal-deep hover:bg-pq-cream-dark transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* ÁREA DE SCROLL DE LOS MÓDULOS */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {activeTab === 'locations' && (
            <div className="max-w-6xl mx-auto">
              <Locations />
            </div>
          )}

          {activeTab === 'jornadas' && (
            <div className="max-w-6xl mx-auto">
              <Jornadas />
            </div>
          )}

          {activeTab === 'volunteers' && (
            <div className="max-w-6xl mx-auto">
              <VolunteerList />
            </div>
          )}

          {activeTab === 'scanner' && (
            <div className="max-w-6xl mx-auto">
              <AttendanceScanner />
            </div>
          )}

          {activeTab === 'available_jornadas' && (
            <div className="max-w-6xl mx-auto">
              <AvailableJornadas />
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="max-w-6xl mx-auto">
              <MarketingBoard />
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="max-w-sm mx-auto bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-pq-cream-dark text-center mt-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-4 bg-pq-teal"></div>
              <h2 className="text-3xl font-black text-pq-teal-deep mt-4 flex items-center justify-center gap-2">
                Credencial <span className="w-2.5 h-2.5 rounded-full bg-pq-marku"></span>
              </h2>
              <p className="text-pq-ink/60 font-medium text-sm mt-3 mb-8">
                Muestra este código al equipo de Puriqay al llegar a tus actividades.
              </p>
              <div className="bg-white p-4 rounded-3xl border-4 border-pq-cream-dark shadow-inner inline-block relative group transition-transform hover:scale-105">
                {qrToken ? (
                  <QRCode value={qrToken} size={200} level="H" fgColor="#21514d" bgColor="#ffffff"/>
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center bg-pq-cream/50 rounded-2xl">
                    <p className="text-pq-teal-dark font-bold animate-pulse">Generando...</p>
                  </div>
                )}
              </div>
              <div className="mt-8 bg-pq-cream/30 py-3 px-4 rounded-xl border border-pq-cream-dark">
                <p className="text-[10px] font-black text-pq-teal-dark uppercase tracking-widest mb-1">Token Seguro</p>
                <p className="text-xs text-pq-ink/50 font-mono truncate">{qrToken}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}