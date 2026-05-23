import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleLinear, scaleSqrt } from 'd3-scale';
import { riskData, categoryColors, YEAR_MIN, YEAR_MAX, YEAR_MID } from '../data/risks.js';
import styles from './BubbleChart.module.css';

const YEARS = [YEAR_MIN, YEAR_MID, YEAR_MAX];

// Aggregate category scores per year: sum of (11 - rank) so rank 1 = 10 pts
function getCategoryScores(year) {
  const risks = riskData[year] || [];
  const scores = {};
  risks.forEach(r => {
    scores[r.category] = (scores[r.category] || 0) + (11 - r.rank);
  });
  return scores;
}

// All categories across all years
const ALL_CATEGORIES = [...new Set(
  Object.values(riskData).flatMap(yr => yr.map(r => r.category))
)];

// Pre-compute scores for each year
const SCORES_BY_YEAR = {};
YEARS.forEach(y => { SCORES_BY_YEAR[y] = getCategoryScores(y); });

// Fixed bubble positions (arranged in a nice cluster)
const BUBBLE_POSITIONS = {
  geopolitical:  { x: 310, y: 175 },
  environmental: { x: 520, y: 200 },
  societal:      { x: 415, y: 310 },
  technological: { x: 240, y: 310 },
  economic:      { x: 540, y: 330 },
};

const SVG_W = 760;
const SVG_H = 480;

// Max possible score for scale
const MAX_SCORE = Math.max(
  ...YEARS.flatMap(y => Object.values(SCORES_BY_YEAR[y]))
);

const rScale = scaleSqrt().domain([0, MAX_SCORE]).range([0, 110]);

const CATEGORY_LABELS = {
  geopolitical:  'Geopolitical',
  environmental: 'Environmental',
  societal:      'Societal',
  technological: 'Technological',
  economic:      'Economic',
};

function BubbleChart() {
  const yearIndexRef = useRef(0);

  const [yearIndex, setYearIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [flashingCat, setFlashingCat] = useState(null);

  const [holdDuration, setHoldDuration]   = useState(2200);
  const [initialHold, setInitialHold]     = useState(800);
  const [timingInputs, setTimingInputs]   = useState({ holdDuration: 2200, initialHold: 800 });

  const currentYear  = YEARS[yearIndex];
  const scores       = SCORES_BY_YEAR[currentYear];

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
      // Flash all bubbles on transition
      setFlashingCat('all');
      setTimeout(() => setFlashingCat(null), 400);
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
  const handleScrub = useCallback((val) => {
    setIsPlaying(false);
    const idx = parseInt(val);
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
        <h1 className={styles.title}>Bubble Chart</h1>
        <p className={styles.subtitle}>Example: Category risk scores encoded as bubble area — animated transitions between time states</p>
      </header>

      <main className={styles.main}>
        {/* Year display */}
        <div className={styles.yearDisplay}>
          {YEARS.map((y, i) => (
            <button
              key={y}
              className={`${styles.yearPill} ${i === yearIndex ? styles.yearPillActive : ''}`}
              onClick={() => { setIsPlaying(false); yearIndexRef.current = i; setYearIndex(i); }}
            >{y}</button>
          ))}
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            preserveAspectRatio="xMidYMid meet"
          >
            {ALL_CATEGORIES.map(cat => {
              const pos   = BUBBLE_POSITIONS[cat];
              if (!pos) return null;
              const score = scores[cat] || 0;
              const r     = rScale(score);
              const color = categoryColors[cat] || '#5a5a8a';
              const isFlashing = flashingCat === 'all';

              return (
                <motion.g key={cat} transform={`translate(${pos.x},${pos.y})`}>
                  <motion.circle
                    cx={0} cy={0}
                    animate={{
                      r,
                      fill: isFlashing ? '#ff00ff' : color,
                      opacity: 0.82,
                    }}
                    transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
                    stroke={isFlashing ? '#ff00ff' : color}
                    strokeWidth={2}
                    strokeOpacity={0.5}
                  />
                  {/* Score label inside bubble */}
                  <motion.text
                    x={0} y={-8}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={r > 40 ? 22 : 14}
                    fontWeight={700}
                    animate={{ opacity: r > 25 ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ pointerEvents: 'none' }}
                  >{score}</motion.text>
                  <motion.text
                    x={0} y={r > 40 ? 14 : 8}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.85)"
                    fontSize={r > 40 ? 13 : 10}
                    fontWeight={600}
                    animate={{ opacity: r > 30 ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ pointerEvents: 'none' }}
                  >{CATEGORY_LABELS[cat]}</motion.text>
                </motion.g>
              );
            })}
          </svg>

          {/* Year watermark */}
          <div className={styles.yearWatermark}>{currentYear}</div>
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          {ALL_CATEGORIES.map(cat => (
            <div key={cat} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: categoryColors[cat] }} />
              <span>{CATEGORY_LABELS[cat]}</span>
              <span className={styles.legendScore}>{scores[cat] ?? 0} pts</span>
            </div>
          ))}
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

        {/* Scrubber */}
        <div className={styles.scrubberContainer}>
          {YEARS.map((y, i) => (
            <button
              key={y}
              className={`${styles.scrubYear} ${i === yearIndex ? styles.scrubYearActive : ''}`}
              onClick={() => handleScrub(i)}
            >{y}</button>
          ))}
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

export default BubbleChart;
