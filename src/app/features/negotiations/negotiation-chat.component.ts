import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnDestroy, OnInit, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, filter } from 'rxjs';
import { errorMessage } from '../../core/http/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { AnalysesService } from '../../core/services/analyses.service';
import { EventsService } from '../../core/services/events.service';
import { MessagesService } from '../../core/services/messages.service';
import { NegotiationsService } from '../../core/services/negotiations.service';
import { ToastService } from '../../core/services/toast.service';
import { Analysis, Message, MessageKind, Negotiation } from '../../shared/models/api.models';
import { DialogComponent } from '../../shared/components/confirm-dialog.component';
import { IconComponent } from '../../shared/components/icon.component';
import { ErrorStateComponent } from '../../shared/components/states.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { notBlank } from '../../shared/components/form-utils';
import { EsDatePipe, KIND_LABELS, KindLabelPipe } from '../../shared/pipes/labels.pipe';

interface PendingTurn { request_id: string; content: string; kind: MessageKind }

const CONN: Record<string, { label: string; tone: string }> = {
  connected: { label: 'En vivo', tone: 'bg-ok' },
  connecting: { label: 'Conectando…', tone: 'bg-warn animate-pulse' },
  reconnecting: { label: 'Reconectando…', tone: 'bg-warn animate-pulse' },
  unavailable: { label: 'Tiempo real no disponible', tone: 'bg-bad' },
  disconnected: { label: 'Desconectado', tone: 'bg-faint' },
};

function newRequestId(): string {
  const c = globalThis.crypto as Crypto & { randomUUID?: () => string };
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16); c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
}

