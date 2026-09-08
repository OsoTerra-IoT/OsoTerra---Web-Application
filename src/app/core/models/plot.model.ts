export interface Farm {
  id: string;
  name: string;
  ownerId: string;
  department: string;
  province: string;
}

export interface Plot {
  id: string;
  farmId: string;
  ownerId: string;
  advisorIds: string[];
  name: string;
  latitude: number;
  longitude: number;
  areaHectares: number;
  cropId: string;
  deviceId?: string;
  createdAt: string;
}
