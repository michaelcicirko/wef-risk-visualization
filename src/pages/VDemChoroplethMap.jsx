import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { select } from 'd3-selection';
import { scaleSequential } from 'd3-scale';
import { interpolateRdBu } from 'd3-scale-chromatic';
import { DEMOCRACY_INDICES } from '../data/vdemDemocracy.js';
import { useVdemData } from '../data/useVdemData.js';
import styles from './VDemChoroplethMap.module.css';

// Memoized country path component to prevent unnecessary re-renders
const CountryPath = memo(function CountryPath({ feature, path, fillColor, onMouseMove, onMouseLeave }) {
  const pathD = useMemo(() => path(feature), [path, feature]);
  return (
    <path
      d={pathD}
      fill={fillColor}
      stroke="#1a1a2e"
      strokeWidth={0.5}
      className={styles.country}
      onMouseMove={(e) => onMouseMove(e, feature)}
      onMouseLeave={onMouseLeave}
    />
  );
});

// Map V-Dem country codes to ISO numeric codes for world-atlas
// This is a partial mapping - key countries
const CODE_MAPPING = {
  'USA': 840, 'GBR': 826, 'DEU': 276, 'FRA': 250, 'JPN': 392, 'CHN': 156,
  'IND': 356, 'BRA': 76, 'RUS': 643, 'CAN': 124, 'AUS': 36, 'ITA': 380,
  'ESP': 724, 'MEX': 484, 'KOR': 410, 'IDN': 360, 'TUR': 792, 'SAU': 682,
  'ARG': 32, 'ZAF': 710, 'EGY': 818, 'NGA': 566, 'PAK': 586, 'BGD': 50,
  'VNM': 704, 'PHL': 608, 'ETH': 231, 'IRN': 364, 'THA': 764, 'MYS': 458,
  'POL': 616, 'UKR': 804, 'NLD': 528, 'BEL': 56, 'SWE': 752, 'CZE': 203,
  'GRC': 300, 'PRT': 620, 'HUN': 348, 'ISR': 376, 'AUT': 40, 'CHE': 756,
  'SGP': 702, 'DNK': 208, 'FIN': 246, 'NOR': 578, 'IRL': 372, 'NZL': 554,
  'CHL': 152, 'ROU': 642, 'COL': 170, 'PER': 604, 'VEN': 862, 'MAR': 504,
  'DZA': 12, 'KAZ': 398, 'QAT': 634, 'KWT': 414, 'LKA': 144, 'DOM': 214,
  'GTM': 320, 'ECU': 218, 'BOL': 68, 'PRY': 600, 'HND': 340, 'NIC': 558,
  'CRI': 188, 'PAN': 591, 'URY': 858, 'JAM': 388, 'TTO': 780, 'GUY': 328,
  'SUR': 740, 'BLZ': 84, 'BRB': 52, 'LCA': 662, 'GRD': 308, 'VCT': 670,
  'ATG': 28, 'DMA': 212, 'KNA': 659, 'LIE': 438, 'MCO': 492, 'LUX': 442,
  'MLT': 470, 'ISL': 352, 'AND': 20, 'SMR': 674, 'ALB': 8, 'BIH': 70,
  'SRB': 688, 'MNE': 499, 'MKD': 807, 'SVN': 705, 'HRV': 191, 'BGR': 100,
  'ROU': 642, 'EST': 233, 'LVA': 428, 'LTU': 440, 'MDA': 498, 'BLR': 112,
  'UKR': 804, 'RUS': 643, 'GEO': 268, 'ARM': 51, 'AZE': 31, 'TUR': 792,
  'CYP': 196, 'SYR': 760, 'LBN': 422, 'JOR': 400, 'IRQ': 368, 'IRN': 364,
  'AFG': 4, 'PAK': 586, 'IND': 356, 'NPL': 524, 'BTN': 64, 'BGD': 50,
  'LKA': 144, 'MDV': 462, 'MMR': 104, 'THA': 764, 'LAO': 418, 'VNM': 704,
  'KHM': 116, 'MYS': 458, 'SGP': 702, 'IDN': 360, 'BRN': 96, 'PHL': 608,
  'TLS': 626, 'PNG': 598, 'AUS': 36, 'NZL': 554, 'FJI': 242, 'SLB': 90,
  'VUT': 548, 'NCL': 540, 'PYF': 258, 'WSM': 882, 'TON': 776, 'KIR': 296,
  'TUV': 798, 'NRU': 520, 'PLW': 585, 'FSM': 583, 'MHL': 584, 'GUM': 316,
  'MNP': 580, 'ASM': 16, 'COK': 184, 'NIU': 570, 'TKL': 772, 'WLF': 876,
  'ASM': 16, 'TCD': 148, 'CAF': 140, 'GNQ': 226, 'GAB': 266, 'COG': 178,
  'COD': 180, 'UGA': 800, 'KEN': 404, 'RWA': 646, 'BDI': 108, 'TZA': 834,
  'MWI': 454, 'MOZ': 508, 'ZMB': 894, 'ZWE': 716, 'BWA': 72, 'NAM': 516,
  'ZAF': 710, 'LSO': 426, 'SWZ': 748, 'MDG': 450, 'MUS': 480, 'SYC': 690,
  'COM': 174, 'MYT': 175, 'REU': 638, 'SOM': 706, 'DJI': 262, 'ERI': 232,
  'SDN': 729, 'SSD': 728, 'MLI': 466, 'BFA': 854, 'NER': 562, 'GIN': 324,
  'SLE': 694, 'LBR': 430, 'CIV': 384, 'GHA': 288, 'TGO': 768, 'BEN': 204,
  'NGA': 566, 'CMR': 120, 'GNB': 624, 'SEN': 686, 'GMB': 270, 'MRT': 478,
  'ESH': 732, 'MAR': 504, 'TUN': 788, 'DZA': 12, 'LBY': 434, 'EGY': 818,
  'YEM': 887, 'OMN': 512, 'ARE': 784, 'QAT': 634, 'BHR': 48, 'KWT': 414,
  'SAU': 682, 'JOR': 400, 'ISR': 376, 'PSE': 275, 'LBN': 422, 'SYR': 760,
};

