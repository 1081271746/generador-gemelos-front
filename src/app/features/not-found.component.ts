import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, LogoComponent } from '../shared/components/icon.component';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, LogoComponent],
  template: `
    <div class="grid-bg relative grid min-h-[100dvh] place-items-center px-6">
      <div class="max-w-md text-center rise">
        <app-logo class="mb-10" />
        <p class="font-display text-[6rem] font-semibold leading-none text-navy">4<span class="text-violet">0</span>4</p>
        <h1 class="mt-4 text-2xl font-semibold text-ink">Esta mesa está vacía</h1>
        <p class="mt-2 text-muted">La dirección no corresponde a ninguna página de Gemelos. Puede que el enlace esté incompleto.</p>
        <a routerLink="/dashboard" class="btn btn-primary mt-8"><app-icon name="arrow-left" [size]="16" />Volver al resumen</a>
      </div>
    </div>`,
})
export class NotFoundComponent {}
