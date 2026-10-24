import { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { PATTERNS, TITLES, limpiarNombre } from '../lib/validations';

type CompleteProfileModalProps = {
  userId: string;
  // Solo los campos que están vacíos en el perfil: el modal pide únicamente esos.
  // Puede incluir 'location' cuando faltan las coordenadas.
  missingFields: string[];
  onCompleted: () => void;
};

// Modal bloqueante de "Completado de Perfil Progresivo". Se le muestra solo al
// equipo interno (COORDINADOR/ADMIN) con datos incompletos, y pide exclusivamente
// los campos que le faltan. No tiene botón de cerrar a propósito.
export default function CompleteProfileModal({ userId, missingFields, onCompleted }: CompleteProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const falta = (campo: string) => missingFields.includes(campo);

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationText, setLocationText] = useState('📍 Obtener mi ubicación actual');
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const [formData, setFormData] = useState({
    documentId: '', emergencyPhone: '', studyCenter: '', otherStudyCenter: '',
    career: '', address: '', medicalConditions: 'Ninguna', shirtSize: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setLocationText('Obteniendo...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
          setLocationText('✅ Ubicación guardada');
        },
        () => {
          toast.error('No pudimos obtener tu ubicación. Permítela desde el candado de la barra de direcciones o ingresa las coordenadas a mano.');
          setLocationText('📍 Obtener mi ubicación actual');
          setShowManualLocation(true);
        }
      );
    } else {
      toast.error('Tu navegador no soporta geolocalización. Ingresa las coordenadas a mano.');
      setShowManualLocation(true);
    }
  };

  // Alternativa cuando el navegador niega el permiso o no tiene geolocalización: el modal
  // no se puede cerrar, así que sin esto la persona quedaba atrapada.
  const parseCoord = (value: string, limit: number) => {
    const n = Number(value.replace(',', '.'));
    return value.trim() !== '' && Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // La ubicación es un botón, no un input: el navegador no la valida con `required`.
    // Vale la del GPS o, si no hubo permiso, las coordenadas escritas a mano.
    let finalLat = lat;
    let finalLng = lng;
    if (falta('location') && (finalLat === null || finalLng === null)) {
      finalLat = parseCoord(manualLat, 90);
      finalLng = parseCoord(manualLng, 180);
      if (finalLat === null || finalLng === null) {
        toast.error(showManualLocation
          ? 'Las coordenadas no son válidas. Latitud entre -90 y 90, longitud entre -180 y 180 (ej. -12.0464 y -77.0428).'
          : 'Debes registrar tu ubicación actual para continuar.');
        return;
      }
    }

    setLoading(true);

    // Solo mandamos los campos que se pidieron, para no sobrescribir con vacío
    // los datos que el perfil ya tenía.
    const payload: Record<string, string | number | null> = {};
    if (falta('document_id')) payload.document_id = formData.documentId;
    if (falta('emergency_phone')) payload.emergency_phone = formData.emergencyPhone;
    if (falta('study_center')) payload.study_center = formData.studyCenter === 'Otro' ? limpiarNombre(formData.otherStudyCenter) : formData.studyCenter;
    if (falta('career')) payload.career = limpiarNombre(formData.career);
    if (falta('address')) payload.address = formData.address;
    if (falta('medical_conditions')) payload.medical_conditions = formData.medicalConditions;
    if (falta('shirt_size')) payload.shirt_size = formData.shirtSize;
    if (falta('location')) {
      payload.latitude = finalLat;
      payload.longitude = finalLng;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('id'); // .select() nos devuelve las filas realmente afectadas

    if (error) {
      toast.error('Error al guardar tus datos: ' + error.message);
    } else if (!data || data.length === 0) {
      // Si RLS bloquea el UPDATE, PostgREST responde OK con 0 filas y sin error:
      // sin este chequeo el perfil parecía guardarse y volvía a pedirse en el siguiente login.
      toast.error('No se pudo guardar tu perfil: la base de datos no actualizó ninguna fila. Revisa las políticas RLS de la tabla profiles en Supabase.');
    } else {
      toast.success('¡Perfil completado!');
      onCompleted();
    }
    setLoading(false);
  };

  const inputClass = "w-full px-4 py-3 border-[1.5px] border-pq-border rounded-xl bg-white focus:border-pq-teal focus:shadow-pq-focus outline-none transition-all font-medium text-pq-ink";
  const labelClass = "block text-sm font-bold text-pq-teal-dark mb-2";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-pq-ink/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white p-8 md:p-12 rounded-3xl shadow-2xl border border-pq-cream-dark my-8">

        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-pq-teal-deep flex items-center justify-center gap-2">
            Completa tu Perfil <span className="w-2.5 h-2.5 rounded-full bg-pq-marku mt-2"></span>
          </h2>
          <p className="text-pq-teal-dark/70 font-bold uppercase tracking-widest text-xs mt-2">
            {missingFields.length === 1 ? 'Nos falta un dato' : 'Nos faltan algunos datos'}
          </p>
          <p className="text-pq-ink/70 font-medium text-sm mt-4">
            Como parte del equipo interno necesitamos esta información para poder coordinar contigo en las jornadas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {falta('document_id') && (
              <div>
                <label className={labelClass}>DNI</label>
                <input type="text" name="documentId" required maxLength={8} inputMode="numeric" pattern={PATTERNS.dni} title={TITLES.dni} value={formData.documentId} onChange={handleChange} className={inputClass} />
              </div>
            )}

            {falta('emergency_phone') && (
              <div>
                <label className={labelClass}>Celular de Emergencia</label>
                <input type="tel" name="emergencyPhone" required maxLength={9} inputMode="numeric" pattern={PATTERNS.celular} title={TITLES.celular} value={formData.emergencyPhone} onChange={handleChange} className={inputClass} />
              </div>
            )}

            {falta('study_center') && (
              <div>
                <label className={labelClass}>Centro de Estudios</label>
                <select name="studyCenter" required value={formData.studyCenter} onChange={handleChange} className={inputClass}>
                  <option value="">Selecciona una opción</option>
                  <option value="UNMSM">UNMSM</option>
                  <option value="UNI">UNI</option>
                  <option value="PUCP">PUCP</option>
                  <option value="UPC">UPC</option>
                  <option value="ULima">Universidad de Lima</option>
                  <option value="Otro">Otro</option>
                </select>
                {formData.studyCenter === 'Otro' && (
                  <input type="text" name="otherStudyCenter" placeholder="Escribe tu centro de estudios" required pattern={PATTERNS.soloLetras} title={TITLES.soloLetras} value={formData.otherStudyCenter} onChange={handleChange} className={`${inputClass} mt-3`} />
                )}
              </div>
            )}

            {falta('career') && (
              <div>
                <label className={labelClass}>Carrera / Profesión</label>
                <input type="text" name="career" required pattern={PATTERNS.soloLetras} title={TITLES.soloLetras} value={formData.career} onChange={handleChange} className={inputClass} />
              </div>
            )}

            {falta('address') && (
              <div>
                <label className={labelClass}>Dirección Exacta</label>
                <input type="text" name="address" required pattern={PATTERNS.direccion} title={TITLES.direccion} value={formData.address} onChange={handleChange} className={inputClass} />
              </div>
            )}

            {falta('location') && (
              <div className="flex flex-col justify-end">
                <label className={labelClass}>Ubicación Actual <span className="text-pq-error">*</span></label>
                <button type="button" onClick={handleGetLocation} className={`w-full py-3 px-4 rounded-xl font-bold transition-all border-2 ${
                  lat ? 'bg-pq-teal/10 text-pq-teal-dark border-pq-teal/30 shadow-sm' : 'bg-pq-cream/50 text-pq-ink/60 border-pq-error/20 hover:bg-pq-cream hover:text-pq-teal-dark'
                }`}>
                  {locationText}
                </button>
                {showManualLocation && !lat && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-pq-ink/70 font-medium">
                      Si tu navegador bloquea la ubicación, escribe las coordenadas. En Google Maps, haz clic derecho sobre tu ubicación y copia los dos números.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" inputMode="decimal" name="manualLat" placeholder="Latitud (-12.0464)" value={manualLat} onChange={(e) => setManualLat(e.target.value)} className={inputClass} />
                      <input type="text" inputMode="decimal" name="manualLng" placeholder="Longitud (-77.0428)" value={manualLng} onChange={(e) => setManualLng(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {falta('medical_conditions') && (
              <div>
                <label className={labelClass}>Alergias / Condiciones Médicas</label>
                <input type="text" name="medicalConditions" required value={formData.medicalConditions} onChange={handleChange} className={inputClass} />
              </div>
            )}

            {falta('shirt_size') && (
              <div>
                <label className={labelClass}>Talla de Polo / Chaleco</label>
                <select name="shirtSize" required value={formData.shirtSize} onChange={handleChange} className={inputClass}>
                  <option value="">Selecciona tu talla</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                </select>
              </div>
            )}
          </div>

          <div className="pt-4 border-t-2 border-dashed border-pq-cream-dark mt-4">
            <button type="submit" disabled={loading} className="w-full bg-pq-teal hover:bg-pq-teal-dark text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-pq-teal/30 hover:-translate-y-0.5 transition-all duration-200">
              {loading ? 'Guardando...' : 'Guardar y Continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
