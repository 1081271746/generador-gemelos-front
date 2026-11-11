import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/http/api-error';
import { NegotiationsService } from '../../core/services/negotiations.service';
import { ScenariosService } from '../../core/services/scenarios.service';
import { ToastService } from '../../core/services/toast.service';
import { Scenario } from '../../shared/models/api.models';
import { IconComponent } from '../../shared/components/icon.component';
import { EmptyStateComponent, ErrorStateComponent, PageHeaderComponent, SkeletonListComponent } from '../../shared/components/states.component';

@Component({
  selector: 'app-negotiation-new',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, EmptyStateComponent, ErrorStateComponent, PageHeaderComponent, SkeletonListComponent],
  template: `
    <app-page-header eyebrow="Nueva negociación" title="Elige dónde negociar" subtitle="La negociación guarda una copia del escenario elegido. Después hablarás por turnos con la contraparte simulada." />
    @if (error()) {
      <app-error-state [message]="error()" (retry)="load()" />
    } @else if (loading()) {
      <app-skeleton-list [rows]="3" />
    } @else if (items().length === 0) {
      <app-empty-state icon="layers" title="Necesitas un escenario" text="Antes de negociar, describe la situación, tu objetivo y los límites de la contraparte.">
        <a routerLink="/scenarios/new" class="btn btn-primary"><app-icon name="plus" [size]="16" />Crear escenario</a>
      </app-empty-state>
    } @else {
      <div class="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <fieldset class="rise rise-1">
          <legend class="label mb-3">Escenario ({{ items().length }})</legend>
          <div class="space-y-2" role="radiogroup" aria-label="Escenarios disponibles">
            @for (s of items(); track s.id) {
              <label class="card card-hover flex cursor-pointer items-start gap-3 p-4" [class.!border-tech]="selectedId() === s.id" [class.ring-4]="selectedId() === s.id" [class.ring-tech/10]="selectedId() === s.id">
                <input type="radio" name="scenario" class="mt-1 accent-[#2f6bff]" [checked]="selectedId() === s.id" (change)="selectedId.set(s.id)" />
                <span class="min-w-0"><span class="block font-medium text-ink">{{ s.title }}</span>
                  <span class="mt-0.5 block truncate text-sm text-muted">Frente a: {{ s.counterpart_role }}</span></span>
              </label>
            }
          </div>
        </fieldset>
        <aside class="lg:sticky lg:top-8 lg:self-start rise rise-2" aria-live="polite">
          @if (selected(); as s) {
            <div class="card overflow-hidden p-0">
              <div class="bg-navy p-6 text-white">
                <p class="eyebrow !text-[#a594ff]">Vista previa</p>
                <h2 class="mt-2 text-xl font-semibold">{{ s.title }}</h2>
                <p class="mt-2 line-clamp-3 text-sm text-[#b7c3e6]">{{ s.description }}</p>
              </div>
              <dl class="space-y-4 p-6 text-sm">
                <div><dt class="font-mono text-[11px] uppercase tracking-wider text-faint">Tu objetivo</dt><dd class="mt-1 line-clamp-4 text-ink-2">{{ s.objective }}</dd></div>
                <div><dt class="font-mono text-[11px] uppercase tracking-wider text-faint">Contraparte</dt><dd class="mt-1 text-ink-2">{{ s.counterpart_role }}</dd></div>
              </dl>
              <div class="border-t border-line p-4">
                <button type="button" class="btn btn-primary w-full !h-11" (click)="create()" [disabled]="busy()"><app-icon name="chat" [size]="16" />{{ busy() ? 'Abriendo la mesa…' : 'Empezar negociación' }}</button>
              </div>
            </div>
          } @else {
            <div class="card grid-bg grid min-h-60 place-items-center p-8 text-center text-sm text-muted">Selecciona un escenario para ver sus detalles.</div>
          }
        </aside>
      </div>
    }`,
})
export class NegotiationNewComponent {
  private readonly scenarios = inject(ScenariosService);
  private readonly negotiations = inject(NegotiationsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly items = signal<Scenario[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly selected = computed(() => this.items().find(s => s.id === this.selectedId()) ?? null);

  constructor() { this.load(); }

  protected load() {
    this.loading.set(true); this.error.set('');
    this.scenarios.list().subscribe({
      next: (l) => {
        const act = l.filter(s => s.is_active);
        this.items.set(act);
        const pre = Number(this.route.snapshot.queryParamMap.get('scenario'));
        if (act.some(s => s.id === pre)) this.selectedId.set(pre);
        this.loading.set(false);
      },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); },
    });
  }

  protected create() {
    const id = this.selectedId();
    if (id == null || this.busy()) return;
    this.busy.set(true);
    this.negotiations.create(id).subscribe({
      next: (n) => { this.busy.set(false); this.toast.success('Negociación iniciada.'); this.router.navigate(['/negotiations', n.id]); },
      error: (e) => { this.busy.set(false); this.toast.error(errorMessage(e)); },
    });
  }
}
