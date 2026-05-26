import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleLinear } from 'd3-scale';
import { line, curveCatmullRom } from 'd3-shape';
import { DEMOCRACY_INDICES } from '../data/vdemDemocracy.js';
import { useVdemData } from '../data/useVdemData.js';
import styles from './VDemConnectedScatter.module.css';

const MARGIN = { top: 40, right: 120, bottom: 60, left: 70 };
const SVG_W = 900;
const SVG_H = 600;

// Get color by region
const REGION_COLORS = {
  'Europe': '#3498db',
  'Asia': '#e74c3c',
  'Africa': '#2ecc71',
  'Americas': '#f39c12',
  'Oceania': '#9b59b6',
  'Other': '#95a5a6'
};

function VDemConnectedScatter() {
  const { data: VDEM_DATA, loading, error } = useVdemData();
  const [year, setYear] = useState(1950);
  const [isPlaying, setIsPlaying] = useState(false);
  const [xIndex, setXIndex] = useState('v2x_polyarchy');
  const [yIndex, setYIndex] = useState('v2x_libdem');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [trailLength, setTrailLength] = useState(10);
  const playRef = useRef(null);

  const xIndexInfo = DEMOCRACY_INDICES.find(d => d.key === xIndex);
  const yIndexInfo = DEMOCRACY_INDICES.find(d => d.key === yIndex);

  const VDEM_COUNTRIES = useMemo(() => {
    if (!VDEM_DATA) return [];
    const seen = new Map();
    VDEM_DATA.forEach(d => {
      if (!seen.has(d.country_id)) seen.set(d.country_id, { id: d.country_id, name: d.country_name, code: d.country_text_id, region: d.region });
    });
    return Array.from(seen.values());
  }, [VDEM_DATA]);

  // Get all years
  const years = useMemo(() => {
    if (!VDEM_DATA) return [];
    const uniqueYears = [...new Set(VDEM_DATA.map(d => d.year))].sort((a, b) => a - b);
    return uniqueYears;
  }, [VDEM_DATA]);

  // Get data for current and trailing years
  const currentData = useMemo(() => {
    if (!VDEM_DATA) return [];
    return VDEM_DATA.filter(d => d.year === year && d[xIndex] !== null && d[yIndex] !== null);
  }, [VDEM_DATA, year, xIndex, yIndex]);

  const trailData = useMemo(() => {
    if (!VDEM_DATA) return {};
    const trailYears = [];
    for (let i = 0; i < trailLength; i++) {
      const trailYear = year - i;
      if (trailYear < years[0]) break;
      trailYears.push(trailYear);
    }
    
    const data = {};
    trailYears.forEach(ty => {
      const yearData = (VDEM_DATA || []).filter(d => d.year === ty && d[xIndex] !== null && d[yIndex] !== null);
      yearData.forEach(d => {
        if (!data[d.country_id]) data[d.country_id] = [];
        data[d.country_id].push({
          year: ty,
          x: d[xIndex],
          y: d[yIndex],
          country: d.country_name,
          code: d.country_text_id,
          region: d.region
        });
      });
    });
    return data;
  }, [year, xIndex, yIndex, trailLength, years]);

  // Scales
  const xScale = useMemo(() => {
    return scaleLinear()
      .domain([0, 1])
      .range([MARGIN.left, SVG_W - MARGIN.right])
      .clamp(true);
  }, []);

  const yScale = useMemo(() => {
    return scaleLinear()
      .domain([0, 1])
      .range([SVG_H - MARGIN.bottom, MARGIN.top])
      .clamp(true);
  }, []);

  // Play animation
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setYear(prev => {
          const idx = years.indexOf(prev);
          if (idx >= years.length - 1) {
            setIsPlaying(false);
            return years[years.length - 1];
          }
          return years[idx + 1];
        });
      }, 200);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [isPlaying, years]);

  // Line generator for trails
  const lineGenerator = useMemo(() => {
    return line()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(curveCatmullRom.alpha(0.5))
      .defined(d => d.x !== null && d.y !== null && !isNaN(d.x) && !isNaN(d.y));
  }, [xScale, yScale]);

  // Get country info
  const getCountryInfo = useCallback((countryId) => {
    return VDEM_COUNTRIES.find(c => c.id === countryId);
  }, []);

  if (loading) return <div className={styles.container}>Loading data...</div>;
  if (error) return <div className={styles.container}>Error loading data: {error}</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
        <h1 className={styles.title}>Democracy Dimensions Over Time</h1>
        <p className={styles.subtitle}>
          {xIndexInfo?.name} vs {yIndexInfo?.name} • Connected scatter showing evolution trails
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
              min={years[0]}
              max={years[years.length - 1]}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.yearDisplay}>{year}</span>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>X Axis</label>
            <select
              value={xIndex}
              onChange={(e) => setXIndex(e.target.value)}
              className={styles.select}
            >
              {DEMOCRACY_INDICES.map(idx => (
                <option key={idx.key} value={idx.key}>{idx.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>Y Axis</label>
            <select
              value={yIndex}
              onChange={(e) => setYIndex(e.target.value)}
              className={styles.select}
            >
              {DEMOCRACY_INDICES.map(idx => (
                <option key={idx.key} value={idx.key}>{idx.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>Trail</label>
            <input
              type="range"
              min={1}
              max={50}
              value={trailLength}
              onChange={(e) => setTrailLength(parseInt(e.target.value))}
              className={styles.smallSlider}
            />
            <span className={styles.smallDisplay}>{trailLength}y</span>
          </div>
        </div>

        <div className={styles.chartContainer}>
          <svg
            width={SVG_W}
            height={SVG_H}
            className={styles.svg}
          >
            {/* Background */}
            <rect
              width={SVG_W}
              height={SVG_H}
              fill="#0d0d1a"
            />

            {/* Grid lines */}
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map(tick => (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  y1={yScale(tick)}
                  x2={SVG_W - MARGIN.right}
                  y2={yScale(tick)}
                  stroke="#2a2a4a"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
                <line
                  x1={xScale(tick)}
                  y1={MARGIN.top}
                  x2={xScale(tick)}
                  y2={SVG_H - MARGIN.bottom}
                  stroke="#2a2a4a"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
              </g>
            ))}

            {/* Diagonal reference line (y=x) */}
            <line
              x1={xScale(0)}
              y1={yScale(0)}
              x2={xScale(1)}
              y2={yScale(1)}
              stroke="#4a4a6a"
              strokeWidth={2}
              strokeDasharray="8,4"
            />

            {/* Axes */}
            <line
              x1={MARGIN.left}
              y1={SVG_H - MARGIN.bottom}
              x2={SVG_W - MARGIN.right}
              y2={SVG_H - MARGIN.bottom}
              stroke="#5a5a8a"
              strokeWidth={2}
            />
            <line
              x1={MARGIN.left}
              y1={MARGIN.top}
              x2={MARGIN.left}
              y2={SVG_H - MARGIN.bottom}
              stroke="#5a5a8a"
              strokeWidth={2}
            />

            {/* X axis label */}
            <text
              x={(MARGIN.left + SVG_W - MARGIN.right) / 2}
              y={SVG_H - 15}
              textAnchor="middle"
              fill="#a0a0c0"
              fontSize={14}
              fontWeight={500}
            >
              {xIndexInfo?.name} →
            </text>

            {/* Y axis label */}
            <text
              x={20}
              y={(MARGIN.top + SVG_H - MARGIN.bottom) / 2}
              textAnchor="middle"
              fill="#a0a0c0"
              fontSize={14}
              fontWeight={500}
              transform={`rotate(-90, 20, ${(MARGIN.top + SVG_H - MARGIN.bottom) / 2})`}
            >
              {yIndexInfo?.name} →
            </text>

            {/* Axis ticks */}
            {[0, 0.25, 0.5, 0.75, 1].map(tick => (
              <g key={tick}>
                <text
                  x={xScale(tick)}
                  y={SVG_H - MARGIN.bottom + 20}
                  textAnchor="middle"
                  fill="#7f8c8d"
                  fontSize={12}
                >
                  {tick.toFixed(2)}
                </text>
                <text
                  x={MARGIN.left - 10}
                  y={yScale(tick) + 4}
                  textAnchor="end"
                  fill="#7f8c8d"
                  fontSize={12}
                >
                  {tick.toFixed(2)}
                </text>
              </g>
            ))}

            {/* Trail lines */}
            <AnimatePresence>
              {Object.entries(trailData).map(([countryId, points]) => {
                if (points.length < 2) return null;
                const countryInfo = getCountryInfo(parseInt(countryId));
                const isSelected = selectedCountry === parseInt(countryId);
                const isHovered = hoveredCountry === parseInt(countryId);
                
                return (
                  <motion.path
                    key={`trail-${countryId}`}
                    d={lineGenerator(points)}
                    fill="none"
                    stroke={REGION_COLORS[points[0]?.region] || '#95a5a6'}
                    strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                    strokeOpacity={isSelected ? 0.9 : isHovered ? 0.7 : 0.3}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                );
              })}
            </AnimatePresence>

            {/* Current year points */}
            <AnimatePresence>
              {currentData.map(d => {
                const countryInfo = getCountryInfo(d.country_id);
                const isSelected = selectedCountry === d.country_id;
                const isHovered = hoveredCountry === d.country_id;
                
                return (
                  <motion.g
                    key={d.country_id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <circle
                      cx={xScale(d[xIndex])}
                      cy={yScale(d[yIndex])}
                      r={isSelected ? 8 : isHovered ? 6 : 4}
                      fill={REGION_COLORS[d.region] || '#95a5a6'}
                      stroke="#fff"
                      strokeWidth={isSelected ? 2 : 1}
                      className={styles.point}
                      onMouseEnter={() => setHoveredCountry(d.country_id)}
                      onMouseLeave={() => setHoveredCountry(null)}
                      onClick={() => setSelectedCountry(isSelected ? null : d.country_id)}
                      style={{ cursor: 'pointer' }}
                    />
                    
                    {(isSelected || isHovered) && (
                      <motion.text
                        x={xScale(d[xIndex]) + 12}
                        y={yScale(d[yIndex])}
                        fill="#fff"
                        fontSize={12}
                        fontWeight={500}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {d.country_name}
                      </motion.text>
                    )}
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </svg>

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendTitle}>Region</div>
            {Object.entries(REGION_COLORS).map(([region, color]) => (
              <div key={region} className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: color }} />
                <span className={styles.legendLabel}>{region}</span>
              </div>
            ))}
          </div>

          {/* Country list */}
          <div className={styles.countryList}>
            <div className={styles.countryListTitle}>Click to highlight</div>
            <div className={styles.countryListItems}>
              {currentData
                .sort((a, b) => b[xIndex] + b[yIndex] - a[xIndex] - a[yIndex])
                .slice(0, 20)
                .map(d => (
                  <button
                    key={d.country_id}
                    className={`${styles.countryListItem} ${selectedCountry === d.country_id ? styles.selected : ''}`}
                    onClick={() => setSelectedCountry(selectedCountry === d.country_id ? null : d.country_id)}
                  >
                    <span className={styles.countryListColor} style={{ background: REGION_COLORS[d.region] }} />
                    <span className={styles.countryListName}>{d.country_name}</span>
                    <span className={styles.countryListScore}>
                      {(d[xIndex] * 0.5 + d[yIndex] * 0.5).toFixed(2)}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Stats panel */}
        <div className={styles.statsPanel}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Year</span>
            <span className={styles.statValue}>{year}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Countries</span>
            <span className={styles.statValue}>{currentData.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Avg X</span>
            <span className={styles.statValue}>
              {(currentData.reduce((a, b) => a + b[xIndex], 0) / currentData.length || 0).toFixed(3)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Avg Y</span>
            <span className={styles.statValue}>
              {(currentData.reduce((a, b) => a + b[yIndex], 0) / currentData.length || 0).toFixed(3)}
            </span>
          </div>
          {selectedCountry && (
            <div className={styles.selectedInfo}>
              <span className={styles.statLabel}>
                {VDEM_COUNTRIES.find(c => c.id === selectedCountry)?.name}
              </span>
              <span className={styles.statValue}>
                X: {currentData.find(d => d.country_id === selectedCountry)?.[xIndex]?.toFixed(3) || 'N/A'}
                {' / '}
                Y: {currentData.find(d => d.country_id === selectedCountry)?.[yIndex]?.toFixed(3) || 'N/A'}
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default VDemConnectedScatter;
