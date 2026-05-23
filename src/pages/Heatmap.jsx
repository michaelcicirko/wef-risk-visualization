import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import { riskData, categoryColors } from '../data/risks.js';
import styles from './Heatmap.module.css';

// All unique risk IDs across all years (union)
const ALL_RISK_IDS = [...new Set(
  Object.values(riskData).flatMap(year => year.map(r => r.id))
)];

const YEARS = [2026, 2028, 2036];

// Build a lookup: riskId → { title, category }
const RISK_META = {};
Object.values(riskData).forEach(yearRisks => {
  yearRisks.forEach(r => {
    if (!RISK_META[r.id]) RISK_META[r.id] = { title: r.title, category: r.category };
  });
});

// Build matrix: rows = risks (ordered by avg rank), cols = years
// Value = rank (1=highest risk), null = not in that year's top 10
const MATRIX = ALL_RISK_IDS.map(id => ({
  id,
  title: RISK_META[id].title,
  category: RISK_META[id]?.category,
  values: YEARS.map(y => {
    const entry = riskData[y]?.find(r => r.id === id);
    return entry ? entry.rank : null;
  }),
}));

// Sort rows: risks that appear in all 3 years first, then by min rank
const SORTED_MATRIX = [...MATRIX].sort((a, b) => {
  const aPresent = a.values.filter(v => v !== null).length;
  const bPresent = b.values.filter(v => v !== null).length;
  if (bPresent !== aPresent) return bPresent - aPresent;
  const aMin = Math.min(...a.values.filter(v => v !== null));
  const bMin = Math.min(...b.values.filter(v => v !== null));
  return aMin - bMin;
});

// Colour scale: rank 1 = darkest blue, rank 10 = lightest blue, null = transparent
const colorScale = scaleSequential(interpolateBlues).domain([10, 1]);

// Total cells to reveal = rows × cols
const TOTAL_CELLS = SORTED_MATRIX.length * YEARS.length;

// Cell key helper (module-level)
const getCellKey = (rowIdx, colIdx) => `${rowIdx}-${colIdx}`;

// Pre-build reveal order: row by row, left to right
const ALL_CELLS_IN_ORDER = [];
for (let r = 0; r < SORTED_MATRIX.length; r++) {
  for (let c = 0; c < YEARS.length; c++) {
    ALL_CELLS_IN_ORDER.push({ rowIdx: r, colIdx: c, key: getCellKey(r, c) });
  }
}

