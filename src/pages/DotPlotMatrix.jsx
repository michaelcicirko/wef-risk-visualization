import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { riskData, categoryColors } from '../data/risks.js';
import styles from './DotPlotMatrix.module.css';

const YEARS = [2026, 2028, 2036];
const SVG_W = 720;
const PAD_L = 200;
const PAD_T = 50;
const PAD_R = 20;
const PAD_B = 20;
const COL_W = (SVG_W - PAD_L - PAD_R) / YEARS.length;
const ROW_H = 38;

// Build unified sorted risk list
function buildRiskList() {
  const map = new Map();
  YEARS.forEach(y => {
    (riskData[y] || []).forEach(r => {
      if (!map.has(r.id)) map.set(r.id, { id: r.id, title: r.title, category: r.category });
    });
  });
  // Sort by 2026 rank, then others
  const base = (riskData[2026] || []).map(r => r.id);
  const others = [...map.keys()].filter(id => !base.includes(id));
  return [...base, ...others].map(id => map.get(id)).filter(Boolean);
}

const RISK_LIST = buildRiskList();
const SVG_H = PAD_T + RISK_LIST.length * ROW_H + PAD_B;

function getScore(id, year) {
  return (riskData[year] || []).find(r => r.id === id)?.value ?? null;
}
function getRank(id, year) {
  return (riskData[year] || []).find(r => r.id === id)?.rank ?? null;
}

const MAX_SCORE = 10;
const MAX_DOT_R = 14;

