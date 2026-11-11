import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/http/api-error';
import { ScenariosService } from '../../core/services/scenarios.service';
import { ToastService } from '../../core/services/toast.service';
import { Scenario } from '../../shared/models/api.models';
import { DialogComponent } from '../../shared/components/confirm-dialog.component';
import { IconComponent } from '../../shared/components/icon.component';
import { ErrorStateComponent, PageHeaderComponent } from '../../shared/components/states.component';
import { EsDatePipe } from '../../shared/pipes/labels.pipe';

@Component({
  selector: 'app-scenario-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DialogComponent, IconComponent, ErrorStateComponent, PageHeaderComponent, EsDatePipe],
  template: `
    <a routerLink="/scenarios" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><app-icon name="arrow-left" [size]="14" />Escenarios</a>
    @if (error()) {
      <app-error-state [message]="error()" (retry)="load(id())" />
    } @else if (!s()) {
      <div role="status"><span class="sr-only">Cargando escenario</span><div class="skeleton h-10 w-2/3"></div><div class="mt-8 grid gap-4 md:grid-cols-2"><div class="skeleton h-56 rounded-2xl"></div><div class="skeleton h-56 rounded-2xl"></div></div></div>
    } @else {
      @let sc = s()!;
      <app-page-header [eyebrow]="'Creado ' + (sc.created_at | esDate)" [title]="sc.title" [subtitle]="sc.description">
        @if (sc.is_active) {
          <button type="button" class="btn btn-ghost text-bad" (click)="confirmOpen.set(true)"><app-icon name="archive" [size]="16" />Archivar</button>
          <a [routerLink]="['/scenarios', sc.id, 'edit']" class="btn btn-ghost"><app-icon name="edit" [size]="16" />Editar</a>
          <a routerLink="/negotiations/new" [queryParams]="{ scenario: sc.id }" class="btn btn-primary"><app-icon name="chat" [size]="16" />Negociar</a>
        } @else {
          <span class="inline-flex items-center gap-2 rounded-full bg-[#eef0f5] px-3 py-1.5 text-sm text-muted"><app-icon name="archive" [size]="14" />Archivado</span>
        }
      </app-page-header>
      <div class="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section class="card p-6 rise rise-1">
          <p class="eyebrow">Contexto</p>
          <p class="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-ink-2">{{ sc.context }}</p>
          <div class="mt-6 rounded-xl border border-tech/15 bg-tech-soft/60 p-4">
            <p class="flex items-center gap-2 text-sm font-semibold text-tech"><app-icon name="target" [size]="16" />Tu objetivo</p>
            <p class="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">{{ sc.objective }}</p>
          </div>
        </section>
        <section class="relative overflow-hidden rounded-2xl bg-navy p-6 text-[#dbe2f6] rise rise-2">
          <div class="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-[#a594ff]/30"></div>
          <p class="eyebrow !text-[#a594ff]">Contraparte simulada</p>
          <h2 class="mt-2 text-xl font-semibold text-white">{{ sc.counterpart_role }}</h2>
          <dl class="mt-5 space-y-5 text-sm">
            <div><dt class="font-mono text-[11px] uppercase tracking-wider text-[#8f9cc4]">Busca</dt><dd class="mt-1.5 whitespace-pre-line leading-relaxed">{{ sc.counterpart_goal }}</dd></div>
            <div><dt class="font-mono text-[11px] uppercase tracking-wider text-[#8f9cc4]">No aceptará</dt><dd class="mt-1.5 whitespace-pre-line leading-relaxed">{{ sc.counterpart_limits }}</dd></div>
          </dl>
        </section>
      </div>
    }
    <app-dialog [open]="confirmOpen()" tone="danger" icon="archive" title="¿Archivar este escenario?" confirmLabel="Archivar"
      text="Ya no podrás iniciar negociaciones nuevas con él. Las negociaciones y análisis existentes se conservan." [busy]="busy()"
      (confirm)="archive()" (closed)="confirmOpen.set(false)" />`,
})
export class ScenarioDetailComponent {
  readonly id = input.required<string>();
  private readonly service = inject(ScenariosService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly s = signal<Scenario | null>(null);
  protected readonly error = signal('');
  protected readonly confirmOpen = signal(false);
  protected readonly busy = signal(false);

  constructor() { effect(() => { const id = this.id(); untracked(() => this.load(id)); }); }

  protected load(id: string) {
    this.s.set(null); this.error.set('');
    this.service.get(Number(id)).subscribe({ next: (s) => this.s.set(s), error: (e) => this.error.set(errorMessage(e)) });
  }

  protected archive() {
    this.busy.set(true);
    this.service.archive(Number(this.id())).subscribe({
      next: () => { this.busy.set(false); this.confirmOpen.set(false); this.toast.success('Escenario archivado.'); this.router.navigateByUrl('/scenarios'); },
      error: (e) => { this.busy.set(false); this.toast.error(errorMessage(e)); },
    });
  }
}
