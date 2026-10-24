import React from 'react';
import { Globe, ArrowRight, Shield, Server, Database, Lock, Cloud, Cpu, Network } from 'lucide-react';

export const NetworkDiagram: React.FC = () => {
  return (
    <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6 overflow-x-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-base text-slate-100">Arquitectura de Red AWS VPC (Interactiva)</h3>
        </div>
        <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full font-mono">
          VPC CIDR: 10.0.0.0/16
        </span>
      </div>

      {/* Flujo de Trafico Exterior */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Step 1: Internet Users */}
        <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-lg">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-200">Tráfico Externo</h4>
            <p className="text-xs text-slate-400">Usuarios / Clientes Web</p>
          </div>
        </div>

        {/* Step 2: Route 53 DNS */}
        <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-purple-600/20 text-purple-400 rounded-lg">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-200">Route 53</h4>
            <p className="text-xs text-slate-400">DNS & Failover Global</p>
          </div>
        </div>

        {/* Step 3: CloudFront CDN */}
        <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-amber-600/20 text-amber-400 rounded-lg">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-200">CloudFront CDN</h4>
            <p className="text-xs text-slate-400">Edge Locations + SSL/TLS</p>
          </div>
        </div>
      </div>

      {/* Indicador de entrada a VPC */}
      <div className="flex justify-center my-2">
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-1.5 rounded-full text-xs text-slate-300 border border-slate-700">
          <span>Internet Gateway (IGW)</span>
          <ArrowRight className="w-4 h-4 text-blue-400" />
        </div>
      </div>

      {/* VPC Container */}
      <div className="bg-slate-950/70 border-2 border-dashed border-blue-500/40 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
            <h4 className="font-bold text-sm text-blue-300 tracking-wide uppercase">Amazon VPC (us-east-1)</h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">2 Subredes / Multi-AZ</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subnet Pública */}
          <div className="bg-slate-900/90 border border-emerald-500/30 p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-emerald-400 uppercase">Subred Pública (10.0.1.0/24)</span>
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700 flex items-center gap-3">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <div>
                <h5 className="text-xs font-bold text-slate-200">Application Load Balancer (ALB)</h5>
                <p className="text-[11px] text-slate-400">Balanceo de carga HTTP/HTTPS</p>
              </div>
            </div>
          </div>

          {/* Subnet Privada */}
          <div className="bg-slate-900/90 border border-indigo-500/30 p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-indigo-400 uppercase">Subred Privada (10.0.2.0/24)</span>
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
            </div>

            <div className="space-y-2">
              <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700 flex items-center gap-3">
                <Server className="w-5 h-5 text-blue-400" />
                <div>
                  <h5 className="text-xs font-bold text-slate-200">EC2 Cluster (Auto Scaling)</h5>
                  <p className="text-[11px] text-slate-400">Instancias Node.js / React Backend</p>
                </div>
              </div>

              <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700 flex items-center gap-3">
                <Database className="w-5 h-5 text-indigo-400" />
                <div>
                  <h5 className="text-xs font-bold text-slate-200">Amazon RDS Multi-AZ</h5>
                  <p className="text-[11px] text-slate-400">Base de datos PostgreSQL Principal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};