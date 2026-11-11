import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NegotiationStatus } from '../models/api.models';
import { STATUS_LABELS } from '../pipes/labels.pipe';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" [class]="tone()">
    <span class="h-1.5 w-1.5 rounded-full bg-current" [class.animate-pulse]="status() === 'active'"></span>{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input.required<NegotiationStatus>();
  protected readonly label = computed(() => STATUS_LABELS[this.status()]);
  protected readonly tone = computed(() => ({
    active: 'bg-tech-soft text-tech',
    completed: 'bg-ok-soft text-ok',
    cancelled: 'bg-[#eef0f5] text-muted',
  })[this.status()]);
}
