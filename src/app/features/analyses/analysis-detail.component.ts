import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/http/api-error';
import { AnalysesService } from '../../core/services/analyses.service';
import { NegotiationsService } from '../../core/services/negotiations.service';
import { Analysis, DIMENSIONS, Negotiation } from '../../shared/models/api.models';
import { IconComponent } from '../../shared/components/icon.component';
import { ErrorStateComponent, PageHeaderComponent } from '../../shared/components/states.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { EsDatePipe, ScorePipe, scorePercent } from '../../shared/pipes/labels.pipe';

@Component({
  selector: 'app-analysis-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ErrorStateComponent, PageHeaderComponent, StatusBadgeComponent, EsDatePipe, ScorePipe],
  template: `
    <a routerLink="/analyses" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><app-icon name="arrow-left" [size]="14" />Análisis</a>
    @if (error()) {
      <app-error-state [message]="error()" (retry)="load(id())" />
    } @else if (!a()) {
      <div role="status"><span class="sr-only">Cargando análisis</span><div class="skeleton h-10 w-2/3"></div><div class="skeleton mt-6 h-40 rounded-2xl"></div>
        <div class="mt-6 grid gap-4 md:grid-cols-2">@for (i of [1,2,3,4]; track i) {<div class="skeleton h-44 rounded-2xl"></div>}</div></div>
    } @else {
      @let an = a()!; @let p = an.payload;
      <app-page-header [eyebrow]="'Análisis ' + an.id + ' · ' + (an.created_at | esDate:'datetime')" [title]="neg()?.scenario_snapshot?.title ?? ('Negociación #' + an.negotiation_id)">
        <a [routerLink]="['/negotiations', an.negotiation_id]" class="btn btn-ghost"><app-icon name="chat" [size]="16" />Ver conversación</a>
      </app-page-header>

      <div class="mb-6 flex gap-3 rounded-2xl border border-violet/15 bg-violet-soft/70 p-4 text-sm text-ink-2 rise" role="note">
        <app-icon name="info" [size]="18" class="mt-0.5 text-violet" />
        <p>Las puntuaciones describen tu comportamiento en <strong>esta</strong> conversación y este contexto. Son indicadores para reflexionar, no un diagnóstico de personalidad ni una calificación.</p>
      </div>

      @if (p.alerts.length) {
        <section class="mb-6 rounded-2xl border border-warn/25 bg-warn-soft p-5 rise" aria-labelledby="alerts-h">
          <h2 id="alerts-h" class="flex items-center gap-2 text-base font-semibold text-warn"><app-icon name="alert" [size]="18" />Alertas</h2>
          <ul class="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-2">@for (x of p.alerts; track $index) {<li>{{ x }}</li>}</ul>
        </section>
      }

      <section class="card grid gap-6 p-6 md:grid-cols-[1.5fr_1fr] rise rise-1" aria-labelledby="sum-h">
        <div>
          <h2 id="sum-h" class="eyebrow">Resumen</h2>
          <p class="mt-3 whitespace-pre-line text-[1.02rem] leading-relaxed text-ink">{{ p.summary }}</p>
        </div>
        <dl class="space-y-4 border-line text-sm md:border-l md:pl-6">
          @if (neg(); as n) {<div><dt class="font-mono text-[11px] uppercase tracking-wider text-faint">Estado</dt><dd class="mt-1"><app-status-badge [status]="n.status" /></dd></div>}
          <div><dt class="font-mono text-[11px] uppercase tracking-wider text-faint">Desenlace</dt><dd class="mt-1 whitespace-pre-line text-ink-2">{{ p.outcome }}</dd></div>
          <div><dt class="font-mono text-[11px] uppercase tracking-wider text-faint">Frente a tu objetivo</dt><dd class="mt-1 whitespace-pre-line text-ink-2">{{ p.objective_evaluation }}</dd></div>
        </dl>
      </section>

      <section class="mt-8" aria-labelledby="dim-h">
        <h2 id="dim-h" class="mb-4 text-xl font-semibold">Cinco dimensiones, con evidencia</h2>
        <div class="grid gap-4 lg:grid-cols-2">
          @for (d of dims; track d.key; let i = $index) {
            @let dim = p.dimensions[d.key];
            <article class="card p-5 rise" [class]="'rise-' + ((i % 4) + 1)" [class.lg:col-span-2]="i === 4">
              <div class="flex items-baseline justify-between gap-3">
                <h3 class="text-base font-semibold">{{ d.label }}</h3>
                <span class="font-mono text-sm text-ink-2">{{ dim?.score | score }}</span>
              </div>
              <div class="bar mt-3" role="meter" [attr.aria-label]="d.label" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="pct(dim?.score)"><span [style.width.%]="pct(dim?.score)"></span></div>
              @if (dim) {
                <p class="mt-4 text-sm leading-relaxed text-ink-2">{{ dim.explanation }}</p>
                @if (dim.evidence.length) {
                  <ul class="mt-4 space-y-2">
                    @for (ev of dim.evidence; track $index) {
                      <li class="flex gap-3 rounded-xl border-l-[3px] border-violet bg-canvas p-3 text-sm">
                        <app-icon name="quote" [size]="14" class="mt-0.5 text-violet" />
                        <div><q class="italic text-ink">{{ ev.quote }}</q><span class="mt-1 block font-mono text-[11px] text-faint">Mensaje #{{ ev.message_id }}</span></div>
                      </li>
                    }
                  </ul>
                } @else {<p class="mt-3 text-xs text-faint">Sin citas asociadas a esta dimensión.</p>}
              } @else {<p class="mt-3 text-sm text-faint">El análisis no incluyó esta dimensión.</p>}
            </article>
          }
        </div>
      </section>

      <div class="mt-8 grid gap-4 md:grid-cols-3">
        @for (blk of lists(p); track blk.title) {
          <section class="card p-5" [attr.aria-label]="blk.title">
            <h2 class="flex items-center gap-2 text-base font-semibold"><span class="h-2 w-2 rounded-full" [class]="blk.dot"></span>{{ blk.title }}</h2>
            @if (blk.items.length) {<ul class="mt-3 space-y-2 text-sm text-ink-2">@for (x of blk.items; track $index) {<li class="flex gap-2"><span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-faint"></span>{{ x }}</li>}</ul>}
            @else {<p class="mt-3 text-sm text-faint">Sin elementos.</p>}
          </section>
        }
      </div>

      <section class="mt-8 grid gap-4 lg:grid-cols-[1fr_1.3fr]" aria-label="Próximos pasos">
        <div class="rounded-2xl bg-navy p-6 text-[#dbe2f6]">
          <p class="eyebrow !text-[#a594ff]">Recomendaciones</p>
          @if (p.recommendations.length) {
            <ol class="mt-4 space-y-3 text-sm">@for (r of p.recommendations; track $index) {<li class="flex gap-3"><span class="font-mono text-[#a594ff]">{{ ($index + 1).toString().padStart(2, '0') }}</span>{{ r }}</li>}</ol>
          } @else {<p class="mt-4 text-sm text-[#8f9cc4]">Este análisis no incluye recomendaciones.</p>}
        </div>
        <div class="card p-6">
          <p class="eyebrow">Ejercicios sugeridos</p>
          @if (p.exercises.length) {
            <ul class="mt-4 space-y-4">@for (ex of p.exercises; track $index) {
              <li class="border-b border-line pb-4 last:border-0 last:pb-0"><h3 class="font-semibold text-ink">{{ ex.title }}</h3>
                <p class="mt-1 whitespace-pre-line text-sm text-ink-2">{{ ex.instructions }}</p>
                @if (ex.scenario) {<p class="mt-2 rounded-lg bg-canvas p-2.5 text-xs text-muted"><span class="font-medium text-ink-2">Escenario:</span> {{ ex.scenario }}</p>}</li>
            }</ul>
          } @else {<p class="mt-4 text-sm text-faint">Este análisis no incluye ejercicios.</p>}
        </div>
      </section>
    }`,
})
export class AnalysisDetailComponent {
  readonly id = input.required<string>();
  private readonly service = inject(AnalysesService);
  private readonly negotiations = inject(NegotiationsService);
  protected readonly dims = DIMENSIONS;
  protected readonly a = signal<Analysis | null>(null);
  protected readonly neg = signal<Negotiation | null>(null);
  protected readonly error = signal('');

  constructor() { effect(() => { const id = this.id(); untracked(() => this.load(id)); }); }
  protected pct(s: number | undefined) { return Math.round(scorePercent(s)); }
  protected lists(p: Analysis['payload']) {
    return [
      { title: 'Estrategias observadas', items: p.strategies, dot: 'bg-tech' },
      { title: 'Fortalezas', items: p.strengths, dot: 'bg-ok' },
      { title: 'Áreas de mejora', items: p.improvement_areas, dot: 'bg-warn' },
    ];
  }
  protected load(id: string) {
    this.a.set(null); this.error.set('');
    this.service.get(Number(id)).subscribe({
      next: (a) => { this.a.set(a); this.negotiations.get(a.negotiation_id).subscribe({ next: (n) => this.neg.set(n), error: () => this.neg.set(null) }); },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
