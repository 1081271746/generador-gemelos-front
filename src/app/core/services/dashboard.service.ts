import { Injectable, inject } from '@angular/core';
import { forkJoin, map } from 'rxjs';
import { DashboardData } from '../../shared/models/api.models';
import { NegotiationsService } from './negotiations.service';
import { ScenariosService } from './scenarios.service';
import { AnalysesService } from './analyses.service';

@Injectable({providedIn: 'root'})
export class DashboardService {
  private negotiations = inject(NegotiationsService);
  private scenarios = inject(ScenariosService);
  private analyses = inject(AnalysesService);
  get() {
    return forkJoin({negotiations: this.negotiations.list(), scenarios: this.scenarios.list(), analyses: this.analyses.list()}).pipe(
      map(data => ({
        ...data, total: data.negotiations.length,
        active: data.negotiations.filter(item => item.status === 'active').length,
        completed: data.negotiations.filter(item => item.status === 'completed').length,
        cancelled: data.negotiations.filter(item => item.status === 'cancelled').length,
        scenarioCount: data.scenarios.filter(item => item.is_active).length,
      } satisfies DashboardData)),
    );
  }
}
