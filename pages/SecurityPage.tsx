import React from 'react';
import { SECURITY_METRICS, SHARED_RESPONSIBILITY_DATA, getSecuritySummary } from '../data/awsServicesData';
import { SecurityCard } from '../components/SecurityCard';
import { StatCard } from '../components/StatCard';
import { ShieldCheck, Lock, Gauge, Key, AlertTriangle, Database } from 'lucide-react';

export const SecurityPage: React.FC = () => {
  const summary = getSecuritySummary();
  const alerts = summary.warnings + summary.dangers;

  const dataMetrics = SECURITY_METRICS.filter((m) => m.category === 'Protección de Datos');
  const dataProtected = dataMetrics.length === 0 ? 0 : Math.round((dataMetrics.filter((m) => m.status === 'correct').length / dataMetrics.length) * 100);
  const mfa = SECURITY_METRICS.find((m) => m.id === 'sec-1');
  const posture = alerts === 0 ? { label: 'Postura: óptima', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' } : { label: 'Postura: requiere atención', cls: 'border-red-200 bg-red-50 text-red-700' };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Seguridad, IAM y Cumplimiento</h2>
          <p className="text-sm text-slate-500">Modelo de responsabilidad compartida, control de acceso e indicadores de auditoría.</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${posture.cls}`}>{posture.label}</span>
      </div>

      {/* Indicadores calculados con las mismas métricas de abajo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Well-Architected Score"
          value={`${summary.score}/100`}
          subtitle={`${summary.approved} de ${summary.total} controles aprobados`}
          icon={Gauge}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
        />
        <StatCard
          title="Datos protegidos"
          value={`${dataProtected}%`}
          subtitle="Cifrado en reposo y en tránsito"
          icon={Database}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-600"
        />
        <StatCard
          title="Estado IAM root"
          value={mfa?.status === 'correct' ? 'MFA forzado' : 'Sin MFA'}
          subtitle="Cuenta raíz y administradores"
          icon={Key}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
        />
        <StatCard
          title="Alertas de seguridad"
          value={String(alerts)}
          subtitle={alerts === 0 ? 'Sin hallazgos abiertos' : `${summary.warnings} en revisión · ${summary.dangers} crítica(s)`}
          icon={AlertTriangle}
          iconBgColor="bg-rose-50"
          iconTextColor="text-rose-600"
        />
      </div>

      {/* Modelo de Responsabilidad Compartida */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-800">Modelo de Responsabilidad Compartida AWS</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-700">
              <tr>
                <th className="p-3">Categoría</th>
                <th className="bg-blue-50/50 p-3 text-blue-700">Responsabilidad de AWS (Seguridad DE la nube)</th>
                <th className="bg-emerald-50/50 p-3 text-emerald-700">Responsabilidad del Cliente (Seguridad EN la nube)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SHARED_RESPONSIBILITY_DATA.map((row) => (
                <tr key={row.category} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-800">{row.category}</td>
                  <td className="bg-blue-50/20 p-3 text-slate-600">{row.awsResponsibility}</td>
                  <td className="bg-emerald-50/20 p-3 text-slate-600">{row.customerResponsibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel de Indicadores de Seguridad */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <Lock className="h-5 w-5 text-indigo-600" />
          Métricas de Seguridad e IAM
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SECURITY_METRICS.map((metric) => (
            <SecurityCard key={metric.id} metric={metric} />
          ))}
        </div>
      </div>
    </div>
  );
};
