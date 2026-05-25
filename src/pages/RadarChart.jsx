import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart as ReRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { categoryColors, riskData } from '../data/risks.js';
import styles from './RadarChart.module.css';

const TIME_STATES = [2026, 2028, 2036];

const CATEGORIES = ['geopolitical', 'economic', 'societal', 'technological', 'environmental'];

// Build per-category total score for a year
function buildCategoryScores(year) {
  const risks = riskData[year] || [];
  const scores = {};
  CATEGORIES.forEach(c => { scores[c] = 0; });
  risks.forEach(r => {
    if (scores[r.category] !== undefined) scores[r.category] += r.value;
  });
  return scores;
}

// Build radar data: each axis = a category, each series = a year
function buildRadarData() {
  return CATEGORIES.map(cat => {
    const point = { category: cat.charAt(0).toUpperCase() + cat.slice(1) };
    TIME_STATES.forEach(y => {
      point[`y${y}`] = buildCategoryScores(y)[cat];
    });
    return point;
  });
}

const RADAR_DATA = buildRadarData();

// Max score across all data for scale
const MAX_SCORE = Math.max(...RADAR_DATA.flatMap(d => TIME_STATES.map(y => d[`y${y}`])));

// Colours for each year series
const YEAR_COLORS = {
  2026: '#e67e22',
  2028: '#3498db',
  2036: '#27ae60',
};

// Pulse animation: we reveal year series one by one, with a dot-by-dot fill effect
// We also allow individual NATO member radar (one axis per member region)
// Mode 1: Category radar (5 axes) - all years overlaid
// Mode 2: Region comparison - one axis per region, one year at a time

// Region-based radar data: axes = years 2026/2028/2036, series = categories
function buildRegionRadar() {
  return CATEGORIES.map(cat => {
    const point = { category: cat.charAt(0).toUpperCase() + cat.slice(1) };
    TIME_STATES.forEach(y => {
      point[`y${y}`] = buildCategoryScores(y)[cat];
    });
    return point;
  });
}

const MODES = ['overlay', 'animated'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: p.color }} />
          <span className={styles.tooltipYear}>{p.dataKey.replace('y', '')}</span>
          <span className={styles.tooltipValue}>{p.value} pts</span>
        </div>
      ))}
    </div>
  );
}

