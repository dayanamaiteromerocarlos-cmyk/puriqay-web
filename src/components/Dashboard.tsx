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
import MiPerfil from './MiPerfil';
import Inicio from './Inicio';
import MisAsistencias from './MisAsistencias';
import JornadaDetalle from './JornadaDetalle';
import { permisos } from '../lib/permisos';
import { Users, QrCode, LogOut, ChevronLeft, Menu, X, House, ClipboardCheck, CalendarDays, CalendarCheck, MapPin, Camera, Megaphone, UserCircle } from 'lucide-react';

// Campos "avanzados" que Register.tsx ya no pide en la fase 1 (fricción cero).
// Solo se le exigen al equipo interno (COORDINADOR/ADMIN): si a uno de ellos le
// falta alguno, se le bloquea la plataforma con CompleteProfileModal hasta completarlo.
// Los voluntarios externos nunca ven ese modal.
const ADVANCED_PROFILE_FIELDS = [
  'document_id', 'emergency_phone', 'study_center', 'career', 'address', 'medical_conditions', 'shirt_size'
] as const;

// "Ana María" + "Pérez Gómez" -> "Ana Pérez": un nombre y un apellido para el menú.
const nombreCorto = (first: string | null, last: string | null) =>
  [first, last].map(s => s?.trim().split(/\s+/)[0] ?? '').filter(Boolean).join(' ');

