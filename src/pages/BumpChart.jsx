import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { riskData, categoryColors } from '../data/risks.js';
import styles from './BumpChart.module.css';

const YEARS = [2026, 2028, 2036];
const SVG_W = 700;
const SVG_H = 480;
const PAD_L = 200;
const PAD_R = 180;
const PAD_T = 30;
const PAD_B = 30;

const CHART_W = SVG_W - PAD_L - PAD_R;
const CHART_H = SVG_H - PAD_T - PAD_B;

// Build unified risk list across all years
function buildRiskIndex() {
  const all = new Map();
  YEARS.forEach(y => {
    (riskData[y] || []).forEach(r => {
      if (!all.has(r.id)) all.set(r.id, { id: r.id, title: r.title, category: r.category });
    });
  });
  return Array.from(all.values());
}

const ALL_RISKS = buildRiskIndex();
const MAX_RANK = 10;

function getRank(id, year) {
  const r = (riskData[year] || []).find(r => r.id === id);
  return r ? r.rank : null;
}

// Smooth bump curve through control points
function bumpPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev.x + curr.x) / 2;
    d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

function xPos(yearIdx) {
  return yearIdx === 0 ? 0 : yearIdx === 1 ? CHART_W / 2 : CHART_W;
}

function yPos(rank) {
  return ((rank - 1) / (MAX_RANK - 1)) * CHART_H;
}

