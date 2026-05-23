import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleLinear, scaleLog } from 'd3-scale';
import { natoMembers, YEAR_START, YEAR_END, getMembersByYear } from '../data/natoMembers.js';
import styles from './ScatterPlot.module.css';

const JOIN_YEARS = [...new Set(natoMembers.map(m => m.year))].sort((a, b) => a - b);

// Members sorted chronologically then alphabetically
const MEMBERS_IN_ORDER = [...natoMembers].sort((a, b) =>
  a.year !== b.year ? a.year - b.year : a.country.localeCompare(b.country)
);

// Chart dimensions
const MARGIN = { top: 32, right: 48, bottom: 56, left: 80 };
const CHART_W = 860;
const CHART_H = 480;
const INNER_W = CHART_W - MARGIN.left - MARGIN.right;
const INNER_H = CHART_H - MARGIN.top - MARGIN.bottom;

// Scales (fixed)
const xScale = scaleLinear()
  .domain([1945, YEAR_END + 2])
  .range([0, INNER_W]);

const yScale = scaleLog()
  .domain([200000, 400000000])
  .range([INNER_H, 0])
  .clamp(true);

// Y axis ticks — human-readable population labels
const Y_TICKS = [
  { value: 500000,   label: '500k' },
  { value: 1000000,  label: '1M' },
  { value: 5000000,  label: '5M' },
  { value: 10000000, label: '10M' },
  { value: 50000000, label: '50M' },
  { value: 100000000,label: '100M' },
  { value: 350000000,label: '350M' },
];

const X_TICKS = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

function formatPop(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  return `${(n / 1000).toFixed(0)}k`;
}

