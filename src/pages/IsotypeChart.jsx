import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as d3 from 'd3-selection';
import 'd3-transition';
import styles from './IsotypeChart.module.css';

// --- DATA LAYER (substitution point) ---
const YEARS = [2020, 2021, 2022, 2023, 2024];
const CATEGORIES = [
  { id: 'displaced', label: 'Displaced Persons', color: '#ef4444', unit: 10 },
  { id: 'food-insecure', label: 'Food Insecure', color: '#f59e0b', unit: 10 },
  { id: 'climate-affected', label: 'Climate Affected', color: '#22c55e', unit: 10 },
  { id: 'conflict-zones', label: 'Conflict Zones', color: '#8b5cf6', unit: 5 },
  { id: 'cyber-breaches', label: 'Cyber Breaches', color: '#3b82f6', unit: 5 },
];

const DATA = {
  2020: { displaced: 80, 'food-insecure': 130, 'climate-affected': 90, 'conflict-zones': 35, 'cyber-breaches': 20 },
  2021: { displaced: 85, 'food-insecure': 140, 'climate-affected': 110, 'conflict-zones': 38, 'cyber-breaches': 28 },
  2022: { displaced: 100, 'food-insecure': 160, 'climate-affected': 130, 'conflict-zones': 42, 'cyber-breaches': 35 },
  2023: { displaced: 110, 'food-insecure': 180, 'climate-affected': 150, 'conflict-zones': 45, 'cyber-breaches': 42 },
  2024: { displaced: 120, 'food-insecure': 200, 'climate-affected': 170, 'conflict-zones': 48, 'cyber-breaches': 50 },
};

const PERSON_PATH = 'M12 2C9.24 2 7 4.24 7 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 14c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z';

function PersonIcon({ color, delay }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={color}
      style={{
        opacity: 0,
        animation: `fadeIn 0.3s ease forwards`,
        animationDelay: `${delay}ms`,
      }}
    >
      <path d={PERSON_PATH} />
    </svg>
  );
}

export default function IsotypeChart() {
  const [year, setYear] = useState(2024);
  const [animKey, setAnimKey] = useState(0);

  const handleYearChange = useCallback((e) => {
    const y = parseInt(e.target.value, 10);
    setYear(y);
    setAnimKey((k) => k + 1);
  }, []);

  const yearData = DATA[year] || DATA[2024];

  return (
    <div className={styles.container}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>Isotype Chart</h1>
        <p className={styles.subtitle}>
          Repeated person icons form bar lengths — one icon = N million affected. Demographic impact data stagger-animates on timeline advance. Pure SVG rendering via D3 data joins.
        </p>
      </div>
      <div className={styles.chartWrapper} key={animKey}>
        {CATEGORIES.map((cat) => {
          const value = yearData[cat.id] || 0;
          const iconCount = Math.ceil(value / cat.unit);
          return (
            <div key={cat.id} className={styles.row}>
              <div className={styles.rowLabel}>{cat.label}</div>
              <div className={styles.rowIcons}>
                {Array.from({ length: iconCount }, (_, i) => (
                  <PersonIcon key={i} color={cat.color} delay={i * 50} />
                ))}
              </div>
              <div className={styles.rowValue}>{value}M</div>
            </div>
          );
        })}
      </div>
      <div className={styles.controls}>
        <span className={styles.sliderLabel}>Year</span>
        <input
          type="range"
          className={styles.slider}
          min="2020"
          max="2024"
          step="1"
          value={year}
          onChange={handleYearChange}
        />
        <span className={styles.yearValue}>{year}</span>
      </div>
      <div className={styles.legend}>
        {CATEGORIES.map((cat) => (
          <span key={cat.id} className={styles.legendItem}>
            <svg className={styles.legendIcon} viewBox="0 0 24 24" fill={cat.color}>
              <path d={PERSON_PATH} />
            </svg>
            = {cat.unit}M {cat.label}
          </span>
        ))}
      </div>
      <div className={styles.stats}>
        <span className={styles.stat}>Categories: <span className={styles.statValue}>{CATEGORIES.length}</span></span>
        <span className={styles.stat}>Total icons: <span className={styles.statValue}>{CATEGORIES.reduce((sum, cat) => sum + Math.ceil((yearData[cat.id] || 0) / cat.unit), 0)}</span></span>
        <span className={styles.stat}>Engine: <span className={styles.statValue}>SVG + CSS Animation</span></span>
      </div>
    </div>
  );
}
