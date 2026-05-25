import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { chord, chordDirected, ribbon, ribbonArrow } from 'd3-chord';
import { arc } from 'd3-shape';
import { categoryColors, riskData } from '../data/risks.js';
import styles from './ChordDiagram.module.css';

const SVG_W = 580;
const SVG_H = 580;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const OUTER_R = 230;
const INNER_R = 210;
const LABEL_R = OUTER_R + 22;

const CATEGORIES = ['geopolitical', 'economic', 'societal', 'technological', 'environmental'];
const TIME_STATES = [2026, 2028, 2036];

// Build 5×5 flow matrix from risk data
// Matrix[i][j] = sum of risk values that flow from category i to category j
// We define "flow" as: when a category has a risk in both years, it flows to its new category
// For single-year: use cross-category interactions from riskNetwork edges (simplified)
// Here we compute: how many risks from category i in this year appear in category j in next year
// For single-year chord: use co-occurrence of risks in top-10 scoring
// Approach: matrix[i][j] = combined score of risks shared between categories i and j
// (using risk values as weights; diagonal = within-category total)

function buildMatrix(year) {
  const risks = riskData[year] || [];
  const n = CATEGORIES.length;
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0));

  // Diagonal: sum of risk values within each category
  risks.forEach(r => {
    const i = CATEGORIES.indexOf(r.category);
    if (i >= 0) matrix[i][i] += r.value;
  });

  // Off-diagonal: pre-defined cross-category interaction weights
  // Based on WEF interconnection relationships (geopolitical ↔ economic, etc.)
  const interactions = [
    [0, 1, 8], [0, 2, 6], [0, 3, 5], [0, 4, 3], // geo → eco, soc, tech, env
    [1, 2, 7], [1, 3, 4], [1, 4, 3],              // eco → soc, tech, env
    [2, 3, 5], [2, 4, 4],                          // soc → tech, env
    [3, 4, 6],                                     // tech → env
  ];

  // Scale interactions by the year's total risk score
  const totalScore = risks.reduce((s, r) => s + r.value, 0);
  const scale = totalScore / 55; // baseline total for 2026

  interactions.forEach(([i, j, w]) => {
    const v = Math.round(w * scale * 10) / 10;
    matrix[i][j] += v;
    matrix[j][i] += v;
  });

  return matrix;
}

// Compute chord layout for a given matrix
function computeChords(matrix) {
  const chordGen = chord()
    .padAngle(0.04)
    .sortSubgroups((a, b) => b.value - a.value);
  return chordGen(matrix);
}

// Arc generator for outer segments
const arcGen = arc();

// Pre-compute all layouts
const LAYOUTS = {};
TIME_STATES.forEach(y => {
  const matrix = buildMatrix(y);
  LAYOUTS[y] = { matrix, chords: computeChords(matrix) };
});

