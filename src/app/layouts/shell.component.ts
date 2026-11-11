import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { ToastService } from '../core/services/toast.service';
import { IconComponent, LogoComponent } from '../shared/components/icon.component';

interface NavItem { path: string; label: string; icon: string }

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LogoComponent],
  template: `
    <a href="#contenido" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] btn btn-primary">Saltar al contenido</a>
    <div class="min-h-[100dvh] lg:grid lg:grid-cols-[264px_1fr]">
      @if (menuOpen()) {
        <div class="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden" (click)="menuOpen.set(false)" aria-hidden="true"></div>
      }
      <aside class="fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-navy text-[#c9d3ee] transition-transform duration-300 lg:sticky lg:top-0 lg:h-[100dvh] lg:translate-x-0"
        [class.-translate-x-full]="!menuOpen()" aria-label="Navegación principal">
        <div class="flex h-16 items-center justify-between px-5 border-b border-white/8">
          <app-logo [light]="true" />
          <button type="button" class="lg:hidden grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10" (click)="menuOpen.set(false)" aria-label="Cerrar menú">
            <app-icon name="x" />
          </button>
        </div>
        <nav class="flex-1 overflow-y-auto px-3 py-5">
          @for (group of groups; track group.title) {
            <p class="px-3 pb-2 pt-4 first:pt-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[#7f8fbf]">{{ group.title }}</p>
            <ul class="space-y-0.5">
              @for (item of group.items; track item.path) {
                <li>
                  <a [routerLink]="item.path" routerLinkActive="!bg-white/10 !text-white [&_.dot]:opacity-100" #rla="routerLinkActive"
                    [attr.aria-current]="rla.isActive ? 'page' : null"
                    class="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/5 hover:text-white">
                    <span class="dot absolute -left-3 top-2 bottom-2 w-[3px] rounded-r bg-[#a594ff] opacity-0 transition-opacity"></span>
                    <app-icon [name]="item.icon" [size]="18" />{{ item.label }}
                  </a>
                </li>
              }
            </ul>
          }
        </nav>
        <div class="m-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="flex items-center gap-3">
            <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-tech to-violet font-display text-sm font-semibold text-white">{{ initials() }}</div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-white">{{ auth.user()?.username }}</p>
              <p class="truncate text-xs text-[#8f9cc4]">{{ auth.user()?.email }}</p>
            </div>
            <button type="button" class="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10 hover:text-white" (click)="logout()" aria-label="Cerrar sesión" title="Cerrar sesión">
              <app-icon name="logout" [size]="16" />
            </button>
          </div>
        </div>
      </aside>

      <div class="min-w-0">
        <header class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/85 px-4 backdrop-blur lg:hidden">
          <button type="button" class="grid h-9 w-9 place-items-center rounded-lg border border-line" (click)="menuOpen.set(true)" aria-label="Abrir menú" [attr.aria-expanded]="menuOpen()">
            <app-icon name="menu" />
          </button>
          <app-logo />
          <a routerLink="/negotiations/new" class="grid h-9 w-9 place-items-center rounded-lg bg-navy text-white" aria-label="Nueva negociación"><app-icon name="plus" /></a>
        </header>
        <main id="contenido" class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10" tabindex="-1">
          <router-outlet />
        </main>
      </div>
    </div>`,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly menuOpen = signal(false);
  protected readonly initials = computed(() => (this.auth.user()?.username ?? '?').slice(0, 2).toUpperCase());

  protected readonly groups: { title: string; items: NavItem[] }[] = [
    { title: 'Práctica', items: [
      { path: '/dashboard', label: 'Resumen', icon: 'home' },
      { path: '/scenarios', label: 'Escenarios', icon: 'layers' },
      { path: '/negotiations', label: 'Negociaciones', icon: 'chat' },
    ] },
    { title: 'Aprendizaje', items: [
      { path: '/analyses', label: 'Análisis', icon: 'chart' },
      { path: '/profile', label: 'Mi perfil', icon: 'user' },
      { path: '/training', label: 'Entrenamiento', icon: 'book' },
    ] },
    { title: 'Cuenta', items: [{ path: '/settings', label: 'Ajustes', icon: 'settings' }] },
  ];

  private leaving = false;

  constructor() {
    // Si la sesión se pierde (expiración, 401, cambio de contraseña), vuelve al acceso conservando la ruta.
    effect(() => {
      if (this.auth.user() || this.leaving) return;
      this.leaving = true;
      const url = this.router.url;
      this.router.navigate(['/login'], { queryParams: url && !url.startsWith('/login') ? { returnUrl: url } : {} });
    });
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuOpen.set(false));
  }

  protected logout() {
    this.leaving = true;
    this.auth.logout().subscribe({
      next: () => this.done(),
      error: () => {
        this.auth.clear();
        this.toast.error('Sesión local cerrada. No se pudo confirmar la revocación en el servidor; vuelve a intentarlo cuando esté disponible.');
        this.router.navigateByUrl('/login');
      },
    });
  }

  private done() {
    this.toast.info('Sesión cerrada.');
    this.router.navigateByUrl('/login');
  }
}
