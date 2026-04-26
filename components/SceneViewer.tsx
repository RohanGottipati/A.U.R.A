'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [sceneId, setSceneId] = useState<string>(sceneData.sceneId);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [saveToastIsError, setSaveToastIsError] = useState(false);

  // Walk-mode "click to choose your starting point" flow.
  const [placingWalkSpawn, setPlacingWalkSpawn] = useState(false);
  const [walkSpawn, setWalkSpawn] = useState<{ x: number; z: number } | null>(null);

  // "Click to choose where to drop a new component" flow.
  const [pendingAddType, setPendingAddType] = useState<ObjectType | null>(null);

  // Three.js writes the current orbit target into this ref every frame so
  // we can spawn new objects under the user's current view.
  const cameraTargetRef = useRef<{ x: number; z: number } | null>(null);

  // Undo history — ref so callbacks always see the live stack without stale closures.
  const historyRef = useRef<SceneObject[][]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // Always-current snapshot of objects without closure staleness.
  const objectsRef = useRef(objects);
  objectsRef.current = objects;

  // Call once at the START of an interaction (drag begin, slider mousedown, delete).
  // Do NOT call on every onChange — that's the bug we're fixing.
  const recordSnapshot = useCallback(() => {
    historyRef.current = [...historyRef.current, objectsRef.current].slice(-50);
    setCanUndo(true);
  }, []);

  const handleUndo = useCallback(() => {
    const stack = historyRef.current;
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    historyRef.current = stack.slice(0, -1);
    setObjects(prev);
    setSelectedId(null);
    setCanUndo(historyRef.current.length > 0);
    setIsDirty(true);
  }, []);

  const selectedObject = objects.find((o) => o.id === selectedId) ?? null;

  // Reset local state when a fresh scene is loaded (e.g. navigation).
  useEffect(() => {
    setObjects(sceneData.configuration.objects);
    setSceneId(sceneData.sceneId);
    setSelectedId(null);
    setIsDirty(false);
    historyRef.current = [];
    setCanUndo(false);
  }, [sceneData]);

  // Ctrl+Z / Cmd+Z keyboard shortcut for undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleUndo]);

  // updateObject does NOT push history — callers are responsible for calling
  // recordSnapshot() once before the interaction begins (slider mousedown, drag start).
  const updateObject = useCallback((id: string, changes: Partial<SceneObject>) => {
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...changes } : o)));
    setIsDirty(true);
  }, []);

  const deleteObject = useCallback((id: string) => {
    recordSnapshot(); // delete is a single discrete action — snapshot here is correct
    setObjects((prev) => prev.filter((o) => o.id !== id));
    setSelectedId(null);
    setIsDirty(true);
  }, [recordSnapshot]);

  // Sidebar "add" no longer drops the object immediately — it arms a
  // placement flow so the user can click on the floor to choose the spot.
  const addObject = useCallback(
    (type: ObjectType) => {
      // Placement requires the orbit camera so the user can pick a spot.
      setMode('orbit');
      // If user was placing a walk spawn, cancel that — the two flows are
      // mutually exclusive.
      setPlacingWalkSpawn(false);
      // Re-arming with a different type just swaps the pending type.
      setPendingAddType(type);
    },
    [],
  );

  // Fired by ThreeScene when the user clicks the floor while a pending
  // add type is set. Actually creates the object at the chosen spot.
  const handleObjectSpawnSelected = useCallback(
    (x: number, z: number) => {
      const type = pendingAddType;
      if (!type) return;
      const sizes = DEFAULT_SIZES[type];
      const fpW = sceneData.floorplan.width;
      const fpD = sceneData.floorplan.depth;
      const margin = Math.max(sizes.width, sizes.depth) / 2 + 0.1;
      const cx = Math.max(margin, Math.min(fpW - margin, x));
      const cy = Math.max(margin, Math.min(fpD - margin, z));

      const newObj: SceneObject = {
        id: `obj_${Date.now()}`,
        type,
        roomId: sceneData.floorplan.rooms[0]?.id ?? 'room_1',
        x: cx,
        y: cy,
        z: 0,
        ...sizes,
        rotation: 0,
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${objects.length + 1}`,
      };
      recordSnapshot();
      setObjects((prev) => [...prev, newObj]);
      setSelectedId(newObj.id);
      setIsDirty(true);
      setPendingAddType(null);
    },
    [pendingAddType, sceneData.floorplan, objects.length, recordSnapshot],
  );

  const handleShare = useCallback(async () => {
    try {
      const url = `${window.location.origin}/scene/${sceneId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [sceneId]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/scene/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalSceneId: sceneId, objects }),
      });
      if (!response.ok) throw new Error('Save failed');

      const { newSceneId } = (await response.json()) as { newSceneId: string };

      window.history.pushState({}, '', `/scene/${newSceneId}`);
      setSceneId(newSceneId);
      setIsDirty(false);

      setSaveToastIsError(false);
      setSaveToast('Scene saved as new version');
      setTimeout(() => setSaveToast(null), 3000);
    } catch {
      setSaveToastIsError(true);
      setSaveToast('Save failed. Please try again.');
      setTimeout(() => setSaveToast(null), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [sceneId, objects]);

  // Track pointer-lock state to show / hide the "click to enable mouse look" hint
  useEffect(() => {
    const onPointerLockChange = () => {
      setPointerLocked(document.pointerLockElement !== null);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);
    return () => document.removeEventListener('pointerlockchange', onPointerLockChange);
  }, []);

  // ESC cancels the "place your spawn" step and returns to plain orbit mode.
  useEffect(() => {
    if (!placingWalkSpawn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlacingWalkSpawn(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [placingWalkSpawn]);

  // ESC also cancels a pending object placement.
  useEffect(() => {
    if (!pendingAddType) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingAddType(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pendingAddType]);

  const handleModeButton = useCallback(() => {
    if (mode === 'walk') {
      setMode('orbit');
      setPlacingWalkSpawn(false);
      return;
    }
    if (placingWalkSpawn) {
      setPlacingWalkSpawn(false);
      return;
    }
    // Starting a walk-spawn placement cancels any pending object placement.
    setPendingAddType(null);
    setPlacingWalkSpawn(true);
  }, [mode, placingWalkSpawn]);

  const handleWalkSpawnSelected = useCallback((x: number, z: number) => {
    setWalkSpawn({ x, z });
    setPlacingWalkSpawn(false);
    setMode('walk');
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
        onBeforeMove={recordSnapshot}
        cameraTargetRef={cameraTargetRef}
        placingWalkSpawn={placingWalkSpawn}
        walkSpawn={walkSpawn}
        onWalkSpawnSelected={handleWalkSpawnSelected}
        placingObject={pendingAddType !== null}
        onObjectSpawnSelected={handleObjectSpawnSelected}
      />
      <SceneSidebar
        objects={objects}
        selectedObject={selectedObject}
        floorplan={sceneData.floorplan}
        onAdd={addObject}
        onUpdate={updateObject}
        onDelete={deleteObject}
        onDeselect={() => setSelectedId(null)}
        onRecordSnapshot={recordSnapshot}
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
          onClick={handleUndo}
          disabled={!canUndo}
          className={`${styles.btn} ${styles.bracket}`}
          title="Undo (Ctrl+Z)"
        >
          <span className={styles.brBL} />
          <span className={styles.brBR} />
          <span className={styles.btnIcon}>&#8634;</span>
          <span>UNDO</span>
        </button>

        <button
          type="button"
          onClick={handleModeButton}
          className={`${styles.btn} ${styles.bracket} ${
            isWalk || placingWalkSpawn ? styles.btnWalkActive : ''
          }`}
        >
          <span className={styles.brBL} />
          <span className={styles.brBR} />
          <span className={styles.btnIcon}>
            {isWalk ? '\u2295' : placingWalkSpawn ? '\u2715' : '\u25CE'}
          </span>
          <span>
            {isWalk
              ? 'WALK MODE'
              : placingWalkSpawn
                ? 'CANCEL'
                : 'ORBIT MODE'}
          </span>
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

      {/* ============== Bottom-center: Walk-spawn Placement Hint ============== */}
      {placingWalkSpawn && !isWalk && (
        <div className={`${styles.spawnHint} ${styles.bracket}`}>
          <span className={styles.brBL} />
          <span className={styles.brBR} />
          <span className={styles.spawnHintIcon} aria-hidden>
            {'\u25CE'}
          </span>
          <span>CLICK ON THE FLOOR TO CHOOSE YOUR STARTING POINT</span>
          <span className={styles.spawnHintEsc}>ESC TO CANCEL</span>
        </div>
      )}

      {/* ============== Bottom-center: Object Placement Hint ============== */}
      {pendingAddType && !isWalk && (
        <div className={`${styles.spawnHint} ${styles.bracket}`}>
          <span className={styles.brBL} />
          <span className={styles.brBR} />
          <span className={styles.spawnHintIcon} aria-hidden>
            {'+'}
          </span>
          <span>
            CLICK ON THE FLOOR TO PLACE{' '}
            {pendingAddType.replace('_', ' ').toUpperCase()}
          </span>
          <span className={styles.spawnHintEsc}>ESC TO CANCEL</span>
        </div>
      )}

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

      {/* ============== Bottom-center: Save Toast ============== */}
      <div
        className={`${styles.saveToast} ${
          saveToast ? styles.saveToastVisible : ''
        } ${saveToastIsError ? styles.saveToastError : ''}`}
        role="status"
        aria-live="polite"
      >
        {saveToast ?? ''}
      </div>

      {/* ============== Bottom-center: Save & Share ============== */}
      <div
        className={`${styles.saveBtnWrap} ${
          isDirty ? styles.saveBtnVisible : styles.saveBtnHidden
        }`}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={styles.saveBtn}
        >
          {isSaving ? (
            <>
              <span className={styles.saveBtnSpinner} aria-hidden>
                {'\u25CC'}
              </span>
              <span>{'  SAVING...'}</span>
            </>
          ) : (
            <span>{'\uD83D\uDCBE  SAVE'}</span>
          )}
        </button>
      </div>
    </div>
  );
}
