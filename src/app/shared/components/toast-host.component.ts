import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="pointer-events-none fixed bottom-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 sm:w-96" aria-live="polite" aria-atomic="false">
      @for (t of toast.messages(); track t.id) {
        <div class="pointer-events-auto card rise flex items-start gap-3 p-3.5 pr-2" [attr.role]="t.kind === 'error' ? 'alert' : 'status'">
          <span class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg"
            [class]="t.kind === 'success' ? 'bg-ok-soft text-ok' : t.kind === 'error' ? 'bg-bad-soft text-bad' : 'bg-violet-soft text-violet'">
            <app-icon [name]="t.kind === 'success' ? 'check' : t.kind === 'error' ? 'alert' : 'info'" [size]="15" />
          </span>
          <p class="flex-1 pt-1 text-sm text-ink">{{ t.text }}</p>
          <button type="button" class="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-canvas hover:text-ink" (click)="toast.dismiss(t.id)" aria-label="Cerrar aviso">
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>`,
})
export class ToastHostComponent {
  protected readonly toast = inject(ToastService);
}
