import { HttpErrorResponse } from '@angular/common/http';

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No pudimos conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
    if (error.status === 401) return 'La sesión expiró o las credenciales no son correctas. Inicia sesión de nuevo.';
    if (error.status === 403) return 'No tienes autorización para realizar esta acción.';
    if (error.status === 404) return 'No encontramos este recurso o no pertenece a tu cuenta.';
    if (error.status === 409) return 'La operación entra en conflicto con el estado actual. Actualiza e inténtalo de nuevo.';
    if (error.status === 429) return 'Se alcanzó el límite de solicitudes. Espera un momento antes de continuar.';
    if (error.status === 503) return 'El servicio de IA no está disponible en este momento. Tu historial se conserva; puedes reintentar.';
    if (error.status === 422) {
      const detail: unknown = error.error?.detail;
      if (Array.isArray(detail)) return detail.map(item => `${item.loc?.slice(1).join('.') || 'Campo'}: ${item.msg || 'valor inválido'}`).join(' · ');
      return 'Revisa los campos del formulario e inténtalo de nuevo.';
    }
    if (error.status >= 500) return 'El servidor no pudo completar la solicitud. Inténtalo de nuevo más tarde.';
    return typeof error.error?.detail === 'string' ? error.error.detail : 'No se pudo completar la operación.';
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}
