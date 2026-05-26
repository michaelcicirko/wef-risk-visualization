import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import asciichart from 'asciichart';
import styles from './ASCIITerminal.module.css';

// --- DATA LAYER (substitution point) ---
const RISK_SERIES = {
  'Geopolitical': [3.2, 3.5, 3.8, 4.1, 4.0, 4.3, 4.6, 4.9, 5.1, 5.4, 5.2, 5.6, 5.8, 6.0, 6.3],
  'Environmental': [2.8, 3.0, 3.2, 3.5, 3.9, 4.2, 4.5, 4.8, 5.0, 5.3, 5.6, 5.9, 6.2, 6.5, 6.8],
  'Technological': [2.0, 2.3, 2.5, 2.8, 3.1, 3.5, 3.9, 4.3, 4.7, 5.0, 5.4, 5.7, 6.0, 6.2, 6.5],
};

// Simplified continent outlines in lat/lon for ASCII projection
const CONTINENTS = [
  // Africa
  [[35,  -5], [37, 10], [32, 32], [10, 42], [0, 35], [-5, 20], [-35, 25], [-35, 18], [-22, 15], [5, -15], [15, -17], [35, -5]],
  // Europe
  [[36, -10], [43, -9], [48, -5], [51, 3], [55, 10], [60, 25], [70, 28], [65, 40], [55, 40], [48, 30], [45, 15], [40, 25], [36, -10]],
  // Asia
  [[65, 40], [70, 60], [75, 100], [70, 130], [55, 135], [45, 140], [35, 130], [25, 120], [20, 105], [10, 100], [5, 80], [25, 60], [35, 45], [45, 40], [65, 40]],
  // North America
  [[70, -160], [65, -130], [50, -125], [48, -90], [30, -85], [25, -100], [15, -90], [30, -115], [35, -120], [50, -130], [60, -140], [70, -160]],
  // South America
  [[10, -75], [5, -60], [-5, -35], [-15, -40], [-25, -50], [-35, -58], [-55, -68], [-50, -75], [-35, -72], [-20, -70], [-5, -80], [10, -75]],
  // Australia
  [[-12, 130], [-18, 142], [-25, 150], [-35, 148], [-38, 144], [-33, 115], [-22, 114], [-12, 130]],
];

const GLOBE_WIDTH = 60;
const GLOBE_HEIGHT = 30;
const CHARS = ' .:-=+*#%@';

function renderGlobe(rotation) {
  const lines = [];
  for (let y = 0; y < GLOBE_HEIGHT; y++) {
    let line = '';
    for (let x = 0; x < GLOBE_WIDTH; x++) {
      const lon = ((x / GLOBE_WIDTH) * 360 - 180 + rotation) % 360 - 180;
      const lat = 90 - (y / GLOBE_HEIGHT) * 180;

      // Check if point is on sphere (circular mask)
      const nx = (x / GLOBE_WIDTH) * 2 - 1;
      const ny = (y / GLOBE_HEIGHT) * 2 - 1;
      const dist = nx * nx + ny * ny;

      if (dist > 1) {
        line += ' ';
        continue;
      }

      // Check if near any continent
      let onLand = false;
      for (const cont of CONTINENTS) {
        if (pointInPolygon(lat, lon, cont)) {
          onLand = true;
          break;
        }
      }

      if (onLand) {
        const shade = Math.floor((1 - dist) * 6) + 3;
        line += CHARS[Math.min(shade, CHARS.length - 1)];
      } else {
        const shade = Math.floor((1 - dist) * 3);
        line += CHARS[Math.min(shade, CHARS.length - 1)];
      }
    }
    lines.push(line);
  }
  return lines.join('\n');
}

function pointInPolygon(lat, lon, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

export default function ASCIITerminal() {
  const [globeFrame, setGlobeFrame] = useState('');
  const [fps, setFps] = useState(0);
  const animRef = useRef(null);
  const rotationRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsTime = useRef(Date.now());

  useEffect(() => {
    let running = true;

    function tick() {
      if (!running) return;
      rotationRef.current += 1.5;
      const frame = renderGlobe(rotationRef.current);
      setGlobeFrame(frame);

      frameCountRef.current++;
      const now = Date.now();
      if (now - lastFpsTime.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTime.current = now;
      }

      animRef.current = requestAnimationFrame(tick);
    }

    tick();
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const chart1 = asciichart.plot(RISK_SERIES['Geopolitical'], {
    height: 8,
    padding: '      ',
  });

  const chart2 = asciichart.plot(RISK_SERIES['Environmental'], {
    height: 8,
    padding: '      ',
  });

  const chart3 = asciichart.plot(RISK_SERIES['Technological'], {
    height: 8,
    padding: '      ',
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>ASCII Terminal</h1>
        <p className={styles.subtitle}>
          Retro terminal aesthetic: rotating ASCII globe with equirectangular-to-character projection alongside ascii-chart risk time series. CRT scanline overlay with phosphor green palette.
        </p>
      </div>
      <div className={styles.terminalWindow}>
        <div className={styles.terminalTitleBar}>
          <span className={`${styles.terminalDot} ${styles.terminalDotRed}`} />
          <span className={`${styles.terminalDot} ${styles.terminalDotYellow}`} />
          <span className={`${styles.terminalDot} ${styles.terminalDotGreen}`} />
          <span className={styles.terminalTitle}>wef-risk-monitor — bash — 120×40</span>
        </div>
        <div className={styles.terminalBody}>
          <div className={styles.globePanel}>
            <div className={styles.panelLabel}>── Global Risk Monitor ──</div>
            <pre className={styles.asciiPre}>{globeFrame}</pre>
          </div>
          <div className={styles.chartPanel}>
            <div className={styles.panelLabel}>── Geopolitical Risk (2010–2024) ──</div>
            <pre className={styles.chartPre}>{chart1}</pre>
            <div className={styles.panelLabel}>── Environmental Risk (2010–2024) ──</div>
            <pre className={styles.chartPre}>{chart2}</pre>
            <div className={styles.panelLabel}>── Technological Risk (2010–2024) ──</div>
            <pre className={styles.chartPre}>{chart3}</pre>
          </div>
        </div>
      </div>
      <div className={styles.stats}>
        <span className={styles.stat}>Globe FPS: <span className={styles.statValue}>{fps}</span></span>
        <span className={styles.stat}>Resolution: <span className={styles.statValue}>{GLOBE_WIDTH}×{GLOBE_HEIGHT}</span></span>
        <span className={styles.stat}>Engine: <span className={styles.statValue}>Custom ASCII + asciichart</span></span>
      </div>
    </div>
  );
}
