import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { chord, chordDirected, ribbon, ribbonArrow } from 'd3-chord';
import { arc } from 'd3-shape';
import styles from './ChordDiagram.module.css';

const SVG_W = 600;
const SVG_H = 600;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const OUTER_R = 200;
const INNER_R = 170;
const LABEL_R = 260;

const TIME_STATES = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024];

// Build region-to-region migration matrix
// Returns { matrix, regions } where regions is array of region objects
function buildMatrix(year, data) {
  if (!data) return null;
  
  const snapshot = data.snapshots[year];
  if (!snapshot) return null;
  
  // Use all regions from data
  const regions = data.regions.map((region, idx) => ({ idx, ...region }));
  const regionIndices = new Map(regions.map((r, i) => [i, i]));
  const n = regions.length;
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  
  // Build matrix from migration data
  snapshot.forEach(([destIdx, origIdx, migrants]) => {
    const i = destIdx;
    const j = origIdx;
    
    if (i !== undefined && j !== undefined) {
      matrix[i][j] += migrants;
    }
  });
  
  return { matrix, regions };
}

// Compute chord layout for a given matrix
function computeChords(matrix) {
  const chordGen = chord()
    .padAngle(0.06)
    .sortSubgroups((a, b) => b.value - a.value);
  return chordGen(matrix);
}

// Arc generator for outer segments
const arcGen = arc();

