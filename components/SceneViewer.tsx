'use client';

import { useState, useCallback, useEffect } from 'react';
import ThreeScene from './ThreeScene';
import { SceneFile } from '@/types/scene';
import styles from './SceneViewer.module.css';

interface Props {
  sceneData: SceneFile;
}

export default function SceneViewer({ sceneData }: Props) {
  const [mode, setMode] = useState<'walk' | 'orbit'>('orbit');
  const [copied, setCopied] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);

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
  const objectCount = sceneData.configuration.objects.length;
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
      <ThreeScene sceneData={sceneData} mode={mode} />

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
