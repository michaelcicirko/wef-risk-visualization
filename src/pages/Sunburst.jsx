import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { hierarchy, partition } from 'd3-hierarchy';
import { categoryColors, riskData } from '../data/risks.js';
import styles from './Sunburst.module.css';

const SVG_W = 560;
const SVG_H = 560;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const INNER_R = 70;   // centre hole
const OUTER_R = 240;  // full radius

const TIME_STATES = ['2026', '2028', '2036'];

// Build hierarchy for a given year
function buildHierarchy(year) {
  const yearRisks = riskData[parseInt(year)] || [];
  const categoryMap = {};
  yearRisks.forEach(r => {
    if (!categoryMap[r.category]) categoryMap[r.category] = [];
    categoryMap[r.category].push({
      id: r.id,
      name: r.title,
      category: r.category,
      value: Math.max(11 - r.rank, 0),
      rank: r.rank,
    });
  });

  return {
    name: 'root',
    children: Object.entries(categoryMap).map(([cat, items]) => ({
      name: cat,
      category: cat,
      children: items,
    })),
  };
}

// Convert partition node to SVG arc path
function arcPath(d, innerR, outerR) {
  const x0 = d.x0, x1 = d.x1, y0 = d.y0, y1 = d.y1;
  // y maps to radius, x maps to angle
  const rInner = innerR + (outerR - innerR) * y0;
  const rOuter = innerR + (outerR - innerR) * y1;
  const a0 = x0 * 2 * Math.PI - Math.PI / 2;
  const a1 = x1 * 2 * Math.PI - Math.PI / 2;
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;

  const x1o = CX + rOuter * Math.cos(a0);
  const y1o = CY + rOuter * Math.sin(a0);
  const x2o = CX + rOuter * Math.cos(a1);
  const y2o = CY + rOuter * Math.sin(a1);
  const x1i = CX + rInner * Math.cos(a1);
  const y1i = CY + rInner * Math.sin(a1);
  const x2i = CX + rInner * Math.cos(a0);
  const y2i = CY + rInner * Math.sin(a0);

  return [
    `M ${x1o} ${y1o}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2o} ${y2o}`,
    `L ${x1i} ${y1i}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2i} ${y2i}`,
    'Z',
  ].join(' ');
}

// Midpoint angle for label placement
function midAngle(d) {
  return ((d.x0 + d.x1) / 2) * 2 * Math.PI - Math.PI / 2;
}

