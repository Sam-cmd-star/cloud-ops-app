import React from 'react';
import type { AWSService, CloudProposal } from '../types/cloud';
import type { RegionNode } from '../types/infrastructure';
import { ModalShell } from './ModalShell';
import { ServiceStatusBadge } from './ServiceStatusBadge';
import { CATEGORY_TONE, ServiceIcon } from './serviceIcons';
import { Code2, DollarSign, FileText, Globe, Info, Layers, PieChart, X, Zap } from 'lucide-react';

interface ServiceModalProps {
  service: AWSService;
  regions: RegionNode[];
  proposals: CloudProposal[];
  catalogTotal: number;
  onClose: () => void;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({ service, regions, proposals, catalogTotal, onClose }) => {
  const deployedIn = regions.filter((r) => r.services.some((s) => s.id === service.id));
  const share = catalogTotal > 0 ? Math.round((service.estimatedCost / catalogTotal) * 100) : 0;

  return (
    <ModalShell titleId="service-modal-title" onClose={onClose}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-100 p-2.5">
            <ServiceIcon serviceId={service.id} category={service.category} className="h-6 w-6" />
          </div>
          <div>
            <h3 id="service-modal-title" className="text-lg font-bold text-slate-800">
              {service.name}
            </h3>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${CATEGORY_TONE[service.category].chip}`}>
              {service.category}
            </span>
          </div>
        </div>
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          aria-label="Cerrar detalle del servicio"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-5 overflow-y-auto p-5">
        <div className="flex flex-wrap items-center gap-2">
          <ServiceStatusBadge status={service.status} />
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            ${service.estimatedCost.toFixed(2)}/mes
          </span>
          {service.scalesWithUsers && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Escala con usuarios
            </span>
          )}
          {service.multiAz && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Multi-AZ con SLA ≥ 99.95%
            </span>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <h4 className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <Info className="h-3.5 w-3.5" /> Descripción
            </h4>
            <p className="text-slate-700">{service.description}</p>
          </div>
          <div>
            <h4 className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <Zap className="h-3.5 w-3.5" /> Función principal
            </h4>
            <p className="text-slate-700">{service.mainFunction}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <DollarSign className="h-3.5 w-3.5 text-amber-500" /> Costo anual base
            </span>
            <p className="mt-1 text-xl font-extrabold text-slate-800">${(service.estimatedCost * 12).toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <PieChart className="h-3.5 w-3.5 text-blue-500" /> Peso en el catálogo
            </span>
            <p className="mt-1 text-xl font-extrabold text-slate-800">{share}%</p>
          </div>
        </div>

        {service.resourceType && (
          <div>
            <h4 className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <Code2 className="h-3.5 w-3.5" /> Tipo de recurso
            </h4>
            <code className="block rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">{service.resourceType}</code>
          </div>
        )}

        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Globe className="h-3.5 w-3.5" /> Desplegado en {deployedIn.length} región{deployedIn.length === 1 ? '' : 'es'}
          </h4>
          {deployedIn.length === 0 ? (
            <p className="text-xs text-slate-500">Todavía no está desplegado en ninguna región del mapa.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {deployedIn.map((r) => (
                <span key={r.id} className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[11px] text-blue-700">
                  {r.id}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <FileText className="h-3.5 w-3.5" /> Propuestas que lo incluyen
          </h4>
          {proposals.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">
              Ninguna propuesta lo usa todavía. Agrégalo desde Planificación Cloud.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {proposals.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-800">{p.solutionName}</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Layers className="h-3 w-3" />
                    {p.selectedRegion.split(' ')[0]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex shrink-0 justify-end border-t border-slate-100 p-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Cerrar
        </button>
      </div>
    </ModalShell>
  );
};
