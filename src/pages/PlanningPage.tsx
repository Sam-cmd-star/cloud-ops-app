import React, { useMemo, useState } from 'react';
import { useCloudOps } from '../context/CloudOpsContext';
import type { ProposalInput } from '../context/CloudOpsContext';
import type { CloudProposal } from '../types/cloud';
import { INITIAL_SERVICES } from '../data/awsServicesData';
import { REGION_OPTIONS } from '../data/mockInfrastructure';
import { SLA_OPTIONS, estimateLines, getUserTier, requiresMultiAz, sumMonthly } from '../data/pricing';
import { ServiceIcon } from '../components/serviceIcons';
import {
  ClipboardList,
  PlusCircle,
  CheckCircle2,
  Server,
  Globe,
  Users,
  Target,
  Check,
  Pencil,
  Trash2,
  Save,
  X,
  AlertCircle,
  DollarSign,
  RotateCcw,
} from 'lucide-react';

const APP_TYPES = [
  { value: 'Web Application', label: 'Web Application' },
  { value: 'Mobile Backend', label: 'Mobile Backend API' },
  { value: 'Procesamiento de Datos / Analytics', label: 'Procesamiento de Datos / Analytics' },
  { value: 'Microservicios', label: 'Arquitectura Microservicios' },
];

const GOAL_SUGGESTIONS = [
  'Reducir costos de infraestructura física',
  'Mejorar la disponibilidad multi-zona',
  'Escalar según la demanda',
  'Reducir la latencia para los usuarios',
];

const INPUT = 'w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL = 'mb-1 block text-xs font-semibold text-slate-700';

interface FormState {
  solutionName: string;
  appType: string;
  selectedRegion: string;
  estimatedUsers: number | '';
  availabilityLevel: string;
  migrationGoal: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  solutionName: '',
  appType: '',
  selectedRegion: '',
  estimatedUsers: '',
  availabilityLevel: '',
  migrationGoal: '',
  description: '',
};

type FieldErrors = Partial<Record<'solutionName' | 'appType' | 'selectedRegion' | 'services' | 'estimatedUsers' | 'availabilityLevel' | 'migrationGoal', string>>;

const buildDescription = (services: string[]): string =>
  services
    .map((name) => {
      const found = INITIAL_SERVICES.find((s) => s.name === name);
      return found ? `${found.name}: ${found.description}` : name;
    })
    .join(' | ');

const money = (n: number) => `$${n.toFixed(2)}`;

