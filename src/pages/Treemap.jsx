import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import { scaleLinear } from 'd3-scale';
import { interpolateRdYlBu } from 'd3-scale-chromatic';
import {
  natoSpending, regionColors, SNAPSHOT_YEARS, NATO_TARGET_PCT
} from '../data/natoSpending.js';
import styles from './Treemap.module.css';

const SVG_W = 820;
const SVG_H = 500;
const PAD = 2; // gap between rects

// Build d3-hierarchy tree for a given year
function buildTree(year) {
  const regionMap = {};
  natoSpending.forEach(m => {
    if (!regionMap[m.region]) regionMap[m.region] = [];
    regionMap[m.region].push({
      id: m.id,
      country: m.country,
      flag: m.flag,
      region: m.region,
      value: m[year]?.gdpPct ?? 0,
      gdpAbsUsdBn: m[year]?.gdpAbsUsdBn ?? 0,
      gdpPct: m[year]?.gdpPct ?? 0,
    });
  });

  const root = {
    name: 'NATO',
    children: Object.entries(regionMap).map(([region, members]) => ({
      name: region,
      children: members,
    })),
  };

  return hierarchy(root)
    .sum(d => d.value ?? 0)
    .sort((a, b) => b.value - a.value);
}

// Compute treemap layout and return flat leaf list with x/y/w/h
function computeLayout(year) {
  const root = buildTree(year);
  treemap()
    .size([SVG_W, SVG_H])
    .tile(treemapSquarify)
    .paddingOuter(6)
    .paddingInner(PAD)
    .paddingTop(22)
    (root);

  return root;
}

// Pre-compute layouts for all years
const LAYOUTS = {};
SNAPSHOT_YEARS.forEach(y => { LAYOUTS[y] = computeLayout(y); });

// Colour: % GDP → RdYlBu (red = high spending, blue = low)
const colorScale = scaleLinear().domain([0.5, 4.0]).range([0, 1]).clamp(true);
const getColor = pct => interpolateRdYlBu(1 - colorScale(pct));

