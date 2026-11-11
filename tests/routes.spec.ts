import { describe, expect, it } from 'vitest';
import { routes } from '../src/app/app.routes';
import { authGuard, guestGuard } from '../src/app/core/auth/auth.guard';

describe('Navegación y separación de accesos', () => {
  it('redirige la raíz antes de que el layout público pueda capturar una página vacía', () => {
    expect(routes[0]).toMatchObject({path: '', pathMatch: 'full', redirectTo: 'dashboard'});
  });
  it('protege todas las funciones privadas y conserva accesos públicos separados', () => {
    const privateRoute = routes.find(route => route.canActivate?.includes(authGuard));
    const publicRoute = routes.find(route => route.canActivate?.includes(guestGuard));
    expect(privateRoute?.children?.map(route => route.path)).toEqual(expect.arrayContaining([
      'dashboard', 'scenarios', 'scenarios/new', 'scenarios/:id/edit', 'scenarios/:id',
      'negotiations', 'negotiations/new', 'negotiations/:id', 'analyses', 'analyses/:id',
      'profile', 'training', 'settings',
    ]));
    expect(publicRoute?.children?.map(route => route.path)).toEqual(['login', 'register']);
    expect(routes.at(-1)?.path).toBe('**');
  });
});
