import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleLinear, scalePoint } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';
import { DEMOCRACY_INDICES } from '../data/vdemDemocracy.js';
import { useVdemData } from '../data/useVdemData.js';
import styles from './VDemBumpChart.module.css';

const MARGIN = { top: 40, right: 140, bottom: 80, left: 60 };
const SVG_W = 1000;
const SVG_H = 700;
const TOP_N = 15; // Show top 15 countries

// Region colors
const REGION_COLORS = {
  'Europe': '#3498db',
  'Asia': '#e74c3c',
  'Africa': '#2ecc71',
  'Americas': '#f39c12',
  'Oceania': '#9b59b6',
  'Other': '#95a5a6'
};

function VDemBumpChart() {
  const { data: VDEM_DATA, loading, error } = useVdemData();
  const [year, setYear] = useState(2020);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState('v2x_polyarchy');
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const [showContext, setShowContext] = useState(true); // Show top 15 as background
  const playRef = useRef(null);

  const indexInfo = DEMOCRACY_INDICES.find(d => d.key === selectedIndex);

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
    return [...new Set(VDEM_DATA.map(d => d.year))].sort((a, b) => a - b);
  }, [VDEM_DATA]);

  // All years for tracking
  const displayYears = useMemo(() => {
    return years;
  }, [years]);

  // Calculate rankings for each year
  const rankingData = useMemo(() => {
    if (!VDEM_DATA) return {};
    const data = {};
    
    displayYears.forEach(y => {
      const yearData = VDEM_DATA
        .filter(d => d.year === y && d[selectedIndex] !== null)
        .sort((a, b) => b[selectedIndex] - a[selectedIndex])
        .slice(0, TOP_N)
        .map((d, i) => ({
          countryId: d.country_id,
          country: d.country_name,
          code: d.country_text_id,
          region: d.region,
          score: d[selectedIndex],
          rank: i + 1
        }));
      
      data[y] = yearData;
    });
    
    return data;
  }, [displayYears, selectedIndex]);

  // Get all countries that ever appeared in top N for the selector
  const allTopCountries = useMemo(() => {
    const countrySet = new Map();
    Object.values(rankingData).forEach(yearRanks => {
      yearRanks.forEach(d => {
        if (!countrySet.has(d.countryId)) {
          countrySet.set(d.countryId, {
            id: d.countryId,
            name: d.country,
            region: d.region,
            bestRank: d.rank,
            yearsInTop: 1
          });
        } else {
          const existing = countrySet.get(d.countryId);
          existing.bestRank = Math.min(existing.bestRank, d.rank);
          existing.yearsInTop += 1;
        }
      });
    });
    return Array.from(countrySet.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rankingData]);

  // Get country info
  const getCountryInfo = useCallback((countryId) => {
    return VDEM_COUNTRIES.find(c => c.id === countryId);
  }, []);

  // Scales
  const xScale = useMemo(() => {
    return scalePoint()
      .domain(displayYears.map(String))
      .range([MARGIN.left, SVG_W - MARGIN.right])
      .padding(0.1);
  }, [displayYears]);

  const yScale = useMemo(() => {
    return scaleLinear()
      .domain([1, TOP_N])
      .range([MARGIN.top, SVG_H - MARGIN.bottom])
      .nice();
  }, []);

  // Line generator for bump paths
  const lineGenerator = useMemo(() => {
    return line()
      .x(d => xScale(String(d.year)))
      .y(d => yScale(d.rank))
      .curve(curveMonotoneX)
      .defined(d => d.rank !== null);
  }, [xScale, yScale]);

  // Build path data for selected country
  const selectedCountryPath = useMemo(() => {
    if (!selectedCountryId) return null;
    
    const points = [];
    displayYears.forEach(y => {
      const yearData = rankingData[y];
      const countryData = yearData?.find(d => d.countryId === selectedCountryId);
      if (countryData) {
        points.push({
          year: y,
          rank: countryData.rank,
          score: countryData.score,
          country: countryData.country,
          region: countryData.region
        });
      }
    });
    
    if (points.length > 0) {
      return {
        points,
        country: points[0].country,
        region: points[0].region,
        color: REGION_COLORS[points[0].region] || '#95a5a6'
      };
    }
    return null;
  }, [selectedCountryId, rankingData, displayYears]);

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
      }, 300);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [isPlaying, years]);

  // Current year rankings
  const currentRankings = rankingData[year] || [];

  if (loading) return <div className={styles.container}>Loading data...</div>;
  if (error) return <div className={styles.container}>Error loading data: {error}</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
        <h1 className={styles.title}>Democracy Rankings Over Time</h1>
        <p className={styles.subtitle}>
          Top {TOP_N} countries by {indexInfo?.name} — watch who rises and falls in the democracy rankings
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
            <label className={styles.label}>Track Country</label>
            <select
              value={selectedCountryId || ''}
              onChange={(e) => setSelectedCountryId(e.target.value ? parseInt(e.target.value) : null)}
              className={styles.select}
              style={{ minWidth: '220px' }}
            >
              <option value="">Select a country...</option>
              {allTopCountries.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (best: #{c.bestRank}, {c.yearsInTop}y)
                </option>
              ))}
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showContext}
                onChange={(e) => setShowContext(e.target.checked)}
              />
              Show current top 15
            </label>
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

            {/* Grid lines for ranks */}
            {Array.from({ length: TOP_N }, (_, i) => i + 1).map(rank => (
              <line
                key={`grid-${rank}`}
                x1={MARGIN.left}
                y1={yScale(rank)}
                x2={SVG_W - MARGIN.right}
                y2={yScale(rank)}
                stroke="#2a2a4a"
                strokeWidth={1}
                strokeDasharray={rank % 5 === 0 ? null : "2,4"}
              />
            ))}

            {/* Axes */}
            <line
              x1={MARGIN.left}
              y1={SVG_H - MARGIN.bottom}
              x2={SVG_W - MARGIN.right}
              y2={SVG_H - MARGIN.bottom}
              stroke="#5a5a8a"
              strokeWidth={2}
            />

            {/* X axis ticks (sampled) */}
            {displayYears.filter((_, i) => i % 10 === 0 || i === displayYears.length - 1).map(y => (
              <g key={`tick-${y}`}>
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
                  y={SVG_H - MARGIN.bottom + 25}
                  textAnchor="middle"
                  fill="#7f8c8d"
                  fontSize={11}
                >
                  {y}
                </text>
              </g>
            ))}

            {/* Y axis (ranks) */}
            <line
              x1={MARGIN.left}
              y1={MARGIN.top}
              x2={MARGIN.left}
              y2={SVG_H - MARGIN.bottom}
              stroke="#5a5a8a"
              strokeWidth={2}
            />

            {/* Y axis labels */}
            {Array.from({ length: TOP_N }, (_, i) => i + 1).map(rank => (
              <text
                key={`rank-label-${rank}`}
                x={MARGIN.left - 12}
                y={yScale(rank) + 4}
                textAnchor="end"
                fill={rank <= 3 ? '#f1c40f' : '#7f8c8d'}
                fontSize={12}
                fontWeight={rank <= 3 ? 600 : 400}
              >
                #{rank}
              </text>
            ))}

            {/* Y axis title */}
            <text
              x={20}
              y={(MARGIN.top + SVG_H - MARGIN.bottom) / 2}
              textAnchor="middle"
              fill="#a0a0c0"
              fontSize={14}
              fontWeight={500}
              transform={`rotate(-90, 20, ${(MARGIN.top + SVG_H - MARGIN.bottom) / 2})`}
            >
              Rank →
            </text>

            {/* X axis title */}
            <text
              x={(MARGIN.left + SVG_W - MARGIN.right) / 2}
              y={SVG_H - 35}
              textAnchor="middle"
              fill="#a0a0c0"
              fontSize={14}
              fontWeight={500}
            >
              Year →
            </text>

            {/* Context: faint lines for current top 15 */}
            {showContext && currentRankings.map(d => {
              // Build path for this country
              const points = [];
              displayYears.forEach(y => {
                const yearData = rankingData[y];
                const countryData = yearData?.find(c => c.countryId === d.countryId);
                if (countryData) {
                  points.push({ year: y, rank: countryData.rank });
                }
              });
              
              if (points.length < 2) return null;
              const pathD = lineGenerator(points);
              if (!pathD) return null;
              
              const isSelected = selectedCountryId === d.countryId;
              
              return (
                <motion.path
                  key={`context-${d.countryId}`}
                  d={pathD}
                  fill="none"
                  stroke="#3a3a5a"
                  strokeWidth={1}
                  strokeOpacity={isSelected ? 0.1 : 0.25}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              );
            })}

            {/* Selected country path (prominent) */}
            {selectedCountryPath && (
              <motion.path
                d={lineGenerator(selectedCountryPath.points)}
                fill="none"
                stroke={selectedCountryPath.color}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            )}

            {/* Current year dots */}
            <AnimatePresence>
              {currentRankings.map(d => {
                const isSelected = selectedCountryId === d.countryId;
                
                return (
                  <motion.g
                    key={`dot-${d.countryId}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <circle
                      cx={xScale(String(year))}
                      cy={yScale(d.rank)}
                      r={isSelected ? 12 : 5}
                      fill={isSelected ? selectedCountryPath?.color : '#5a5a8a'}
                      fillOpacity={isSelected ? 1 : 0.5}
                      stroke="#fff"
                      strokeWidth={isSelected ? 3 : 1}
                      className={styles.point}
                    />
                    
                    {(isSelected || d.rank <= 3) && (
                      <motion.text
                        x={xScale(String(year)) + 15}
                        y={yScale(d.rank) + 4}
                        fill="#fff"
                        fontSize={isSelected ? 14 : 11}
                        fontWeight={500}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {d.country} ({d.score.toFixed(3)})
                      </motion.text>
                    )}
                  </motion.g>
                );
              })}
            </AnimatePresence>

            {/* Selected country historical dots */}
            {selectedCountryPath && selectedCountryPath.points.map((point, i) => (
              <circle
                key={`historical-${point.year}`}
                cx={xScale(String(point.year))}
                cy={yScale(point.rank)}
                r={3}
                fill={selectedCountryPath.color}
                fillOpacity={0.4}
              />
            ))}
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
        </div>

        {/* Rankings table */}
        <div className={styles.rankingsPanel}>
          <div className={styles.rankingsHeader}>
            <span className={styles.rankingsTitle}>Top {TOP_N} — {year}</span>
            <span className={styles.rankingsSubtitle}>{indexInfo?.name}</span>
          </div>
          <div className={styles.rankingsList}>
            {currentRankings.map((d, i) => (
              <div
                key={d.countryId}
                className={`${styles.rankingsRow} ${selectedCountryId === d.countryId ? styles.selected : ''} ${i < 3 ? styles.top3 : ''}`}
                onClick={() => setSelectedCountryId(selectedCountryId === d.countryId ? null : d.countryId)}
              >
                <span className={styles.rankingsRank}>#{d.rank}</span>
                <span className={styles.rankingsColor} style={{ background: REGION_COLORS[d.region] }} />
                <span className={styles.rankingsName}>{d.country}</span>
                <span className={styles.rankingsScore}>{d.score.toFixed(3)}</span>
              </div>
            ))}
          </div>
          
          {/* Selected country journey panel */}
          {selectedCountryPath && (
            <div className={styles.journeyPanel}>
              <div className={styles.journeyHeader}>
                <span className={styles.journeyColor} style={{ background: selectedCountryPath.color }} />
                <span className={styles.journeyTitle}>{selectedCountryPath.country}'s Journey</span>
              </div>
              <div className={styles.journeyStats}>
                <div className={styles.journeyStat}>
                  <span className={styles.journeyLabel}>Best Rank</span>
                  <span className={styles.journeyValue}>#{Math.min(...selectedCountryPath.points.map(p => p.rank))}</span>
                </div>
                <div className={styles.journeyStat}>
                  <span className={styles.journeyLabel}>Current</span>
                  <span className={styles.journeyValue}>
                    #{selectedCountryPath.points.find(p => p.year === year)?.rank || 'N/A'}
                  </span>
                </div>
                <div className={styles.journeyStat}>
                  <span className={styles.journeyLabel}>Years in Top {TOP_N}</span>
                  <span className={styles.journeyValue}>{selectedCountryPath.points.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default VDemBumpChart;
