import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { riskNodes, riskEdges, EDGE_REVEAL_ORDER } from '../data/riskNetwork.js';
import { categoryColors } from '../data/risks.js';
import styles from './ArcDiagram.module.css';

const SVG_W = 860;
const SVG_H = 480;
const MARGIN = { top: 20, right: 30, bottom: 100, left: 30 };
const W = SVG_W - MARGIN.left - MARGIN.right;
const NODE_Y = SVG_H - MARGIN.bottom;
const NODE_R = 9;
const ARC_AREA_H = SVG_H - MARGIN.top - MARGIN.bottom - 20;

// Sort nodes: group by category for cleaner arcs
const CATEGORY_ORDER = ['geopolitical', 'economic', 'societal', 'technological', 'environmental'];
const sortedNodes = [...riskNodes].sort((a, b) => {
  const ai = CATEGORY_ORDER.indexOf(a.category);
  const bi = CATEGORY_ORDER.indexOf(b.category);
  if (ai !== bi) return ai - bi;
  return a.id.localeCompare(b.id);
});

const nodeIndex = {};
sortedNodes.forEach((n, i) => { nodeIndex[n.id] = i; });

// X position for each node
function nodeX(id) {
  const idx = nodeIndex[id];
  if (idx === undefined) return 0;
  return MARGIN.left + (idx / (sortedNodes.length - 1)) * W;
}

// Build a quadratic bezier arc path between two node positions
function arcPath(srcId, tgtId, strength) {
  const x1 = nodeX(srcId);
  const x2 = nodeX(tgtId);
  const cx = (x1 + x2) / 2;
  // Arc height proportional to distance, capped
  const dist = Math.abs(x2 - x1);
  const arcH = Math.min(dist * 0.55, ARC_AREA_H);
  const cy = NODE_Y - arcH;
  return `M ${x1} ${NODE_Y} Q ${cx} ${cy} ${x2} ${NODE_Y}`;
}

// Build ordered edges list matching EDGE_REVEAL_ORDER
function buildOrderedEdges() {
  const edgeMap = {};
  riskEdges.forEach(e => { edgeMap[`${e.source}→${e.target}`] = e; });
  const ordered = [];
  EDGE_REVEAL_ORDER.forEach(key => {
    if (edgeMap[key]) ordered.push({ ...edgeMap[key], key });
  });
  // Append any not in reveal order
  riskEdges.forEach(e => {
    const key = `${e.source}→${e.target}`;
    if (!ordered.find(o => o.key === key)) ordered.push({ ...e, key });
  });
  return ordered;
}

const ORDERED_EDGES = buildOrderedEdges();
const TOTAL_EDGES = ORDERED_EDGES.length;

