export interface InstanceEC2 {
  id: string;
  name: string;
  type: string;
  region: string;
  status: 'running' | 'stopped' | 'pending';
  ipPublica: string;
  cpuUsage: number;
}

export interface MetricSummary {
  cpuGlobal: number;
  ramUsage: number;
  activeInstances: number;
  totalVpcs: number;
  monthlyCostEstimate: number;
}

export interface CloudOpsLog {
  id: string;
  timestamp: string;
  service: string;
  event: string;
  level: 'INFO' | 'WARN' | 'ERROR';
}

// Métricas generales del Dashboard CloudOps
export const MOCK_CLOUDOPS_METRICS: MetricSummary = {
  cpuGlobal: 42.5,
  ramUsage: 68.2,
  activeInstances: 6,
  totalVpcs: 2,
  monthlyCostEstimate: 184.50
};

// Instancias EC2 Simuladas (AWS)
export const MOCK_EC2_INSTANCES: InstanceEC2[] = [
  {
    id: 'i-0a12b34c567d890ef',
    name: 'web-frontend-prod',
    type: 't3.medium',
    region: 'us-east-1a',
    status: 'running',
    ipPublica: '54.210.12.88',
    cpuUsage: 34
  },
  {
    id: 'i-0f98e76d543c210ab',
    name: 'backend-api-gateway',
    type: 't3.large',
    region: 'us-east-1b',
    status: 'running',
    ipPublica: '52.90.142.11',
    cpuUsage: 58
  },
  {
    id: 'i-0c112233445566778',
    name: 'db-postgres-primary',
    type: 'r5.xlarge',
    region: 'us-east-1a',
    status: 'running',
    ipPublica: '10.0.1.45 (Privada)',
    cpuUsage: 71
  },
  {
    id: 'i-0d998877665544332',
    name: 'worker-queue-service',
    type: 't3.small',
    region: 'us-east-1c',
    status: 'stopped',
    ipPublica: 'N/A',
    cpuUsage: 0
  }
];

// Logs e Historial de Eventos CloudOps
export const MOCK_CLOUDOPS_LOGS: CloudOpsLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-10-04 16:45:12',
    service: 'Auto Scaling',
    event: 'Instancia web-frontend-prod escalada correctamente.',
    level: 'INFO'
  },
  {
    id: 'log-002',
    timestamp: '2026-10-04 15:30:00',
    service: 'CloudWatch',
    event: 'Uso de CPU en db-postgres-primary superó el 70%.',
    level: 'WARN'
  },
  {
    id: 'log-003',
    timestamp: '2026-10-04 12:10:05',
    service: 'AWS VPC',
    event: 'Tabla de ruteo actualizada en Subnet Pública 1.',
    level: 'INFO'
  }
];