import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { scaleSequential, scaleDiverging } from 'd3-scale';
import { interpolateRdBu, interpolateInferno } from 'd3-scale-chromatic';
import styles from './Heatmap.module.css';

const getCellKey = (r, c) => `${r}-${c}`;

function Heatmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('alignment');

  const revealIndexRef = useRef(0);
  const [revealIndex, setRevealIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [revealedCells, setRevealedCells] = useState(new Set());
  const [flashingCell, setFlashingCell] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  const runningRef = useRef(false);
  const timerRef = useRef(null);

  const [cellRevealDelay, setCellRevealDelay] = useState(40);
  const [initialHold, setInitialHold] = useState(600);
  const [timingInputs, setTimingInputs] = useState({ cellRevealDelay: 40, initialHold: 600 });

  // Load data
  useEffect(() => {
    fetch('/un-voting.json')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Derive view-specific values
  const view = useMemo(() => {
    if (!data) return null;
    if (viewMode === 'alignment') {
      const { decades, countries, data: rows, domain } = data.alignment;
      return {
        columns: decades.map(String),
        countries,
        rows,
        colorScale: scaleDiverging(interpolateRdBu).domain([domain[1], 0, domain[0]]),
        formatValue: v => `Ideal Point: ${v.toFixed(3)}`,
        nullLabel: 'No data',
      };
    }
    const { powers, countries, data: rows } = data.agreement;
    return {
      columns: powers,
      countries,
      rows,
      colorScale: scaleSequential(t => interpolateInferno(t * 0.85)).domain([0, 1]),
      formatValue: v => `Agreement: ${(v * 100).toFixed(1)}%`,
      nullLabel: 'N/A',
    };
  }, [data, viewMode]);

  const totalCells = view ? view.rows.length * view.columns.length : 0;

  // Build reveal order
  const cellOrder = useMemo(() => {
    if (!view) return [];
    const order = [];
    for (let r = 0; r < view.rows.length; r++) {
      for (let c = 0; c < view.columns.length; c++) {
        order.push({ rowIdx: r, colIdx: c, key: getCellKey(r, c) });
      }
    }
    return order;
  }, [view]);

  // Auto-play when data loads or view switches
  useEffect(() => {
    if (!view) return;
    runningRef.current = false;
    clearTimeout(timerRef.current);
    setRevealedCells(new Set());
    setFlashingCell(null);
    setTooltip(null);
    revealIndexRef.current = 0;
    setRevealIndex(0);
    setTimeout(() => setIsPlaying(true), 150);
  }, [view]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !view) {
      runningRef.current = false;
      return;
    }
    runningRef.current = true;

    const step = () => {
      if (!runningRef.current) return;
      const idx = revealIndexRef.current;
      if (idx >= cellOrder.length) {
        setIsPlaying(false);
        runningRef.current = false;
        return;
      }
      const cell = cellOrder[idx];
      setFlashingCell(cell.key);
      setRevealedCells(prev => new Set([...prev, cell.key]));
      revealIndexRef.current += 1;
      setRevealIndex(revealIndexRef.current);
      setTimeout(() => setFlashingCell(null), 200);
      timerRef.current = setTimeout(step, cellRevealDelay);
    };

    timerRef.current = setTimeout(step, initialHold);
    return () => {
      runningRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, [isPlaying, cellRevealDelay, initialHold, cellOrder, view]);

  const handleReplay = useCallback(() => {
    runningRef.current = false;
    clearTimeout(timerRef.current);
    setRevealedCells(new Set());
    setFlashingCell(null);
    setTooltip(null);
    revealIndexRef.current = 0;
    setRevealIndex(0);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  const handleShowAll = useCallback(() => {
    runningRef.current = false;
    clearTimeout(timerRef.current);
    setIsPlaying(false);
    setRevealedCells(new Set(cellOrder.map(c => c.key)));
    revealIndexRef.current = cellOrder.length;
    setRevealIndex(cellOrder.length);
  }, [cellOrder]);

  const handleScrub = useCallback((val) => {
    setIsPlaying(false);
    runningRef.current = false;
    clearTimeout(timerRef.current);
    const count = Math.round((val / 100) * totalCells);
    const cells = cellOrder.slice(0, count);
    setRevealedCells(new Set(cells.map(c => c.key)));
    setFlashingCell(null);
    revealIndexRef.current = count;
    setRevealIndex(count);
  }, [cellOrder, totalCells]);

  const progress = totalCells ? Math.round((revealIndex / totalCells) * 100) : 0;

  if (loading) return <div className={styles.page}><p style={{ color: '#7f8c8d', textAlign: 'center', marginTop: 80 }}>Loading…</p></div>;
  if (!data || !view) return <div className={styles.page}><p style={{ color: '#e74c3c', textAlign: 'center', marginTop: 80 }}>Failed to load data</p></div>;

  const isAlignment = viewMode === 'alignment';

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
        <div className={styles.navControls}>
          <button className={styles.controlButton} onClick={() => setIsPlaying(p => !p)}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button className={styles.controlButton} onClick={handleReplay}>Replay</button>
          <button className={styles.controlButton} onClick={handleShowAll}>Show All</button>
        </div>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>
          {isAlignment ? 'Geopolitical Alignment Timeline' : 'Major Power Agreement Matrix'}
        </h1>
        <p className={styles.subtitle}>
          {isAlignment
            ? `UN General Assembly Ideal Points — ${view.rows.length} countries × ${view.columns.length} decade snapshots (1950–2023)`
            : `UN General Assembly voting agreement — ${view.rows.length} countries × 6 major powers (2023)`
          }
        </p>
      </header>

      <main className={styles.main}>
        {/* View toggle */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleButton} ${isAlignment ? styles.toggleActive : ''}`}
            onClick={() => setViewMode('alignment')}
          >Alignment Timeline</button>
          <button
            className={`${styles.toggleButton} ${!isAlignment ? styles.toggleActive : ''}`}
            onClick={() => setViewMode('agreement')}
          >Agreement Matrix</button>
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendScale}>
            {isAlignment ? (
              <>
                <span className={styles.legendScaleLabel}>Western-aligned</span>
                <div className={styles.legendGradientDiverging} />
                <span className={styles.legendScaleLabel}>Developing-world consensus</span>
              </>
            ) : (
              <>
                <span className={styles.legendScaleLabel}>Low agreement</span>
                <div className={styles.legendGradient} />
                <span className={styles.legendScaleLabel}>High agreement</span>
              </>
            )}
          </div>
        </div>

        {/* Matrix */}
        <div className={styles.matrixWrapper}>
          <div
            className={styles.matrix}
            style={{
              gridTemplateColumns: `180px repeat(${view.columns.length}, 1fr)`,
            }}
          >
            <div className={styles.rowLabelSpacer} />
            {view.columns.map(col => (
              <div key={col} className={styles.colHeader}>{col}</div>
            ))}

            {view.rows.map((row, rowIdx) => (
              <div key={row.country} className={styles.matrixRow}>
                <div className={styles.rowLabel} title={row.country}>
                  {row.country}
                </div>
                {view.columns.map((col, colIdx) => {
                  const cellKey = getCellKey(rowIdx, colIdx);
                  const isRevealed = revealedCells.has(cellKey);
                  const isFlashing = flashingCell === cellKey;
                  const value = row.values[colIdx];
                  const hasValue = value !== null && value !== undefined;

                  let bgColor = '#1a1a2e';
                  if (hasValue && isRevealed) {
                    bgColor = isFlashing ? '#ff00ff' : view.colorScale(value);
                  }

                  return (
                    <motion.div
                      key={col}
                      className={styles.cell}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={isRevealed ? {
                        opacity: 1,
                        scale: isFlashing ? 1.06 : 1,
                        backgroundColor: bgColor,
                      } : { opacity: 0, scale: 0.6, backgroundColor: '#1a1a2e' }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      onMouseEnter={() => setTooltip({ rowIdx, colIdx, row, col, value })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {isRevealed && hasValue && (
                        <span className={styles.cellValue}>
                          {isAlignment ? value.toFixed(1) : `${(value * 100).toFixed(0)}%`}
                        </span>
                      )}
                      {isRevealed && !hasValue && (
                        <span className={styles.cellNull}>—</span>
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
              <span className={styles.tooltipTitle}>{tooltip.row.country}</span>
              <span className={styles.tooltipYear}>{tooltip.col}</span>
              <span className={styles.tooltipRank}>
                {tooltip.value !== null && tooltip.value !== undefined
                  ? view.formatValue(tooltip.value)
                  : view.nullLabel
                }
              </span>
            </div>
          )}
        </div>

        {/* Scrubber */}
        <div className={styles.scrubberContainer}>
          <span className={styles.scrubberYear}>0%</span>
          <input
            type="range"
            className={styles.scrubber}
            min={0} max={100} step={1}
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
                min="5" max="500" step="5" />
            </div>
          </div>
          <button className={styles.confirmButton} onClick={() => {
            setInitialHold(timingInputs.initialHold);
            setCellRevealDelay(timingInputs.cellRevealDelay);
          }}>Confirm</button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: Bailey, Strezhnev & Voeten — UN General Assembly Ideal Point Estimates (Jun 2024)</p>
        </footer>
      </main>
    </div>
  );
}

export default Heatmap;
