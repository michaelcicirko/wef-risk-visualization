import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey';
import { sankeyNodes, sankeyLinks, nodeColors, LINK_REVEAL_ORDER } from '../data/riskSankey.js';
import styles from './SankeyChart.module.css';

const SVG_W = 1200;
const SVG_H = 500;
const MARGIN = { top: 20, right: 120, bottom: 20, left: 120 };
const W = SVG_W - MARGIN.left - MARGIN.right;
const H = SVG_H - MARGIN.top - MARGIN.bottom;

const NODE_W = 14;
const NODE_PAD = 18;

// Pre-compute full Sankey layout once
function buildLayout() {
  const gen = sankey()
    .nodeId(d => d.id)
    .nodeAlign(sankeyLeft)
    .nodeWidth(NODE_W)
    .nodePadding(NODE_PAD)
    .extent([[0, 0], [W, H]]);

  const graph = gen({
    nodes: sankeyNodes.map(n => ({ ...n })),
    links: sankeyLinks.map(l => ({ ...l })),
  });

  return graph;
}

const GRAPH = buildLayout();

// Build ordered link list by LINK_REVEAL_ORDER
function buildOrderedLinks(graph) {
  const linkMap = {};
  graph.links.forEach(l => {
    const key = `${l.source.id}→${l.target.id}`;
    linkMap[key] = l;
  });
  const ordered = [];
  LINK_REVEAL_ORDER.forEach(key => {
    if (linkMap[key]) ordered.push({ ...linkMap[key], key });
  });
  graph.links.forEach(l => {
    const key = `${l.source.id}→${l.target.id}`;
    if (!ordered.find(o => o.key === key)) ordered.push({ ...l, key });
  });
  return ordered;
}

const ORDERED_LINKS = buildOrderedLinks(GRAPH);
const TOTAL_LINKS = ORDERED_LINKS.length;

// Which nodes are involved in visible links
function getVisibleNodeIds(visibleLinks) {
  const ids = new Set();
  visibleLinks.forEach(l => {
    ids.add(l.source.id);
    ids.add(l.target.id);
  });
  return ids;
}

