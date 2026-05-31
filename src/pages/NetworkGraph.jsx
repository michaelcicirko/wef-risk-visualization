import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY
} from 'd3-force';
import { categoryColors } from '../data/risks.js';
import { riskNodes, riskEdges } from '../data/riskNetwork.js';
import styles from './NetworkGraph.module.css';

const SVG_W = 800;
const SVG_H = 520;
const NODE_R = 26;

const CATEGORY_BIAS = {
  geopolitical:  { x: SVG_W * 0.25, y: SVG_H * 0.28 },
  technological: { x: SVG_W * 0.72, y: SVG_H * 0.25 },
  societal:      { x: SVG_W * 0.48, y: SVG_H * 0.68 },
  economic:      { x: SVG_W * 0.22, y: SVG_H * 0.72 },
  environmental: { x: SVG_W * 0.76, y: SVG_H * 0.68 },
};

const CATEGORIES = ['geopolitical', 'technological', 'societal', 'economic', 'environmental'];
const CATEGORY_LABELS = {
  geopolitical: 'Geopolitical', technological: 'Technological',
  societal: 'Societal', economic: 'Economic', environmental: 'Environmental',
};

// Node label: split on \n
function NodeLabel({ label, x, y }) {
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
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const nodesRef = useRef(null);
  const edgesRef = useRef(null);
  const dragRef = useRef(null);

  const [positions, setPositions] = useState({});
  const [settled, setSettled] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [activeCategories, setActiveCategories] = useState(new Set(CATEGORIES));

  // Initialise simulation
  useEffect(() => {
    const nodes = riskNodes.map(n => ({
      ...n,
      x: (CATEGORY_BIAS[n.category]?.x ?? SVG_W / 2) + (Math.random() - 0.5) * 80,
      y: (CATEGORY_BIAS[n.category]?.y ?? SVG_H / 2) + (Math.random() - 0.5) * 80,
    }));
    const edges = riskEdges.map(e => ({ ...e }));

    nodesRef.current = nodes;
    edgesRef.current = edges;

    const sim = forceSimulation(nodes)
      .force('link', forceLink(edges).id(d => d.id).distance(110).strength(0.3))
      .force('charge', forceManyBody().strength(-350))
      .force('center', forceCenter(SVG_W / 2, SVG_H / 2))
      .force('collide', forceCollide(NODE_R + 10))
      .force('biasx', forceX(d => CATEGORY_BIAS[d.category]?.x ?? SVG_W / 2).strength(0.18))
      .force('biasy', forceY(d => CATEGORY_BIAS[d.category]?.y ?? SVG_H / 2).strength(0.18))
      .alphaDecay(0.015)
      .velocityDecay(0.3)
      .on('tick', () => {
        const posMap = {};
        nodes.forEach(n => {
          n.x = Math.max(NODE_R + 6, Math.min(SVG_W - NODE_R - 6, n.x));
          n.y = Math.max(NODE_R + 6, Math.min(SVG_H - NODE_R - 6, n.y));
          posMap[n.id] = { x: n.x, y: n.y };
        });
        setPositions({ ...posMap });
      })
      .on('end', () => setSettled(true));

    simRef.current = sim;

    return () => { sim.stop(); };
  }, []);

  // Drag handlers
  const handlePointerDown = useCallback((e, nodeId) => {
    e.preventDefault();
    e.stopPropagation();
    const node = nodesRef.current?.find(n => n.id === nodeId);
    if (!node || !simRef.current) return;

    dragRef.current = { nodeId, startX: e.clientX, startY: e.clientY };
    node.fx = node.x;
    node.fy = node.y;
    simRef.current.alphaTarget(0.3).restart();
    setSettled(false);

    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();

    const onMove = (me) => {
      if (!dragRef.current) return;
      const pt = svg.createSVGPoint();
      pt.x = me.clientX; pt.y = me.clientY;
      const svgPt = pt.matrixTransform(ctm.inverse());
      node.fx = Math.max(NODE_R + 6, Math.min(SVG_W - NODE_R - 6, svgPt.x));
      node.fy = Math.max(NODE_R + 6, Math.min(SVG_H - NODE_R - 6, svgPt.y));
    };

    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      node.fx = null;
      node.fy = null;
      simRef.current.alphaTarget(0);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  // Toggle category filter
  const toggleCategory = useCallback((cat) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  const showAll = useCallback(() => setActiveCategories(new Set(CATEGORIES)), []);

  // Derived: which nodes/edges are connected to hovered
  const connectedToHovered = useMemo(() => {
    if (!hoveredNode) return null;
    const connected = new Set([hoveredNode]);
    riskEdges.forEach(e => {
      if (e.source === hoveredNode || e.source?.id === hoveredNode) {
        connected.add(typeof e.target === 'object' ? e.target.id : e.target);
      }
      if (e.target === hoveredNode || e.target?.id === hoveredNode) {
        connected.add(typeof e.source === 'object' ? e.source.id : e.source);
      }
    });
    return connected;
  }, [hoveredNode]);

  // Filter visible nodes & edges by active categories
  const visibleNodes = useMemo(() =>
    riskNodes.filter(n => activeCategories.has(n.category)),
    [activeCategories]
  );
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() =>
    riskEdges.filter(e => {
      const srcId = typeof e.source === 'object' ? e.source.id : e.source;
      const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
      return visibleNodeIds.has(srcId) && visibleNodeIds.has(tgtId);
    }),
    [visibleNodeIds]
  );

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Network Graph</h1>
        <p className={styles.subtitle}>WEF Global Risks Interconnections — interactive force-directed layout</p>
        <div className={styles.description}>
          <p>
            Each <strong>node</strong> is a global risk from the WEF report. <strong>Arrows</strong> show
            causal/amplifying relationships; thickness = strength. <strong>Drag nodes</strong> to
            rearrange. <strong>Hover</strong> to isolate connections. <strong>Toggle categories</strong> below to filter.
          </p>
        </div>
      </header>

      <main className={styles.main}>
        {/* Category filter toggles */}
        <div className={styles.categoryLegend}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategories.has(cat);
            return (
              <button
                key={cat}
                className={`${styles.catButton} ${isActive ? styles.catButtonActive : ''}`}
                style={{
                  borderColor: isActive ? categoryColors[cat] : '#3a3a5a',
                  color: isActive ? categoryColors[cat] : '#5a5a8a',
                }}
                onClick={() => toggleCategory(cat)}
              >
                <span className={styles.legendDot} style={{ background: isActive ? categoryColors[cat] : '#3a3a5a' }} />
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
          <button className={styles.catButton} onClick={showAll} style={{ borderColor: '#5a5a8a', color: '#aaaacc' }}>
            Show All
          </button>
        </div>

        {/* Graph */}
        <div className={styles.chartWrapper}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Defs: arrowhead markers */}
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
            </defs>

            {/* Edges */}
            {visibleEdges.map((edge, i) => {
              const srcId = typeof edge.source === 'object' ? edge.source.id : edge.source;
              const tgtId = typeof edge.target === 'object' ? edge.target.id : edge.target;
              const src = positions[srcId];
              const tgt = positions[tgtId];
              if (!src || !tgt) return null;

              const srcNode = riskNodes.find(n => n.id === srcId);
              const color = categoryColors[srcNode?.category] || '#5a5a8a';

              const dimmed = connectedToHovered && !(connectedToHovered.has(srcId) && connectedToHovered.has(tgtId));
              const opacity = dimmed ? 0.06 : 0.55;

              const dx = tgt.x - src.x;
              const dy = tgt.y - src.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 1) return null;
              const ux = dx / dist;
              const uy = dy / dist;
              const x1 = src.x + ux * (NODE_R + 2);
              const y1 = src.y + uy * (NODE_R + 2);
              const x2 = tgt.x - ux * (NODE_R + 8);
              const y2 = tgt.y - uy * (NODE_R + 8);

              return (
                <line
                  key={`${srcId}-${tgtId}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={color}
                  strokeWidth={(edge.strength || 1) * 0.9}
                  opacity={opacity}
                  markerEnd={`url(#arrow-${srcNode?.category})`}
                  style={{ transition: 'opacity 0.25s ease' }}
                />
              );
            })}

            {/* Nodes */}
            {visibleNodes.map(node => {
              const pos = positions[node.id];
              if (!pos) return null;
              const isHovered = hoveredNode === node.id;
              const dimmed = connectedToHovered && !connectedToHovered.has(node.id);
              const color = categoryColors[node.category] || '#5a5a8a';

              return (
                <g
                  key={node.id}
                  style={{ cursor: 'grab', opacity: dimmed ? 0.15 : 1, transition: 'opacity 0.25s ease' }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onPointerDown={(e) => handlePointerDown(e, node.id)}
                >
                  <circle
                    cx={pos.x} cy={pos.y}
                    r={isHovered ? NODE_R + 5 : NODE_R}
                    fill={color}
                    fillOpacity={0.85}
                    stroke={isHovered ? '#ffffff' : color}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    strokeOpacity={0.6}
                    style={{ transition: 'r 0.15s ease, stroke 0.15s ease' }}
                  />
                  <NodeLabel label={node.label} x={pos.x} y={pos.y} />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Stats */}
        <div className={styles.progressRow}>
          <span className={styles.progressLabel}>
            {visibleNodes.length} nodes · {visibleEdges.length} connections
          </span>
          <span className={styles.progressPct}>
            {hoveredNode ? `Hovering: ${riskNodes.find(n => n.id === hoveredNode)?.label.replace('\n', ' ')}` : 'Drag nodes · Hover to isolate'}
          </span>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Data: WEF Global Risks Interconnections Framework</p>
        </footer>
      </main>
    </div>
  );
}

export default NetworkGraph;
