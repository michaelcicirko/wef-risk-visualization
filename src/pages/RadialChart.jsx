import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { riskData, categoryColors, YEAR_MIN, YEAR_MAX, YEAR_MID } from '../data/risks.js';
import styles from './RadialChart.module.css';

const YEARS = [YEAR_MIN, YEAR_MID, YEAR_MAX];

const CATEGORY_LABELS = {
  geopolitical:  'Geopolitical',
  environmental: 'Environmental',
  societal:      'Societal',
  technological: 'Technological',
  economic:      'Economic',
};

// Score per category for a given year: sum of (11 - rank)
function getCategoryScores(year) {
  const risks = riskData[year] || [];
  const scores = {};
  risks.forEach(r => {
    scores[r.category] = (scores[r.category] || 0) + (11 - r.rank);
  });
  return scores;
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

// SVG donut parameters
const CX = 260;
const CY = 240;
const R_OUTER = 190;
const R_INNER = 100;
const SVG_W = 680;
const SVG_H = 480;
const GAP_ANGLE = 0.03; // radians between slices

// Convert polar to cartesian
function polar(cx, cy, r, angleRad) {
  return [
    cx + r * Math.cos(angleRad - Math.PI / 2),
    cy + r * Math.sin(angleRad - Math.PI / 2),
  ];
}

// Build SVG arc path for a donut slice
function arcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const s = startAngle + GAP_ANGLE / 2;
  const e = endAngle - GAP_ANGLE / 2;
  if (e <= s) return '';
  const largeArc = e - s > Math.PI ? 1 : 0;
  const [ox1, oy1] = polar(cx, cy, rOuter, s);
  const [ox2, oy2] = polar(cx, cy, rOuter, e);
  const [ix1, iy1] = polar(cx, cy, rInner, e);
  const [ix2, iy2] = polar(cx, cy, rInner, s);
  return [
    `M ${ox1} ${oy1}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${ix2} ${iy2}`,
    'Z',
  ].join(' ');
}

// Build slices for a given year's scores
function buildSlices(year) {
  const scores = getCategoryScores(year);
  const total = ALL_CATEGORIES.reduce((s, c) => s + (scores[c] || 0), 0);
  let angle = 0;
  return ALL_CATEGORIES.map(cat => {
    const score = scores[cat] || 0;
    const sweep = total > 0 ? (score / total) * 2 * Math.PI : 0;
    const startAngle = angle;
    const endAngle = angle + sweep;
    const midAngle = startAngle + sweep / 2;
    angle = endAngle;
    const [lx, ly] = polar(CX, CY, R_OUTER + 22, midAngle);
    return {
      cat, score, startAngle, endAngle, midAngle,
      path: arcPath(CX, CY, R_OUTER, R_INNER, startAngle, endAngle),
      labelX: lx,
      labelY: ly,
      labelAnchor: Math.cos(midAngle - Math.PI / 2) > 0 ? 'start' : 'end',
    };
  });
}

// Pre-build slices for all years
const SLICES_BY_YEAR = {};
YEARS.forEach(y => { SLICES_BY_YEAR[y] = buildSlices(y); });

