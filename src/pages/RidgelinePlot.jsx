import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleLinear } from 'd3-scale';
import { riskData, categoryColors } from '../data/risks.js';
import styles from './RidgelinePlot.module.css';

const SVG_W = 860;
const MARGIN = { top: 20, right: 140, bottom: 40, left: 130 };
const W = SVG_W - MARGIN.left - MARGIN.right;

const YEARS = [2026, 2028, 2036];
const CATEGORIES = ['geopolitical', 'economic', 'societal', 'technological', 'environmental'];
const YEAR_OPACITY = { 2026: 0.55, 2028: 0.7, 2036: 0.9 };
const YEAR_LABELS = { 2026: '2026', 2028: '2028', 2036: '2036' };

// All possible risk IDs across all years
const ALL_RISK_IDS = [...new Set(
  Object.values(riskData).flatMap(arr => arr.map(r => r.id))
)];

// X positions: evenly spaced across W for risk items (treat as ordinal)
const RISK_X_STEP = W / (ALL_RISK_IDS.length + 1);

// For each category + year: build a mini ridge
// We only include risks that belong to the category in any year
function buildRidge(category, year) {
  const yearRisks = riskData[year] || [];
  // Risks in this category for this year
  const catRisks = yearRisks.filter(r => r.category === category);

  // Build score lookup for all risks in category
  const scoreMap = {};
  catRisks.forEach(r => { scoreMap[r.id] = r.value; });

  // X positions: only use the risk ids that ever appear in this category
  const catIds = [...new Set(
    Object.values(riskData).flatMap(arr =>
      arr.filter(r => r.category === category).map(r => r.id)
    )
  )].sort();

  const points = catIds.map((id, i) => ({
    id,
    x: (i / (catIds.length - 1 || 1)) * W,
    score: scoreMap[id] ?? 0,
  }));

  return points;
}

