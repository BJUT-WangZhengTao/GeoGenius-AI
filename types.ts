export interface Point {
  x: number;
  y: number;
}

export interface TriangleState {
  A: Point;
  B: Point;
  C: Point;
}

export interface ComputedGeometry {
  sideA: number; // Length BC
  sideB: number; // Length AC
  sideC: number; // Length AB
  angleA: number; // Angle at A (degrees)
  angleB: number; // Angle at B (degrees)
  angleC: number; // Angle at C (degrees)
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isLoading?: boolean;
}

export enum GeometryMode {
  FREE = 'FREE',
  RIGHT_ANGLE = 'RIGHT_ANGLE',
  EQUILATERAL = 'EQUILATERAL',
}