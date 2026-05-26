import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { scaleLinear, scaleSqrt } from 'd3-scale';
import styles from './BubbleChart.module.css';

const REGION_COLORS = {
  'Europe':       '#4e79a7',
  'Middle East':  '#f28e2b',
  'Americas':     '#e15759',
  'Asia-Pacific': '#76b7b2',
  'Africa':       '#59a14f',
};

const SVG_W = 800;
const SVG_H = 540;
const MARGIN = { top: 30, right: 30, bottom: 50, left: 60 };
const INNER_W = SVG_W - MARGIN.left - MARGIN.right;
const INNER_H = SVG_H - MARGIN.top - MARGIN.bottom;

function BubbleChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [yearIndex, setYearIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  const yearIndexRef = useRef(0);
  const runningRef = useRef(false);
  const timerRef = useRef(null);

  const [holdDuration, setHoldDuration] = useState(1400);
  const [initialHold, setInitialHold] = useState(800);
  const [timingInputs, setTimingInputs] = useState({ holdDuration: 1400, initialHold: 800 });

  // Load data
  useEffect(() => {
    fetch('/gpi-bubbles.json')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const years = data?.years || [];
  const currentYear = years[yearIndex] || 2008;
  const currentData = data?.data?.[currentYear] || [];

  // Scales
  const xScale = useMemo(() => scaleLinear().domain([1, 4.5]).range([0, INNER_W]), []);
  const yScale = useMemo(() => scaleLinear().domain([1, 4.5]).range([INNER_H, 0]), []);
  const rScale = useMemo(() => scaleSqrt().domain([0, 1500]).range([4, 50]), []);

  // Auto-play on load
  useEffect(() => {
    if (data && !isPlaying) {
      setTimeout(() => setIsPlaying(true), 300);
    }
  }, [data]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !data) {
      runningRef.current = false;
      return;
    }
    runningRef.current = true;

    const advance = () => {
      if (!runningRef.current) return;
      const next = yearIndexRef.current + 1;
      if (next >= years.length) {
        setIsPlaying(false);
        runningRef.current = false;
        return;
      }
      yearIndexRef.current = next;
      setYearIndex(next);
      timerRef.current = setTimeout(advance, holdDuration);
    };

    timerRef.current = setTimeout(advance, yearIndex === 0 ? initialHold : holdDuration);
    return () => {
      runningRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, [isPlaying, holdDuration, initialHold, data, years.length]);

  const handleReplay = useCallback(() => {
    runningRef.current = false;
    clearTimeout(timerRef.current);
    yearIndexRef.current = 0;
    setYearIndex(0);
    setTooltip(null);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  const handleShowAll = useCallback(() => {
    runningRef.current = false;
    clearTimeout(timerRef.current);
    setIsPlaying(false);
    yearIndexRef.current = years.length - 1;
    setYearIndex(years.length - 1);
  }, [years.length]);

  const handleScrub = useCallback((val) => {
    setIsPlaying(false);
    runningRef.current = false;
    clearTimeout(timerRef.current);
    const idx = parseInt(val);
    yearIndexRef.current = idx;
    setYearIndex(idx);
    setTooltip(null);
  }, []);

  // X-axis ticks
  const xTicks = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5];
  const yTicks = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5];

  if (loading) return <div className={styles.page}><p style={{ color: '#7f8c8d', textAlign: 'center', marginTop: 80 }}>Loading…</p></div>;
  if (!data) return <div className={styles.page}><p style={{ color: '#e74c3c', textAlign: 'center', marginTop: 80 }}>Failed to load data</p></div>;

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
        <div className={styles.navControls}>
          <button className={styles.controlButton} onClick={() => setIsPlaying(p => !p)}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button className={styles.controlButton} onClick={handleReplay}>Replay</button>
          <button className={styles.controlButton} onClick={handleShowAll}>Latest</button>
        </div>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Militarization vs Safety & Security</h1>
        <p className={styles.subtitle}>
          Global Peace Index — {currentData.length} countries, bubble size = population
        </p>
      </header>

      <main className={styles.main}>
        {/* Legend */}
        <div className={styles.legend}>
          {Object.entries(REGION_COLORS).map(([region, color]) => (
            <div key={region} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color }} />
              <span>{region}</span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            preserveAspectRatio="xMidYMid meet"
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {/* Grid lines */}
              {xTicks.map(t => (
                <line key={`xg-${t}`} x1={xScale(t)} x2={xScale(t)} y1={0} y2={INNER_H}
                  stroke="#2a2a4a" strokeWidth={0.5} />
              ))}
              {yTicks.map(t => (
                <line key={`yg-${t}`} x1={0} x2={INNER_W} y1={yScale(t)} y2={yScale(t)}
                  stroke="#2a2a4a" strokeWidth={0.5} />
              ))}

              {/* X axis */}
              <line x1={0} x2={INNER_W} y1={INNER_H} y2={INNER_H} stroke="#5a5a8a" strokeWidth={1} />
              {xTicks.map(t => (
                <text key={`xt-${t}`} x={xScale(t)} y={INNER_H + 20}
                  textAnchor="middle" fill="#7f8c8d" fontSize={11}>{t.toFixed(1)}</text>
              ))}
              <text x={INNER_W / 2} y={INNER_H + 40}
                textAnchor="middle" fill="#aaaacc" fontSize={12} fontWeight={600}>
                Militarization Score →
              </text>

              {/* Y axis */}
              <line x1={0} x2={0} y1={0} y2={INNER_H} stroke="#5a5a8a" strokeWidth={1} />
              {yTicks.map(t => (
                <text key={`yt-${t}`} x={-10} y={yScale(t) + 4}
                  textAnchor="end" fill="#7f8c8d" fontSize={11}>{t.toFixed(1)}</text>
              ))}
              <text x={-45} y={INNER_H / 2}
                textAnchor="middle" fill="#aaaacc" fontSize={12} fontWeight={600}
                transform={`rotate(-90, -45, ${INNER_H / 2})`}>
                ← Safety & Security Score
              </text>

              {/* Quadrant labels */}
              <text x={10} y={16} fill="#3a3a5a" fontSize={10}>LOW MILITARIZATION · UNSAFE</text>
              <text x={INNER_W - 10} y={16} fill="#3a3a5a" fontSize={10} textAnchor="end">HIGH MILITARIZATION · UNSAFE</text>
              <text x={10} y={INNER_H - 8} fill="#3a3a5a" fontSize={10}>LOW MILITARIZATION · SAFE</text>
              <text x={INNER_W - 10} y={INNER_H - 8} fill="#3a3a5a" fontSize={10} textAnchor="end">HIGH MILITARIZATION · SAFE</text>

              {/* Bubbles */}
              {currentData.map(d => {
                const cx = xScale(d.militarization);
                const cy = yScale(d.safety);
                const r = rScale(d.population);
                const color = REGION_COLORS[d.region] || '#888';

                return (
                  <motion.circle
                    key={d.country}
                    initial={{ cx, cy, r: 0 }}
                    animate={{ cx, cy, r }}
                    transition={{ type: 'spring', stiffness: 80, damping: 18, mass: 1 }}
                    fill={color}
                    fillOpacity={0.7}
                    stroke={color}
                    strokeWidth={1.5}
                    strokeOpacity={0.9}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setTooltip(d)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}

              {/* Country labels */}
              {currentData.map(d => {
                const lx = xScale(d.militarization);
                const ly = yScale(d.safety);
                const br = rScale(d.population);
                const isLarge = d.population > 100;
                return (
                  <motion.text
                    key={`lbl-${d.country}`}
                    initial={{ x: lx, y: isLarge ? ly + 3 : ly - br - 4, opacity: 0 }}
                    animate={{ x: lx, y: isLarge ? ly + 3 : ly - br - 4, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 80, damping: 18, mass: 1 }}
                    textAnchor="middle"
                    fill={isLarge ? '#ffffff' : '#bdc3c7'}
                    fontSize={isLarge ? 9 : 7}
                    fontWeight={isLarge ? 600 : 500}
                    style={{ pointerEvents: 'none' }}
                  >{d.country}</motion.text>
                );
              })}
            </g>
          </svg>

          {/* Year watermark */}
          <div className={styles.yearWatermark}>{currentYear}</div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div className={styles.tooltip}>
            <span className={styles.tooltipTitle}>{tooltip.country}</span>
            <span className={styles.tooltipRegion} style={{ color: REGION_COLORS[tooltip.region] }}>{tooltip.region}</span>
            <span className={styles.tooltipRow}>GPI Overall: <strong>{tooltip.gpi?.toFixed(3)}</strong></span>
            <span className={styles.tooltipRow}>Militarization: <strong>{tooltip.militarization?.toFixed(3)}</strong></span>
            <span className={styles.tooltipRow}>Safety & Security: <strong>{tooltip.safety?.toFixed(3)}</strong></span>
            <span className={styles.tooltipRow}>Conflict: <strong>{tooltip.conflict?.toFixed(3)}</strong></span>
            <span className={styles.tooltipRow}>Population: <strong>{tooltip.population}M</strong></span>
          </div>
        )}

        {/* Year slider */}
        <div className={styles.scrubberContainer}>
          <span className={styles.scrubberLabel}>{years[0]}</span>
          <input
            type="range"
            className={styles.scrubber}
            min={0}
            max={years.length - 1}
            step={1}
            value={yearIndex}
            onChange={e => handleScrub(e.target.value)}
          />
          <span className={styles.scrubberLabel}>{years[years.length - 1]}</span>
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
                min="300" max="5000" step="100" />
            </div>
          </div>
          <button className={styles.confirmButton} onClick={() => {
            setInitialHold(timingInputs.initialHold);
            setHoldDuration(timingInputs.holdDuration);
          }}>Confirm</button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: Institute for Economics & Peace — Global Peace Index (2008–2025)</p>
        </footer>
      </main>
    </div>
  );
}

export default BubbleChart;
