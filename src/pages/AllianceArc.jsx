import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import styles from './AllianceArc.module.css';

const MIN_SVG_W = 1400;
const SVG_H = 620;
const MARGIN = { top: 40, right: 80, bottom: 180, left: 80 };
const NODE_Y = SVG_H - MARGIN.bottom;
const NODE_R = 5;
const ARC_AREA_H = SVG_H - MARGIN.top - MARGIN.bottom - 20;

const REGION_ORDER = ['americas', 'europe', 'africa', 'middleeast', 'asia', 'other'];
const REGION_COLORS = {
  europe:     '#3498db',
  americas:   '#e74c3c',
  asia:       '#2ecc71',
  middleeast: '#f39c12',
  africa:     '#9b59b6',
  other:      '#7f8c8d',
};

const TYPE_CONFIG = {
  defense:      { stroke: '#e74c3c', width: 2.2, dash: null,  label: 'Mutual Defense' },
  entente:      { stroke: '#3498db', width: 1.0, dash: null,  label: 'Entente' },
  nonaggression:{ stroke: '#95a5a6', width: 0.8, dash: '4,3', label: 'Non-Aggression' },
  neutrality:   { stroke: '#7f8c8d', width: 0.8, dash: '2,3', label: 'Neutrality' },
};

const MILESTONES = [
  { year: 1816, label: '1816 — Start' },
  { year: 1856, label: '1856 — Congress of Paris' },
  { year: 1882, label: '1882 — Triple Alliance' },
  { year: 1914, label: '1914 — WWI' },
  { year: 1939, label: '1939 — WWII' },
  { year: 1945, label: '1945 — Post-WWII' },
  { year: 1949, label: '1949 — NATO Founded' },
  { year: 1955, label: '1955 — Warsaw Pact' },
  { year: 1991, label: '1991 — Cold War End' },
  { year: 2000, label: '2000 — Modern Era' },
  { year: 2022, label: '2022 — Ukraine War' },
];

