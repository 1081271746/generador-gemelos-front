import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/http/api-error';
import { ScenariosService } from '../../core/services/scenarios.service';
import { ToastService } from '../../core/services/toast.service';
import { ScenarioInput } from '../../shared/models/api.models';
import { IconComponent } from '../../shared/components/icon.component';
import { ErrorStateComponent, PageHeaderComponent } from '../../shared/components/states.component';
import { fieldError, notBlank } from '../../shared/components/form-utils';

type Key = keyof ScenarioInput;
interface FieldDef { key: Key; label: string; max: number; area: boolean; hint: string; rows?: number }

const FIELDS: { title: string; note: string; fields: FieldDef[] }[] = [
  { title: 'La situación', note: 'Qué se negocia y en qué circunstancias.', fields: [
    { key: 'title', label: 'Título', max: 150, area: false, hint: 'Un nombre corto para reconocerlo.' },
    { key: 'description', label: 'Descripción', max: 5000, area: true, hint: 'Resumen de lo que está en juego.', rows: 3 },
    { key: 'context', label: 'Contexto', max: 10000, area: true, hint: 'Antecedentes, plazos, relación entre las partes.', rows: 5 },
  ] },
  { title: 'Tu posición', note: 'Lo que quieres conseguir al cerrar la conversación.', fields: [
    { key: 'objective', label: 'Tu objetivo', max: 5000, area: true, hint: 'Cuanto más concreto, más útil será el análisis.', rows: 3 },
  ] },
  { title: 'La contraparte', note: 'Cómo se comportará el gemelo simulado.', fields: [
    { key: 'counterpart_role', label: 'Rol de la contraparte', max: 150, area: false, hint: 'Por ejemplo: coordinadora de prácticas.' },
    { key: 'counterpart_goal', label: 'Objetivo de la contraparte', max: 5000, area: true, hint: 'Qué intenta conseguir del otro lado.', rows: 3 },
    { key: 'counterpart_limits', label: 'Límites de la contraparte', max: 5000, area: true, hint: 'Lo que no aceptará bajo ninguna circunstancia.', rows: 3 },
  ] },
];

