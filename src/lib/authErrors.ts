// Traduce los errores de Supabase Auth (que llegan en inglés) a mensajes en español.
// Se decide por `error.code` (estable) y, si no hay código, por el texto del mensaje.
// Cualquier error desconocido muestra un mensaje genérico; el original queda en consola.

type AuthLikeError = { code?: string; message?: string; status?: number; name?: string };

const POR_CODIGO: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Aún no confirmaste tu correo. Revisa tu bandeja de entrada (y el spam) y haz clic en el enlace.',
  over_request_rate_limit: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  over_email_send_rate_limit: 'Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.',
  user_already_exists: 'Ya existe una cuenta con ese correo.',
  weak_password: 'La contraseña es muy débil. Usa mínimo 10 caracteres, con mayúscula, minúscula, número y símbolo.',
  same_password: 'La nueva contraseña debe ser distinta de la actual.',
  email_address_invalid: 'El correo no es válido.',
  validation_failed: 'Revisa los datos ingresados.',
  otp_expired: 'El enlace venció o ya se usó. Solicita uno nuevo.',
  session_expired: 'Tu sesión terminó. Inicia sesión de nuevo.',
  user_banned: 'Esta cuenta está suspendida. Contacta al equipo de Puriqay.',
};

export const traducirErrorAuth = (error: AuthLikeError | null | undefined): string => {
  if (!error) return '';
  if (error.code && POR_CODIGO[error.code]) return POR_CODIGO[error.code];

  const msg = (error.message || '').toLowerCase();
  if (error.status === 429 || msg.includes('rate limit')) return POR_CODIGO.over_request_rate_limit;
  if (msg.includes('invalid login credentials')) return POR_CODIGO.invalid_credentials;
  if (msg.includes('email not confirmed')) return POR_CODIGO.email_not_confirmed;
  if (msg.includes('expired') || msg.includes('invalid or has expired')) return POR_CODIGO.otp_expired;
  if (msg.includes('failed to fetch') || msg.includes('network') || error.name === 'AuthRetryableFetchError') {
    return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
  }

  console.error('Error de autenticación sin traducir:', error);
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
};
