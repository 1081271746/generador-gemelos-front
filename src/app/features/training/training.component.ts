import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/http/api-error';
import { ProfileService } from '../../core/services/profile.service';
import { Exercise, Recommendations } from '../../shared/models/api.models';
import { IconComponent } from '../../shared/components/icon.component';
import { ErrorStateComponent, PageHeaderComponent } from '../../shared/components/states.component';

@Component({
  selector: 'app-training',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RouterLink, IconComponent, ErrorStateComponent, PageHeaderComponent],
  template: `
    <app-page-header eyebrow="Aprendizaje" title="Entrenamiento" subtitle="Primero, lo que surge de tus propios análisis. Después, una biblioteca curada de ejercicios generales." />

    <section aria-labelledby="mine-h" class="rise rise-1">
      <div class="mb-4 flex items-center gap-3"><span class="grid h-8 w-8 place-items-center rounded-lg bg-tech-soft text-tech"><app-icon name="user" [size]="16" /></span>
        <h2 id="mine-h" class="text-xl font-semibold">Para ti</h2><span class="font-mono text-[11px] uppercase tracking-wider text-faint">Según tus análisis</span></div>
      @if (recError()) {
        <app-error-state [message]="recError()" (retry)="loadRec()" />
      } @else if (!rec()) {
        <div class="grid gap-4 md:grid-cols-2" role="status"><span class="sr-only">Cargando recomendaciones</span><div class="skeleton h-48 rounded-2xl"></div><div class="skeleton h-48 rounded-2xl"></div></div>
      } @else if (!rec()!.recommendations.length && !rec()!.exercises.length) {
        <div class="card grid-bg p-8 text-center"><p class="font-medium text-ink">Aún no hay recomendaciones personales</p>
          <p class="mx-auto mt-1 max-w-md text-sm text-muted">Aparecerán cuando tengas análisis generados. Mientras tanto, la biblioteca de abajo sirve como punto de partida.</p>
          <a routerLink="/negotiations/new" class="btn btn-primary mt-5">Practicar una negociación</a></div>
      } @else {
        <div class="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <div class="rounded-2xl bg-navy p-6 text-[#dbe2f6]">
            <p class="eyebrow !text-[#a594ff]">Recomendaciones</p>
            @if (rec()!.recommendations.length) {
              <ol class="mt-4 space-y-3 text-sm">@for (r of rec()!.recommendations; track $index) {<li class="flex gap-3"><span class="font-mono text-[#a594ff]">{{ ($index + 1).toString().padStart(2, '0') }}</span>{{ r }}</li>}</ol>
            } @else {<p class="mt-4 text-sm text-[#8f9cc4]">Sin recomendaciones por ahora.</p>}
          </div>
          <div class="space-y-3">
            @for (ex of rec()!.exercises; track $index) {<ng-container *ngTemplateOutlet="exTpl; context: { $implicit: ex, tone: 'tech' }" />}
            @empty {<div class="card p-6 text-sm text-muted">Sin ejercicios personales por ahora.</div>}
          </div>
        </div>
      }
    </section>

    <section aria-labelledby="lib-h" class="mt-12 rise rise-2">
      <div class="mb-4 flex flex-wrap items-center gap-3"><span class="grid h-8 w-8 place-items-center rounded-lg bg-violet-soft text-violet"><app-icon name="book" [size]="16" /></span>
        <h2 id="lib-h" class="text-xl font-semibold">Biblioteca curada</h2>
        @if (source()) {<span class="rounded-full border border-line bg-paper px-2.5 py-1 font-mono text-[11px] text-muted">Fuente: {{ source() }}</span>}</div>
      @if (resError()) {
        <app-error-state [message]="resError()" (retry)="loadRes()" />
      } @else if (!resources()) {
        <div class="grid gap-4 md:grid-cols-2" role="status"><span class="sr-only">Cargando biblioteca</span>@for (i of [1,2,3,4]; track i) {<div class="skeleton h-36 rounded-2xl"></div>}</div>
      } @else if (resources()!.length === 0) {
        <div class="card p-6 text-sm text-muted">La biblioteca no tiene ejercicios publicados.</div>
      } @else {
        <div class="grid gap-3 md:grid-cols-2">@for (ex of resources()!; track $index) {<ng-container *ngTemplateOutlet="exTpl; context: { $implicit: ex, tone: 'violet' }" />}</div>
      }
    </section>

    <ng-template #exTpl let-ex let-tone="tone">
      <article class="card p-5">
        <h3 class="flex items-start gap-2 font-semibold text-ink"><span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" [class]="tone === 'tech' ? 'bg-tech' : 'bg-violet'"></span>{{ ex.title }}</h3>
        <p class="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">{{ ex.instructions }}</p>
        @if (ex.scenario) {<p class="mt-3 rounded-lg bg-canvas p-2.5 text-xs text-muted"><span class="font-medium text-ink-2">Escenario:</span> {{ ex.scenario }}</p>}
      </article>
    </ng-template>`,
})
export class TrainingComponent {
  private readonly service = inject(ProfileService);
  protected readonly rec = signal<Recommendations | null>(null);
  protected readonly recError = signal('');
  protected readonly resources = signal<Exercise[] | null>(null);
  protected readonly source = signal('');
  protected readonly resError = signal('');

  constructor() { this.loadRec(); this.loadRes(); }
  protected loadRec() {
    this.rec.set(null); this.recError.set('');
    this.service.recommendations().subscribe({ next: (r) => this.rec.set(r), error: (e) => this.recError.set(errorMessage(e)) });
  }
  protected loadRes() {
    this.resources.set(null); this.resError.set('');
    this.service.resources().subscribe({ next: (r) => { this.source.set(r.source); this.resources.set(r.exercises); }, error: (e) => this.resError.set(errorMessage(e)) });
  }
}
