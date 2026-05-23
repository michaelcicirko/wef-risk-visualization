import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY
} from 'd3-force';
import { categoryColors } from '../data/risks.js';
import { riskNodes, riskEdges, EDGE_REVEAL_ORDER } from '../data/riskNetwork.js';
import styles from './NetworkGraph.module.css';

const SVG_W = 800;
const SVG_H = 520;
const NODE_R = 26;

// Category x-bias positions to guide clustering
const CATEGORY_BIAS = {
  geopolitical:  { x: SVG_W * 0.25, y: SVG_H * 0.28 },
  technological: { x: SVG_W * 0.72, y: SVG_H * 0.25 },
  societal:      { x: SVG_W * 0.48, y: SVG_H * 0.68 },
  economic:      { x: SVG_W * 0.22, y: SVG_H * 0.72 },
  environmental: { x: SVG_W * 0.76, y: SVG_H * 0.68 },
};

// Compute stable layout using all edges
function computeLayout() {
  const nodes = riskNodes.map(n => ({
    ...n,
    x: (CATEGORY_BIAS[n.category]?.x ?? SVG_W / 2) + (Math.random() - 0.5) * 60,
    y: (CATEGORY_BIAS[n.category]?.y ?? SVG_H / 2) + (Math.random() - 0.5) * 60,
  }));
  const edges = riskEdges.map(e => ({ ...e }));

  const sim = forceSimulation(nodes)
    .force('link', forceLink(edges).id(d => d.id).distance(110).strength(0.3))
    .force('charge', forceManyBody().strength(-350))
    .force('center', forceCenter(SVG_W / 2, SVG_H / 2))
    .force('collide', forceCollide(NODE_R + 10))
    .force('biasx', forceX(d => CATEGORY_BIAS[d.category]?.x ?? SVG_W / 2).strength(0.18))
    .force('biasy', forceY(d => CATEGORY_BIAS[d.category]?.y ?? SVG_H / 2).strength(0.18))
    .stop();

  for (let i = 0; i < 400; i++) sim.tick();

  const posMap = {};
  nodes.forEach(n => {
    posMap[n.id] = {
      x: Math.max(NODE_R + 6, Math.min(SVG_W - NODE_R - 6, n.x)),
      y: Math.max(NODE_R + 6, Math.min(SVG_H - NODE_R - 6, n.y)),
    };
  });
  return posMap;
}

const POSITIONS = computeLayout();
const TOTAL_EDGES = EDGE_REVEAL_ORDER.length;

// Build lookup for edge metadata
const EDGE_META = {};
riskEdges.forEach(e => {
  EDGE_META[`${e.source}→${e.target}`] = e;
});

// Node label: split on \n
function NodeLabel({ label, x, y, r }) {
  const lines = label.split('\n');
  const lineH = 12;
  const startY = y - ((lines.length - 1) * lineH) / 2;
  return lines.map((line, i) => (
    <text
      key={i}
      x={x} y={startY + i * lineH}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={10}
      fontWeight={600}
      fill="#ffffff"
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >{line}</text>
  ));
}

