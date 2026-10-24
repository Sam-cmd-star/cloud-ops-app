import React, { useMemo, useState } from 'react';
import { useCloudOps } from '../context/CloudOpsContext';
import { INITIAL_SERVICES, SERVICE_CATEGORIES, CATEGORY_LABELS, FREE_TIER_ITEMS } from '../data/awsServicesData';
import { MOCK_REGIONS, regionIdFromValue } from '../data/mockInfrastructure';
import { ServiceCard } from '../components/ServiceCard';
import { ServiceModal } from '../components/ServiceModal';
import type { AWSService } from '../types/cloud';
import { Search, Filter, Layers, Globe, DollarSign, Gift } from 'lucide-react';

const FREE_TIER_BADGE = {
  always: { label: 'SIEMPRE', cls: 'bg-emerald-100 text-emerald-700' },
  trial: { label: 'PRUEBA', cls: 'bg-blue-100 text-blue-700' },
  none: { label: 'SIN COSTO', cls: 'bg-slate-100 text-slate-600' },
} as const;

export const ServicesPage: React.FC = () => {
  const { proposals, selectedRegion, costs } = useCloudOps();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [inspectedId, setInspectedId] = useState<string | null>(null);

  // Un servicio está "En uso" cuando alguna propuesta registrada lo incluye.
  const services: AWSService[] = useMemo(
    () =>
      INITIAL_SERVICES.map((s) => ({
        ...s,
        status: proposals.some((p) => p.selectedServices.includes(s.name)) ? 'En uso' : 'Disponible',
      })),
    [proposals]
  );

  const proposalsFor = (service: AWSService) => proposals.filter((p) => p.selectedServices.includes(service.name));

  const filteredServices = services.filter((srv) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = term === '' || srv.name.toLowerCase().includes(term) || srv.description.toLowerCase().includes(term);
    const matchesCategory = selectedCategory === 'All' || srv.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const inUseCount = services.filter((s) => s.status === 'En uso').length;
  const catalogTotal = INITIAL_SERVICES.reduce((acc, s) => acc + s.estimatedCost, 0);
  const totalMonthly = costs.reduce((acc, c) => acc + c.monthlyCost, 0);
  const regionId = regionIdFromValue(selectedRegion);
  const regionNode = MOCK_REGIONS.find((r) => r.id === regionId);
  const inspected = services.find((s) => s.id === inspectedId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Catálogo de Servicios AWS</h2>
        <p className="text-sm text-slate-500">
          Componentes de infraestructura disponibles en el proyecto. Se marcan "En uso" cuando una propuesta los incluye.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Servicios en uso</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">
            {inUseCount} <span className="text-base font-semibold text-slate-400">de {services.length}</span>
          </p>
          <p className="text-[11px] text-slate-500">
            {proposals.length === 0 ? 'Registra una propuesta para activarlos' : `${proposals.length} propuesta(s) registrada(s)`}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Región predeterminada</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">{regionId}</p>
          <p className="text-[11px] text-slate-500">{regionNode ? `${regionNode.azsCount} zonas de disponibilidad` : selectedRegion}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Costo mensual estimado</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">${totalMonthly.toFixed(2)}</p>
          <p className="text-[11px] text-slate-500">Suma de las propuestas y estimaciones</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            aria-label="Buscar servicio"
            placeholder="Buscar servicio (ej. EC2, S3)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 md:w-auto md:pb-0" role="group" aria-label="Filtrar por categoría">
          <Filter className="mr-1 h-4 w-4 shrink-0 text-slate-400" />
          {SERVICE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedCategory === cat ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredServices.length > 0 ? (
          filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              proposalCount={proposalsFor(service).length}
              onInspect={(s) => setInspectedId(s.id)}
            />
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No se encontraron servicios que coincidan con la búsqueda.
          </div>
        )}
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="free-tier-title">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h3 id="free-tier-title" className="text-base font-bold text-slate-800">
              AWS Free Tier (plan gratuito)
            </h3>
            <p className="text-xs text-slate-500">Recursos elegibles para pruebas o entornos de bajo uso.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {FREE_TIER_ITEMS.map((item) => {
            const badge = FREE_TIER_BADGE[item.kind];
            return (
              <div key={item.serviceId} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                <div>
                  <p className="text-sm font-bold text-slate-800">{item.service}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          Referencia orientativa según la documentación pública de AWS. Las cuentas creadas desde el 15 de julio de 2025 usan el plan
          gratuito con créditos (6 meses); las anteriores conservan los límites de 12 meses. Confirma los límites vigentes en
          aws.amazon.com/free y configura alertas de presupuesto en Billing.
        </p>
      </section>

      {inspected && (
        <ServiceModal
          service={inspected}
          regions={MOCK_REGIONS}
          proposals={proposalsFor(inspected)}
          catalogTotal={catalogTotal}
          onClose={() => setInspectedId(null)}
        />
      )}
    </div>
  );
};
