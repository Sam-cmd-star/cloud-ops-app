import React from 'react';
import type { SecurityMetric } from '../types/cloud';
import { StatusBadge } from './StatusBadge';
import { ShieldCheck, ShieldAlert, Key, Database, FileText } from 'lucide-react';

interface SecurityCardProps {
  metric: SecurityMetric;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'IAM': return <Key className="w-4 h-4 text-purple-600" />;
    case 'Protección de Datos': return <Database className="w-4 h-4 text-blue-600" />;
    case 'Cumplimiento': return <FileText className="w-4 h-4 text-emerald-600" />;
    default: return <ShieldCheck className="w-4 h-4 text-indigo-600" />;
  }
};

export const SecurityCard: React.FC<SecurityCardProps> = ({ metric }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 rounded-lg">
            {getCategoryIcon(metric.category)}
          </div>
          <div>
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block">
              {metric.category}
            </span>
            <h4 className="text-sm font-bold text-slate-800">{metric.title}</h4>
          </div>
        </div>
        <StatusBadge status={metric.status} />
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">{metric.description}</p>

      {metric.recommendation && (
        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">
            <strong>Recomendación:</strong> {metric.recommendation}
          </p>
        </div>
      )}
    </div>
  );
};