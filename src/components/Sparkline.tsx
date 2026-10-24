import React, { useId } from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({ data, color = '#2563EB', height = 112 }) => {
  const gradientId = useId().replace(/:/g, '');

  if (data.length < 2) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-slate-400">
        Recopilando datos…
      </div>
    );
  }

  const W = 100;
  const H = 40;
  const pad = 3;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }));
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `0,${H} ${line} ${W},${H}`;
  const last = points[points.length - 1];

  return (
    <div className="relative" style={{ height }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="Tendencia de las últimas lecturas"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className="absolute h-2.5 w-2.5 rounded-full ring-4 ring-white"
        style={{
          backgroundColor: color,
          left: `calc(${last.x}% - 5px)`,
          top: `calc(${(last.y / H) * 100}% - 5px)`,
        }}
      />
    </div>
  );
};