function ArcDiagram() {
  const revealRef = useRef(0);
  const [revealCount, setRevealCount] = useState(0);
  const [isPlaying, setIsPlaying]     = useState(true);
  const [flashKey, setFlashKey]       = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);

  const [edgeRevealDelay, setEdgeRevealDelay] = useState(220);
  const [initialHold, setInitialHold]         = useState(700);
  const [timingInputs, setTimingInputs] = useState({ edgeRevealDelay: 220, initialHold: 700 });

  const visibleEdges = useMemo(() => ORDERED_EDGES.slice(0, revealCount), [revealCount]);

  // Node connection count for visible edges
  const connectedNodes = useMemo(() => {
    const counts = {};
    visibleEdges.forEach(e => {
      counts[e.source] = (counts[e.source] || 0) + 1;
      counts[e.target] = (counts[e.target] || 0) + 1;
    });
    return counts;
  }, [visibleEdges]);

  // Which nodes are connected to hovered node
  const highlightedNodes = useMemo(() => {
    if (!hoveredNode) return new Set();
    const set = new Set([hoveredNode]);
    visibleEdges.forEach(e => {
      if (e.source === hoveredNode) set.add(e.target);
      if (e.target === hoveredNode) set.add(e.source);
    });
    return set;
  }, [hoveredNode, visibleEdges]);

  // ── Animation loop ──
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;

    const reveal = () => {
      const idx = revealRef.current;
      if (idx >= TOTAL_EDGES) { setIsPlaying(false); return; }
      const edge = ORDERED_EDGES[idx];
      revealRef.current += 1;
      setRevealCount(revealRef.current);
      setFlashKey(edge.key);
      setTimeout(() => setFlashKey(null), 300);
      timeoutId = setTimeout(reveal, edgeRevealDelay);
    };

    timeoutId = setTimeout(reveal, initialHold);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, edgeRevealDelay, initialHold]);

  const handleReplay = useCallback(() => {
    setIsPlaying(false);
    revealRef.current = 0;
    setRevealCount(0);
    setFlashKey(null);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  const handleScrub = useCallback((val) => {
    setIsPlaying(false);
    const count = parseInt(val);
    revealRef.current = count;
    setRevealCount(count);
    setFlashKey(null);
  }, []);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Arc Diagram — WEF Risk Interconnections</h1>
        <p className={styles.subtitle}>
          15 WEF global risks arranged along a baseline, grouped by category. Each arc connects
          two risks with a causal or amplifying relationship — arc height encodes connection distance.
          Arcs reveal in narrative order: geopolitical → tech → societal → economic → environmental.
        </p>
      </header>

      <main className={styles.main}>
        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{revealCount}</span>
            <span className={styles.statLabel}> / {TOTAL_EDGES} connections revealed</span>
          </div>
          {hoveredNode && (
            <div className={styles.stat}>
              <span className={styles.statLabel}>Connections: </span>
              <span className={styles.statValue}>{connectedNodes[hoveredNode] || 0}</span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            onMouseLeave={() => { setHoveredNode(null); setHoveredEdge(null); }}
          >
            {/* Arc edges */}
            <AnimatePresence>
              {visibleEdges.map(edge => {
                const isFlash = flashKey === edge.key;
                const isHovEdge = hoveredEdge?.key === edge.key;
                const srcColor = categoryColors[riskNodes.find(n => n.id === edge.source)?.category] || '#5a5a8a';
                const tgtColor = categoryColors[riskNodes.find(n => n.id === edge.target)?.category] || '#5a5a8a';
                const color = srcColor;

                // Dim if hovering a node and this edge is not connected
                const dimmed = hoveredNode &&
                  edge.source !== hoveredNode && edge.target !== hoveredNode;

                const strokeW = edge.strength === 3 ? 2.5 : edge.strength === 2 ? 1.5 : 1;

                return (
                  <motion.path
                    key={edge.key}
                    d={arcPath(edge.source, edge.target, edge.strength)}
                    fill="none"
                    stroke={isFlash ? '#ffffff' : color}
                    strokeWidth={isHovEdge ? strokeW + 1.5 : strokeW}
                    strokeOpacity={dimmed ? 0.06 : isFlash ? 1 : isHovEdge ? 0.9 : 0.45}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                      pathLength: 1,
                      opacity: 1,
                      strokeOpacity: dimmed ? 0.06 : isFlash ? 1 : isHovEdge ? 0.9 : 0.45,
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredEdge(edge)}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />
                );
              })}
            </AnimatePresence>

            {/* Arrowhead on latest revealed edge */}
            {visibleEdges.length > 0 && (() => {
              const last = visibleEdges[visibleEdges.length - 1];
              const x2 = nodeX(last.target);
              return (
                <circle
                  cx={x2} cy={NODE_Y}
                  r={4}
                  fill="#ffffff"
                  opacity={flashKey === last.key ? 0.9 : 0}
                  style={{ transition: 'opacity 0.3s' }}
                />
              );
            })()}

            {/* Nodes */}
            {sortedNodes.map(node => {
              const x = nodeX(node.id);
              const color = categoryColors[node.category] || '#5a5a8a';
              const isHighlighted = highlightedNodes.has(node.id);
              const dimmed = hoveredNode && !isHighlighted;
              const degree = connectedNodes[node.id] || 0;
              const r = NODE_R + Math.min(degree, 8) * 0.5;

              return (
                <g
                  key={node.id}
                  transform={`translate(${x}, ${NODE_Y})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <circle
                    r={r}
                    fill={color}
                    fillOpacity={dimmed ? 0.2 : isHighlighted ? 1 : 0.85}
                    stroke={isHighlighted ? '#ffffff' : color}
                    strokeWidth={isHighlighted ? 2 : 0.5}
                    strokeOpacity={0.6}
                    style={{ transition: 'all 0.2s' }}
                  />
                  {degree > 0 && (
                    <text
                      y={-r - 4}
                      textAnchor="middle"
                      fontSize={8}
                      fill={color}
                      opacity={dimmed ? 0.2 : 0.8}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >{degree}</text>
                  )}
                  {/* Node labels below baseline */}
                  {node.label.split('\n').map((line, li) => (
                    <text
                      key={li}
                      y={r + 14 + li * 11}
                      textAnchor="middle"
                      fontSize={8.5}
                      fill={dimmed ? '#3a3a5a' : isHighlighted ? '#ffffff' : '#aaaacc'}
                      style={{ userSelect: 'none', pointerEvents: 'none', transition: 'fill 0.2s' }}
                    >{line}</text>
                  ))}
                </g>
              );
            })}

            {/* Hovered edge label */}
            {hoveredEdge && (() => {
              const srcNode = riskNodes.find(n => n.id === hoveredEdge.source);
              const tgtNode = riskNodes.find(n => n.id === hoveredEdge.target);
              const x1 = nodeX(hoveredEdge.source);
              const x2 = nodeX(hoveredEdge.target);
              const cx = (x1 + x2) / 2;
              const dist = Math.abs(x2 - x1);
              const arcH = Math.min(dist * 0.55, ARC_AREA_H);
              const labelY = NODE_Y - arcH - 10;
              const label = `${srcNode?.label.replace('\n', ' ')} → ${tgtNode?.label.replace('\n', ' ')}`;
              return (
                <text
                  x={cx} y={labelY}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#ffffff"
                  opacity={0.85}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >{label}</text>
              );
            })()}
          </svg>
        </div>

        {/* Category legend */}
        <div className={styles.legend}>
          {CATEGORY_ORDER.map(cat => (
            <div key={cat} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: categoryColors[cat] }} />
              <span style={{ textTransform: 'capitalize' }}>{cat}</span>
            </div>
          ))}
          <div className={styles.legendItem}>
            <span className={styles.legendStrength} style={{ height: 2.5 }} />
            <span>Strong</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendStrength} style={{ height: 1 }} />
            <span>Weak</span>
          </div>
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
          <span className={styles.scrubberLabel}>0</span>
          <input
            type="range"
            className={styles.scrubber}
            min={0} max={TOTAL_EDGES} step={1}
            value={revealCount}
            onChange={e => handleScrub(e.target.value)}
          />
          <span className={styles.scrubberLabel}>{TOTAL_EDGES}</span>
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
          <p className={styles.source}>Source: WEF Global Risks Report 2025 — Interconnections Framework</p>
        </footer>
      </main>
    </div>
  );
}

export default ArcDiagram;