function Treemap() {
  const revealIndexRef = useRef(0);
  const [yearIndex, setYearIndex]       = useState(0);
  const [revealIndex, setRevealIndex]   = useState(0);
  const [isPlaying, setIsPlaying]       = useState(true);
  const [flashingId, setFlashingId]     = useState(null);
  const [tooltip, setTooltip]           = useState(null);
  const [phase, setPhase]               = useState('reveal'); // 'reveal' | 'done'

  const [nodeRevealDelay, setNodeRevealDelay] = useState(80);
  const [holdDuration, setHoldDuration]       = useState(2000);
  const [initialHold, setInitialHold]         = useState(800);
  const [timingInputs, setTimingInputs] = useState({
    nodeRevealDelay: 80, holdDuration: 2000, initialHold: 800
  });

  const currentYear = SNAPSHOT_YEARS[yearIndex];
  const layout = LAYOUTS[currentYear];

  // All leaves in reveal order (by region, largest first)
  const allLeaves = useMemo(() => layout.leaves(), [layout]);

  const visibleIds = useMemo(
    () => new Set(allLeaves.slice(0, revealIndex).map(l => l.data.id)),
    [allLeaves, revealIndex]
  );

  // Region groups (for labels)
  const regionNodes = useMemo(
    () => layout.descendants().filter(d => d.depth === 1),
    [layout]
  );

  // ── Reveal animation ──
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;

    const reveal = () => {
      const idx = revealIndexRef.current;
      if (idx >= allLeaves.length) {
        setPhase('done');
        // After hold, advance to next year
        timeoutId = setTimeout(() => {
          const nextYearIdx = yearIndex + 1;
          if (nextYearIdx >= SNAPSHOT_YEARS.length) {
            setIsPlaying(false);
          } else {
            revealIndexRef.current = 0;
            setRevealIndex(0);
            setPhase('reveal');
            setYearIndex(nextYearIdx);
          }
        }, holdDuration);
        return;
      }
      const leaf = allLeaves[idx];
      revealIndexRef.current += 1;
      setRevealIndex(revealIndexRef.current);
      setFlashingId(leaf.data.id);
      setTimeout(() => setFlashingId(null), 300);
      timeoutId = setTimeout(reveal, nodeRevealDelay);
    };

    timeoutId = setTimeout(reveal, initialHold);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, nodeRevealDelay, holdDuration, initialHold, yearIndex, allLeaves]);

  // ── Replay ──
  const handleReplay = useCallback(() => {
    setIsPlaying(false);
    revealIndexRef.current = 0;
    setRevealIndex(0);
    setYearIndex(0);
    setPhase('reveal');
    setFlashingId(null);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  // ── Scrub year ──
  const handleYearClick = useCallback((idx) => {
    setIsPlaying(false);
    setYearIndex(idx);
    revealIndexRef.current = LAYOUTS[SNAPSHOT_YEARS[idx]].leaves().length;
    setRevealIndex(revealIndexRef.current);
    setPhase('done');
    setFlashingId(null);
  }, []);

  // Stats for current year
  const metTarget = natoSpending.filter(m => (m[currentYear]?.gdpPct ?? 0) >= NATO_TARGET_PCT).length;

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Treemap — NATO Defence Spending</h1>
        <p className={styles.subtitle}>
          Each rectangle represents a NATO member — area encodes % of GDP spent on defence.
          Grouped by region. The <strong>2% GDP target</strong> is the NATO benchmark; red = above target, blue = below.
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
            <span className={styles.statItem}>
              <span className={styles.statValue}>{metTarget}</span>
              <span className={styles.statLabel}> / {natoSpending.length} met 2% target</span>
            </span>
          </div>
        </div>

        {/* Treemap */}
        <div className={styles.chartWrapper}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Region group labels */}
            {regionNodes.map(rn => (
              <g key={rn.data.name}>
                <rect
                  x={rn.x0} y={rn.y0}
                  width={rn.x1 - rn.x0}
                  height={rn.y1 - rn.y0}
                  fill="none"
                  stroke={regionColors[rn.data.name] || '#5a5a8a'}
                  strokeWidth={1.5}
                  strokeOpacity={0.4}
                  rx={3}
                />
                <text
                  x={rn.x0 + 5} y={rn.y0 + 14}
                  fontSize={10}
                  fontWeight={700}
                  fill={regionColors[rn.data.name] || '#aaaacc'}
                  opacity={0.85}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >{rn.data.name}</text>
              </g>
            ))}

            {/* Country leaf nodes */}
            <AnimatePresence>
              {allLeaves.map(leaf => {
                const { id, country, flag, gdpPct, gdpAbsUsdBn } = leaf.data;
                if (!visibleIds.has(id)) return null;

                const x = leaf.x0;
                const y = leaf.y0;
                const w = leaf.x1 - leaf.x0;
                const h = leaf.y1 - leaf.y0;
                const isFlashing = flashingId === id;
                const metPct = gdpPct >= NATO_TARGET_PCT;
                const fillColor = isFlashing ? '#ff00ff' : getColor(gdpPct);

                return (
                  <motion.g
                    key={`${id}-${currentYear}`}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    style={{ transformOrigin: `${x + w / 2}px ${y + h / 2}px`, cursor: 'pointer' }}
                    onMouseEnter={() => setTooltip({ id, country, flag, gdpPct, gdpAbsUsdBn, metPct, x, y, w, h })}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <rect
                      x={x} y={y} width={w} height={h}
                      fill={fillColor}
                      rx={2}
                      style={{ transition: 'fill 0.3s ease' }}
                    />
                    {/* Show flag + % if large enough */}
                    {w > 32 && h > 24 && (
                      <>
                        {w > 46 && h > 38 && (
                          <text
                            x={x + w / 2} y={y + h / 2 - 8}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize={Math.min(18, w / 3, h / 3)}
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                          >{flag}</text>
                        )}
                        <text
                          x={x + w / 2} y={y + h / 2 + (w > 46 && h > 38 ? 10 : 0)}
                          textAnchor="middle" dominantBaseline="middle"
                          fontSize={Math.min(11, w / 4, h / 4)}
                          fontWeight={700}
                          fill="rgba(0,0,0,0.75)"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >{gdpPct.toFixed(1)}%</text>
                      </>
                    )}
                    {/* Target met indicator */}
                    {metPct && w > 20 && h > 20 && (
                      <circle cx={x + w - 6} cy={y + 6} r={4} fill="#00ff88" opacity={0.9} />
                    )}
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className={styles.tooltip}
              style={{
                left: Math.min(tooltip.x + tooltip.w / 2, SVG_W - 160) / SVG_W * 100 + '%',
                top: Math.max(tooltip.y - 10, 8) / SVG_H * 100 + '%',
              }}
            >
              <span className={styles.tooltipFlag}>{tooltip.flag}</span>
              <span className={styles.tooltipName}>{tooltip.country}</span>
              <span className={styles.tooltipPct}>{tooltip.gdpPct.toFixed(2)}% GDP</span>
              <span className={styles.tooltipAbs}>~${tooltip.gdpAbsUsdBn}bn</span>
              <span className={`${styles.tooltipTarget} ${tooltip.metPct ? styles.targetMet : styles.targetMissed}`}>
                {tooltip.metPct ? '✓ Meets 2% target' : '✗ Below 2% target'}
              </span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className={styles.legendRow}>
          <div className={styles.colorLegend}>
            <span className={styles.legendLabel}>Low spend</span>
            <div className={styles.gradientBar} />
            <span className={styles.legendLabel}>High spend</span>
          </div>
          <div className={styles.regionLegend}>
            {Object.entries(regionColors).map(([region, color]) => (
              <div key={region} className={styles.regionItem}>
                <span className={styles.regionDot} style={{ background: color }} />
                <span>{region}</span>
              </div>
            ))}
          </div>
          <div className={styles.targetLegend}>
            <span className={styles.targetDot} />
            <span>≥ 2% target met</span>
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
              <label>Node Reveal (ms)</label>
              <input type="number" value={timingInputs.nodeRevealDelay}
                onChange={e => setTimingInputs(p => ({ ...p, nodeRevealDelay: parseInt(e.target.value) || 0 }))}
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
            setNodeRevealDelay(timingInputs.nodeRevealDelay);
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

export default Treemap;
