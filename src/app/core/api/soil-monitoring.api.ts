import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from './api-config';
import {
  CalibrationRecordResource,
  RegisterCalibrationRecordResource,
  SoilReadingResource,
} from './api.types';

/** Soil Monitoring endpoints. Telemetry ingestion belongs to the Edge Service, not here. */
@Injectable({ providedIn: 'root' })
export class SoilMonitoringApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_CONFIG).baseUrl;

  readingsOf(plotId: number) {
    return this.http.get<SoilReadingResource[]>(`${this.url}/soil-readings`, {
      params: { plotId },
    });
  }
  calibrationsOf(deviceId: number) {
    return this.http.get<CalibrationRecordResource[]>(`${this.url}/calibration-records`, {
      params: { deviceId },
    });
  }
  registerCalibration(body: RegisterCalibrationRecordResource) {
    return this.http.post<CalibrationRecordResource>(`${this.url}/calibration-records`, body);
  }
}