function Heatmap() {
  const revealIndexRef = useRef(0);
  const [revealIndex, setRevealIndex]       = useState(0);

  const [isPlaying, setIsPlaying]           = useState(true);
  const [revealedCells, setRevealedCells]   = useState(new Set());
  const [flashingCell, setFlashingCell]     = useState(null);
  const [tooltip, setTooltip]               = useState(null);

  const [cellRevealDelay, setCellRevealDelay] = useState(60);
  const [initialHold, setInitialHold]         = useState(600);
  const [timingInputs, setTimingInputs] = useState({
    cellRevealDelay: 60, initialHold: 600,
  });


  // ── Animation loop ──
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;
    const cells = ALL_CELLS_IN_ORDER;

    const runAnimation = () => {
      const idx = revealIndexRef.current;
      if (idx >= cells.length) {
        setIsPlaying(false);
        return;
      }
      const cell = cells[idx];
      setFlashingCell(cell.key);
      setRevealedCells(prev => new Set([...prev, cell.key]));
      revealIndexRef.current += 1;
      setRevealIndex(revealIndexRef.current);
      setTimeout(() => setFlashingCell(null), 250);
      timeoutId = setTimeout(runAnimation, cellRevealDelay);
    };

    timeoutId = setTimeout(runAnimation, initialHold);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, cellRevealDelay, initialHold]);

  // ── Replay ──
  const handleReplay = useCallback(() => {
    setIsPlaying(false);
    setRevealedCells(new Set());
    setFlashingCell(null);
    revealIndexRef.current = 0;
    setRevealIndex(0);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  // ── Scrub: reveal all cells up to a fraction ──
  const handleScrub = useCallback((val) => {
    setIsPlaying(false);
    const count = Math.round((val / 100) * TOTAL_CELLS);
    const cells = ALL_CELLS_IN_ORDER.slice(0, count);
    setRevealedCells(new Set(cells.map(c => c.key)));
    setFlashingCell(null);
    revealIndexRef.current = count;
    setRevealIndex(count);
  }, []);

  const progress = Math.round((revealIndex / TOTAL_CELLS) * 100);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Heatmap Matrix</h1>
        <p className={styles.subtitle}>Example: Risk severity encoded as colour intensity across time states</p>
      </header>

      <main className={styles.main}>

        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendCategories}>
            {Object.entries(categoryColors).map(([cat, color]) => (
              <div key={cat} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: color }} />
                <span className={styles.legendLabel}>{cat}</span>
              </div>
            ))}
          </div>
          <div className={styles.legendScale}>
            <span className={styles.legendScaleLabel}>Rank 10</span>
            <div className={styles.legendGradient} />
            <span className={styles.legendScaleLabel}>Rank 1</span>
          </div>
        </div>

        {/* Matrix */}
        <div className={styles.matrixWrapper}>
          {/* Column headers */}
          <div className={styles.matrix}>
            <div className={styles.rowLabelSpacer} />
            {YEARS.map(y => (
              <div key={y} className={styles.colHeader}>{y}</div>
            ))}

            {SORTED_MATRIX.map((row, rowIdx) => (
              <div key={row.id} className={styles.matrixRow}>
                <div
                  className={styles.rowLabel}
                  style={{ borderLeft: `3px solid ${categoryColors[row.category] || '#5a5a8a'}` }}
                  title={row.title}
                >
                  {row.title}
                </div>
                {YEARS.map((y, colIdx) => {
                  const cellKey = getCellKey(rowIdx, colIdx);
                  const isRevealed = revealedCells.has(cellKey);
                  const isFlashing = flashingCell === cellKey;
                  const rank = row.values[colIdx];

                  return (
                    <motion.div
                      key={y}
                      className={styles.cell}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={isRevealed ? {
                        opacity: 1,
                        scale: isFlashing ? 1.08 : 1,
                        backgroundColor: rank
                          ? (isFlashing ? '#ff00ff' : colorScale(rank))
                          : '#1a1a2e',
                      } : { opacity: 0, scale: 0.6, backgroundColor: '#1a1a2e' }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      onMouseEnter={() => rank && setTooltip({ rowIdx, colIdx, row, year: y, rank })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {isRevealed && rank && (
                        <span className={styles.cellRank}>#{rank}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div className={styles.tooltip}>
              <span className={styles.tooltipTitle}>{tooltip.row.title}</span>
              <span className={styles.tooltipYear}>{tooltip.year}</span>
              <span className={styles.tooltipRank}>Rank #{tooltip.rank}</span>
              <span
                className={styles.tooltipCat}
                style={{ color: categoryColors[tooltip.row.category] }}
              >{tooltip.row.category}</span>
            </div>
          )}
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
          <span className={styles.scrubberYear}>0%</span>
          <input
            type="range"
            className={styles.scrubber}
            min={0}
            max={100}
            step={1}
            value={progress}
            onChange={e => handleScrub(e.target.value)}
            style={{ '--progress': progress }}
          />
          <span className={styles.scrubberYear}>100%</span>
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
              <label>Cell Reveal (ms)</label>
              <input type="number" value={timingInputs.cellRevealDelay}
                onChange={e => setTimingInputs(p => ({ ...p, cellRevealDelay: parseInt(e.target.value) || 0 }))}
                min="10" max="1000" step="10" />
            </div>
          </div>
          <button className={styles.confirmButton} onClick={() => {
            setInitialHold(timingInputs.initialHold);
            setCellRevealDelay(timingInputs.cellRevealDelay);
          }}>
            Confirm
          </button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Example data: WEF Global Risks Perception Survey</p>
        </footer>
      </main>
    </div>
  );
}

export default Heatmap;
