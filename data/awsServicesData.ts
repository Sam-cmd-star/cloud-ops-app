import type {
  AWSService,
  CostEstimateItem,
  SecurityMetric,
  ServiceCategory,
  SharedResponsibilityItem,
} from '../types/cloud';

/**
 * Catálogo único de servicios AWS del módulo.
 * Planificación, Costos, Servicios, Infraestructura y Red leen de aquí, así los
 * precios y nombres son los mismos en todas las pantallas.
 * estimatedCost = costo base mensual de referencia (USD) para una carga de tamaño inicial.
 */
export const INITIAL_SERVICES: AWSService[] = [
  {
    id: 'ec2',
    name: 'Amazon EC2',
    category: 'Compute',
    description: 'Capacidad de cómputo redimensionable en la nube.',
    mainFunction: 'Servidores virtuales para alojar aplicaciones backend y microservicios.',
    status: 'Disponible',
    estimatedCost: 120.0, // 2 x t3.large (0.0833 USD/h) x 720 h
    resourceType: 'AWS::EC2::Instance',
    scalesWithUsers: true,
    multiAz: true,
  },
  {
    id: 'lambda',
    name: 'AWS Lambda',
    category: 'Compute',
    description: 'Ejecución de código sin servidores, orientada a eventos.',
    mainFunction: 'Funciones bajo demanda para automatización y procesamiento de eventos.',
    status: 'Disponible',
    estimatedCost: 8.0,
    resourceType: 'AWS::Lambda::Function',
    scalesWithUsers: true,
  },
  {
    id: 's3',
    name: 'Amazon S3',
    category: 'Storage',
    description: 'Almacenamiento de objetos a escala masiva.',
    mainFunction: 'Almacenamiento de activos estáticos, copias de seguridad y archivos multimedia.',
    status: 'Disponible',
    estimatedCost: 34.5, // 1.5 TB x 0.023 USD/GB
    resourceType: 'AWS::S3::Bucket',
  },
  {
    id: 'rds',
    name: 'Amazon RDS',
    category: 'Database',
    description: 'Servicio de bases de datos relacionales administradas.',
    mainFunction: 'Base de datos PostgreSQL/MySQL para gestión transaccional de la solución.',
    status: 'Disponible',
    estimatedCost: 210.0, // db.t3.large Multi-AZ (0.2916 USD/h) x 720 h
    resourceType: 'AWS::RDS::DBInstance',
    scalesWithUsers: true,
    multiAz: true,
  },
  {
    id: 'dynamodb',
    name: 'Amazon DynamoDB',
    category: 'Database',
    description: 'Base de datos NoSQL de clave-valor con latencia de milisegundos.',
    mainFunction: 'Sesiones, catálogos y datos de acceso rápido sin administrar servidores.',
    status: 'Disponible',
    estimatedCost: 28.0,
    resourceType: 'AWS::DynamoDB::Table',
    scalesWithUsers: true,
  },
  {
    id: 'iam',
    name: 'AWS IAM',
    category: 'Security',
    description: 'Gestión de accesos e identidades a recursos de AWS.',
    mainFunction: 'Control granular de permisos, roles y políticas de seguridad.',
    status: 'Disponible',
    estimatedCost: 0.0,
    resourceType: 'AWS::IAM::Role',
  },
  {
    id: 'kms',
    name: 'AWS KMS',
    category: 'Security',
    description: 'Administración centralizada de llaves de cifrado.',
    mainFunction: 'Cifrado de datos en reposo para S3, RDS y EBS.',
    status: 'Disponible',
    estimatedCost: 3.0, // 3 llaves administradas x 1 USD/mes
    resourceType: 'AWS::KMS::Key',
  },
  {
    id: 'vpc',
    name: 'Amazon VPC',
    category: 'Networking',
    description: 'Red virtual aislada lógicamente para desplegar recursos.',
    mainFunction: 'Aislamiento de subredes públicas y privadas, tablas de ruteo y Gateways.',
    status: 'Disponible',
    estimatedCost: 32.4, // 1 NAT Gateway (0.045 USD/h) x 720 h; la VPC en sí no tiene costo
    resourceType: 'AWS::EC2::VPC',
  },
  {
    id: 'route53',
    name: 'Amazon Route 53',
    category: 'Networking',
    description: 'Servicio Web DNS escalable de alta disponibilidad.',
    mainFunction: 'Gestión de dominio, enrutamiento de tráfico y chequeos de salud.',
    status: 'Disponible',
    estimatedCost: 5.0,
    resourceType: 'AWS::Route53::HostedZone',
  },
  {
    id: 'cloudfront',
    name: 'Amazon CloudFront',
    category: 'Networking',
    description: 'Red de distribución de contenido (CDN) global.',
    mainFunction: 'Entrega rápida y segura de contenido con baja latencia mediante caché.',
    status: 'Disponible',
    estimatedCost: 42.5, // 500 GB de salida x 0.085 USD/GB
    resourceType: 'AWS::CloudFront::Distribution',
    scalesWithUsers: true,
  },
  {
    id: 'elb',
    name: 'Elastic Load Balancing',
    category: 'Networking',
    description: 'Distribución automática del tráfico entrante entre varios destinos.',
    mainFunction: 'Balanceo de carga de aplicaciones (ALB) y capa de red.',
    status: 'Disponible',
    estimatedCost: 22.0,
    resourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
    scalesWithUsers: true,
    multiAz: true,
  },
  {
    id: 'cloudwatch',
    name: 'Amazon CloudWatch',
    category: 'Management',
    description: 'Monitoreo de métricas, logs y alarmas de toda la infraestructura.',
    mainFunction: 'Observabilidad, alertas y trazabilidad operativa.',
    status: 'Disponible',
    estimatedCost: 12.0,
    resourceType: 'AWS::CloudWatch::Alarm',
  },
  {
    id: 'sns',
    name: 'Amazon SNS',
    category: 'Management',
    description: 'Mensajería publicación/suscripción totalmente administrada.',
    mainFunction: 'Notificaciones y desacoplamiento entre microservicios.',
    status: 'Disponible',
    estimatedCost: 2.0,
    resourceType: 'AWS::SNS::Topic',
  },
];

