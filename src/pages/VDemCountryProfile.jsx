import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { scaleLinear } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';
import { max, min, extent } from 'd3-array';
import { DEMOCRACY_INDICES } from '../data/vdemDemocracy.js';
import { useVdemData } from '../data/useVdemData.js';
import styles from './VDemCountryProfile.module.css';

const SPARK_W = 280;
const SPARK_H = 60;
const SPARK_MARGIN = { top: 8, right: 8, bottom: 8, left: 8 };

// Region colors
const REGION_COLORS = {
  'Europe': '#3498db',
  'Asia': '#e74c3c',
  'Africa': '#2ecc71',
  'Americas': '#f39c12',
  'Oceania': '#9b59b6',
  'Other': '#95a5a6'
};

function Sparkline({ data, color, indexKey, highlightYear }) {
  if (!data || data.length === 0) return <div className={styles.noData}>No data</div>;
  
  const years = data.map(d => d.year);
  const values = data.map(d => d.value);
  
  const xScale = scaleLinear()
    .domain(extent(years))
    .range([SPARK_MARGIN.left, SPARK_W - SPARK_MARGIN.right]);
  
  const yScale = scaleLinear()
    .domain([0, 1])
    .range([SPARK_H - SPARK_MARGIN.bottom, SPARK_MARGIN.top]);
  
  const lineGenerator = line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value))
    .curve(curveMonotoneX);
  
  const pathD = lineGenerator(data);
  const currentPoint = data.find(d => d.year === highlightYear);
  
  return (
    <svg width={SPARK_W} height={SPARK_H} className={styles.sparkline}>
      {/* Background */}
      <rect width={SPARK_W} height={SPARK_H} fill="transparent" />
      
      {/* Grid */}
      <line
        x1={SPARK_MARGIN.left}
        y1={yScale(0.5)}
        x2={SPARK_W - SPARK_MARGIN.right}
        y2={yScale(0.5)}
        stroke="#2a2a4a"
        strokeWidth={1}
        strokeDasharray="2,2"
      />
      
      {/* Area under line */}
      {pathD && (
        <motion.path
          d={`${pathD} L ${xScale(years[years.length - 1])},${SPARK_H - SPARK_MARGIN.bottom} L ${xScale(years[0])},${SPARK_H - SPARK_MARGIN.bottom} Z`}
          fill={color}
          fillOpacity={0.15}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}
      
      {/* Line */}
      {pathD && (
        <motion.path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      )}
      
      {/* Highlight year dot */}
      {currentPoint && (
        <circle
          cx={xScale(currentPoint.year)}
          cy={yScale(currentPoint.value)}
          r={4}
          fill={color}
          stroke="#fff"
          strokeWidth={2}
        />
      )}
      
      {/* Min/Max indicators */}
      {(() => {
        const minVal = min(values);
        const maxVal = max(values);
        const minPoint = data.find(d => d.value === minVal);
        const maxPoint = data.find(d => d.value === maxVal);
        
        return (
          <>
            {maxPoint && (
              <text
                x={xScale(maxPoint.year)}
                y={yScale(maxPoint.value) - 5}
                textAnchor="middle"
                fill={color}
                fontSize={9}
                fontWeight={600}
              >
                ↑{maxVal.toFixed(2)}
              </text>
            )}
            {minPoint && (
              <text
                x={xScale(minPoint.year)}
                y={yScale(minPoint.value) + 12}
                textAnchor="middle"
                fill="#7f8c8d"
                fontSize={9}
              >
                ↓{minVal.toFixed(2)}
              </text>
            )}
          </>
        );
      })()}
    </svg>
  );
}

