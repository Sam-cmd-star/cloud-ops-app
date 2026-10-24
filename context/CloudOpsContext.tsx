import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { CostEstimateItem, CloudProposal } from '../types/cloud';
import { estimateLines, sumMonthly } from '../data/pricing';

export type ProposalInput = Omit<CloudProposal, 'id' | 'createdAt' | 'estimatedMonthlyCost'>;

type CostItem = CostEstimateItem & { region?: string };

// Una línea de costo por cada servicio de la propuesta, con el precio del catálogo.
const buildProposalCosts = (proposal: ProposalInput, proposalId: string): { items: CostItem[]; total: number } => {
  const lines = estimateLines(proposal.selectedServices, proposal.estimatedUsers, proposal.availabilityLevel);
  const stamp = Date.now();
  const items = lines.map((line, index) => ({
    id: `c-${stamp}-${index}`,
    serviceId: line.serviceId,
    serviceName: `${line.serviceName} (${proposal.solutionName})`,
    quantity: line.multiplier,
    hoursPerMonth: 720,
    unitCostPerHour: line.baseMonthly / 720,
    monthlyCost: line.monthly,
    annualCost: line.monthly * 12,
    region: proposal.selectedRegion,
    proposalId,
  }));
  return { items, total: sumMonthly(lines) };
};

export interface InstanceEC2 {
  id: string;
  name: string;
  type: string;
  region: string;
  status: 'running' | 'stopped' | 'pending';
  ipPublica: string;
  cpuUsage: number;
}

export interface MetricSummary {
  cpuGlobal: number;
  ramUsage: number;
  activeInstances: number;
  totalVpcs: number;
  monthlyCostEstimate: number;
}

export interface CloudOpsLog {
  id: string;
  timestamp: string;
  service: string;
  event: string;
  level: 'INFO' | 'WARN' | 'ERROR';
}

// ---- Métricas en vivo (simuladas, sin base de datos) ----
export interface LivePoint {
  time: string;
  cpu: number;
  requests: number;
  latency: number;
}

export interface LiveMetrics {
  cpu: number;
  requests: number;
  latencyMs: number;
  updatedAt: number;
  series: LivePoint[];
}

// ---- Tema (Sistema / Claro / Oscuro) ----
export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const THEME_KEY = 'cloudops_theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const loadTheme = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // localStorage bloqueado: se usa el tema del sistema.
  }
  return 'system';
};

const systemPrefersDark = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;

const LIVE_KEY = 'cloudops_live';
const LIVE_INTERVAL_MS = 3000;
const MAX_POINTS = 24;
const MAX_LOGS = 8;

const createInitialLive = (): LiveMetrics => ({
  cpu: 42,
  requests: 1200,
  latencyMs: 85,
  updatedAt: Date.now(),
  series: [],
});