export default function DotPlotMatrix() {
  const [visibleRows, setVisibleRows] = useState(RISK_LIST.length);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [hoveredId, setHoveredId]     = useState(null);
  const [hoveredYear, setHoveredYear] = useState(null);
  const [sortBy, setSortBy]           = useState('rank2026');
  const revealRef = useRef(RISK_LIST.length);

  useEffect(() => {
    if (!isPlaying) return;
    revealRef.current = 0;
    setVisibleRows(0);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      revealRef.current = i;
      setVisibleRows(i);
      if (i >= RISK_LIST.length) { clearInterval(iv); setIsPlaying(false); }
    }, 100);
    return () => clearInterval(iv);
  }, [isPlaying]);

  const sortedRisks = useMemo(() => {
    const list = [...RISK_LIST];
    if (sortBy === 'rank2026') return list.sort((a, b) => (getRank(a.id, 2026) || 99) - (getRank(b.id, 2026) || 99));
    if (sortBy === 'rank2036') return list.sort((a, b) => (getRank(a.id, 2036) || 99) - (getRank(b.id, 2036) || 99));
    if (sortBy === 'category') return list.sort((a, b) => a.category.localeCompare(b.category));
    if (sortBy === 'change') {
      return list.sort((a, b) => {
        const da = (getRank(a.id, 2036) || 0) - (getRank(a.id, 2026) || 0);
        const db = (getRank(b.id, 2036) || 0) - (getRank(b.id, 2026) || 0);
        return da - db;
      });
    }
    return list;
  }, [sortBy]);

  const visibleRisks = sortedRisks.slice(0, visibleRows);

  const focusRisk = hoveredId ? RISK_LIST.find(r => r.id === hoveredId) : null;

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Dot Plot Matrix — WEF Risk Scores</h1>
        <p className={styles.subtitle}>
          All WEF risks as rows, all three years as columns. Dot size = severity score.
          Hover any row to compare scores across years. Sort by rank, category, or change.
        </p>
      </header>

      <main className={styles.main}>
        {/* Controls */}
        <div className={styles.controlsBar}>
          <div className={styles.sortGroup}>
            <span className={styles.sortLabel}>Sort:</span>
            {[
              { key: 'rank2026', label: '2026 Rank' },
              { key: 'rank2036', label: '2036 Rank' },
              { key: 'change',   label: 'Most Changed' },
              { key: 'category', label: 'Category' },
            ].map(s => (
              <button
                key={s.key}
                className={`${styles.sortBtn} ${sortBy === s.key ? styles.sortBtnActive : ''}`}
                onClick={() => setSortBy(s.key)}
              >{s.label}</button>
            ))}
          </div>
          <div className={styles.btnGroup}>
            <button className={styles.btn} onClick={() => { setIsPlaying(false); setTimeout(() => setIsPlaying(true), 50); }}>
              ↺ Animate
            </button>
          </div>
        </div>

        {/* Hover info */}
        <div className={`${styles.infoCard} ${focusRisk ? styles.infoCardVisible : ''}`}>
          {focusRisk ? (
            <>
              <span className={styles.infoDot} style={{ background: categoryColors[focusRisk.category] }} />
              <span className={styles.infoTitle}>{focusRisk.title}</span>
              <span className={styles.infoCat} style={{ color: categoryColors[focusRisk.category] }}>
                {focusRisk.category}
              </span>
              {YEARS.map(y => {
                const score = getScore(focusRisk.id, y);
                const rank  = getRank(focusRisk.id, y);
                if (!score) return null;
                return (
                  <span key={y} className={styles.scoreBadge}>
                    {y}: <strong>#{rank}</strong> · {score}pts
                  </span>
                );
              })}
            </>
          ) : (
            <span className={styles.infoHint}>Hover a row to compare scores across years</span>
          )}
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}>
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className={styles.svg}>
            <g transform={`translate(${PAD_L},${PAD_T})`}>

              {/* Year headers */}
              {YEARS.map((y, yi) => (
                <g key={y}>
                  <text
                    x={yi * COL_W + COL_W / 2} y={-18}
                    textAnchor="middle" fontSize={13} fontWeight={700} fill="#aaaacc"
                  >{y}</text>
                  <line
                    x1={yi * COL_W + COL_W / 2} y1={-8}
                    x2={yi * COL_W + COL_W / 2} y2={RISK_LIST.length * ROW_H}
                    stroke="#1a1a2e" strokeWidth={1}
                  />
                </g>
              ))}

              {/* Rows */}
              <AnimatePresence>
                {visibleRisks.map((risk, ri) => {
                  const color = categoryColors[risk.category] || '#5a5a8a';
                  const isHov = hoveredId === risk.id;
                  const dimmed = hoveredId && !isHov;
                  const cy = ri * ROW_H + ROW_H / 2;

                  return (
                    <motion.g
                      key={risk.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredId(risk.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Row highlight */}
                      {isHov && (
                        <rect
                          x={-PAD_L} y={cy - ROW_H / 2}
                          width={SVG_W} height={ROW_H}
                          fill="#1e1e2e" rx={4}
                        />
                      )}

                      {/* Risk label */}
                      <text
                        x={-8} y={cy + 4}
                        textAnchor="end" fontSize={10}
                        fill={dimmed ? '#2a2a4a' : isHov ? '#ffffff' : color}
                        fontWeight={isHov ? 700 : 400}
                      >
                        {risk.title.length > 28 ? risk.title.slice(0, 28) + '…' : risk.title}
                      </text>

                      {/* Connector line between dots */}
                      {(() => {
                        const pts = YEARS.map((y, yi) => {
                          const s = getScore(risk.id, y);
                          return s ? { x: yi * COL_W + COL_W / 2, y: cy } : null;
                        }).filter(Boolean);
                        if (pts.length < 2) return null;
                        return (
                          <line
                            x1={pts[0].x} y1={cy}
                            x2={pts[pts.length - 1].x} y2={cy}
                            stroke={dimmed ? '#1a1a2e' : color}
                            strokeOpacity={isHov ? 0.6 : 0.25}
                            strokeWidth={1}
                            strokeDasharray="3 3"
                          />
                        );
                      })()}

                      {/* Dots for each year */}
                      {YEARS.map((y, yi) => {
                        const score = getScore(risk.id, y);
                        const rank  = getRank(risk.id, y);
                        if (!score) return null;
                        const r = (score / MAX_SCORE) * MAX_DOT_R;
                        const cx = yi * COL_W + COL_W / 2;

                        return (
                          <g key={y}>
                            <circle
                              cx={cx} cy={cy} r={r}
                              fill={dimmed ? '#2a2a4a' : color}
                              fillOpacity={isHov ? 0.95 : 0.7}
                              stroke={isHov ? '#ffffff' : color}
                              strokeWidth={isHov ? 1.5 : 0.5}
                              strokeOpacity={0.5}
                            />
                            {isHov && rank && (
                              <text
                                x={cx} y={cy + 3.5}
                                textAnchor="middle" fontSize={8}
                                fill="#ffffff" fontWeight={700}
                                style={{ userSelect: 'none', pointerEvents: 'none' }}
                              >#{rank}</text>
                            )}
                          </g>
                        );
                      })}
                    </motion.g>
                  );
                })}
              </AnimatePresence>

            </g>
          </svg>
        </div>

        {/* Size legend */}
        <div className={styles.sizeLegend}>
          <span className={styles.sizeLegendLabel}>Dot size = severity score:</span>
          {[2, 5, 8, 10].map(s => (
            <div key={s} className={styles.sizeItem}>
              <svg width={MAX_DOT_R * 2 + 4} height={MAX_DOT_R * 2 + 4}>
                <circle
                  cx={MAX_DOT_R / 2 + (s / MAX_SCORE) * MAX_DOT_R}
                  cy={MAX_DOT_R + 2}
                  r={(s / MAX_SCORE) * MAX_DOT_R}
                  fill="#5a5a8a"
                  fillOpacity={0.7}
                />
              </svg>
              <span>{s}</span>
            </div>
          ))}
        </div>

        {/* Category colour legend */}
        <div className={styles.legend}>
          {Object.entries(categoryColors).map(([cat, color]) => (
            <div key={cat} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color }} />
              <span style={{ textTransform: 'capitalize' }}>{cat}</span>
            </div>
          ))}
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025</p>
        </footer>
      </main>
    </div>
  );
}
