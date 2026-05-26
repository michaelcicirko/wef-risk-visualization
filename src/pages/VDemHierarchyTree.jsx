import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { GraphCanvas } from 'reagraph';
import { DEMOCRACY_INDICES } from '../data/vdemDemocracy.js';
import { useVdemData } from '../data/useVdemData.js';
import styles from './VDemHierarchyTree.module.css';

// Region colors for consistent theming
const REGION_COLORS = {
  'Europe': '#3498db',
  'Asia': '#e74c3c',
  'Africa': '#2ecc71',
  'Americas': '#f39c12',
  'Oceania': '#9b59b6',
  'Other': '#95a5a6'
};

// Index colors for hierarchy levels
const INDEX_COLORS = {
  'liberal': '#8e44ad',      // Root - Liberal Democracy
  'participatory': '#2980b9', // Level 1 - Participatory
  'deliberative': '#27ae60',  // Level 1 - Deliberative  
  'egalitarian': '#d35400',   // Level 1 - Egalitarian
};

function VDemHierarchyTree() {
  const { data: VDEM_DATA, loading, error } = useVdemData();
  const [year, setYear] = useState(2020);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeIndices, setActiveIndices] = useState(['v2x_partip', 'v2xdl_delib', 'v2x_egal']);
  const graphRef = useRef(null);
  const playRef = useRef(null);

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

  // Build hierarchical graph data
  const graphData = useMemo(() => {
    if (!VDEM_DATA) return { nodes: [], edges: [] };
    const nodes = [];
    const edges = [];
    
    // ROOT: Liberal Democracy
    nodes.push({
      id: 'liberal-democracy',
      label: 'Liberal Democracy',
      color: INDEX_COLORS.liberal,
      size: 40,
      level: 0,
      data: { type: 'root', index: 'v2x_libdem' }
    });
    
    // LEVEL 1: Three sub-components (if active)
    const subIndices = [
      { key: 'v2x_partip', label: 'Participatory', color: INDEX_COLORS.participatory },
      { key: 'v2xdl_delib', label: 'Deliberative', color: INDEX_COLORS.deliberative },
      { key: 'v2x_egal', label: 'Egalitarian', color: INDEX_COLORS.egalitarian }
    ].filter(idx => activeIndices.includes(idx.key));
    
    subIndices.forEach((idx, i) => {
      const nodeId = `sub-${idx.key}`;
      nodes.push({
        id: nodeId,
        label: idx.label,
        color: idx.color,
        size: 25,
        level: 1,
        data: { type: 'sub-index', index: idx.key }
      });
      
      // Connect to root
      edges.push({
        id: `edge-root-${idx.key}`,
        source: 'liberal-democracy',
        target: nodeId,
        color: idx.color,
        width: 3
      });
    });
    
    // LEVEL 2 & 3: Regional clusters and countries
    const regions = [...new Set(VDEM_COUNTRIES.map(c => c.region))];
    
    regions.forEach(region => {
      const regionId = `region-${region}`;
      const regionColor = REGION_COLORS[region] || '#95a5a6';
      
      // Add region cluster node (Level 2)
      nodes.push({
        id: regionId,
        label: region,
        color: regionColor,
        size: 15,
        level: 2,
        data: { type: 'region', region }
      });
      
      // Connect region to all active sub-indices
      subIndices.forEach(idx => {
        edges.push({
          id: `edge-${idx.key}-${region}`,
          source: `sub-${idx.key}`,
          target: regionId,
          color: regionColor,
          width: 1,
          opacity: 0.3
        });
      });
      
      // Add countries in this region (Level 3)
      const regionCountries = VDEM_COUNTRIES.filter(c => c.region === region);
      
      regionCountries.forEach(country => {
        const countryId = `country-${country.id}`;
        const yearData = VDEM_DATA.find(d => d.year === year && d.country_id === country.id);
        const score = yearData?.v2x_libdem ?? null;
        
        // Size based on democracy score
        const size = score ? Math.max(3, score * 15) : 5;
        
        nodes.push({
          id: countryId,
          label: country.name,
          color: regionColor,
          size,
          level: 3,
          data: { 
            type: 'country', 
            countryId: country.id,
            region,
            score,
            year
          }
        });
        
        // Connect country to region
        edges.push({
          id: `edge-${region}-${country.id}`,
          source: regionId,
          target: countryId,
          color: regionColor,
          width: 0.5,
          opacity: 0.2
        });
      });
    });
    
    return { nodes, edges };
  }, [VDEM_DATA, year, activeIndices]);

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

  // Camera spiral animation
  const animateCamera = useCallback(() => {
    if (!graphRef.current) return;
    
    // Spiral down through the tree
    const duration = 10000; // 10 seconds
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Spiral path: rotate around Y while descending
      const angle = progress * Math.PI * 4; // 2 full rotations
      const radius = 800 * (1 - progress * 0.5); // Spiral inward
      const y = 600 * (1 - progress); // Descend from top to center
      
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      
      graphRef.current?.camera?.setPosition?.({ x, y, z });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, []);

  // Toggle sub-index visibility
  const toggleIndex = (indexKey) => {
    setActiveIndices(prev => 
      prev.includes(indexKey)
        ? prev.filter(k => k !== indexKey)
        : [...prev, indexKey]
    );
  };

  if (loading) return <div className={styles.container}>Loading data...</div>;
  if (error) return <div className={styles.container}>Error loading data: {error}</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
        <h1 className={styles.title}>3D Democratic Hierarchy Tree</h1>
        <p className={styles.subtitle}>
          WebGL visualization of V-Dem democracy indices as a 3D tree structure. 
          Liberal Democracy branches into sub-components, regions, and 202 countries.
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
            <button 
              className={styles.cameraButton}
              onClick={animateCamera}
            >
              🎥 Spiral Camera
            </button>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>Sub-Indices</label>
            {[
              { key: 'v2x_partip', label: 'Participatory', color: INDEX_COLORS.participatory },
              { key: 'v2xdl_delib', label: 'Deliberative', color: INDEX_COLORS.deliberative },
              { key: 'v2x_egal', label: 'Egalitarian', color: INDEX_COLORS.egalitarian }
            ].map(idx => (
              <button
                key={idx.key}
                className={`${styles.indexToggle} ${activeIndices.includes(idx.key) ? styles.active : ''}`}
                style={{ 
                  borderColor: idx.color,
                  background: activeIndices.includes(idx.key) ? idx.color : 'transparent'
                }}
                onClick={() => toggleIndex(idx.key)}
              >
                {idx.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.graphContainer}>
          <GraphCanvas
            ref={graphRef}
            nodes={graphData.nodes}
            edges={graphData.edges}
            layoutType="treeTopDown3d"
            sizingType="centrality"
            cameraMode="rotate"
            onNodeClick={(node) => setSelectedNode(node)}
            theme={{
              canvas: {
                background: '#0d0d1a',
                fog: true
              },
              node: {
                label: {
                  color: '#ffffff',
                  fontSize: 10,
                  opacity: 0.9
                },
                fill: '#3498db',
                stroke: '#ffffff'
              },
              edge: {
                color: '#5a5a8a',
                opacity: 0.3,
                stroke: '#5a5a8a'
              },
              lasso: {
                border: '#3498db',
                fill: 'rgba(52, 152, 219, 0.2)',
                opacity: 0.5
              },
              ring: {
                fill: '#2c3e50',
                stroke: '#34495e'
              },
              selection: {
                fill: 'rgba(52, 152, 219, 0.3)',
                stroke: '#3498db'
              }
            }}
            selections={[]}
            style={{
              width: '100%',
              height: '100%'
            }}
          />

          {/* Selected node info panel */}
          {selectedNode && (
            <div className={styles.infoPanel}>
              <h3>{selectedNode.label}</h3>
              {selectedNode.data?.score && (
                <p>Liberal Democracy Score: {selectedNode.data.score.toFixed(3)}</p>
              )}
              {selectedNode.data?.region && (
                <p>Region: {selectedNode.data.region}</p>
              )}
              {selectedNode.data?.type === 'sub-index' && (
                <p>Type: Sub-Component Index</p>
              )}
              {selectedNode.data?.type === 'root' && (
                <p>Type: Aggregate Index (Root)</p>
              )}
              <button 
                className={styles.closeButton}
                onClick={() => setSelectedNode(null)}
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendSection}>
            <h4>Hierarchy Levels</h4>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: INDEX_COLORS.liberal, width: 20, height: 20 }} />
              <span>Liberal Democracy (Root)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: INDEX_COLORS.participatory, width: 14, height: 14 }} />
              <span>Sub-Components (Level 1)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#888', width: 10, height: 10 }} />
              <span>Regions (Level 2)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#666', width: 6, height: 6 }} />
              <span>Countries (Level 3) - sized by score</span>
            </div>
          </div>
          
          <div className={styles.legendSection}>
            <h4>Regions</h4>
            {Object.entries(REGION_COLORS).map(([region, color]) => (
              <div key={region} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: color }} />
                <span>{region}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default VDemHierarchyTree;
