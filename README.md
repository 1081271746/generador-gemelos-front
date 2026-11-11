# Gemelos · Entrenamiento de negociación

Frontend universitario para practicar negociaciones con un gemelo de IA, administrar escenarios y revisar análisis con evidencias. La interfaz es completamente Angular y consume el backend FastAPI **existente**, sin modificar su repositorio.

## Tecnologías

- Angular **22.2.5**; CLI y builder **22.2.6**.
- TypeScript **6.0.3**, RxJS **7.8**, Tailwind CSS **4**.
- Componentes standalone, rutas diferidas, formularios reactivos, signals, HttpClient, interceptor JWT y guards.
- Vitest y jsdom para pruebas de servicios, configuración, autenticación y eventos.
- Node **24.13 o superior**, pnpm **10**.

## Instalación independiente

```sh
git clone https://github.com/1081271746/generador-gemelos-front.git
cd generador-gemelos-front
pnpm install --frozen-lockfile
pnpm dev
```

Abre `http://localhost:4200`. Ejecuta el backend existente en `http://localhost:8000` siguiendo **su propio README**, con Redis y sus servicios gRPC si deseas mensajes, análisis y eventos. Angular nunca consume gRPC desde el navegador: usa HTTP y el bridge WebSocket documentado.

El proxy de desarrollo reenvía `/api/backend/**` a `http://127.0.0.1:8000`, quitando el prefijo. No sustituye ni recrea la lógica del backend.

Para el bridge WebSocket, el entorno de Uvicorn necesita un transporte compatible (`websockets` o `wsproto`). El preview se verificó con `websockets` instalado en el entorno, sin editar las fuentes ni los requisitos del repositorio del backend. Si ese soporte falta en otro alojamiento, la interfaz mostrará la indisponibilidad del tiempo real.

## Configuración de conexión

`public/config.json` es la configuración pública de la aplicación y se carga antes de restaurar la sesión:

```json
{
  "apiBaseUrl": "/api/backend",
  "websocketUrl": "/api/backend/ws/events"
}
```

Para conectar un backend desplegado, usa su dirección **real**:

```json
{
  "apiBaseUrl": "https://tu-backend.example.com",
  "websocketUrl": "wss://tu-backend.example.com/ws/events"
}
```

El dominio anterior es un ejemplo, no un servicio disponible. Puedes tomar `public/config.example.json` como referencia para conexiones locales directas. El backend debe permitir el origen del frontend en su configuración CORS y en el bridge WebSocket. Desde HTTPS se requiere API HTTPS y WebSocket WSS.

**No pongas secretos, claves de Gemini, JWT ni contraseñas en estos archivos.** La clave Gemini pertenece exclusivamente a la configuración del backend. Este frontend no la solicita ni la almacena.

El proxy de Angular existe **solo en desarrollo**. Antes de publicar el build estático, configura `public/config.json` con la URL HTTPS/WSS del backend existente o configura un reverse proxy del alojamiento para el prefijo `/api/backend`. No publiques esperando que el servidor estático ejecute FastAPI.

## Rutas y módulos

| Ruta | Función |
|---|---|
| `/login`, `/register` | Inicio de sesión y registro con JWT verificado por `/auth/me` |
| `/dashboard` | Resumen y actividad calculados a partir de listas reales paginadas |
| `/scenarios` | Consulta, búsqueda y archivo de escenarios |
| `/scenarios/new`, `/scenarios/:id/edit`, `/scenarios/:id` | Creación, edición y detalle |
| `/negotiations/new` | Selección de escenario e inicio |
| `/negotiations`, `/negotiations/:id` | Historial, filtros, chat, cierre/cancelación y análisis |
| `/analyses`, `/analyses/:id` | Análisis persistidos, dimensiones y evidencias |
| `/profile` | Promedios y evolución de indicadores contextuales |
| `/training` | Recomendaciones personales y recursos curados diferenciados |
| `/settings` | Datos de cuenta y cambio de contraseña |

Las rutas privadas requieren sesión. Los tokens se mantienen en `sessionStorage`, no se incluyen en URLs y solo se adjuntan al backend configurado. El backend es la autoridad de autenticación y permisos. Cambiar la contraseña revoca la sesión; el cierre de sesión llama al endpoint real.

## Comportamiento de la integración

- Los listados se paginan hasta recuperar todos los registros. Las estadísticas no usan cifras de ejemplo.
- Un turno de chat es **una** solicitud `POST /messages/`, que devuelve los mensajes de usuario y gemelo.
- El UUID `request_id` identifica un turno. Un fallo 503 puede dejar guardado el mensaje del usuario; se recupera el historial y se permite reintentar el mismo UUID para evitar duplicados.
- Una negociación cerrada es de solo lectura. El análisis se solicita sobre negociaciones cerradas con mensajes.
- Los indicadores son **contextuales**, no diagnósticos de personalidad.
- La conexión WebSocket autentica en el primer frame, conserva el cursor confirmado, deduplica y limita la reconexión. La indisponibilidad se muestra como tal.
- No existen funciones simuladas de recuperación por correo, preferencias de personalidad ni seguimiento de ejercicios: el backend no ofrece esos endpoints.

## Verificación

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm serve
```

`pnpm serve` sirve `dist/negotiation-front/browser` con fallback para las rutas Angular; usa `PORT` si está definido.

Prueba opcional de integración contra **una base local de desarrollo**, con el backend real ejecutándose:

```sh
node scripts/smoke-api.mjs --allow-write
# Para comprobar también el proxy de Angular:
node scripts/smoke-api.mjs http://localhost:4200/api/backend --allow-write
```

Esta prueba crea una cuenta y registros de prueba en la base local. No usa cuentas personales ni muestra sus credenciales. Comprueba registro/login, edición, escenarios, negociación, historial, recursos, eventos, cambio de contraseña y revocación. Si Gemini no está configurado, comprueba el error real 503 y la conservación idempotente del mensaje, **no inventa respuestas de IA**. Rechaza destinos remotos por defecto.

El ayudante `scripts/backend-reference.mjs` es exclusivo del preview de este workspace: inicia una copia de referencia del backend sin cambiar sus fuentes, usa una base aislada y claves efímeras de desarrollo. No es un requisito de instalación del frontend ni una forma de desplegar el backend.

Consulta [el contrato](docs/backend-contract.md), [la arquitectura](docs/architecture.md) y [la validación](docs/validation.md).