function ScatterPlot() {
  const yearRef = useRef(YEAR_START);
  const revealIndexRef = useRef(0);

  const [year, setYear]                       = useState(YEAR_START);
  const [isPlaying, setIsPlaying]             = useState(true);
  const [visibleMembers, setVisibleMembers]   = useState([]);
  const [flashingId, setFlashingId]           = useState(null);
  const [tooltip, setTooltip]                 = useState(null);
  const [animationPhase, setAnimationPhase]   = useState('revealing');

  const [memberRevealDelay, setMemberRevealDelay] = useState(600);
  const [yearNormalDelay, setYearNormalDelay]     = useState(80);
  const [yearBigGapDelay, setYearBigGapDelay]     = useState(300);
  const [initialHold, setInitialHold]             = useState(800);
  const [timingInputs, setTimingInputs] = useState({
    memberRevealDelay: 600, yearNormalDelay: 80, yearBigGapDelay: 300, initialHold: 800,
  });

  // ── Animation loop ──
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;

    const runAnimation = () => {
      const idx = revealIndexRef.current;

      if (animationPhase === 'revealing') {
        if (idx < MEMBERS_IN_ORDER.length) {
          const member = MEMBERS_IN_ORDER[idx];
          // Advance year to match member
          yearRef.current = member.year;
          setYear(member.year);
          setFlashingId(member.id);
          setVisibleMembers(prev => [...prev, member]);
          revealIndexRef.current += 1;
          setTimeout(() => setFlashingId(null), 500);
          timeoutId = setTimeout(runAnimation, memberRevealDelay);
        } else {
          setIsPlaying(false);
        }
      }
    };

    timeoutId = setTimeout(runAnimation, initialHold);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, animationPhase, memberRevealDelay, initialHold]);

  // ── Scrub ──
  const handleScrub = useCallback((scrubYear) => {
    const y = parseInt(scrubYear);
    setIsPlaying(false);
    setFlashingId(null);
    yearRef.current = y;
    setYear(y);
    const members = getMembersByYear(y).sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.country.localeCompare(b.country)
    );
    setVisibleMembers(members);
    revealIndexRef.current = members.length;
  }, []);

  // ── Replay ──
  const handleReplay = useCallback(() => {
    setYear(YEAR_START);
    yearRef.current = YEAR_START;
    setVisibleMembers([]);
    setFlashingId(null);
    revealIndexRef.current = 0;
    setAnimationPhase('revealing');
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  const isJoinYear = JOIN_YEARS.includes(year);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Scatter Plot</h1>
        <p className={styles.subtitle}>Example: Two-axis point reveal — year joined vs population (log scale)</p>
      </header>

      <main className={styles.main}>
        {/* Year display */}
        <div className={styles.yearDisplay}>
          <span
            className={styles.yearNumber}
            style={{ color: isJoinYear ? '#ff00ff' : '#ffffff' }}
          >{year}</span>
          <span className={styles.memberCount}>{visibleMembers.length} / 32 members</span>
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}>
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className={styles.svg}
            preserveAspectRatio="xMidYMid meet"
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

              {/* Grid lines */}
              {Y_TICKS.map(t => (
                <line
                  key={t.value}
                  x1={0} x2={INNER_W}
                  y1={yScale(t.value)} y2={yScale(t.value)}
                  stroke="#2a2a4a" strokeWidth={1}
                />
              ))}
              {X_TICKS.map(t => (
                <line
                  key={t}
                  x1={xScale(t)} x2={xScale(t)}
                  y1={0} y2={INNER_H}
                  stroke="#2a2a4a" strokeWidth={1}
                />
              ))}

              {/* X axis */}
              <line x1={0} x2={INNER_W} y1={INNER_H} y2={INNER_H} stroke="#3a3a5a" strokeWidth={1.5} />
              {X_TICKS.map(t => (
                <g key={t} transform={`translate(${xScale(t)},${INNER_H})`}>
                  <line y2={6} stroke="#3a3a5a" />
                  <text y={20} textAnchor="middle" fill="#7f8c8d" fontSize={11}>{t}</text>
                </g>
              ))}
              <text
                x={INNER_W / 2} y={INNER_H + 46}
                textAnchor="middle" fill="#7f8c8d" fontSize={12}
              >Year Joined</text>

              {/* Y axis */}
              <line x1={0} x2={0} y1={0} y2={INNER_H} stroke="#3a3a5a" strokeWidth={1.5} />
              {Y_TICKS.map(t => (
                <g key={t.value} transform={`translate(0,${yScale(t.value)})`}>
                  <line x2={-6} stroke="#3a3a5a" />
                  <text x={-10} textAnchor="end" dominantBaseline="middle" fill="#7f8c8d" fontSize={11}>{t.label}</text>
                </g>
              ))}
              <text
                transform={`translate(${-62},${INNER_H / 2}) rotate(-90)`}
                textAnchor="middle" fill="#7f8c8d" fontSize={12}
              >Population</text>

              {/* Dots */}
              <AnimatePresence>
                {visibleMembers.map(member => {
                  const cx = xScale(member.year);
                  const cy = yScale(member.population);
                  const isFlashing = flashingId === member.id;
                  return (
                    <motion.g
                      key={member.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      style={{ transformOrigin: `${cx}px ${cy}px` }}
                      onMouseEnter={() => setTooltip({ member, cx, cy })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isFlashing ? 14 : 9}
                        fill={isFlashing ? '#ff00ff' : '#1a5276'}
                        stroke={isFlashing ? '#ff00ff' : '#2471a3'}
                        strokeWidth={2}
                        style={{ transition: 'r 0.3s ease, fill 0.3s ease' }}
                      />
                      <text
                        x={cx + 13}
                        y={cy + 4}
                        fontSize={13}
                        fill="#ffffff"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >{member.flag}</text>
                    </motion.g>
                  );
                })}
              </AnimatePresence>

            </g>
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className={styles.tooltip}
              style={{
                left: `${(MARGIN.left + xScale(tooltip.member.year)) / CHART_W * 100}%`,
                top: `${(MARGIN.top + yScale(tooltip.member.population)) / CHART_H * 100}%`,
              }}
            >
              <span className={styles.tooltipFlag}>{tooltip.member.flag}</span>
              <span className={styles.tooltipName}>{tooltip.member.country}</span>
              <span className={styles.tooltipDetail}>Joined: {tooltip.member.year}</span>
              <span className={styles.tooltipDetail}>Population: {formatPop(tooltip.member.population)}</span>
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
          <span className={styles.scrubberYear}>{YEAR_START}</span>
          <input
            type="range"
            className={styles.scrubber}
            min={YEAR_START}
            max={YEAR_END}
            step={1}
            value={year}
            onChange={e => handleScrub(e.target.value)}
            style={{ '--progress': ((year - YEAR_START) / (YEAR_END - YEAR_START)) * 100 }}
          />
          <span className={styles.scrubberYear}>{YEAR_END}</span>
        </div>

        {/* Timing controls */}
        <div className={styles.timingControls}>
          <div className={styles.timingGrid}>
            <div className={styles.timingField}>
              <label>Initial Hold (ms)</label>
              <input type="number" value={timingInputs.initialHold}
                onChange={e => setTimingInputs(p => ({ ...p, initialHold: parseInt(e.target.value) || 0 }))}
                min="100" max="5000" step="100" />
            </div>
            <div className={styles.timingField}>
              <label>Dot Reveal (ms)</label>
              <input type="number" value={timingInputs.memberRevealDelay}
                onChange={e => setTimingInputs(p => ({ ...p, memberRevealDelay: parseInt(e.target.value) || 0 }))}
                min="50" max="3000" step="50" />
            </div>
          </div>
          <button className={styles.confirmButton} onClick={() => {
            setInitialHold(timingInputs.initialHold);
            setMemberRevealDelay(timingInputs.memberRevealDelay);
          }}>
            Confirm
          </button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Example data: NATO Membership Records</p>
        </footer>
      </main>
    </div>
  );
}

export default ScatterPlot;
