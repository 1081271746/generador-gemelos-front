import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage } from '../src/app/core/http/api-error';

describe('Estados de error de la API', () => {
  it.each([0, 401, 403, 404, 409, 422, 429, 503, 500])('presenta un mensaje útil para estado %s', status => {
    expect(errorMessage(new HttpErrorResponse({status})).length).toBeGreaterThan(20);
  });
  it('conserva errores de validación por campo', () => {
    expect(errorMessage(new HttpErrorResponse({status: 422, error: {detail: [
      {loc: ['body', 'title'], msg: 'Too long'},
    ]}}))).toContain('title: Too long');
  });
});