const loadLive = (): LiveMetrics => {
  try {
    const raw = localStorage.getItem(LIVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LiveMetrics;
      if (typeof parsed.cpu === 'number' && Array.isArray(parsed.series)) {
        return { ...parsed, updatedAt: Date.now() };
      }
    }
  } catch {
    // Datos corruptos en localStorage: se reinician las métricas.
  }
  return createInitialLive();
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const drift = (v: number, step: number, min: number, max: number) =>
  clamp(v + (Math.random() - 0.5) * step, min, max);

const formatClock = (ts: number) =>
  new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const EVENT_POOL: Omit<CloudOpsLog, 'id' | 'timestamp'>[] = [
  { service: 'EC2', event: 'Auto Scaling evaluó la capacidad del grupo', level: 'INFO' },
  { service: 'RDS', event: 'Copia de seguridad automática completada', level: 'INFO' },
  { service: 'CloudFront', event: 'Invalidación de caché finalizada', level: 'INFO' },
  { service: 'S3', event: 'Replicación entre regiones sincronizada', level: 'INFO' },
  { service: 'Route 53', event: 'Chequeo de salud del dominio: correcto', level: 'INFO' },
  { service: 'IAM', event: 'Rol con acceso amplio detectado para auditoría', level: 'WARN' },
];

const buildLogEntry = (now: number, cpu: number): CloudOpsLog | null => {
  const base = { id: `log-${now}`, timestamp: formatClock(now) };
  if (cpu > 80) {
    return { ...base, service: 'EC2', event: `CPU alta (${Math.round(cpu)}%) en el grupo de instancias`, level: 'WARN' };
  }
  if (Math.random() < 0.45) {
    const picked = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
    return { ...base, ...picked };
  }
  return null;
};

interface CloudOpsContextType {
  costs: (CostEstimateItem & { region?: string })[];
  proposals: CloudProposal[];
  isFailoverActive: boolean;
  activeTab: string;
  selectedRegion: string;
  setActiveTab: (tab: string) => void;
  setSelectedRegion: (region: string) => void;
  addCostItem: (item: Omit<CostEstimateItem, 'id'> & { region?: string }) => void;
  deleteCostItem: (id: string) => void;
  addProposal: (proposal: ProposalInput) => void;
  updateProposal: (id: string, proposal: ProposalInput) => void;
  deleteProposal: (id: string) => void;
  clearDashboard: () => void;
  toggleFailover: () => void;
  metrics: MetricSummary;
  instances: InstanceEC2[];
  setInstances: React.Dispatch<React.SetStateAction<InstanceEC2[]>>;
  logs: CloudOpsLog[];
  toggleInstanceStatus: (id: string) => void;
  liveMetrics: LiveMetrics;
  isLive: boolean;
  toggleLive: () => void;
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
}

const CloudOpsContext = createContext<CloudOpsContextType | undefined>(undefined);

export const CloudOpsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [costs, setCosts] = useState<(CostEstimateItem & { region?: string })[]>(() => {
    const saved = localStorage.getItem('cloudops_costs');
    return saved ? JSON.parse(saved) : [];
  });

  const [proposals, setProposals] = useState<CloudProposal[]>(() => {
    const saved = localStorage.getItem('cloudops_proposals');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedRegion, setSelectedRegion] = useState<string>('us-east-1 (Norte de Virginia)');
  const [isFailoverActive, setIsFailoverActive] = useState<boolean>(false);

  const [metrics] = useState<MetricSummary>({
    cpuGlobal: 0,
    ramUsage: 0,
    activeInstances: 0,
    totalVpcs: 0,
    monthlyCostEstimate: 0,
  });

  const [instances, setInstances] = useState<InstanceEC2[]>([]);
  const [logs, setLogs] = useState<CloudOpsLog[]>([]);

  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>(loadLive);
  const [isLive, setIsLive] = useState<boolean>(true);
  const liveRef = useRef<LiveMetrics>(liveMetrics);

  const [theme, setThemeState] = useState<ThemeMode>(loadTheme);
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);
  const resolvedTheme: ResolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  // Si el usuario cambia el tema del sistema operativo, el módulo lo sigue al instante.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      // Sin persistencia: la preferencia vale solo para esta sesión.
    }
  };

  useEffect(() => {
    localStorage.setItem('cloudops_costs', JSON.stringify(costs));
  }, [costs]);

  useEffect(() => {
    localStorage.setItem('cloudops_proposals', JSON.stringify(proposals));
  }, [proposals]);

  useEffect(() => {
    liveRef.current = liveMetrics;
    try {
      localStorage.setItem(LIVE_KEY, JSON.stringify(liveMetrics));
    } catch {
      // Sin espacio o storage bloqueado: la simulación sigue en memoria.
    }
  }, [liveMetrics]);

  // Motor de simulación: cada 3 s genera una nueva lectura y, a veces, un evento.
  useEffect(() => {
    if (!isLive) return;
    const id = window.setInterval(() => {
      const prev = liveRef.current;
      const now = Date.now();
      const cpu = drift(prev.cpu, 12, 15, 92);
      const requests = Math.round(drift(prev.requests, 360, 400, 3200));
      const latencyMs = Math.round(drift(prev.latencyMs, 24, 35, 240));

      const next: LiveMetrics = {
        cpu,
        requests,
        latencyMs,
        updatedAt: now,
        series: [
          ...prev.series,
          { time: formatClock(now), cpu: Math.round(cpu), requests, latency: latencyMs },
        ].slice(-MAX_POINTS),
      };
      liveRef.current = next;
      setLiveMetrics(next);

      const entry = buildLogEntry(now, cpu);
      if (entry) setLogs((p) => [entry, ...p].slice(0, MAX_LOGS));
    }, LIVE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [isLive]);

  const addCostItem = (itemData: Omit<CostEstimateItem, 'id'> & { region?: string }) => {
    const newItem = {
      ...itemData,
      id: `c-${Date.now()}`,
    };
    setCosts((prev) => [...prev, newItem]);
  };

  const deleteCostItem = (id: string) => {
    setCosts((prev) => prev.filter((c) => c.id !== id));
  };

  const addProposal = (proposalData: ProposalInput) => {
    const id = `prop-${Date.now()}`;
    const { items, total } = buildProposalCosts(proposalData, id);
    const newProp: CloudProposal = {
      ...proposalData,
      id,
      createdAt: new Date().toISOString().split('T')[0],
      estimatedMonthlyCost: total,
    };
    setProposals((prev) => [newProp, ...prev]);
    setCosts((prev) => [...prev, ...items]);

    if (proposalData.selectedRegion) {
      setSelectedRegion(proposalData.selectedRegion);
    }
  };

  // Al editar una propuesta se recalculan sus líneas de costo (las demás no se tocan).
  const updateProposal = (id: string, proposalData: ProposalInput) => {
    const { items, total } = buildProposalCosts(proposalData, id);
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...proposalData, estimatedMonthlyCost: total } : p))
    );
    setCosts((prev) => [...prev.filter((c) => c.proposalId !== id), ...items]);
    if (proposalData.selectedRegion) {
      setSelectedRegion(proposalData.selectedRegion);
    }
  };

  const deleteProposal = (id: string) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
    setCosts((prev) => prev.filter((c) => c.proposalId !== id));
  };

  const clearDashboard = () => {
    setCosts([]);
    setProposals([]);
    setIsFailoverActive(false);
    setSelectedRegion('us-east-1 (Norte de Virginia)');
    setLogs([]);
    setLiveMetrics(createInitialLive());
    localStorage.removeItem('cloudops_costs');
    localStorage.removeItem('cloudops_proposals');
    localStorage.removeItem(LIVE_KEY);
  };

  const toggleFailover = () => {
    setIsFailoverActive((prev) => !prev);
  };

  const toggleLive = () => {
    setIsLive((prev) => !prev);
  };

  const toggleInstanceStatus = (id: string) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id === id) {
          const nextStatus = inst.status === 'running' ? 'stopped' : 'running';
          return {
            ...inst,
            status: nextStatus,
            cpuUsage: nextStatus === 'running' ? 25 : 0,
          };
        }
        return inst;
      })
    );
  };

  return (
    <CloudOpsContext.Provider
      value={{
        costs,
        proposals,
        isFailoverActive,
        activeTab,
        selectedRegion,
        setActiveTab,
        setSelectedRegion,
        addCostItem,
        deleteCostItem,
        addProposal,
        updateProposal,
        deleteProposal,
        clearDashboard,
        toggleFailover,
        metrics,
        instances,
        setInstances,
        logs,
        toggleInstanceStatus,
        liveMetrics,
        isLive,
        toggleLive,
        theme,
        resolvedTheme,
        setTheme,
      }}
    >
      {children}
    </CloudOpsContext.Provider>
  );
};

export const useCloudOps = () => {
  const context = useContext(CloudOpsContext);
  if (!context) {
    throw new Error('useCloudOps debe ser usado dentro de un CloudOpsProvider');
  }
  return context;
};
