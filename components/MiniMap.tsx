'use client';

import { useMemo } from 'react';
import { SceneFile, SceneObject, Room } from '@/types/scene';
import styles from './SceneViewer.module.css';

interface Props {
  sceneData: SceneFile;
  selectedObjectId: string | null;
  cameraInfo: { x: number; y: number; yaw: number } | null;
  onSelectObject: (id: string | null) => void;
}

const ROOM_FILL: Record<string, string> = {
  main_hall: 'rgba(59, 130, 246, 0.18)',
  office:    'rgba(99, 102, 241, 0.20)',
  corridor:  'rgba(148, 163, 184, 0.14)',
  bathroom:  'rgba(56, 189, 248, 0.18)',
  storage:   'rgba(180, 130, 60, 0.18)',
  kitchen:   'rgba(245, 158, 11, 0.18)',
  entrance:  'rgba(14, 165, 233, 0.18)',
  unknown:   'rgba(255, 255, 255, 0.06)',
};

const OBJECT_DOT: Record<string, string> = {
  table:        '#fbbf24',
  chair:        '#10b981',
  stage:        '#3b82f6',
  booth:        '#a855f7',
  desk:         '#60a5fa',
  podium:       '#f59e0b',
  screen:       '#06b6d4',
  workstation:  '#94a3b8',
  shelf:        '#b45309',
  counter:      '#d97706',
  equipment:    '#475569',
  divider:      '#cbd5e1',
  plant:        '#10b981',
  entrance_marker: '#ef4444',
  toilet:       '#e2e8f0',
  sink:         '#cbd5e1',
  door:         '#92400e',
  staircase:    '#a8a29e',
  bed:          '#f5deb3',
  kitchen_unit: '#c7ad8a',
  bathtub:      '#bae6fd',
};

const MINIMAP_SIZE = 200; // px (square)
const MINIMAP_PADDING = 8;

export default function MiniMap({
  sceneData,
  selectedObjectId,
  cameraInfo,
  onSelectObject,
}: Props) {
  const { width: fpW, depth: fpD, rooms, walls } = sceneData.floorplan;
  const { objects } = sceneData.configuration;

  // Compute scale so the floor plan fits inside the minimap viewport while
  // preserving aspect ratio.
  const { scale, offsetX, offsetY, viewW, viewH } = useMemo(() => {
    const inner = MINIMAP_SIZE - MINIMAP_PADDING * 2;
    const sx = inner / fpW;
    const sy = inner / fpD;
    const s = Math.min(sx, sy);
    const w = fpW * s;
    const h = fpD * s;
    return {
      scale: s,
      offsetX: (MINIMAP_SIZE - w) / 2,
      offsetY: (MINIMAP_SIZE - h) / 2,
      viewW: w,
      viewH: h,
    };
  }, [fpW, fpD]);

  const toView = (x: number, y: number) => ({
    cx: offsetX + x * scale,
    cy: offsetY + y * scale,
  });

  const camera = cameraInfo ? toView(cameraInfo.x, cameraInfo.y) : null;
  const camYawDeg = cameraInfo
    ? -((cameraInfo.yaw * 180) / Math.PI) + 180
    : 0;

  const renderRoom = (room: Room) => {
    const fill = ROOM_FILL[room.type] ?? ROOM_FILL.unknown;
    if (room.polygon && room.polygon.length >= 3) {
      const points = room.polygon
        .map((p) => `${toView(p.x, p.y).cx},${toView(p.x, p.y).cy}`)
        .join(' ');
      return (
        <polygon
          key={room.id}
          points={points}
          fill={fill}
          stroke="rgba(0, 212, 255, 0.30)"
          strokeWidth={0.7}
        />
      );
    }
    const tl = toView(room.x, room.y);
    return (
      <rect
        key={room.id}
        x={tl.cx}
        y={tl.cy}
        width={room.width * scale}
        height={room.height * scale}
        fill={fill}
        stroke="rgba(0, 212, 255, 0.30)"
        strokeWidth={0.7}
      />
    );
  };

  const renderObject = (obj: SceneObject) => {
    const { cx, cy } = toView(obj.x, obj.y);
    const r = Math.max(1.4, Math.min(obj.width, obj.depth) * scale * 0.4);
    const isSelected = obj.id === selectedObjectId;
    const fill = OBJECT_DOT[obj.type] ?? '#94a3b8';
    return (
      <g key={obj.id}>
        <circle
          cx={cx}
          cy={cy}
          r={isSelected ? r + 1.2 : r}
          fill={fill}
          opacity={isSelected ? 1 : 0.8}
          stroke={isSelected ? '#00d4ff' : 'transparent'}
          strokeWidth={isSelected ? 1.4 : 0}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectObject(obj.id);
          }}
        >
          <title>{obj.label || obj.type}</title>
        </circle>
      </g>
    );
  };

  return (
    <div
      className={`${styles.minimap} ${styles.bracket}`}
      style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE + 24 }}
    >
      <span className={styles.brBL} />
      <span className={styles.brBR} />

      <div className={styles.minimapHeader}>
        <span className={styles.eyebrow}>FLOOR PLAN</span>
        <span className={styles.minimapDims}>
          {fpW.toFixed(1)}&times;{fpD.toFixed(1)}m
        </span>
      </div>

      <svg
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        viewBox={`0 0 ${MINIMAP_SIZE} ${MINIMAP_SIZE}`}
        onClick={() => onSelectObject(null)}
        style={{ display: 'block' }}
      >
        {/* viewport background */}
        <rect
          x={offsetX}
          y={offsetY}
          width={viewW}
          height={viewH}
          fill="rgba(8, 12, 20, 0.7)"
          stroke="rgba(0, 212, 255, 0.18)"
          strokeWidth={1}
        />

        {/* rooms */}
        {rooms.map(renderRoom)}

        {/* walls */}
        {walls.map((w, i) => {
          const a = toView(w.x1, w.y1);
          const b = toView(w.x2, w.y2);
          return (
            <line
              key={`wall-${i}`}
              x1={a.cx}
              y1={a.cy}
              x2={b.cx}
              y2={b.cy}
              stroke="rgba(255, 255, 255, 0.55)"
              strokeWidth={1.0}
              strokeLinecap="round"
            />
          );
        })}

        {/* objects */}
        {objects.map(renderObject)}

        {/* camera marker */}
        {camera && (
          <g transform={`translate(${camera.cx} ${camera.cy}) rotate(${camYawDeg})`}>
            <polygon
              points="0,-7 5,5 0,2 -5,5"
              fill="#00d4ff"
              stroke="#0a0a0a"
              strokeWidth={0.6}
            />
            <circle cx={0} cy={0} r={1.6} fill="#0a0a0a" />
          </g>
        )}
      </svg>
    </div>
  );
}
