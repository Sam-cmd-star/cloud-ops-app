import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Cloud, LogOut, X } from 'lucide-react';
import { CLOUDOPS_NAV, CLOUDOPS_EXIT_PATH } from '../data/cloudOpsNav';
import { useCloudOps } from '../context/CloudOpsContext';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface SidebarBodyProps {
  collapsed: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}

const SidebarBody: React.FC<SidebarBodyProps> = ({ collapsed, onNavigate, onClose }) => {
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useCloudOps();

  return (
    <>
      <div className="flex min-h-[72px] items-center gap-3 border-b border-slate-800 px-4">
        <div className={`shrink-0 rounded-xl bg-blue-600/20 p-2 text-blue-400 ${collapsed ? 'mx-auto' : ''}`}>
          <Cloud className="h-6 w-6" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold leading-tight text-white">CloudOps Dashboard</h2>
            <p className="truncate text-[11px] text-slate-400">AWS Cloud Solutions</p>
          </div>
        )}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded-lg bg-slate-800 p-1.5 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegación de CloudOps">
        {CLOUDOPS_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                setActiveTab(item.id);
                onNavigate?.();
              }}
              className={`relative flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all ${
                collapsed ? 'justify-center px-0' : 'px-3.5'
              } ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Única salida del módulo (antes estaba repetida en el header) */}
      <div className="border-t border-slate-800/80 p-3">
        <button
          onClick={() => navigate(CLOUDOPS_EXIT_PATH)}
          title={collapsed ? 'Salir al panel principal' : undefined}
          className={`flex w-full items-center gap-2.5 rounded-xl py-2.5 text-xs font-semibold text-slate-400 transition-all hover:bg-slate-800 hover:text-white ${
            collapsed ? 'justify-center px-0' : 'px-3.5'
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Salir al panel principal</span>}
        </button>
      </div>
    </>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  return (
    <>
      {/* Escritorio */}
      <aside
        className={`no-print sticky top-0 z-20 hidden h-screen shrink-0 flex-col border-r border-slate-800 bg-[#0f172a] text-slate-300 transition-all duration-300 md:flex ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarBody collapsed={collapsed} />
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          className="absolute -right-3 top-6 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 shadow-md transition-colors hover:bg-slate-700 hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Móvil: panel deslizable con fondo oscuro */}
      <div className={`no-print fixed inset-0 z-40 md:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}>
        <div
          onClick={onCloseMobile}
          className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-300 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-72 flex-col bg-[#0f172a] text-slate-300 shadow-xl transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarBody collapsed={false} onNavigate={onCloseMobile} onClose={onCloseMobile} />
        </aside>
      </div>
    </>
  );
};
