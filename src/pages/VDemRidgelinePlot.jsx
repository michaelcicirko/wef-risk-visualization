import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleLinear, scaleBand } from 'd3-scale';
import { area, curveBasis } from 'd3-shape';
import { DEMOCRACY_INDICES } from '../data/vdemDemocracy.js';
import { useVdemData } from '../data/useVdemData.js';
import styles from './VDemRidgelinePlot.module.css';

const MARGIN = { top: 40, right: 100, bottom: 60, left: 80 };
const SVG_W = 900;
const SVG_H = 700;

// Kernel density estimation
function kernelDensityEstimator(kernel, X) {
  return function(V) {
    return X.map(x => [x, V.reduce((sum, v) => sum + kernel(x - v), 0) / V.length]);
  };
}

function kernelEpanechnikov(k) {
  return function(v) {
    return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
  };
}

// Group data by decade
function groupByDecade(data, indexKey) {
  const decades = {};
  data.forEach(d => {
    const score = d[indexKey];
    if (score === null || score === undefined) return;
    
    const decade = Math.floor(d.year / 10) * 10;
    if (!decades[decade]) decades[decade] = [];
    decades[decade].push(score);
  });
  return decades;
}

function VDemRidgelinePlot() {
  const { data: VDEM_DATA, loading, error } = useVdemData();
  const [selectedIndex, setSelectedIndex] = useState('v2x_libdem');
  const [hoveredDecade, setHoveredDecade] = useState(null);

  const selectedIndexInfo = DEMOCRACY_INDICES.find(d => d.key === selectedIndex);

  // Prepare data
  const decadeData = useMemo(() => {
    if (!VDEM_DATA) return [];
    const grouped = groupByDecade(VDEM_DATA, selectedIndex);
    const decades = Object.keys(grouped).map(Number).sort((a, b) => a - b);
    
    return decades.map(decade => {
      const scores = grouped[decade];
      if (!scores || scores.length === 0) return null;
      
      const density = kernelDensityEstimator(kernelEpanechnikov(0.08), [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1])(scores);
      
      const sortedScores = [...scores].sort((a, b) => a - b);
      
      return {
        decade,
        label: `${decade}s`,
        scores,
        density,
        count: scores.length,
        mean: scores.reduce((a, b) => a + b, 0) / scores.length,
        median: sortedScores[Math.floor(sortedScores.length / 2)]
      };
    }).filter(Boolean);
  }, [selectedIndex]);

  // Scales
  const xScale = useMemo(() => {
    return scaleLinear()
      .domain([0, 1])
      .range([MARGIN.left, SVG_W - MARGIN.right]);
  }, []);

  const yScale = useMemo(() => {
    return scaleBand()
      .domain(decadeData.map(d => d.decade))
      .range([SVG_H - MARGIN.bottom, MARGIN.top])
      .padding(0.1);
  }, [decadeData]);

  // Area generator
  const areaGenerator = useMemo(() => {
    return area()
      .curve(curveBasis)
      .x(d => xScale(d[0]))
      .y0(d => {
        const y = -d[1] * 80;
        return isNaN(y) ? 0 : y;
      })
      .y1(0)
      .defined(d => !isNaN(d[0]) && !isNaN(d[1]));
  }, [xScale]);

  // Get color for decade (cool to warm gradient)
  const getDecadeColor = useCallback((decade, index) => {
    const total = decadeData.length;
    const t = index / (total - 1);
    // Cool (blue) to warm (orange/red)
    if (t < 0.33) return `rgba(100, 149, 237, ${hoveredDecade === decade ? 0.9 : 0.6})`; // Blue
    if (t < 0.66) return `rgba(147, 112, 219, ${hoveredDecade === decade ? 0.9 : 0.6})`; // Purple
    return `rgba(255, 140, 66, ${hoveredDecade === decade ? 0.9 : 0.6})`; // Orange
  }, [decadeData.length, hoveredDecade]);

  // Stats for hovered decade
  const hoveredStats = hoveredDecade ? decadeData.find(d => d.decade === hoveredDecade) : null;

  if (loading) return <div className={styles.container}>Loading data...</div>;
  if (error) return <div className={styles.container}>Error loading data: {error}</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
        <h1 className={styles.title}>Democracy Distribution by Decade</h1>
        <p className={styles.subtitle}>
          {selectedIndexInfo?.name} • How the global distribution of democracy has evolved
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label className={styles.label}>Index</label>
            <select
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(e.target.value)}
              className={styles.select}
            >
              {DEMOCRACY_INDICES.map(idx => (
                <option key={idx.key} value={idx.key}>{idx.name}</option>
              ))}
            </select>
          </div>
          
          {hoveredStats && (
            <div className={styles.stats}>
              <span className={styles.stat}>{hoveredStats.label}</span>
              <span className={styles.stat}>Mean: {hoveredStats.mean.toFixed(2)}</span>
              <span className={styles.stat}>Median: {hoveredStats.median.toFixed(2)}</span>
              <span className={styles.stat}>{hoveredStats.count} countries</span>
            </div>
          )}
        </div>

        <div className={styles.chartContainer}>
          <svg width={SVG_W} height={SVG_H} className={styles.svg}>
            <defs>
              {decadeData.map((d, i) => (
                <linearGradient key={d.decade} id={`grad-${d.decade}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={getDecadeColor(d.decade, i).replace(/, [\d.]+\)/, ', 0.8)')} />
                  <stop offset="100%" stopColor={getDecadeColor(d.decade, i).replace(/, [\d.]+\)/, ', 0.1)')} />
                </linearGradient>
              ))}
            </defs>

            {/* X-axis */}
            <line
              x1={MARGIN.left}
              y1={SVG_H - MARGIN.bottom}
              x2={SVG_W - MARGIN.right}
              y2={SVG_H - MARGIN.bottom}
              stroke="#3a3a5a"
              strokeWidth={1}
            />
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map(tick => (
              <g key={tick}>
                <line
                  x1={xScale(tick)}
                  y1={SVG_H - MARGIN.bottom}
                  x2={xScale(tick)}
                  y2={SVG_H - MARGIN.bottom + 6}
                  stroke="#3a3a5a"
                />
                <text
                  x={xScale(tick)}
                  y={SVG_H - MARGIN.bottom + 20}
                  textAnchor="middle"
                  fill="#7f8c8d"
                  fontSize={11}
                >
                  {tick.toFixed(1)}
                </text>
              </g>
            ))}
            <text
              x={SVG_W / 2}
              y={SVG_H - 15}
              textAnchor="middle"
              fill="#a0a0a0"
              fontSize={12}
            >
              Democracy Score (0 = Autocracy, 1 = Full Democracy)
            </text>

            {/* Ridgelines */}
            <AnimatePresence mode="wait">
              {decadeData.map((d, i) => (
                <motion.g
                  key={d.decade}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                  transform={`translate(0, ${yScale(d.decade)})`}
                  onMouseEnter={() => setHoveredDecade(d.decade)}
                  onMouseLeave={() => setHoveredDecade(null)}
                  className={styles.ridge}
                >
                  {/* Area */}
                  <path
                    d={areaGenerator(d.density)}
                    fill={`url(#grad-${d.decade})`}
                    stroke={getDecadeColor(d.decade, i).replace(/, [\d.]+\)/, ', 1)')}
                    strokeWidth={hoveredDecade === d.decade ? 2 : 1}
                    transform="scale(1, -1)"
                  />
                  
                  {/* Decade label */}
                  <text
                    x={MARGIN.left - 10}
                    y={0}
                    textAnchor="end"
                    fill={hoveredDecade === d.decade ? '#fff' : '#a0a0a0'}
                    fontSize={11}
                    fontWeight={hoveredDecade === d.decade ? 600 : 400}
                  >
                    {d.label}
                  </text>
                </motion.g>
              ))}
            </AnimatePresence>
          </svg>

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendTitle}>Time Period</div>
            <div className={styles.legendGradient}>
              <div className={styles.gradientBar} />
            </div>
            <div className={styles.legendLabels}>
              <span>1780s</span>
              <span>1900s</span>
              <span>2020s</span>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className={styles.explanation}>
          <h3>What this shows</h3>
          <p>
            Each horizontal "ridge" represents the distribution of democracy scores for all countries in that decade. 
            The height shows how many countries had a particular score. Notice how the distribution shifts from 
            concentrated at the left (autocracy) in the 1800s to more spread out in the 2000s, showing the 
            "third wave of democratization."
          </p>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Source: V-Dem Institute v16 • {decadeData.length} decades • {VDEM_DATA?.length.toLocaleString()} country-year observations</p>
      </footer>
    </div>
  );
}

export default VDemRidgelinePlot;
