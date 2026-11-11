import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { IconComponent } from './icon.component';

let uid = 0;

@Component({
  selector: 'app-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <dialog #dlg class="modal" [attr.aria-labelledby]="titleId" (close)="closed.emit()" (cancel)="onCancel($event)">
      <div class="card p-6">
        <div class="flex items-start gap-4">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl" [class]="tone() === 'danger' ? 'bg-bad-soft text-bad' : 'bg-violet-soft text-violet'">
            <app-icon [name]="icon()" [size]="20" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 [id]="titleId" class="text-lg font-semibold text-ink">{{ title() }}</h2>
            @if (text()) {<p class="mt-1.5 text-sm leading-relaxed text-muted">{{ text() }}</p>}
          </div>
        </div>
        <div class="mt-5"><ng-content /></div>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="btn btn-ghost" (click)="closed.emit()" [disabled]="busy()">Volver</button>
          <button type="button" class="btn" [class]="tone() === 'danger' ? 'btn-danger' : 'btn-primary'" (click)="confirm.emit()" [disabled]="busy() || disabled()">
            {{ busy() ? 'Procesando…' : confirmLabel() }}
          </button>
        </div>
      </div>
    </dialog>`,
})
export class DialogComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly text = input('');
  readonly icon = input('alert');
  readonly confirmLabel = input('Confirmar');
  readonly tone = input<'danger' | 'primary'>('primary');
  readonly busy = input(false);
  readonly disabled = input(false);
  readonly confirm = output<void>();
  readonly closed = output<void>();
  protected readonly titleId = `dlg-title-${++uid}`;
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.open() && !el.open) el.showModal();
      if (!this.open() && el.open) el.close();
    });
  }

  protected onCancel(e: Event) {
    if (this.busy()) e.preventDefault();
  }
}