export const SERVICE_CATEGORIES: ('All' | ServiceCategory)[] = [
  'All',
  'Compute',
  'Storage',
  'Database',
  'Security',
  'Networking',
  'Management',
];

export const CATEGORY_LABELS: Record<'All' | ServiceCategory, string> = {
  All: 'Todos',
  Compute: 'Compute',
  Storage: 'Storage',
  Database: 'Database',
  Security: 'Security',
  Networking: 'Networking',
  Management: 'Management',
};

/** Costos de referencia derivados del catálogo (una línea por servicio con costo). */
export const INITIAL_COSTS: CostEstimateItem[] = INITIAL_SERVICES.filter((s) => s.estimatedCost > 0).map((s) => ({
  id: `c-${s.id}`,
  serviceId: s.id,
  serviceName: s.name,
  quantity: 1,
  hoursPerMonth: 720,
  unitCostPerHour: s.estimatedCost / 720,
  monthlyCost: s.estimatedCost,
  annualCost: s.estimatedCost * 12,
}));

export interface FreeTierItem {
  serviceId: string;
  service: string;
  detail: string;
  kind: 'always' | 'trial' | 'none';
}

/**
 * Referencia orientativa según la documentación pública de AWS.
 * Las cuentas creadas desde el 15 de julio de 2025 usan el plan gratuito con créditos;
 * las anteriores conservan los límites de 12 meses. Conviene confirmar en aws.amazon.com/free.
 */
