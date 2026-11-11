import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LogoComponent } from '../shared/components/icon.component';

@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, LogoComponent],
  template: `
    <div class="min-h-[100dvh] grid lg:grid-cols-[1.05fr_1fr]">
      <section class="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between" aria-hidden="true">
        <div class="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:32px_32px]"></div>
        <div class="absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full border border-[#6e9bff]/40"></div>
        <div class="absolute right-16 top-1/3 h-[420px] w-[420px] rounded-full border border-[#a594ff]/40"></div>
        <app-logo [light]="true" class="relative" />
        <div class="relative max-w-md">
          <p class="eyebrow !text-[#a594ff] mb-4">Laboratorio de negociación</p>
          <h2 class="text-[2.6rem] font-semibold leading-[1.05]">Ensaya la conversación difícil antes de tenerla.</h2>
          <p class="mt-5 text-[#b7c3e6] leading-relaxed">Negocia con una contraparte simulada, cierra el intercambio y revisa lo que hiciste con citas de tus propios mensajes.</p>
          <ol class="mt-10 space-y-4 text-sm">
            @for (s of steps; track s.n) {
              <li class="flex items-center gap-4">
                <span class="grid h-8 w-8 place-items-center rounded-lg border border-white/15 font-mono text-xs text-[#a594ff]">{{ s.n }}</span>
                <span class="text-[#dbe2f6]">{{ s.t }}</span>
              </li>
            }
          </ol>
        </div>
        <p class="relative font-mono text-[11px] text-[#7f8fbf]">Los indicadores son contextuales, no diagnósticos.</p>
      </section>
      <section class="flex items-center justify-center px-5 py-10 sm:px-10">
        <div class="w-full max-w-[420px]">
          <app-logo class="mb-10 lg:hidden" />
          <router-outlet />
        </div>
      </section>
    </div>`,
})
export class AuthLayoutComponent {
  protected readonly steps = [
    { n: '01', t: 'Define el escenario y los límites de la contraparte' },
    { n: '02', t: 'Negocia por turnos: oferta, argumento, concesión' },
    { n: '03', t: 'Recibe un análisis con evidencia de tus mensajes' },
  ];
}