function VDemCountryProfile() {
  const { data: VDEM_DATA, loading, error } = useVdemData();
  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const [year, setYear] = useState(2020);

  const VDEM_COUNTRIES = useMemo(() => {
    if (!VDEM_DATA) return [];
    const seen = new Map();
    VDEM_DATA.forEach(d => {
      if (!seen.has(d.country_id)) seen.set(d.country_id, { id: d.country_id, name: d.country_name, code: d.country_text_id, region: d.region });
    });
    return Array.from(seen.values());
  }, [VDEM_DATA]);

  // Get all countries with substantial data
  const countries = useMemo(() => {
    if (!VDEM_DATA) return [];
    const countsByCountry = {};
    VDEM_DATA.forEach(d => { countsByCountry[d.country_id] = (countsByCountry[d.country_id] || 0) + 1; });
    return VDEM_COUNTRIES
      .filter(c => (countsByCountry[c.id] || 0) > 50)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [VDEM_DATA, VDEM_COUNTRIES]);
  
  // Get selected country data
  const countryData = useMemo(() => {
    if (!selectedCountryId || !VDEM_DATA) return null;
    
    const country = countries.find(c => c.id === selectedCountryId);
    if (!country) return null;
    
    const data = VDEM_DATA.filter(d => d.country_id === selectedCountryId);
    
    // Calculate stats for each index
    const stats = {};
    DEMOCRACY_INDICES.forEach(idx => {
      const values = data
        .filter(d => d[idx.key] !== null)
        .map(d => ({ year: d.year, value: d[idx.key] }));
      
      if (values.length > 0) {
        const vals = values.map(v => v.value);
        stats[idx.key] = {
          values,
          current: values.find(v => v.year === year)?.value ?? null,
          best: { value: max(vals), year: values.find(v => v.value === max(vals))?.year },
          worst: { value: min(vals), year: values.find(v => v.value === min(vals))?.year },
          trend: values.length > 10 
            ? values[values.length - 1].value - values[Math.max(0, values.length - 11)].value
            : null,
          avg: vals.reduce((a, b) => a + b, 0) / vals.length
        };
      }
    });
    
    return {
      country,
      data,
      stats,
      firstYear: data[0]?.year,
      lastYear: data[data.length - 1]?.year,
      totalYears: data.length
    };
  }, [selectedCountryId, countries, year]);
  
  // Regional ranking
  const regionalRank = useMemo(() => {
    if (!countryData || !countryData.stats.v2x_polyarchy?.current || !VDEM_DATA) return null;
    
    const currentScore = countryData.stats.v2x_polyarchy.current;
    const region = countryData.country.region;
    
    const regionCountries = VDEM_DATA.filter(d => 
      d.year === year && 
      d.region === region && 
      d.v2x_polyarchy !== null
    );
    
    const ranked = regionCountries.sort((a, b) => b.v2x_polyarchy - a.v2x_polyarchy);
    const rank = ranked.findIndex(d => d.country_id === selectedCountryId) + 1;
    const total = ranked.length;
    
    return { rank, total, percentile: ((total - rank) / total * 100).toFixed(0) };
  }, [countryData, year, selectedCountryId]);
  
  // Global ranking
  const globalRank = useMemo(() => {
    if (!countryData || !countryData.stats.v2x_polyarchy?.current || !VDEM_DATA) return null;
    
    const allCountries = VDEM_DATA.filter(d => 
      d.year === year && d.v2x_polyarchy !== null
    );
    
    const ranked = allCountries.sort((a, b) => b.v2x_polyarchy - a.v2x_polyarchy);
    const rank = ranked.findIndex(d => d.country_id === selectedCountryId) + 1;
    const total = ranked.length;
    
    return { rank, total, percentile: ((total - rank) / total * 100).toFixed(0) };
  }, [countryData, year, selectedCountryId]);
  
  const toggleCountry = useCallback((id) => {
    setSelectedCountryId(prev => prev === id ? null : id);
  }, []);
  
  const getTrendArrow = (trend) => {
    if (trend === null) return '—';
    if (trend > 0.05) return '↑↑';
    if (trend > 0.01) return '↑';
    if (trend < -0.05) return '↓↓';
    if (trend < -0.01) return '↓';
    return '→';
  };
  
  const getTrendClass = (trend) => {
    if (trend === null) return '';
    if (trend > 0.01) return styles.trendUp;
    if (trend < -0.01) return styles.trendDown;
    return styles.trendStable;
  };

  if (loading) return <div className={styles.container}>Loading data...</div>;
  if (error) return <div className={styles.container}>Error loading data: {error}</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
        <h1 className={styles.title}>Country Democracy Profile</h1>
        <p className={styles.subtitle}>
          Deep-dive analysis of democracy indicators for any country — track all 6 V-Dem indices over time
        </p>
      </header>

      <main className={styles.main}>
        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label className={styles.label}>Select Country</label>
            <select
              value={selectedCountryId || ''}
              onChange={(e) => setSelectedCountryId(e.target.value ? parseInt(e.target.value) : null)}
              className={styles.select}
            >
              <option value="">Choose a country...</option>
              {countries.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {countryData && (
            <div className={styles.controlGroup}>
              <label className={styles.label}>Year</label>
              <input
                type="range"
                min={countryData.firstYear}
                max={countryData.lastYear}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className={styles.slider}
              />
              <span className={styles.yearDisplay}>{year}</span>
            </div>
          )}
        </div>

        {countryData ? (
          <div className={styles.profile}>
            {/* Country Header */}
            <div className={styles.countryHeader}>
              <div className={styles.countryInfo}>
                <div 
                  className={styles.countryFlag}
                  style={{ 
                    background: REGION_COLORS[countryData.country.region],
                    color: '#fff'
                  }}
                >
                  {countryData.country.code.slice(0, 2)}
                </div>
                <div className={styles.countryDetails}>
                  <h2 className={styles.countryName}>{countryData.country.name}</h2>
                  <span className={styles.countryRegion}>{countryData.country.region}</span>
                </div>
              </div>
              
              {/* Rankings */}
              <div className={styles.rankings}>
                {globalRank && (
                  <div className={styles.rankingCard}>
                    <span className={styles.rankingLabel}>Global Rank</span>
                    <span className={styles.rankingValue}>#{globalRank.rank}</span>
                    <span className={styles.rankingSub}>of {globalRank.total} ({globalRank.percentile}%)</span>
                  </div>
                )}
                {regionalRank && (
                  <div className={styles.rankingCard}>
                    <span className={styles.rankingLabel}>Regional Rank</span>
                    <span className={styles.rankingValue}>#{regionalRank.rank}</span>
                    <span className={styles.rankingSub}>of {regionalRank.total} in {countryData.country.region}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Indices Grid */}
            <div className={styles.indicesGrid}>
              {DEMOCRACY_INDICES.map(idx => {
                const stat = countryData.stats[idx.key];
                if (!stat) return null;
                
                const color = REGION_COLORS[countryData.country.region] || '#3498db';
                const isElectoral = idx.key === 'v2x_polyarchy';
                
                return (
                  <motion.div
                    key={idx.key}
                    className={`${styles.indexCard} ${isElectoral ? styles.highlighted : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={styles.indexHeader}>
                      <div>
                        <h3 className={styles.indexName}>{idx.name}</h3>
                        <p className={styles.indexDesc}>{idx.description}</p>
                      </div>
                      <div className={`${styles.currentValue} ${getTrendClass(stat.trend)}`}>
                        {stat.current?.toFixed(3) ?? 'N/A'}
                        {stat.trend !== null && (
                          <span className={styles.trendArrow}>{getTrendArrow(stat.trend)}</span>
                        )}
                      </div>
                    </div>
                    
                    <Sparkline 
                      data={stat.values} 
                      color={color} 
                      indexKey={idx.key}
                      highlightYear={year}
                    />
                    
                    <div className={styles.indexStats}>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Best</span>
                        <span className={styles.statValue}>{stat.best.value.toFixed(3)}</span>
                        <span className={styles.statYear}>({stat.best.year})</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Avg</span>
                        <span className={styles.statValue}>{stat.avg.toFixed(3)}</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Worst</span>
                        <span className={styles.statValue}>{stat.worst.value.toFixed(3)}</span>
                        <span className={styles.statYear}>({stat.worst.year})</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Quick Compare */}
            <div className={styles.quickCompare}>
              <h3 className={styles.compareTitle}>Compare with Similar Countries</h3>
              <div className={styles.compareList}>
                {countries
                  .filter(c => c.region === countryData.country.region && c.id !== selectedCountryId)
                  .slice(0, 5)
                  .map(c => {
                    const theirData = VDEM_DATA?.find(d => d.country_id === c.id && d.year === year);
                    const theirScore = theirData?.v2x_polyarchy ?? null;
                    const ourScore = countryData.stats.v2x_polyarchy?.current ?? 0;
                    
                    return (
                      <button
                        key={c.id}
                        className={styles.compareButton}
                        onClick={() => setSelectedCountryId(c.id)}
                      >
                        <span className={styles.compareColor} style={{ background: REGION_COLORS[c.region] }} />
                        <span className={styles.compareName}>{c.name}</span>
                        {theirScore !== null && (
                          <span className={`${styles.compareScore} ${theirScore > ourScore ? styles.higher : theirScore < ourScore ? styles.lower : ''}`}>
                            {theirScore.toFixed(3)}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🌍</div>
            <h3>Select a country to view its democracy profile</h3>
            <p>Explore all 6 V-Dem indices with historical trends and rankings</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default VDemCountryProfile;