export default function Dashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [nombre, setNombre] = useState('');
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingProfileFields, setMissingProfileFields] = useState<string[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);

  // En escritorio el menú se puede contraer a solo iconos; en celular es un panel
  // que se abre desde la derecha con el botón ☰.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [menuMovil, setMenuMovil] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  // Jornada abierta en "Detalle de Jornada" (se abre desde Inicio, Próximas Jornadas
  // o Jornadas; "Volver" regresa a la pestaña de donde vino).
  const [detalle, setDetalle] = useState<string | null>(null);

  useEffect(() => {
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
      .select('role, qr_token, area, is_active, first_name, last_name, document_id, emergency_phone, study_center, career, address, medical_conditions, shirt_size, latitude, longitude')
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
      setIsActive(data.is_active);
      setNombre(nombreCorto(data.first_name, data.last_name));
      setQrToken(data.qr_token);
      setActiveTab('inicio');

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

  const irA = (tab: string) => {
    setActiveTab(tab);
    setDetalle(null);
    setMenuMovil(false);
  };

  const verDetalle = (jornadaId: string) => setDetalle(jornadaId);

  // `compacto`: menú de escritorio contraído (solo iconos).
  const SidebarItem = ({ id, label, icon: Icon, compacto }: any) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => irA(id)}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center min-h-12 p-3 rounded-xl transition-all duration-200 font-medium ${
          isActive
            ? 'bg-pq-teal text-white shadow-md shadow-pq-teal/30'
            : 'text-pq-ink/70 hover:bg-pq-cream hover:text-pq-teal-deep'
        }`}
        title={compacto ? label : ''}
      >
        <Icon size={22} className={`min-w-[22px] ${isActive ? 'text-white' : 'text-pq-teal-dark/70'}`} />
        {!compacto && <span className="ml-3 truncate text-left">{label}</span>}
      </button>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-pq-ink-muted font-medium">Cargando Puriqay...</div>;

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
          <p className="text-xs font-mono text-pq-error bg-pq-error-50 border border-pq-error/20 rounded-xl p-3 mt-4 break-words">
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

  const perfil = { role, area, is_active: isActive };
  const p = permisos(perfil);

  const NOMBRES_TAB: Record<string, string> = {
    inicio: 'Inicio', jornadas: 'Jornadas', available_jornadas: 'Próximas Jornadas',
  };

  // Contenido del menú, el mismo en escritorio y en el panel del celular.
  const contenidoMenu = (compacto: boolean) => (
    <>
      {!compacto && (
        <div className="px-5 pt-5 pb-3">
          <div className="bg-pq-cream rounded-xl p-3 border border-pq-cream-dark/50">
            <p className="text-xs font-black text-pq-teal-deep">{role}</p>
            {area && <p className="text-[10px] text-pq-ink/60 truncate uppercase font-bold mt-0.5">{area}</p>}
            {isActive === false && (
              <p className="text-[10px] text-pq-error uppercase font-black mt-1">Cuenta inactiva</p>
            )}
          </div>
        </div>
      )}

      <nav className="flex-1 px-4 py-2 overflow-y-auto flex flex-col gap-2">
        <SidebarItem id="inicio" label="Inicio" icon={House} compacto={compacto} />
        {p.gestionaJornadas && <SidebarItem id="locations" label="Lugares" icon={MapPin} compacto={compacto} />}
        {p.gestionaJornadas && <SidebarItem id="jornadas" label="Jornadas" icon={CalendarDays} compacto={compacto} />}
        {p.veVoluntarios && <SidebarItem id="volunteers" label="Voluntarios" icon={Users} compacto={compacto} />}
        {p.veMarketing && <SidebarItem id="marketing" label="Área de Marketing" icon={Megaphone} compacto={compacto} />}
        <SidebarItem id="available_jornadas" label="Próximas Jornadas" icon={CalendarCheck} compacto={compacto} />
        <SidebarItem id="mis_asistencias" label="Mis asistencias" icon={ClipboardCheck} compacto={compacto} />
        {p.esInterno && <SidebarItem id="scanner" label="Control de Asistencia" icon={Camera} compacto={compacto} />}
        <SidebarItem id="qr" label="Mi Código QR" icon={QrCode} compacto={compacto} />
      </nav>

      <div className="p-4 border-t border-pq-cream-dark shrink-0 flex flex-col gap-2">
        <button
          onClick={() => irA('perfil')}
          className={`w-full flex items-center min-h-12 p-3 rounded-xl transition-all font-bold ${
            activeTab === 'perfil' ? 'bg-pq-teal text-white shadow-md shadow-pq-teal/30' : 'text-pq-teal-deep hover:bg-pq-cream'
          }`}
          title={compacto ? `${nombre || 'Mi perfil'} · Ver mi perfil` : 'Ver mi perfil'}
        >
          <UserCircle size={22} className="min-w-[22px]" />
          {!compacto && <span className="ml-3 truncate">{nombre || 'Mi perfil'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center min-h-12 p-3 rounded-xl text-pq-error hover:bg-pq-error-50 transition-all font-medium"
          title={compacto ? 'Cerrar Sesión' : ''}
        >
          <LogOut size={22} className="min-w-[22px]" />
          {!compacto && <span className="ml-3 truncate">Cerrar Sesión</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-pq-cream overflow-hidden relative">

      {/* BARRERA DE PERFIL INCOMPLETO: bloquea el uso de la plataforma hasta completarlo */}
      {missingProfileFields.length > 0 && userId && (
        <CompleteProfileModal userId={userId} missingFields={missingProfileFields} onCompleted={() => setMissingProfileFields([])} />
      )}

      {/* MENÚ LATERAL DE ESCRITORIO */}
      <aside className={`hidden md:flex h-full bg-white border-r border-pq-cream-dark transition-all duration-300 flex-col shrink-0 ${
        isSidebarOpen ? 'w-64' : 'w-20'
      }`}>
        <div className={`h-20 flex items-center border-b border-pq-cream-dark shrink-0 ${isSidebarOpen ? 'justify-between px-5' : 'justify-center'}`}>
          {isSidebarOpen && <img src="/img/logo-puriqay.png" alt="Puriqay" className="w-12 h-12 rounded-full object-cover" />}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? 'Contraer menú' : 'Expandir menú'}
            className="p-2 rounded-xl hover:bg-pq-cream text-pq-teal-deep transition-colors"
          >
            {isSidebarOpen ? <ChevronLeft size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {contenidoMenu(!isSidebarOpen)}
      </aside>

      {/* MENÚ DE CELULAR: panel desde la derecha */}
      {menuMovil && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-pq-ink/45" onClick={() => setMenuMovil(false)} aria-hidden="true" />
          <aside role="dialog" aria-modal="true" aria-label="Menú" className="absolute top-0 right-0 bottom-0 w-[300px] max-w-[85vw] bg-white flex flex-col shadow-[-8px_0_24px_rgba(31,43,42,0.16)]">
            <div className="h-[72px] flex items-center justify-between pl-5 pr-4 border-b border-pq-cream-dark shrink-0">
              <img src="/img/logo-puriqay.png" alt="Puriqay" className="w-11 h-11 rounded-full object-cover" />
              <button onClick={() => setMenuMovil(false)} aria-label="Cerrar menú" className="w-11 h-11 rounded-xl bg-pq-cream text-pq-teal-deep flex items-center justify-center">
                <X size={24} />
              </button>
            </div>
            {contenidoMenu(false)}
          </aside>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full">

        {/* CABECERA (SOLO EN CELULARES) */}
        <header className="md:hidden h-[72px] flex items-center justify-between bg-white px-4 border-b border-pq-cream-dark shrink-0 shadow-sm z-10">
          <img src="/img/logo-puriqay.png" alt="Puriqay" className="w-11 h-11 rounded-full object-cover" />
          <button
            onClick={() => setMenuMovil(true)}
            aria-label="Abrir menú"
            className="w-11 h-11 rounded-xl bg-pq-cream text-pq-teal-deep flex items-center justify-center hover:bg-pq-cream-dark transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* ÁREA DE SCROLL DE LOS MÓDULOS */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:p-10">

          {detalle && (
            <div className="max-w-[1000px] mx-auto">
              <JornadaDetalle
                jornadaId={detalle}
                esInterno={p.esInterno}
                volverA={NOMBRES_TAB[activeTab] ?? 'Próximas Jornadas'}
                onVolver={() => setDetalle(null)}
              />
            </div>
          )}

          {!detalle && activeTab === 'inicio' && userId && (
            <div className="max-w-[1000px] mx-auto">
              <Inicio userId={userId} nombre={nombre} onVerDetalle={verDetalle} onVerTodas={() => irA('available_jornadas')} />
            </div>
          )}

          {!detalle && activeTab === 'mis_asistencias' && userId && (
            <div className="max-w-[800px] mx-auto">
              <MisAsistencias userId={userId} />
            </div>
          )}

          {!detalle && activeTab === 'locations' && (
            <div className="max-w-6xl mx-auto">
              <Locations archivaLugares={p.archivaLugares} />
            </div>
          )}

          {!detalle && activeTab === 'jornadas' && (
            <div className="max-w-[1000px] mx-auto">
              <Jornadas onVerDetalle={verDetalle} />
            </div>
          )}

          {!detalle && activeTab === 'volunteers' && (
            <div className="max-w-6xl mx-auto">
              <VolunteerList userId={userId} perfil={perfil} />
            </div>
          )}

          {!detalle && activeTab === 'scanner' && (
            <div className="max-w-6xl mx-auto">
              <AttendanceScanner />
            </div>
          )}

          {!detalle && activeTab === 'available_jornadas' && (
            <div className="max-w-[1000px] mx-auto">
              <AvailableJornadas onVerDetalle={verDetalle} />
            </div>
          )}

          {!detalle && activeTab === 'marketing' && (
            <div className="max-w-6xl mx-auto">
              <MarketingBoard />
            </div>
          )}

          {!detalle && activeTab === 'perfil' && userId && (
            <div className="max-w-4xl mx-auto">
              <MiPerfil userId={userId} onSaved={(first, last) => setNombre(nombreCorto(first, last))} />
            </div>
          )}

          {!detalle && activeTab === 'qr' && (
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
                  <QRCode value={qrToken} size={200} level="H" fgColor="#0b4d4b" bgColor="#ffffff"/>
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