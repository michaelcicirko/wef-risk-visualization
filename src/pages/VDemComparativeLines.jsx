import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleLinear, scalePoint } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { VDEM_DATA, VDEM_COUNTRIES, DEMOCRACY_INDICES } from '../data/vdemDemocracy.js';
import styles from './VDemComparativeLines.module.css';

const MARGIN = { top: 40, right: 180, bottom: 80, left: 70 };
const SVG_W = 1000;
const SVG_H = 600;

// Region colors
const REGION_COLORS = {
  'Europe': '#3498db',
  'Asia': '#e74c3c',
  'Africa': '#2ecc71',
  'Americas': '#f39c12',
  'Oceania': '#9b59b6',
  'Other': '#95a5a6'
};

function VDemComparativeLines() {
  const [year, setYear] = useState(2020);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState('v2x_polyarchy');
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [showTrendLine, setShowTrendLine] = useState(false);
  const playRef = useRef(null);
  const svgRef = useRef(null);

  const indexInfo = DEMOCRACY_INDICES.find(d => d.key === selectedIndex);

  // Get all years
  const years = useMemo(() => {
    return [...new Set(VDEM_DATA.map(d => d.year))].sort((a, b) => a - b);
  }, []);

  // Get all countries with data
  const allCountries = useMemo(() => {
    const countryData = {};
    VDEM_DATA.forEach(d => {
      if (!countryData[d.country_id]) {
        countryData[d.country_id] = {
          id: d.country_id,
          name: d.country_name,
          region: d.region,
          code: d.country_text_id,
          years: 0
        };
      }
      if (d[selectedIndex] !== null) {
        countryData[d.country_id].years++;
      }
    });
    
    return Object.values(countryData)
      .filter(c => c.years > 50) // Only countries with substantial data
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedIndex]);

  // Build data for selected countries
  const countryLines = useMemo(() => {
    const lines = {};
    
    selectedCountries.forEach(countryId => {
      const points = [];
      years.forEach(y => {
        const data = VDEM_DATA.find(d => d.year === y && d.country_id === countryId);
        if (data && data[selectedIndex] !== null) {
          points.push({
            year: y,
            value: data[selectedIndex],
            country: data.country_name,
            region: data.region
          });
        }
      });
      
      if (points.length > 0) {
        const country = allCountries.find(c => c.id === countryId);
        lines[countryId] = {
          points,
          country: points[0].country,
          region: points[0].region,
          color: REGION_COLORS[points[0].region] || '#95a5a6'
        };
      }
    });
    
    return lines;
  }, [selectedCountries, years, selectedIndex, allCountries]);

  // Scales
  const xScale = useMemo(() => {
    return scalePoint()
      .domain(years.map(String))
      .range([MARGIN.left, SVG_W - MARGIN.right])
      .padding(0);
  }, [years]);

  const yScale = useMemo(() => {
    return scaleLinear()
      .domain([0, 1])
      .range([SVG_H - MARGIN.bottom, MARGIN.top])
      .nice();
  }, []);

  // Line generator
  const lineGenerator = useMemo(() => {
    return line()
      .x(d => xScale(String(d.year)))
      .y(d => yScale(d.value))
      .curve(curveMonotoneX)
      .defined(d => d.value !== null && !isNaN(d.value));
  }, [xScale, yScale]);

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
      }, 100);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [isPlaying, years]);

  // Toggle country selection
  const toggleCountry = useCallback((countryId) => {
    setSelectedCountries(prev => {
      if (prev.includes(countryId)) {
        return prev.filter(id => id !== countryId);
      }
      if (prev.length >= 8) {
        return prev; // Max 8 countries
      }
      return [...prev, countryId];
    });
  }, []);

  // Clear all selections
  const clearAll = useCallback(() => {
    setSelectedCountries([]);
  }, []);

  // Calculate average trend
  const averageTrend = useMemo(() => {
    if (!showTrendLine || selectedCountries.length === 0) return null;
    
    const avgPoints = [];
    years.forEach(y => {
      const values = selectedCountries
        .map(id => {
          const data = VDEM_DATA.find(d => d.year === y && d.country_id === id);
          return data?.[selectedIndex] ?? null;
        })
        .filter(v => v !== null);
      
      if (values.length > 0) {
        avgPoints.push({
          year: y,
          value: values.reduce((a, b) => a + b, 0) / values.length
        });
      }
    });
    
    return avgPoints;
  }, [selectedCountries, years, selectedIndex, showTrendLine]);

  // Current year values for selected countries
  const currentValues = useMemo(() => {
    return selectedCountries.map(id => {
      const data = VDEM_DATA.find(d => d.year === year && d.country_id === id);
      const country = allCountries.find(c => c.id === id);
      return {
        id,
        name: country?.name,
        value: data?.[selectedIndex] ?? null,
        region: country?.region,
        color: REGION_COLORS[country?.region] || '#95a5a6'
      };
    }).filter(d => d.value !== null);
  }, [selectedCountries, year, selectedIndex, allCountries]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
        <h1 className={styles.title}>Comparative Democracy Trajectories</h1>
        <p className={styles.subtitle}>
          Compare democracy scores across countries over time — select up to 8 countries to see how their trajectories diverge or converge
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <button
              className={styles.playButton}
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={selectedCountries.length === 0}
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

          <div className={styles.controlGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showTrendLine}
                onChange={(e) => setShowTrendLine(e.target.checked)}
                disabled={selectedCountries.length === 0}
              />
              Show average
            </label>
          </div>

          {selectedCountries.length > 0 && (
            <button className={styles.clearButton} onClick={clearAll}>
              Clear all ({selectedCountries.length})
            </button>
          )}
        </div>

        <div className={styles.chartContainer}>
          {/* Country Selector */}
          <div className={styles.countrySelector}>
            <div className={styles.selectorHeader}>
              <span className={styles.selectorTitle}>Select Countries</span>
              <span className={styles.selectorCount}>{selectedCountries.length}/8</span>
            </div>
            <div className={styles.countryList}>
              {allCountries.map(country => {
                const isSelected = selectedCountries.includes(country.id);
                const isAtLimit = selectedCountries.length >= 8 && !isSelected;
                
                return (
                  <button
                    key={country.id}
                    className={`${styles.countryItem} ${isSelected ? styles.selected : ''} ${isAtLimit ? styles.disabled : ''}`}
                    onClick={() => !isAtLimit && toggleCountry(country.id)}
                    disabled={isAtLimit}
                  >
                    <span 
                      className={styles.countryColor} 
                      style={{ 
                        background: isSelected ? REGION_COLORS[country.region] : 'transparent',
                        border: isSelected ? 'none' : '2px solid #4a4a6a'
                      }} 
                    />
                    <span className={styles.countryName}>{country.name}</span>
                    {isSelected && <span className={styles.checkmark}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chart */}
          <div className={styles.chartWrapper}>
            <svg
              ref={svgRef}
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
                  <text
                    x={MARGIN.left - 10}
                    y={yScale(tick) + 4}
                    textAnchor="end"
                    fill="#7f8c8d"
                    fontSize={11}
                  >
                    {tick.toFixed(1)}
                  </text>
                </g>
              ))}

              {/* X axis */}
              <line
                x1={MARGIN.left}
                y1={SVG_H - MARGIN.bottom}
                x2={SVG_W - MARGIN.right}
                y2={SVG_H - MARGIN.bottom}
                stroke="#5a5a8a"
                strokeWidth={2}
              />

              {/* Y axis */}
              <line
                x1={MARGIN.left}
                y1={MARGIN.top}
                x2={MARGIN.left}
                y2={SVG_H - MARGIN.bottom}
                stroke="#5a5a8a"
                strokeWidth={2}
              />

              {/* X axis ticks (sampled) */}
              {years.filter((_, i) => i % 20 === 0 || i === years.length - 1).map(y => (
                <g key={y}>
                  <line
                    x1={xScale(String(y))}
                    y1={SVG_H - MARGIN.bottom}
                    x2={xScale(String(y))}
                    y2={SVG_H - MARGIN.bottom + 6}
                    stroke="#5a5a8a"
                    strokeWidth={2}
                  />
                  <text
                    x={xScale(String(y))}
                    y={SVG_H - MARGIN.bottom + 22}
                    textAnchor="middle"
                    fill="#7f8c8d"
                    fontSize={11}
                  >
                    {y}
                  </text>
                </g>
              ))}

              {/* Axis labels */}
              <text
                x={(MARGIN.left + SVG_W - MARGIN.right) / 2}
                y={SVG_H - 45}
                textAnchor="middle"
                fill="#a0a0c0"
                fontSize={14}
                fontWeight={500}
              >
                Year →
              </text>
              <text
                x={25}
                y={(MARGIN.top + SVG_H - MARGIN.bottom) / 2}
                textAnchor="middle"
                fill="#a0a0c0"
                fontSize={14}
                fontWeight={500}
                transform={`rotate(-90, 25, ${(MARGIN.top + SVG_H - MARGIN.bottom) / 2})`}
              >
                {indexInfo?.name} →
              </text>

              {/* Average trend line */}
              {showTrendLine && averageTrend && averageTrend.length > 1 && (
                <motion.path
                  d={lineGenerator(averageTrend)}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={3}
                  strokeDasharray="8,4"
                  strokeOpacity={0.6}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1 }}
                />
              )}

              {/* Country lines */}
              <AnimatePresence>
                {Object.entries(countryLines).map(([countryId, data]) => {
                  const isHovered = hoveredCountry === parseInt(countryId);
                  const pathD = lineGenerator(data.points);
                  if (!pathD) return null;
                  
                  return (
                    <motion.g key={countryId}>
                      <motion.path
                        d={pathD}
                        fill="none"
                        stroke={data.color}
                        strokeWidth={isHovered ? 4 : 2.5}
                        strokeOpacity={isHovered ? 1 : 0.85}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        onMouseEnter={() => setHoveredCountry(parseInt(countryId))}
                        onMouseLeave={() => setHoveredCountry(null)}
                      />
                      
                      {/* Current year dot */}
                      {(() => {
                        const currentPoint = data.points.find(p => p.year === year);
                        if (!currentPoint) return null;
                        
                        return (
                          <motion.circle
                            cx={xScale(String(year))}
                            cy={yScale(currentPoint.value)}
                            r={isHovered ? 8 : 6}
                            fill={data.color}
                            stroke="#fff"
                            strokeWidth={2}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                        );
                      })()}
                    </motion.g>
                  );
                })}
              </AnimatePresence>

              {/* Vertical indicator line for current year */}
              <line
                x1={xScale(String(year))}
                y1={MARGIN.top}
                x2={xScale(String(year))}
                y2={SVG_H - MARGIN.bottom}
                stroke="#fff"
                strokeWidth={1}
                strokeDasharray="4,4"
                strokeOpacity={0.3}
              />
            </svg>

            {/* Legend */}
            {selectedCountries.length > 0 && (
              <div className={styles.legend}>
                {currentValues
                  .sort((a, b) => b.value - a.value)
                  .map(d => (
                    <div
                      key={d.id}
                      className={`${styles.legendItem} ${hoveredCountry === d.id ? styles.hovered : ''}`}
                      onMouseEnter={() => setHoveredCountry(d.id)}
                      onMouseLeave={() => setHoveredCountry(null)}
                    >
                      <span className={styles.legendColor} style={{ background: d.color }} />
                      <span className={styles.legendName}>{d.name}</span>
                      <span className={styles.legendValue}>{d.value.toFixed(3)}</span>
                      <button
                        className={styles.removeButton}
                        onClick={() => toggleCountry(d.id)}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                {showTrendLine && averageTrend && (
                  <div className={styles.legendItem}>
                    <span className={styles.legendColor} style={{ background: '#fff', opacity: 0.6, border: '2px dashed #fff' }} />
                    <span className={styles.legendName}>Average</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Empty state */}
        {selectedCountries.length === 0 && (
          <div className={styles.emptyState}>
            <p>Select countries from the list to compare their democracy trajectories</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default VDemComparativeLines;
