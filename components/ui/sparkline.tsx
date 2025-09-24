"use client";

import React from "react";

type SparkProps = {
  data: Array<number | null | undefined>;
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  smooth?: boolean;
  max?: number;
  min?: number;
};

export default function Sparkline({ data, width = 200, height = 48, stroke = "#60A5FA", fill = "rgba(96,165,250,0.15)", smooth = false, max, min }: SparkProps) {
  const cleaned = data.map((v) => (typeof v === "number" && isFinite(v) ? v : null));
  const vals = cleaned.filter((v): v is number => v != null);
  const lo = min ?? (vals.length ? Math.min(...vals) : 0);
  const hi = max ?? (vals.length ? Math.max(...vals) : 1);
  const range = hi - lo || 1;
  const points: Array<[number, number]> = [];
  const n = cleaned.length || 1;
  cleaned.forEach((v, i) => {
    const x = (i / (n - 1 || 1)) * (width - 2) + 1;
    const yVal = v == null ? null : height - 1 - ((v - lo) / range) * (height - 2);
    points.push([x, yVal == null ? height - 1 : yVal]);
  });

  const path = points
    .map(([x, y], i) => (i === 0 ? `M ${x},${y}` : smooth ? ` S ${x},${y}` : ` L ${x},${y}`))
    .join("");
  const area = `${path} L ${width - 1},${height - 1} L 1,${height - 1} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={area} fill={fill} stroke="none" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