// Build reverse lookup: ISO numeric -> V-Dem country code
const ISO_TO_VDEM = {};
Object.entries(CODE_MAPPING).forEach(([vdemCode, isoCode]) => {
  ISO_TO_VDEM[isoCode] = vdemCode;
});

// Color scale: 0 (autocracy) -> 1 (full democracy)
const getColorScale = () => scaleSequential(interpolateRdBu).domain([0, 1]);

const YEAR_START = 1789;
const YEAR_END = 2025;

function VDemChoroplethMap() {
  const { data: VDEM_DATA, loading: vdemLoading, error: vdemError } = useVdemData();
  const svgRef = useRef(null);
  const [worldData, setWorldData] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(null);
  const [year, setYear] = useState(1950); // Start at mid-point for demo
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState('v2x_libdem');
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const playRef = useRef(null);

  const VDEM_COUNTRIES = useMemo(() => {
    if (!VDEM_DATA) return [];
    const seen = new Map();
    VDEM_DATA.forEach(d => {
      if (!seen.has(d.country_id)) seen.set(d.country_id, { id: d.country_id, name: d.country_name, code: d.country_text_id, region: d.region });
    });
    return Array.from(seen.values());
  }, [VDEM_DATA]);

  // Fetch world TopoJSON
  useEffect(() => {
    setMapLoading(true);
    setMapError(null);
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load map data');
        return res.json();
      })
      .then(topo => {
        const countries = feature(topo, topo.objects.countries);
        setWorldData(countries);
        setMapLoading(false);
      })
      .catch(err => {
        console.error('Map fetch error:', err);
        setMapError('Failed to load world map. Please refresh.');
        setMapLoading(false);
      });
  }, []);

  // Get data for current year
  const yearData = useMemo(() => {
    if (!VDEM_DATA) return [];
    return VDEM_DATA.filter(d => d.year === year);
  }, [VDEM_DATA, year]);

  // Build lookup: country code -> score
  const scoreMap = useMemo(() => {
    const map = {};
    yearData.forEach(d => {
      if (d[selectedIndex] !== null) {
        map[d.country_text_id] = d[selectedIndex];
      }
    });
    return map;
  }, [yearData, selectedIndex]);

  // Get country info for a feature
  const getCountryInfo = useCallback((isoCode) => {
    const vdemCode = ISO_TO_VDEM[isoCode];
    if (!vdemCode) return null;
    return VDEM_COUNTRIES.find(c => c.code === vdemCode);
  }, [VDEM_COUNTRIES]);

  // Color scale
  const colorScale = useMemo(() => getColorScale(), []);

  // Get fill color for a country
  const getFillColor = useCallback((feature) => {
    const isoCode = feature.id;
    const vdemCode = ISO_TO_VDEM[isoCode];
    if (!vdemCode) return '#2a2a3a'; // No data color
    const score = scoreMap[vdemCode];
    if (score === undefined || score === null) return '#2a2a3a';
    return colorScale(score);
  }, [scoreMap, colorScale]);

  // Play animation
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setYear(prev => {
          if (prev >= YEAR_END) {
            setIsPlaying(false);
            return YEAR_END;
          }
          return prev + 1;
        });
      }, 100);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [isPlaying]);

  // Handle country hover
  const handleMouseMove = useCallback((e, feature) => {
    const info = getCountryInfo(feature.id);
    if (info) {
      setHoveredCountry({
        ...info,
        score: scoreMap[info.code],
        feature
      });
      setTooltipPos({ x: e.clientX + 15, y: e.clientY - 10 });
    }
  }, [getCountryInfo, scoreMap]);

  const handleMouseLeave = useCallback(() => {
    setHoveredCountry(null);
  }, []);

  // SVG dimensions
  const [svgSize, setSvgSize] = useState({ width: 900, height: 450 });

  useEffect(() => {
    if (!svgRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setSvgSize({ width, height: width * 0.5 });
        }
      }
    });
    observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, []);

  // Projection
  const projection = useMemo(() => {
    return geoNaturalEarth1()
      .fitSize([svgSize.width, svgSize.height], { type: 'Sphere' });
  }, [svgSize]);

  const path = useMemo(() => geoPath().projection(projection), [projection]);

  const selectedIndexInfo = DEMOCRACY_INDICES.find(d => d.key === selectedIndex);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
        <h1 className={styles.title}>Global Democracy Over Time</h1>
        <p className={styles.subtitle}>
          {selectedIndexInfo?.name} • {YEAR_START}–{YEAR_END}
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
              min={YEAR_START}
              max={YEAR_END}
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
        </div>

        <div className={styles.mapContainer} ref={svgRef}>
          {(vdemLoading || mapLoading) && (
            <div className={styles.loading}>Loading...</div>
          )}
          {(vdemError || mapError) && (
            <div className={styles.error}>{vdemError || mapError}</div>
          )}
          {worldData && (
            <svg
              width={svgSize.width}
              height={svgSize.height}
              className={styles.svg}
            >
              <rect
                width={svgSize.width}
                height={svgSize.height}
                fill="#0d0d1a"
              />
              <g>
                {worldData.features.map((feature, i) => (
                  <CountryPath
                    key={feature.id || i}
                    feature={feature}
                    path={path}
                    fillColor={getFillColor(feature)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  />
                ))}
              </g>
            </svg>
          )}

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendTitle}>Democracy Score</div>
            <div className={styles.legendGradient}>
              <span>0.0</span>
              <div className={styles.gradientBar} />
              <span>1.0</span>
            </div>
            <div className={styles.legendLabels}>
              <span>Autocracy</span>
              <span>Full Democracy</span>
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {hoveredCountry && (
          <motion.div
            className={styles.tooltip}
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.tooltipName}>{hoveredCountry.name}</div>
            <div className={styles.tooltipScore}>
              Score: {hoveredCountry.score !== undefined && hoveredCountry.score !== null
                ? hoveredCountry.score.toFixed(3)
                : 'No data'}
            </div>
            <div className={styles.tooltipRegion}>{hoveredCountry.region}</div>
          </motion.div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Source: V-Dem Institute v16 • Varieties of Democracy Project</p>
      </footer>
    </div>
  );
}

export default VDemChoroplethMap;
