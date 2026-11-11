import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { errorMessage } from '../../core/http/api-error';
import { AnalysesService } from '../../core/services/analyses.service';
import { NegotiationsService } from '../../core/services/negotiations.service';
import { Analysis, DIMENSIONS, Negotiation } from '../../shared/models/api.models';
import { IconComponent } from '../../shared/components/icon.component';
import { EmptyStateComponent, ErrorStateComponent, PageHeaderComponent, SkeletonListComponent } from '../../shared/components/states.component';
import { EsDatePipe, ScorePipe, scorePercent } from '../../shared/pipes/labels.pipe';

@Component({
  selector: 'app-analysis-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, EmptyStateComponent, ErrorStateComponent, PageHeaderComponent, SkeletonListComponent, EsDatePipe, ScorePipe],
  template: `
    <app-page-header eyebrow="Aprendizaje" title="Análisis" subtitle="Cada análisis se apoya en citas de tus mensajes. Las puntuaciones son indicadores del contexto de esa negociación, no un diagnóstico." />
    @if (error()) {
      <app-error-state [message]="error()" (retry)="load()" />
    } @else if (loading()) {
      <app-skeleton-list [rows]="4" />
    } @else if (rows().length === 0) {
      <app-empty-state icon="chart" title="Sin análisis todavía" text="Cierra una negociación en la que hayas participado y genera su análisis desde la propia conversación.">
        <a routerLink="/negotiations" class="btn btn-primary">Ir a negociaciones</a>
      </app-empty-state>
    } @else {
      <ul class="space-y-4">
        @for (r of rows(); track r.a.id; let i = $index) {
          <li class="rise" [class]="'rise-' + ((i % 4) + 1)"><a [routerLink]="['/analyses', r.a.id]" class="card card-hover grid gap-5 p-5 md:grid-cols-[1fr_260px]">
            <div class="min-w-0">
              <p class="font-mono text-[11px] text-violet">Análisis {{ r.a.id }} · {{ r.a.created_at | esDate:'datetime' }}</p>
              <h2 class="mt-1 text-lg font-semibold text-ink">{{ r.title }}</h2>
              <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{{ r.a.payload.summary }}</p>
              <span class="mt-3 inline-flex items-center gap-1 text-sm font-medium text-tech">Ver evidencia <app-icon name="arrow-right" [size]="14" /></span>
            </div>
            <dl class="space-y-1.5 self-center">
              @for (d of dims; track d.key) {
                <div class="grid grid-cols-[1fr_90px_44px] items-center gap-2 text-xs">
                  <dt class="truncate text-muted">{{ d.label }}</dt>
                  <dd class="bar !h-1.5"><span [style.width.%]="pct(r.a, d.key)"></span></dd>
                  <dd class="text-right font-mono text-ink-2">{{ r.a.payload.dimensions[d.key]?.score | score }}</dd>
                </div>
              }
            </dl>
          </a></li>
        }
      </ul>
    }`,
})
export class AnalysisListComponent {
  private readonly service = inject(AnalysesService);
  private readonly negotiations = inject(NegotiationsService);
  protected readonly dims = DIMENSIONS;
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  private readonly items = signal<Analysis[]>([]);
  private readonly negs = signal<Negotiation[]>([]);
  protected readonly rows = computed(() => {
    const byId = new Map(this.negs().map(n => [n.id, n]));
    return [...this.items()].sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(a => ({ a, title: byId.get(a.negotiation_id)?.scenario_snapshot.title ?? 'Negociación #' + a.negotiation_id }));
  });

  constructor() { this.load(); }
  protected pct(a: Analysis, k: typeof DIMENSIONS[number]['key']) { return scorePercent(a.payload.dimensions[k]?.score); }
  protected load() {
    this.loading.set(true); this.error.set('');
    forkJoin([this.service.list(), this.negotiations.list()]).subscribe({
      next: ([a, n]) => { this.items.set(a); this.negs.set(n); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); },
    });
  }
}
