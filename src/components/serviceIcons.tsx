import React from 'react';
import {
  Server,
  Database,
  Shield,
  Globe,
  HardDrive,
  Cpu,
  Zap,
  Table,
  Key,
  Network,
  Cloud,
  Share2,
  Activity,
  Bell,
} from 'lucide-react';
import type { ServiceCategory } from '../types/cloud';

type IconType = React.ComponentType<{ className?: string }>;

const BY_SERVICE: Record<string, IconType> = {
  ec2: Cpu,
  lambda: Zap,
  s3: HardDrive,
  rds: Database,
  dynamodb: Table,
  iam: Shield,
  kms: Key,
  vpc: Network,
  route53: Globe,
  cloudfront: Cloud,
  elb: Share2,
  cloudwatch: Activity,
  sns: Bell,
};

export const CATEGORY_TONE: Record<ServiceCategory, { icon: string; chip: string }> = {
  Compute: { icon: 'text-blue-600', chip: 'bg-blue-50 text-blue-700' },
  Storage: { icon: 'text-amber-600', chip: 'bg-amber-50 text-amber-700' },
  Database: { icon: 'text-indigo-600', chip: 'bg-indigo-50 text-indigo-700' },
  Security: { icon: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-700' },
  Networking: { icon: 'text-purple-600', chip: 'bg-purple-50 text-purple-700' },
  Management: { icon: 'text-rose-600', chip: 'bg-rose-50 text-rose-700' },
};

export const ServiceIcon: React.FC<{ serviceId: string; category: ServiceCategory; className?: string }> = ({
  serviceId,
  category,
  className = 'h-5 w-5',
}) => {
  const Icon = BY_SERVICE[serviceId] ?? Server;
  return <Icon className={`${className} ${CATEGORY_TONE[category].icon}`} />;
};
