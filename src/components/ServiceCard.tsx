import React from 'react';
import type { AWSService } from '../types/cloud';
import { ServiceStatusBadge } from './ServiceStatusBadge';
import { ServiceIcon } from './serviceIcons';
import { ChevronRight, DollarSign, FileText } from 'lucide-react';

interface ServiceCardProps {
  service: AWSService;
  proposalCount?: number;
  onInspect?: (service: AWSService) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, proposalCount = 0, onInspect }) => {
  return (
    <button
      type="button"
      onClick={() => onInspect?.(service)}
      aria-label={`Inspeccionar ${service.name}`}
      className="group flex w-full flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-slate-100 p-2">
              <ServiceIcon serviceId={service.id} category={service.category} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">{service.name}</h4>
              <span className="text-xs font-medium text-slate-500">{service.category}</span>
            </div>
          </div>
          <ServiceStatusBadge status={service.status} />
        </div>

        <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">{service.description}</p>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
          <span className="mb-0.5 block text-[11px] font-semibold uppercase text-slate-500">Función Principal</span>
          <p className="text-xs font-medium text-slate-700">{service.mainFunction}</p>
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Costo base / mes:</span>
          <span className="flex items-center font-bold text-slate-800">
            <DollarSign className="h-3.5 w-3.5 text-amber-500" />
            {service.estimatedCost.toFixed(2)} USD
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            {proposalCount > 0 ? `En ${proposalCount} propuesta${proposalCount > 1 ? 's' : ''}` : 'Sin propuestas'}
          </span>
          <span className="flex items-center font-semibold text-blue-600 group-hover:underline">
            Inspeccionar <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
};
