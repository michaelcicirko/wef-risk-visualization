import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { scaleLinear } from 'd3-scale';
import { area, curveBasis } from 'd3-shape';
import { stack, stackOffsetWiggle } from 'd3-shape';
import { extent } from 'd3-array';
import { VDEM_DATA } from '../data/vdemDemocracy.js';
import styles from './VDemStreamGraph.module.css';

const MARGIN = { top: 40, right: 120, bottom: 60, left: 80 };
const SVG_W = 960;
const SVG_H = 500;

// Regime type classification based on v2x_polyarchy
function classifyRegime(score) {
  if (score === null || score === undefined) return 'unknown';
  if (score < 0.3) return 'autocracy';
  if (score < 0.6) return 'electoral';
  return 'liberal';
}

// Process data: group by year and regime, sum population
function processStreamData(data) {
  const byYear = {};
  
  // Initialize all years with zeros for all regimes
  data.forEach(d => {
    if (!byYear[d.year]) {
      byYear[d.year] = { year: d.year, autocracy: 0, electoral: 0, liberal: 0 };
    }
    
    if (!d.e_mipopula || d.e_mipopula <= 0) return;
    
    const regime = classifyRegime(d.v2x_polyarchy);
    if (regime === 'unknown') return;
    
    byYear[d.year][regime] += d.e_mipopula;
  });
  
  return Object.values(byYear).sort((a, b) => a.year - b.year);
}

const REGIME_COLORS = {
  autocracy: '#c0392b',  // Red
  electoral: '#f39c12', // Orange/Yellow
  liberal: '#2980b9'      // Blue
};

const REGIME_LABELS = {
  autocracy: 'Autocracy',
  electoral: 'Electoral Democracy',
  liberal: 'Liberal Democracy'
};

