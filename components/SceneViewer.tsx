'use client';

import { useState, useCallback, useEffect } from 'react';
import ThreeScene from './ThreeScene';
import SceneSidebar from './SceneSidebar';
import { SceneFile, SceneObject, ObjectType } from '@/types/scene';
import styles from './SceneViewer.module.css';

const DEFAULT_SIZES: Record<ObjectType, { width: number; depth: number; height: number }> = {
  table:           { width: 2.0, depth: 1.0,  height: 0.75 },
  chair:           { width: 0.5, depth: 0.5,  height: 0.9  },
  stage:           { width: 8.0, depth: 4.0,  height: 0.5  },
  booth:           { width: 2.0, depth: 2.0,  height: 2.0  },
  desk:            { width: 1.5, depth: 0.8,  height: 0.75 },
  podium:          { width: 0.6, depth: 0.6,  height: 1.1  },
  screen:          { width: 3.0, depth: 0.1,  height: 2.0  },
  workstation:     { width: 2.0, depth: 1.5,  height: 1.0  },
  shelf:           { width: 1.0, depth: 0.4,  height: 2.0  },
  counter:         { width: 2.0, depth: 0.8,  height: 0.9  },
  equipment:       { width: 1.5, depth: 1.5,  height: 1.2  },
  plant:           { width: 0.6, depth: 0.6,  height: 1.5  },
  divider:         { width: 3.0, depth: 0.1,  height: 1.8  },
  entrance_marker: { width: 1.0, depth: 1.0,  height: 0.1  },
  toilet:          { width: 0.5, depth: 0.7,  height: 0.85 },
  sink:            { width: 0.7, depth: 0.5,  height: 0.9  },
  door:            { width: 0.9, depth: 0.1,  height: 2.1  },
  staircase:       { width: 1.2, depth: 3.0,  height: 1.5  },
  bed:             { width: 1.6, depth: 2.0,  height: 0.6  },
  kitchen_unit:    { width: 2.4, depth: 0.65, height: 0.9  },
  bathtub:         { width: 1.7, depth: 0.75, height: 0.55 },
};

interface Props {
  sceneData: SceneFile;
}

