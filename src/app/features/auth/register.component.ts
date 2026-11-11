import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http/api-error';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon.component';
import { fieldError } from '../../shared/components/form-utils';

function matchPasswords(g: AbstractControl): ValidationErrors | null {
  const p = g.get('password'), c = g.get('confirm');
  if (!p || !c) return null;
  const mismatch = c.value && p.value !== c.value;
  const errs = { ...(c.errors ?? {}) };
  if (mismatch) errs['mismatch'] = true; else delete errs['mismatch'];
  c.setErrors(Object.keys(errs).length ? errs : null);
  return null;
}

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  template: `
    <div class="rise">
      <p class="eyebrow mb-3">Nueva cuenta</p>
      <h1 class="text-[2rem] font-semibold leading-tight text-ink">Prepara tu primer ensayo</h1>
      <p class="mt-2 text-sm text-muted">Tus escenarios, conversaciones y análisis quedan asociados solo a tu cuenta.</p>
    </div>
    <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 space-y-4 rise rise-1" novalidate>
      @if (error()) {
        <div class="flex gap-3 rounded-xl border border-bad/20 bg-bad-soft p-3.5 text-sm text-bad" role="alert"><app-icon name="alert" [size]="16" class="mt-0.5" />{{ error() }}</div>
      }
      <div>
        <label class="label" for="username">Nombre de usuario</label>
        <input id="username" class="input" formControlName="username" autocomplete="username" maxlength="50" aria-describedby="u-hint u-err" />
        <p id="u-hint" class="hint">Entre 3 y 50 caracteres: letras, números, _ o -.</p>
        <p id="u-err" class="field-error" aria-live="polite">{{ err('username', 'El nombre de usuario') }}</p>
      </div>
      <div>
        <label class="label" for="email">Correo electrónico</label>
        <input id="email" type="email" class="input" formControlName="email" autocomplete="email" aria-describedby="e-err" />
        <p id="e-err" class="field-error" aria-live="polite">{{ err('email', 'El correo') }}</p>
      </div>
      <div>
        <label class="label" for="password">Contraseña</label>
        <input id="password" type="password" class="input" formControlName="password" autocomplete="new-password" maxlength="128" aria-describedby="p-hint p-err" />
        <div class="mt-2 flex items-center gap-2" aria-hidden="true">
          <div class="bar flex-1"><span [style.width.%]="strength()" class="!animate-none transition-[width] duration-300"></span></div>
          <span class="font-mono text-[11px] text-faint">{{ form.controls.password.value.length }}/12</span>
        </div>
        <p id="p-hint" class="hint">Entre 12 y 128 caracteres. Una frase larga funciona bien.</p>
        <p id="p-err" class="field-error" aria-live="polite">{{ err('password', 'La contraseña') }}</p>
      </div>
      <div>
        <label class="label" for="confirm">Repite la contraseña</label>
        <input id="confirm" type="password" class="input" formControlName="confirm" autocomplete="new-password" aria-describedby="c-err" />
        <p id="c-err" class="field-error" aria-live="polite">{{ err('confirm', 'La confirmación') }}</p>
      </div>
      <button type="submit" class="btn btn-primary w-full !h-11" [disabled]="busy()">{{ busy() ? 'Creando cuenta…' : 'Crear cuenta' }}</button>
    </form>
    <p class="mt-8 text-center text-sm text-muted rise rise-2">¿Ya tienes cuenta? <a routerLink="/login" class="font-medium text-tech hover:underline">Inicia sesión</a></p>`,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    confirm: ['', [Validators.required]],
  }, { validators: matchPasswords });

  protected strength() { return Math.min(100, (this.form.controls.password.value.length / 12) * 100); }
  protected err(name: 'username' | 'email' | 'password' | 'confirm', label: string) { return fieldError(this.form.controls[name], label); }

  protected submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true); this.error.set('');
    const v = this.form.getRawValue();
    this.auth.register({ username: v.username, email: v.email.trim(), password: v.password }).subscribe({
      next: () => { this.busy.set(false); this.toast.success('Cuenta creada. Empieza definiendo un escenario.'); this.router.navigateByUrl('/dashboard'); },
      error: (e) => { this.busy.set(false); this.error.set(errorMessage(e)); },
    });
  }
}
