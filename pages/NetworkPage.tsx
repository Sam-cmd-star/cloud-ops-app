import React, { useMemo, useState } from 'react';
import { INITIAL_SERVICES } from '../data/awsServicesData';
import {
  Globe,
  Cloud,
  Wifi,
  Network,
  Share2,
  Cpu,
  Database,
  HardDrive,
  Shield,
  Search,
  ArrowRight,
  Lock,
  Globe2,
  Server,
} from 'lucide-react';

type IconType = React.ComponentType<{ className?: string }>;
type Zone = 'edge' | 'public' | 'private';

interface Resource {
  id: string;
  name: string;
  subtitle: string;
  zone: Zone;
  icon: IconType;
  serviceId?: string; // Servicio del catálogo con el que se relaciona
  description: string;
  details: [string, string][];
}

const RESOURCES: Resource[] = [
  {
    id: 'internet',
    name: 'Internet',
    subtitle: 'Tráfico público',
    zone: 'edge',
    icon: Globe,
    description: 'Origen de las solicitudes de los usuarios. Todo el tráfico entra por el borde de AWS antes de tocar la VPC.',
    details: [['Protocolo', 'HTTPS (443)'], ['Origen', '0.0.0.0/0']],
  },
  {
    id: 'route53',
    name: 'Route 53',
    subtitle: 'DNS + Health Checks',
    zone: 'edge',
    icon: Globe2,
    serviceId: 'route53',
    description: 'Resuelve el dominio de la aplicación y dirige a los usuarios al punto de entrada sano con políticas de latencia.',
    details: [['Política', 'Basada en latencia'], ['Chequeos de salud', 'Activos']],
  },
  {
    id: 'cloudfront',
    name: 'CloudFront',
    subtitle: 'CDN + WAF',
    zone: 'edge',
    icon: Cloud,
    serviceId: 'cloudfront',
    description: 'Entrega contenido estático desde ubicaciones Edge con baja latencia y filtra ataques de capa 7 con AWS WAF y Shield.',
    details: [['Ubicaciones Edge', '450+'], ['Protección', 'AWS WAF + Shield']],
  },
  {
    id: 'igw',
    name: 'Internet Gateway',
    subtitle: 'Entrada a la VPC',
    zone: 'edge',
    icon: Wifi,
    description: 'Puerta de enlace que permite la comunicación entre la VPC y la Internet pública.',
    details: [['Adjunto a', 'VPC Principal'], ['Alta disponibilidad', 'Administrada por AWS']],
  },
  {
    id: 'vpc',
    name: 'VPC Principal',
    subtitle: '10.0.0.0/16',
    zone: 'edge',
    icon: Network,
    serviceId: 'vpc',
    description: 'Red virtual aislada donde viven todos los recursos. Se divide en subredes públicas y privadas.',
    details: [['CIDR', '10.0.0.0/16'], ['IPs disponibles', '65 536'], ['Zonas', '2 (multi-AZ)']],
  },
  {
    id: 'alb',
    name: 'Application Load Balancer',
    subtitle: 'HTTP/HTTPS · terminación TLS',
    zone: 'public',
    icon: Share2,
    serviceId: 'elb',
    description: 'Recibe el tráfico externo en la subred pública, termina TLS y lo reparte entre las instancias de la capa web.',
    details: [['Subred', 'Pública 10.0.1.0/24'], ['Puertos', '80 → 443, 443'], ['Security group', 'sg-alb']],
  },
  {
    id: 'ec2-web',
    name: 'EC2 · Web / API',
    subtitle: 'Frontend + API (Auto Scaling)',
    zone: 'public',
    icon: Cpu,
    serviceId: 'ec2',
    description: 'Instancias del grupo de Auto Scaling que sirven el frontend y exponen la API detrás del balanceador.',
    details: [['Subred', 'Pública 10.0.1.0/24'], ['Puerto', 'TCP 8080'], ['Security group', 'sg-web']],
  },
  {
    id: 'nat',
    name: 'NAT Gateway',
    subtitle: 'Salida a Internet (subred privada)',
    zone: 'public',
    icon: Server,
    serviceId: 'vpc',
    description: 'Permite que los recursos privados descarguen paquetes y llamen a APIs de AWS sin tener IP pública.',
    details: [['Subred', 'Pública 10.0.1.0/24'], ['Tráfico', 'Solo saliente'], ['Costo', '$32.40/mes (referencia)']],
  },
  {
    id: 'ec2-app',
    name: 'EC2 · App / Workers',
    subtitle: 'Lógica de negocio (solo red interna)',
    zone: 'private',
    icon: Cpu,
    serviceId: 'ec2',
    description: 'Procesa la lógica de negocio. No tiene IP pública: solo acepta tráfico del balanceador y de la capa web.',
    details: [['Subred', 'Privada 10.0.2.0/24'], ['Puerto', 'TCP 8080'], ['Security group', 'sg-app']],
  },
  {
    id: 'rds',
    name: 'RDS PostgreSQL',
    subtitle: 'Multi-AZ · solo subred privada',
    zone: 'private',
    icon: Database,
    serviceId: 'rds',
    description: 'Base de datos transaccional con réplica en otra zona. Solo es accesible desde la capa de aplicación.',
    details: [['Subred', 'Privada 10.0.2.0/24'], ['Puerto', 'TCP 5432'], ['Security group', 'sg-db']],
  },
  {
    id: 's3',
    name: 'S3 (vía endpoint VPC)',
    subtitle: 'Objetos y respaldos sin salir a Internet',
    zone: 'private',
    icon: HardDrive,
    serviceId: 's3',
    description: 'Los objetos se leen y escriben por un endpoint de gateway, así el tráfico nunca sale a Internet.',
    details: [['Tipo de endpoint', 'Gateway'], ['Cifrado', 'KMS (SSE-KMS)']],
  },
];

