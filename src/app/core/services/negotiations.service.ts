import { Injectable, inject } from '@angular/core';
import { Negotiation } from '../../shared/models/api.models';
import { ApiService } from './api.service';

@Injectable({providedIn: 'root'})
export class NegotiationsService {
  private api = inject(ApiService);
  list() { return this.api.all<Negotiation>('/negotiations/'); }
  get(id: number) { return this.api.get<Negotiation>(`/negotiations/${id}`); }
  create(scenarioId: number) { return this.api.post<Negotiation>('/negotiations/', {scenario_id: scenarioId}); }
  finish(id: number, status: 'completed' | 'cancelled', result: string) {
    return this.api.patch<Negotiation>(`/negotiations/${id}`, {status, result});
  }
}
