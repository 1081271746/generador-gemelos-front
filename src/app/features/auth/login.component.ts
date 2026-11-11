import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { safeReturnUrl } from '../../core/auth/token';
import { errorMessage } from '../../core/http/api-error';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon.component';
import { fieldError } from '../../shared/components/form-utils';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  template: `
    <div class="rise">
      <p class="eyebrow mb-3">Acceso</p>
      <h1 class="text-[2rem] font-semibold leading-tight text-ink">Vuelve a la mesa</h1>
      <p class="mt-2 text-sm text-muted">Inicia sesión para continuar tus negociaciones y revisar tus análisis.</p>
    </div>
    <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 space-y-5 rise rise-1" novalidate>
      @if (error()) {
        <div class="flex gap-3 rounded-xl border border-bad/20 bg-bad-soft p-3.5 text-sm text-bad" role="alert"><app-icon name="alert" [size]="16" class="mt-0.5" />{{ error() }}</div>
      }
      <div>
        <label class="label" for="email">Correo electrónico</label>
        <input id="email" type="email" class="input" formControlName="email" autocomplete="email" [attr.aria-invalid]="!!err('email')" aria-describedby="email-err" />
        <p id="email-err" class="field-error" aria-live="polite">{{ err('email') }}</p>
      </div>
      <div>
        <label class="label" for="password">Contraseña</label>
        <div class="relative">
          <input id="password" [type]="show() ? 'text' : 'password'" class="input pr-20" formControlName="password" autocomplete="current-password" [attr.aria-invalid]="!!err('password')" aria-describedby="pw-err" />
          <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-muted hover:text-ink" (click)="show.set(!show())" [attr.aria-pressed]="show()">{{ show() ? 'Ocultar' : 'Mostrar' }}</button>
        </div>
        <p id="pw-err" class="field-error" aria-live="polite">{{ err('password') }}</p>
      </div>
      <button type="submit" class="btn btn-primary w-full !h-11" [disabled]="busy()">
        {{ busy() ? 'Entrando…' : 'Iniciar sesión' }} @if (!busy()) {<app-icon name="arrow-right" [size]="16" />}
      </button>
    </form>
    <p class="mt-8 text-center text-sm text-muted rise rise-2">¿Primera vez en Gemelos? <a routerLink="/register" class="font-medium text-tech hover:underline">Crea una cuenta</a></p>`,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly show = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  private readonly labels: Record<string, string> = { email: 'El correo', password: 'La contraseña' };

  protected err(name: 'email' | 'password') { return fieldError(this.form.controls[name], this.labels[name]); }

  protected submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true); this.error.set('');
    const v = this.form.getRawValue();
    this.auth.login({ email: v.email.trim(), password: v.password }).subscribe({
      next: (u) => {
        this.busy.set(false);
        this.toast.success('Hola de nuevo, ' + u.username + '.');
        this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')));
      },
      error: (e) => { this.busy.set(false); this.error.set(errorMessage(e)); },
    });
  }
}
