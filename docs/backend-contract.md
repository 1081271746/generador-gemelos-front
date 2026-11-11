# Contrato verificado del backend

Fuente: rama main de `1081271746/generador-gemelos-back`. Se analizaron README, esquemas, routers, autenticación, servicios, perfil y streaming. El backend no se modifica.

Se contrastaron nuevamente las rutas de la copia local del repositorio con los servicios de mensajes, análisis y perfil del frontend. Se conservan `POST /messages/` (201, array de mensajes), `POST /negotiations/{id}/analysis` (201), `GET /analyses`, `GET /profile` y el bridge `/ws/events` existentes. Esta inspección de fuentes no demuestra que Gemini esté disponible ni que una URL pública exista.

Los campos de las solicitudes y respuestas están reflejados en `src/app/shared/models/api.models.ts`. Los listados devuelven arrays directos, sin envoltorio ni total. El dashboard recorre la paginación real para calcular totales; no utiliza un endpoint de estadísticas inexistente.

Endpoints existentes: POST /auth/register, POST /auth/login, GET/PUT /auth/me, POST /auth/password, POST /auth/logout; GET/POST /scenarios/, GET/PUT/DELETE /scenarios/{id}; GET/POST /negotiations/, GET/PATCH /negotiations/{id}; POST /messages/, GET /messages/{negotiation_id}; POST /negotiations/{id}/analysis; GET /analyses, GET /analyses/{id}; GET /profile; GET /recommendations; GET /resources/exercises; GET /events; WebSocket /ws/events.

POST /messages/ devuelve dos mensajes en un array. Si Gemini falla, devuelve 503 pero puede haber guardado el mensaje del usuario. El cliente recupera el historial y conserva el UUID de request_id para reintentar el mismo turno, sin duplicar mensajes.

El análisis exige negociación cerrada y mensajes del usuario. Las dimensiones son indicadores contextuales; no diagnósticos. No hay endpoints para preferencias del usuario, seguimiento de ejercicios, recuperar contraseña por correo o estadísticas agregadas: no se simulan.

WebSocket: primer frame con token, negotiation_id y after_sequence. La reconexión deduplica por sequence y siempre usa el usuario autenticado. El navegador no consume gRPC directamente.

Interfaz pública de servicios que implementa el agente principal:

- AuthService: user: Signal<User|null>, ready: Signal<boolean>, token(): string|null; login(LoginInput): Observable<User>; register(RegisterInput): Observable<User>; restore(): Observable<User|null>; logout(): Observable<void>; clear(): void; update({username,email}): Observable<User>; changePassword({current_password,new_password}): Observable<void>.
- ScenariosService: list(): Observable<Scenario[]>; get(id): Observable<Scenario>; create(ScenarioInput): Observable<Scenario>; update(id,ScenarioInput): Observable<Scenario>; archive(id): Observable<void>.
- NegotiationsService: list(): Observable<Negotiation[]>; get(id): Observable<Negotiation>; create(scenarioId): Observable<Negotiation>; finish(id,status:'completed'|'cancelled',result): Observable<Negotiation>.
- MessagesService: list(negotiationId): Observable<Message[]>; send(MessageInput): Observable<Message[]>.
- AnalysesService: list(): Observable<Analysis[]>; get(id): Observable<Analysis>; generate(negotiationId): Observable<Analysis>.
- ProfileService: get(): Observable<Profile>; recommendations(): Observable<Recommendations>; resources(): Observable<{source:string;exercises:Exercise[]}>.
- DashboardService: get(): Observable<DashboardData>.
- EventsService: state: Signal<'disconnected'|'connecting'|'connected'|'reconnecting'|'unavailable'>; events$: Observable<NegotiationEvent>; connect(negotiationId?:number): void; disconnect(): void.
- ToastService: messages: Signal<{id:number;text:string;kind:'success'|'error'|'info'}[]>; success(text):void; error(text):void; info(text):void; dismiss(id):void.
- exported function errorMessage(error:unknown): string from core/http/api-error.ts.

Todos los servicios anteriores se importan de `core/services/{scenarios,negotiations,messages,analyses,profile,dashboard,events,toast}.service.ts`, salvo AuthService en `core/auth/auth.service.ts`. El agente principal los implementa: la capa visual no debe modificarlos.
