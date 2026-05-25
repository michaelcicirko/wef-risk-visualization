import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleLinear, scaleBand } from 'd3-scale';
import { natoSpending, regionColors, SNAPSHOT_YEARS, NATO_TARGET_PCT } from '../data/natoSpending.js';
import styles from './RadialBarChart.module.css';

const SVG_W = 620;
const SVG_H = 620;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const INNER_R = 72;   // blank centre
const OUTER_R = 270;  // max bar radius
const BAR_PAD = 0.018; // gap between bars in radians

// Sort members by region then country id for clean grouping
const REGION_ORDER = ['North America', 'West Europe', 'East Europe', 'South Europe', 'Scandinavia'];
const sortedMembers = [...natoSpending].sort((a, b) => {
  const ri = REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region);
  if (ri !== 0) return ri;
  return a.id.localeCompare(b.id);
});

const TOTAL = sortedMembers.length;
const ANGLE_STEP = (2 * Math.PI) / TOTAL;

// Angle for member at index i (start from top, clockwise)
function startAngle(i) { return i * ANGLE_STEP - Math.PI / 2; }
function endAngle(i)   { return (i + 1) * ANGLE_STEP - Math.PI / 2 - BAD_PAD_RAD; }

const BAD_PAD_RAD = BAR_PAD;

