import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/http/api-error';
import { ProfileService } from '../../core/services/profile.service';
import { DIMENSIONS, Profile } from '../../shared/models/api.models';
import { IconComponent } from '../../shared/components/icon.component';
import { EmptyStateComponent, ErrorStateComponent, PageHeaderComponent } from '../../shared/components/states.component';
import { EsDatePipe, ScorePipe, scorePercent } from '../../shared/pipes/labels.pipe';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, EmptyStateComponent, ErrorStateComponent, PageHeaderComponent, EsDatePipe, ScorePipe],
  template: `
    <app-page-header eyebrow="Aprendizaje" title="Mi perfil de negociación" subtitle="Promedios calculados a partir de tus análisis. Cambian con el contexto de cada escenario; úsalos para detectar tendencias, no para etiquetarte." />
    @if (error()) {
      <app-error-state [message]="error()" (retry)="load()" />
    } @else if (!profile()) {
      <div role="status"><span class="sr-only">Cargando perfil</span><div class="skeleton h-56 rounded-2xl"></div><div class="skeleton mt-6 h-64 rounded-2xl"></div></div>
    } @else if (profile()!.sample_count === 0) {
      <app-empty-state icon="user" title="Tu perfil aún no tiene datos" text="Se construye con los análisis de tus negociaciones cerradas. Genera el primero para ver promedios y evolución.">
        <a routerLink="/negotiations" class="btn btn-primary">Ir a negociaciones</a>
      </app-empty-state>
    } @else {
      @let pr = profile()!; @let pl = pr.payload;
      <div class="grid gap-5 lg:grid-cols-[280px_1fr]">
        <section class="relative overflow-hidden rounded-2xl bg-navy p-6 text-white rise" aria-label="Muestra">
          <div class="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full border border-[#6e9bff]/30"></div>
          <p class="eyebrow !text-[#a594ff]">Base del perfil</p>
          <p class="mt-4 font-display text-[3.5rem] font-semibold leading-none">{{ pr.sample_count }}</p>
          <p class="mt-1 text-sm text-[#b7c3e6]">{{ pr.sample_count === 1 ? 'análisis considerado' : 'análisis considerados' }}</p>
          @if (pr.updated_at) {<p class="mt-6 font-mono text-[11px] text-[#8f9cc4]">Actualizado {{ pr.updated_at | esDate:'datetime' }}</p>}
          @if (pr.sample_count < 3) {<p class="mt-4 rounded-lg bg-white/10 p-3 text-xs text-[#dbe2f6]">Con pocas muestras, los promedios pueden variar mucho entre una negociación y otra.</p>}
        </section>
        <section class="card p-6 rise rise-1" aria-labelledby="avg-h">
          <h2 id="avg-h" class="text-base font-semibold">Promedio por dimensión</h2>
          <table class="mt-4 w-full text-sm">
            <caption class="sr-only">Promedio de cada dimensión en tus análisis</caption>
            <thead class="sr-only"><tr><th scope="col">Dimensión</th><th scope="col">Indicador</th><th scope="col">Promedio</th></tr></thead>
            <tbody>
              @for (d of dims; track d.key) {
                <tr class="border-b border-line last:border-0">
                  <th scope="row" class="w-44 py-3 pr-3 text-left font-normal text-ink-2">{{ d.label }}</th>
                  <td class="py-3"><div class="bar"><span [style.width.%]="pct(pl.dimension_averages?.[d.key])"></span></div></td>
                  <td class="w-20 py-3 pl-3 text-right font-mono text-ink">{{ pl.dimension_averages?.[d.key] | score }}</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      </div>

      @if (lists().length) {
        <div class="mt-6 grid gap-4 md:grid-cols-3">
          @for (blk of lists(); track blk.title) {
            <section class="card p-5"><h2 class="text-base font-semibold">{{ blk.title }}</h2>
              <ul class="mt-3 space-y-2 text-sm text-ink-2">@for (x of blk.items; track $index) {<li class="flex gap-2"><span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet"></span>{{ x }}</li>}</ul></section>
          }
        </div>
      }

      <section class="card mt-6 overflow-hidden p-0 rise rise-2" aria-labelledby="evo-h">
        <div class="border-b border-line px-5 py-4"><h2 id="evo-h" class="text-base font-semibold">Evolución</h2>
          <p class="mt-0.5 text-sm text-muted">Puntuación de cada dimensión en cada análisis, del más antiguo al más reciente.</p></div>
        @if (evolution().length === 0) {
          <p class="px-5 py-8 text-sm text-muted">Sin registros de evolución todavía.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px] text-sm">
              <thead><tr class="bg-canvas text-left">
                <th scope="col" class="px-5 py-3 font-mono text-[11px] font-normal uppercase tracking-wider text-faint">Fecha</th>
                @for (d of dims; track d.key) {<th scope="col" class="px-3 py-3 font-mono text-[11px] font-normal uppercase tracking-wider text-faint">{{ d.label }}</th>}
                <th scope="col" class="px-5 py-3"><span class="sr-only">Enlace</span></th>
              </tr></thead>
              <tbody>
                @for (e of evolution(); track e.analysis_id) {
                  <tr class="border-t border-line">
                    <td class="whitespace-nowrap px-5 py-3 text-ink-2">{{ e.created_at | esDate }}</td>
                    @for (d of dims; track d.key) {
                      <td class="px-3 py-3"><div class="flex items-center gap-2"><span class="w-10 font-mono text-ink">{{ e.dimensions[d.key] | score }}</span>
                        <span class="h-1.5 w-12 overflow-hidden rounded-full bg-[#e7ebf5]" aria-hidden="true"><span class="block h-full bg-tech" [style.width.%]="pct(e.dimensions[d.key])"></span></span></div></td>
                    }
                    <td class="px-5 py-3 text-right"><a [routerLink]="['/analyses', e.analysis_id]" class="inline-flex items-center gap-1 text-tech hover:underline">Ver<app-icon name="arrow-right" [size]="12" /></a></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
      <p class="mt-4 text-center text-sm text-muted"><a routerLink="/training" class="text-tech hover:underline">Ver recomendaciones y ejercicios para entrenar</a></p>
    }`,
})
export class ProfileComponent {
  private readonly service = inject(ProfileService);
  protected readonly dims = DIMENSIONS;
  protected readonly profile = signal<Profile | null>(null);
  protected readonly error = signal('');
  protected readonly evolution = computed(() => [...(this.profile()?.payload.evolution ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)));
  protected readonly lists = computed(() => {
    const p = this.profile()?.payload;
    if (!p) return [];
    return [
      { title: 'Estrategias frecuentes en tus análisis', items: p.strategies ?? [] },
      { title: 'Fortalezas señaladas', items: p.strengths ?? [] },
      { title: 'Áreas de mejora señaladas', items: p.improvement_areas ?? [] },
    ].filter(b => b.items.length);
  });

  constructor() { this.load(); }
  protected pct(s: number | undefined) { return scorePercent(s); }
  protected load() {
    this.profile.set(null); this.error.set('');
    this.service.get().subscribe({ next: (p) => this.profile.set(p), error: (e) => this.error.set(errorMessage(e)) });
  }
}