export const FREE_TIER_ITEMS: FreeTierItem[] = [
  { serviceId: 'ec2', service: 'EC2', detail: '750 h/mes de t2.micro o t3.micro', kind: 'trial' },
  { serviceId: 'rds', service: 'RDS', detail: '750 h/mes db.t2.micro o db.t3.micro + 20 GB', kind: 'trial' },
  { serviceId: 's3', service: 'S3', detail: '5 GB estándar, 20 000 GET y 2 000 PUT', kind: 'trial' },
  { serviceId: 'lambda', service: 'Lambda', detail: '1 M de solicitudes y 400 000 GB-s al mes', kind: 'always' },
  { serviceId: 'dynamodb', service: 'DynamoDB', detail: '25 GB y 25 unidades de lectura/escritura', kind: 'always' },
  { serviceId: 'cloudfront', service: 'CloudFront', detail: '1 TB de salida y 10 M de solicitudes/mes', kind: 'always' },
  { serviceId: 'cloudwatch', service: 'CloudWatch', detail: '10 métricas personalizadas y 10 alarmas', kind: 'always' },
  { serviceId: 'sns', service: 'SNS', detail: '1 M de publicaciones al mes', kind: 'always' },
  { serviceId: 'kms', service: 'KMS', detail: '20 000 solicitudes al mes', kind: 'always' },
  { serviceId: 'iam', service: 'IAM / VPC', detail: 'Sin costo adicional (se paga por los recursos que usan)', kind: 'none' },
];

export const SECURITY_METRICS: SecurityMetric[] = [
  {
    id: 'sec-1',
    category: 'IAM',
    title: 'Autenticación Multifactor (MFA)',
    status: 'correct',
    description: 'MFA habilitado para la cuenta raíz y usuarios administradores.',
  },
  {
    id: 'sec-2',
    category: 'IAM',
    title: 'Políticas de Principio de Menor Privilegio',
    status: 'warning',
    description: 'Se detectaron 2 roles con acceso broad (*:*) que requieren auditoría.',
    recommendation: 'Restringir acciones específicas por recurso en IAM.',
  },
  {
    id: 'sec-3',
    category: 'Protección de Datos',
    title: 'Encriptación en Reposo (KMS)',
    status: 'correct',
    description: 'Buckets de S3 y volúmenes EBS encriptados con claves KMS.',
  },
  {
    id: 'sec-4',
    category: 'Protección de Datos',
    title: 'Encriptación en Tránsito (TLS 1.3)',
    status: 'correct',
    description: 'Tráfico HTTPS forzado mediante certificados en CloudFront.',
  },
  {
    id: 'sec-5',
    category: 'Cuentas',
    title: 'AWS CloudTrail & GuardDuty',
    status: 'correct',
    description: 'Registro de auditoría activo con detección de amenazas en tiempo real.',
  },
  {
    id: 'sec-6',
    category: 'Cumplimiento',
    title: 'Copia de Seguridad Automatizada',
    status: 'warning',
    description: 'Los respaldos de RDS tienen una retención de solo 7 días.',
    recommendation: 'Aumentar retención a 30 días para cumplir estándar empresarial.',
  },
];

export interface SecuritySummary {
  score: number; // 0-100: correcto = 1, advertencia = 0.5, peligro = 0
  approved: number;
  total: number;
  warnings: number;
  dangers: number;
}

export const getSecuritySummary = (metrics: SecurityMetric[] = SECURITY_METRICS): SecuritySummary => {
  const approved = metrics.filter((m) => m.status === 'correct').length;
  const warnings = metrics.filter((m) => m.status === 'warning').length;
  const dangers = metrics.filter((m) => m.status === 'danger').length;
  const total = metrics.length;
  const score = total === 0 ? 0 : Math.round(((approved + warnings * 0.5) / total) * 100);
  return { score, approved, total, warnings, dangers };
};

export const SHARED_RESPONSIBILITY_DATA: SharedResponsibilityItem[] = [
  {
    category: 'Infraestructura Física',
    awsResponsibility: 'Seguridad de Data Centers, hardware, red física y energía.',
    customerResponsibility: 'Ninguna (gestionado por AWS).',
  },
  {
    category: 'Red y Cómputo',
    awsResponsibility: 'Hypervisor, virtualización y aislamiento de la red física.',
    customerResponsibility: 'Configuración de Parches de SO, Security Groups y VPC Routing.',
  },
  {
    category: 'Datos y Aplicación',
    awsResponsibility: 'Garantizar el aislamiento multi-tenant de almacenamiento.',
    customerResponsibility: 'Encriptación de datos, control de accesos IAM y código de la app.',
  },
];