const FLOW_IDS = ['internet', 'route53', 'cloudfront', 'igw', 'vpc'];

interface SecurityGroupRule {
  group: string;
  direction: 'Inbound' | 'Outbound';
  port: string;
  peer: string;
  purpose: string;
  state: 'Permitido' | 'Revisión';
}

const SECURITY_GROUPS: SecurityGroupRule[] = [
  { group: 'sg-alb (ALB)', direction: 'Inbound', port: 'TCP 443 (HTTPS)', peer: '0.0.0.0/0', purpose: 'Ingreso público de clientes', state: 'Permitido' },
  { group: 'sg-alb (ALB)', direction: 'Inbound', port: 'TCP 80 (HTTP)', peer: '0.0.0.0/0', purpose: 'Redirección a HTTPS', state: 'Permitido' },
  { group: 'sg-web (Web/API)', direction: 'Inbound', port: 'TCP 8080 (API)', peer: 'sg-alb', purpose: 'Tráfico balanceado hacia la capa web', state: 'Permitido' },
  { group: 'sg-app (App)', direction: 'Inbound', port: 'TCP 8080 (API)', peer: 'sg-web', purpose: 'Llamadas internas desde la capa web', state: 'Permitido' },
  { group: 'sg-db (DB)', direction: 'Inbound', port: 'TCP 5432 (PostgreSQL)', peer: 'sg-app', purpose: 'Acceso exclusivo desde la capa de aplicación', state: 'Permitido' },
  { group: 'sg-app (App)', direction: 'Outbound', port: 'TCP 443 (HTTPS)', peer: '0.0.0.0/0 vía NAT', purpose: 'Descarga de paquetes y llamadas a la API de AWS', state: 'Permitido' },
  { group: 'sg-bastion', direction: 'Inbound', port: 'TCP 22 (SSH)', peer: '0.0.0.0/0', purpose: 'Acceso administrativo abierto a todo Internet', state: 'Revisión' },
];

