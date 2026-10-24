import React, { useState } from 'react';

import { DashboardPage } from './DashboardPage';
import { PlanningPage } from './PlanningPage';
import { CostsPage } from './CostsPage';
import { InfrastructurePage } from './InfrastructurePage';
import { SecurityPage } from './SecurityPage';
import { NetworkPage } from './NetworkPage';
import { ServicesPage } from './ServicesPage';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { CloudOpsProvider, useCloudOps } from '../context/CloudOpsContext';
import '../styles/cloudops-theme.css';

const CloudOpsModuleContent: React.FC = () => {
  const { activeTab, resolvedTheme } = useCloudOps();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'planificacion':
        return <PlanningPage />;
      case 'costos':
        return <CostsPage />;
      case 'infraestructura':
        return <InfrastructurePage />;
      case 'seguridad':
        return <SecurityPage />;
      case 'arquitectura':
        return <NetworkPage />;
      case 'servicios':
        return <ServicesPage />;
      case 'dashboard':
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div data-mode={resolvedTheme} className="cloudops-root flex min-h-screen font-sans">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 space-y-6 p-4 sm:p-8">{renderActivePage()}</main>
      </div>
    </div>
  );
};

export const CloudOpsModulePage: React.FC = () => {
  return (
    <CloudOpsProvider>
      <CloudOpsModuleContent />
    </CloudOpsProvider>
  );
};

export default CloudOpsModulePage;