export type ServiceStatus = 'En uso' | 'Disponible' | 'Planificado';
export type ServiceCategory = 'Compute' | 'Storage' | 'Database' | 'Security' | 'Networking' | 'Management';

export interface AWSService {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  mainFunction: string;
  status: ServiceStatus;
  estimatedCost: number; // Costo base estimado $/mes (precio de referencia del catálogo)
  resourceType?: string; // Tipo de recurso de CloudFormation, ej. AWS::EC2::Instance
  scalesWithUsers?: boolean; // El costo crece con los usuarios estimados de la propuesta
  multiAz?: boolean; // Se duplica cuando el SLA pedido exige alta disponibilidad multi-AZ
}

export interface CloudProposal {
  id: string;
  solutionName: string;
  appType: string;
  description: string;
  selectedRegion: string;
  estimatedUsers: number;
  availabilityLevel: string; // ej. "99.99%"
  selectedServices: string[];
  migrationGoal: string;
  createdAt: string;
  estimatedMonthlyCost?: number; // Estimación calculada al guardar la propuesta
}

export interface CostEstimateItem {
  id: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  hoursPerMonth: number;
  unitCostPerHour: number;
  monthlyCost: number;
  annualCost: number;
  region?: string; // Región a la que pertenece el costo
  proposalId?: string; // Propuesta que generó la línea (si existe)
}

export interface AWSRegionData {
  id: string;
  region: string; // ej. us-east-1
  location: string; // ej. EE.UU. Este (N. Virginia)
  deployedServices: string[];
  status: 'Operativo' | 'Mantenimiento' | 'Degradado';
  latencyMs: number;
}

export type SecurityStatus = 'correct' | 'warning' | 'danger';

export interface SecurityMetric {
  id: string;
  category: 'IAM' | 'Protección de Datos' | 'Cumplimiento' | 'Cuentas';
  title: string;
  status: SecurityStatus;
  description: string;
  recommendation?: string;
}

export interface SharedResponsibilityItem {
  category: string;
  awsResponsibility: string;
  customerResponsibility: string;
}
