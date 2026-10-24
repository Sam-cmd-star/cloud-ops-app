import React from 'react';
import { INITIAL_SERVICES, SECURITY_METRICS, getSecuritySummary } from '../data/awsServicesData';
import { REGION_OPTIONS } from '../data/mockInfrastructure';
import { useCloudOps } from '../context/CloudOpsContext';
import { StatCard } from '../components/StatCard';
import { SecurityCard } from '../components/SecurityCard';
import { Sparkline } from '../components/Sparkline';
import {
  Server,
  DollarSign,
  ShieldCheck,
  Globe,
  TrendingUp,
  RotateCcw,
  Printer,
  Activity,
  ScrollText,
  ArrowRight,
} from 'lucide-react';

const BAR_COLORS = ['bg-blue-600', 'bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500'];

const LEVEL_STYLES: Record<'INFO' | 'WARN' | 'ERROR', string> = {
  INFO: 'bg-blue-500',
  WARN: 'bg-amber-500',
  ERROR: 'bg-red-600',
};

export const DashboardPage: React.FC = () => {
  const {
    costs,
    proposals,
    clearDashboard,
    selectedRegion,
    setSelectedRegion,
    setActiveTab,
    liveMetrics,
    isLive,
    logs,
  } = useCloudOps();

  // Filtramos las propuestas y costos que coinciden estrictamente con la región seleccionada
  const regionProposals = proposals.filter((p) => p.selectedRegion === selectedRegion);
  const currentProposal = regionProposals[0]; // Propuesta activa para esta región

  const regionCosts = costs.filter((c) => c.region === selectedRegion || !c.region);
  const sortedCosts = [...regionCosts].sort((a, b) => b.monthlyCost - a.monthlyCost);
  const totalMonthlyCost = regionCosts.reduce((acc, item) => acc + item.monthlyCost, 0);

  const activeServicesCount = currentProposal ? currentProposal.selectedServices.length : 0;
  const security = getSecuritySummary();

  // Costo acumulado hoy: prorrateo del costo mensual según la hora del día.
  const clock = new Date(liveMetrics.updatedAt);
  const secondsToday = clock.getHours() * 3600 + clock.getMinutes() * 60 + clock.getSeconds();
  const costToday = (totalMonthlyCost / 30) * (secondsToday / 86400);

  const handleClear = () => {
    if (window.confirm('¿Borrar propuestas, costos y métricas guardadas en este navegador?')) {
      clearDashboard();
    }
  };

  const miniStats = [
    {
      label: 'CPU promedio',
      value: `${Math.round(liveMetrics.cpu)}%`,
      tone: liveMetrics.cpu > 80 ? 'text-red-600' : 'text-slate-800',
    },
    {
      label: 'Latencia',
      value: `${liveMetrics.latencyMs} ms`,
      tone: liveMetrics.latencyMs > 150 ? 'text-red-600' : 'text-slate-800',
    },
    { label: 'Costo hoy', value: `$${costToday.toFixed(2)}`, tone: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 sm:text-[28px]">Dashboard de Control Cloud</h2>
          <p className="text-sm text-slate-500">Resumen general de la arquitectura y estado de la solución AWS.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Región Global Sincronizado */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
            <Globe className="h-4 w-4 text-blue-600" />
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="cursor-pointer bg-transparent font-semibold text-slate-700 focus:outline-none"
            >
              {REGION_OPTIONS.map((r) => (
                <option key={r.id} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Limpiar Datos
          </button>

          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
          >
            <Printer className="h-4 w-4" />
            Reporte PDF
          </button>
        </div>
      </div>

      {/* Indicadores Principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Servicios Activos"
          value={`${activeServicesCount} / ${INITIAL_SERVICES.length}`}
          subtitle={currentProposal ? currentProposal.solutionName : 'Sin propuesta en esta región'}
          icon={Server}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-600"
        />
        <StatCard
          title="Región Principal"
          value={selectedRegion.split(' ')[0]}
          subtitle={selectedRegion}
          icon={Globe}
          iconBgColor="bg-indigo-50"
          iconTextColor="text-indigo-600"
        />
        <StatCard
          title="Costo Est. Mensual"
          value={`$${totalMonthlyCost.toFixed(2)}`}
          subtitle={`Anual: $${(totalMonthlyCost * 12).toFixed(2)}`}
          icon={DollarSign}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
        />
        <StatCard
          title="Estado Seguridad"
          value={`${security.score}/100`}
          subtitle={`${security.approved} de ${security.total} controles aprobados`}
          icon={ShieldCheck}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
        />
      </div>

      {/* Costos y seguridad */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Distribución de Costos por Servicio ({selectedRegion.split(' ')[0]})
            </h3>
            <span className="font-mono text-xs text-slate-400">USD / Mes</span>
          </div>

          <div className="space-y-4 pt-2">
            {sortedCosts.length === 0 ? (
              <p className="py-6 text-center text-xs italic text-slate-400">
                No hay costos registrados para esta región.
              </p>
            ) : (
              sortedCosts.map((item, index) => {
                const percentage = totalMonthlyCost > 0 ? Math.round((item.monthlyCost / totalMonthlyCost) * 100) : 0;
                const color = BAR_COLORS[index % BAR_COLORS.length];
                return (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs font-medium">
                      <span className="flex min-w-0 items-center gap-2 text-slate-700">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
                        <span className="truncate">{item.serviceName}</span>
                      </span>
                      <span className="shrink-0 font-bold text-slate-800">
                        ${item.monthlyCost.toFixed(2)} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-700 ${color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Alertas y Seguridad</h3>
            <button
              onClick={() => setActiveTab('seguridad')}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
            >
              Ver detalle
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {SECURITY_METRICS.slice(0, 2).map((metric) => (
            <SecurityCard key={metric.id} metric={metric} />
          ))}
        </div>
      </div>

      {/* Monitoreo en vivo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Activity className="h-5 w-5 text-blue-600" />
              Rendimiento en tiempo real
            </h3>
            <span className="text-xs text-slate-400">
              {isLive ? 'Actualiza cada 3 s' : 'Monitoreo en pausa'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {miniStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.tone}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <p className="text-xs font-medium text-slate-500">Peticiones por minuto</p>
              <p className="text-sm font-bold text-slate-800">{liveMetrics.requests.toLocaleString('es-PE')}</p>
            </div>
            <Sparkline data={liveMetrics.series.map((p) => p.requests)} />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <ScrollText className="h-5 w-5 text-blue-600" />
            Actividad reciente
          </h3>
          {logs.length === 0 ? (
            <p className="py-6 text-center text-xs italic text-slate-400">
              {isLive ? 'Esperando eventos…' : 'Monitoreo en pausa.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {logs.slice(0, 6).map((log) => (
                <li key={log.id} className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${LEVEL_STYLES[log.level]}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">
                      {log.service}
                      <span className="ml-2 font-mono font-normal text-slate-400">{log.timestamp}</span>
                    </p>
                    <p className="text-xs text-slate-500">{log.event}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
