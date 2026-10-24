export type RegionStatus = 'active' | 'maintenance' | 'degraded' | 'failover' | 'down';
export type RegionRole = 'hub' | 'replica' | 'dr' | 'edge';
export type LabelSide = 'top' | 'bottom' | 'left' | 'right';

export interface RegionService {
  id: string;
  name: string;
  type: string;
  instances?: number;
  description?: string;
  monthlyCost: number;
}

export interface RegionNode {
  id: string; // us-east-1
  name: string; // US East (N. Virginia)
  shortName: string; // N. Virginia
  location: string; // EE.UU. Este
  coordinates: [number, number]; // [longitud, latitud]
  status: RegionStatus;
  role: RegionRole;
  costMonthly: number;
  latencyMs: number; // Latencia estimada desde el hub principal
  azsCount: number;
  availableZones: string[];
  services: RegionService[];
  labelSide: LabelSide;
}

export interface ConnectionLink {
  fromRegionId: string;
  toRegionId: string;
  status: 'primary' | 'backup' | 'active_failover';
}
