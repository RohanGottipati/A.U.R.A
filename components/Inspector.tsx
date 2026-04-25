'use client';

import { SceneObject, Room } from '@/types/scene';
import styles from './SceneViewer.module.css';

interface Props {
  object: SceneObject | null;
  room: Room | null;
  onClose: () => void;
  onFocus: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  table: 'Table',
  chair: 'Chair',
  stage: 'Stage',
  booth: 'Booth',
  desk: 'Desk',
  podium: 'Podium',
  screen: 'Display Screen',
  workstation: 'Workstation',
  shelf: 'Shelf',
  counter: 'Counter',
  equipment: 'Equipment',
  divider: 'Divider',
  plant: 'Plant',
  entrance_marker: 'Entrance',
  toilet: 'Toilet',
  sink: 'Sink',
  door: 'Door',
  staircase: 'Staircase',
  bed: 'Bed',
  kitchen_unit: 'Kitchen Unit',
  bathtub: 'Bathtub',
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  main_hall: 'Main Hall',
  office: 'Office',
  corridor: 'Corridor',
  bathroom: 'Bathroom',
  storage: 'Storage',
  kitchen: 'Kitchen',
  entrance: 'Entrance',
  unknown: 'Room',
};

export default function Inspector({ object, room, onClose, onFocus }: Props) {
  if (!object) return null;

  const typeLabel = TYPE_LABELS[object.type] ?? object.type;
  const roomLabel = room ? room.name : 'Unknown room';
  const roomType = room ? ROOM_TYPE_LABELS[room.type] ?? 'Room' : '';

  return (
    <div className={`${styles.inspector} ${styles.bracket}`}>
      <span className={styles.brBL} />
      <span className={styles.brBR} />

      <div className={styles.inspectorHeader}>
        <div>
          <div className={styles.eyebrow}>OBJECT INSPECTOR</div>
          <div className={styles.inspectorTitle}>{object.label || typeLabel}</div>
        </div>
        <button
          type="button"
          className={styles.inspectorClose}
          onClick={onClose}
          aria-label="Close inspector"
        >
          ×
        </button>
      </div>

      <hr className={styles.divider} />

      <div className={styles.statRow}>
        <span className={styles.statLabel}>TYPE</span>
        <span className={styles.statValue}>{typeLabel}</span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>ROOM</span>
        <span className={styles.statValue}>{roomLabel}</span>
      </div>
      {roomType && (
        <div className={styles.statRow}>
          <span className={styles.statLabel}>ROOM TYPE</span>
          <span className={styles.statValue}>{roomType}</span>
        </div>
      )}

      <hr className={styles.divider} />

      <div className={styles.eyebrow}>DIMENSIONS</div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>W &times; D &times; H</span>
        <span className={styles.statValue}>
          {object.width.toFixed(2)} &times; {object.depth.toFixed(2)} &times; {object.height.toFixed(2)} m
        </span>
      </div>

      <div className={styles.eyebrow} style={{ marginTop: 12 }}>POSITION</div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>X / Y</span>
        <span className={styles.statValue}>
          {object.x.toFixed(2)}, {object.y.toFixed(2)} m
        </span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>ROTATION</span>
        <span className={styles.statValue}>{Math.round(object.rotation)}&deg;</span>
      </div>

      <button
        type="button"
        className={`${styles.inspectorAction} ${styles.bracket}`}
        onClick={onFocus}
      >
        <span className={styles.brBL} />
        <span className={styles.brBR} />
        FOCUS CAMERA
      </button>
    </div>
  );
}
