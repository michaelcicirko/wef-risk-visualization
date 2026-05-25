import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleLinear, scaleBand } from 'd3-scale';
import { natoSpending, regionColors, SNAPSHOT_YEARS, NATO_TARGET_PCT } from '../data/natoSpending.js';
import styles from './LollipopChart.module.css';

const SVG_W = 860;
const SVG_H = 460;
const MARGIN = { top: 30, right: 24, bottom: 64, left: 48 };
const W = SVG_W - MARGIN.left - MARGIN.right;
const H = SVG_H - MARGIN.top - MARGIN.bottom;
const DOT_R = 7;

function getSorted(year) {
  return [...natoSpending]
    .map(m => ({ ...m, gdpPct: m[year]?.gdpPct ?? 0, gdpAbsUsdBn: m[year]?.gdpAbsUsdBn ?? 0 }))
    .sort((a, b) => b.gdpPct - a.gdpPct);
}

// Pre-sort for all years
const SORTED = {};
SNAPSHOT_YEARS.forEach(y => { SORTED[y] = getSorted(y); });

function LollipopChart() {
  const revealRef = useRef(0);
  const [yearIndex, setYearIndex]       = useState(0);
  const [revealCount, setRevealCount]   = useState(0);
  const [isPlaying, setIsPlaying]       = useState(true);
  const [flashingId, setFlashingId]     = useState(null);
  const [tooltip, setTooltip]           = useState(null);

  const [stemRevealDelay, setStemRevealDelay] = useState(120);
  const [holdDuration, setHoldDuration]       = useState(1800);
  const [initialHold, setInitialHold]         = useState(600);
  const [timingInputs, setTimingInputs] = useState({
    stemRevealDelay: 120, holdDuration: 1800, initialHold: 600
  });

  const currentYear = SNAPSHOT_YEARS[yearIndex];
  const members = SORTED[currentYear];
  const TOTAL = members.length;

  // Visible slice
  const visible = useMemo(() => members.slice(0, revealCount), [members, revealCount]);

  // Scales — use all members for band (fixed x positions across year changes)
  // X keyed by member id in current sort order
  const xScale = useMemo(() =>
    scaleBand()
      .domain(members.map(m => m.id))
      .range([0, W])
      .padding(0.3),
    [members]
  );

  const maxVal = 4.2;
  const yScale = useMemo(() =>
    scaleLinear().domain([0, maxVal]).range([H, 0]).nice(),
    []
  );

  const yTicks = yScale.ticks(5);

  // ── Animation loop ──
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;

    const reveal = () => {
      const idx = revealRef.current;
      if (idx >= TOTAL) {
        // Hold then advance year
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
      const member = members[idx];
      revealRef.current += 1;
      setRevealCount(revealRef.current);
      setFlashingId(member.id);
      setTimeout(() => setFlashingId(null), 350);
      timeoutId = setTimeout(reveal, stemRevealDelay);
    };

    timeoutId = setTimeout(reveal, initialHold);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, stemRevealDelay, holdDuration, initialHold, yearIndex, members, TOTAL]);

  // ── Replay ──
  const handleReplay = useCallback(() => {
    setIsPlaying(false);
    revealRef.current = 0;
    setRevealCount(0);
    setYearIndex(0);
    setFlashingId(null);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  // ── Year pill click ──
  const handleYearClick = useCallback((idx) => {
    setIsPlaying(false);
    setYearIndex(idx);
    revealRef.current = SORTED[SNAPSHOT_YEARS[idx]].length;
    setRevealCount(revealRef.current);
    setFlashingId(null);
  }, []);

  // ── Scrub ──
  const handleScrub = useCallback((val) => {
    setIsPlaying(false);
    const count = parseInt(val);
    revealRef.current = count;
    setRevealCount(count);
    setFlashingId(null);
  }, []);

  const metTarget = members.filter(m => m.gdpPct >= NATO_TARGET_PCT).length;
  const targetY = yScale(NATO_TARGET_PCT);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Lollipop Chart — NATO Defence Spending</h1>
        <p className={styles.subtitle}>
          Each lollipop represents one NATO member — stem height and dot position encode % of GDP
          spent on defence, sorted highest to lowest. The dashed line marks the 2% NATO target.
        </p>
      </header>

      <main className={styles.main}>
        {/* Year pills + stats */}
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
            <span className={styles.statValue}>{metTarget}</span>
            <span className={styles.statLabel}> / {TOTAL} members meet 2% target</span>
          </div>
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            onMouseLeave={() => setTooltip(null)}
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

              {/* Grid lines */}
              {yTicks.map(t => (
                <line
                  key={t}
                  x1={0} x2={W}
                  y1={yScale(t)} y2={yScale(t)}
                  stroke="#2a2a4a"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
              ))}

              {/* 2% NATO target line */}
              <line
                x1={0} x2={W}
                y1={targetY} y2={targetY}
                stroke="#ff00ff"
                strokeWidth={1.5}
                strokeDasharray="6,4"
                opacity={0.75}
              />
              <text
                x={W - 4} y={targetY - 5}
                textAnchor="end"
                fontSize={9}
                fill="#ff00ff"
                opacity={0.85}
                style={{ userSelect: 'none' }}
              >2% target</text>

              {/* Lollipops */}
              <AnimatePresence>
                {visible.map(member => {
                  const x = xScale(member.id);
                  if (x === undefined) return null;
                  const cx = x + xScale.bandwidth() / 2;
                  const stemTop = yScale(member.gdpPct);
                  const isFlashing = flashingId === member.id;
                  const metPct = member.gdpPct >= NATO_TARGET_PCT;
                  const color = isFlashing ? '#ff00ff' : regionColors[member.region] || '#5a5a8a';
                  const r = metPct ? DOT_R + 2 : DOT_R;

                  return (
                    <motion.g
                      key={`${member.id}-${currentYear}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onMouseEnter={() => setTooltip({ member, cx, stemTop })}
                      onMouseLeave={() => setTooltip(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Stem */}
                      <motion.line
                        x1={cx} x2={cx}
                        y1={H} y2={H}
                        stroke={color}
                        strokeWidth={2}
                        strokeOpacity={0.7}
                        animate={{ y2: stemTop }}
                        transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.05 }}
                      />
                      {/* Dot */}
                      <motion.circle
                        cx={cx}
                        cy={H}
                        r={0}
                        fill={color}
                        stroke={metPct ? '#ffffff' : 'none'}
                        strokeWidth={1.5}
                        animate={{ cy: stemTop, r }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.12 }}
                      />
                      {/* Target met indicator ring */}
                      {metPct && (
                        <motion.circle
                          cx={cx}
                          cy={H}
                          r={0}
                          fill="none"
                          stroke="#00ff88"
                          strokeWidth={1.5}
                          opacity={0.7}
                          animate={{ cy: stemTop, r: r + 4 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.18 }}
                        />
                      )}
                    </motion.g>
                  );
                })}
              </AnimatePresence>

              {/* X axis */}
              <g transform={`translate(0,${H})`}>
                <line x1={0} x2={W} stroke="#3a3a5a" strokeWidth={1} />
                {members.map((m, i) => {
                  if (i >= revealCount) return null;
                  const x = xScale(m.id);
                  if (x === undefined) return null;
                  const cx = x + xScale.bandwidth() / 2;
                  return (
                    <g key={m.id} transform={`translate(${cx},0)`}>
                      <text
                        y={16}
                        textAnchor="middle"
                        fontSize={11}
                        style={{ userSelect: 'none' }}
                      >{m.flag}</text>
                      <text
                        y={30}
                        textAnchor="middle"
                        fontSize={8}
                        fill="#5a5a8a"
                        style={{ userSelect: 'none' }}
                      >{m.id.toUpperCase()}</text>
                    </g>
                  );
                })}
              </g>

              {/* Y axis */}
              <g>
                <line y1={0} y2={H} stroke="#3a3a5a" strokeWidth={1} />
                {yTicks.map(t => (
                  <g key={t} transform={`translate(0,${yScale(t)})`}>
                    <line x1={-4} x2={0} stroke="#3a3a5a" />
                    <text
                      x={-8}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontSize={9}
                      fill="#7f8c8d"
                      style={{ userSelect: 'none' }}
                    >{t.toFixed(1)}%</text>
                  </g>
                ))}
                <text
                  transform={`translate(-36,${H / 2}) rotate(-90)`}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#7f8c8d"
                  style={{ userSelect: 'none' }}
                >% of GDP</text>
              </g>

            </g>
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className={styles.tooltip}
              style={{
                left: (tooltip.cx + MARGIN.left) / SVG_W * 100 + '%',
                top: (tooltip.stemTop + MARGIN.top) / SVG_H * 100 + '%',
              }}
            >
              <span className={styles.tooltipFlag}>{tooltip.member.flag}</span>
              <span className={styles.tooltipName}>{tooltip.member.country}</span>
              <span className={styles.tooltipPct}>{tooltip.member.gdpPct.toFixed(2)}% GDP</span>
              <span className={styles.tooltipAbs}>~${tooltip.member.gdpAbsUsdBn}bn</span>
              <span className={`${styles.tooltipTarget} ${tooltip.member.gdpPct >= NATO_TARGET_PCT ? styles.targetMet : styles.targetMissed}`}>
                {tooltip.member.gdpPct >= NATO_TARGET_PCT ? '✓ Meets 2% target' : '✗ Below 2% target'}
              </span>
            </div>
          )}
        </div>

        {/* Region legend */}
        <div className={styles.legend}>
          {Object.entries(regionColors).map(([region, color]) => (
            <div key={region} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color }} />
              <span>{region}</span>
            </div>
          ))}
          <div className={styles.legendItem}>
            <span className={styles.legendRing} />
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
              <label>Stem Reveal (ms)</label>
              <input type="number" value={timingInputs.stemRevealDelay}
                onChange={e => setTimingInputs(p => ({ ...p, stemRevealDelay: parseInt(e.target.value) || 0 }))}
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
            setStemRevealDelay(timingInputs.stemRevealDelay);
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

export default LollipopChart;
