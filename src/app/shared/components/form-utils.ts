import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Rechaza valores compuestos solo por espacios. */
export const notBlank: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  typeof c.value === 'string' && c.value.length > 0 && c.value.trim().length === 0 ? { blank: true } : null;

export function fieldError(c: AbstractControl | null, label: string): string | null {
  if (!c || !c.invalid || !(c.touched || c.dirty)) return null;
  const e = c.errors ?? {};
  if (e['required'] || e['blank']) return label + ' es obligatorio.';
  if (e['minlength']) return label + ' requiere al menos ' + e['minlength'].requiredLength + ' caracteres.';
  if (e['maxlength']) return label + ' admite como máximo ' + e['maxlength'].requiredLength + ' caracteres.';
  if (e['email']) return 'Introduce un correo electrónico válido.';
  if (e['pattern']) return label + ' solo admite letras, números, guion bajo y guion.';
  if (e['mismatch']) return 'Las contraseñas no coinciden.';
  return label + ' no es válido.';
}
