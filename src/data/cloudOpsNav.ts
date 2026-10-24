import {
  LayoutDashboard,
  ClipboardList,
  DollarSign,
  Server,
  ShieldCheck,
  Network,
  Cloud,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const CLOUDOPS_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'planificacion', label: 'Planificación', icon: ClipboardList },
  { id: 'costos', label: 'Costos', icon: DollarSign },
  { id: 'infraestructura', label: 'Infraestructura', icon: Server },
  { id: 'seguridad', label: 'Seguridad', icon: ShieldCheck },
  { id: 'arquitectura', label: 'Arquitectura Red', icon: Network },
  { id: 'servicios', label: 'Servicios AWS', icon: Cloud },
];

export const CLOUDOPS_EXIT_PATH = '/dashboard/proyectos';