export default function SceneViewer({ sceneData }: Props) {
  const [mode, setMode] = useState<'walk' | 'orbit'>('orbit');
  const [copied, setCopied] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);

  const [objects, setObjects] = useState<SceneObject[]>(sceneData.configuration.objects);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const selectedObject = objects.find(o => o.id === selectedId) ?? null;

  const updateObject = (id: string, changes: Partial<SceneObject>) => {
    setObjects(prev => prev.map(o => o.id === id ? { ...o, ...changes } : o));
    setIsDirty(true);
  };

  const deleteObject = (id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    setSelectedId(null);
    setIsDirty(true);
  };

  const addObject = (type: ObjectType) => {
    const sizes = DEFAULT_SIZES[type];
    const newObj: SceneObject = {
      id: `obj_${Date.now()}`,
      type,
      roomId: sceneData.floorplan.rooms[0]?.id ?? 'room_1',
      x: sceneData.floorplan.width / 2,
      y: sceneData.floorplan.depth / 2,
      z: 0,
      ...sizes,
      rotation: 0,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${objects.length + 1}`,
    };
    setObjects(prev => [...prev, newObj]);
    setSelectedId(newObj.id);
    setIsDirty(true);
  };

  // Suppress unused variable warnings for state used later
  void isDirty; void isSaving; void saveToast; void setSaveToast;

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  // Track pointer-lock state to show / hide the "click to enable mouse look" hint
  useEffect(() => {
    const onPointerLockChange = () => {
      setPointerLocked(document.pointerLockElement !== null);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);
    return () => document.removeEventListener('pointerlockchange', onPointerLockChange);
  }, []);

  const useCase = sceneData.configuration.useCase || 'Untitled scene';
  const category = sceneData.configuration.useCaseCategory ?? 'other';
  const objectCount = objects.length;
  const width = sceneData.floorplan.width;
  const depth = sceneData.floorplan.depth;
  const confidenceRaw = sceneData.floorplan?.confidence;
  const hasConfidence = typeof confidenceRaw === 'number' && !Number.isNaN(confidenceRaw);
  const confidencePct = hasConfidence ? Math.round(confidenceRaw * 100) : null;

  let confColor = '';
  let confGlow = '';
  if (confidencePct !== null) {
    if (confidencePct >= 80) {
      confColor = styles.confHigh;
      confGlow = styles.glowHigh;
    } else if (confidencePct >= 60) {
      confColor = styles.confMid;
      confGlow = styles.glowMid;
    } else {
      confColor = styles.confLow;
      confGlow = styles.glowLow;
    }
  }

  const isWalk = mode === 'walk';

  return (
    <div className={styles.root}>
      <ThreeScene
        sceneData={sceneData}
        mode={mode}
        objects={objects}
        selectedId={selectedId}
        onSelectObject={setSelectedId}
        onMoveObject={(id, x, y) => updateObject(id, { x, y })}
      />
      <SceneSidebar
        objects={objects}
        selectedObject={selectedObject}
        floorplan={sceneData.floorplan}
        onAdd={addObject}
        onUpdate={updateObject}
        onDelete={deleteObject}
        onDeselect={() => setSelectedId(null)}
      />

      {/* ============== Top-left: Scene Info ============== */}
      <div className={`${styles.panel} ${styles.infoPanel} ${styles.bracket}`}>
        <span className={styles.infoPulseBorder} aria-hidden />
        <span className={styles.brBL} />
        <span className={styles.brBR} />

        <div className={styles.eyebrow}>FLOORPLAN AI</div>
        <div className={styles.title}>{useCase}</div>

        <hr className={styles.divider} />

        <div className={styles.statRow}>
          <span className={styles.statLabel}>OBJECTS</span>
          <span className={styles.statValue}>{objectCount}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>AREA</span>
          <span className={styles.statValue}>
            {width} &times; {depth} m&sup2;
          </span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>USE CASE</span>
          <span className={styles.statValue}>{category.toUpperCase()}</span>
        </div>
      </div>

      {/* ============== Top-right: Action Buttons ============== */}
      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => setMode(isWalk ? 'orbit' : 'walk')}
          className={`${styles.btn} ${styles.bracket} ${isWalk ? styles.btnWalkActive : ''}`}
        >
          <span className={styles.brBL} />
          <span className={styles.brBR} />
          <span className={styles.btnIcon}>{isWalk ? '\u2295' : '\u25CE'}</span>
          <span>{isWalk ? 'WALK MODE' : 'ORBIT MODE'}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className={`${styles.btn} ${styles.bracket} ${copied ? styles.btnCopied : ''}`}
        >
          <span className={styles.brBL} />
          <span className={styles.brBR} />
          <span className={styles.btnIcon}>{copied ? '\u2713' : '\u2398'}</span>
          <span>{copied ? 'COPIED' : 'SHARE'}</span>
        </button>

        <a
          href="/upload"
          className={`${styles.btn} ${styles.btnNew} ${styles.bracket}`}
        >
          <span className={styles.brBL} />
          <span className={styles.brBR} />
          <span className={styles.btnIcon}>+</span>
          <span>NEW SCENE</span>
        </a>
      </div>

      {/* ============== Bottom-center: Walk-mode Hints ============== */}
      <div
        className={`${styles.hintsWrap} ${isWalk ? styles.hintsVisible : styles.hintsHidden}`}
      >
        <div className={`${styles.hintsPill} ${styles.bracket}`}>
          <span className={styles.brBL} />
          <span className={styles.brBR} />

          <div className={styles.keyGroup}>
            <span className={styles.keycap}>W</span>
            <span className={styles.keycap}>A</span>
            <span className={styles.keycap}>S</span>
            <span className={styles.keycap}>D</span>
            <span className={styles.hintText}>MOVE</span>
          </div>

          <span className={styles.hintSep} />

          <div className={styles.mouseGroup}>
            <span className={styles.mouseIcon} aria-hidden />
            <span className={styles.hintText}>LOOK</span>
          </div>
        </div>

        {isWalk && !pointerLocked && (
          <div className={styles.lockHint}>CLICK SCENE TO ENABLE MOUSE LOOK</div>
        )}
      </div>

      {/* ============== Bottom-right: Confidence ============== */}
      {hasConfidence && (
        <div
          className={`${styles.confidence} ${styles.bracket} ${confGlow}`}
        >
          <span className={styles.brBL} />
          <span className={styles.brBR} />
          <span className={styles.confidenceLabel}>AI CONFIDENCE</span>
          <span className={`${styles.confidenceValue} ${confColor}`}>
            {confidencePct}%
          </span>
        </div>
      )}
    </div>
  );
}
