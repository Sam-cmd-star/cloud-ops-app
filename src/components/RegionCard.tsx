import React from 'react';
import type { RegionNode } from '../types/infrastructure';
import { ROLE_LABEL, STATUS_LABEL } from '../data/mockInfrastructure';
import { STATUS_PILL } from './regionStatus';
import { Globe, Activity, Layers, DollarSign } from 'lucide-react';

interface RegionCardProps {
  region: RegionNode;
  selected?: boolean;
  onSelect: (regionId: string) => void;
}

export const RegionCard: React.FC<RegionCardProps> = ({ region, selected = false, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(region.id)}
      aria-pressed={selected}
      className={`w-full space-y-4 rounded-xl border bg-white p-5 text-left shadow-sm transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        selected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-200 hover:border-blue-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">{region.name}</h4>
            <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-blue-700">{region.id}</code>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_PILL[region.status]}`}>
          {STATUS_LABEL[region.status]}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Layers className="h-3.5 w-3.5 text-slate-400" />
          <span>
            {region.services.length} servicios · {ROLE_LABEL[region.role]}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {region.services.slice(0, 5).map((srv) => (
            <span key={srv.id} className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              {srv.name}
            </span>
          ))}
          {region.services.length > 5 && (
            <span className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              +{region.services.length - 5}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Activity className="h-3.5 w-3.5 text-emerald-500" /> Latencia al hub:
          <strong className="text-slate-700">{region.latencyMs} ms</strong>
        </span>
        <span className="flex items-center gap-0.5 font-bold text-slate-700">
          <DollarSign className="h-3.5 w-3.5 text-amber-500" />
          {region.costMonthly.toFixed(2)}/mes
        </span>
      </div>
    </button>
  );
};