function ChordDiagram() {
  const revealRef = useRef(0);
  const [yearIndex, setYearIndex]     = useState(0);
  const [revealCount, setRevealCount] = useState(0);
  const [isPlaying, setIsPlaying]     = useState(true);
  const [flashIdx, setFlashIdx]       = useState(null);
  const [hoveredGroup, setHoveredGroup] = useState(null);

  const [chordRevealDelay, setChordRevealDelay] = useState(180);
  const [holdDuration, setHoldDuration]         = useState(2200);
  const [initialHold, setInitialHold]           = useState(700);
  const [timingInputs, setTimingInputs] = useState({
    chordRevealDelay: 180, holdDuration: 2200, initialHold: 700
  });

  const currentYear = TIME_STATES[yearIndex];
  const { chords, matrix } = LAYOUTS[currentYear];
  const TOTAL_CHORDS = chords.length;

  const visibleChords = useMemo(() => chords.slice(0, revealCount), [chords, revealCount]);

  // ── Animation loop ──
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;

    const reveal = () => {
      const idx = revealRef.current;
      if (idx >= TOTAL_CHORDS) {
        timeoutId = setTimeout(() => {
          const next = yearIndex + 1;
          if (next >= TIME_STATES.length) {
            setIsPlaying(false);
          } else {
            revealRef.current = 0;
            setRevealCount(0);
            setYearIndex(next);
          }
        }, holdDuration);
        return;
      }
      revealRef.current += 1;
      setRevealCount(revealRef.current);
      setFlashIdx(idx);
      setTimeout(() => setFlashIdx(null), 320);
      timeoutId = setTimeout(reveal, chordRevealDelay);
    };

    timeoutId = setTimeout(reveal, initialHold);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, chordRevealDelay, holdDuration, initialHold, yearIndex, TOTAL_CHORDS]);

  const handleReplay = useCallback(() => {
    setIsPlaying(false);
    revealRef.current = 0;
    setRevealCount(0);
    setYearIndex(0);
    setFlashIdx(null);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  const handleYearClick = useCallback((idx) => {
    setIsPlaying(false);
    setYearIndex(idx);
    revealRef.current = LAYOUTS[TIME_STATES[idx]].chords.length;
    setRevealCount(revealRef.current);
    setFlashIdx(null);
  }, []);

  const handleScrub = useCallback((val) => {
    setIsPlaying(false);
    const count = parseInt(val);
    revealRef.current = count;
    setRevealCount(count);
    setFlashIdx(null);
  }, []);

  // Ribbon path generator
  const ribbonGen = ribbon().radius(INNER_R);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Chord Diagram — WEF Risk Category Interactions</h1>
        <p className={styles.subtitle}>
          Five WEF risk categories arranged in a circle. Ribbons show the strength of cross-category
          interactions — wider ribbons = stronger relationship. Diagonal segments show within-category
          severity. Transitions across 2026, 2028, 2036 show shifting risk dominance.
        </p>
      </header>

      <main className={styles.main}>
        {/* Year pills */}
        <div className={styles.topRow}>
          <div className={styles.yearDisplay}>
            {TIME_STATES.map((y, i) => (
              <button
                key={y}
                className={`${styles.yearPill} ${i === yearIndex ? styles.yearPillActive : ''}`}
                onClick={() => handleYearClick(i)}
              >{y}</button>
            ))}
          </div>
          <div className={styles.stats}>
            <span className={styles.statValue}>{revealCount}</span>
            <span className={styles.statLabel}> / {TOTAL_CHORDS} ribbons revealed</span>
          </div>
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            onMouseLeave={() => setHoveredGroup(null)}
          >
            <g transform={`translate(${CX},${CY})`}>

              {/* Ribbons */}
              <AnimatePresence>
                {visibleChords.map((c, i) => {
                  const srcCat = CATEGORIES[c.source.index];
                  const tgtCat = CATEGORIES[c.target.index];
                  const color = categoryColors[srcCat] || '#5a5a8a';
                  const isFlash = flashIdx === i;
                  const dimmed = hoveredGroup !== null &&
                    c.source.index !== hoveredGroup &&
                    c.target.index !== hoveredGroup;
                  const highlighted = hoveredGroup !== null && (
                    c.source.index === hoveredGroup || c.target.index === hoveredGroup
                  );

                  return (
                    <motion.path
                      key={`${i}-${currentYear}`}
                      d={ribbonGen(c)}
                      fill={isFlash ? '#ffffff' : color}
                      fillOpacity={isFlash ? 0.9 : dimmed ? 0.04 : highlighted ? 0.72 : 0.38}
                      stroke={color}
                      strokeWidth={0.5}
                      strokeOpacity={dimmed ? 0.04 : 0.4}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        fillOpacity: isFlash ? 0.9 : dimmed ? 0.04 : highlighted ? 0.72 : 0.38,
                      }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      style={{ transformOrigin: '0px 0px', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredGroup(c.source.index)}
                    />
                  );
                })}
              </AnimatePresence>

              {/* Outer arc segments */}
              {chords.groups.map(group => {
                const cat = CATEGORIES[group.index];
                const color = categoryColors[cat] || '#5a5a8a';
                const isHov = hoveredGroup === group.index;
                const dimmed = hoveredGroup !== null && !isHov;

                const d = arcGen({
                  innerRadius: INNER_R + 4,
                  outerRadius: OUTER_R,
                  startAngle: group.startAngle,
                  endAngle: group.endAngle,
                });

                // Label position
                const midA = (group.startAngle + group.endAngle) / 2 - Math.PI / 2;
                const lx = Math.cos(midA) * LABEL_R;
                const ly = Math.sin(midA) * LABEL_R;
                const flip = midA > 0 && midA < Math.PI;

                // Score from matrix diagonal
                const score = matrix[group.index][group.index];

                return (
                  <g
                    key={cat}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredGroup(group.index)}
                    onMouseLeave={() => setHoveredGroup(null)}
                  >
                    <path
                      d={d}
                      fill={color}
                      fillOpacity={dimmed ? 0.2 : isHov ? 1 : 0.85}
                      stroke="#0d0d1a"
                      strokeWidth={1.5}
                      style={{ transition: 'fill-opacity 0.2s' }}
                    />
                    {/* Category label */}
                    <text
                      x={lx} y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={10}
                      fontWeight={isHov ? 700 : 500}
                      fill={dimmed ? '#3a3a5a' : isHov ? '#ffffff' : '#aaaacc'}
                      style={{
                        userSelect: 'none',
                        textTransform: 'capitalize',
                        transition: 'fill 0.2s',
                      }}
                    >{cat}</text>

                    {/* Score badge on hover */}
                    {isHov && (
                      <text
                        x={lx} y={ly + 12}
                        textAnchor="middle"
                        fontSize={8}
                        fill={color}
                        style={{ userSelect: 'none' }}
                      >{score.toFixed(0)} pts</text>
                    )}
                  </g>
                );
              })}

              {/* Centre year label */}
              <text textAnchor="middle" y={-10} fontSize={26} fontWeight={900} fill="#ffffff"
                style={{ userSelect: 'none' }}
              >{currentYear}</text>
              <text textAnchor="middle" y={12} fontSize={10} fill="#7f8c8d"
                style={{ userSelect: 'none' }}
              >risk interactions</text>

            </g>
          </svg>
        </div>

        {/* Category legend */}
        <div className={styles.legend}>
          {CATEGORIES.map(cat => (
            <div
              key={cat}
              className={`${styles.legendItem} ${hoveredGroup === CATEGORIES.indexOf(cat) ? styles.legendItemActive : ''}`}
              onMouseEnter={() => setHoveredGroup(CATEGORIES.indexOf(cat))}
              onMouseLeave={() => setHoveredGroup(null)}
            >
              <span className={styles.legendDot} style={{ background: categoryColors[cat] }} />
              <span style={{ textTransform: 'capitalize' }}>{cat}</span>
              <span className={styles.legendScore}>
                {matrix[CATEGORIES.indexOf(cat)][CATEGORIES.indexOf(cat)].toFixed(0)}
              </span>
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
          <span className={styles.scrubberLabel}>0</span>
          <input
            type="range"
            className={styles.scrubber}
            min={0} max={TOTAL_CHORDS} step={1}
            value={revealCount}
            onChange={e => handleScrub(e.target.value)}
          />
          <span className={styles.scrubberLabel}>{TOTAL_CHORDS}</span>
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
              <label>Ribbon Reveal (ms)</label>
              <input type="number" value={timingInputs.chordRevealDelay}
                onChange={e => setTimingInputs(p => ({ ...p, chordRevealDelay: parseInt(e.target.value) || 0 }))}
                min="50" max="3000" step="50" />
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
            setChordRevealDelay(timingInputs.chordRevealDelay);
            setHoldDuration(timingInputs.holdDuration);
          }}>Confirm</button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025 — Cross-category interaction model</p>
        </footer>
      </main>
    </div>
  );
}

export default ChordDiagram;
