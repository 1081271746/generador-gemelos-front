import { describe, expect, it } from 'vitest';
import { DIMENSIONS } from '../src/app/shared/models/api.models';

describe('Contrato de indicadores contextuales', () => {
  it('conserva las cinco claves exactas de FastAPI', () => {
    expect(DIMENSIONS.map(dimension => dimension.key)).toEqual([
      'assertiveness', 'cooperation', 'flexibility', 'argumentation', 'conflict_management',
    ]);
    expect(new Set(DIMENSIONS.map(item => item.key)).size).toBe(5);
  });
});