const ZONE_STYLE: Record<'public' | 'private', { border: string; title: string; chip: string; chipText: string; label: string }> = {
  public: { border: 'border-emerald-200', title: 'text-emerald-700', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700', chipText: 'Acceso público', label: 'Subred pública · 10.0.1.0/24' },
  private: { border: 'border-red-200', title: 'text-red-700', chip: 'border-red-200 bg-red-50 text-red-700', chipText: 'Sin IP pública', label: 'Subred privada · 10.0.2.0/24' },
};

export const NetworkPage: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('alb');
  const [query, setQuery] = useState('');

  const byId = useMemo(() => new Map(RESOURCES.map((r) => [r.id, r])), []);
  const selected = byId.get(selectedId) ?? RESOURCES[0];
  const SelectedIcon = selected.icon;
  const selectedService = selected.serviceId ? INITIAL_SERVICES.find((s) => s.id === selected.serviceId) : undefined;

  const rules = SECURITY_GROUPS.filter((r) => {
    const q = query.trim().toLowerCase();
    return q === '' || [r.group, r.direction, r.port, r.peer, r.purpose].some((v) => v.toLowerCase().includes(q));
  });

  const resourceButton = (resource: Resource) => {
    const Icon = resource.icon;
    const active = resource.id === selectedId;
    return (
      <button
        key={resource.id}
        type="button"
        onClick={() => setSelectedId(resource.id)}
        aria-pressed={active}
        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          active ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
        }`}
      >
        <Icon className="h-5 w-5 shrink-0 text-blue-600" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-slate-800">{resource.name}</span>
          <span className="block truncate text-[11px] text-slate-500">{resource.subtitle}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Módulo 6 · Arquitectura de red</p>
        <h2 className="text-2xl font-bold text-slate-800">Arquitectura de Red y VPC</h2>
        <p className="text-sm text-slate-500">Diseño e interconexión de componentes desde Internet hasta la subred privada. Selecciona un recurso para ver su detalle.</p>
      </div>

      {/* Flujo perimetral */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="flow-title">
        <div>
          <h3 id="flow-title" className="text-base font-bold text-slate-800">Flujo de tráfico perimetral</h3>
          <p className="text-xs text-slate-500">El tráfico atraviesa DNS, CDN y la puerta de enlace antes de entrar a la VPC.</p>
        </div>
        <div className="grid grid-cols-1 items-stretch gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr]">
          {FLOW_IDS.map((id, index) => (
            <React.Fragment key={id}>
              {resourceButton(byId.get(id) as Resource)}
              {index < FLOW_IDS.length - 1 && (
                <ArrowRight className="hidden h-4 w-4 self-center text-slate-400 md:block" aria-hidden="true" />
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Segmentación */}
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2" aria-labelledby="seg-title">
          <h3 id="seg-title" className="text-base font-bold text-slate-800">Segmentación interna de la VPC</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(['public', 'private'] as const).map((zone) => {
              const style = ZONE_STYLE[zone];
              return (
                <div key={zone} className={`space-y-2 rounded-xl border p-3 ${style.border}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-bold uppercase ${style.title}`}>{style.label}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.chip}`}>{style.chipText}</span>
                  </div>
                  {RESOURCES.filter((r) => r.zone === zone).map(resourceButton)}
                </div>
              );
            })}
          </div>
          <p className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <Lock className="h-4 w-4 text-amber-500" />
            IAM: roles y políticas para EC2, RDS, S3 y CloudFront, sin claves embebidas en el código.
          </p>
        </section>

        {/* Panel del recurso seleccionado */}
        <aside className="space-y-3 self-start rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-live="polite" aria-label="Recurso seleccionado">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Recurso seleccionado</span>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5">
              <SelectedIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-800">{selected.name}</h4>
              <p className="text-xs text-slate-500">{selected.subtitle}</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">{selected.description}</p>
          <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-xs">
            <div className="flex justify-between gap-3 px-3 py-2">
              <dt className="text-slate-500">Estado</dt>
              <dd className="font-semibold text-emerald-600">● Activo</dd>
            </div>
            {selected.details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 px-3 py-2">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-semibold text-slate-800">{value}</dd>
              </div>
            ))}
            {selectedService && (
              <div className="flex justify-between gap-3 px-3 py-2">
                <dt className="text-slate-500">Costo base (catálogo)</dt>
                <dd className="font-semibold text-slate-800">${selectedService.estimatedCost.toFixed(2)}/mes</dd>
              </div>
            )}
          </dl>
          <p className="text-[11px] text-slate-500">Datos de red simulados con fines didácticos.</p>
        </aside>
      </div>

      {/* Security Groups */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="sg-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 id="sg-title" className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Shield className="h-5 w-5 text-emerald-600" />
              Reglas de Security Groups
            </h3>
            <p className="text-xs text-slate-500">Control de tráfico Inbound/Outbound por grupo de seguridad (principio de menor privilegio).</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              aria-label="Buscar reglas de security groups"
              placeholder="Buscar por SG, puerto o propósito..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="p-3">Security Group</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Puerto</th>
                <th className="p-3">Origen / Destino</th>
                <th className="p-3">Propósito</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">Ninguna regla coincide con la búsqueda.</td>
                </tr>
              )}
              {rules.map((rule) => (
                <tr key={`${rule.group}-${rule.direction}-${rule.port}-${rule.peer}`} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-800">{rule.group}</td>
                  <td className="p-3">{rule.direction}</td>
                  <td className="p-3"><code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">{rule.port}</code></td>
                  <td className="p-3 font-mono">{rule.peer}</td>
                  <td className="p-3">{rule.purpose}</td>
                  <td className="p-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${rule.state === 'Permitido' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                      {rule.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-600" />
            <h4 className="text-sm font-bold text-slate-800">Route 53 & CloudFront</h4>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Enrutamiento DNS global de alta disponibilidad combinado con entrega CDN en ubicaciones Edge para aceleración de contenido estático y protección DDoS.
          </p>
        </div>
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            <h4 className="text-sm font-bold text-slate-800">Subredes públicas vs privadas</h4>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Aislamiento estricto: los balanceadores ALB reciben tráfico externo en la subred pública, mientras que las instancias de aplicación y las bases de datos RDS residen seguras en la subred privada.
          </p>
        </div>
      </div>
    </div>
  );
};