function VDemStreamGraph() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightYear, setHighlightYear] = useState(1950);
  const [showPercent, setShowPercent] = useState(false);
  const playRef = useRef(null);

  // Process data
  const streamData = useMemo(() => {
    return processStreamData(VDEM_DATA);
  }, []);

  // Scales
  const xScale = useMemo(() => {
    if (streamData.length === 0) {
      return scaleLinear()
        .domain([1789, 2025])
        .range([MARGIN.left, SVG_W - MARGIN.right]);
    }
    return scaleLinear()
      .domain(extent(streamData, d => d.year))
      .range([MARGIN.left, SVG_W - MARGIN.right]);
  }, [streamData]);

  // Stack data
  const stackedData = useMemo(() => {
    if (streamData.length === 0) return [];
    
    try {
      const keys = ['autocracy', 'electoral', 'liberal'];
      const stacker = stack()
        .keys(keys)
        .offset(stackOffsetWiggle)
        .order(null);
      
      return stacker(streamData);
    } catch (err) {
      console.error('Stack error:', err);
      return [];
    }
  }, [streamData]);

  // Y scale
  const yScale = useMemo(() => {
    if (stackedData.length === 0) {
      return scaleLinear().domain([0, 1]).range([SVG_H - MARGIN.bottom, MARGIN.top]);
    }
    
    let maxY = 0;
    try {
      stackedData.forEach(series => {
        series.forEach(d => {
          if (Array.isArray(d) && d.length >= 2) {
            maxY = Math.max(maxY, Math.abs(d[0]), Math.abs(d[1]));
          }
        });
      });
    } catch (e) {
      maxY = 1;
    }
    
    if (maxY === 0) maxY = 1;
    
    return scaleLinear()
      .domain([-maxY * 0.6, maxY * 0.6])
      .range([SVG_H - MARGIN.bottom, MARGIN.top]);
  }, [stackedData]);

  // Area generator
  const areaGenerator = useMemo(() => {
    return area()
      .curve(curveBasis)
      .x(d => {
        const x = xScale(d?.data?.year);
        return isNaN(x) ? 0 : x;
      })
      .y0(d => {
        const y = yScale(d?.[0]);
        return isNaN(y) ? 0 : y;
      })
      .y1(d => {
        const y = yScale(d?.[1]);
        return isNaN(y) ? 0 : y;
      })
      .defined(d => d && d.data && !isNaN(d[0]) && !isNaN(d[1]));
  }, [xScale, yScale]);

  // Play animation
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setHighlightYear(prev => {
          const next = prev + 1;
          if (next > 2025) {
            setIsPlaying(false);
            return 2025;
          }
          return next;
        });
      }, 100);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [isPlaying]);

  // Get stats for highlighted year
  const yearStats = useMemo(() => {
    const yearData = streamData.find(d => d.year === highlightYear);
    if (!yearData) return null;
    
    const total = yearData.autocracy + yearData.electoral + yearData.liberal;
    return {
      ...yearData,
      total,
      autocracyPct: (yearData.autocracy / total * 100).toFixed(1),
      electoralPct: (yearData.electoral / total * 100).toFixed(1),
      liberalPct: (yearData.liberal / total * 100).toFixed(1)
    };
  }, [highlightYear, streamData]);

  if (streamData.length === 0) {
    return <div className={styles.container}>Loading data...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
        <h1 className={styles.title}>Global Population by Regime Type</h1>
        <p className={styles.subtitle}>
          Billions of people living under autocracy vs democracy • 1789–2025
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <button
              className={styles.playButton}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>Year</label>
            <input
              type="range"
              min={1789}
              max={2025}
              value={highlightYear}
              onChange={(e) => setHighlightYear(parseInt(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.yearDisplay}>{highlightYear}</span>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={showPercent}
                onChange={(e) => setShowPercent(e.target.checked)}
              />
              <span>Show percentages</span>
            </label>
          </div>
        </div>

        <div className={styles.chartContainer}>
          <svg width={SVG_W} height={SVG_H} className={styles.svg}>
            {/* X-axis */}
            <line
              x1={MARGIN.left}
              y1={SVG_H - MARGIN.bottom}
              x2={SVG_W - MARGIN.right}
              y2={SVG_H - MARGIN.bottom}
              stroke="#3a3a5a"
              strokeWidth={1}
            />
            
            {/* X-axis ticks */}
            {[1800, 1850, 1900, 1950, 2000, 2020].map(year => (
              <g key={year}>
                <line
                  x1={xScale(year)}
                  y1={SVG_H - MARGIN.bottom}
                  x2={xScale(year)}
                  y2={SVG_H - MARGIN.bottom + 6}
                  stroke="#3a3a5a"
                />
                <text
                  x={xScale(year)}
                  y={SVG_H - MARGIN.bottom + 22}
                  textAnchor="middle"
                  fill="#7f8c8d"
                  fontSize={11}
                >
                  {year}
                </text>
              </g>
            ))}

            {/* Highlight line */}
            <line
              x1={xScale(highlightYear)}
              x2={xScale(highlightYear)}
              y1={MARGIN.top}
              y2={SVG_H - MARGIN.bottom}
              stroke="#fff"
              strokeWidth={2}
              strokeDasharray="4 4"
              opacity={0.8}
            />

            {/* Stream layers */}
            {stackedData.length > 0 && stackedData.map((series, i) => {
              if (!series || !series.key) {
                console.warn('Invalid series at index', i);
                return null;
              }
              try {
                const path = areaGenerator(series);
                if (!path) return null;
                return (
                  <motion.path
                    key={series.key}
                    d={path}
                    fill={REGIME_COLORS[series.key]}
                    stroke={REGIME_COLORS[series.key]}
                    strokeWidth={0.5}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.85 }}
                    transition={{ delay: i * 0.1 }}
                  />
                );
              } catch (err) {
                console.error('Path generation error for', series.key, err);
                return null;
              }
            })}

            {/* Year label */}
            <text
              x={xScale(highlightYear)}
              y={MARGIN.top - 10}
              textAnchor="middle"
              fill="#fff"
              fontSize={14}
              fontWeight={600}
            >
              {highlightYear}
            </text>
          </svg>

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendTitle}>Regime Type</div>
            {Object.entries(REGIME_COLORS).map(([key, color]) => (
              <div key={key} className={styles.legendItem}>
                <div className={styles.legendColor} style={{ background: color }} />
                <span>{REGIME_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats panel */}
        {yearStats && (
          <motion.div 
            className={styles.statsPanel}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3>{highlightYear} Breakdown</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statValue} style={{ color: REGIME_COLORS.autocracy }}>
                  {showPercent ? `${yearStats.autocracyPct}%` : (yearStats.autocracy / 1e6).toFixed(1)}M
                </div>
                <div className={styles.statLabel}>Autocracy</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue} style={{ color: REGIME_COLORS.electoral }}>
                  {showPercent ? `${yearStats.electoralPct}%` : (yearStats.electoral / 1e6).toFixed(1)}M
                </div>
                <div className={styles.statLabel}>Electoral Democracy</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue} style={{ color: REGIME_COLORS.liberal }}>
                  {showPercent ? `${yearStats.liberalPct}%` : (yearStats.liberal / 1e6).toFixed(1)}M
                </div>
                <div className={styles.statLabel}>Liberal Democracy</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>
                  {(yearStats.total / 1e6).toFixed(0)}M
                </div>
                <div className={styles.statLabel}>Total Population</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Explanation */}
        <div className={styles.explanation}>
          <h3>What this shows</h3>
          <p>
            This stream graph shows how many people lived under different political regimes over time. 
            Notice the dramatic expansion of democracy in the 1990s (the "third wave") and the more 
            recent democratic backsliding in the 2010s. The wiggle layout emphasizes changes over time 
            rather than absolute levels.
          </p>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Source: V-Dem Institute v16 • Population data: e_mipopula</p>
      </footer>
    </div>
  );
}

export default VDemStreamGraph;
