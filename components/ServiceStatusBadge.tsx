import React from 'react';
import type { ServiceStatus } from '../types/cloud';

const STYLES: Record<ServiceStatus, string> = {
  'En uso': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Disponible: 'bg-slate-100 text-slate-600 border-slate-200',
  Planificado: 'bg-amber-50 text-amber-700 border-amber-200',
};

/** Etiqueta de estado de un servicio del catálogo (En uso / Disponible / Planificado). */
export const ServiceStatusBadge: React.FC<{ status: ServiceStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STYLES[status]}`}>
    {status}
  </span>
);