@Component({
  selector: 'app-negotiation-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, DialogComponent, IconComponent, ErrorStateComponent, StatusBadgeComponent, EsDatePipe, KindLabelPipe],
  template: `
    <a routerLink="/negotiations" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><app-icon name="arrow-left" [size]="14" />Negociaciones</a>
    @if (loadError()) {
      <app-error-state [message]="loadError()" (retry)="loadAll()" />
    } @else if (!neg()) {
      <div role="status"><span class="sr-only">Cargando negociación</span><div class="skeleton h-9 w-1/2"></div>
        <div class="mt-6 space-y-4">@for (i of [1,2,3]; track i) {<div class="skeleton h-20 rounded-2xl" [class.ml-auto]="i % 2 === 0" style="width:70%"></div>}</div></div>
    } @else {
      @let n = neg()!;
      <header class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between rise">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-mono text-xs text-faint">#{{ n.id }}</span>
            <app-status-badge [status]="n.status" />
            <span class="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-muted" role="status" [attr.aria-label]="'Conexión en tiempo real: ' + conn().label">
              <span class="h-1.5 w-1.5 rounded-full" [class]="conn().tone"></span>{{ conn().label }}
            </span>
            @if (!online()) {<span class="inline-flex items-center gap-1.5 rounded-full bg-bad-soft px-2.5 py-1 text-xs font-medium text-bad"><app-icon name="signal" [size]="12" />Sin conexión</span>}
          </div>
          <h1 class="mt-2 text-[1.6rem] font-semibold leading-tight md:text-[1.9rem]">{{ n.scenario_snapshot.title }}</h1>
          <p class="mt-1 text-sm text-muted">Frente a <strong class="font-medium text-ink-2">{{ n.scenario_snapshot.counterpart_role }}</strong> · iniciada {{ n.started_at | esDate:'datetime' }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn btn-ghost" (click)="briefOpen.set(!briefOpen())" [attr.aria-expanded]="briefOpen()" aria-controls="brief"><app-icon name="target" [size]="16" />{{ briefOpen() ? 'Ocultar' : 'Ver' }} escenario</button>
          @if (n.status === 'active') {
            <button type="button" class="btn btn-primary" (click)="openFinish()" [disabled]="sending()"><app-icon name="flag" [size]="16" />Cerrar negociación</button>
          } @else if (analysis(); as a) {
            <a [routerLink]="['/analyses', a.id]" class="btn btn-primary"><app-icon name="chart" [size]="16" />Ver análisis</a>
          } @else if (hasUserMessage()) {
            <button type="button" class="btn btn-tech" (click)="generate()" [disabled]="generating() || !online()"><app-icon name="sparkle" [size]="16" />{{ generating() ? 'Analizando…' : 'Generar análisis' }}</button>
          }
        </div>
      </header>

      @if (briefOpen()) {
        <section id="brief" class="card mb-5 grid gap-5 p-5 md:grid-cols-3 rise" aria-label="Escenario de esta negociación">
          <div><p class="eyebrow">Contexto</p><p class="mt-2 max-h-40 overflow-auto whitespace-pre-line text-sm text-ink-2">{{ n.scenario_snapshot.context }}</p></div>
          <div><p class="eyebrow !text-tech">Tu objetivo</p><p class="mt-2 whitespace-pre-line text-sm text-ink-2">{{ n.scenario_snapshot.objective }}</p></div>
          <div><p class="eyebrow">Contraparte busca</p><p class="mt-2 whitespace-pre-line text-sm text-ink-2">{{ n.scenario_snapshot.counterpart_goal }}</p></div>
        </section>
      }

      @if (n.status !== 'active') {
        <div class="mb-5 flex gap-3 rounded-2xl border border-line bg-paper p-4 rise" role="note">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eef0f5] text-muted"><app-icon name="lock" [size]="16" /></span>
          <div class="text-sm"><p class="font-medium text-ink">Negociación cerrada {{ n.ended_at | esDate:'datetime' }}. Solo lectura.</p>
            @if (n.result) {<p class="mt-1 whitespace-pre-line text-muted"><span class="font-medium text-ink-2">Resultado:</span> {{ n.result }}</p>}
            @if (!hasUserMessage()) {<p class="mt-1 text-muted">No hay mensajes tuyos, así que no se puede generar un análisis.</p>}
          </div>
        </div>
      }

      <section class="card flex flex-col overflow-hidden p-0" aria-label="Conversación">
        @if (historyError()) {
          <div role="alert" class="border-b border-bad/20 bg-bad-soft p-4 text-sm text-bad">
            {{ historyError() }}
            <button type="button" class="btn btn-ghost btn-sm mt-2" (click)="refreshMessages()">Reintentar historial</button>
          </div>
        }
        @if (analysisLoadError()) {
          <div role="alert" class="border-b border-warn/20 bg-warn-soft p-4 text-sm">
            {{ analysisLoadError() }}
            <button type="button" class="btn btn-ghost btn-sm mt-2" (click)="loadAnalysis()">Reintentar consulta del análisis</button>
          </div>
        }
        <div #scroller class="grid-bg max-h-[62dvh] min-h-[320px] flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" role="log" aria-live="polite" aria-relevant="additions">
          @if (messages().length === 0 && !orphanPending() && !historyError()) {
            <div class="grid h-full min-h-[260px] place-items-center text-center">
              <div class="max-w-sm"><div class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-violet-soft text-violet"><app-icon name="chat" [size]="22" /></div>
                <p class="font-medium text-ink">{{ n.status === 'active' ? 'Abre tú la conversación' : 'Esta negociación no tuvo mensajes' }}</p>
                @if (n.status === 'active') {<p class="mt-1 text-sm text-muted">Elige el tipo de turno —oferta, argumento, concesión— y escribe tu primer mensaje.</p>}</div>
            </div>
          }
          @for (m of messages(); track m.id) {
            <div class="flex rise" [class.justify-end]="m.sender_type === 'user'">
              <article class="max-w-[88%] sm:max-w-[75%]" [attr.aria-label]="(m.sender_type === 'user' ? 'Tú' : 'Contraparte') + ', ' + (m.kind | kindLabel)">
                <div class="mb-1 flex items-center gap-2 text-[11px]" [class.justify-end]="m.sender_type === 'user'">
                  <span class="font-medium text-ink-2">{{ m.sender_type === 'user' ? 'Tú' : n.scenario_snapshot.counterpart_role }}</span>
                  <span class="rounded px-1.5 py-0.5 font-mono" [class]="m.sender_type === 'user' ? 'bg-tech-soft text-tech' : 'bg-violet-soft text-violet'">{{ m.kind | kindLabel }}</span>
                  <span class="text-faint">{{ m.created_at | esDate:'time' }}</span>
                </div>
                <div class="whitespace-pre-line rounded-2xl px-4 py-3 text-[0.925rem] leading-relaxed"
                  [class]="m.sender_type === 'user' ? 'rounded-tr-md bg-navy text-[#eef2ff]' : 'rounded-tl-md border border-line bg-paper text-ink'">{{ m.content }}</div>
              </article>
            </div>
          }
          @if (orphanPending(); as p) {
            <div class="flex justify-end"><div class="max-w-[75%] rounded-2xl rounded-tr-md border border-dashed border-tech/40 bg-tech-soft/60 px-4 py-3 text-sm text-ink-2">
              <p class="mb-1 font-mono text-[11px] text-tech">{{ p.kind | kindLabel }} · sin confirmar</p><p class="whitespace-pre-line">{{ p.content }}</p></div></div>
          }
          @if (sending()) {
            <div class="flex items-center gap-2 text-sm text-muted" role="status"><span class="flex gap-1">
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet"></span><span class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet [animation-delay:.15s]"></span><span class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet [animation-delay:.3s]"></span></span>
              La contraparte está respondiendo…</div>
          }
        </div>

        @if (n.status === 'active') {
          @if (pending() && !sending()) {
            <div class="flex flex-col gap-3 border-t border-warn/20 bg-warn-soft px-4 py-3 sm:flex-row sm:items-center" role="alert">
              <app-icon name="alert" [size]="18" class="text-warn" />
              <p class="flex-1 text-sm text-ink-2">{{ sendError() || 'Tu último turno quedó sin respuesta de la contraparte.' }} Reintenta el mismo turno antes de escribir otro; no se duplicará.</p>
              <button type="button" class="btn btn-ghost btn-sm" (click)="retry()" [disabled]="!online()"><app-icon name="refresh" [size]="14" />Reintentar turno</button>
            </div>
          } @else if (sendError()) {
            <div class="border-t border-bad/20 bg-bad-soft px-4 py-3 text-sm text-bad" role="alert">{{ sendError() }}</div>
          }
          <form [formGroup]="form" (ngSubmit)="send()" class="border-t border-line bg-paper p-3 sm:p-4" novalidate>
            <div class="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de turno">
              @for (k of kinds; track k) {
                <button type="button" role="radio" class="chip !h-8" [attr.aria-pressed]="form.controls.kind.value === k" [attr.aria-checked]="form.controls.kind.value === k" (click)="form.controls.kind.setValue(k)" [disabled]="blocked()">{{ kindLabels[k] }}</button>
              }
            </div>
            <div class="flex items-end gap-2">
              <label for="msg" class="sr-only">Tu mensaje</label>
              <textarea id="msg" class="input !min-h-[3rem] flex-1" rows="2" maxlength="10000" [readOnly]="blocked()" formControlName="content" aria-describedby="msg-limit" [placeholder]="blocked() ? 'Resuelve el turno pendiente para continuar' : 'Escribe tu turno… (Ctrl + Enter para enviar)'" (keydown.control.enter)="send()" (keydown.meta.enter)="send()"></textarea>
              <button type="submit" class="btn btn-primary !h-12 !w-12 !p-0" [disabled]="blocked() || form.invalid || !online()" aria-label="Enviar turno"><app-icon name="send" [size]="18" /></button>
            </div>
            <p id="msg-limit" class="hint mt-2 text-right">{{ form.controls.content.value.length }} / 10000 caracteres</p>
          </form>
        }
      </section>
    }

    <app-dialog [open]="finishOpen()" title="Cerrar la negociación" icon="flag" [tone]="finishForm.controls.status.value === 'cancelled' ? 'danger' : 'primary'"
      text="Después ya no podrás enviar mensajes. Describe en pocas palabras cómo terminó." [confirmLabel]="finishForm.controls.status.value === 'cancelled' ? 'Cancelar negociación' : 'Marcar completada'"
      [busy]="finishing()" [disabled]="finishForm.invalid" (confirm)="finish()" (closed)="finishOpen.set(false)">
      <form [formGroup]="finishForm" class="space-y-4" (ngSubmit)="finish()">
        <fieldset><legend class="label">Estado final</legend>
          <div class="grid grid-cols-2 gap-2">
            <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-line p-3 text-sm has-[:checked]:border-ok has-[:checked]:bg-ok-soft"><input type="radio" formControlName="status" value="completed" class="accent-[#12805c]" />Completada</label>
            <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-line p-3 text-sm has-[:checked]:border-bad has-[:checked]:bg-bad-soft"><input type="radio" formControlName="status" value="cancelled" class="accent-[#c0334a]" />Cancelada</label>
          </div>
        </fieldset>
        <div><label class="label" for="result">Resultado</label>
          <textarea id="result" class="input" rows="3" maxlength="10000" formControlName="result" placeholder="Por ejemplo: acordamos 20 horas semanales con revisión en dos meses." aria-describedby="result-h"></textarea>
          <p id="result-h" class="hint">Obligatorio. Máximo 10000 caracteres.</p>
          @if (finishError()) {<p class="field-error" role="alert">{{ finishError() }}</p>}
        </div>
      </form>
    </app-dialog>`,
})
export class NegotiationChatComponent implements OnInit, OnDestroy {
  readonly id = input.required<string>();
  private readonly negotiations = inject(NegotiationsService);
  private readonly auth = inject(AuthService);
  private readonly messagesApi = inject(MessagesService);
  private readonly analyses = inject(AnalysesService);
  private readonly events = inject(EventsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  protected readonly kinds: MessageKind[] = ['offer', 'counteroffer', 'argument', 'concession'];
  protected readonly kindLabels = KIND_LABELS;
  protected readonly neg = signal<Negotiation | null>(null);
  protected readonly messages = signal<Message[]>([]);
  protected readonly analysis = signal<Analysis | null>(null);
  protected readonly loadError = signal('');
  protected readonly pending = signal<PendingTurn | null>(null);
  protected readonly sending = signal(false);
  protected readonly sendError = signal('');
  protected readonly briefOpen = signal(false);
  protected readonly finishOpen = signal(false);
  protected readonly finishing = signal(false);
  protected readonly finishError = signal('');
  protected readonly generating = signal(false);
  protected readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  protected readonly conn = computed(() => CONN[this.events.state()] ?? CONN['disconnected']);
  protected readonly hasUserMessage = computed(() => this.messages().some(m => m.sender_type === 'user'));
  protected readonly historyError = signal('');
  protected readonly analysisLoadError = signal('');
  protected readonly blocked = computed(() => this.sending() || !!this.pending() || !!this.historyError());
  /** Turno pendiente cuyo mensaje de usuario no llegó a guardarse en el servidor. */
  protected readonly orphanPending = computed(() => {
    const p = this.pending();
    return p && !this.messages().some(m => m.request_id === p.request_id) ? p : null;
  });

  protected readonly form = this.fb.group({
    kind: this.fb.control<MessageKind>('argument'),
    content: ['', [Validators.required, notBlank, Validators.maxLength(10000)]],
  });
  protected readonly finishForm = this.fb.group({
    status: this.fb.control<'completed' | 'cancelled'>('completed'),
    result: ['', [Validators.required, notBlank, Validators.maxLength(10000)]],
  });

  private readonly onOnline = () => this.online.set(true);
  private readonly onOffline = () => this.online.set(false);

  constructor() {
    effect(() => {
      this.messages(); this.sending();
      const el = this.scroller()?.nativeElement;
      if (el) setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
    });
  }

  private get nid() { return Number(this.id()); }
  private get storageKey() { return `gemelos.pending.${this.auth.user()?.id ?? 'guest'}.${this.id()}`; }

  ngOnInit() {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    this.loadAll();
    this.events.connect(this.nid);
    this.events.events$.pipe(filter(e => e.negotiation_id === this.nid), debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => { this.refreshNegotiation(); if (!this.sending()) this.refreshMessages(); });
  }

  ngOnDestroy() {
    this.events.disconnect();
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }

  protected loadAll() {
    this.loadError.set('');
    this.neg.set(null);
    this.negotiations.get(this.nid).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (n) => { this.neg.set(n); this.refreshMessages(); if (n.status !== 'active') this.loadAnalysis(); },
      error: (e) => this.loadError.set(errorMessage(e)),
    });
  }

  private refreshNegotiation() {
    this.negotiations.get(this.nid).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (n) => { const was = this.neg()?.status; this.neg.set(n); if (n.status !== 'active' && was === 'active') { this.clearPending(); this.loadAnalysis(); } },
      error: (e) => this.sendError.set(errorMessage(e)),
    });
  }

  protected refreshMessages(after?: () => void) {
    this.messagesApi.list(this.nid).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (list) => { this.historyError.set(''); this.messages.set([...list].sort((a, b) => a.id - b.id)); this.reconcilePending(); after?.(); },
      error: (e) => { this.historyError.set(errorMessage(e)); after?.(); },
    });
  }

  protected loadAnalysis() {
    this.analyses.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (list) => { this.analysisLoadError.set(''); this.analysis.set(list.find(a => a.negotiation_id === this.nid) ?? null); },
      error: (error) => this.analysisLoadError.set(errorMessage(error)),
    });
  }

  /** Recupera un turno incompleto: almacenado localmente o deducido del último mensaje del usuario sin respuesta. */
  private reconcilePending() {
    if (this.neg()?.status !== 'active') { this.clearPending(); return; }
    const msgs = this.messages();
    const last = msgs[msgs.length - 1];
    let stored: PendingTurn | null = this.pending();
    if (!stored) { try { const raw = sessionStorage.getItem(this.storageKey); stored = raw ? JSON.parse(raw) as PendingTurn : null; } catch { stored = null; } }
    if (last && last.sender_type === 'user' && last.request_id) {
      this.setPending({ request_id: last.request_id, content: last.content, kind: last.kind });
      return;
    }
    if (stored) {
      const idx = msgs.findIndex(m => m.request_id === stored!.request_id);
      const answered = idx >= 0 && msgs.slice(idx + 1).some(m => m.sender_type === 'twin');
      if (answered) this.clearPending(); else this.setPending(stored);
    }
  }

  private setPending(p: PendingTurn) {
    this.pending.set(p);
    try { sessionStorage.setItem(this.storageKey, JSON.stringify(p)); } catch { /* almacenamiento no disponible */ }
  }
  private clearPending() {
    this.pending.set(null);
    try { sessionStorage.removeItem(this.storageKey); } catch { /* almacenamiento no disponible */ }
  }

  protected send() {
    if (this.pending()) { this.retry(); return; }
    this.form.markAllAsTouched();
    if (this.form.invalid || this.blocked() || !this.online() || this.neg()?.status !== 'active') return;
    const v = this.form.getRawValue();
    const turn: PendingTurn = { request_id: newRequestId(), content: v.content.trim(), kind: v.kind };
    this.setPending(turn);
    this.form.controls.content.setValue('');
    this.form.controls.content.markAsUntouched();
    this.dispatch(turn);
  }

  protected retry() {
    const p = this.pending();
    if (p && !this.sending() && this.online() && !this.historyError()) this.dispatch(p);
  }

  private dispatch(turn: PendingTurn) {
    this.sending.set(true); this.sendError.set('');
    this.messagesApi.send({ negotiation_id: this.nid, content: turn.content, kind: turn.kind, request_id: turn.request_id }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (created) => {
        this.clearPending();
        const known = new Set(this.messages().map(m => m.id));
        this.messages.set([...this.messages(), ...created.filter(m => !known.has(m.id))].sort((a, b) => a.id - b.id));
        this.sending.set(false);
      },
      error: (e) => {
        const status = e instanceof HttpErrorResponse ? e.status : 0;
        const retryable = status === 0 || status === 429 || status >= 500;
        this.sendError.set(errorMessage(e));
        if (!retryable) {
          this.clearPending();
          if (!this.form.controls.content.value) this.form.patchValue({ content: turn.content, kind: turn.kind });
          if (status === 409) this.refreshNegotiation();
        }
        this.refreshMessages(() => this.sending.set(false));
      },
    });
  }

  protected openFinish() {
    this.finishForm.reset({ status: 'completed', result: '' });
    this.finishError.set('');
    this.finishOpen.set(true);
  }

  protected finish() {
    this.finishForm.markAllAsTouched();
    if (this.finishForm.invalid || this.finishing()) return;
    const v = this.finishForm.getRawValue();
    this.finishing.set(true); this.finishError.set('');
    this.negotiations.finish(this.nid, v.status, v.result.trim()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (n) => {
        this.finishing.set(false); this.finishOpen.set(false); this.neg.set(n); this.clearPending();
        this.toast.success(v.status === 'completed' ? 'Negociación completada.' : 'Negociación cancelada.');
        this.refreshMessages(); this.loadAnalysis();
      },
      error: (e) => { this.finishing.set(false); this.finishError.set(errorMessage(e)); },
    });
  }

  protected generate() {
    if (this.generating()) return;
    this.generating.set(true);
    this.analyses.generate(this.nid).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (a) => { this.generating.set(false); this.toast.success('Análisis generado.'); this.router.navigate(['/analyses', a.id]); },
      error: (e) => { this.generating.set(false); this.toast.error(errorMessage(e)); this.loadAnalysis(); },
    });
  }
}
