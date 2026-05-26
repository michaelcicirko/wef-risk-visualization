import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as d3 from 'd3-scale';
import styles from './VDemRadarClean.module.css';

const INDICES = [
  { key: 'electoral', label: 'Electoral' },
  { key: 'liberal', label: 'Liberal' },
  { key: 'participatory', label: 'Participatory' },
  { key: 'deliberative', label: 'Deliberative' },
  { key: 'egalitarian', label: 'Egalitarian' },
  { key: 'accountability', label: 'Accountability' },
];

const COUNTRIES = [
  { name: 'Sweden', color: '#00d2ff' },
  { name: 'United States', color: '#f39c12' },
  { name: 'Brazil', color: '#2ecc71' },
  { name: 'India', color: '#e74c3c' },
];

const YEARS = Array.from({ length: 55 }, (_, i) => 1970 + i);

function generateCountryData() {
  const data = {};
  COUNTRIES.forEach((country) => {
    data[country.name] = {};
    const baseScores = INDICES.map(() => 0.3 + Math.random() * 0.5);
    YEARS.forEach((year, yi) => {
      data[country.name][year] = {};
      INDICES.forEach((idx, ii) => {
        let v = baseScores[ii] + (yi / YEARS.length) * (Math.random() * 0.3 - 0.1);
        v += (Math.random() - 0.5) * 0.05;
        data[country.name][year][idx.key] = Math.max(0, Math.min(1, v));
      });
    });
  });
  return data;
}

const ALL_DATA = generateCountryData();

function polarToCartesian(cx, cy, r, angle) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function RadarChart({ year, width, height }) {
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) * 0.38;
  const angleSlice = 360 / INDICES.length;
  const levels = 5;

  const gridLines = [];
  for (let l = 1; l <= levels; l++) {
    const r = (maxR / levels) * l;
    const points = INDICES.map((_, i) => polarToCartesian(cx, cy, r, i * angleSlice));
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
    gridLines.push(<path key={`grid-${l}`} d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />);
  }

  const axes = INDICES.map((idx, i) => {
    const angle = i * angleSlice;
    const end = polarToCartesian(cx, cy, maxR, angle);
    const labelPos = polarToCartesian(cx, cy, maxR + 20, angle);
    return (
      <g key={idx.key}>
        <line x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        <text
          x={labelPos.x}
          y={labelPos.y}
          fill="#7f8c8d"
          fontSize={11}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {idx.label}
        </text>
      </g>
    );
  });

  const polygons = COUNTRIES.map((country) => {
    const scores = ALL_DATA[country.name][year];
    if (!scores) return null;

    const points = INDICES.map((idx, i) => {
      const r = scores[idx.key] * maxR;
      return polarToCartesian(cx, cy, r, i * angleSlice);
    });

    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

    return (
      <g key={country.name}>
        <path d={d} fill={country.color} fillOpacity={0.1} stroke={country.color} strokeWidth={2} strokeOpacity={0.8} />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={country.color} />
        ))}
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={styles.radarSvg}>
      {gridLines}
      {axes}
      {polygons}
    </svg>
  );
}

export default function VDemRadarClean() {
  const [year, setYear] = useState(2020);

  const handleYearChange = useCallback((e) => {
    setYear(parseInt(e.target.value, 10));
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>V-Dem Democracy Radar</h1>
        <p className={styles.subtitle}>
          6 V-Dem democracy indices for 4 countries rendered as overlapping radar polygons. Advance the year to watch each country's democratic profile morph over time.
        </p>
      </div>
      <div className={styles.chartWrapper}>
        <RadarChart year={year} width={700} height={550} />
      </div>
      <div className={styles.controls}>
        <span className={styles.sliderLabel}>Year</span>
        <input
          type="range"
          className={styles.slider}
          min="1970"
          max="2024"
          step="1"
          value={year}
          onChange={handleYearChange}
        />
        <span className={styles.yearValue}>{year}</span>
      </div>
      <div className={styles.legend}>
        {COUNTRIES.map((c) => (
          <span key={c.name} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: c.color }} />
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}
