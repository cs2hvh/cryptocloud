"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import DottedMap from "dotted-map";

interface MapProps {
  dots?: Array<{
    start: { lat: number; lng: number; label?: string };
    end: { lat: number; lng: number; label?: string };
  }>;
  lineColor?: string;
  hideEndDots?: boolean;
  hideLines?: boolean;
}

export function WorldMap({
  dots = [],
  lineColor = "#60A5FA",
  hideEndDots = false,
  hideLines = false,
}: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const map = new DottedMap({ height: 100, grid: "diagonal" });
  const [hover, setHover] = useState<{ label: string; x: number; y: number } | null>(null);

  // Project uses dark theme only; keep map consistently dark
  const svgMap = map.getSVG({
    radius: 0.25,
    color: "#FFFFFF2A",
    shape: "circle",
    backgroundColor: "black",
  });

  const projectPoint = (lat: number, lng: number) => {
    const x = (lng + 180) * (800 / 360);
    const y = (90 - lat) * (400 / 180);
    return { x, y };
  };

  const createCurvedPath = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 50;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  return (
    <div className="w-full aspect-[2/1] bg-black rounded-lg relative font-sans">
      <img
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
        className="h-full w-full [mask-image:linear-gradient(to_bottom,transparent,white_10%,white_90%,transparent)] pointer-events-none select-none"
        alt="world map"
        height="495"
        width="1056"
        draggable={false}
      />
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        className="w-full h-full absolute inset-0 select-none"
      >
        {!hideLines && dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);
          return (
            <g key={`path-group-${i}`}>
              <motion.path
                d={createCurvedPath(startPoint, endPoint)}
                fill="none"
                stroke="url(#path-gradient)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.25 * i, ease: "easeOut" }}
                key={`path-${i}`}
              />
            </g>
          );
        })}

        <defs>
          <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {dots.map((dot, i) => (
          <g key={`points-group-${i}`}>
            <g key={`start-${i}`}>
              <circle
                cx={projectPoint(dot.start.lat, dot.start.lng).x}
                cy={projectPoint(dot.start.lat, dot.start.lng).y}
                r="2"
                fill={lineColor}
                className="cursor-pointer"
                onMouseEnter={() => setHover({
                  label: dot.start.label || "",
                  x: projectPoint(dot.start.lat, dot.start.lng).x,
                  y: projectPoint(dot.start.lat, dot.start.lng).y,
                })}
                onMouseLeave={() => setHover(null)}
              >
                {dot.start.label ? <title>{dot.start.label}</title> : null}
              </circle>
              <circle
                cx={projectPoint(dot.start.lat, dot.start.lng).x}
                cy={projectPoint(dot.start.lat, dot.start.lng).y}
                r="2"
                fill={lineColor}
                opacity="0.5"
                className="cursor-pointer"
                onMouseEnter={() => setHover({
                  label: dot.start.label || "",
                  x: projectPoint(dot.start.lat, dot.start.lng).x,
                  y: projectPoint(dot.start.lat, dot.start.lng).y,
                })}
                onMouseLeave={() => setHover(null)}
              >
                {dot.start.label ? <title>{dot.start.label}</title> : null}
                <animate
                  attributeName="r"
                  from="2"
                  to="8"
                  dur="1.5s"
                  begin="0s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.5"
                  to="0"
                  dur="1.5s"
                  begin="0s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            {!hideEndDots && (
              <g key={`end-${i}`}>
                <circle
                  cx={projectPoint(dot.end.lat, dot.end.lng).x}
                  cy={projectPoint(dot.end.lat, dot.end.lng).y}
                  r="2"
                  fill={lineColor}
                  className="cursor-pointer"
                  onMouseEnter={() => setHover({
                    label: dot.end.label || "",
                    x: projectPoint(dot.end.lat, dot.end.lng).x,
                    y: projectPoint(dot.end.lat, dot.end.lng).y,
                  })}
                  onMouseLeave={() => setHover(null)}
                >
                  {dot.end.label ? <title>{dot.end.label}</title> : null}
                </circle>
                <circle
                  cx={projectPoint(dot.end.lat, dot.end.lng).x}
                  cy={projectPoint(dot.end.lat, dot.end.lng).y}
                  r="2"
                  fill={lineColor}
                  opacity="0.5"
                  className="cursor-pointer"
                  onMouseEnter={() => setHover({
                    label: dot.end.label || "",
                    x: projectPoint(dot.end.lat, dot.end.lng).x,
                    y: projectPoint(dot.end.lat, dot.end.lng).y,
                  })}
                  onMouseLeave={() => setHover(null)}
                >
                  {dot.end.label ? <title>{dot.end.label}</title> : null}
                  <animate
                    attributeName="r"
                    from="2"
                    to="8"
                    dur="1.5s"
                    begin="0s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.5"
                    to="0"
                    dur="1.5s"
                    begin="0s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            )}
          </g>
        ))}
      </svg>

      {hover && hover.label ? (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${(hover.x / 800) * 100}%`,
            top: `${(hover.y / 400) * 100}%`,
          }}
        >
          <div className="-translate-x-1/2 -translate-y-[120%] rounded-md bg-black/85 border border-white/10 px-2 py-1 text-[11px] text-white shadow-md transition-opacity duration-75">
            {hover.label}
          </div>
        </div>
      ) : null}
    </div>
  );
}
