import { Injectable, signal } from '@angular/core';

export interface ToastMessage { id: number; text: string; kind: 'success' | 'error' | 'info' }

@Injectable({providedIn: 'root'})
export class ToastService {
  private state = signal<ToastMessage[]>([]);
  readonly messages = this.state.asReadonly();
  private sequence = 0;
  success(text: string) { this.add(text, 'success'); }
  error(text: string) { this.add(text, 'error'); }
  info(text: string) { this.add(text, 'info'); }
  dismiss(id: number) { this.state.update(items => items.filter(item => item.id !== id)); }
  private add(text: string, kind: ToastMessage['kind']) {
    const id = ++this.sequence;
    this.state.update(items => [...items.slice(-3), {id, text, kind}]);
    setTimeout(() => this.dismiss(id), kind === 'error' ? 9000 : 5000);
  }
}
