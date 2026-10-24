import React from 'react';
import { ModalShell } from './ModalShell';
import type { CloudProposal } from '../types/cloud';
import type { RegionNode } from '../types/infrastructure';
import { ROLE_LABEL, STATUS_LABEL } from '../data/mockInfrastructure';
import { STATUS_PILL } from './regionStatus';
import { Globe, MapPin, X, DollarSign, Server, Activity, Layers, Wrench, FileText } from 'lucide-react';

interface RegionModalProps {
  region: RegionNode;
  proposals: CloudProposal[];
  onClose: () => void;
  onToggleMaintenance: (regionId: string) => void;
}

export const RegionModal: React.FC<RegionModalProps> = ({ region, proposals, onClose, onToggleMaintenance }) => {
  const inMaintenance = region.status === 'maintenance';
  const blocked = region.status === 'down' || region.status === 'failover';
  const activeInstances = region.services.reduce((acc, s) => acc + (s.instances ?? 0), 0);

  return (
    <ModalShell titleId="region-modal-title" onClose={onClose}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h3 id="region-modal-title" className="text-lg font-bold text-slate-800">
                {region.name}
              </h3>
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {region.location} · <span className="font-mono">{region.id}</span>
              </p>
            </div>
          </div>
          <button
            data-autofocus
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle de la región"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full border px-2.5 py-1 font-semibold ${STATUS_PILL[region.status]}`}>
              {STATUS_LABEL[region.status]}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
              {ROLE_LABEL[region.role]}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
              {region.services.length} servicios
            </span>
            <button
              type="button"
              disabled={blocked}
              onClick={() => onToggleMaintenance(region.id)}
              title={blocked ? 'No disponible mientras la región está en caída o failover' : undefined}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wrench className="h-3.5 w-3.5 text-amber-600" />
              {inMaintenance ? 'Terminar mantenimiento' : 'Simular mantenimiento'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <DollarSign className="h-3.5 w-3.5 text-amber-500" /> Costo est. / mes
              </span>
              <p className="mt-1 text-xl font-extrabold text-slate-800">${region.costMonthly.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <Activity className="h-3.5 w-3.5 text-emerald-500" /> Latencia al hub
              </span>
              <p className="mt-1 text-xl font-extrabold text-slate-800">{region.latencyMs} ms</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <Layers className="h-3.5 w-3.5 text-indigo-500" /> Zonas de disponibilidad
              </span>
              <p className="mt-1 text-xl font-extrabold text-slate-800">{region.azsCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <Server className="h-3.5 w-3.5 text-blue-500" /> Instancias EC2
              </span>
              <p className="mt-1 text-xl font-extrabold text-slate-800">{activeInstances}</p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Zonas de disponibilidad</h4>
            <div className="flex flex-wrap gap-1.5">
              {region.availableZones.map((az) => (
                <span key={az} className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[11px] text-blue-700">
                  {az}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <FileText className="h-3.5 w-3.5" /> Propuestas en esta región
            </h4>
            {proposals.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                Todavía no hay propuestas registradas para esta región. Créalas en Planificación Cloud.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {proposals.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs">
                    <span className="font-semibold text-slate-800">{p.solutionName}</span>
                    <span className="text-slate-500">SLA {p.availabilityLevel}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Servicios en esta región</h4>
            <ul className="space-y-2">
              {region.services.map((srv) => (
                <li key={srv.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-sm font-bold text-slate-800">{srv.name}</span>
                      <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                        {srv.type}
                      </span>
                      {srv.instances ? <span className="ml-2 text-[11px] text-slate-500">{srv.instances} inst.</span> : null}
                    </div>
                    <span className="shrink-0 text-sm font-bold text-slate-800">
                      ${srv.monthlyCost.toFixed(2)}
                      <span className="text-[11px] font-normal text-slate-500">/mes</span>
                    </span>
                  </div>
                  {srv.description && <p className="mt-1 text-[11px] text-slate-500">{srv.description}</p>}
                </li>
              ))}
            </ul>
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
