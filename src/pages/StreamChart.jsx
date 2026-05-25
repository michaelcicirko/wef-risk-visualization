import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { area, stack, stackOrderNone, stackOffsetWiggle, stackOffsetExpand, stackOffsetNone } from 'd3-shape';
import { scaleLinear, scalePoint } from 'd3-scale';
import {
  streamData, streamRegions, STREAM_YEARS, regionColors, annotations, NATO_TARGET
} from '../data/natoSpendingTimeSeries.js';
import styles from './StreamChart.module.css';

const SVG_W = 820;
const SVG_H = 480;
const MARGIN = { top: 30, right: 30, bottom: 50, left: 52 };
const W = SVG_W - MARGIN.left - MARGIN.right;
const H = SVG_H - MARGIN.top - MARGIN.bottom;

const STACK_MODES = [
  { key: 'wiggle', label: 'Stream', offset: stackOffsetWiggle },
  { key: 'expand', label: 'Proportional', offset: stackOffsetExpand },
  { key: 'none',   label: 'Stacked',      offset: stackOffsetNone },
];

// Build stack series from region data
function buildSeries(offset) {
  const rows = STREAM_YEARS.map((year, i) => {
    const row = { year };
    streamData.forEach(r => { row[r.region] = r.values[i]; });
    return row;
  });

  const stackGen = stack()
    .keys(streamRegions)
    .order(stackOrderNone)
    .offset(offset);

  return { series: stackGen(rows), rows };
}

// X scale: point scale over years
const xScale = scalePoint()
  .domain(STREAM_YEARS)
  .range([0, W]);

