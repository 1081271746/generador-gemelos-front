# Arquitectura del frontend

## Separación de responsabilidades

- `core/config`: configuración pública validada antes de iniciar llamadas autenticadas.
- `core/auth`: sesión tab-local, restauración por servidor y guards.
- `core/http`: interceptor limitado al backend y presentación de errores.
- `core/services`: acceso al contrato existente; no contiene lógica de IA ni duplicación de FastAPI.
- `shared/models`: tipos de las solicitudes y respuestas del backend.
- `shared/components`: estados, iconos, confirmaciones y notificaciones reutilizables.
- `layouts`: navegación privada y experiencia de autenticación.
- `features`: páginas cargadas bajo demanda.

Los servicios de datos no conservan cachés de otro usuario. Al cambiar la sesión se limpian conexión y cursores WebSocket. Las pantallas consultan de nuevo los recursos al navegar y muestran los resultados de las mutaciones.

El historial presenta doce negociaciones por página. Consulta los recuentos reales de mensajes mediante el endpoint existente, limitando las solicitudes simultáneas a tres y mostrando errores recuperables en lugar de ceros ficticios. Los análisis disponibles tienen acceso directo desde su negociación.

## Decisiones importantes

1. **Angular y no React.** Se respeta la tecnología obligatoria del documento del usuario. El framework del scaffold del workspace no determina la implementación del producto.
2. **Sin backend nuevo.** El contrato se obtiene del proyecto FastAPI existente. No se añade otra base de negocio ni se modifica su repositorio.
3. **Configuración runtime.** El operador puede cambiar direcciones públicas sin introducir secretos en el bundle. Los despliegues estáticos necesitan un backend HTTPS existente.
4. **Estadísticas derivadas.** El backend devuelve arrays paginados, no totales agregados. Se recorren las páginas antes de contar y se muestra error si falla alguna: nunca se presenta una carga parcial como total.
5. **Chat idempotente.** Una solicitud produce el turno completo. El frontend conserva identificador y contenido del turno fallido y consulta la historia persistida antes de reintentar.
6. **Eventos complementarios.** HTTP sigue siendo la fuente de verdad para los recursos. Los eventos provocan actualizaciones, con cursor y reconexión limitada, sin asumir que cada conexión permanecerá disponible.
7. **Interpretación responsable.** No se convierten puntuaciones contextuales en diagnósticos ni se fabrican preferencias o frecuencias no entregadas por el backend.

## Seguridad del cliente

Angular interpola texto sin inyectar HTML de los mensajes. La API protege propiedad y permisos; los guards mejoran la navegación pero no sustituyen al servidor. La configuración impide URLs con credenciales y conexiones inseguras desde HTTPS. El JWT no sale del origen y prefijo configurados ni viaja en la URL del socket.

`sessionStorage` limita la persistencia al contexto de la pestaña; no es un almacén invulnerable a XSS. No se guardan contraseñas y no se usan tokens de demostración para eludir autenticación.