export const PlanningPage: React.FC = () => {
  const { proposals, addProposal, updateProposal, deleteProposal, setActiveTab } = useCloudOps();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleService = (name: string) => {
    const next = selectedServices.includes(name) ? selectedServices.filter((s) => s !== name) : [...selectedServices, name];
    setSelectedServices(next);
    // Mientras el usuario no edite la descripción a mano, se regenera con la selección.
    if (!descriptionTouched) set('description', buildDescription(next));
  };

  const regenerateDescription = () => {
    setDescriptionTouched(false);
    set('description', buildDescription(selectedServices));
  };

  const usersNumber = typeof form.estimatedUsers === 'number' ? form.estimatedUsers : 0;
  const lines = useMemo(
    () => estimateLines(selectedServices, usersNumber || 1, form.availabilityLevel),
    [selectedServices, usersNumber, form.availabilityLevel]
  );
  const monthly = sumMonthly(lines);
  const tier = getUserTier(usersNumber || 1);
  const multiAz = requiresMultiAz(form.availabilityLevel);

  const errors: FieldErrors = {};
  if (!form.solutionName.trim()) errors.solutionName = 'Escribe el nombre de la solución.';
  if (!form.appType) errors.appType = 'Elige el tipo de aplicación.';
  if (!form.selectedRegion) errors.selectedRegion = 'Elige una región.';
  if (selectedServices.length === 0) errors.services = 'Selecciona al menos un servicio.';
  if (!usersNumber || usersNumber < 1) errors.estimatedUsers = 'Indica los usuarios estimados (mínimo 1).';
  if (!form.availabilityLevel) errors.availabilityLevel = 'Elige el SLA requerido.';
  if (!form.migrationGoal.trim()) errors.migrationGoal = 'Describe el objetivo de la migración.';
  const hasErrors = Object.keys(errors).length > 0;
  const showError = (key: keyof FieldErrors) => (submitted ? errors[key] : undefined);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedServices([]);
    setDescriptionTouched(false);
    setEditingId(null);
    setSubmitted(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;

    const payload: ProposalInput = {
      solutionName: form.solutionName.trim(),
      appType: form.appType,
      description: form.description.trim() || buildDescription(selectedServices),
      selectedRegion: form.selectedRegion,
      estimatedUsers: usersNumber,
      availabilityLevel: form.availabilityLevel,
      selectedServices,
      migrationGoal: form.migrationGoal.trim(),
    };

    if (editingId) {
      updateProposal(editingId, payload);
      setNotice(`Propuesta "${payload.solutionName}" actualizada. Sus costos se recalcularon.`);
      resetForm();
      return;
    }

    addProposal(payload);
    resetForm();
    setActiveTab('costos');
  };

  const startEdit = (prop: CloudProposal) => {
    setEditingId(prop.id);
    setNotice(null);
    setSubmitted(false);
    setSelectedServices(prop.selectedServices);
    setForm({
      solutionName: prop.solutionName,
      appType: prop.appType,
      selectedRegion: prop.selectedRegion,
      estimatedUsers: prop.estimatedUsers,
      availabilityLevel: prop.availabilityLevel,
      migrationGoal: prop.migrationGoal,
      description: prop.description,
    });
    setDescriptionTouched(prop.description !== buildDescription(prop.selectedServices));
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (prop: CloudProposal) => {
    if (!window.confirm(`¿Eliminar la propuesta "${prop.solutionName}"? También se quitarán sus costos.`)) return;
    deleteProposal(prop.id);
    if (editingId === prop.id) resetForm();
    setNotice(`Propuesta "${prop.solutionName}" eliminada.`);
  };

  const slaOptions = SLA_OPTIONS.some((o) => o.value === form.availabilityLevel) || !form.availabilityLevel
    ? SLA_OPTIONS
    : [...SLA_OPTIONS, { value: form.availabilityLevel, note: 'Valor guardado anteriormente' }];
  const slaNote = SLA_OPTIONS.find((o) => o.value === form.availabilityLevel)?.note;
  const regionLabel = REGION_OPTIONS.find((r) => r.value === form.selectedRegion)?.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Módulo 2 · Práctica integrativa</p>
        <h2 className="text-2xl font-bold text-slate-800">Planificación y Propuesta de Solución Cloud</h2>
        <p className="text-sm text-slate-500">Modela la carga, elige los servicios AWS y obtén una estimación de costo antes de registrar la propuesta.</p>
      </div>

      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {notice}
          </span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3"
          aria-label={editingId ? 'Editar propuesta' : 'Nueva propuesta'}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              {editingId ? <Pencil className="h-5 w-5 text-amber-600" /> : <PlusCircle className="h-5 w-5 text-blue-600" />}
              {editingId ? 'Editando propuesta' : 'Especificación de carga y requisitos'}
            </h3>
            {editingId && (
              <button type="button" onClick={resetForm} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
                <X className="h-3.5 w-3.5" /> Cancelar edición
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="plan-name" className={LABEL}>Nombre de la solución *</label>
              <input id="plan-name" type="text" placeholder="ej. Portal Bancario V2" value={form.solutionName} onChange={(e) => set('solutionName', e.target.value)} className={INPUT} aria-invalid={!!showError('solutionName')} />
              {showError('solutionName') && <p className="mt-1 text-[11px] text-red-600">{errors.solutionName}</p>}
            </div>
            <div>
              <label htmlFor="plan-type" className={LABEL}>Tipo de aplicación *</label>
              <select id="plan-type" value={form.appType} onChange={(e) => set('appType', e.target.value)} className={`${INPUT} bg-white`} aria-invalid={!!showError('appType')}>
                <option value="">-- Seleccione --</option>
                {APP_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {showError('appType') && <p className="mt-1 text-[11px] text-red-600">{errors.appType}</p>}
            </div>
            <div>
              <label htmlFor="plan-region" className={LABEL}>Región AWS *</label>
              <select id="plan-region" value={form.selectedRegion} onChange={(e) => set('selectedRegion', e.target.value)} className={`${INPUT} bg-white`} aria-invalid={!!showError('selectedRegion')}>
                <option value="">-- Seleccione región --</option>
                {REGION_OPTIONS.map((r) => (
                  <option key={r.id} value={r.value}>{r.label}</option>
                ))}
              </select>
              {showError('selectedRegion') && <p className="mt-1 text-[11px] text-red-600">{errors.selectedRegion}</p>}
            </div>
            <div>
              <label htmlFor="plan-sla" className={LABEL}>Disponibilidad (SLA) requerida *</label>
              <select id="plan-sla" value={form.availabilityLevel} onChange={(e) => set('availabilityLevel', e.target.value)} className={`${INPUT} bg-white`} aria-invalid={!!showError('availabilityLevel')}>
                <option value="">-- Seleccione SLA --</option>
                {slaOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.value}</option>
                ))}
              </select>
              {slaNote && <p className="mt-1 text-[11px] text-slate-500">{slaNote}</p>}
              {showError('availabilityLevel') && <p className="mt-1 text-[11px] text-red-600">{errors.availabilityLevel}</p>}
            </div>
            <div>
              <label htmlFor="plan-users" className={LABEL}>Usuarios estimados *</label>
              <input id="plan-users" type="number" min={1} placeholder="ej. 5000" value={form.estimatedUsers} onChange={(e) => set('estimatedUsers', e.target.value ? Number(e.target.value) : '')} className={INPUT} aria-invalid={!!showError('estimatedUsers')} />
              {usersNumber > 0 && <p className="mt-1 text-[11px] text-slate-500">Tramo de capacidad: {tier.label} (x{tier.multiplier})</p>}
              {showError('estimatedUsers') && <p className="mt-1 text-[11px] text-red-600">{errors.estimatedUsers}</p>}
            </div>
          </div>

          <fieldset>
            <legend className={LABEL}>Servicios AWS incluidos * <span className="font-normal text-slate-500">({selectedServices.length} de {INITIAL_SERVICES.length})</span></legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INITIAL_SERVICES.map((srv) => {
                const checked = selectedServices.includes(srv.name);
                return (
                  <button
                    type="button"
                    key={srv.id}
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleService(srv.name)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      checked ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    {checked ? <Check className="h-4 w-4 shrink-0" /> : <ServiceIcon serviceId={srv.id} category={srv.category} className="h-4 w-4 shrink-0" />}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{srv.name.replace(/^(Amazon|AWS) /, '')}</span>
                      <span className={`block text-[10px] ${checked ? 'text-blue-100' : 'text-slate-500'}`}>
                        {srv.estimatedCost === 0 ? 'Sin costo' : `desde ${money(srv.estimatedCost)}/mes`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {showError('services') && <p className="mt-1 text-[11px] text-red-600">{errors.services}</p>}
          </fieldset>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="plan-desc" className="text-xs font-semibold text-slate-700">Descripción técnica</label>
              {descriptionTouched && (
                <button type="button" onClick={regenerateDescription} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline">
                  <RotateCcw className="h-3 w-3" /> Regenerar desde los servicios
                </button>
              )}
            </div>
            <textarea
              id="plan-desc"
              rows={3}
              value={form.description}
              placeholder="Se completa sola al elegir servicios; puedes editarla."
              onChange={(e) => {
                setDescriptionTouched(true);
                set('description', e.target.value);
              }}
              className={`${INPUT} text-xs`}
            />
          </div>

          <div>
            <label htmlFor="plan-goal" className={LABEL}>Objetivo de la migración *</label>
            <textarea id="plan-goal" rows={2} placeholder="ej. Reducir costos de infraestructura física y mejorar la disponibilidad multi-zona." value={form.migrationGoal} onChange={(e) => set('migrationGoal', e.target.value)} className={INPUT} aria-invalid={!!showError('migrationGoal')} />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {GOAL_SUGGESTIONS.map((g) => (
                <button key={g} type="button" onClick={() => set('migrationGoal', g)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700">
                  {g}
                </button>
              ))}
            </div>
            {showError('migrationGoal') && <p className="mt-1 text-[11px] text-red-600">{errors.migrationGoal}</p>}
          </div>

          {submitted && hasErrors && (
            <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Faltan {Object.keys(errors).length} campo(s) obligatorio(s). Revísalos y vuelve a guardar.
            </p>
          )}

          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700">
            <Save className="h-4 w-4" />
            {editingId ? 'Guardar cambios' : 'Guardar y calcular arquitectura'}
          </button>
        </form>

        {/* Vista previa en vivo */}
        <aside className="space-y-4 self-start rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-4 lg:col-span-2" aria-label="Vista previa de la propuesta">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Vista previa{regionLabel ? ` · ${regionLabel}` : ''}</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">En vivo</span>
          </div>
          <h3 className="truncate text-xl font-bold text-slate-800">{form.solutionName.trim() || 'Nueva solución cloud'}</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Costo estimado</span>
              <p className="mt-1 text-xl font-extrabold text-amber-600">{money(monthly)}<span className="text-xs font-semibold">/mes</span></p>
              <p className="text-[11px] text-slate-500">{money(monthly * 12)} al año</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <span className="text-[10px] font-semibold uppercase text-slate-500">SLA garantizado</span>
              <p className="mt-1 flex items-center gap-1 text-xl font-extrabold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {form.availabilityLevel || '—'}
              </p>
              <p className="text-[11px] text-slate-500">{multiAz ? 'Multi-AZ aplicado' : 'Una zona de disponibilidad'}</p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Desglose mensual</h4>
            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">Selecciona servicios para ver el desglose del costo.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-xs">
                {lines.map((l) => (
                  <li key={l.serviceId} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-slate-700">
                      <Server className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{l.serviceName}</span>
                      {l.multiplier > 1 && <span className="shrink-0 rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-600">x{l.multiplier}</span>}
                    </span>
                    <span className="font-mono font-semibold text-slate-800">{money(l.monthly)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Estimación referencial: precios del catálogo × tramo de usuarios ({tier.label}){multiAz ? ' × 2 en servicios Multi-AZ' : ''}. Se recalcula con cada cambio del formulario y se guarda al registrar la propuesta.
          </p>
        </aside>
      </div>

      {/* Propuestas registradas */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <ClipboardList className="h-5 w-5 text-slate-700" />
          Propuestas almacenadas ({proposals.length})
        </h3>

        {proposals.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
            No hay propuestas registradas. Usa el formulario para añadir la primera.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {proposals.map((prop) => {
              const cost = prop.estimatedMonthlyCost ?? sumMonthly(estimateLines(prop.selectedServices, prop.estimatedUsers, prop.availabilityLevel));
              const isEditing = editingId === prop.id;
              return (
                <article key={prop.id} className={`space-y-3 rounded-xl border bg-white p-5 shadow-sm ${isEditing ? 'border-amber-400 ring-2 ring-amber-300/40' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">{prop.appType}</span>
                      <h4 className="mt-1 truncate text-lg font-bold text-slate-800">{prop.solutionName}</h4>
                      <span className="font-mono text-[11px] text-slate-400">{prop.createdAt}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => startEdit(prop)} aria-label={`Editar ${prop.solutionName}`} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(prop)} aria-label={`Eliminar ${prop.solutionName}`} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="line-clamp-3 text-xs text-slate-600">{prop.description}</p>

                  {prop.migrationGoal && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200/60 bg-amber-50 p-2.5 text-xs text-amber-900">
                      <Target className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div><strong>Objetivo:</strong> {prop.migrationGoal}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-4">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Globe className="h-4 w-4 shrink-0 text-blue-500" />
                      <span className="truncate">{prop.selectedRegion.split(' ')[0]}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Users className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{prop.estimatedUsers.toLocaleString('es-PE')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-purple-500" />
                      <span>SLA {prop.availabilityLevel}</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-slate-800">
                      <DollarSign className="h-4 w-4 shrink-0 text-amber-500" />
                      <span>{cost.toFixed(2)}/mes</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {prop.selectedServices.map((srv) => (
                      <span key={srv} className="flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        <Server className="h-3 w-3 text-slate-400" />
                        {srv}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
