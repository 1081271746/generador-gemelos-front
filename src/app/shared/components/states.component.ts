import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-skeleton-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3" role="status" aria-live="polite">
      <span class="sr-only">Cargando contenido</span>
      @for (r of rowsArr(); track $index) {
        <div class="card p-5 flex items-center gap-4">
          <div class="skeleton h-10 w-10 rounded-xl"></div>
          <div class="flex-1 space-y-2"><div class="skeleton h-3.5 w-2/5"></div><div class="skeleton h-3 w-3/5"></div></div>
          <div class="skeleton h-6 w-20 rounded-full"></div>
        </div>
      }
    </div>`,
})
export class SkeletonListComponent {
  readonly rows = input(4);
  protected rowsArr() { return Array.from({ length: this.rows() }); }
}

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="card relative overflow-hidden px-6 py-12 text-center">
      <div class="grid-bg absolute inset-0 opacity-60 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]"></div>
      <div class="relative mx-auto flex max-w-md flex-col items-center">
        <div class="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-violet-soft text-violet">
          <app-icon [name]="icon()" [size]="24" />
        </div>
        <h3 class="text-lg font-semibold text-ink">{{ title() }}</h3>
        <p class="mt-2 text-sm leading-relaxed text-muted">{{ text() }}</p>
        <div class="mt-6 flex flex-wrap justify-center gap-2"><ng-content /></div>
      </div>
    </div>`,
})
export class EmptyStateComponent {
  readonly icon = input('compass');
  readonly title = input.required<string>();
  readonly text = input('');
}

@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="card border-bad/25 bg-bad-soft/50 p-6 flex flex-col sm:flex-row sm:items-center gap-4" role="alert">
      <div class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bad-soft text-bad"><app-icon name="alert" [size]="20" /></div>
      <div class="flex-1">
        <p class="font-semibold text-ink">{{ title() }}</p>
        <p class="text-sm text-muted mt-0.5">{{ message() }}</p>
      </div>
      <button type="button" class="btn btn-ghost" (click)="retry.emit()"><app-icon name="refresh" [size]="16" />Reintentar</button>
    </div>`,
})
export class ErrorStateComponent {
  readonly title = input('No pudimos cargar esta información');
  readonly message = input('');
  readonly retry = output<void>();
}

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between rise">
      <div class="min-w-0">
        @if (eyebrow()) {<p class="eyebrow mb-2">{{ eyebrow() }}</p>}
        <h1 class="text-[1.75rem] md:text-[2.1rem] font-semibold leading-tight text-ink break-words">{{ title() }}</h1>
        @if (subtitle()) {<p class="mt-2 max-w-2xl text-[0.95rem] text-muted leading-relaxed">{{ subtitle() }}</p>}
      </div>
      <div class="flex flex-wrap gap-2 shrink-0"><ng-content /></div>
    </header>`,
})
export class PageHeaderComponent {
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