// Build SVG path for a ridge using catmull-rom style smoothing
function buildAreaPath(points, yScale, rowH, ridge = false) {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    const y = yScale(p.score);
    return `M ${p.x} ${rowH} L ${p.x} ${y} L ${p.x} ${rowH} Z`;
  }

  // Top edge: smooth cubic bezier through points
  const pts = points.map(p => [p.x, yScale(p.score)]);
  const bottom = rowH;

  let d = `M ${pts[0][0]} ${bottom} L ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const x0 = pts[i][0], y0 = pts[i][1];
    const x1 = pts[i + 1][0], y1 = pts[i + 1][1];
    const cpx = (x0 + x1) / 2;
    d += ` C ${cpx} ${y0} ${cpx} ${y1} ${x1} ${y1}`;
  }
  d += ` L ${pts[pts.length - 1][0]} ${bottom} Z`;
  return d;
}

// Pre-compute category risk id sets
const CAT_IDS = {};
CATEGORIES.forEach(cat => {
  CAT_IDS[cat] = [...new Set(
    Object.values(riskData).flatMap(arr =>
      arr.filter(r => r.category === cat).map(r => r.id)
    )
  )].sort();
});

// Row height and overlap
const ROW_H = 90;
const OVERLAP = 28;
const SVG_H = MARGIN.top + CATEGORIES.length * (ROW_H - OVERLAP) + OVERLAP + MARGIN.bottom + 30;

function RidgelinePlot() {
  const revealRef = useRef(0);
  // revealCount: 0 = nothing, 1..3 = years revealed per row, progressing row by row
  // We reveal: all rows year 2026, then all rows year 2028, then all rows year 2036
  const [revealPhase, setRevealPhase]   = useState(0); // 0,1,2 = year index revealed so far
  const [isPlaying, setIsPlaying]       = useState(true);
  const [hoveredCat, setHoveredCat]     = useState(null);
  const [hoveredYear, setHoveredYear]   = useState(null);

  const [phaseDelay, setPhaseDelay]     = useState(900);
  const [initialHold, setInitialHold]   = useState(600);
  const [timingInputs, setTimingInputs] = useState({ phaseDelay: 900, initialHold: 600 });

  // Animation: reveal one year-layer at a time across all rows
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;

    const advance = () => {
      if (revealRef.current >= YEARS.length) { setIsPlaying(false); return; }
      revealRef.current += 1;
      setRevealPhase(revealRef.current);
      timeoutId = setTimeout(advance, phaseDelay);
    };

    timeoutId = setTimeout(advance, initialHold);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, phaseDelay, initialHold]);

  const handleReplay = useCallback(() => {
    setIsPlaying(false);
    revealRef.current = 0;
    setRevealPhase(0);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  // Y scale: 0–10 scores mapped to 0–(ROW_H - 8)px upward
  const yScale = useMemo(() =>
    scaleLinear().domain([0, 10]).range([0, ROW_H - 8]),
    []
  );

  const visibleYears = YEARS.slice(0, revealPhase);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Ridgeline Plot — WEF Risk Score Profiles</h1>
        <p className={styles.subtitle}>
          Each row is a risk category. Within each row, curves show how individual risk scores are
          distributed across that category for 2026, 2028, and 2036. Darker, taller peaks = higher
          severity. The shift from geopolitical dominance to environmental in 2036 is clearly visible.
        </p>
      </header>

      <main className={styles.main}>
        {/* Year legend */}
        <div className={styles.yearLegend}>
          {YEARS.map((y, i) => {
            const color = Object.values(categoryColors)[i % 5];
            return (
              <div
                key={y}
                className={`${styles.yearBadge} ${hoveredYear === y ? styles.yearBadgeActive : ''}`}
                onMouseEnter={() => setHoveredYear(y)}
                onMouseLeave={() => setHoveredYear(null)}
              >
                <span
                  className={styles.yearBadgeSwatch}
                  style={{ opacity: YEAR_OPACITY[y] }}
                />
                <span>{y}</span>
                {i < revealPhase
                  ? <span className={styles.yearBadgeDot} style={{ background: '#00ff88' }} />
                  : <span className={styles.yearBadgeDot} style={{ background: '#3a3a5a' }} />}
              </div>
            );
          })}
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            onMouseLeave={() => { setHoveredCat(null); setHoveredYear(null); }}
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

              {/* Rows per category */}
              {CATEGORIES.map((cat, rowIdx) => {
                const rowY = rowIdx * (ROW_H - OVERLAP);
                const baseY = rowY + ROW_H;
                const color = categoryColors[cat];
                const isHov = hoveredCat === cat;
                const dimmed = hoveredCat && !isHov;

                const catIds = CAT_IDS[cat];

                return (
                  <g
                    key={cat}
                    transform={`translate(0, ${rowY})`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredCat(cat)}
                    onMouseLeave={() => setHoveredCat(null)}
                  >
                    {/* Row baseline */}
                    <line
                      x1={0} x2={W}
                      y1={ROW_H} y2={ROW_H}
                      stroke={color}
                      strokeWidth={1}
                      strokeOpacity={dimmed ? 0.1 : 0.3}
                    />

                    {/* Year ridges — back to front (2026 first) */}
                    <AnimatePresence>
                      {visibleYears.map((year, yi) => {
                        const points = buildRidge(cat, year);
                        if (points.length === 0) return null;

                        // Rescale y: convert score to upward px from baseline
                        const scaledPoints = points.map(p => ({
                          ...p,
                          score: p.score,
                        }));

                        const path = buildAreaPath(
                          scaledPoints,
                          s => ROW_H - yScale(s),
                          ROW_H
                        );

                        const isYearHov = hoveredYear === year;
                        const opacity = dimmed ? 0.07
                          : (hoveredYear && !isYearHov) ? 0.2
                          : YEAR_OPACITY[year];

                        return (
                          <motion.path
                            key={`${cat}-${year}`}
                            d={path}
                            fill={color}
                            fillOpacity={opacity}
                            stroke={color}
                            strokeWidth={isYearHov ? 2 : 1}
                            strokeOpacity={dimmed ? 0.07 : isYearHov ? 0.9 : 0.5}
                            initial={{ scaleY: 0, opacity: 0 }}
                            animate={{ scaleY: 1, opacity: 1, fillOpacity: opacity }}
                            exit={{ scaleY: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 160, damping: 22, delay: rowIdx * 0.04 }}
                            style={{ transformOrigin: `0px ${ROW_H}px` }}
                          />
                        );
                      })}
                    </AnimatePresence>

                    {/* Category label */}
                    <text
                      x={-10}
                      y={ROW_H - 10}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontSize={11}
                      fontWeight={isHov ? 700 : 500}
                      fill={dimmed ? '#3a3a5a' : color}
                      style={{ userSelect: 'none', transition: 'fill 0.2s', textTransform: 'capitalize' }}
                    >{cat.charAt(0).toUpperCase() + cat.slice(1)}</text>

                    {/* Score labels for hovered category */}
                    {isHov && visibleYears.length > 0 && (() => {
                      const latestYear = visibleYears[visibleYears.length - 1];
                      const pts = buildRidge(cat, latestYear);
                      return pts.map(p => {
                        if (p.score === 0) return null;
                        const px = p.x;
                        const py = ROW_H - yScale(p.score) - 5;
                        return (
                          <text
                            key={p.id}
                            x={px}
                            y={py}
                            textAnchor="middle"
                            fontSize={8}
                            fill="#ffffff"
                            opacity={0.7}
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                          >{p.score}</text>
                        );
                      });
                    })()}
                  </g>
                );
              })}

              {/* X axis label */}
              <text
                x={W / 2}
                y={SVG_H - MARGIN.top - MARGIN.bottom + 10}
                textAnchor="middle"
                fontSize={10}
                fill="#5a5a8a"
                style={{ userSelect: 'none' }}
              >Individual risks within category (left = lower ranked, right = higher ranked)</text>

            </g>
          </svg>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <button className={styles.controlButton} onClick={() => setIsPlaying(p => !p)}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button className={styles.controlButton} onClick={handleReplay} disabled={isPlaying}>
            Replay
          </button>
        </div>

        {/* Timing controls */}
        <div className={styles.timingControls}>
          <div className={styles.timingGrid}>
            <div className={styles.timingField}>
              <label>Initial Hold (ms)</label>
              <input type="number" value={timingInputs.initialHold}
                onChange={e => setTimingInputs(p => ({ ...p, initialHold: parseInt(e.target.value) || 0 }))}
                min="0" max="5000" step="100" />
            </div>
            <div className={styles.timingField}>
              <label>Layer Reveal (ms)</label>
              <input type="number" value={timingInputs.phaseDelay}
                onChange={e => setTimingInputs(p => ({ ...p, phaseDelay: parseInt(e.target.value) || 0 }))}
                min="200" max="5000" step="100" />
            </div>
          </div>
          <button className={styles.confirmButton} onClick={() => {
            setInitialHold(timingInputs.initialHold);
            setPhaseDelay(timingInputs.phaseDelay);
          }}>Confirm</button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025 — Short-term and Long-term Outlooks</p>
        </footer>
      </main>
    </div>
  );
}

export default RidgelinePlot;