export default function BumpChart() {
  const [visibleCount, setVisibleCount] = useState(ALL_RISKS.length);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [hoveredId, setHoveredId]       = useState(null);
  const revealRef = useRef(ALL_RISKS.length);

  useEffect(() => {
    if (!isPlaying) return;
    revealRef.current = 0;
    setVisibleCount(0);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      revealRef.current = i;
      setVisibleCount(i);
      if (i >= ALL_RISKS.length) { clearInterval(iv); setIsPlaying(false); }
    }, 120);
    return () => clearInterval(iv);
  }, [isPlaying]);

  const visibleRisks = useMemo(() => ALL_RISKS.slice(0, visibleCount), [visibleCount]);

  // Build lines data
  const lines = useMemo(() => visibleRisks.map(risk => {
    const points = YEARS.map((y, yi) => {
      const rank = getRank(risk.id, y);
      if (!rank) return null;
      return { x: xPos(yi), y: yPos(rank) };
    }).filter(Boolean);

    return { ...risk, points };
  }).filter(r => r.points.length >= 2), [visibleRisks]);

  const focusId = hoveredId;
  const focusRisk = focusId ? ALL_RISKS.find(r => r.id === focusId) : null;

  // Rank changes for focused risk
  const rankChanges = useMemo(() => {
    if (!focusRisk) return null;
    return YEARS.map(y => ({ year: y, rank: getRank(focusRisk.id, y) }));
  }, [focusRisk]);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Bump Chart — WEF Risk Rank Changes</h1>
        <p className={styles.subtitle}>
          Each line traces a risk's rank position across 2026, 2028, and 2036.
          Rising lines = worsening rank. Crossing lines show risks overtaking each other.
          Hover to highlight a single risk's trajectory.
        </p>
      </header>

      <main className={styles.main}>
        {/* Controls */}
        <div className={styles.controlsBar}>
          <div className={styles.stats}>
            <span className={styles.statValue}>{visibleCount}</span>
            <span className={styles.statLabel}> / {ALL_RISKS.length} risks shown</span>
          </div>
          <div className={styles.btnGroup}>
            <button className={styles.btn} onClick={() => { setIsPlaying(false); setTimeout(() => setIsPlaying(true), 50); }}>
              ↺ Animate
            </button>
            <button className={styles.btn} onClick={() => { setIsPlaying(false); revealRef.current = ALL_RISKS.length; setVisibleCount(ALL_RISKS.length); }}>
              Show All
            </button>
          </div>
        </div>

        {/* Hover info */}
        <div className={`${styles.infoCard} ${focusRisk ? styles.infoCardVisible : ''}`}>
          {focusRisk ? (
            <>
              <span className={styles.infoDot} style={{ background: categoryColors[focusRisk.category] }} />
              <span className={styles.infoTitle}>{focusRisk.title}</span>
              {rankChanges && rankChanges.map(({ year, rank }) => rank && (
                <span key={year} className={styles.rankBadge}>
                  {year}: <strong>#{rank}</strong>
                </span>
              ))}
            </>
          ) : (
            <span className={styles.infoHint}>Hover a line to trace a risk's journey across time</span>
          )}
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}>
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className={styles.svg}>
            <g transform={`translate(${PAD_L},${PAD_T})`}>

              {/* Year columns */}
              {YEARS.map((y, yi) => (
                <g key={y}>
                  <line
                    x1={xPos(yi)} y1={0} x2={xPos(yi)} y2={CHART_H}
                    stroke="#2a2a4a" strokeWidth={1} strokeDasharray="4 4"
                  />
                  <text x={xPos(yi)} y={-12} textAnchor="middle" fontSize={13}
                    fontWeight={700} fill="#aaaacc">{y}</text>
                </g>
              ))}

              {/* Rank grid lines */}
              {Array.from({ length: MAX_RANK }, (_, i) => i + 1).map(rank => (
                <line
                  key={rank}
                  x1={0} y1={yPos(rank)} x2={CHART_W} y2={yPos(rank)}
                  stroke="#1a1a2e" strokeWidth={1}
                />
              ))}

              {/* Lines */}
              <AnimatePresence>
                {lines.map(risk => {
                  const color = categoryColors[risk.category] || '#5a5a8a';
                  const isFocus = focusId === risk.id;
                  const dimmed = focusId && !isFocus;
                  const d = bumpPath(risk.points);

                  return (
                    <motion.g key={risk.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredId(risk.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Hit area */}
                      <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
                      {/* Visible line */}
                      <path
                        d={d}
                        fill="none"
                        stroke={dimmed ? '#1e1e2e' : color}
                        strokeWidth={isFocus ? 3.5 : 2}
                        strokeOpacity={dimmed ? 0.3 : isFocus ? 1 : 0.55}
                        strokeLinecap="round"
                      />
                      {/* Dots at each year */}
                      {risk.points.map((pt, pi) => (
                        <circle
                          key={pi}
                          cx={pt.x} cy={pt.y}
                          r={isFocus ? 6 : 4}
                          fill={dimmed ? '#1e1e2e' : color}
                          fillOpacity={dimmed ? 0.3 : 1}
                          stroke="#0d0d1a"
                          strokeWidth={1.5}
                        />
                      ))}
                    </motion.g>
                  );
                })}
              </AnimatePresence>

              {/* Left labels (2026 ranks) */}
              {lines.map(risk => {
                const rank = getRank(risk.id, 2026);
                if (!rank) return null;
                const color = categoryColors[risk.category] || '#5a5a8a';
                const isFocus = focusId === risk.id;
                const dimmed = focusId && !isFocus;
                return (
                  <text
                    key={`lbl-l-${risk.id}`}
                    x={-8} y={yPos(rank) + 4}
                    textAnchor="end" fontSize={10}
                    fill={dimmed ? '#2a2a4a' : isFocus ? '#ffffff' : color}
                    fontWeight={isFocus ? 700 : 400}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredId(risk.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {risk.title.length > 22 ? risk.title.slice(0, 22) + '…' : risk.title}
                  </text>
                );
              })}

              {/* Right labels (2036 ranks) */}
              {lines.map(risk => {
                const rank = getRank(risk.id, 2036);
                if (!rank) return null;
                const color = categoryColors[risk.category] || '#5a5a8a';
                const isFocus = focusId === risk.id;
                const dimmed = focusId && !isFocus;
                return (
                  <text
                    key={`lbl-r-${risk.id}`}
                    x={CHART_W + 8} y={yPos(rank) + 4}
                    textAnchor="start" fontSize={10}
                    fill={dimmed ? '#2a2a4a' : isFocus ? '#ffffff' : color}
                    fontWeight={isFocus ? 700 : 400}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredId(risk.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    #{rank} {risk.title.length > 18 ? risk.title.slice(0, 18) + '…' : risk.title}
                  </text>
                );
              })}

              {/* Rank axis labels */}
              {Array.from({ length: MAX_RANK }, (_, i) => i + 1).map(rank => (
                <text
                  key={`r${rank}`}
                  x={CHART_W / 2} y={yPos(rank) - 4}
                  textAnchor="middle" fontSize={8} fill="#3a3a5a"
                  style={{ userSelect: 'none' }}
                >#{rank}</text>
              ))}

            </g>
          </svg>
        </div>

        {/* Category legend */}
        <div className={styles.legend}>
          {Object.entries(categoryColors).map(([cat, color]) => (
            <div key={cat} className={styles.legendItem}>
              <span className={styles.legendLine} style={{ background: color }} />
              <span style={{ textTransform: 'capitalize' }}>{cat}</span>
            </div>
          ))}
        </div>

        {/* Scrubber */}
        <div className={styles.scrubberContainer}>
          <span className={styles.scrubberLabel}>0</span>
          <input
            type="range" className={styles.scrubber}
            min={0} max={ALL_RISKS.length} step={1} value={visibleCount}
            onChange={e => { setIsPlaying(false); const v = parseInt(e.target.value); revealRef.current = v; setVisibleCount(v); }}
          />
          <span className={styles.scrubberLabel}>{ALL_RISKS.length}</span>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025 — Short-term and Long-term Outlooks</p>
        </footer>
      </main>
    </div>
  );
}