// Curve helper: monotone X via cubic bezier (no d3-shape curve import needed)
function buildPath(series, yScale) {
  return series.map(layer => {
    const pts = STREAM_YEARS.map((year, i) => ({
      x: xScale(year),
      y0: yScale(layer[i][0]),
      y1: yScale(layer[i][1]),
    }));

    // Build SVG path: top edge L→R, bottom edge R→L
    const top = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y1}` : `L${p.x},${p.y1}`)).join(' ');
    const bot = [...pts].reverse().map(p => `L${p.x},${p.y0}`).join(' ');
    return top + ' ' + bot + ' Z';
  });
}

function StreamChart() {
  const revealRef = useRef(0);
  const [revealCount, setRevealCount]     = useState(0);
  const [isPlaying, setIsPlaying]         = useState(true);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [modeIndex, setModeIndex]         = useState(0);
  const [tooltip, setTooltip]             = useState(null);

  const [pointRevealDelay, setPointRevealDelay] = useState(260);
  const [initialHold, setInitialHold]           = useState(600);
  const [timingInputs, setTimingInputs] = useState({ pointRevealDelay: 260, initialHold: 600 });

  const mode = STACK_MODES[modeIndex];
  const TOTAL_POINTS = STREAM_YEARS.length;

  const { series, rows } = useMemo(() => buildSeries(mode.offset), [mode]);

  // Y domain depends on mode
  const yDomain = useMemo(() => {
    if (mode.key === 'expand') return [0, 1];
    let minVal = Infinity, maxVal = -Infinity;
    series.forEach(layer => {
      layer.forEach(pt => {
        minVal = Math.min(minVal, pt[0]);
        maxVal = Math.max(maxVal, pt[1]);
      });
    });
    return [minVal, maxVal];
  }, [series, mode]);

  const yScale = useMemo(
    () => scaleLinear().domain(yDomain).range([H, 0]).nice(),
    [yDomain]
  );

  // Only show years up to revealCount
  const visibleYears = STREAM_YEARS.slice(0, revealCount);

  // Clip-path progress: how far across the chart to reveal (0→W)
  const clipX = revealCount >= TOTAL_POINTS
    ? W
    : revealCount === 0
      ? 0
      : xScale(STREAM_YEARS[Math.min(revealCount, TOTAL_POINTS - 1)]);

  // ── Animation loop ──
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;

    const advance = () => {
      const idx = revealRef.current;
      if (idx >= TOTAL_POINTS) { setIsPlaying(false); return; }
      revealRef.current += 1;
      setRevealCount(revealRef.current);
      timeoutId = setTimeout(advance, pointRevealDelay);
    };

    timeoutId = setTimeout(advance, initialHold);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, pointRevealDelay, initialHold]);

  // ── Replay ──
  const handleReplay = useCallback(() => {
    setIsPlaying(false);
    revealRef.current = 0;
    setRevealCount(0);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  // Scrub
  const handleScrub = useCallback((val) => {
    setIsPlaying(false);
    const count = parseInt(val);
    revealRef.current = count;
    setRevealCount(count);
  }, []);

  // Y axis ticks
  const yTicks = yScale.ticks(5);

  // Paths for all layers (clipped via clipX)
  const paths = useMemo(() => buildPath(series, yScale), [series, yScale]);

  // Handle SVG mouse move for tooltip
  const handleMouseMove = useCallback((e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (SVG_W / rect.width) - MARGIN.left;
    if (mx < 0 || mx > W) { setTooltip(null); return; }

    // Find nearest year
    let nearestYear = STREAM_YEARS[0];
    let minDist = Infinity;
    STREAM_YEARS.forEach(y => {
      const dist = Math.abs(xScale(y) - mx);
      if (dist < minDist) { minDist = dist; nearestYear = y; }
    });
    if (minDist > 30) { setTooltip(null); return; }

    const yearIdx = STREAM_YEARS.indexOf(nearestYear);
    if (yearIdx >= revealRef.current) { setTooltip(null); return; }

    const yearData = streamData.map(r => ({
      region: r.region,
      value: r.values[yearIdx],
    })).sort((a, b) => b.value - a.value);

    setTooltip({ year: nearestYear, data: yearData, x: xScale(nearestYear) + MARGIN.left });
  }, []);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Stream Chart — NATO Defence Spending</h1>
        <p className={styles.subtitle}>
          Regional average defence expenditure as % of GDP, 2014–2023. Each flowing band represents
          a region — height encodes spend level. The 2022 spike marks Russia's invasion of Ukraine.
          The Wales Summit (2014) established the 2% GDP target.
        </p>
      </header>

      <main className={styles.main}>
        {/* Mode tabs */}
        <div className={styles.modeRow}>
          <span className={styles.modeLabel}>View:</span>
          {STACK_MODES.map((m, i) => (
            <button
              key={m.key}
              className={`${styles.modeButton} ${i === modeIndex ? styles.modeButtonActive : ''}`}
              onClick={() => { setModeIndex(i); handleReplay(); }}
            >{m.label}</button>
          ))}
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}
          onMouseLeave={() => { setTooltip(null); setHoveredRegion(null); }}
        >
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            onMouseMove={handleMouseMove}
          >
            <defs>
              <clipPath id="revealClip">
                <motion.rect
                  x={0} y={-10}
                  height={H + 40}
                  animate={{ width: clipX + 4 }}
                  transition={{ duration: 0.25, ease: 'linear' }}
                />
              </clipPath>
            </defs>

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

              {/* NATO 2% target line (stacked mode only) */}
              {mode.key === 'none' && (
                <line
                  x1={0} x2={W}
                  y1={yScale(NATO_TARGET)} y2={yScale(NATO_TARGET)}
                  stroke="#ff00ff"
                  strokeWidth={1.5}
                  strokeDasharray="6,3"
                  opacity={0.7}
                />
              )}

              {/* Stream layers */}
              <g clipPath="url(#revealClip)">
                {series.map((layer, i) => {
                  const region = streamRegions[i];
                  const color = regionColors[region];
                  const isHovered = hoveredRegion === region;
                  const dimmed = hoveredRegion && !isHovered;
                  return (
                    <motion.path
                      key={region}
                      d={paths[i]}
                      fill={color}
                      fillOpacity={dimmed ? 0.12 : isHovered ? 0.92 : 0.72}
                      stroke={color}
                      strokeWidth={isHovered ? 1.5 : 0.5}
                      strokeOpacity={0.6}
                      animate={{ fillOpacity: dimmed ? 0.12 : isHovered ? 0.92 : 0.72 }}
                      transition={{ duration: 0.2 }}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredRegion(region)}
                    />
                  );
                })}
              </g>

              {/* Annotation lines */}
              {annotations.map(ann => {
                const annIdx = STREAM_YEARS.indexOf(ann.year);
                if (annIdx >= revealCount) return null;
                const ax = xScale(ann.year);
                const lines = ann.label.split('\n');
                return (
                  <g key={ann.year}>
                    <line
                      x1={ax} x2={ax}
                      y1={0} y2={H}
                      stroke="#ffffff"
                      strokeWidth={1}
                      strokeDasharray="4,3"
                      opacity={0.25}
                    />
                    {lines.map((line, li) => (
                      <text
                        key={li}
                        x={ax + (ann.align === 'left' ? 5 : -5)}
                        y={12 + li * 13}
                        textAnchor={ann.align === 'left' ? 'start' : 'end'}
                        fontSize={9}
                        fill="#7f8c8d"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >{line}</text>
                    ))}
                  </g>
                );
              })}

              {/* Tooltip line */}
              {tooltip && (
                <line
                  x1={tooltip.x - MARGIN.left} x2={tooltip.x - MARGIN.left}
                  y1={0} y2={H}
                  stroke="#ffffff"
                  strokeWidth={1}
                  opacity={0.4}
                />
              )}

              {/* X axis */}
              <g transform={`translate(0,${H})`}>
                <line x1={0} x2={W} stroke="#3a3a5a" strokeWidth={1} />
                {STREAM_YEARS.map((y, i) => {
                  if (i >= revealCount) return null;
                  return (
                    <g key={y} transform={`translate(${xScale(y)},0)`}>
                      <line y1={0} y2={5} stroke="#3a3a5a" />
                      <text
                        y={18}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#7f8c8d"
                        style={{ userSelect: 'none' }}
                      >{y}</text>
                    </g>
                  );
                })}
              </g>

              {/* Y axis */}
              {mode.key !== 'wiggle' && (
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
                      >
                        {mode.key === 'expand'
                          ? `${(t * 100).toFixed(0)}%`
                          : `${t.toFixed(1)}%`}
                      </text>
                    </g>
                  ))}
                  {mode.key === 'none' && (
                    <text
                      transform={`translate(-38,${H / 2}) rotate(-90)`}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#7f8c8d"
                      style={{ userSelect: 'none' }}
                    >% GDP</text>
                  )}
                </g>
              )}
            </g>
          </svg>

          {/* Tooltip panel */}
          {tooltip && (
            <div
              className={styles.tooltip}
              style={{ left: Math.min(tooltip.x + 10, SVG_W - 160) / SVG_W * 100 + '%' }}
            >
              <span className={styles.tooltipYear}>{tooltip.year}</span>
              {tooltip.data.map(d => (
                <div key={d.region} className={styles.tooltipRow}>
                  <span className={styles.tooltipDot} style={{ background: regionColors[d.region] }} />
                  <span className={styles.tooltipRegion}>{d.region}</span>
                  <span className={styles.tooltipValue}>{d.value.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Region legend */}
        <div className={styles.legend}>
          {streamRegions.map(r => (
            <div
              key={r}
              className={`${styles.legendItem} ${hoveredRegion === r ? styles.legendItemActive : ''}`}
              onMouseEnter={() => setHoveredRegion(r)}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              <span className={styles.legendDot} style={{ background: regionColors[r] }} />
              <span>{r}</span>
            </div>
          ))}
          {mode.key === 'none' && (
            <div className={styles.legendItem}>
              <span className={styles.legendDash} />
              <span style={{ color: '#ff00ff' }}>2% target</span>
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
          <span className={styles.scrubberLabel}>{STREAM_YEARS[0]}</span>
          <input
            type="range"
            className={styles.scrubber}
            min={0} max={TOTAL_POINTS} step={1}
            value={revealCount}
            onChange={e => handleScrub(e.target.value)}
          />
          <span className={styles.scrubberLabel}>{STREAM_YEARS[STREAM_YEARS.length - 1]}</span>
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
              <label>Point Reveal (ms)</label>
              <input type="number" value={timingInputs.pointRevealDelay}
                onChange={e => setTimingInputs(p => ({ ...p, pointRevealDelay: parseInt(e.target.value) || 0 }))}
                min="50" max="3000" step="50" />
            </div>
          </div>
          <button className={styles.confirmButton} onClick={() => {
            setInitialHold(timingInputs.initialHold);
            setPointRevealDelay(timingInputs.pointRevealDelay);
          }}>Confirm</button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: NATO Defence Expenditure of NATO Countries (2014–2023)</p>
        </footer>
      </main>
    </div>
  );
}

export default StreamChart;
