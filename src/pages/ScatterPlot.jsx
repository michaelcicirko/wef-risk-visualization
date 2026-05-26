import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleLinear } from 'd3-scale';
import styles from './ScatterPlot.module.css';

// Region colours
const REGION_COLORS = {
  Europe:   '#3498db',
  Americas: '#2ecc71',
  Asia:     '#e74c3c',
  Africa:   '#f39c12',
  Oceania:  '#9b59b6',
  Other:    '#7f8c8d',
};

// Chart dimensions
const MARGIN = { top: 32, right: 32, bottom: 60, left: 72 };
const CHART_W = 880;
const CHART_H = 520;
const INNER_W = CHART_W - MARGIN.left - MARGIN.right;
const INNER_H = CHART_H - MARGIN.top - MARGIN.bottom;

// Scales (0–1 on both axes)
const xScale = scaleLinear().domain([0, 1]).range([0, INNER_W]);
const yScale = scaleLinear().domain([0, 1]).range([INNER_H, 0]);

const AXIS_TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

function ScatterPlot() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleIndices, setVisibleIndices] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [flashIdx, setFlashIdx] = useState(null);
  const [activeRegions, setActiveRegions] = useState(null);

  const runningRef = useRef(false);
  const rafRef = useRef(null);
  const revealRef = useRef(0);

  // Load data
  useEffect(() => {
    fetch('/vdem-scatter-corruption.json')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
        setActiveRegions(new Set(Object.keys(REGION_COLORS)));
      })
      .catch(() => setLoading(false));
  }, []);

  // Animation loop — reveal one dot at a time
  useEffect(() => {
    if (!isPlaying || !data) {
      runningRef.current = false;
      return;
    }
    runningRef.current = true;
    const total = data.countries.length;

    const step = () => {
      if (!runningRef.current) return;
      const idx = revealRef.current;
      if (idx >= total) {
        setIsPlaying(false);
        runningRef.current = false;
        return;
      }
      setVisibleIndices(prev => [...prev, idx]);
      setFlashIdx(idx);
      setTimeout(() => setFlashIdx(null), 350);
      revealRef.current += 1;
      rafRef.current = setTimeout(step, 60);
    };

    rafRef.current = setTimeout(step, 400);
    return () => {
      runningRef.current = false;
      clearTimeout(rafRef.current);
    };
  }, [isPlaying, data]);

  // Auto-play on load
  useEffect(() => {
    if (data && visibleIndices.length === 0) {
      setIsPlaying(true);
    }
  }, [data]);

  const handleReplay = useCallback(() => {
    runningRef.current = false;
    clearTimeout(rafRef.current);
    setVisibleIndices([]);
    setFlashIdx(null);
    setTooltip(null);
    revealRef.current = 0;
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  const handleShowAll = useCallback(() => {
    if (!data) return;
    runningRef.current = false;
    clearTimeout(rafRef.current);
    setIsPlaying(false);
    setVisibleIndices(data.countries.map((_, i) => i));
    revealRef.current = data.countries.length;
  }, [data]);

  const toggleRegion = useCallback((region) => {
    setActiveRegions(prev => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region); else next.add(region);
      return next;
    });
  }, []);

  if (loading) return <div className={styles.page}><p style={{ color: '#7f8c8d', textAlign: 'center', marginTop: 80 }}>Loading…</p></div>;
  if (!data) return <div className={styles.page}><p style={{ color: '#e74c3c', textAlign: 'center', marginTop: 80 }}>Failed to load data</p></div>;

  const countries = data.countries;
  const revealed = visibleIndices.map(i => countries[i]).filter(Boolean);

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
        <h1 className={styles.title}>Electoral Democracy vs Political Corruption</h1>
        <p className={styles.subtitle}>
          V-Dem Institute {data.year} — {countries.length} countries
        </p>
      </header>

      <main className={styles.main}>
        {/* Counter */}
        <div className={styles.yearDisplay}>
          <span className={styles.yearNumber}>{revealed.length}</span>
          <span className={styles.memberCount}>/ {countries.length} countries</span>
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          {Object.entries(REGION_COLORS).map(([region, color]) => (
            <button
              key={region}
              className={`${styles.legendItem} ${activeRegions && !activeRegions.has(region) ? styles.legendInactive : ''}`}
              onClick={() => toggleRegion(region)}
            >
              <span className={styles.legendDot} style={{ background: color }} />
              {region}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}>
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className={styles.svg}
            preserveAspectRatio="xMidYMid meet"
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {/* Grid */}
              {AXIS_TICKS.map(t => (
                <line key={`gx-${t}`} x1={xScale(t)} x2={xScale(t)} y1={0} y2={INNER_H} stroke="#2a2a4a" strokeWidth={1} />
              ))}
              {AXIS_TICKS.map(t => (
                <line key={`gy-${t}`} x1={0} x2={INNER_W} y1={yScale(t)} y2={yScale(t)} stroke="#2a2a4a" strokeWidth={1} />
              ))}

              {/* X axis */}
              <line x1={0} x2={INNER_W} y1={INNER_H} y2={INNER_H} stroke="#3a3a5a" strokeWidth={1.5} />
              {AXIS_TICKS.map(t => (
                <g key={`xt-${t}`} transform={`translate(${xScale(t)},${INNER_H})`}>
                  <line y2={6} stroke="#3a3a5a" />
                  <text y={20} textAnchor="middle" fill="#7f8c8d" fontSize={11}>{t.toFixed(1)}</text>
                </g>
              ))}
              <text x={INNER_W / 2} y={INNER_H + 48} textAnchor="middle" fill="#95a5a6" fontSize={12} fontWeight={600}>
                Electoral Democracy Index →
              </text>

              {/* Y axis */}
              <line x1={0} x2={0} y1={0} y2={INNER_H} stroke="#3a3a5a" strokeWidth={1.5} />
              {AXIS_TICKS.map(t => (
                <g key={`yt-${t}`} transform={`translate(0,${yScale(t)})`}>
                  <line x2={-6} stroke="#3a3a5a" />
                  <text x={-10} textAnchor="end" dominantBaseline="middle" fill="#7f8c8d" fontSize={11}>{t.toFixed(1)}</text>
                </g>
              ))}
              <text
                transform={`translate(${-56},${INNER_H / 2}) rotate(-90)`}
                textAnchor="middle" fill="#95a5a6" fontSize={12} fontWeight={600}
              >← Political Corruption Index</text>

              {/* Quadrant labels */}
              <text x={INNER_W * 0.02} y={14} fill="#3a3a5a" fontSize={10} fontWeight={600}>HIGH CORRUPTION · LOW DEMOCRACY</text>
              <text x={INNER_W * 0.98} y={14} textAnchor="end" fill="#3a3a5a" fontSize={10} fontWeight={600}>HIGH CORRUPTION · HIGH DEMOCRACY</text>
              <text x={INNER_W * 0.02} y={INNER_H - 6} fill="#3a3a5a" fontSize={10} fontWeight={600}>LOW CORRUPTION · LOW DEMOCRACY</text>
              <text x={INNER_W * 0.98} y={INNER_H - 6} textAnchor="end" fill="#3a3a5a" fontSize={10} fontWeight={600}>LOW CORRUPTION · HIGH DEMOCRACY</text>

              {/* Dots */}
              <AnimatePresence>
                {revealed.map((c, i) => {
                  if (activeRegions && !activeRegions.has(c.region)) return null;
                  const cx = xScale(c.democracy);
                  const cy = yScale(c.corruption);
                  const isFlash = flashIdx === visibleIndices[i];
                  const color = REGION_COLORS[c.region] || '#7f8c8d';
                  return (
                    <motion.circle
                      key={c.code}
                      cx={cx}
                      cy={cy}
                      r={isFlash ? 8 : 5}
                      fill={color}
                      fillOpacity={0.8}
                      stroke={isFlash ? '#ffffff' : color}
                      strokeWidth={isFlash ? 2 : 1}
                      initial={{ r: 0, opacity: 0 }}
                      animate={{ r: isFlash ? 8 : 5, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      style={{ cursor: 'pointer', transition: 'r 0.2s, stroke 0.2s' }}
                      onMouseEnter={() => setTooltip({ c, cx, cy })}
                      onMouseLeave={() => setTooltip(null)}
                    />
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
                left: `${(MARGIN.left + tooltip.cx) / CHART_W * 100}%`,
                top: `${(MARGIN.top + tooltip.cy) / CHART_H * 100}%`,
              }}
            >
              <span className={styles.tooltipName}>{tooltip.c.country}</span>
              <span className={styles.tooltipDetail}>Democracy: {tooltip.c.democracy.toFixed(3)}</span>
              <span className={styles.tooltipDetail}>Corruption: {tooltip.c.corruption.toFixed(3)}</span>
              <span className={styles.tooltipDetail} style={{ color: REGION_COLORS[tooltip.c.region] }}>{tooltip.c.region}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className={styles.progressContainer}>
          <div
            className={styles.progressBar}
            style={{ width: `${(revealed.length / countries.length) * 100}%` }}
          />
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: V-Dem Institute v16 — Electoral Democracy Index (v2x_polyarchy) vs Political Corruption Index (v2x_corr)</p>
        </footer>
      </main>
    </div>
  );
}

export default ScatterPlot;