function ChordDiagram() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
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

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/migration-data.json')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const currentYear = TIME_STATES[yearIndex];
  const layout = data ? buildMatrix(currentYear, data) : null;
  const chords = layout ? computeChords(layout.matrix) : [];
  const matrix = layout?.matrix || [];
  const regions = layout?.regions || [];
  const TOTAL_CHORDS = chords.length;

  const visibleChords = useMemo(() => chords.slice(0, revealCount), [chords, revealCount]);

  // ── Animation loop ──
  useEffect(() => {
    if (!isPlaying || !data || TOTAL_CHORDS === 0) return;
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
  }, [isPlaying, chordRevealDelay, holdDuration, initialHold, yearIndex, TOTAL_CHORDS, data]);

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
    const year = TIME_STATES[idx];
    const newLayout = data ? buildMatrix(year, data) : null;
    const newChords = newLayout ? computeChords(newLayout.matrix) : [];
    revealRef.current = newChords.length;
    setRevealCount(revealRef.current);
    setFlashIdx(null);
  }, [data]);

  const handleScrub = useCallback((val) => {
    setIsPlaying(false);
    const count = parseInt(val);
    revealRef.current = count;
    setRevealCount(count);
    setFlashIdx(null);
  }, []);

  // Ribbon path generator
  const ribbonGen = ribbon().radius(INNER_R);

  if (loading) {
    return (
      <div className={styles.page}>
        <nav className={styles.nav}>
          <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
        </nav>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          color: '#7f8c8d'
        }}>
          <p>Loading migration data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Chord Diagram — Global Migration Flows</h1>
        <p className={styles.subtitle}>
          8 major global regions arranged in a circle. Ribbons show migration flows from origin to destination —
          wider ribbons = more migrants. Colors indicate regional grouping.
          Transitions across 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024 show shifting migration patterns.
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
          {!layout && (
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              textAlign: 'center',
              color: '#7f8c8d'
            }}>
              <p>No alliance data for {currentYear}</p>
            </div>
          )}
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            onMouseLeave={() => setHoveredGroup(null)}
          >
            <g transform={`translate(${CX},${CY})`}>

              {/* Ribbons */}
              <AnimatePresence>
                {visibleChords?.map((c, i) => {
                  const srcRegion = regions[c.source.index];
                  const tgtRegion = regions[c.target.index];
                  const color = srcRegion?.color || '#5a5a8a';
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
              {chords?.groups?.map(group => {
                const region = regions[group.index];
                const color = region?.color || '#5a5a8d';
                const isHov = hoveredGroup === group.index;
                const isConnected = hoveredGroup !== null && 
                  (matrix?.[hoveredGroup]?.[group.index] > 0 || matrix?.[group.index]?.[hoveredGroup] > 0);
                const dimmed = hoveredGroup !== null && !isHov && !isConnected;

                const d = arcGen({
                  innerRadius: INNER_R + 4,
                  outerRadius: OUTER_R,
                  startAngle: group.startAngle,
                  endAngle: group.endAngle,
                });

                // Label position
                const midA = (group.startAngle + group.endAngle) / 2 - Math.PI / 2;
                
                // Callout line start (at outer edge of arc)
                const lineStartR = OUTER_R + 5;
                const lineStartX = Math.cos(midA) * lineStartR;
                const lineStartY = Math.sin(midA) * lineStartR;
                
                // Callout line end (at label position)
                const lineEndR = LABEL_R - 10;
                const lineEndX = Math.cos(midA) * lineEndR;
                const lineEndY = Math.sin(midA) * lineEndR;

                return (
                  <g
                    key={region?.idx || group.index}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredGroup(group.index)}
                    onMouseLeave={() => setHoveredGroup(null)}
                  >
                    <path
                      d={d}
                      fill={color}
                      fillOpacity={dimmed ? 0.2 : isHov ? 1 : isConnected ? 0.95 : 0.85}
                      stroke="#0d0d1a"
                      strokeWidth={1.5}
                      style={{ transition: 'fill-opacity 0.2s' }}
                    />
                    {/* Callout line */}
                    <line
                      x1={lineStartX}
                      y1={lineStartY}
                      x2={lineEndX}
                      y2={lineEndY}
                      stroke="#5a5a8a"
                      strokeWidth={1}
                      opacity={dimmed ? 0.1 : 0.4}
                      style={{ transition: 'opacity 0.2s' }}
                    />
                  </g>
                );
              })}

              {/* Centre year label */}
              <text textAnchor="middle" y={-10} fontSize={26} fontWeight={900} fill="#ffffff"
                style={{ userSelect: 'none' }}
              >{currentYear}</text>
              <text textAnchor="middle" y={12} fontSize={10} fill="#7f8c8d"
                style={{ userSelect: 'none' }}
              >migration flows</text>

            </g>
          </svg>
          
          {/* HTML Labels - positioned absolutely over SVG */}
          {chords?.groups?.map(group => {
            const region = regions[group.index];
            const isHov = hoveredGroup === group.index;
            const isConnected = hoveredGroup !== null && 
              (matrix?.[hoveredGroup]?.[group.index] > 0 || matrix?.[group.index]?.[hoveredGroup] > 0);
            const dimmed = hoveredGroup !== null && !isHov && !isConnected;
            
            // Calculate position as percentage of SVG
            const midA = (group.startAngle + group.endAngle) / 2 - Math.PI / 2;
            const percentX = 50 + (Math.cos(midA) * LABEL_R / SVG_W) * 100;
            const percentY = 50 + (Math.sin(midA) * LABEL_R / SVG_H) * 100;
            
            // Determine anchor side
            const isRightSide = midA > -Math.PI/2 && midA < Math.PI/2;
            
            return (
              <div
                key={`label-${region?.idx || group.index}`}
                style={{
                  position: 'absolute',
                  left: `${percentX}%`,
                  top: `${percentY}%`,
                  transform: isRightSide ? 'translateY(-50%)' : 'translate(-100%, -50%)',
                  fontSize: '10px',
                  fontWeight: isHov ? 700 : isConnected ? 600 : 500,
                  color: dimmed ? '#3a3a5a' : isHov ? '#ffffff' : isConnected ? '#ffffff' : '#aaaacc',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  transition: 'color 0.2s',
                  zIndex: 10,
                }}
              >
                {region?.name || ''}
              </div>
            );
          })}
        </div>

        {/* Region legend */}
        <div className={styles.legend}>
          {regions.slice(0, 12).map((region, i) => (
            <div
              key={region.idx}
              className={`${styles.legendItem} ${hoveredGroup === i ? styles.legendItemActive : ''}`}
              onMouseEnter={() => setHoveredGroup(i)}
              onMouseLeave={() => setHoveredGroup(null)}
            >
              <span className={styles.legendDot} style={{ background: region?.color || '#7f8c8d' }} />
              <span>{region.name}</span>
              <span className={styles.legendScore}>
                {matrix?.[i]?.[i] || 0}
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
          <p className={styles.source}>Source: Correlates of War Alliance Dataset v4.1 — 1816–2024</p>
        </footer>
      </main>
    </div>
  );
}

export default ChordDiagram;
