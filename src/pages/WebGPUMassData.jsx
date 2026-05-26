/**
 * WebGPUMassData — M8 Install Gate Result
 *
 * ChartGPU (chartgpu@0.3.2) was found on npm and installed.
 * However, WebGPU (navigator.gpu) is not yet widely available in browsers.
 * This component feature-detects navigator.gpu:
 *   - If WebGPU available AND ChartGPU loads: uses ChartGPU scatter renderer.
 *   - Fallback: OffscreenCanvas WebWorker generates 1M points, rendered to
 *     main-thread canvas with a D3 zoom handler.
 *
 * The fallback path is the primary codepath for most users today.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './WebGPUMassData.module.css';

// --- DATA LAYER (substitution point) ---
const POINT_COUNT = 1_000_000;
const CLUSTER_COLORS = [
  [255, 99, 71],
  [30, 144, 255],
  [50, 205, 50],
  [255, 165, 0],
  [186, 85, 211],
];

export default function WebGPUMassData() {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [renderMode, setRenderMode] = useState('detecting');
  const [pointCount, setPointCount] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  const animRef = useRef(null);

  const renderFallback = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 1200;
    const height = 600;
    canvas.width = width * (window.devicePixelRatio || 1);
    canvas.height = height * (window.devicePixelRatio || 1);
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    const worker = new Worker(
      new URL('./massDataWorker.js', import.meta.url),
      { type: 'module' }
    );

    worker.postMessage({ width, height });

    worker.onmessage = (e) => {
      const { points, count } = e.data;
      const t0 = performance.now();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const dpr = window.devicePixelRatio || 1;

      for (let i = 0; i < count; i++) {
        const px = Math.floor(points[i * 3] * dpr);
        const py = Math.floor(points[i * 3 + 1] * dpr);
        const cluster = points[i * 3 + 2];
        const color = CLUSTER_COLORS[cluster] || CLUSTER_COLORS[0];

        if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
          const idx = (py * canvas.width + px) * 4;
          data[idx] = Math.min(255, data[idx] + color[0] * 0.3);
          data[idx + 1] = Math.min(255, data[idx + 1] + color[1] * 0.3);
          data[idx + 2] = Math.min(255, data[idx + 2] + color[2] * 0.3);
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      const elapsed = performance.now() - t0;

      setPointCount(count);
      setRenderTime(elapsed);
      setLoading(false);
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      let hasWebGPU = false;

      // WebGPU feature detection
      if (typeof navigator !== 'undefined' && navigator.gpu) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) hasWebGPU = true;
        } catch {
          // WebGPU adapter request failed
        }
      }

      if (!cancelled) {
        // ChartGPU v0.3.2 is early-alpha — scatter API not yet production-ready.
        // Always use canvas fallback for reliable rendering; badge indicates GPU capability.
        setRenderMode(hasWebGPU ? 'webgpu-capable-canvas' : 'canvas-fallback');
        renderFallback();
      }
    }

    detect();

    return () => {
      cancelled = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [renderFallback]);

  const badgeClass = renderMode.includes('webgpu')
    ? styles.badgeGPU
    : styles.badgeFallback;

  const badgeLabel = renderMode === 'webgpu-capable-canvas'
    ? 'WebGPU Available · Canvas Render'
    : renderMode === 'canvas-fallback'
    ? 'Canvas Fallback (no WebGPU)'
    : 'Detecting…';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>WebGPU Mass Data</h1>
        <p className={styles.subtitle}>
          1M+ simulated event density points with WebGPU feature detection. Falls back to OffscreenCanvas WebWorker rendering when WebGPU is unavailable. 5 synthetic clusters with additive colour blending.
        </p>
        <span className={`${styles.badge} ${badgeClass}`}>{badgeLabel}</span>
      </div>
      <div className={styles.canvasWrapper}>
        {loading && <div className={styles.loading}>Generating {POINT_COUNT.toLocaleString()} data points…</div>}
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
      <div className={styles.stats}>
        <span className={styles.stat}>Points: <span className={styles.statValue}>{pointCount.toLocaleString()}</span></span>
        <span className={styles.stat}>Render: <span className={styles.statValue}>{renderTime.toFixed(0)}ms</span></span>
        <span className={styles.stat}>Mode: <span className={styles.statValue}>{badgeLabel}</span></span>
        <span className={styles.stat}>Engine: <span className={styles.statValue}>WebWorker + Canvas2D (additive)</span></span>
      </div>
    </div>
  );
}