// Build SVG arc path for a single bar
function barPath(i, pct, maxPct, innerR, outerR) {
  const frac = Math.min(pct / maxPct, 1);
  const r = innerR + frac * (outerR - innerR);
  const a0 = startAngle(i) + BAD_PAD_RAD / 2;
  const a1 = startAngle(i) + ANGLE_STEP - BAD_PAD_RAD / 2;
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;

  const ox0 = CX + r * Math.cos(a0);
  const oy0 = CY + r * Math.sin(a0);
  const ox1 = CX + r * Math.cos(a1);
  const oy1 = CY + r * Math.sin(a1);
  const ix0 = CX + innerR * Math.cos(a1);
  const iy0 = CY + innerR * Math.sin(a1);
  const ix1 = CX + innerR * Math.cos(a0);
  const iy1 = CY + innerR * Math.sin(a0);

  return [
    `M ${ox0} ${oy0}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${ox1} ${oy1}`,
    `L ${ix0} ${iy0}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
    'Z',
  ].join(' ');
}

// Label position just outside the bar
function labelPos(i, r) {
  const a = startAngle(i) + ANGLE_STEP / 2;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a), a };
}

// Target ring radius
const MAX_PCT = 4.2;
function targetR() {
  return INNER_R + (NATO_TARGET_PCT / MAX_PCT) * (OUTER_R - INNER_R);
}

function RadialBarChart() {
  const revealRef = useRef(0);
  const [yearIndex, setYearIndex]     = useState(0);
  const [revealCount, setRevealCount] = useState(0);
  const [isPlaying, setIsPlaying]     = useState(true);
  const [flashIdx, setFlashIdx]       = useState(null);
  const [hovered, setHovered]         = useState(null);

  const [barRevealDelay, setBarRevealDelay] = useState(100);
  const [holdDuration, setHoldDuration]     = useState(1800);
  const [initialHold, setInitialHold]       = useState(600);
  const [timingInputs, setTimingInputs] = useState({
    barRevealDelay: 100, holdDuration: 1800, initialHold: 600
  });

  const currentYear = SNAPSHOT_YEARS[yearIndex];

  // Members with current year data
  const membersWithData = useMemo(() =>
    sortedMembers.map(m => ({
      ...m,
      gdpPct: m[currentYear]?.gdpPct ?? 0,
      gdpAbsUsdBn: m[currentYear]?.gdpAbsUsdBn ?? 0,
    })),
    [currentYear]
  );

  const tR = targetR();
  const metCount = membersWithData.filter(m => m.gdpPct >= NATO_TARGET_PCT).length;

  // ── Animation loop ──
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;

    const reveal = () => {
      const idx = revealRef.current;
      if (idx >= TOTAL) {
        timeoutId = setTimeout(() => {
          const next = yearIndex + 1;
          if (next >= SNAPSHOT_YEARS.length) {
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
      setTimeout(() => setFlashIdx(null), 300);
      timeoutId = setTimeout(reveal, barRevealDelay);
    };

    timeoutId = setTimeout(reveal, initialHold);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, barRevealDelay, holdDuration, initialHold, yearIndex]);

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
    revealRef.current = TOTAL;
    setRevealCount(TOTAL);
    setFlashIdx(null);
  }, []);

  const handleScrub = useCallback((val) => {
    setIsPlaying(false);
    const count = parseInt(val);
    revealRef.current = count;
    setRevealCount(count);
    setFlashIdx(null);
  }, []);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Radial Bar Chart — NATO Defence Spending</h1>
        <p className={styles.subtitle}>
          32 NATO members arranged in a circle, grouped by region. Each arc radiates outward
          proportional to % of GDP spent on defence. The dashed ring marks the 2% NATO target.
        </p>
      </header>

      <main className={styles.main}>
        {/* Year pills + stat */}
        <div className={styles.topRow}>
          <div className={styles.yearDisplay}>
            {SNAPSHOT_YEARS.map((y, i) => (
              <button
                key={y}
                className={`${styles.yearPill} ${i === yearIndex ? styles.yearPillActive : ''}`}
                onClick={() => handleYearClick(i)}
              >{y}</button>
            ))}
          </div>
          <div className={styles.stats}>
            <span className={styles.statValue}>{metCount}</span>
            <span className={styles.statLabel}> / {TOTAL} meet 2% target</span>
          </div>
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Concentric grid rings */}
            {[1, 2, 3, 4].map(t => {
              const r = INNER_R + (t / 4) * (OUTER_R - INNER_R);
              return (
                <circle
                  key={t}
                  cx={CX} cy={CY} r={r}
                  fill="none"
                  stroke="#2a2a4a"
                  strokeWidth={1}
                  strokeDasharray="3,4"
                />
              );
            })}

            {/* 2% NATO target ring */}
            <circle
              cx={CX} cy={CY} r={tR}
              fill="none"
              stroke="#ff00ff"
              strokeWidth={1.5}
              strokeDasharray="5,4"
              opacity={0.7}
            />

            {/* Bars */}
            <AnimatePresence>
              {membersWithData.map((member, i) => {
                if (i >= revealCount) return null;
                const color = regionColors[member.region] || '#5a5a8a';
                const isFlash = flashIdx === i;
                const isHov = hovered?.id === member.id;
                const dimmed = hovered && !isHov;
                const metTarget = member.gdpPct >= NATO_TARGET_PCT;

                const path = barPath(i, member.gdpPct, MAX_PCT, INNER_R, OUTER_R);
                const r = INNER_R + (member.gdpPct / MAX_PCT) * (OUTER_R - INNER_R);
                const lp = labelPos(i, r + 14);

                // Rotate text so it reads along the radial
                const angleDeg = (lp.a * 180 / Math.PI);
                const flip = angleDeg > 90 && angleDeg < 270;

                return (
                  <motion.g
                    key={`${member.id}-${currentYear}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: dimmed ? 0.15 : 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    style={{ transformOrigin: `${CX}px ${CY}px`, cursor: 'pointer' }}
                    onMouseEnter={() => setHovered(member)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <path
                      d={path}
                      fill={isFlash ? '#ffffff' : color}
                      fillOpacity={isFlash ? 1 : isHov ? 1 : 0.78}
                      stroke={metTarget ? '#00ff88' : color}
                      strokeWidth={metTarget ? 1.5 : 0.5}
                      strokeOpacity={0.6}
                      style={{ transition: 'fill 0.2s, fill-opacity 0.2s' }}
                    />
                    {/* Flag label at outer tip */}
                    <text
                      x={lp.x}
                      y={lp.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={10}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                      transform={`rotate(${flip ? angleDeg + 180 : angleDeg}, ${lp.x}, ${lp.y})`}
                    >{member.flag}</text>
                  </motion.g>
                );
              })}
            </AnimatePresence>

            {/* Centre label */}
            <text x={CX} y={CY - 14} textAnchor="middle" fontSize={22} fontWeight={900} fill="#ffffff">
              {currentYear}
            </text>
            <text x={CX} y={CY + 8} textAnchor="middle" fontSize={10} fill="#7f8c8d">
              % GDP defence
            </text>
            <text x={CX} y={CY + 22} textAnchor="middle" fontSize={9} fill="#5a5a8a">
              {revealCount}/{TOTAL} members
            </text>

            {/* Tooltip for hovered member */}
            {hovered && (() => {
              const i = membersWithData.findIndex(m => m.id === hovered.id);
              const lp = labelPos(i, OUTER_R + 50);
              // Clamp to SVG bounds
              const tx = Math.max(60, Math.min(SVG_W - 60, lp.x));
              const ty = Math.max(40, Math.min(SVG_H - 60, lp.y));
              return (
                <g>
                  <rect
                    x={tx - 56} y={ty - 38}
                    width={112} height={76}
                    rx={6}
                    fill="#1e1e2e"
                    stroke="#3a3a5a"
                    strokeWidth={1}
                  />
                  <text x={tx} y={ty - 20} textAnchor="middle" fontSize={16} style={{ userSelect: 'none' }}>{hovered.flag}</text>
                  <text x={tx} y={ty - 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#ffffff" style={{ userSelect: 'none' }}>{hovered.country}</text>
                  <text x={tx} y={ty + 12} textAnchor="middle" fontSize={13} fontWeight={900} fill="#ffffff" style={{ userSelect: 'none' }}>{hovered.gdpPct.toFixed(2)}%</text>
                  <text x={tx} y={ty + 26} textAnchor="middle" fontSize={9} fill={hovered.gdpPct >= NATO_TARGET_PCT ? '#00ff88' : '#ff6b6b'} style={{ userSelect: 'none' }}>
                    {hovered.gdpPct >= NATO_TARGET_PCT ? '✓ Meets target' : '✗ Below target'}
                  </text>
                </g>
              );
            })()}

            {/* 2% label */}
            <text
              x={CX + tR + 5}
              y={CY - 4}
              fontSize={8}
              fill="#ff00ff"
              opacity={0.8}
              style={{ userSelect: 'none' }}
            >2%</text>
          </svg>
        </div>

        {/* Region legend */}
        <div className={styles.legend}>
          {REGION_ORDER.map(r => (
            <div key={r} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: regionColors[r] }} />
              <span>{r}</span>
            </div>
          ))}
          <div className={styles.legendItem}>
            <span className={styles.legendGreenRing} />
            <span>≥ 2% target</span>
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

        {/* Scrubber */}
        <div className={styles.scrubberContainer}>
          <span className={styles.scrubberLabel}>0</span>
          <input
            type="range"
            className={styles.scrubber}
            min={0} max={TOTAL} step={1}
            value={revealCount}
            onChange={e => handleScrub(e.target.value)}
          />
          <span className={styles.scrubberLabel}>{TOTAL}</span>
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
              <label>Bar Reveal (ms)</label>
              <input type="number" value={timingInputs.barRevealDelay}
                onChange={e => setTimingInputs(p => ({ ...p, barRevealDelay: parseInt(e.target.value) || 0 }))}
                min="20" max="2000" step="20" />
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
            setBarRevealDelay(timingInputs.barRevealDelay);
            setHoldDuration(timingInputs.holdDuration);
          }}>Confirm</button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: NATO Defence Expenditure of NATO Countries (2014–2023)</p>
        </footer>
      </main>
    </div>
  );
}

export default RadialBarChart;