function labelPos(d, r) {
  const a = midAngle(d);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

// Compute partition layout
function computeLayout(year) {
  const root = hierarchy(buildHierarchy(year))
    .sum(d => d.value ?? 0)
    .sort((a, b) => b.value - a.value);

  partition().size([1, 1])(root);
  return root;
}

// Pre-compute all layouts
const LAYOUTS = {};
TIME_STATES.forEach(y => { LAYOUTS[y] = computeLayout(y); });

function Sunburst() {
  const revealRef = useRef(0);
  const [yearIndex, setYearIndex]     = useState(0);
  const [revealCount, setRevealCount] = useState(0);
  const [isPlaying, setIsPlaying]     = useState(true);
  const [hovered, setHovered]         = useState(null); // { node, depth }
  const [flashId, setFlashId]         = useState(null);

  const [segRevealDelay, setSegRevealDelay] = useState(80);
  const [holdDuration, setHoldDuration]     = useState(2000);
  const [initialHold, setInitialHold]       = useState(700);
  const [timingInputs, setTimingInputs] = useState({
    segRevealDelay: 80, holdDuration: 2000, initialHold: 700
  });

  const currentYear = TIME_STATES[yearIndex];
  const layout = LAYOUTS[currentYear];

  // All leaf nodes (depth=2) in reveal order
  const allLeaves = useMemo(() => layout.leaves(), [layout]);
  // All inner ring nodes (depth=1, categories)
  const categoryNodes = useMemo(
    () => layout.descendants().filter(d => d.depth === 1),
    [layout]
  );

  const visibleLeafIds = useMemo(
    () => new Set(allLeaves.slice(0, revealCount).map(l => l.data.id)),
    [allLeaves, revealCount]
  );

  // Which categories have at least one visible leaf
  const visibleCats = useMemo(() => {
    const cats = new Set();
    allLeaves.slice(0, revealCount).forEach(l => cats.add(l.data.category));
    return cats;
  }, [allLeaves, revealCount]);

  const TOTAL = allLeaves.length;

  // ── Animation loop ──
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;

    const reveal = () => {
      const idx = revealRef.current;
      if (idx >= TOTAL) {
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
      const leaf = allLeaves[idx];
      revealRef.current += 1;
      setRevealCount(revealRef.current);
      setFlashId(leaf.data.id);
      setTimeout(() => setFlashId(null), 280);
      timeoutId = setTimeout(reveal, segRevealDelay);
    };

    timeoutId = setTimeout(reveal, initialHold);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, segRevealDelay, holdDuration, initialHold, yearIndex, allLeaves, TOTAL]);

  // ── Replay ──
  const handleReplay = useCallback(() => {
    setIsPlaying(false);
    revealRef.current = 0;
    setRevealCount(0);
    setYearIndex(0);
    setFlashId(null);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  // ── Year click ──
  const handleYearClick = useCallback((idx) => {
    setIsPlaying(false);
    setYearIndex(idx);
    revealRef.current = LAYOUTS[TIME_STATES[idx]].leaves().length;
    setRevealCount(revealRef.current);
    setFlashId(null);
  }, []);

  // ── Scrub ──
  const handleScrub = useCallback((val) => {
    setIsPlaying(false);
    const count = parseInt(val);
    revealRef.current = count;
    setRevealCount(count);
    setFlashId(null);
  }, []);

  // Total score for centre label
  const totalScore = useMemo(
    () => allLeaves.slice(0, revealCount).reduce((s, l) => s + (l.value ?? 0), 0),
    [allLeaves, revealCount]
  );

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Sunburst Diagram — WEF Risk Hierarchy</h1>
        <p className={styles.subtitle}>
          Inner ring = risk categories, outer ring = individual risks. Arc area encodes severity score
          (11 − rank). Hover a segment to highlight its category group.
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
            <span className={styles.statLabel}> / {TOTAL} risks revealed</span>
          </div>
        </div>

        {/* Chart + legend side by side */}
        <div className={styles.chartRow}>
          <div className={styles.chartWrapper}>
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className={styles.svg}
            >
              {/* Category ring (inner) */}
              {categoryNodes.map(node => {
                const cat = node.data.name;
                if (!visibleCats.has(cat)) return null;
                const color = categoryColors[cat] || '#5a5a8a';
                const isHov = hovered?.cat === cat;
                const path = arcPath(node, INNER_R, INNER_R + (OUTER_R - INNER_R) * 0.38);

                return (
                  <motion.path
                    key={`cat-${cat}`}
                    d={path}
                    fill={color}
                    fillOpacity={isHov ? 0.95 : 0.75}
                    stroke="#0d0d1a"
                    strokeWidth={1.5}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                    style={{
                      transformOrigin: `${CX}px ${CY}px`,
                      cursor: 'pointer',
                      filter: isHov ? `drop-shadow(0 0 6px ${color})` : 'none',
                    }}
                    onMouseEnter={() => setHovered({ cat })}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}

              {/* Category labels */}
              {categoryNodes.map(node => {
                const cat = node.data.name;
                if (!visibleCats.has(cat)) return null;
                const r = INNER_R + (OUTER_R - INNER_R) * 0.19;
                const pos = labelPos(node, r);
                const arcSpan = (node.x1 - node.x0) * 2 * Math.PI * r;
                if (arcSpan < 30) return null;
                const color = categoryColors[cat] || '#5a5a8a';
                const lines = cat.split(' ');
                return lines.map((line, li) => (
                  <text
                    key={`catlab-${cat}-${li}`}
                    x={pos.x}
                    y={pos.y + (li - (lines.length - 1) / 2) * 11}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill={color}
                    style={{ pointerEvents: 'none', userSelect: 'none', textTransform: 'capitalize' }}
                  >{line}</text>
                ));
              })}

              {/* Leaf ring (outer) */}
              <AnimatePresence>
                {allLeaves.map(leaf => {
                  if (!visibleLeafIds.has(leaf.data.id)) return null;
                  const cat = leaf.data.category;
                  const color = categoryColors[cat] || '#5a5a8a';
                  const isFlash = flashId === leaf.data.id;
                  const isHov = hovered?.cat === cat;
                  const dimmed = hovered && !isHov;
                  const path = arcPath(leaf, INNER_R + (OUTER_R - INNER_R) * 0.4, OUTER_R);
                  const arcSpan = (leaf.x1 - leaf.x0) * 2 * Math.PI * OUTER_R;

                  return (
                    <motion.g
                      key={leaf.data.id}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: dimmed ? 0.18 : 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                      style={{ transformOrigin: `${CX}px ${CY}px`, cursor: 'pointer' }}
                      onMouseEnter={() => setHovered({ cat, leaf })}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <path
                        d={path}
                        fill={isFlash ? '#ff00ff' : color}
                        fillOpacity={isFlash ? 1 : isHov ? 0.95 : 0.72}
                        stroke="#0d0d1a"
                        strokeWidth={1}
                        style={{ transition: 'fill 0.2s, fill-opacity 0.2s' }}
                      />
                      {/* Risk label if arc is wide enough */}
                      {arcSpan > 18 && (() => {
                        const r = INNER_R + (OUTER_R - INNER_R) * 0.7;
                        const pos = labelPos(leaf, r);
                        const words = leaf.data.name.split(' ').slice(0, 2);
                        return words.map((w, wi) => (
                          <text
                            key={wi}
                            x={pos.x}
                            y={pos.y + (wi - (words.length - 1) / 2) * 9}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={7}
                            fill="#ffffff"
                            opacity={0.85}
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                          >{w}</text>
                        ));
                      })()}
                    </motion.g>
                  );
                })}
              </AnimatePresence>

              {/* Centre label */}
              <text x={CX} y={CY - 10} textAnchor="middle" fontSize={22} fontWeight={900} fill="#ffffff">
                {totalScore}
              </text>
              <text x={CX} y={CY + 10} textAnchor="middle" fontSize={10} fill="#7f8c8d">
                total score
              </text>
              <text x={CX} y={CY + 24} textAnchor="middle" fontSize={11} fontWeight={700} fill="#aaaacc">
                {currentYear}
              </text>

              {/* Hover label for leaf */}
              {hovered?.leaf && (
                <text
                  x={CX} y={CY + 42}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#ffffff"
                  opacity={0.7}
                  style={{ pointerEvents: 'none' }}
                >{hovered.leaf.data.name.slice(0, 28)}</text>
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            {Object.entries(categoryColors).map(([cat, color]) => {
              const catNode = categoryNodes.find(n => n.data.name === cat);
              const score = catNode
                ? allLeaves
                    .filter(l => l.data.category === cat && visibleLeafIds.has(l.data.id))
                    .reduce((s, l) => s + (l.value ?? 0), 0)
                : 0;
              const isHov = hovered?.cat === cat;
              return (
                <div
                  key={cat}
                  className={`${styles.legendItem} ${isHov ? styles.legendItemActive : ''}`}
                  onMouseEnter={() => setHovered({ cat })}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className={styles.legendDot} style={{ background: color }} />
                  <span className={styles.legendCat}>{cat}</span>
                  <span className={styles.legendScore}>{score}</span>
                </div>
              );
            })}
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
              <label>Segment Reveal (ms)</label>
              <input type="number" value={timingInputs.segRevealDelay}
                onChange={e => setTimingInputs(p => ({ ...p, segRevealDelay: parseInt(e.target.value) || 0 }))}
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
            setSegRevealDelay(timingInputs.segRevealDelay);
            setHoldDuration(timingInputs.holdDuration);
          }}>Confirm</button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025</p>
        </footer>
      </main>
    </div>
  );
}

export default Sunburst;
