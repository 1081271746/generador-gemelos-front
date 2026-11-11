import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http/api-error';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon.component';
import { PageHeaderComponent } from '../../shared/components/states.component';
import { fieldError } from '../../shared/components/form-utils';

function matchNew(g: AbstractControl): ValidationErrors | null {
  const p = g.get('new_password'), c = g.get('confirm');
  if (!p || !c) return null;
  const errs = { ...(c.errors ?? {}) };
  if (c.value && p.value !== c.value) errs['mismatch'] = true; else delete errs['mismatch'];
  c.setErrors(Object.keys(errs).length ? errs : null);
  return null;
}

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, PageHeaderComponent],
  template: `
    <app-page-header eyebrow="Cuenta" title="Ajustes" subtitle="Tus datos de acceso. Gemelos no guarda preferencias adicionales." />
    <div class="space-y-6">
      <form [formGroup]="profile" (ngSubmit)="saveProfile()" novalidate class="card grid gap-6 p-6 md:grid-cols-[240px_1fr] rise rise-1" aria-labelledby="p-h">
        <div><h2 id="p-h" class="text-lg font-semibold">Perfil</h2><p class="mt-1 text-sm text-muted">Nombre visible y correo con el que inicias sesión.</p></div>
        <div class="space-y-4">
          <div><label class="label" for="username">Nombre de usuario</label>
            <input id="username" class="input" formControlName="username" maxlength="50" autocomplete="username" aria-describedby="u-h u-e" />
            <p id="u-h" class="hint">3 a 50 caracteres: letras, números, _ o -.</p>
            <p id="u-e" class="field-error" aria-live="polite">{{ e(profile.controls.username, 'El nombre de usuario') }}</p></div>
          <div><label class="label" for="email">Correo electrónico</label>
            <input id="email" type="email" class="input" formControlName="email" autocomplete="email" aria-describedby="e-e" />
            <p id="e-e" class="field-error" aria-live="polite">{{ e(profile.controls.email, 'El correo') }}</p></div>
          @if (pError()) {<p class="rounded-lg bg-bad-soft p-3 text-sm text-bad" role="alert">{{ pError() }}</p>}
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost" (click)="resetProfile()" [disabled]="pBusy() || profile.pristine">Descartar</button>
            <button type="submit" class="btn btn-primary" [disabled]="pBusy() || profile.pristine">{{ pBusy() ? 'Guardando…' : 'Guardar perfil' }}</button>
          </div>
        </div>
      </form>

      <form [formGroup]="pw" (ngSubmit)="changePassword()" novalidate class="card grid gap-6 p-6 md:grid-cols-[240px_1fr] rise rise-2" aria-labelledby="pw-h">
        <div><h2 id="pw-h" class="flex items-center gap-2 text-lg font-semibold"><app-icon name="lock" [size]="18" class="text-violet" />Contraseña</h2>
          <p class="mt-1 text-sm text-muted">Al cambiarla se cierra tu sesión y tendrás que volver a entrar.</p></div>
        <div class="space-y-4">
          <div><label class="label" for="cur">Contraseña actual</label>
            <input id="cur" type="password" class="input" formControlName="current_password" autocomplete="current-password" aria-describedby="cur-e" />
            <p id="cur-e" class="field-error" aria-live="polite">{{ e(pw.controls.current_password, 'La contraseña actual') }}</p></div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div><label class="label" for="new">Nueva contraseña</label>
              <input id="new" type="password" class="input" formControlName="new_password" maxlength="128" autocomplete="new-password" aria-describedby="new-h new-e" />
              <p id="new-h" class="hint">12 a 128 caracteres.</p>
              <p id="new-e" class="field-error" aria-live="polite">{{ e(pw.controls.new_password, 'La nueva contraseña') }}</p></div>
            <div><label class="label" for="conf">Repite la nueva</label>
              <input id="conf" type="password" class="input" formControlName="confirm" autocomplete="new-password" aria-describedby="conf-e" />
              <p id="conf-e" class="field-error" aria-live="polite">{{ e(pw.controls.confirm, 'La confirmación') }}</p></div>
          </div>
          @if (pwError()) {<p class="rounded-lg bg-bad-soft p-3 text-sm text-bad" role="alert">{{ pwError() }}</p>}
          <div class="flex justify-end"><button type="submit" class="btn btn-primary" [disabled]="pwBusy()">{{ pwBusy() ? 'Cambiando…' : 'Cambiar contraseña' }}</button></div>
        </div>
      </form>
    </div>`,
})
export class SettingsComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly pBusy = signal(false);
  protected readonly pError = signal('');
  protected readonly pwBusy = signal(false);
  protected readonly pwError = signal('');
  protected readonly profile = this.fb.group({
    username: [this.auth.user()?.username ?? '', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
    email: [this.auth.user()?.email ?? '', [Validators.required, Validators.email]],
  });
  protected readonly pw = this.fb.group({
    current_password: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    confirm: ['', Validators.required],
  }, { validators: matchNew });

  protected e(c: AbstractControl, label: string) { return fieldError(c, label); }

  protected resetProfile() {
    this.profile.reset({ username: this.auth.user()?.username ?? '', email: this.auth.user()?.email ?? '' });
    this.pError.set('');
  }

  protected saveProfile() {
    this.profile.markAllAsTouched();
    if (this.profile.invalid || this.pBusy()) return;
    const v = this.profile.getRawValue();
    this.pBusy.set(true); this.pError.set('');
    this.auth.update({ username: v.username, email: v.email.trim() }).subscribe({
      next: (u) => { this.pBusy.set(false); this.profile.reset({ username: u.username, email: u.email }); this.toast.success('Perfil actualizado.'); },
      error: (err) => { this.pBusy.set(false); this.pError.set(errorMessage(err)); },
    });
  }

  protected changePassword() {
    this.pw.markAllAsTouched();
    if (this.pw.invalid || this.pwBusy()) return;
    const v = this.pw.getRawValue();
    this.pwBusy.set(true); this.pwError.set('');
    this.auth.changePassword({ current_password: v.current_password, new_password: v.new_password }).subscribe({
      next: () => { this.pwBusy.set(false); this.auth.clear(); this.toast.success('Contraseña cambiada. Inicia sesión con la nueva.'); this.router.navigateByUrl('/login'); },
      error: (err) => { this.pwBusy.set(false); this.pwError.set(errorMessage(err)); },
    });
  }
}
