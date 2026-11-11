import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/http/api-error';
import { NegotiationsService } from '../../core/services/negotiations.service';
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
        <input id="q" type="search" class="input !pl-9" placeholder="Buscar por escenario o resultado" [value]="query()" (input)="query.set($any($event.target).value)" />
      </div>
      <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        @for (f of filters; track f.value) {
          <button type="button" class="chip" [attr.aria-pressed]="status() === f.value" (click)="status.set(f.value)">{{ f.label }} <span class="font-mono text-[11px] opacity-70">{{ count(f.value) }}</span></button>
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
        @for (n of filtered(); track n.id) {
          <li><a [routerLink]="['/negotiations', n.id]" class="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-canvas sm:flex-row sm:items-center">
            <span class="font-mono text-xs text-faint sm:w-14">#{{ n.id }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-ink">{{ n.scenario_snapshot.title }}</span>
              <span class="block truncate text-sm text-muted">{{ n.result ?? ('Frente a ' + n.scenario_snapshot.counterpart_role) }}</span>
            </span>
            <span class="text-xs text-muted sm:w-40 sm:text-right">{{ n.started_at | esDate:'datetime' }}</span>
            <app-status-badge [status]="n.status" />
          </a></li>
        }
      </ul>
    }`,
})
export class NegotiationListComponent {
  private readonly service = inject(NegotiationsService);
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

  constructor() { this.load(); }
  protected count(v: NegotiationStatus | 'all') { return v === 'all' ? this.items().length : this.items().filter(n => n.status === v).length; }
  protected load() {
    this.loading.set(true); this.error.set('');
    this.service.list().subscribe({
      next: (l) => { this.items.set([...l].sort((a, b) => b.started_at.localeCompare(a.started_at))); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); },
    });
  }
}
