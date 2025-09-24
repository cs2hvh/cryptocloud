"use client";

import React, { useMemo, useId } from "react";

type Point = { x: number; y: number | null };

type Props = {
  data: Point[];
  width?: number;
  height?: number;
  color?: string;
  yMin?: number;
  yMax?: number;
  yPercent?: boolean;
  xTicks?: number;
  yTicks?: number;
  formatX?: (x: number) => string;
  formatY?: (y: number) => string;
};

export default function LineChart({
  data,
  width = 720,
  height = 220,
  color = "#60A5FA",
  yMin = 0,
  yMax = 100,
  yPercent = true,
  xTicks = 6,
  yTicks = 5,
  formatX,
  formatY,
}: Props) {
  const padding = { left: 48, right: 12, top: 10, bottom: 24 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xs = data.filter((d) => d.y != null).map((d) => d.x);
  const minX = xs.length ? Math.min(...xs) : Date.now() - 3600_000;
  const maxX = xs.length ? Math.max(...xs) : Date.now();
  const xRange = maxX - minX || 1;
  const yRange = (yMax - yMin) || 1;

  const path = useMemo(() => {
    let d = "";
    let started = false;
    for (const p of data) {
      if (p.y == null) { started = false; continue; }
      const x = padding.left + Math.max(0, Math.min(1, (p.x - minX) / xRange)) * innerW;
      const y = padding.top + innerH - ((p.y - yMin) / yRange) * innerH;
      if (!started) { d += `M ${x},${y}`; started = true; }
      else { d += ` L ${x},${y}`; }
    }
    return d;
  }, [data, minX, xRange, innerW, innerH, padding.left, padding.top, yMin, yRange]);

  const defaultFormatX = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const defaultFormatY = (v: number) => yPercent ? `${Math.round(v)}%` : String(v);

  const xTickVals = Array.from({ length: xTicks }, (_, i) => minX + (i / (xTicks - 1)) * xRange);
  const yTickVals = Array.from({ length: yTicks }, (_, i) => yMin + (i / (yTicks - 1)) * yRange);
  const clipId = useId();

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible">
      <defs>
        <clipPath id={clipId}>
          <rect x={padding.left} y={padding.top} width={innerW} height={innerH} />
        </clipPath>
      </defs>
      {/* Axes */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerH} stroke="#FFFFFF22" />
      <line x1={padding.left} y1={padding.top + innerH} x2={padding.left + innerW} y2={padding.top + innerH} stroke="#FFFFFF22" />

      {/* Gridlines + Y labels */}
      {yTickVals.map((v, idx) => {
        const y = padding.top + innerH - ((v - yMin) / yRange) * innerH;
        return (
          <g key={idx}>
            <line x1={padding.left} y1={y} x2={padding.left + innerW} y2={y} stroke="#FFFFFF12" />
            <text x={padding.left - 8} y={y + 4} fontSize={10} textAnchor="end" fill="#9CA3AF">
              {(formatY || defaultFormatY)(v)}
            </text>
          </g>
        );
      })}

      {/* X labels */}
      {xTickVals.map((t, idx) => {
        const x = padding.left + ((t - minX) / xRange) * innerW;
        return (
          <text key={idx} x={x} y={padding.top + innerH + 14} fontSize={10} textAnchor="middle" fill="#9CA3AF">
            {(formatX || defaultFormatX)(t)}
          </text>
        );
      })}

      {/* Line */}
      <g clipPath={`url(#${clipId})`}>
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </g>
    </svg>
  );
}