@Component({
  selector: 'app-scenario-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, ErrorStateComponent, PageHeaderComponent],
  template: `
    <a [routerLink]="id() ? ['/scenarios', id()] : '/scenarios'" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><app-icon name="arrow-left" [size]="14" />Volver</a>
    <app-page-header [eyebrow]="id() ? 'Editar escenario' : 'Nuevo escenario'" [title]="id() ? 'Ajusta el escenario' : 'Describe la negociación'"
      subtitle="Los cambios solo afectan a negociaciones nuevas: cada negociación guarda una copia del escenario al empezar." />

    @if (loadError()) {
      <app-error-state [message]="loadError()" (retry)="load(id()!)" />
    } @else if (loading()) {
      <div class="space-y-4" role="status"><span class="sr-only">Cargando escenario</span>
        @for (i of [1,2,3]; track i) {<div class="skeleton h-48 rounded-2xl"></div>}</div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-6">
        @for (g of groups; track g.title; let gi = $index) {
          <fieldset class="card grid gap-6 p-5 md:grid-cols-[220px_1fr] md:p-7 rise" [class]="'rise-' + (gi + 1)">
            <legend class="sr-only">{{ g.title }}</legend>
            <div>
              <p class="font-mono text-[11px] text-violet">0{{ gi + 1 }}</p>
              <h2 class="mt-1 text-lg font-semibold">{{ g.title }}</h2>
              <p class="mt-1 text-sm text-muted">{{ g.note }}</p>
            </div>
            <div class="space-y-5">
              @for (fd of g.fields; track fd.key) {
                <div>
                  <div class="flex items-baseline justify-between gap-3">
                    <label class="label" [for]="fd.key">{{ fd.label }}</label>
                    <span class="font-mono text-[11px]" [class]="len(fd.key) > fd.max ? 'text-bad' : 'text-faint'">{{ len(fd.key) }}/{{ fd.max }}</span>
                  </div>
                  @if (fd.area) {
                    <textarea class="input" [id]="fd.key" [formControlName]="fd.key" [rows]="fd.rows ?? 3" [attr.maxlength]="fd.max" [attr.aria-describedby]="fd.key + '-h ' + fd.key + '-e'"></textarea>
                  } @else {
                    <input class="input" [id]="fd.key" [formControlName]="fd.key" [attr.maxlength]="fd.max" [attr.aria-describedby]="fd.key + '-h ' + fd.key + '-e'" />
                  }
                  <p class="hint" [id]="fd.key + '-h'">{{ fd.hint }}</p>
                  <p class="field-error" [id]="fd.key + '-e'" aria-live="polite">{{ err(fd) }}</p>
                </div>
              }
            </div>
          </fieldset>
        }
        @if (saveError()) {
          <div class="flex gap-3 rounded-xl border border-bad/20 bg-bad-soft p-4 text-sm text-bad" role="alert"><app-icon name="alert" [size]="16" class="mt-0.5" />{{ saveError() }}</div>
        }
        <div class="sticky bottom-4 z-10 flex flex-col-reverse gap-2 rounded-2xl border border-line bg-paper/90 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-end">
          <span class="mr-auto hidden text-xs text-muted sm:block">{{ form.invalid ? 'Completa los 7 campos para guardar.' : 'Todo listo.' }}</span>
          <a [routerLink]="id() ? ['/scenarios', id()] : '/scenarios'" class="btn btn-ghost">Cancelar</a>
          <button type="submit" class="btn btn-primary" [disabled]="saving()"><app-icon name="check" [size]="16" />{{ saving() ? 'Guardando…' : (id() ? 'Guardar cambios' : 'Crear escenario') }}</button>
        </div>
      </form>
    }`,
})
export class ScenarioFormComponent {
  readonly id = input<string>();
  private readonly service = inject(ScenariosService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly groups = FIELDS;
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    title: ['', [Validators.required, notBlank, Validators.maxLength(150)]],
    description: ['', [Validators.required, notBlank, Validators.maxLength(5000)]],
    context: ['', [Validators.required, notBlank, Validators.maxLength(10000)]],
    objective: ['', [Validators.required, notBlank, Validators.maxLength(5000)]],
    counterpart_role: ['', [Validators.required, notBlank, Validators.maxLength(150)]],
    counterpart_goal: ['', [Validators.required, notBlank, Validators.maxLength(5000)]],
    counterpart_limits: ['', [Validators.required, notBlank, Validators.maxLength(5000)]],
  });
  private readonly values = signal(this.form.getRawValue());
  protected readonly numericId = computed(() => Number(this.id()));

  constructor() {
    this.form.valueChanges.subscribe(() => this.values.set(this.form.getRawValue()));
    effect(() => { const id = this.id(); if (id) untracked(() => this.load(id)); });
  }

  protected len(k: Key) { return this.values()[k].length; }
  protected err(fd: FieldDef) { return fieldError(this.form.controls[fd.key], fd.label); }

  protected load(id: string) {
    this.loading.set(true); this.loadError.set('');
    this.service.get(Number(id)).subscribe({
      next: (s) => {
        this.form.setValue({ title: s.title, description: s.description, context: s.context, objective: s.objective,
          counterpart_role: s.counterpart_role, counterpart_goal: s.counterpart_goal, counterpart_limits: s.counterpart_limits });
        this.loading.set(false);
      },
      error: (e) => { this.loadError.set(errorMessage(e)); this.loading.set(false); },
    });
  }

  protected submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) { this.saveError.set(this.form.invalid ? 'Revisa los campos marcados.' : ''); return; }
    const raw = this.form.getRawValue();
    const body: ScenarioInput = {
      title: raw.title.trim(), description: raw.description.trim(), context: raw.context.trim(), objective: raw.objective.trim(),
      counterpart_role: raw.counterpart_role.trim(), counterpart_goal: raw.counterpart_goal.trim(), counterpart_limits: raw.counterpart_limits.trim(),
    };
    this.saving.set(true); this.saveError.set('');
    const id = this.id();
    const req = id ? this.service.update(Number(id), body) : this.service.create(body);
    req.subscribe({
      next: (s) => { this.saving.set(false); this.toast.success(id ? 'Escenario actualizado.' : 'Escenario creado.'); this.router.navigate(['/scenarios', s.id]); },
      error: (e) => { this.saving.set(false); this.saveError.set(errorMessage(e)); },
    });
  }
}
