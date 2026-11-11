# Resultado de validación

## Configuración por entorno: comprobación actual

Por indicación del usuario, el alcance se ajustó a preparar la conexión configurable mientras no existe una URL pública de pruebas. No se considera completada la validación positiva de Gemini.

- `pnpm test`: **55 pruebas aprobadas**, incluidos 14 casos de configuración por entorno.
- `pnpm typecheck` y `pnpm build`: correctos.
- Servidor estático: se verificó mediante HTTP que `API_BASE_URL` sobrescribe la configuración al arrancar, deriva `/ws/events`, entrega `config.json` sin caché y conserva el acceso a rutas Angular.
- Preview Angular reiniciado: configuración local predeterminada servida correctamente y página de acceso visible sin errores en consola.
- Backend real por el proxy: `/health` devolvió `{"database":"ok","gemini_configured":false}`. No se generaron turnos ni análisis positivos.
- Contratos de mensajes, análisis y perfil contrastados con los routers existentes; no se modificaron fuentes del backend ni se añadieron endpoints o respuestas simuladas.
- Las comprobaciones anteriores de integración y navegador se conservan abajo como evidencia histórica; no se repitió el recorrido autenticado en este cambio de configuración.

## Comprobaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| `pnpm typecheck` | Correcto: TypeScript y plantillas Angular en modo estricto |
| `pnpm build` | Correcto: bundle de producción y páginas cargadas bajo demanda |
| `pnpm test` | **41 pruebas aprobadas**, distribuidas en siete archivos |
| API real a través del proxy Angular | **23 solicitudes HTTP comprobadas** |
| Bridge WebSocket real | Evento autenticado recibido desde el backend existente |
| Comparación de fuentes del backend con su remoto | Sin diferencias de código |

Las pruebas unitarias usan un transporte HTTP controlado y un WebSocket controlado para comprobar contratos y errores. Las pruebas de integración usan **FastAPI real, su base local aislada, sus servicios existentes y Redis**, no respuestas simuladas.

## Recorrido comprobado en navegador

Una cuenta de prueba nueva completó este recorrido:

1. Registro y acceso automático al dashboard con su usuario.
2. Creación de un escenario con los **siete campos** del contrato real.
3. Recarga, edición del título y nueva recarga para comprobar persistencia.
4. Inicio de una negociación con la instantánea del escenario y conexión `En vivo`.
5. Envío de una oferta y visualización del mensaje guardado ante indisponibilidad de IA.
6. Reintento del mismo turno y recarga: **un solo mensaje de usuario**, con el mismo `request_id`.
7. Cierre como completada con resultado persistido y chat de solo lectura.
8. Intento de análisis: aviso de indisponibilidad, sin puntuaciones inventadas.
9. Cierre de sesión y redirección de una ruta privada hacia el acceso.

La observación del navegador comprobó los avisos visibles; el estado HTTP **503** se comprobó por separado con las solicitudes de integración. No se interpreta un aviso visual como evidencia del código HTTP.

## Alcance y limitaciones

- No hay una clave Gemini configurada en esta instancia de desarrollo. Por tanto, **no se verificó una respuesta de IA exitosa ni un análisis generado con Gemini real**. Sí se verificaron el fallo real, la conservación del historial y la recuperación idempotente.
- Los análisis con datos positivos, los promedios y la evolución están conectados a los endpoints y tienen tipado/compilación verificados; no se alimentaron con resultados ficticios para aparentar una prueba completa.
- El recorrido autenticado se comprobó en escritorio. El diseño usa reglas responsive; el acceso público se inspeccionó también en formato móvil. No se realizó un recorrido autenticado completo en un dispositivo móvil real.
- La prueba crea datos únicamente en la base local de desarrollo y no envía correos ni notificaciones externas.
- El repositorio del backend permanece sin cambios. El ayudante del preview solo inicia sus fuentes existentes y configura procesos de desarrollo externos al repositorio de referencia.
- Para publicar el frontend estático hace falta la dirección HTTPS/WSS del backend existente o un reverse proxy equivalente; el proxy de `ng serve` no forma parte del build estático.

## Reproducción

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

Con el backend real local funcionando:

```sh
node scripts/smoke-api.mjs http://localhost:4200/api/backend --allow-write
```

Las credenciales generadas para las comprobaciones no se guardan en Git ni se incluyen en este informe.
