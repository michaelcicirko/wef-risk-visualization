import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ForceGraph3DComponent from 'react-force-graph-3d';
import { riskNodes, riskEdges } from '../data/riskNetwork.js';
import { categoryColors } from '../data/risks.js';
import styles from './ForceGraph3D.module.css';

// Build graph data
function buildGraphData(visibleEdgeKeys) {
  const nodes = riskNodes.map(n => ({
    id: n.id,
    label: n.label.replace('\n', ' '),
    category: n.category,
    color: categoryColors[n.category] || '#5a5a8a',
  }));

  const links = riskEdges
    .filter(e => !visibleEdgeKeys || visibleEdgeKeys.has(`${e.source}→${e.target}`))
    .map(e => ({
      source: e.source,
      target: e.target,
      strength: e.strength,
      key: `${e.source}→${e.target}`,
      color: categoryColors[riskNodes.find(n => n.id === e.source)?.category] || '#5a5a8a',
    }));

  return { nodes, links };
}

const FULL_DATA = buildGraphData(null);
const ALL_EDGE_KEYS = new Set(riskEdges.map(e => `${e.source}→${e.target}`));
const EDGE_LIST = riskEdges.map(e => `${e.source}→${e.target}`);

const CAMERA_DISTANCE = 320;

export default function ForceGraph3D() {
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ w: 900, h: 600 });
  const [revealCount, setRevealCount] = useState(EDGE_LIST.length);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [clickedNode, setClickedNode] = useState(null);
  const revealRef = useRef(EDGE_LIST.length);

  // Responsive sizing
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setDimensions({ w: Math.floor(width), h: Math.min(600, Math.floor(width * 0.65)) });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Auto-orbit
  useEffect(() => {
    if (!fgRef.current || !autoOrbit) return;
    let frame;
    let angle = 0;
    const orbit = () => {
      angle += 0.003;
      fgRef.current.cameraPosition({
        x: CAMERA_DISTANCE * Math.sin(angle),
        z: CAMERA_DISTANCE * Math.cos(angle),
      });
      frame = requestAnimationFrame(orbit);
    };
    frame = requestAnimationFrame(orbit);
    return () => cancelAnimationFrame(frame);
  }, [autoOrbit]);

  // Replay animation
  useEffect(() => {
    if (!isPlaying) return;
    revealRef.current = 0;
    setRevealCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      revealRef.current = i;
      setRevealCount(i);
      if (i >= EDGE_LIST.length) {
        clearInterval(interval);
        setIsPlaying(false);
      }
    }, 180);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const visibleKeys = useMemo(() => {
    return new Set(EDGE_LIST.slice(0, revealCount));
  }, [revealCount]);

  const graphData = useMemo(() => buildGraphData(visibleKeys), [visibleKeys]);

  // Node click — zoom to node
  const handleNodeClick = useCallback((node) => {
    setClickedNode(node);
    setAutoOrbit(false);
    const dist = 80;
    const distRatio = 1 + dist / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
    fgRef.current.cameraPosition(
      { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
      node,
      1200
    );
  }, []);

  const handleBgClick = useCallback(() => {
    setClickedNode(null);
    setAutoOrbit(true);
  }, []);

  // Neighbours of clicked/hovered node
  const highlightNodeIds = useMemo(() => {
    const focus = clickedNode || hoveredNode;
    if (!focus) return null;
    const ids = new Set([focus.id]);
    graphData.links.forEach(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      if (srcId === focus.id) ids.add(tgtId);
      if (tgtId === focus.id) ids.add(srcId);
    });
    return ids;
  }, [clickedNode, hoveredNode, graphData.links]);

  const nodeColor = useCallback((node) => {
    if (!highlightNodeIds) return node.color;
    if (highlightNodeIds.has(node.id)) return '#ffffff';
    return '#2a2a4a';
  }, [highlightNodeIds]);

  const linkColor = useCallback((link) => {
    if (!highlightNodeIds) return link.color;
    const srcId = typeof link.source === 'object' ? link.source.id : link.source;
    const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
    if (highlightNodeIds.has(srcId) && highlightNodeIds.has(tgtId)) return '#ffffff';
    return '#1a1a2e';
  }, [highlightNodeIds]);

  const linkWidth = useCallback((link) => {
    if (!highlightNodeIds) return link.strength;
    const srcId = typeof link.source === 'object' ? link.source.id : link.source;
    const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
    if (highlightNodeIds.has(srcId) && highlightNodeIds.has(tgtId)) return link.strength * 2;
    return 0.3;
  }, [highlightNodeIds]);

  const nodeVal = useCallback((node) => {
    const degree = graphData.links.filter(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return s === node.id || t === node.id;
    }).length;
    return Math.max(2, degree * 1.5);
  }, [graphData.links]);

  const focusNode = clickedNode || hoveredNode;

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>3D Force Graph — WEF Risk Network</h1>
        <p className={styles.subtitle}>
          15 WEF global risks as glowing nodes in 3D space, connected by causal links.
          Node size = connection degree. Click a node to zoom in and highlight neighbours.
          Drag to orbit · Scroll to zoom · Click background to reset.
        </p>
      </header>

      <main className={styles.main}>
        {/* Controls bar */}
        <div className={styles.controlsBar}>
          <div className={styles.toggleGroup}>
            <button
              className={`${styles.toggle} ${autoOrbit ? styles.toggleOn : ''}`}
              onClick={() => setAutoOrbit(p => !p)}
            >Auto-orbit {autoOrbit ? 'ON' : 'OFF'}</button>
            <button
              className={`${styles.toggle} ${showParticles ? styles.toggleOn : ''}`}
              onClick={() => setShowParticles(p => !p)}
            >Particles {showParticles ? 'ON' : 'OFF'}</button>
          </div>
          <button
            className={styles.replayButton}
            onClick={() => { setIsPlaying(false); setTimeout(() => setIsPlaying(true), 50); }}
          >↺ Replay</button>
        </div>

        {/* Info panel for focused node */}
        <div className={`${styles.infoPanel} ${focusNode ? styles.infoPanelVisible : ''}`}>
          {focusNode && (
            <>
              <span className={styles.infoDot} style={{ background: focusNode.color }} />
              <span className={styles.infoLabel}>{focusNode.label}</span>
              <span className={styles.infoCategory} style={{ color: focusNode.color }}>
                {focusNode.category}
              </span>
              <span className={styles.infoDegree}>
                {highlightNodeIds ? highlightNodeIds.size - 1 : 0} connections
              </span>
            </>
          )}
        </div>

        {/* Scrubber */}
        <div className={styles.scrubberContainer}>
          <span className={styles.scrubberLabel}>0</span>
          <input
            type="range"
            className={styles.scrubber}
            min={0} max={EDGE_LIST.length} step={1}
            value={revealCount}
            onChange={e => {
              setIsPlaying(false);
              const v = parseInt(e.target.value);
              revealRef.current = v;
              setRevealCount(v);
            }}
          />
          <span className={styles.scrubberLabel}>{EDGE_LIST.length}</span>
          <span className={styles.scrubberCount}>{revealCount} links</span>
        </div>

        {/* 3D Graph */}
        <div className={styles.graphWrapper} ref={containerRef}>
          <ForceGraph3DComponent
            ref={fgRef}
            width={dimensions.w}
            height={dimensions.h}
            graphData={graphData}
            backgroundColor="#0d0d1a"
            nodeColor={nodeColor}
            nodeVal={nodeVal}
            nodeLabel="label"
            nodeOpacity={0.92}
            nodeResolution={16}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkOpacity={0.6}
            linkCurvature={0.15}
            linkDirectionalParticles={showParticles ? (l) => l.strength * 2 : 0}
            linkDirectionalParticleSpeed={0.006}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleColor={linkColor}
            enablePointerInteraction={true}
            onNodeClick={handleNodeClick}
            onNodeHover={setHoveredNode}
            onBackgroundClick={handleBgClick}
            showNavInfo={false}
            enableNodeDrag={true}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            warmupTicks={60}
            cooldownTicks={100}
          />
        </div>

        {/* Category legend */}
        <div className={styles.legend}>
          {Object.entries(categoryColors).map(([cat, color]) => (
            <div key={cat} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color }} />
              <span style={{ textTransform: 'capitalize' }}>{cat}</span>
            </div>
          ))}
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025 — Interconnections Framework</p>
        </footer>
      </main>
    </div>
  );
}
