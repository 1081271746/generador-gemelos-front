import { Pipe, PipeTransform } from '@angular/core';
import { MessageKind, NegotiationStatus } from '../models/api.models';

export const STATUS_LABELS: Record<NegotiationStatus, string> = {
  active: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export const KIND_LABELS: Record<MessageKind, string> = {
  offer: 'Oferta',
  counteroffer: 'Contraoferta',
  argument: 'Argumento',
  concession: 'Concesión',
};

@Pipe({ name: 'statusLabel' })
export class StatusLabelPipe implements PipeTransform {
  transform(value: NegotiationStatus): string { return STATUS_LABELS[value] ?? value; }
}

@Pipe({ name: 'kindLabel' })
export class KindLabelPipe implements PipeTransform {
  transform(value: MessageKind): string { return KIND_LABELS[value] ?? value; }
}

const fmtDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateTime = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtTime = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });

@Pipe({ name: 'esDate' })
export class EsDatePipe implements PipeTransform {
  transform(value: string | null | undefined, mode: 'date' | 'datetime' | 'time' = 'date'): string {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return (mode === 'time' ? fmtTime : mode === 'datetime' ? fmtDateTime : fmtDate).format(d);
  }
}

/** Normaliza un puntaje a porcentaje según su escala aparente (0-1, 0-10 o 0-100). */
export function scorePercent(score: number | null | undefined): number {
  if (score == null || isNaN(score)) return 0;
  const pct = score <= 1 ? score * 100 : score <= 10 ? score * 10 : score;
  return Math.max(0, Math.min(100, pct));
}

export function scoreScale(score: number): string {
  return score <= 1 ? '/ 1' : score <= 10 ? '/ 10' : '/ 100';
}

@Pipe({ name: 'scorePct' })
export class ScorePctPipe implements PipeTransform {
  transform(value: number | null | undefined): number { return scorePercent(value); }
}

@Pipe({ name: 'score' })
export class ScorePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—';
    return `${Number.isInteger(value) ? value : value.toFixed(1)} ${scoreScale(value)}`;
  }
}
