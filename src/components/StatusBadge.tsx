import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

export type BadgeStatusType = 
  | 'En uso' | 'Disponible' | 'Planificado' 
  | 'Operativo' | 'Mantenimiento' | 'Degradado' 
  | 'correct' | 'warning' | 'danger';

interface StatusBadgeProps {
  status: BadgeStatusType;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'En uso':
    case 'Operativo':
    case 'correct':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          {status === 'correct' ? 'Correcto' : status}
        </span>
      );

    case 'Mantenimiento':
    case 'Planificado':
    case 'warning':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          {status === 'warning' ? 'Revisión Requerida' : status}
        </span>
      );

    case 'Degradado':
    case 'danger':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          {status === 'danger' ? 'Problema Detectado' : status}
        </span>
      );

    case 'Disponible':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          {status}
        </span>
      );
  }
};