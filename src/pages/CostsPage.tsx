import React, { useState } from 'react';
import { useCloudOps } from '../context/CloudOpsContext';
import type { CostEstimateItem } from '../types/cloud';
import { INITIAL_SERVICES } from '../data/awsServicesData';
import { CATEGORY_TONE } from '../components/serviceIcons';
import { DollarSign, Calculator, Plus, Trash2, PieChart, Download, PiggyBank } from 'lucide-react';

const BAR_COLOR: Record<string, string> = {
  Compute: 'bg-blue-600',
  Storage: 'bg-amber-500',
  Database: 'bg-indigo-600',
  Security: 'bg-emerald-600',
  Networking: 'bg-purple-600',
  Management: 'bg-rose-500',
};

const RESERVED_SAVING = 0.18; // Ahorro típico estimado con instancias reservadas / Savings Plans
const INPUT = 'rounded-lg border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const CUSTOM = 'custom';

const money = (n: number) => `$${n.toFixed(2)}`;
const categoryOf = (serviceId: string) => INITIAL_SERVICES.find((s) => s.id === serviceId)?.category;

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export const CostsPage: React.FC = () => {
  const { costs, addCostItem, deleteCostItem, selectedRegion } = useCloudOps();
  const [newItem, setNewItem] = useState({
    serviceId: CUSTOM,
    serviceName: '',
    quantity: 1,
    hoursPerMonth: 720,
    unitCostPerHour: 0.05,
  });

  const totalMonthly = costs.reduce((acc, c) => acc + c.monthlyCost, 0);
  const totalAnnual = totalMonthly * 12;
  const potentialSaving = totalAnnual * RESERVED_SAVING;
  const sortedCosts = [...costs].sort((a, b) => b.monthlyCost - a.monthlyCost);

  const previewMonthly = newItem.quantity * newItem.hoursPerMonth * newItem.unitCostPerHour;

  const pickService = (serviceId: string) => {
    if (serviceId === CUSTOM) {
      setNewItem((prev) => ({ ...prev, serviceId: CUSTOM, serviceName: '' }));
      return;
    }
    const service = INITIAL_SERVICES.find((s) => s.id === serviceId);
    if (!service) return;
    setNewItem((prev) => ({
      ...prev,
      serviceId,
      serviceName: service.name,
      hoursPerMonth: 720,
      unitCostPerHour: Number((service.estimatedCost / 720).toFixed(4)),
    }));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItem.serviceName.trim();
    if (!name || newItem.quantity < 1 || newItem.hoursPerMonth < 1 || newItem.unitCostPerHour < 0) return;

    const monthlyCost = newItem.quantity * newItem.hoursPerMonth * newItem.unitCostPerHour;
    const item: Omit<CostEstimateItem, 'id'> = {
      serviceId: newItem.serviceId,
      serviceName: name,
      quantity: Number(newItem.quantity),
      hoursPerMonth: Number(newItem.hoursPerMonth),
      unitCostPerHour: Number(newItem.unitCostPerHour),
      monthlyCost,
      annualCost: monthlyCost * 12,
      region: selectedRegion,
    };

    addCostItem(item);
    setNewItem({ serviceId: CUSTOM, serviceName: '', quantity: 1, hoursPerMonth: 720, unitCostPerHour: 0.05 });
  };

  const exportCsv = () => {
    const header = ['Servicio', 'Región', 'Cantidad', 'Horas/Mes', 'Costo/Hora (USD)', 'Costo Mensual (USD)', 'Costo Anual (USD)'];
    const rows = sortedCosts.map((c) => [
      c.serviceName,
      (c.region ?? '').split(' ')[0],
      c.quantity,
      c.hoursPerMonth,
      c.unitCostPerHour.toFixed(4),
      c.monthlyCost.toFixed(2),
      c.annualCost.toFixed(2),
    ]);
    rows.push(['TOTAL', '', '', '', '', totalMonthly.toFixed(2), totalAnnual.toFixed(2)]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'estimacion-costos-cloudops.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Costos y Economía Cloud</h2>
          <p className="text-sm text-slate-500">Estimación y proyección de presupuestos de infraestructura en AWS.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={costs.length === 0}
          className="no-print flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Resumen Totales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl bg-amber-500 p-5 text-white shadow-sm">
          <div>
            <span className="text-xs font-semibold uppercase text-amber-100">Costo estimado mensual</span>
            <h3 className="mt-1 text-3xl font-extrabold">{money(totalMonthly)}</h3>
            <p className="text-[11px] text-amber-100">USD · {costs.length} línea(s)</p>
          </div>
          <DollarSign className="h-10 w-10 text-amber-200" />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-800 p-5 text-white shadow-sm">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-300">Costo estimado anual</span>
            <h3 className="mt-1 text-3xl font-extrabold">{money(totalAnnual)}</h3>
            <p className="text-[11px] text-slate-300">USD · proyección a 12 meses</p>
          </div>
          <Calculator className="h-10 w-10 text-slate-400" />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div>
            <span className="text-xs font-semibold uppercase text-emerald-700">Ahorro potencial (est.)</span>
            <h3 className="mt-1 text-3xl font-extrabold text-emerald-700">{money(potentialSaving)}</h3>
            <p className="text-[11px] text-emerald-700">Al año con Reserved Instances (~{Math.round(RESERVED_SAVING * 100)}%)</p>
          </div>
          <PiggyBank className="h-10 w-10 text-emerald-500" />
        </div>
      </div>

      {/* Agregar Recurso a la Estimación */}
      <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Plus className="h-4 w-4 text-blue-600" />
          Agregar componente al cálculo
        </h3>
        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label htmlFor="cost-service" className="mb-1 block font-semibold text-slate-600">Servicio del catálogo</label>
            <select id="cost-service" value={newItem.serviceId} onChange={(e) => pickService(e.target.value)} className={`${INPUT} w-full bg-white`}>
              <option value={CUSTOM}>Otro recurso (escribir nombre)</option>
              {INITIAL_SERVICES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cost-name" className="mb-1 block font-semibold text-slate-600">Nombre del recurso</label>
            <input id="cost-name" type="text" required placeholder="ej. ElastiCache Redis" value={newItem.serviceName} onChange={(e) => setNewItem({ ...newItem, serviceName: e.target.value })} className={`${INPUT} w-full`} />
          </div>
          <div>
            <label htmlFor="cost-qty" className="mb-1 block font-semibold text-slate-600">Cantidad</label>
            <input id="cost-qty" type="number" min={1} value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })} className={`${INPUT} w-full`} />
          </div>
          <div>
            <label htmlFor="cost-hours" className="mb-1 block font-semibold text-slate-600">Horas / mes</label>
            <input id="cost-hours" type="number" min={1} max={744} value={newItem.hoursPerMonth} onChange={(e) => setNewItem({ ...newItem, hoursPerMonth: Number(e.target.value) })} className={`${INPUT} w-full`} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cost-unit" className="mb-1 block font-semibold text-slate-600">Costo por hora (USD)</label>
            <input id="cost-unit" type="number" min={0} step="0.0001" value={newItem.unitCostPerHour} onChange={(e) => setNewItem({ ...newItem, unitCostPerHour: Number(e.target.value) })} className={`${INPUT} w-full`} />
          </div>
          <div className="flex items-end sm:col-span-2">
            <p className="w-full rounded-lg bg-slate-50 px-3 py-2.5 text-slate-600">
              Costo mensual: <strong className="text-slate-800">{money(previewMonthly)}</strong>
            </p>
          </div>
          <div className="flex items-end sm:col-span-2">
            <button type="submit" className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-900">
              Calcular e insertar
            </button>
          </div>
        </div>
      </form>

      {/* Distribución Porcentual del Presupuesto */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <PieChart className="h-4 w-4 text-blue-600" />
          Distribución porcentual del presupuesto
        </h3>
        {sortedCosts.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">Sin estimaciones todavía. Registra una propuesta en Planificación o agrega un componente arriba.</p>
        ) : (
          <div className="space-y-3">
            {sortedCosts.map((item) => {
              const percentage = totalMonthly > 0 ? Math.round((item.monthlyCost / totalMonthly) * 100) : 0;
              const category = categoryOf(item.serviceId);
              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700">{item.serviceName}</span>
                    <span className="font-bold text-slate-800">
                      {money(item.monthlyCost)} ({percentage}%)
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.serviceName}: ${percentage}% del presupuesto`}
                  >
                    <div className={`h-2 rounded-full transition-all duration-300 ${category ? BAR_COLOR[category] : 'bg-slate-500'}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
              {Object.keys(CATEGORY_TONE).map((cat) => (
                <span key={cat} className="inline-flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${BAR_COLOR[cat]}`} />
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabla de Detalle de Costos */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-800">Detalle de recursos estimados</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-700">
              <tr>
                <th className="p-3.5">Servicio / Recurso</th>
                <th className="p-3.5">Región</th>
                <th className="p-3.5 text-center">Cantidad</th>
                <th className="p-3.5 text-center">Horas / Mes</th>
                <th className="p-3.5 text-right">Costo / Hora</th>
                <th className="p-3.5 text-right">Costo Mensual</th>
                <th className="p-3.5 text-right">Costo Anual</th>
                <th className="no-print p-3.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCosts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">No hay estimaciones. Usa el formulario para agregar la primera.</td>
                </tr>
              )}
              {sortedCosts.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-slate-800">{item.serviceName}</td>
                  <td className="p-3.5 font-mono">{item.region ? item.region.split(' ')[0] : '—'}</td>
                  <td className="p-3.5 text-center">{item.quantity}</td>
                  <td className="p-3.5 text-center">{item.hoursPerMonth} h</td>
                  <td className="p-3.5 text-right font-mono">${item.unitCostPerHour.toFixed(4)}</td>
                  <td className="p-3.5 text-right font-mono font-bold text-slate-800">{money(item.monthlyCost)}</td>
                  <td className="p-3.5 text-right font-mono text-slate-500">{money(item.annualCost)}</td>
                  <td className="no-print p-3.5 text-center">
                    <button type="button" onClick={() => deleteCostItem(item.id)} aria-label={`Eliminar ${item.serviceName}`} className="rounded p-1 text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {sortedCosts.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-800">
                <tr>
                  <td className="p-3.5" colSpan={5}>Total</td>
                  <td className="p-3.5 text-right font-mono">{money(totalMonthly)}</td>
                  <td className="p-3.5 text-right font-mono">{money(totalAnnual)}</td>
                  <td className="no-print p-3.5" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