function RadarChartPage() {
  const [mode, setMode]               = useState('overlay');   // 'overlay' | 'animated'
  const [visibleYears, setVisibleYears] = useState([2026, 2028, 2036]);
  const [animYear, setAnimYear]       = useState(2026);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [pulseYear, setPulseYear]     = useState(null);
  const intervalRef = useRef(null);

  const [yearHoldMs, setYearHoldMs]   = useState(1800);
  const [timingInputs, setTimingInputs] = useState({ yearHoldMs: 1800 });

  // Overlay mode: toggle individual year layers
  const toggleYear = useCallback((y) => {
    setVisibleYears(prev =>
      prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y]
    );
  }, []);

  // Animated mode: cycle through years
  useEffect(() => {
    if (mode !== 'animated' || !isPlaying) return;
    let yearIdx = TIME_STATES.indexOf(animYear);

    const advance = () => {
      yearIdx = (yearIdx + 1) % TIME_STATES.length;
      const next = TIME_STATES[yearIdx];
      setPulseYear(next);
      setAnimYear(next);
      setTimeout(() => setPulseYear(null), 400);
    };

    intervalRef.current = setInterval(advance, yearHoldMs);
    return () => clearInterval(intervalRef.current);
  }, [mode, isPlaying, yearHoldMs, animYear]);

  const handleModeSwitch = useCallback((m) => {
    setMode(m);
    setIsPlaying(false);
    clearInterval(intervalRef.current);
    if (m === 'overlay') setVisibleYears([2026, 2028, 2036]);
    if (m === 'animated') setAnimYear(2026);
  }, []);

  const handleReplay = useCallback(() => {
    setAnimYear(2026);
    setPulseYear(null);
    setIsPlaying(true);
  }, []);

  // Scores summary for current view
  const scoreSummary = useMemo(() => {
    const years = mode === 'overlay' ? visibleYears : [animYear];
    return years.map(y => ({
      year: y,
      total: CATEGORIES.reduce((s, c) => s + buildCategoryScores(y)[c], 0),
      topCat: CATEGORIES.reduce((best, c) => {
        const s = buildCategoryScores(y)[c];
        return s > (buildCategoryScores(y)[best] || 0) ? c : best;
      }, CATEGORIES[0]),
    }));
  }, [mode, visibleYears, animYear]);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Radar Chart — WEF Risk Category Profiles</h1>
        <p className={styles.subtitle}>
          Five axes — one per WEF risk category. Each polygon shows the total severity score
          for that year. <strong>Overlay</strong> mode shows all three years together.
          <strong> Animated</strong> mode cycles through 2026 → 2028 → 2036.
        </p>
      </header>

      <main className={styles.main}>
        {/* Mode tabs */}
        <div className={styles.modeTabs}>
          {MODES.map(m => (
            <button
              key={m}
              className={`${styles.modeTab} ${mode === m ? styles.modeTabActive : ''}`}
              onClick={() => handleModeSwitch(m)}
            >{m === 'overlay' ? 'Overlay' : 'Animated'}</button>
          ))}
        </div>

        {/* Controls row */}
        <div className={styles.controlsRow}>
          {mode === 'overlay' ? (
            <div className={styles.yearToggles}>
              {TIME_STATES.map(y => (
                <button
                  key={y}
                  className={`${styles.yearToggle} ${visibleYears.includes(y) ? styles.yearToggleActive : ''}`}
                  style={visibleYears.includes(y) ? { borderColor: YEAR_COLORS[y], color: YEAR_COLORS[y] } : {}}
                  onClick={() => toggleYear(y)}
                >{y}</button>
              ))}
            </div>
          ) : (
            <div className={styles.animControls}>
              {TIME_STATES.map(y => (
                <button
                  key={y}
                  className={`${styles.yearToggle} ${animYear === y ? styles.yearToggleActive : ''}`}
                  style={animYear === y ? { borderColor: YEAR_COLORS[y], color: YEAR_COLORS[y] } : {}}
                  onClick={() => { setIsPlaying(false); setAnimYear(y); }}
                >{y}</button>
              ))}
              <button className={styles.controlButton} onClick={() => setIsPlaying(p => !p)}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button className={styles.controlButton} onClick={handleReplay} disabled={isPlaying}>
                Replay
              </button>
            </div>
          )}
        </div>

        {/* Score summary cards */}
        <div className={styles.scoreCards}>
          {scoreSummary.map(s => (
            <div key={s.year} className={styles.scoreCard} style={{ borderColor: YEAR_COLORS[s.year] }}>
              <span className={styles.scoreCardYear} style={{ color: YEAR_COLORS[s.year] }}>{s.year}</span>
              <span className={styles.scoreCardTotal}>{s.total}</span>
              <span className={styles.scoreCardLabel}>total severity</span>
              <span className={styles.scoreCardTop} style={{ color: categoryColors[s.topCat] }}>
                ▲ {s.topCat}
              </span>
            </div>
          ))}
        </div>

        {/* Radar chart */}
        <div className={styles.chartWrapper}>
          <AnimatePresence mode="wait">
            {mode === 'overlay' ? (
              <motion.div
                key="overlay"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={styles.chartInner}
              >
                <ResponsiveContainer width="100%" height={420}>
                  <ReRadarChart data={RADAR_DATA} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <PolarGrid stroke="#2a2a4a" />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fill: '#aaaacc', fontSize: 12, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, MAX_SCORE + 2]}
                      tick={{ fill: '#5a5a8a', fontSize: 9 }}
                      tickCount={4}
                      stroke="#2a2a4a"
                    />
                    {TIME_STATES.filter(y => visibleYears.includes(y)).map(y => (
                      <Radar
                        key={y}
                        name={`${y}`}
                        dataKey={`y${y}`}
                        stroke={YEAR_COLORS[y]}
                        fill={YEAR_COLORS[y]}
                        fillOpacity={0.18}
                        strokeWidth={2}
                        dot={{ r: 4, fill: YEAR_COLORS[y], strokeWidth: 0 }}
                        isAnimationActive={true}
                        animationDuration={600}
                        animationEasing="ease-out"
                      />
                    ))}
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(v) => (
                        <span style={{ color: YEAR_COLORS[parseInt(v)] || '#aaaacc', fontSize: 12 }}>{v}</span>
                      )}
                    />
                  </ReRadarChart>
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <motion.div
                key={`animated-${animYear}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: pulseYear === animYear ? 1.03 : 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={styles.chartInner}
              >
                <ResponsiveContainer width="100%" height={420}>
                  <ReRadarChart data={RADAR_DATA} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <PolarGrid stroke="#2a2a4a" />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fill: '#aaaacc', fontSize: 12, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, MAX_SCORE + 2]}
                      tick={{ fill: '#5a5a8a', fontSize: 9 }}
                      tickCount={4}
                      stroke="#2a2a4a"
                    />
                    <Radar
                      name={`${animYear}`}
                      dataKey={`y${animYear}`}
                      stroke={YEAR_COLORS[animYear]}
                      fill={YEAR_COLORS[animYear]}
                      fillOpacity={0.3}
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: YEAR_COLORS[animYear], strokeWidth: 0 }}
                      isAnimationActive={true}
                      animationDuration={500}
                      animationEasing="ease-out"
                    />
                    <Tooltip content={<CustomTooltip />} />
                  </ReRadarChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Category legend with scores */}
        <div className={styles.catLegend}>
          {CATEGORIES.map(cat => {
            const color = categoryColors[cat];
            const years = mode === 'overlay' ? visibleYears : [animYear];
            return (
              <div key={cat} className={styles.catLegendItem}>
                <span className={styles.catDot} style={{ background: color }} />
                <span className={styles.catName}>{cat}</span>
                {years.map(y => (
                  <span key={y} className={styles.catScore} style={{ color: YEAR_COLORS[y] }}>
                    {buildCategoryScores(y)[cat]}
                  </span>
                ))}
              </div>
            );
          })}
        </div>

        {/* Timing controls (animated mode only) */}
        {mode === 'animated' && (
          <div className={styles.timingControls}>
            <div className={styles.timingGrid}>
              <div className={styles.timingField}>
                <label>Year Hold (ms)</label>
                <input type="number" value={timingInputs.yearHoldMs}
                  onChange={e => setTimingInputs(p => ({ ...p, yearHoldMs: parseInt(e.target.value) || 0 }))}
                  min="400" max="8000" step="200" />
              </div>
            </div>
            <button className={styles.confirmButton} onClick={() => {
              setYearHoldMs(timingInputs.yearHoldMs);
            }}>Confirm</button>
          </div>
        )}

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025 — Short-term and Long-term Outlooks</p>
        </footer>
      </main>
    </div>
  );
}

export default RadarChartPage;