function RadialChart() {
  const yearIndexRef = useRef(0);

  const [yearIndex, setYearIndex]     = useState(0);
  const [isPlaying, setIsPlaying]     = useState(true);
  const [flashingCat, setFlashingCat] = useState(null);
  const [hoveredCat, setHoveredCat]   = useState(null);

  const [holdDuration, setHoldDuration] = useState(2400);
  const [initialHold, setInitialHold]   = useState(800);
  const [timingInputs, setTimingInputs] = useState({ holdDuration: 2400, initialHold: 800 });

  const currentYear  = YEARS[yearIndex];
  const slices       = SLICES_BY_YEAR[currentYear];
  const scores       = getCategoryScores(currentYear);
  const total        = ALL_CATEGORIES.reduce((s, c) => s + (scores[c] || 0), 0);

  // ── Animation: cycle through years ──
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;

    const advance = () => {
      const next = yearIndexRef.current + 1;
      if (next >= YEARS.length) {
        setIsPlaying(false);
        return;
      }
      yearIndexRef.current = next;
      setYearIndex(next);
      setFlashingCat('all');
      setTimeout(() => setFlashingCat(null), 450);
      timeoutId = setTimeout(advance, holdDuration);
    };

    timeoutId = setTimeout(advance, yearIndex === 0 ? initialHold : holdDuration);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, holdDuration, initialHold, yearIndex]);

  // ── Replay ──
  const handleReplay = useCallback(() => {
    setIsPlaying(false);
    yearIndexRef.current = 0;
    setYearIndex(0);
    setFlashingCat(null);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  // ── Scrub ──
  const handleScrub = useCallback((idx) => {
    setIsPlaying(false);
    yearIndexRef.current = idx;
    setYearIndex(idx);
    setFlashingCat(null);
  }, []);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Radial / Donut Chart</h1>
        <p className={styles.subtitle}>Example: Category share of total risk score — arc area encodes proportion, animated between time states</p>
      </header>

      <main className={styles.main}>
        {/* Year pills */}
        <div className={styles.yearDisplay}>
          {YEARS.map((y, i) => (
            <button
              key={y}
              className={`${styles.yearPill} ${i === yearIndex ? styles.yearPillActive : ''}`}
              onClick={() => handleScrub(i)}
            >{y}</button>
          ))}
        </div>

        {/* Chart + legend side by side */}
        <div className={styles.chartRow}>
          <div className={styles.chartWrapper}>
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className={styles.svg}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Slices */}
              {slices.map(slice => {
                const isFlashing = flashingCat === 'all';
                const isHovered  = hoveredCat === slice.cat;
                const color = categoryColors[slice.cat] || '#5a5a8a';
                const rOuter = isHovered ? R_OUTER + 10 : R_OUTER;

                return (
                  <g key={slice.cat}
                    onMouseEnter={() => setHoveredCat(slice.cat)}
                    onMouseLeave={() => setHoveredCat(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <motion.path
                      d={arcPath(CX, CY, rOuter, R_INNER, slice.startAngle, slice.endAngle)}
                      fill={isFlashing ? '#ff00ff' : color}
                      opacity={hoveredCat && !isHovered ? 0.45 : 0.88}
                      animate={{
                        d: arcPath(CX, CY, rOuter, R_INNER, slice.startAngle, slice.endAngle),
                        fill: isFlashing ? '#ff00ff' : color,
                      }}
                      transition={{ duration: 0.85, ease: [0.34, 1.2, 0.64, 1] }}
                      stroke="#0d0d1a"
                      strokeWidth={2}
                    />
                    {/* Label line + text — only for larger slices */}
                    {slice.endAngle - slice.startAngle > 0.3 && (
                      <motion.g
                        animate={{ opacity: 1 }}
                        initial={{ opacity: 0 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                      >
                        <line
                          x1={polar(CX, CY, R_OUTER + 4, slice.midAngle)[0]}
                          y1={polar(CX, CY, R_OUTER + 4, slice.midAngle)[1]}
                          x2={polar(CX, CY, R_OUTER + 18, slice.midAngle)[0]}
                          y2={polar(CX, CY, R_OUTER + 18, slice.midAngle)[1]}
                          stroke={color}
                          strokeWidth={1.5}
                          opacity={0.7}
                        />
                        <text
                          x={slice.labelX}
                          y={slice.labelY}
                          textAnchor={slice.labelAnchor}
                          dominantBaseline="middle"
                          fill={color}
                          fontSize={11}
                          fontWeight={600}
                        >
                          {CATEGORY_LABELS[slice.cat]}
                        </text>
                      </motion.g>
                    )}
                  </g>
                );
              })}

              {/* Centre label */}
              <text x={CX} y={CY - 14} textAnchor="middle" fill="#ffffff" fontSize={38} fontWeight={900}>
                {total}
              </text>
              <text x={CX} y={CY + 16} textAnchor="middle" fill="#7f8c8d" fontSize={12}>
                total score
              </text>
              <text x={CX} y={CY + 34} textAnchor="middle" fill="#5a5a8a" fontSize={11}>
                {currentYear}
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            {slices.map(slice => {
              const pct = total > 0 ? ((slice.score / total) * 100).toFixed(1) : '0.0';
              const isHovered = hoveredCat === slice.cat;
              return (
                <div
                  key={slice.cat}
                  className={`${styles.legendItem} ${isHovered ? styles.legendItemHovered : ''}`}
                  onMouseEnter={() => setHoveredCat(slice.cat)}
                  onMouseLeave={() => setHoveredCat(null)}
                >
                  <span className={styles.legendSwatch} style={{ background: categoryColors[slice.cat] }} />
                  <div className={styles.legendText}>
                    <span className={styles.legendName}>{CATEGORY_LABELS[slice.cat]}</span>
                    <div className={styles.legendBar}>
                      <motion.div
                        className={styles.legendBarFill}
                        animate={{ width: `${pct}%`, background: categoryColors[slice.cat] }}
                        transition={{ duration: 0.85, ease: 'easeInOut' }}
                      />
                    </div>
                  </div>
                  <div className={styles.legendValues}>
                    <span className={styles.legendScore}>{slice.score}</span>
                    <span className={styles.legendPct}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
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
                min="200" max="5000" step="100" />
            </div>
            <div className={styles.timingField}>
              <label>Year Hold (ms)</label>
              <input type="number" value={timingInputs.holdDuration}
                onChange={e => setTimingInputs(p => ({ ...p, holdDuration: parseInt(e.target.value) || 0 }))}
                min="500" max="10000" step="100" />
            </div>
          </div>
          <button className={styles.confirmButton} onClick={() => {
            setInitialHold(timingInputs.initialHold);
            setHoldDuration(timingInputs.holdDuration);
          }}>Confirm</button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Example data: WEF Global Risks Perception Survey</p>
        </footer>
      </main>
    </div>
  );
}

export default RadialChart;
