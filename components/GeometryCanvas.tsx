import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Point, TriangleState, ComputedGeometry, GeometryMode } from '../types';

interface GeometryCanvasProps {
  width: number;
  height: number;
  triangle: TriangleState;
  onTriangleChange: (t: TriangleState) => void;
  computed: ComputedGeometry;
  mode: GeometryMode;
}

const DRAG_RADIUS = 15;
const POINT_RADIUS = 8;

const GeometryCanvas: React.FC<GeometryCanvasProps> = ({
  width,
  height,
  triangle,
  onTriangleChange,
  computed,
  mode
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingPoint, setDraggingPoint] = useState<keyof TriangleState | null>(null);

  // Helper to get coordinates relative to SVG
  const getMousePosition = (evt: React.PointerEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (evt.clientX - CTM.e) / CTM.a,
      y: (evt.clientY - CTM.f) / CTM.d,
    };
  };

  const handlePointerDown = (key: keyof TriangleState) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingPoint(key);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingPoint) return;

    const pos = getMousePosition(e);
    
    // Boundary check
    const padding = 20;
    const boundedX = Math.max(padding, Math.min(width - padding, pos.x));
    const boundedY = Math.max(padding, Math.min(height - padding, pos.y));

    const newTriangle = { ...triangle, [draggingPoint]: { x: boundedX, y: boundedY } };
    onTriangleChange(newTriangle);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingPoint(null);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // Helper for angle arc path
  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
      const start = {
          x: x + (Math.cos(startAngle) * radius),
          y: y + (Math.sin(startAngle) * radius)
      };
      const end = {
          x: x + (Math.cos(endAngle) * radius),
          y: y + (Math.sin(endAngle) * radius)
      };
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      return [
          "M", x, y,
          "L", start.x, start.y,
          "A", radius, radius, 0, 0, 1, end.x, end.y,
          "L", x, y
      ].join(" ");
  };

  // Calculate angles for drawing arcs (radians)
  const getAngleRad = (p1: Point, center: Point, p2: Point) => {
      return Math.atan2(p2.y - center.y, p2.x - center.x) - Math.atan2(p1.y - center.y, p1.x - center.x);
  };

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="bg-white rounded-xl shadow-inner border border-slate-200 select-none touch-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ cursor: draggingPoint ? 'grabbing' : 'default' }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* Grid Background */}
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
      </pattern>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Connecting Lines (Sides) */}
      <g strokeWidth="3" strokeLinecap="round">
        <line x1={triangle.B.x} y1={triangle.B.y} x2={triangle.C.x} y2={triangle.C.y} stroke="#3b82f6" /> {/* a */}
        <line x1={triangle.A.x} y1={triangle.A.y} x2={triangle.C.x} y2={triangle.C.y} stroke="#8b5cf6" /> {/* b */}
        <line x1={triangle.A.x} y1={triangle.A.y} x2={triangle.B.x} y2={triangle.B.y} stroke="#10b981" /> {/* c */}
      </g>

      {/* Side Labels */}
      <g className="text-sm font-medium fill-slate-500" style={{ pointerEvents: 'none' }}>
        <text x={(triangle.B.x + triangle.C.x)/2} y={(triangle.B.y + triangle.C.y)/2 + 20} textAnchor="middle">a = {computed.sideA.toFixed(1)}</text>
        <text x={(triangle.A.x + triangle.C.x)/2 - 15} y={(triangle.A.y + triangle.C.y)/2 - 10} textAnchor="middle">b = {computed.sideB.toFixed(1)}</text>
        <text x={(triangle.A.x + triangle.B.x)/2 + 15} y={(triangle.A.y + triangle.B.y)/2 - 10} textAnchor="middle">c = {computed.sideC.toFixed(1)}</text>
      </g>

      {/* Vertices */}
      {(Object.entries(triangle) as [string, Point][]).map(([key, point]) => (
        <g key={key} transform={`translate(${point.x}, ${point.y})`}>
           {/* Interactive Area */}
           <circle
            r={DRAG_RADIUS}
            fill="transparent"
            onPointerDown={handlePointerDown(key as keyof TriangleState)}
            className="cursor-grab active:cursor-grabbing"
          />
          {/* Visual Dot */}
          <circle
            r={POINT_RADIUS}
            fill={key === 'A' ? '#10b981' : key === 'B' ? '#3b82f6' : '#8b5cf6'}
            stroke="white"
            strokeWidth="2"
            filter="url(#shadow)"
            style={{ pointerEvents: 'none' }}
          />
          {/* Label */}
          <text
            y="-15"
            textAnchor="middle"
            className="text-lg font-bold fill-slate-700"
            style={{ pointerEvents: 'none' }}
          >
            {key}
          </text>
        </g>
      ))}

      {/* Angle C Arc Visualization (Focus of Law of Cosines usually) */}
      <g opacity="0.6">
         {/* Simple angle text near C */}
         <text x={triangle.C.x} y={triangle.C.y + 40} textAnchor="middle" className="text-xs fill-slate-400">
            ∠C = {computed.angleC.toFixed(0)}°
         </text>
      </g>

    </svg>
  );
};

export default GeometryCanvas;