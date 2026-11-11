import { Injectable, inject } from '@angular/core';
import { Scenario, ScenarioInput } from '../../shared/models/api.models';
import { ApiService } from './api.service';

@Injectable({providedIn: 'root'})
export class ScenariosService {
  private api = inject(ApiService);
  list() { return this.api.all<Scenario>('/scenarios/'); }
  get(id: number) { return this.api.get<Scenario>(`/scenarios/${id}`); }
  create(input: ScenarioInput) { return this.api.post<Scenario>('/scenarios/', input); }
  update(id: number, input: ScenarioInput) { return this.api.put<Scenario>(`/scenarios/${id}`, input); }
  archive(id: number) { return this.api.delete<void>(`/scenarios/${id}`); }
}
