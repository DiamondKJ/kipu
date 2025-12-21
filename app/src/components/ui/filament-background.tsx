'use client';

import { useMemo } from 'react';

interface FilamentNode {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
}

interface FilamentLine {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
  curved: boolean;
  controlX?: number;
  controlY?: number;
}

export function FilamentBackground() {
  const { nodes, lines } = useMemo(() => {
    const generatedNodes: FilamentNode[] = [];
    const generatedLines: FilamentLine[] = [];

    // Generate sparse nodes across the viewport
    const nodeCount = 12;
    for (let i = 0; i < nodeCount; i++) {
      generatedNodes.push({
        id: i,
        x: 5 + Math.random() * 90,
        y: 5 + Math.random() * 90,
        size: 2 + Math.random() * 3,
        opacity: 0.15 + Math.random() * 0.25,
      });
    }

    // Generate connecting filaments between nearby nodes
    const lineCount = 8;
    for (let i = 0; i < lineCount; i++) {
      const startNode = generatedNodes[i % generatedNodes.length];
      const endNode = generatedNodes[(i + 3) % generatedNodes.length];

      const isCurved = Math.random() > 0.5;

      generatedLines.push({
        id: i,
        x1: startNode.x,
        y1: startNode.y,
        x2: endNode.x,
        y2: endNode.y,
        opacity: 0.05 + Math.random() * 0.1,
        curved: isCurved,
        controlX: isCurved ? (startNode.x + endNode.x) / 2 + (Math.random() - 0.5) * 20 : undefined,
        controlY: isCurved ? (startNode.y + endNode.y) / 2 + (Math.random() - 0.5) * 20 : undefined,
      });
    }

    return { nodes: generatedNodes, lines: generatedLines };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Gradient for filament lines */}
          <linearGradient id="filamentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E6C27A" stopOpacity="0" />
            <stop offset="50%" stopColor="#E6C27A" stopOpacity="1" />
            <stop offset="100%" stopColor="#E6C27A" stopOpacity="0" />
          </linearGradient>

          {/* Glow filter for nodes */}
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Render filament lines */}
        {lines.map((line) => (
          <path
            key={`line-${line.id}`}
            d={
              line.curved
                ? `M ${line.x1}% ${line.y1}% Q ${line.controlX}% ${line.controlY}% ${line.x2}% ${line.y2}%`
                : `M ${line.x1}% ${line.y1}% L ${line.x2}% ${line.y2}%`
            }
            stroke="#E6C27A"
            strokeWidth="0.5"
            strokeOpacity={line.opacity}
            fill="none"
          />
        ))}

        {/* Render nodes */}
        {nodes.map((node) => (
          <circle
            key={`node-${node.id}`}
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r={node.size}
            fill="#E6C27A"
            fillOpacity={node.opacity}
            filter="url(#nodeGlow)"
          />
        ))}

        {/* Additional ambient dots for depth */}
        {Array.from({ length: 30 }).map((_, i) => (
          <circle
            key={`dot-${i}`}
            cx={`${Math.random() * 100}%`}
            cy={`${Math.random() * 100}%`}
            r={0.5 + Math.random() * 1}
            fill="#E6C27A"
            fillOpacity={0.05 + Math.random() * 0.1}
          />
        ))}
      </svg>
    </div>
  );
}