function NetworkGraph() {
  const revealIndexRef = useRef(0);
  const [revealIndex, setRevealIndex]   = useState(0);
  const [isPlaying, setIsPlaying]       = useState(true);
  const [flashingEdge, setFlashingEdge] = useState(null);
  const [hoveredNode, setHoveredNode]   = useState(null);

  const [edgeRevealDelay, setEdgeRevealDelay] = useState(420);
  const [initialHold, setInitialHold]         = useState(800);
  const [timingInputs, setTimingInputs] = useState({ edgeRevealDelay: 420, initialHold: 800 });

  // Which edges are visible
  const visibleEdgeKeys = useMemo(
    () => new Set(EDGE_REVEAL_ORDER.slice(0, revealIndex)),
    [revealIndex]
  );

  // Which nodes are connected so far
  const visibleNodeIds = useMemo(() => {
    const ids = new Set();
    visibleEdgeKeys.forEach(key => {
      const [src, tgt] = key.split('→');
      ids.add(src); ids.add(tgt);
    });
    return ids;
  }, [visibleEdgeKeys]);

  // ── Animation loop: reveal edges one by one ──
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;

    const reveal = () => {
      const idx = revealIndexRef.current;
      if (idx >= TOTAL_EDGES) { setIsPlaying(false); return; }
      const key = EDGE_REVEAL_ORDER[idx];
      revealIndexRef.current += 1;
      setRevealIndex(revealIndexRef.current);
      setFlashingEdge(key);
      setTimeout(() => setFlashingEdge(null), 400);
      timeoutId = setTimeout(reveal, edgeRevealDelay);
    };

    timeoutId = setTimeout(reveal, initialHold);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, edgeRevealDelay, initialHold]);

  // ── Replay ──
  const handleReplay = useCallback(() => {
    setIsPlaying(false);
    revealIndexRef.current = 0;
    setRevealIndex(0);
    setFlashingEdge(null);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  // ── Scrub ──
  const handleScrub = useCallback((val) => {
    setIsPlaying(false);
    const count = parseInt(val);
    revealIndexRef.current = count;
    setRevealIndex(count);
    setFlashingEdge(null);
  }, []);

  const progress = Math.round((revealIndex / TOTAL_EDGES) * 100);

  // Nodes connected to hovered node
  const connectedToHovered = useMemo(() => {
    if (!hoveredNode) return new Set();
    const connected = new Set([hoveredNode]);
    visibleEdgeKeys.forEach(key => {
      const [src, tgt] = key.split('→');
      if (src === hoveredNode) connected.add(tgt);
      if (tgt === hoveredNode) connected.add(src);
    });
    return connected;
  }, [hoveredNode, visibleEdgeKeys]);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Network Graph</h1>
        <p className={styles.subtitle}>WEF Global Risks Interconnections — force-directed layout of causal relationships between the top global risks</p>
        <div className={styles.description}>
          <p>
            Each <strong>node</strong> represents one of 15 global risks identified in the WEF Global Risks Report,
            grouped into five categories: <span style={{color:'#e74c3c'}}>Geopolitical</span>,{' '}
            <span style={{color:'#2ecc71'}}>Environmental</span>,{' '}
            <span style={{color:'#3498db'}}>Societal</span>,{' '}
            <span style={{color:'#e67e22'}}>Economic</span>, and{' '}
            <span style={{color:'#9b59b6'}}>Technological</span>.
          </p>
          <p>
            Each <strong>directed edge</strong> (arrow) represents a causal or amplifying relationship — where one risk
            directly worsens or triggers another. Edge thickness encodes relationship strength (weak / moderate / strong).
            Connections are revealed in narrative sequence: geopolitical tensions first, then technology and
            information risks, then societal and economic cascades, then environmental systemic risks.
          </p>
          <p>
            <strong>Hover any node</strong> to isolate its direct connections and see how it sits within the wider risk web.
          </p>
        </div>
      </header>

      <main className={styles.main}>
        {/* Progress */}
        <div className={styles.progressRow}>
          <span className={styles.progressLabel}>
            {revealIndex} / {TOTAL_EDGES} connections revealed
          </span>
          <span className={styles.progressPct}>{progress}%</span>
        </div>

        {/* Graph */}
        <div className={styles.chartWrapper}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Defs: arrowhead marker per category */}
            <defs>
              {Object.entries(categoryColors).map(([cat, color]) => (
                <marker
                  key={cat}
                  id={`arrow-${cat}`}
                  viewBox="0 0 8 8"
                  refX="7" refY="4"
                  markerWidth="6" markerHeight="6"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 Z" fill={color} opacity={0.7} />
                </marker>
              ))}
              <marker
                id="arrow-flash"
                viewBox="0 0 8 8"
                refX="7" refY="4"
                markerWidth="6" markerHeight="6"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="#ff00ff" />
              </marker>
            </defs>

            {/* Edges */}
            <AnimatePresence>
              {EDGE_REVEAL_ORDER.slice(0, revealIndex).map(key => {
                const meta = EDGE_META[key];
                if (!meta) return null;
                const src = POSITIONS[meta.source];
                const tgt = POSITIONS[meta.target];
                if (!src || !tgt) return null;

                const isFlashing = flashingEdge === key;
                const srcNode = riskNodes.find(n => n.id === meta.source);
                const color = isFlashing ? '#ff00ff' : (categoryColors[srcNode?.category] || '#5a5a8a');
                const opacity = hoveredNode
                  ? (connectedToHovered.has(meta.source) && connectedToHovered.has(meta.target) ? 0.9 : 0.08)
                  : 0.55;

                // Shorten line so arrowhead sits outside node circle
                const dx = tgt.x - src.x;
                const dy = tgt.y - src.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const ux = dx / dist;
                const uy = dy / dist;
                const x1 = src.x + ux * (NODE_R + 2);
                const y1 = src.y + uy * (NODE_R + 2);
                const x2 = tgt.x - ux * (NODE_R + 8);
                const y2 = tgt.y - uy * (NODE_R + 8);

                return (
                  <motion.line
                    key={key}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={color}
                    strokeWidth={isFlashing ? 2.5 : (meta.strength || 1) * 0.9}
                    opacity={opacity}
                    markerEnd={`url(#arrow-${isFlashing ? 'flash' : srcNode?.category})`}
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{ opacity, pathLength: 1 }}
                    transition={{ duration: 0.35 }}
                    style={{ transition: 'opacity 0.2s' }}
                  />
                );
              })}
            </AnimatePresence>

            {/* Nodes */}
            {riskNodes.map(node => {
              const pos = POSITIONS[node.id];
              if (!pos) return null;
              const isVisible = visibleNodeIds.has(node.id);
              const isHovered = hoveredNode === node.id;
              const dimmed = hoveredNode && !connectedToHovered.has(node.id);
              const color = categoryColors[node.category] || '#5a5a8a';

              return (
                <motion.g
                  key={node.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: isVisible ? 1 : 0,
                    opacity: dimmed ? 0.2 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={{ transformOrigin: `${pos.x}px ${pos.y}px`, cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <circle
                    cx={pos.x} cy={pos.y}
                    r={isHovered ? NODE_R + 5 : NODE_R}
                    fill={color}
                    fillOpacity={0.85}
                    stroke={isHovered ? '#ffffff' : color}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    strokeOpacity={0.6}
                    style={{ transition: 'r 0.2s ease' }}
                  />
                  <NodeLabel label={node.label} x={pos.x} y={pos.y} r={NODE_R} />
                </motion.g>
              );
            })}
          </svg>
        </div>

        {/* Category legend */}
        <div className={styles.categoryLegend}>
          {Object.entries(categoryColors).map(([cat, color]) => (
            <div key={cat} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color }} />
              <span className={styles.legendLabel}>{cat}</span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <button className={styles.controlButton} onClick={() => setIsPlaying(p => !p)}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button className={styles.controlButton} onClick={handleReplay} disabled={isPlaying}>
            Replay
          </button>
        </div>

        {/* Scrubber */}
        <div className={styles.scrubberContainer}>
          <span className={styles.scrubberYear}>0</span>
          <input
            type="range"
            className={styles.scrubber}
            min={0}
            max={TOTAL_EDGES}
            step={1}
            value={revealIndex}
            onChange={e => handleScrub(e.target.value)}
          />
          <span className={styles.scrubberYear}>{TOTAL_EDGES}</span>
        </div>

        {/* Timing controls */}
        <div className={styles.timingControls}>
          <div className={styles.timingGrid}>
            <div className={styles.timingField}>
              <label>Initial Hold (ms)</label>
              <input type="number" value={timingInputs.initialHold}
                onChange={e => setTimingInputs(p => ({ ...p, initialHold: parseInt(e.target.value) || 0 }))}
                min="0" max="5000" step="100" />
            </div>
            <div className={styles.timingField}>
              <label>Edge Reveal (ms)</label>
              <input type="number" value={timingInputs.edgeRevealDelay}
                onChange={e => setTimingInputs(p => ({ ...p, edgeRevealDelay: parseInt(e.target.value) || 0 }))}
                min="50" max="3000" step="50" />
            </div>
          </div>
          <button className={styles.confirmButton} onClick={() => {
            setInitialHold(timingInputs.initialHold);
            setEdgeRevealDelay(timingInputs.edgeRevealDelay);
          }}>Confirm</button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Example data: WEF Global Risks Interconnections Framework</p>
        </footer>
      </main>
    </div>
  );
}

export default NetworkGraph;