function SankeyChart() {
  const revealRef = useRef(0);
  const [revealCount, setRevealCount] = useState(0);
  const [isPlaying, setIsPlaying]     = useState(true);
  const [flashKey, setFlashKey]       = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);

  const [linkRevealDelay, setLinkRevealDelay] = useState(280);
  const [initialHold, setInitialHold]         = useState(700);
  const [timingInputs, setTimingInputs] = useState({ linkRevealDelay: 280, initialHold: 700 });

  const visibleLinks = useMemo(() => ORDERED_LINKS.slice(0, revealCount), [revealCount]);
  const visibleNodeIds = useMemo(() => getVisibleNodeIds(visibleLinks), [visibleLinks]);

  // Nodes connected to hovered node
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNode) return new Set();
    const set = new Set([hoveredNode]);
    visibleLinks.forEach(l => {
      if (l.source.id === hoveredNode) set.add(l.target.id);
      if (l.target.id === hoveredNode) set.add(l.source.id);
    });
    return set;
  }, [hoveredNode, visibleLinks]);

  // ── Animation ──
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;

    const reveal = () => {
      const idx = revealRef.current;
      if (idx >= TOTAL_LINKS) { setIsPlaying(false); return; }
      const link = ORDERED_LINKS[idx];
      revealRef.current += 1;
      setRevealCount(revealRef.current);
      setFlashKey(link.key);
      setTimeout(() => setFlashKey(null), 350);
      timeoutId = setTimeout(reveal, linkRevealDelay);
    };

    timeoutId = setTimeout(reveal, initialHold);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, linkRevealDelay, initialHold]);

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

  const linkPath = sankeyLinkHorizontal();

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Sankey Diagram — WEF Risk Flows</h1>
        <p className={styles.subtitle}>
          Three-layer flow: risk categories (left) → individual risks (centre) → impact domains (right).
          Link width encodes severity score. Flows reveal left-to-right, first source-to-risk then risk-to-impact.
          Hover any node to trace its full flow path.
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.statsRow}>
          <span className={styles.statValue}>{revealCount}</span>
          <span className={styles.statLabel}> / {TOTAL_LINKS} flows revealed</span>
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            onMouseLeave={() => { setHoveredNode(null); setHoveredLink(null); }}
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

              {/* Links */}
              <AnimatePresence>
                {visibleLinks.map(link => {
                  const isFlash = flashKey === link.key;
                  const isHovLink = hoveredLink?.key === link.key;
                  const srcColor = nodeColors[link.source.category] || '#5a5a8a';

                  const dimmed = hoveredNode &&
                    link.source.id !== hoveredNode &&
                    link.target.id !== hoveredNode;

                  const hovNodeLink = hoveredNode && (
                    link.source.id === hoveredNode || link.target.id === hoveredNode
                  );

                  return (
                    <motion.path
                      key={link.key}
                      d={linkPath(link)}
                      fill="none"
                      stroke={isFlash ? '#ffffff' : srcColor}
                      strokeWidth={Math.max(1, link.width)}
                      strokeOpacity={
                        isFlash ? 0.95
                        : dimmed ? 0.04
                        : hovNodeLink ? 0.75
                        : isHovLink ? 0.85
                        : 0.28
                      }
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: 1,
                        opacity: 1,
                        strokeOpacity: isFlash ? 0.95 : dimmed ? 0.04 : hovNodeLink ? 0.75 : isHovLink ? 0.85 : 0.28,
                      }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredLink(link)}
                      onMouseLeave={() => setHoveredLink(null)}
                    />
                  );
                })}
              </AnimatePresence>

              {/* Nodes */}
              {GRAPH.nodes.map(node => {
                const isVisible = visibleNodeIds.has(node.id);
                if (!isVisible) return null;
                const color = nodeColors[node.category] || '#5a5a8a';
                const isHov = hoveredNode === node.id;
                const inPath = connectedNodeIds.has(node.id);
                const dimmed = hoveredNode && !inPath;

                return (
                  <motion.g
                    key={node.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: dimmed ? 0.15 : 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <rect
                      x={node.x0}
                      y={node.y0}
                      width={node.x1 - node.x0}
                      height={Math.max(1, node.y1 - node.y0)}
                      fill={color}
                      fillOpacity={isHov ? 1 : 0.85}
                      rx={2}
                      style={{ transition: 'fill-opacity 0.2s' }}
                    />
                    {/* Label: left of node for left-layer, right for right-layer, above for middle */}
                    {(() => {
                      const nodeH = node.y1 - node.y0;
                      const cy = node.y0 + nodeH / 2;
                      const lines = node.label.split('\n');
                      const isLeft = node.layer === 0;
                      const isRight = node.layer === 2;
                      const x = isLeft ? node.x0 - 6 : isRight ? node.x1 + 6 : node.x0 + (node.x1 - node.x0) / 2;
                      const anchor = isLeft ? 'end' : isRight ? 'start' : 'middle';
                      return lines.map((line, li) => (
                        <text
                          key={li}
                          x={x}
                          y={cy + (li - (lines.length - 1) / 2) * 11}
                          textAnchor={anchor}
                          dominantBaseline="middle"
                          fontSize={9.5}
                          fontWeight={isHov ? 700 : 500}
                          fill={dimmed ? '#3a3a5a' : isHov ? '#ffffff' : '#aaaacc'}
                          style={{ userSelect: 'none', pointerEvents: 'none', transition: 'fill 0.2s' }}
                        >{line}</text>
                      ));
                    })()}
                  </motion.g>
                );
              })}

              {/* Hovered link tooltip */}
              {hoveredLink && (() => {
                const src = hoveredLink.source;
                const tgt = hoveredLink.target;
                const mx = (src.x1 + tgt.x0) / 2;
                const my = (hoveredLink.y0 + hoveredLink.y1) / 2 - 18;
                return (
                  <text
                    x={mx} y={my}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#ffffff"
                    opacity={0.8}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >{`${src.label.replace('\n', ' ')} → ${tgt.label.replace('\n', ' ')} (${hoveredLink.value})`}</text>
                );
              })()}

              {/* Layer headers */}
              {[
                { label: 'Risk Categories', x: NODE_W / 2 },
                { label: 'Top Risks (2026)', x: W / 2 },
                { label: 'Impact Domains', x: W - NODE_W / 2 },
              ].map(h => (
                <text
                  key={h.label}
                  x={h.x}
                  y={H + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#5a5a8a"
                  style={{ userSelect: 'none' }}
                >{h.label}</text>
              ))}

            </g>
          </svg>
        </div>

        {/* Category colour legend */}
        <div className={styles.legend}>
          {Object.entries(nodeColors).filter(([k]) => k !== 'impact').map(([cat, color]) => (
            <div key={cat} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color }} />
              <span style={{ textTransform: 'capitalize' }}>{cat}</span>
            </div>
          ))}
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#5a5a8a' }} />
            <span>Impact domains</span>
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
            min={0} max={TOTAL_LINKS} step={1}
            value={revealCount}
            onChange={e => handleScrub(e.target.value)}
          />
          <span className={styles.scrubberLabel}>{TOTAL_LINKS}</span>
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
              <label>Link Reveal (ms)</label>
              <input type="number" value={timingInputs.linkRevealDelay}
                onChange={e => setTimingInputs(p => ({ ...p, linkRevealDelay: parseInt(e.target.value) || 0 }))}
                min="50" max="3000" step="50" />
            </div>
          </div>
          <button className={styles.confirmButton} onClick={() => {
            setInitialHold(timingInputs.initialHold);
            setLinkRevealDelay(timingInputs.linkRevealDelay);
          }}>Confirm</button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025</p>
        </footer>
      </main>
    </div>
  );
}

export default SankeyChart;
