import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as Plot from '@observablehq/plot';
import styles from './HighDensityTelemetry.module.css';

const POINT_COUNT = 1_000_000;

function generateDensityData(count) {
  const data = [];
  const clusterCount = 6;
  const clusters = Array.from({ length: clusterCount }, () => ({
    cx: Math.random() * 800 + 100,
    cy: Math.random() * 400 + 50,
    sx: 20 + Math.random() * 60,
    sy: 15 + Math.random() * 40,
  }));

  for (let i = 0; i < count; i++) {
    const c = clusters[Math.floor(Math.random() * clusterCount)];
    data.push({
      x: c.cx + (Math.random() + Math.random() + Math.random() - 1.5) * c.sx,
      y: c.cy + (Math.random() + Math.random() + Math.random() - 1.5) * c.sy,
    });
  }
  return data;
}

export default function HighDensityTelemetry() {
  const wrapperRef = useRef(null);
  const plotRef = useRef(null);
  const [generating, setGenerating] = useState(true);
  const [pointCount, setPointCount] = useState(0);
  const [renderTime, setRenderTime] = useState(0);

  const render = useCallback(() => {
    if (!plotRef.current || !wrapperRef.current) return;

    const t0 = performance.now();
    const data = generateDensityData(POINT_COUNT);
    setPointCount(data.length);

    const width = wrapperRef.current.clientWidth;
    const height = wrapperRef.current.clientHeight;

    const plot = Plot.plot({
      width,
      height,
      style: {
        background: '#080812',
        color: '#e0e0e0',
      },
      color: {
        scheme: 'turbo',
      },
      marks: [
        Plot.density(data, {
          x: 'x',
          y: 'y',
          bandwidth: 15,
          fill: 'density',
          thresholds: 20,
        }),
        Plot.dot(data.slice(0, 5000), {
          x: 'x',
          y: 'y',
          r: 0.5,
          fill: '#00d2ff',
          opacity: 0.15,
        }),
      ],
      x: { label: 'Barometric Pressure (hPa)' },
      y: { label: 'Wind Speed (m/s)' },
    });

    const elapsed = performance.now() - t0;
    setRenderTime(Math.round(elapsed));

    plotRef.current.innerHTML = '';
    plotRef.current.appendChild(plot);
    setGenerating(false);
  }, []);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      render();
    });
    return () => {
      cancelAnimationFrame(timer);
      if (plotRef.current) plotRef.current.innerHTML = '';
    };
  }, [render]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>High-Density Telemetry</h1>
        <p className={styles.subtitle}>
          1M+ simulated barometric readings rendered as a density heatmap with Observable Plot. Cyclone event clusters emerge from the noise.
        </p>
      </div>
      <div className={styles.chartWrapper} ref={wrapperRef}>
        {generating && <div className={styles.loading}>Generating 1M data points…</div>}
        <div ref={plotRef} style={{ position: 'absolute', inset: 0 }} />
      </div>
      <div className={styles.stats}>
        <span className={styles.stat}>Points: <span className={styles.statValue}>{pointCount.toLocaleString()}</span></span>
        <span className={styles.stat}>Render: <span className={styles.statValue}>{renderTime}ms</span></span>
        <span className={styles.stat}>Engine: <span className={styles.statValue}>Observable Plot</span></span>
      </div>
    </div>
  );
}
