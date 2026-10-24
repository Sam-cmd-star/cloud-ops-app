import React, { useMemo, useState } from 'react';
import { useCloudOps } from '../context/CloudOpsContext';
import { GlobalMap } from '../components/GlobalMap';
import { RegionCard } from '../components/RegionCard';
import { RegionModal } from '../components/RegionModal';
import { MOCK_REGIONS, MOCK_CONNECTIONS, regionIdFromValue } from '../data/mockInfrastructure';
import type { RegionNode, RegionStatus } from '../types/infrastructure';
import { Globe2, Server, Layers, DollarSign, AlertTriangle, ArrowRight, Activity } from 'lucide-react';

export const InfrastructurePage: React.FC = () => {
  const { isFailoverActive, toggleFailover, proposals } = useCloudOps();
  const [openId, setOpenId] = useState<string | null>(null);
  // Estado que el usuario cambia a mano con "Simular mantenimiento".
  const [overrides, setOverrides] = useState<Record<string, RegionStatus>>({});

  // Estado dinámico: base + mantenimiento manual + failover (São Paulo cae y Virginia absorbe el tráfico).
  const regions: RegionNode[] = useMemo(
    () =>
      MOCK_REGIONS.map((region) => {
        let next: RegionNode = { ...region, status: overrides[region.id] ?? region.status };
        if (isFailoverActive) {
          if (region.id === 'sa-east-1') next = { ...next, status: 'down' };
          if (region.id === 'us-east-1') next = { ...next, status: 'failover', latencyMs: Number((region.latencyMs + 18).toFixed(1)) };
        }
        return next;
      }),
    [isFailoverActive, overrides]
  );

  const connections = useMemo(
    () =>
      MOCK_CONNECTIONS.map((conn) =>
        isFailoverActive && conn.toRegionId === 'sa-east-1' ? { ...conn, status: 'active_failover' as const } : conn
      ),
    [isFailoverActive]
  );

  const operational = regions.filter((r) => r.status === 'active' || r.status === 'failover').length;
  const totalAzs = regions.reduce((acc, r) => acc + r.azsCount, 0);
  const totalDeployments = regions.reduce((acc, r) => acc + r.services.length, 0);
  const totalCost = regions.reduce((acc, r) => acc + r.costMonthly, 0);

  const openRegion = regions.find((r) => r.id === openId) ?? null;
  const openProposals = openRegion
    ? proposals.filter((p) => regionIdFromValue(p.selectedRegion) === openRegion.id)
    : [];

  const toggleMaintenance = (regionId: string) => {
    const current = regions.find((r) => r.id === regionId);
    if (!current) return;
    setOverrides((prev) => ({ ...prev, [regionId]: current.status === 'maintenance' ? 'active' : 'maintenance' }));
  };

  const stats = [
    { label: 'Regiones operativas', value: `${operational} de ${regions.length}`, note: 'AWS tiene 33+ regiones; aquí se muestran las de la solución', icon: Globe2, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Zonas de disponibilidad', value: String(totalAzs), note: 'Data centers aislados con energía redundante', icon: Layers, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Servicios desplegados', value: String(totalDeployments), note: 'Suma de servicios en todas las regiones', icon: Server, tone: 'bg-purple-50 text-purple-600' },
    { label: 'Costo regional estimado', value: `$${totalCost.toFixed(2)}`, note: 'Por mes, según el catálogo de servicios', icon: DollarSign, tone: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Infraestructura Global AWS</h2>
          <p className="text-sm text-slate-500">Visualización de regiones, zonas de disponibilidad y failover.</p>
        </div>
        <button
          onClick={toggleFailover}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white transition-all ${
            isFailoverActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          {isFailoverActive ? 'Restablecer Infraestructura' : 'Simular Falla (Failover)'}
        </button>
      </div>

      {isFailoverActive && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4" role="status">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
            <Activity className="h-5 w-5 animate-pulse text-amber-600" />
            <span>Alerta de conmutación por error (Failover activado)</span>
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-amber-100 bg-white p-3 text-xs md:grid-cols-4">
            <div>
              <span className="block font-semibold text-slate-400">Región caída:</span>
              <span className="font-bold text-red-600">sa-east-1 (São Paulo)</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="hidden h-4 w-4 text-slate-400 md:block" />
              <div>
                <span className="block font-semibold text-slate-400">Salto a región destino:</span>
                <span className="font-bold text-emerald-600">us-east-1 (N. Virginia)</span>
              </div>
            </div>
            <div>
              <span className="block font-semibold text-slate-400">Impacto en latencia y costo:</span>
              <span className="font-semibold text-slate-700">+18 ms | diferencial de costo: +5%</span>
            </div>
            <div>
              <span className="block font-semibold text-slate-400">Trazabilidad de estado:</span>
              <span className="font-bold text-blue-600">Transacción segura (100% sincronizado)</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{stat.label}</span>
                <div className={`rounded-lg p-2 ${stat.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-800">{stat.value}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{stat.note}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">Mapa de Red y Resiliencia Multirregión</h3>
          <p className="text-xs text-slate-500">Haz clic en una región para ver sus servicios, zonas y costo.</p>
        </div>
        <GlobalMap regions={regions} connections={connections} selectedId={openId} onSelect={setOpenId} />
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-800">Regiones Desplegadas</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {regions.map((region) => (
            <RegionCard key={region.id} region={region} selected={region.id === openId} onSelect={setOpenId} />
          ))}
        </div>
      </div>

      {openRegion && (
        <RegionModal
          region={openRegion}
          proposals={openProposals}
          onClose={() => setOpenId(null)}
          onToggleMaintenance={toggleMaintenance}
        />
      )}
    </div>
  );
};
