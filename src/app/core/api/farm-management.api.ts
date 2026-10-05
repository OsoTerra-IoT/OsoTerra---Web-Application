import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from './api-config';
import {
  CropResource,
  DeviceResource,
  FarmResource,
  PlotResource,
  RegisterFarmResource,
  RegisterPlotResource,
  UpdatePlotResource,
} from './api.types';

/** Farm Management endpoints: crops, farms, plots and devices. */
@Injectable({ providedIn: 'root' })
export class FarmManagementApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_CONFIG).baseUrl;

  crops() {
    return this.http.get<CropResource[]>(`${this.url}/crops`);
  }
  myFarms() {
    return this.http.get<FarmResource[]>(`${this.url}/farms/mine`);
  }
  farmsOf(ownerId: number) {
    return this.http.get<FarmResource[]>(`${this.url}/farms`, { params: { ownerId } });
  }
  registerFarm(body: RegisterFarmResource) {
    return this.http.post<FarmResource>(`${this.url}/farms`, body);
  }
  updateFarm(id: number, body: RegisterFarmResource) {
    return this.http.put<FarmResource>(`${this.url}/farms/${id}`, body);
  }
  plotsOf(farmId: number) {
    return this.http.get<PlotResource[]>(`${this.url}/plots`, { params: { farmId } });
  }
  registerPlot(body: RegisterPlotResource) {
    return this.http.post<PlotResource>(`${this.url}/plots`, body);
  }
  updatePlot(id: number, body: UpdatePlotResource) {
    return this.http.put<PlotResource>(`${this.url}/plots/${id}`, body);
  }
  assignCrop(plotId: number, cropId: number) {
    return this.http.post<PlotResource>(`${this.url}/plots/${plotId}/crop`, { cropId });
  }
  devicesOf(plotId: number) {
    return this.http.get<DeviceResource[]>(`${this.url}/devices`, { params: { plotId } });
  }
  registerDevice(activationCode: string) {
    return this.http.post<DeviceResource>(`${this.url}/devices`, { activationCode });
  }
  attachDevice(deviceId: number, plotId: number) {
    return this.http.post<DeviceResource>(`${this.url}/devices/${deviceId}/attachment`, {
      plotId,
    });
  }
}
