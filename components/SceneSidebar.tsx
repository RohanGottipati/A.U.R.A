'use client';

import { FloorPlan, ObjectType, SceneObject } from '@/types/scene';
import styles from './SceneSidebar.module.css';

interface Props {
  objects: SceneObject[];
  selectedObject: SceneObject | null;
  floorplan: FloorPlan;
  onAdd: (type: ObjectType) => void;
  onUpdate: (id: string, changes: Partial<SceneObject>) => void;
  onDelete: (id: string) => void;
  onDeselect: () => void;
}

const GROUPS: { label: string; defaultOpen: boolean; items: { label: string; type: ObjectType }[] }[] = [
  {
    label: 'FURNITURE', defaultOpen: true,
    items: [
      { label: 'Table', type: 'table' },
      { label: 'Chair', type: 'chair' },
      { label: 'Counter', type: 'counter' },
      { label: 'Desk', type: 'desk' },
    ],
  },
  {
    label: 'STAGE & AV', defaultOpen: true,
    items: [
      { label: 'Stage', type: 'stage' },
      { label: 'Screen', type: 'screen' },
      { label: 'Podium', type: 'podium' },
    ],
  },
  {
    label: 'OFFICE', defaultOpen: false,
    items: [
      { label: 'Shelf', type: 'shelf' },
      { label: 'Divider', type: 'divider' },
      { label: 'Plant', type: 'plant' },
    ],
  },
  {
    label: 'INDUSTRIAL', defaultOpen: false,
    items: [
      { label: 'Workstation', type: 'workstation' },
      { label: 'Equipment', type: 'equipment' },
    ],
  },
  {
    label: 'OTHER', defaultOpen: false,
    items: [
      { label: 'Booth', type: 'booth' },
      { label: 'Entrance Marker', type: 'entrance_marker' },
    ],
  },
];

function SectionDivider() {
  return <div style={{ height: 1, background: 'rgba(0,212,255,0.06)', margin: 0 }} />;
}

function SliderRow({
  label, min, max, step, value, unit, onChange,
}: {
  label: string; min: number; max: number; step: number;
  value: number; unit: string; onChange: (v: number) => void;
}) {
  const display = unit === '°' ? `${Math.round(value)}°` : `${value.toFixed(1)}m`;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', minWidth: 16 }}>{label}</span>
      <input
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span style={{ fontSize: 10, color: '#00d4ff', minWidth: 40, textAlign: 'right' }}>{display}</span>
    </div>
  );
}

const sidebarStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, width: 280, height: '100vh',
  background: 'rgba(8, 12, 20, 0.92)',
  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  borderLeft: '1px solid rgba(0, 212, 255, 0.12)',
  zIndex: 20, overflowY: 'auto', overflowX: 'hidden',
  display: 'flex', flexDirection: 'column',
  fontFamily: "'DM Mono', monospace",
};

export default function SceneSidebar({
  objects,
  selectedObject,
  floorplan,
  onAdd,
  onUpdate,
  onDelete,
  onDeselect,
}: Props) {
  // objects prop is available for future use (e.g. object count display)
  void objects;

  if (!selectedObject) {
    return (
      <div style={sidebarStyle}>
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.45em', color: 'rgba(0,212,255,0.55)', marginBottom: 16 }}>
            ADD COMPONENT
          </div>
        </div>
        {GROUPS.map((group) => (
          <details
            key={group.label}
            open={group.defaultOpen}
            style={{ borderBottom: '1px solid rgba(0,212,255,0.12)' }}
          >
            <summary className={styles.groupSummary}>
              <span>{group.label}</span>
              <span className={styles.arrow} />
            </summary>
            <div style={{ padding: '8px 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {group.items.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className={styles.addBtn}
                  onClick={() => onAdd(item.type)}
                >
                  <span style={{ color: '#00d4ff' }}>+</span>
                  {item.label.toUpperCase()}
                </button>
              ))}
            </div>
          </details>
        ))}
      </div>
    );
  }

  const obj = selectedObject;
  return (
    <div style={sidebarStyle}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.45em', color: 'rgba(0,212,255,0.55)' }}>
          {obj.type.toUpperCase()}
        </span>
        <button type="button" onClick={onDeselect} className={styles.closeBtn}>×</button>
      </div>

      {/* Label */}
      <div style={{ padding: '0 20px 16px' }}>
        <input
          type="text"
          value={obj.label}
          className={styles.labelInput}
          onChange={(e) => onUpdate(obj.id, { label: e.target.value })}
        />
      </div>

      <SectionDivider />

      {/* Position */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 9, letterSpacing: '0.4em', color: 'rgba(0,212,255,0.55)', marginBottom: 14 }}>
          POSITION
        </div>
        <SliderRow label="X" min={0} max={floorplan.width} step={0.1} value={obj.x} unit="m"
          onChange={(v) => onUpdate(obj.id, { x: v })} />
        <SliderRow label="Y" min={0} max={floorplan.depth} step={0.1} value={obj.y} unit="m"
          onChange={(v) => onUpdate(obj.id, { y: v })} />
      </div>

      <SectionDivider />

      {/* Rotation */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 9, letterSpacing: '0.4em', color: 'rgba(0,212,255,0.55)', marginBottom: 14 }}>
          ROTATION
        </div>
        <SliderRow label="°" min={0} max={360} step={5} value={obj.rotation} unit="°"
          onChange={(v) => onUpdate(obj.id, { rotation: v })} />
        <div style={{ display: 'flex', gap: 8 }}>
          {([{ label: '↺ -45°', delta: -45 }, { label: '+45° ↻', delta: 45 }] as const).map(({ label, delta }) => (
            <button
              key={label}
              type="button"
              className={styles.rotBtn}
              onClick={() => onUpdate(obj.id, { rotation: ((obj.rotation + delta) % 360 + 360) % 360 })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <SectionDivider />

      {/* Size */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 9, letterSpacing: '0.4em', color: 'rgba(0,212,255,0.55)', marginBottom: 14 }}>
          SIZE
        </div>
        <SliderRow label="W" min={0.2} max={12} step={0.1} value={obj.width} unit="m"
          onChange={(v) => onUpdate(obj.id, { width: v })} />
        <SliderRow label="D" min={0.2} max={12} step={0.1} value={obj.depth} unit="m"
          onChange={(v) => onUpdate(obj.id, { depth: v })} />
        <SliderRow label="H" min={0.1} max={6} step={0.05} value={obj.height} unit="m"
          onChange={(v) => onUpdate(obj.id, { height: v })} />
      </div>

      <SectionDivider />

      {/* Delete */}
      <div style={{ padding: '16px 20px', marginTop: 'auto' }}>
        <button type="button" className={styles.deleteBtn} onClick={() => onDelete(obj.id)}>
          DELETE OBJECT
        </button>
      </div>
    </div>
  );
}
