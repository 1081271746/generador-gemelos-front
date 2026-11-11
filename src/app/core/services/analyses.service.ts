import { Injectable, inject } from '@angular/core';
import { Analysis } from '../../shared/models/api.models';
import { ApiService } from './api.service';

@Injectable({providedIn: 'root'})
export class AnalysesService {
  private api = inject(ApiService);
  list() { return this.api.all<Analysis>('/analyses'); }
  get(id: number) { return this.api.get<Analysis>(`/analyses/${id}`); }
  generate(negotiationId: number) { return this.api.post<Analysis>(`/negotiations/${negotiationId}/analysis`); }
}