function AllianceArc() {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [year, setYear]               = useState(1945);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);
  const [activeTypes, setActiveTypes] = useState(new Set(['defense', 'entente', 'nonaggression', 'neutrality']));
  const [activeRegions, setActiveRegions] = useState(new Set(Object.keys(REGION_COLORS)));
  const [hideInactive, setHideInactive] = useState(true);
  const svgRef = useRef(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/alliance-data.json')
      .then(r => r.json())
      .then(d => {
        // Expand compact node arrays into objects
        d.nodesExpanded = d.nodes.map(([id, name, region, regionLabel]) => ({
          id, name, region, regionLabel,
        }));
        // Build stable index map: node object → its index (avoids indexOf in render)
        d.nodeIdxMap = new Map(d.nodesExpanded.map((n, i) => [n, i]));
        setData(d);
        setLoading(false);
      });
  }, []);

  // ── Derived snapshot data ──────────────────────────────────────────────────
  const { nodes, links, nodeDegreeMap, regionalMeta } = useMemo(() => {
    if (!data) return { nodes: [], links: [], nodeDegreeMap: new Map(), regionalMeta: [] };

    const snapshot = data.snapshots[year];
    if (!snapshot || snapshot.length === 0) return { nodes: [], links: [], nodeDegreeMap: new Map(), regionalMeta: [] };

    const typeLabels = data.typeLabels;
    const rawLinks = snapshot
      .map(([s, t, ti]) => ({
        source: s, target: t, type: typeLabels[ti],
      }))
      .filter(l => activeTypes.has(l.type));

    // Country-centric filtering
    let filteredLinks = rawLinks;
    let partnerSet = new Set();
    
    if (selectedCountry !== null) {
      filteredLinks = rawLinks.filter(l => 
        l.source === selectedCountry || l.target === selectedCountry
      );
      
      filteredLinks.forEach(l => {
        if (l.source === selectedCountry) partnerSet.add(l.target);
        if (l.target === selectedCountry) partnerSet.add(l.source);
      });
    }

    // Calculate degrees for sorting and filtering
    const degreeMap = new Map();
    filteredLinks.forEach(l => {
      degreeMap.set(l.source, (degreeMap.get(l.source) || 0) + 1);
      degreeMap.set(l.target, (degreeMap.get(l.target) || 0) + 1);
    });

    const activeNodeIdxSet = new Set(filteredLinks.flatMap(l => [l.source, l.target]));
    
    let activeNodes;
    if (selectedCountry !== null) {
      const selectedNode = data.nodesExpanded[selectedCountry];
      const partnerNodes = Array.from(partnerSet).map(idx => data.nodesExpanded[idx]).filter(Boolean);
      activeNodes = [selectedNode, ...partnerNodes].filter(Boolean);
    } else {
      activeNodes = data.nodesExpanded
        .filter((n, i) => {
          const hasRegion = activeRegions.has(n.region);
          if (!hasRegion) return false;
          if (hideInactive) return activeNodeIdxSet.has(i);
          return true;
        });
    }

    const sortedNodes = activeNodes
      .sort((a, b) => {
        const ra = REGION_ORDER.indexOf(a.region);
        const rb = REGION_ORDER.indexOf(b.region);
        if (ra !== rb) return ra - rb;
        const da = degreeMap.get(data.nodeIdxMap.get(a)) || 0;
        const db = degreeMap.get(data.nodeIdxMap.get(b)) || 0;
        return db - da;
      });

    const regionFilteredIdx = new Set(sortedNodes.map(n => data.nodeIdxMap.get(n)));
    const finalLinks = filteredLinks.filter(
      l => regionFilteredIdx.has(l.source) && regionFilteredIdx.has(l.target)
    );

    return { nodes: sortedNodes, links: finalLinks, nodeDegreeMap: degreeMap, regionalMeta: [] };
  }, [data, year, activeTypes, activeRegions, hideInactive, selectedCountry]);

  // ── X scale: position nodes with regional gaps and dynamic width ──────────
  const { nodeXMap, regionalHeaders, svgWidth } = useMemo(() => {
    if (!data || nodes.length === 0) return { nodeXMap: {}, regionalHeaders: [], svgWidth: MIN_SVG_W };
    
    const xMap = {};
    const headers = [];
    
    if (selectedCountry !== null) {
      const selectedNode = data.nodesExpanded[selectedCountry];
      const partners = nodes.filter(n => data.nodeIdxMap.get(n) !== selectedCountry);
      
      const selectedIdx = data.nodeIdxMap.get(selectedNode);
      xMap[selectedIdx] = MARGIN.left + 60;
      
      const byRegion = {};
      partners.forEach(n => {
        if (!byRegion[n.region]) byRegion[n.region] = [];
        byRegion[n.region].push(n);
      });

      const activeRegionsList = REGION_ORDER.filter(r => byRegion[r] && byRegion[r].length > 0);
      const gapWidth = 60;
      const nodeSpacing = 35;
      
      let currentX = MARGIN.left + 140;
      activeRegionsList.forEach((reg) => {
        const regNodes = byRegion[reg];
        
        headers.push({
          label: reg.toUpperCase(),
          x: currentX + (regNodes.length * nodeSpacing) / 2,
          color: REGION_COLORS[reg]
        });
        
        regNodes.forEach((n) => {
          xMap[data.nodeIdxMap.get(n)] = currentX;
          currentX += nodeSpacing;
        });
        
        currentX += gapWidth;
      });
      
      const calculatedWidth = Math.max(MIN_SVG_W, currentX + MARGIN.right);
      return { nodeXMap: xMap, regionalHeaders: headers, svgWidth: calculatedWidth };
    }
    
    const byRegion = {};
    nodes.forEach(n => {
      if (!byRegion[n.region]) byRegion[n.region] = [];
      byRegion[n.region].push(n);
    });

    const activeRegionsList = REGION_ORDER.filter(r => byRegion[r] && byRegion[r].length > 0);
    const gapWidth = 80;
    const totalGaps = (activeRegionsList.length - 1) * gapWidth;
    const calculatedWidth = Math.max(MIN_SVG_W, nodes.length * 28 + (REGION_ORDER.length * 80));
    const currentW = calculatedWidth - MARGIN.left - MARGIN.right;
    const availableW = currentW - totalGaps;
    
    let currentX = MARGIN.left;
    activeRegionsList.forEach((reg, ri) => {
      const regNodes = byRegion[reg];
      const regW = (regNodes.length / nodes.length) * availableW;
      
      regNodes.forEach((n, ni) => {
        const xOffset = regNodes.length > 1 ? (ni / (regNodes.length - 1)) * regW : regW / 2;
        xMap[data.nodeIdxMap.get(n)] = currentX + xOffset;
      });
      
      headers.push({
        label: reg.toUpperCase(),
        x: currentX + regW / 2,
        color: REGION_COLORS[reg]
      });
      
      currentX += regW + gapWidth;
    });

    return { nodeXMap: xMap, regionalHeaders: headers, svgWidth: calculatedWidth };
  }, [nodes, data, selectedCountry]);

  // ── Arc path builder ────────────────────────────────────────────────────────
  function arcPath(srcIdx, tgtIdx) {
    const x1 = nodeXMap[srcIdx] ?? 0;
    const x2 = nodeXMap[tgtIdx] ?? 0;
    const cx = (x1 + x2) / 2;
    const dist = Math.abs(x2 - x1);
    // Adjust arc height to the wider layout
    const arcH = Math.min(dist * 0.45, ARC_AREA_H + 40);
    const cy = NODE_Y - arcH;
    return `M ${x1} ${NODE_Y} Q ${cx} ${cy} ${x2} ${NODE_Y}`;
  }

  // ── Hover highlight sets ────────────────────────────────────────────────────
  const highlightedNodeIdxs = useMemo(() => {
    if (hoveredNode === null) return null;
    const set = new Set([hoveredNode]);
    links.forEach(l => {
      if (l.source === hoveredNode) set.add(l.target);
      if (l.target === hoveredNode) set.add(l.source);
    });
    return set;
  }, [hoveredNode, links]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const defensePacts = links.filter(l => l.type === 'defense').length;

  // ── Toggle helpers ─────────────────────────────────────────────────────────
  const toggleType = useCallback((t) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }, []);

  const toggleRegion = useCallback((r) => {
    setActiveRegions(prev => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  }, []);

  // ── Country Selector Component ───────────────────────────────────────────────
  function CountrySelector({ countries, onSelect }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    const filteredCountries = useMemo(() => {
      if (!searchQuery) return countries;
      const query = searchQuery.toLowerCase();
      return countries.filter(c => 
        c.name.toLowerCase().includes(query)
      );
    }, [countries, searchQuery]);

    const handleSearchChange = useCallback((e) => {
      setSearchQuery(e.target.value);
      setHighlightedIndex(-1);
    }, []);

    const handleSelect = useCallback((country) => {
      onSelect(country);
      setSearchQuery(country.name);
      setShowDropdown(false);
    }, [onSelect]);

    const handleKeyDown = useCallback((e) => {
      if (!showDropdown) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredCountries.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredCountries[highlightedIndex]) {
            handleSelect(filteredCountries[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowDropdown(false);
          break;
      }
    }, [showDropdown, filteredCountries, highlightedIndex, handleSelect]);

    const handleClickOutside = useCallback((e) => {
      if (inputRef.current && !inputRef.current.contains(e.target) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }, []);

    useEffect(() => {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);

    return (
      <div className={styles.countrySelector}>
        <input
          ref={inputRef}
          type="text"
          className={styles.countrySearchInput}
          placeholder="Search country..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
        />
        {showDropdown && (
          <div ref={dropdownRef} className={styles.countryDropdown}>
            {filteredCountries.length === 0 ? (
              <div className={styles.dropdownItem}>No results</div>
            ) : (
              filteredCountries.map((country, i) => (
                <div
                  key={country.id}
                  className={`${styles.dropdownItem} ${i === highlightedIndex ? styles.dropdownItemHighlighted : ''}`}
                  onClick={() => handleSelect(country)}
                >
                  {country.name}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) return (
    <div className={styles.page}>
      <nav className={styles.nav}><Link to="/" className={styles.backLink}>← Back to Dashboard</Link></nav>
      <div className={styles.loading}>Loading alliance data…</div>
    </div>
  );

  const yearMin = data.years[0];
  const yearMax = data.years[data.years.length - 1];

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Alliance Network Evolution</h1>
          <CountrySelector 
            countries={data?.nodesExpanded || []}
            onSelect={(country) => setSelectedCountry(data.nodeIdxMap.get(country))}
          />
        </div>
        <p className={styles.subtitle}>
          Global alliance agreements {yearMin}–{yearMax} from the Correlates of War dataset.
          Each node is a nation; arcs show mutual commitments — <strong>thickness</strong> and <strong>colour</strong> encode alliance type.
          Hover a node to isolate its network. Use the slider to travel through history.
        </p>
      </header>

      <main className={styles.main}>
        {/* Year controls */}
        <div className={styles.yearRow}>
          <span className={styles.yearDisplay}>{year}</span>
          <input
            type="range"
            className={styles.scrubber}
            min={yearMin} max={yearMax} step={1}
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
          />
          <div className={styles.stats}>
            <span className={styles.statChip}>{links.length} alliances</span>
            <span className={styles.statChip}>{defensePacts} defense pacts</span>
            <span className={styles.statChip}>{nodes.length} nations</span>
          </div>
        </div>

        {/* Milestone presets */}
        <div className={styles.milestones}>
          {MILESTONES.map(m => (
            <button
              key={m.year}
              className={`${styles.milestoneBtn} ${year === m.year ? styles.milestoneBtnActive : ''}`}
              onClick={() => setYear(m.year)}
            >{m.label}</button>
          ))}
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}>
          {selectedCountry === null && (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>Select a country to view its alliances</p>
            </div>
          )}
          {selectedCountry !== null && nodes.length === 1 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>
                {data.nodesExpanded[selectedCountry]?.name} has no alliances in {year}. Try a different year.
              </p>
            </div>
          )}
          <svg
            ref={svgRef}
            width={svgWidth}
            height={SVG_H}
            viewBox={`0 0 ${svgWidth} ${SVG_H}`}
            className={styles.svg}
            onMouseLeave={() => { setHoveredNode(null); setHoveredLink(null); }}
          >
            {/* Arcs */}
            <g>
              {links.map((link, i) => {
                const cfg = TYPE_CONFIG[link.type] || TYPE_CONFIG.entente;
                const isHov = hoveredLink === i;
                const dimmed = highlightedNodeIdxs !== null &&
                  !highlightedNodeIdxs.has(link.source) && !highlightedNodeIdxs.has(link.target);
                return (
                  <path
                    key={i}
                    d={arcPath(link.source, link.target)}
                    fill="none"
                    stroke={cfg.stroke}
                    strokeWidth={isHov ? cfg.width + 1.2 : cfg.width}
                    strokeDasharray={cfg.dash ?? undefined}
                    strokeOpacity={dimmed ? 0.02 : isHov ? 0.95 : 0.3}
                    style={{ cursor: 'pointer', transition: 'stroke-opacity 0.15s' }}
                    onMouseEnter={() => setHoveredLink(i)}
                    onMouseLeave={() => setHoveredLink(null)}
                  />
                );
              })}
            </g>

            {/* Regional Headers */}
            {regionalHeaders.map(h => (
              <text
                key={h.label}
                x={h.x} y={NODE_Y + 160}
                textAnchor="middle"
                fontSize={13}
                fontWeight={900}
                fill={h.color}
                opacity={0.3}
                letterSpacing={6}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >{h.label}</text>
            ))}

            {/* Nodes */}
            {nodes.map(node => {
              const idx = data.nodeIdxMap.get(node);
              const x = nodeXMap[idx];
              if (x === undefined) return null;
              const color = REGION_COLORS[node.region] || '#7f8c8d';
              const isHov = hoveredNode === idx;
              const isSelected = selectedCountry === idx;
              const dimmed = highlightedNodeIdxs !== null && !highlightedNodeIdxs.has(idx);
              const degree = nodeDegreeMap.get(idx) || 0;
              
              let r;
              if (isSelected) {
                r = NODE_R + Math.min(degree / 3, 8);
              } else if (isHov) {
                r = NODE_R + 3;
              } else {
                r = NODE_R + Math.min(degree / 5, 4);
              }
              
              const strokeColor = isSelected || isHov ? '#ffffff' : color;
              const strokeWidth = isSelected ? 2 : isHov ? 2 : 0.5;
              
              // Show labels for all nodes
              const showLabel = true;

              return (
                <g
                  key={idx}
                  transform={`translate(${x}, ${NODE_Y})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredNode(idx)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {isSelected && (
                    <circle
                      r={r + 6}
                      fill={color}
                      fillOpacity={0.15}
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  <circle
                    r={r}
                    fill={color}
                    fillOpacity={dimmed ? 0.1 : isHov ? 1 : isSelected ? 1 : 0.8}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    style={{ transition: 'all 0.15s' }}
                  />
                  {degree >= 5 && (
                    <text
                      y={-r - 6}
                      textAnchor="middle"
                      fontSize={degree >= 15 ? 10 : 8}
                      fontWeight={degree >= 15 ? 700 : 400}
                      fill={color}
                      opacity={dimmed ? 0.15 : 0.8}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >{degree}</text>
                  )}
                  {/* Rotated Country label */}
                  {showLabel && (
                    <g transform={`translate(0, ${r + 10}) rotate(45)`}>
                      <text
                        textAnchor="start"
                        fontSize={isHov ? 11 : Math.max(8.5, Math.min(degree * 0.4 + 7, 12))}
                        fontWeight={isHov || degree >= 15 ? 700 : 400}
                        fill={isHov ? '#ffffff' : dimmed ? '#3a3a5a' : '#aaaacc'}
                        opacity={dimmed && !isHov ? 0.2 : 1}
                        style={{ userSelect: 'none', pointerEvents: 'none', transition: 'all 0.15s' }}
                      >{node.name}</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Hovered link label */}
            {hoveredLink !== null && links[hoveredLink] && (() => {
              const link = links[hoveredLink];
              const x1 = nodeXMap[link.source] ?? 0;
              const x2 = nodeXMap[link.target] ?? 0;
              const cx = (x1 + x2) / 2;
              const dist = Math.abs(x2 - x1);
              const arcH = Math.min(dist * 0.5, ARC_AREA_H);
              const labelY = NODE_Y - arcH - 8;
              const n1 = data.nodesExpanded[link.source]?.name ?? '';
              const n2 = data.nodesExpanded[link.target]?.name ?? '';
              const cfg = TYPE_CONFIG[link.type] || TYPE_CONFIG.entente;
              return (
                <text
                  x={cx} y={labelY}
                  textAnchor="middle"
                  fontSize={9}
                  fill={cfg.stroke}
                  opacity={0.9}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >{n1} ↔ {n2} ({cfg.label})</text>
              );
            })()}

            {/* Hovered node tooltip */}
            {hoveredNode !== null && (() => {
              const node = data.nodesExpanded[hoveredNode];
              const x = nodeXMap[hoveredNode];
              if (!node || x === undefined) return null;
              const degree = links.filter(l => l.source === hoveredNode || l.target === hoveredNode).length;
              const isSelected = selectedCountry === hoveredNode;
              const labelX = Math.max(80, Math.min(x, svgWidth - 80));
              return (
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={labelX - 78} y={NODE_Y - 72}
                    width={156} height={60}
                    rx={5}
                    fill="#1e1e2e" fillOpacity={0.96}
                    stroke="#3a3a5a" strokeWidth={1}
                  />
                  <text x={labelX} y={NODE_Y - 52} textAnchor="middle" fontSize={11} fontWeight={700} fill="#ffffff">{isSelected ? `Selected: ${node.name}` : node.name}</text>
                  <text x={labelX} y={NODE_Y - 36} textAnchor="middle" fontSize={9} fill={REGION_COLORS[node.region]}>{node.regionLabel}</text>
                  <text x={labelX} y={NODE_Y - 20} textAnchor="middle" fontSize={9} fill="#aaaacc">{degree} alliance{degree !== 1 ? 's' : ''} in {year}</text>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Filters row */}
        <div className={styles.filtersRow}>
          {/* Active status filter */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Show:</span>
            <button
              className={`${styles.filterBtn} ${hideInactive ? styles.filterBtnActive : ''}`}
              onClick={() => setHideInactive(!hideInactive)}
            >
              <span className={styles.filterDot} style={{ background: hideInactive ? '#2471a3' : '#3a3a5a' }} />
              Active Nations Only
            </button>
          </div>

          {/* Alliance type filters */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Type:</span>
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
              <button
                key={type}
                className={`${styles.filterBtn} ${activeTypes.has(type) ? styles.filterBtnActive : ''}`}
                style={{ borderColor: activeTypes.has(type) ? cfg.stroke : '#3a3a5a', color: activeTypes.has(type) ? cfg.stroke : '#5a5a8a' }}
                onClick={() => toggleType(type)}
              >
                <span className={styles.filterLine} style={{ background: cfg.stroke }} />
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Region filters */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Region:</span>
            {Object.entries(REGION_COLORS).map(([region, color]) => (
              <button
                key={region}
                className={`${styles.filterBtn} ${activeRegions.has(region) ? styles.filterBtnActive : ''}`}
                style={{ borderColor: activeRegions.has(region) ? color : '#3a3a5a', color: activeRegions.has(region) ? color : '#5a5a8a' }}
                onClick={() => toggleRegion(region)}
              >
                <span className={styles.filterDot} style={{ background: color }} />
                {region.charAt(0).toUpperCase() + region.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>
            Source: Correlates of War (CoW) Formal Alliances Dataset v4.1 — Gibler, D.M. (2009).
            International Military Alliances, 1648–2008.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default AllianceArc;
