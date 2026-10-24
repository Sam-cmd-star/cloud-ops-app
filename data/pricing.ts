import { INITIAL_SERVICES } from './awsServicesData';
import type { AWSService } from '../types/cloud';

export const SLA_OPTIONS: { value: string; note: string }[] = [
  { value: '99.0%', note: 'Hasta ~3.6 días de caída al año' },
  { value: '99.5%', note: 'Hasta ~1.8 días de caída al año' },
  { value: '99.9%', note: 'Hasta ~8.8 horas de caída al año' },
  { value: '99.95%', note: 'Hasta ~4.4 horas · exige Multi-AZ' },
  { value: '99.99%', note: 'Hasta ~53 minutos · exige Multi-AZ' },
];

export const USER_TIERS: { max: number; multiplier: number; label: string }[] = [
  { max: 5_000, multiplier: 1, label: 'hasta 5 000 usuarios' },
  { max: 25_000, multiplier: 2, label: 'hasta 25 000 usuarios' },
  { max: 100_000, multiplier: 4, label: 'hasta 100 000 usuarios' },
  { max: Number.POSITIVE_INFINITY, multiplier: 8, label: 'más de 100 000 usuarios' },
];

export const getUserTier = (users: number) =>
  USER_TIERS.find((tier) => users <= tier.max) ?? USER_TIERS[USER_TIERS.length - 1];

/** SLA numérico a partir de "99.95%" (0 si el texto no es válido). */
export const parseSla = (sla: string): number => {
  const n = parseFloat(sla.replace('%', '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const requiresMultiAz = (sla: string): boolean => parseSla(sla) >= 99.95;

export interface PricedLine {
  serviceId: string;
  serviceName: string;
  baseMonthly: number; // Precio base del catálogo
  multiplier: number; // Factor por usuarios y por Multi-AZ
  monthly: number;
}

export const findServiceByName = (name: string): AWSService | undefined =>
  INITIAL_SERVICES.find((s) => s.name === name);

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Estima el costo mensual de cada servicio elegido.
 * - Los servicios que escalan con usuarios se multiplican por el tramo de usuarios.
 * - Con SLA de 99.95 % o más, los servicios Multi-AZ se duplican (réplica en otra zona).
 */
export const estimateLines = (serviceNames: string[], users: number, sla: string): PricedLine[] => {
  const tier = getUserTier(Math.max(users, 1));
  const multiAz = requiresMultiAz(sla);

  return serviceNames.flatMap((name) => {
    const service = findServiceByName(name);
    if (!service) return [];
    let multiplier = 1;
    if (service.scalesWithUsers) multiplier *= tier.multiplier;
    if (service.multiAz && multiAz) multiplier *= 2;
    return [
      {
        serviceId: service.id,
        serviceName: service.name,
        baseMonthly: service.estimatedCost,
        multiplier,
        monthly: round2(service.estimatedCost * multiplier),
      },
    ];
  });
};

export const sumMonthly = (lines: PricedLine[]): number => round2(lines.reduce((acc, l) => acc + l.monthly, 0));
