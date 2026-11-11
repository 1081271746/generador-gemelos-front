import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const PATHS: Record<string, string[]> = {
  home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M9.5 21v-6h5v6'],
  layers: ['M12 3 2 8l10 5 10-5-10-5Z', 'm2 13 10 5 10-5', 'm2 17.5 10 5 10-5'],
  chat: ['M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z'],
  chart: ['M4 20V11', 'M10 20V5', 'M16 20v-6', 'M21 20H3'],
  user: ['M20 21a8 8 0 0 0-16 0', 'M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'],
  book: ['M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2Z', 'M4 19.5A2 2 0 0 0 6 21.5h14', 'M8 7h8', 'M8 11h5'],
  settings: ['M4 6h9', 'M17 6h3', 'M15 4v4', 'M4 12h3', 'M11 12h9', 'M9 10v4', 'M4 18h11', 'M19 18h1', 'M17 16v4'],
  logout: ['M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4', 'm10 17 5-5-5-5', 'M15 12H3'],
  plus: ['M12 5v14', 'M5 12h14'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z', 'm21 21-4.3-4.3'],
  'arrow-right': ['M5 12h14', 'm13 6 6 6-6 6'],
  'arrow-left': ['M19 12H5', 'm11 6-6 6 6 6'],
  edit: ['M4 20h4L19 9l-4-4L4 16v4Z', 'm13.5 6.5 4 4'],
  archive: ['M3 4h18v4H3z', 'M5 8v12h14V8', 'M10 12h4'],
  check: ['m5 12 5 5 9-10'],
  x: ['M6 6l12 12', 'M18 6 6 18'],
  alert: ['M12 3 2 20h20L12 3Z', 'M12 10v4', 'M12 17h.01'],
  refresh: ['M20 11a8 8 0 0 0-14.9-3.9L4 9', 'M4 4v5h5', 'M4 13a8 8 0 0 0 14.9 3.9L20 15', 'M20 20v-5h-5'],
  send: ['M22 2 11 13', 'M22 2 15 22l-4-9-9-4 20-7Z'],
  sparkle: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z', 'M19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7L19 17Z'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  lock: ['M6 11h12v10H6z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M12 12h.01'],
  quote: ['M7 7h4v4c0 3-1.5 5-4 6', 'M14 7h4v4c0 3-1.5 5-4 6'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2'],
  signal: ['M2 9a14 14 0 0 1 20 0', 'M5 12.5a10 10 0 0 1 14 0', 'M8.5 16a5 5 0 0 1 7 0', 'M12 19.5h.01'],
  flag: ['M5 21V4', 'M5 4h12l-2 4 2 4H5'],
  compass: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'm15.5 8.5-2 5-5 2 2-5 5-2Z'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5', 'M12 8h.01'],
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `<svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor" [attr.stroke-width]="stroke()" stroke-linecap="round" stroke-linejoin="round">@for (d of paths(); track $index) {<path [attr.d]="d" />}</svg>`,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(18);
  readonly stroke = input(1.75);
  protected readonly paths = computed(() => PATHS[this.name()] ?? PATHS['info']);
}

@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2.5' },
  template: `
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0e1f4d" />
      <circle cx="12.5" cy="16" r="6" fill="none" stroke="#6e9bff" stroke-width="2.2" />
      <circle cx="19.5" cy="16" r="6" fill="none" stroke="#a594ff" stroke-width="2.2" />
    </svg>
    @if (!compact()) {<span class="font-display text-[1.15rem] font-semibold tracking-tight" [class.text-white]="light()">Gemelos</span>}
  `,
})
export class LogoComponent {
  readonly compact = input(false);
  readonly light = input(false);
}
