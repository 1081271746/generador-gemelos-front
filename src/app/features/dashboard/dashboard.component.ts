import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http/api-error';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardData } from '../../shared/models/api.models';
import { IconComponent } from '../../shared/components/icon.component';
import { EmptyStateComponent, ErrorStateComponent, PageHeaderComponent } from '../../shared/components/states.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { EsDatePipe } from '../../shared/pipes/labels.pipe';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, EmptyStateComponent, ErrorStateComponent, PageHeaderComponent, StatusBadgeComponent, EsDatePipe],
  template: `
    <app-page-header eyebrow="Resumen" [title]="'Hola, ' + (auth.user()?.username ?? '')" subtitle="Lo que has preparado, lo que sigue abierto y lo que ya puedes revisar.">
      <a routerLink="/scenarios/new" class="btn btn-ghost"><app-icon name="layers" [size]="16" />Nuevo escenario</a>
      <a routerLink="/negotiations/new" class="btn btn-primary"><app-icon name="plus" [size]="16" />Nueva negociación</a>
    </app-page-header>

    @if (error()) {
      <app-error-state [message]="error()" (retry)="load()" />
    } @else if (!data()) {
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-5" role="status"><span class="sr-only">Cargando resumen</span>
        @for (i of [1,2,3,4,5]; track i) {<div class="card p-5"><div class="skeleton h-3 w-20"></div><div class="skeleton mt-4 h-8 w-12"></div></div>}
      </div>
      <div class="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]"><div class="skeleton h-72 rounded-2xl"></div><div class="skeleton h-72 rounded-2xl"></div></div>
    } @else {
      @let d = data()!;
      <section aria-label="Totales" class="grid grid-cols-2 gap-3 lg:grid-cols-5">
        @for (s of stats(); track s.label; let i = $index) {
          <div class="card relative overflow-hidden p-5 rise" [class]="'rise-' + (i < 4 ? i + 1 : 4)">
            <span class="absolute inset-x-0 top-0 h-[3px]" [class]="s.bar"></span>
            <p class="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">{{ s.label }}</p>
            <p class="mt-3 font-display text-[2.1rem] font-semibold leading-none text-ink">{{ s.value }}</p>
          </div>
        }
      </section>

      @if (d.scenarioCount === 0 && d.total === 0) {
        <div class="mt-8">
          <app-empty-state icon="layers" title="Tu laboratorio está listo" text="Empieza describiendo una situación real: qué quieres conseguir, quién está al otro lado y qué límites tiene. Después podrás negociar sobre ella.">
            <a routerLink="/scenarios/new" class="btn btn-primary"><app-icon name="plus" [size]="16" />Crear el primer escenario</a>
          </app-empty-state>
        </div>
      } @else {
        <div class="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section class="card p-0 rise rise-2" aria-labelledby="recent-neg">
            <div class="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id="recent-neg" class="text-base font-semibold">Negociaciones recientes</h2>
              <a routerLink="/negotiations" class="text-sm font-medium text-tech hover:underline">Ver todas</a>
            </div>
            @if (recentNeg().length === 0) {
              <p class="px-5 py-10 text-center text-sm text-muted">Aún no has abierto ninguna negociación. <a routerLink="/negotiations/new" class="text-tech hover:underline">Empieza una</a>.</p>
            } @else {
              <ul class="divide-y divide-line">
                @for (n of recentNeg(); track n.id) {
                  <li><a [routerLink]="['/negotiations', n.id]" class="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-canvas">
                    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-tech-soft text-tech"><app-icon name="chat" [size]="16" /></span>
                    <span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium text-ink">{{ n.scenario_snapshot.title }}</span>
                      <span class="block text-xs text-muted">Iniciada {{ n.started_at | esDate:'datetime' }}</span></span>
                    <app-status-badge [status]="n.status" />
                  </a></li>
                }
              </ul>
            }
          </section>
          <div class="space-y-6">
            <section class="card p-0 rise rise-3" aria-labelledby="recent-an">
              <div class="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 id="recent-an" class="text-base font-semibold">Últimos análisis</h2>
                <a routerLink="/analyses" class="text-sm font-medium text-tech hover:underline">Ver todos</a>
              </div>
              @if (recentAn().length === 0) {
                <p class="px-5 py-8 text-sm text-muted">Cierra una negociación y genera su análisis para ver evidencia de tus mensajes aquí.</p>
              } @else {
                <ul class="divide-y divide-line">
                  @for (a of recentAn(); track a.id) {
                    <li><a [routerLink]="['/analyses', a.id]" class="block px-5 py-3.5 hover:bg-canvas">
                      <span class="font-mono text-[11px] text-violet">Análisis {{ a.id }} · {{ a.created_at | esDate }}</span>
                      <span class="mt-1 block line-clamp-2 text-sm text-ink-2">{{ a.payload.summary }}</span>
                    </a></li>
                  }
                </ul>
              }
            </section>
            <section class="card p-0 rise rise-4" aria-labelledby="recent-sc">
              <div class="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 id="recent-sc" class="text-base font-semibold">Escenarios</h2>
                <a routerLink="/scenarios" class="text-sm font-medium text-tech hover:underline">Gestionar</a>
              </div>
              @if (recentSc().length === 0) {
                <p class="px-5 py-8 text-sm text-muted">Sin escenarios activos. <a routerLink="/scenarios/new" class="text-tech hover:underline">Crea uno</a>.</p>
              } @else {
                <ul class="divide-y divide-line">
                  @for (s of recentSc(); track s.id) {
                    <li class="flex items-center gap-3 px-5 py-3">
                      <a [routerLink]="['/scenarios', s.id]" class="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:text-tech">{{ s.title }}</a>
                      <a [routerLink]="['/negotiations/new']" [queryParams]="{ scenario: s.id }" class="btn btn-ghost btn-sm" [attr.aria-label]="'Negociar: ' + s.title">Negociar</a>
                    </li>
                  }
                </ul>
              }
            </section>
          </div>
        </div>
      }
    }`,
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  private readonly service = inject(DashboardService);
  protected readonly data = signal<DashboardData | null>(null);
  protected readonly error = signal('');
  protected readonly stats = computed(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: 'Escenarios', value: d.scenarioCount, bar: 'bg-violet' },
      { label: 'Negociaciones', value: d.total, bar: 'bg-navy' },
      { label: 'En curso', value: d.active, bar: 'bg-tech' },
      { label: 'Completadas', value: d.completed, bar: 'bg-ok' },
      { label: 'Canceladas', value: d.cancelled, bar: 'bg-line-strong' },
    ];
  });
  protected readonly recentNeg = computed(() => [...(this.data()?.negotiations ?? [])].sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 6));
  protected readonly recentAn = computed(() => [...(this.data()?.analyses ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3));
  protected readonly recentSc = computed(() => [...(this.data()?.scenarios ?? [])].filter(s => s.is_active).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4));

  constructor() { this.load(); }

  protected load() {
    this.error.set(''); this.data.set(null);
    this.service.get().subscribe({ next: (d) => this.data.set(d), error: (e) => this.error.set(errorMessage(e)) });
  }
}
