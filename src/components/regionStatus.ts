import type { RegionStatus } from '../types/infrastructure';

/** Colores del mapa (SVG) y de las etiquetas, uno por estado. */
export const STATUS_COLOR: Record<RegionStatus, string> = {
  active: '#22c55e',
  degraded: '#f59e0b',
  maintenance: '#a78bfa',
  failover: '#3b82f6',
  down: '#ef4444',
};

export const STATUS_PILL: Record<RegionStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  degraded: 'bg-amber-50 text-amber-700 border-amber-200',
  maintenance: 'bg-violet-50 text-violet-700 border-violet-200',
  failover: 'bg-blue-50 text-blue-700 border-blue-200',
  down: 'bg-red-50 text-red-700 border-red-200',
};
