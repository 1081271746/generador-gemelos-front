import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, from, map, mergeMap, of } from 'rxjs';
import { errorMessage } from '../../core/http/api-error';
import { NegotiationsService } from '../../core/services/negotiations.service';
import { MessagesService } from '../../core/services/messages.service';
import { AnalysesService } from '../../core/services/analyses.service';
import { Negotiation, NegotiationStatus } from '../../shared/models/api.models';
import { IconComponent } from '../../shared/components/icon.component';
import { EmptyStateComponent, ErrorStateComponent, PageHeaderComponent, SkeletonListComponent } from '../../shared/components/states.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { EsDatePipe } from '../../shared/pipes/labels.pipe';

@Component({
  selector: 'app-negotiation-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, EmptyStateComponent, ErrorStateComponent, PageHeaderComponent, SkeletonListComponent, StatusBadgeComponent, EsDatePipe],
  template: `
    <app-page-header eyebrow="Historial" title="Negociaciones" subtitle="Retoma las que siguen abiertas o revisa cómo terminaron las demás.">
      <a routerLink="/negotiations/new" class="btn btn-primary"><app-icon name="plus" [size]="16" />Nueva negociación</a>
    </app-page-header>
    <div class="mb-6 flex flex-col gap-3 md:flex-row md:items-center rise rise-1">
      <div class="relative md:w-80">
        <label for="q" class="sr-only">Buscar negociaciones</label>
        <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input id="q" type="search" class="input !pl-9" placeholder="Buscar por escenario o resultado" [value]="query()" (input)="query.set($any($event.target).value); page.set(1)" />
      </div>
      <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        @for (f of filters; track f.value) {
          <button type="button" class="chip" [attr.aria-pressed]="status() === f.value" (click)="status.set(f.value); page.set(1)">{{ f.label }} <span class="font-mono text-[11px] opacity-70">{{ count(f.value) }}</span></button>
        }
      </div>
    </div>
    @if (error()) {
      <app-error-state [message]="error()" (retry)="load()" />
    } @else if (loading()) {
      <app-skeleton-list [rows]="5" />
    } @else if (items().length === 0) {
      <app-empty-state icon="chat" title="Todavía no has negociado" text="Elige un escenario y abre la primera conversación con la contraparte simulada.">
        <a routerLink="/negotiations/new" class="btn btn-primary">Empezar negociación</a>
      </app-empty-state>
    } @else if (filtered().length === 0) {
      <app-empty-state icon="search" title="Sin resultados" text="Ninguna negociación coincide con la búsqueda y el filtro actuales.">
        <button type="button" class="btn btn-ghost" (click)="query.set(''); status.set('all')">Quitar filtros</button>
      </app-empty-state>
    } @else {
      <ul class="card divide-y divide-line overflow-hidden p-0">
        @for (n of visible(); track n.id) {
          <li><a [routerLink]="['/negotiations', n.id]" class="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-canvas sm:flex-row sm:items-center">
            <span class="font-mono text-xs text-faint sm:w-14">#{{ n.id }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-ink">{{ n.scenario_snapshot.title }}</span>
              <span class="block truncate text-sm text-muted">{{ n.result ?? ('Frente a ' + n.scenario_snapshot.counterpart_role) }}</span>
            </span>
            <span class="text-xs text-muted sm:w-40 sm:text-right">{{ n.started_at | esDate:'datetime' }}</span>
            <app-status-badge [status]="n.status" />
          </a>
          <div class="flex flex-wrap items-center gap-3 px-5 pb-4 text-xs text-muted sm:pl-[5.75rem]">
            @let messages = messageCounts()[n.id];
            @if (!messages || messages.loading) {
              <span role="status">Consultando mensajes…</span>
            } @else if (messages.value !== null) {
              <a [routerLink]="['/negotiations', n.id]" class="hover:text-tech">{{ messages.value }} mensajes · Ver conversación</a>
            } @else {
              <button class="text-bad underline" type="button" [attr.title]="messages.error" (click)="loadCounts([n], true)">Reintentar recuento de mensajes</button>
            }
            @if (analysisIds()[n.id]; as analysisId) {
              <a [routerLink]="['/analyses', analysisId]" class="font-medium text-violet hover:underline">Ver análisis</a>
            }
          </div></li>
        }
      </ul>
      @if (analysisError()) {
        <div role="alert" class="mt-3 text-sm text-bad">{{ analysisError() }}
          <button type="button" class="ml-2 underline" (click)="loadAnalyses()">Reintentar consulta de análisis</button>
        </div>
      }
      <nav aria-label="Páginas del historial" class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="btn btn-ghost btn-sm" [disabled]="page() <= 1" (click)="page.update(previousPage)">Anterior</button>
        <span class="text-xs text-muted">Página {{ page() }} de {{ pageCount() }} · {{ filtered().length }} negociaciones</span>
        <button type="button" class="btn btn-ghost btn-sm" [disabled]="page() >= pageCount()" (click)="page.update(nextPage)">Siguiente</button>
      </nav>
    }`,
})
export class NegotiationListComponent {
  private readonly service = inject(NegotiationsService);
  private readonly messagesApi = inject(MessagesService);
  private readonly analysesApi = inject(AnalysesService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly page = signal(1);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / 12)));
  protected readonly visible = computed(() => this.filtered().slice((this.page() - 1) * 12, this.page() * 12));
  protected readonly previousPage = (page: number) => Math.max(1, page - 1);
  protected readonly nextPage = (page: number) => Math.min(this.pageCount(), page + 1);
  protected readonly messageCounts = signal<Record<number, {loading: boolean; value: number | null; error: string}>>({});
  protected readonly analysisIds = signal<Record<number, number>>({});
  protected readonly analysisError = signal('');
  protected readonly items = signal<Negotiation[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly query = signal('');
  protected readonly status = signal<NegotiationStatus | 'all'>('all');
  protected readonly filters: { value: NegotiationStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Todas' }, { value: 'active', label: 'En curso' }, { value: 'completed', label: 'Completadas' }, { value: 'cancelled', label: 'Canceladas' },
  ];
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase(), st = this.status();
    return this.items().filter(n => (st === 'all' || n.status === st)
      && (!q || n.scenario_snapshot.title.toLowerCase().includes(q) || (n.result ?? '').toLowerCase().includes(q)));
  });

  constructor() {
    this.load();
    effect(() => {
      const rows = this.visible();
      untracked(() => this.loadCounts(rows));
    });
  }
  protected count(v: NegotiationStatus | 'all') { return v === 'all' ? this.items().length : this.items().filter(n => n.status === v).length; }
  protected load() {
    this.loading.set(true); this.error.set(''); this.page.set(1); this.messageCounts.set({});
    this.loadAnalyses();
    this.service.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (l) => { this.items.set([...l].sort((a, b) => b.started_at.localeCompare(a.started_at))); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); },
    });
  }
  protected loadAnalyses() {
    this.analysesApi.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => { this.analysisIds.set(Object.fromEntries(list.map(analysis => [analysis.negotiation_id, analysis.id]))); this.analysisError.set(''); },
      error: error => this.analysisError.set(errorMessage(error)),
    });
  }
  protected loadCounts(rows: Negotiation[], retry = false) {
    const needed = rows.filter(row => retry || !this.messageCounts()[row.id]);
    for (const row of needed) {
      this.messageCounts.update(counts => ({...counts, [row.id]: {loading: true, value: null, error: ''}}));
    }
    from(needed).pipe(
      mergeMap(row => this.messagesApi.list(row.id).pipe(
        map(messages => ({id: row.id, value: messages.length as number | null, error: ''})),
        catchError(error => of({id: row.id, value: null, error: errorMessage(error)})),
      ), 3),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => this.messageCounts.update(counts => ({
      ...counts, [result.id]: {loading: false, value: result.value, error: result.error},
    })));
  }
}
