import type { ConnectionLink, LabelSide, RegionNode, RegionRole, RegionService, RegionStatus } from '../types/infrastructure';
import type { ServiceCategory } from '../types/cloud';
import { INITIAL_SERVICES } from './awsServicesData';

const TYPE_LABEL: Record<ServiceCategory, string> = {
  Compute: 'Cómputo',
  Storage: 'Almacenamiento',
  Database: 'Base de Datos',
  Security: 'Seguridad',
  Networking: 'Red',
  Management: 'Gestión',
};

interface Deployment {
  serviceId: string;
  /** Fracción del costo base del catálogo que se gasta en esta región (el hub paga el 100 %). */
  share: number;
  instances?: number;
}

interface RegionSpec {
  id: string;
  name: string;
  shortName: string;
  /** Texto que aparece entre paréntesis en los selectores: "us-east-1 (Norte de Virginia)". */
  selectorLabel: string;
  location: string;
  coordinates: [number, number];
  status: RegionStatus;
  role: RegionRole;
  latencyMs: number;
  zones: string[];
  labelSide: LabelSide;
  deployments: Deployment[];
}

const ALL_SERVICES: Deployment[] = INITIAL_SERVICES.map((s) => ({
  serviceId: s.id,
  share: 1,
  instances: s.id === 'ec2' ? 2 : undefined,
}));

