import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from './api-config';
import { GeneratePlotReportResource, PlotReportResource } from './api.types';

/** Analytics and Reporting endpoints: plot reports kept by the platform and their PDF. */
@Injectable({ providedIn: 'root' })
export class AnalyticsReportingApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_CONFIG).baseUrl;

  generateReport(body: GeneratePlotReportResource) {
    return this.http.post<PlotReportResource>(`${this.url}/plot-reports`, body);
  }
  reportsOf(plotId: number) {
    return this.http.get<PlotReportResource[]>(`${this.url}/plot-reports`, {
      params: { plotId },
    });
  }
  exportReport(reportId: number) {
    return this.http.get(`${this.url}/plot-reports/${reportId}/export`, { responseType: 'blob' });
  }
}
