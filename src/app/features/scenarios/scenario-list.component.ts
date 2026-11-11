import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/http/api-error';
import { ScenariosService } from '../../core/services/scenarios.service';
import { ToastService } from '../../core/services/toast.service';
import { Scenario } from '../../shared/models/api.models';
import { DialogComponent } from '../../shared/components/confirm-dialog.component';
import { IconComponent } from '../../shared/components/icon.component';
import { EmptyStateComponent, ErrorStateComponent, PageHeaderComponent, SkeletonListComponent } from '../../shared/components/states.component';
import { EsDatePipe } from '../../shared/pipes/labels.pipe';

@Component({
  selector: 'app-scenario-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DialogComponent, IconComponent, EmptyStateComponent, ErrorStateComponent, PageHeaderComponent, SkeletonListComponent, EsDatePipe],
  template: `
    <app-page-header eyebrow="Práctica" title="Escenarios" subtitle="Cada escenario fija el contexto, tu objetivo y los límites de la contraparte simulada.">
      <a routerLink="/scenarios/new" class="btn btn-primary"><app-icon name="plus" [size]="16" />Nuevo escenario</a>
    </app-page-header>

    <div class="mb-6 rise rise-1">
      <label for="q" class="sr-only">Buscar escenarios</label>
      <div class="relative max-w-md">
        <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input id="q" type="search" class="input !pl-9" placeholder="Buscar por título, rol o descripción" [value]="query()" (input)="query.set($any($event.target).value)" />
      </div>
    </div>

    @if (error()) {
      <app-error-state [message]="error()" (retry)="load()" />
    } @else if (loading()) {
      <app-skeleton-list [rows]="4" />
    } @else if (items().length === 0) {
      <app-empty-state icon="layers" title="Aún no hay escenarios" text="Un buen escenario describe una situación concreta: una beca, un contrato de prácticas, el reparto de un trabajo en grupo.">
        <a routerLink="/scenarios/new" class="btn btn-primary"><app-icon name="plus" [size]="16" />Crear escenario</a>
      </app-empty-state>
    } @else if (filtered().length === 0) {
      <app-empty-state icon="search" title="Sin coincidencias" [text]="'Ningún escenario coincide con «' + query() + '».'">
        <button type="button" class="btn btn-ghost" (click)="query.set('')">Limpiar búsqueda</button>
      </app-empty-state>
    } @else {
      <p class="mb-3 font-mono text-xs text-faint" aria-live="polite">{{ filtered().length }} de {{ items().length }} escenarios</p>
      <ul class="grid gap-4 md:grid-cols-2">
        @for (s of filtered(); track s.id; let i = $index) {
          <li class="card card-hover flex flex-col p-5 rise" [class]="'rise-' + ((i % 4) + 1)">
            <div class="flex items-start justify-between gap-3">
              <a [routerLink]="['/scenarios', s.id]" class="min-w-0">
                <h2 class="text-lg font-semibold leading-snug text-ink hover:text-tech">{{ s.title }}</h2>
              </a>
              <span class="shrink-0 font-mono text-[11px] text-faint">{{ s.created_at | esDate }}</span>
            </div>
            <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{{ s.description }}</p>
            <div class="mt-4 flex items-center gap-2 text-xs text-ink-2">
              <span class="rounded-md bg-violet-soft px-2 py-1 font-medium text-violet">Contraparte</span>
              <span class="truncate">{{ s.counterpart_role }}</span>
            </div>
            <div class="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <a [routerLink]="['/negotiations/new']" [queryParams]="{ scenario: s.id }" class="btn btn-primary btn-sm"><app-icon name="chat" [size]="14" />Negociar</a>
              <a [routerLink]="['/scenarios', s.id, 'edit']" class="btn btn-ghost btn-sm" [attr.aria-label]="'Editar ' + s.title"><app-icon name="edit" [size]="14" />Editar</a>
              <button type="button" class="btn btn-ghost btn-sm ml-auto text-bad" (click)="target.set(s)" [attr.aria-label]="'Archivar ' + s.title"><app-icon name="archive" [size]="14" />Archivar</button>
            </div>
          </li>
        }
      </ul>
    }

    <app-dialog [open]="!!target()" tone="danger" icon="archive" title="¿Archivar este escenario?" confirmLabel="Archivar"
      [text]="'«' + (target()?.title ?? '') + '» dejará de aparecer en la lista. Las negociaciones ya realizadas conservan su copia del escenario.'"
      [busy]="busy()" (confirm)="archive()" (closed)="target.set(null)" />`,
})
export class ScenarioListComponent {
  private readonly service = inject(ScenariosService);
  private readonly toast = inject(ToastService);
  protected readonly items = signal<Scenario[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly query = signal('');
  protected readonly target = signal<Scenario | null>(null);
  protected readonly busy = signal(false);
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.items().filter(s => !q || [s.title, s.description, s.counterpart_role].some(t => t.toLowerCase().includes(q)));
  });

  constructor() { this.load(); }

  protected load() {
    this.loading.set(true); this.error.set('');
    this.service.list().subscribe({
      next: (l) => { this.items.set(l.filter(s => s.is_active).sort((a, b) => b.created_at.localeCompare(a.created_at))); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); },
    });
  }

  protected archive() {
    const s = this.target();
    if (!s) return;
    this.busy.set(true);
    this.service.archive(s.id).subscribe({
      next: () => { this.busy.set(false); this.target.set(null); this.toast.success('Escenario archivado.'); this.load(); },
      error: (e) => { this.busy.set(false); this.toast.error(errorMessage(e)); },
    });
  }
}