const SPECS: RegionSpec[] = [
  {
    id: 'us-east-1',
    name: 'US East (N. Virginia)',
    shortName: 'N. Virginia',
    selectorLabel: 'Norte de Virginia',
    location: 'EE.UU. Este',
    coordinates: [-77.04, 38.9],
    status: 'active',
    role: 'hub',
    latencyMs: 1.2,
    zones: ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e', 'us-east-1f'],
    labelSide: 'bottom',
    deployments: ALL_SERVICES,
  },
  {
    id: 'us-west-2',
    name: 'US West (Oregon)',
    shortName: 'Oregón',
    selectorLabel: 'Oregón',
    location: 'EE.UU. Oeste',
    coordinates: [-122.68, 45.52],
    status: 'active',
    role: 'dr',
    latencyMs: 62,
    zones: ['us-west-2a', 'us-west-2b', 'us-west-2c', 'us-west-2d'],
    labelSide: 'bottom',
    deployments: [
      { serviceId: 'ec2', share: 0.25, instances: 1 },
      { serviceId: 'rds', share: 0.3 },
      { serviceId: 's3', share: 0.4 },
      { serviceId: 'kms', share: 0.3 },
      { serviceId: 'cloudwatch', share: 0.2 },
    ],
  },
  {
    id: 'sa-east-1',
    name: 'South America (São Paulo)',
    shortName: 'São Paulo',
    selectorLabel: 'São Paulo',
    location: 'Sudamérica',
    coordinates: [-46.63, -23.55],
    status: 'active',
    role: 'edge',
    latencyMs: 115,
    zones: ['sa-east-1a', 'sa-east-1b', 'sa-east-1c'],
    labelSide: 'bottom',
    deployments: [
      { serviceId: 'ec2', share: 0.2, instances: 1 },
      { serviceId: 'elb', share: 0.3 },
      { serviceId: 'cloudfront', share: 0.15 },
      { serviceId: 's3', share: 0.1 },
    ],
  },
  {
    id: 'eu-west-1',
    name: 'EU (Ireland)',
    shortName: 'Irlanda',
    selectorLabel: 'Irlanda',
    location: 'Europa Oeste',
    coordinates: [-6.26, 53.35],
    status: 'maintenance',
    role: 'replica',
    latencyMs: 78,
    zones: ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'],
    labelSide: 'left',
    deployments: [
      { serviceId: 'rds', share: 0.25 },
      { serviceId: 's3', share: 0.2 },
      { serviceId: 'cloudwatch', share: 0.15 },
    ],
  },
  {
    id: 'eu-central-1',
    name: 'EU (Frankfurt)',
    shortName: 'Frankfurt',
    selectorLabel: 'Frankfurt',
    location: 'Europa Central',
    coordinates: [8.68, 50.11],
    status: 'active',
    role: 'replica',
    latencyMs: 90,
    zones: ['eu-central-1a', 'eu-central-1b', 'eu-central-1c'],
    labelSide: 'right',
    deployments: [
      { serviceId: 'ec2', share: 0.3, instances: 1 },
      { serviceId: 'elb', share: 0.3 },
      { serviceId: 's3', share: 0.3 },
      { serviceId: 'cloudfront', share: 0.2 },
      { serviceId: 'kms', share: 0.2 },
      { serviceId: 'sns', share: 0.5 },
    ],
  },
  {
    id: 'ap-south-1',
    name: 'Asia Pacific (Mumbai)',
    shortName: 'Mumbai',
    selectorLabel: 'Mumbai',
    location: 'Asia del Sur',
    coordinates: [72.88, 19.08],
    status: 'degraded',
    role: 'edge',
    latencyMs: 190,
    zones: ['ap-south-1a', 'ap-south-1b', 'ap-south-1c'],
    labelSide: 'bottom',
    deployments: [
      { serviceId: 'cloudfront', share: 0.15 },
      { serviceId: 's3', share: 0.1 },
      { serviceId: 'sns', share: 0.5 },
    ],
  },
  {
    id: 'ap-southeast-1',
    name: 'Asia Pacific (Singapore)',
    shortName: 'Singapur',
    selectorLabel: 'Singapur',
    location: 'Asia Pacífico',
    coordinates: [103.82, 1.35],
    status: 'active',
    role: 'edge',
    latencyMs: 215,
    zones: ['ap-southeast-1a', 'ap-southeast-1b', 'ap-southeast-1c'],
    labelSide: 'bottom',
    deployments: [
      { serviceId: 'ec2', share: 0.15, instances: 1 },
      { serviceId: 'lambda', share: 0.3 },
      { serviceId: 'cloudfront', share: 0.2 },
      { serviceId: 's3', share: 0.1 },
      { serviceId: 'dynamodb', share: 0.2 },
    ],
  },
  {
    id: 'ap-northeast-1',
    name: 'Asia Pacific (Tokyo)',
    shortName: 'Tokio',
    selectorLabel: 'Tokio',
    location: 'Asia Oriental',
    coordinates: [139.69, 35.69],
    status: 'active',
    role: 'edge',
    latencyMs: 160,
    zones: ['ap-northeast-1a', 'ap-northeast-1c', 'ap-northeast-1d'],
    labelSide: 'top',
    deployments: [
      { serviceId: 'ec2', share: 0.15, instances: 1 },
      { serviceId: 'lambda', share: 0.2 },
      { serviceId: 'cloudfront', share: 0.2 },
      { serviceId: 's3', share: 0.1 },
    ],
  },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

const buildServices = (deployments: Deployment[]): RegionService[] =>
  deployments.flatMap((d) => {
    const service = INITIAL_SERVICES.find((s) => s.id === d.serviceId);
    if (!service) return [];
    return [
      {
        id: service.id,
        name: service.name.replace(/^(Amazon|AWS) /, ''),
        type: TYPE_LABEL[service.category],
        instances: d.instances,
        description: service.mainFunction,
        monthlyCost: round2(service.estimatedCost * d.share),
      },
    ];
  });

export const MOCK_REGIONS: RegionNode[] = SPECS.map((spec) => {
  const services = buildServices(spec.deployments);
  return {
    id: spec.id,
    name: spec.name,
    shortName: spec.shortName,
    location: spec.location,
    coordinates: spec.coordinates,
    status: spec.status,
    role: spec.role,
    costMonthly: round2(services.reduce((acc, s) => acc + s.monthlyCost, 0)),
    latencyMs: spec.latencyMs,
    azsCount: spec.zones.length,
    availableZones: spec.zones,
    services,
    labelSide: spec.labelSide,
  };
});

const HUB_ID = 'us-east-1';

export const MOCK_CONNECTIONS: ConnectionLink[] = SPECS.filter((s) => s.id !== HUB_ID).map((s) => ({
  fromRegionId: HUB_ID,
  toRegionId: s.id,
  status: s.id === 'sa-east-1' ? 'backup' : 'primary',
}));

/**
 * Opciones de región para los selectores (Dashboard y Planificación).
 * El valor conserva el formato histórico "us-east-1 (Norte de Virginia)" para no romper datos guardados.
 */
export const REGION_OPTIONS: { id: string; value: string; label: string }[] = SPECS.map((s) => ({
  id: s.id,
  value: `${s.id} (${s.selectorLabel})`,
  label: `${s.id} (${s.selectorLabel})`,
}));

/** "us-east-1 (Norte de Virginia)" → "us-east-1" */
export const regionIdFromValue = (value: string): string => value.split(' ')[0];

export const ROLE_LABEL: Record<RegionRole, string> = {
  hub: 'Hub principal',
  replica: 'Réplica regional',
  dr: 'Recuperación ante desastres',
  edge: 'Punto de borde',
};

export const STATUS_LABEL: Record<RegionStatus, string> = {
  active: 'Operacional',
  maintenance: 'Mantenimiento',
  degraded: 'Degradado',
  failover: 'Failover activo',
  down: 'Caída',
};
