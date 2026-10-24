import React from 'react';
import type { ConnectionLink, RegionNode } from '../types/infrastructure';
import { GRATICULE_PATH, MAP_HEIGHT, MAP_WIDTH, WORLD_LAND_PATH, projectPoint } from '../data/worldMap';
import { STATUS_LABEL } from '../data/mockInfrastructure';
import { STATUS_COLOR } from './regionStatus';

interface GlobalMapProps {
  regions: RegionNode[];
  connections: ConnectionLink[];
  selectedId?: string | null;
  onSelect: (regionId: string) => void;
}

type Point = [number, number];

// Línea curva entre dos puntos: sube en el centro para que se lea como una ruta aérea.
const arcPath = ([x1, y1]: Point, [x2, y2]: Point): string => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const lift = Math.min(90, Math.hypot(x2 - x1, y2 - y1) * 0.28);
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${(my - lift).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
};

const HALO: React.CSSProperties = {
  paintOrder: 'stroke',
  stroke: '#0b1220',
  strokeWidth: 3.5,
  strokeLinejoin: 'round',
};

// Posición de la etiqueta según el lado elegido para cada región (evita que se pisen entre sí).
const labelLayout = (side: RegionNode['labelSide']) => {
  switch (side) {
    case 'top':
      return { anchor: 'middle' as const, x: 0, nameY: -26, codeY: -13 };
    case 'left':
      return { anchor: 'end' as const, x: -16, nameY: -1, codeY: 12 };
    case 'right':
      return { anchor: 'start' as const, x: 16, nameY: -1, codeY: 12 };
    default:
      return { anchor: 'middle' as const, x: 0, nameY: 25, codeY: 38 };
  }
};

const LEGEND: { status: keyof typeof STATUS_COLOR; label: string }[] = [
  { status: 'active', label: 'Operacional' },
  { status: 'degraded', label: 'Degradado' },
  { status: 'maintenance', label: 'Mantenimiento' },
  { status: 'failover', label: 'Failover activo' },
  { status: 'down', label: 'Caída' },
];

export const GlobalMap: React.FC<GlobalMapProps> = ({ regions, connections, selectedId, onSelect }) => {
  const positions = new Map<string, Point>(regions.map((r) => [r.id, projectPoint(r.coordinates[0], r.coordinates[1])]));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1220] shadow-lg">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="block h-auto w-full min-w-[680px]"
          role="group"
          aria-label="Mapa mundial de regiones AWS. Selecciona una región para ver su detalle."
        >
          <path d={GRATICULE_PATH} fill="none" stroke="#1e293b" strokeWidth={0.5} opacity={0.6} />
          <path d={WORLD_LAND_PATH} fill="#1b2a44" stroke="#2f4468" strokeWidth={0.6} strokeLinejoin="round" />

          {/* Conexiones entre regiones */}
          {connections.map((conn) => {
            const from = positions.get(conn.fromRegionId);
            const to = positions.get(conn.toRegionId);
            if (!from || !to) return null;
            const target = regions.find((r) => r.id === conn.toRegionId);
            const isFailover = conn.status === 'active_failover';
            const isDown = target?.status === 'down';
            const isBackup = conn.status === 'backup';
            const stroke = isFailover || isDown ? '#ef4444' : isBackup ? '#64748b' : '#3b82f6';
            return (
              <path
                key={`${conn.fromRegionId}-${conn.toRegionId}`}
                d={arcPath(from, to)}
                fill="none"
                stroke={stroke}
                strokeWidth={isFailover ? 2.2 : 1.4}
                strokeDasharray={isFailover ? '6 5' : '3 4'}
                strokeLinecap="round"
                opacity={isBackup && !isFailover ? 0.7 : 0.9}
              >
                {isFailover && (
                  <animate attributeName="stroke-dashoffset" from="22" to="0" dur="1.2s" repeatCount="indefinite" />
                )}
              </path>
            );
          })}

          {/* Regiones */}
          {regions.map((region) => {
            const pos = positions.get(region.id);
            if (!pos) return null;
            const color = STATUS_COLOR[region.status];
            const pulses = region.status === 'down' || region.status === 'failover';
            const selected = region.id === selectedId;
            const layout = labelLayout(region.labelSide);

            return (
              <g
                key={region.id}
                transform={`translate(${pos[0].toFixed(1)} ${pos[1].toFixed(1)})`}
                className="group cursor-pointer outline-none"
                role="button"
                tabIndex={0}
                aria-label={`${region.name}, ${STATUS_LABEL[region.status]}. Ver detalle`}
                aria-pressed={selected}
                onClick={() => onSelect(region.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(region.id);
                  }
                }}
              >
                {/* Zona de clic generosa y anillo de enfoque/selección */}
                <circle r={20} fill="transparent" />
                <circle
                  r={14}
                  fill="none"
                  stroke="#f8fafc"
                  strokeWidth={1.5}
                  opacity={selected ? 0.9 : 0}
                  className="group-focus-visible:opacity-90"
                />
                {pulses && (
                  <circle r={9} fill={color} opacity={0.35}>
                    <animate attributeName="r" values="9;19;9" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  r={7.5}
                  fill={color}
                  stroke="#f8fafc"
                  strokeWidth={1.8}
                  className="origin-center transition-transform duration-150 [transform-box:fill-box] group-hover:scale-125"
                />
                <text textAnchor={layout.anchor} x={layout.x} y={layout.nameY} fontSize={13} fontWeight={700} fill="#f8fafc" style={HALO}>
                  {region.shortName}
                </text>
                <text
                  textAnchor={layout.anchor}
                  x={layout.x}
                  y={layout.codeY}
                  fontSize={10}
                  fill="#a9b6cc"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  style={HALO}
                >
                  {region.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-800 px-4 py-3 text-[11px] text-slate-300">
        {LEGEND.map((item) => (
          <span key={item.status} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[item.status] }} />
            {item.label}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 text-slate-400">
          <span className="inline-block h-0 w-5 border-t border-dashed border-blue-400" />
          Enlace al hub
        </span>
      </div>
    </div>
  );
};
