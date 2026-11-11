import { Injectable, inject } from '@angular/core';
import { Exercise, Profile, Recommendations } from '../../shared/models/api.models';
import { ApiService } from './api.service';

@Injectable({providedIn: 'root'})
export class ProfileService {
  private api = inject(ApiService);
  get() { return this.api.get<Profile>('/profile'); }
  recommendations() { return this.api.get<Recommendations>('/recommendations'); }
  resources() { return this.api.get<{source: string; exercises: Exercise[]}>('/resources/exercises'); }
}
