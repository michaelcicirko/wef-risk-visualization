import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { forceSimulation, forceCollide, forceX, forceY, forceManyBody } from 'd3-force';
import { motion, AnimatePresence } from 'framer-motion';
import { riskData, categoryColors } from '../data/risks.js';
import styles from './PackedCircles.module.css';

const YEARS = [2026, 2028, 2036];
const SVG_W = 700;
const SVG_H = 520;
const CX = SVG_W / 2;
const CY = SVG_H / 2;

// Category cluster centres spread around the canvas
const CLUSTER_POSITIONS = {
  geopolitical:  { x: CX - 160, y: CY - 120 },
  environmental: { x: CX + 150, y: CY - 130 },
  societal:      { x: CX - 150, y: CY + 120 },
  technological: { x: CX + 140, y: CY + 110 },
  economic:      { x: CX,       y: CY },
};

function buildNodes(year) {
  return (riskData[year] || []).map(r => ({
    id: r.id,
    title: r.title,
    category: r.category,
    value: r.value,
    rank: r.rank,
    r: 10 + r.value * 5,
    color: categoryColors[r.category] || '#5a5a8a',
    clusterX: CLUSTER_POSITIONS[r.category]?.x ?? CX,
    clusterY: CLUSTER_POSITIONS[r.category]?.y ?? CY,
  }));
}

export default function PackedCircles() {
  const [yearIndex, setYearIndex]   = useState(0);
  const [hoveredId, setHoveredId]   = useState(null);
  const [positions, setPositions]   = useState({});
  const [mode, setMode]             = useState('clustered'); // 'clustered' | 'packed'
  const simRef = useRef(null);

  const year = YEARS[yearIndex];
  const nodes = useMemo(() => buildNodes(year), [year]);

  // Run force simulation whenever nodes or mode changes
  useEffect(() => {
    // Cancel previous simulation
    if (simRef.current) simRef.current.stop();

    const nodesCopy = nodes.map(n => ({ ...n, x: n.clusterX + (Math.random() - 0.5) * 30, y: n.clusterY + (Math.random() - 0.5) * 30 }));

    const sim = forceSimulation(nodesCopy)
      .force('collide', forceCollide(n => n.r + 4).strength(0.9).iterations(3))
      .force('x', forceX(n => mode === 'clustered' ? n.clusterX : CX).strength(0.06))
      .force('y', forceY(n => mode === 'clustered' ? n.clusterY : CY).strength(0.06))
      .force('charge', forceManyBody().strength(-5))
      .alpha(0.5)
      .alphaDecay(0.02)
      .on('tick', () => {
        const pos = {};
        nodesCopy.forEach(n => { pos[n.id] = { x: n.x, y: n.y }; });
        setPositions({ ...pos });
      });

    simRef.current = sim;
    return () => sim.stop();
  }, [nodes, mode]);

  const focusNode = hoveredId ? nodes.find(n => n.id === hoveredId) : null;

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Packed Circles — WEF Risk Landscape</h1>
        <p className={styles.subtitle}>
          Each WEF risk as a circle sized by severity score. Two modes: clustered by category
          with force-based collision, or packed into a central mass. Switch years to watch
          circles drift and re-pack in real time.
        </p>
      </header>

      <main className={styles.main}>
        {/* Controls */}
        <div className={styles.controlsBar}>
          <div className={styles.yearPills}>
            {YEARS.map((y, i) => (
              <button
                key={y}
                className={`${styles.yearPill} ${i === yearIndex ? styles.yearPillActive : ''}`}
                onClick={() => setYearIndex(i)}
              >{y}</button>
            ))}
          </div>
          <div className={styles.modeGroup}>
            {['clustered', 'packed'].map(m => (
              <button
                key={m}
                className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`}
                onClick={() => setMode(m)}
              >{m === 'clustered' ? '⬡ Clustered' : '● Packed'}</button>
            ))}
          </div>
        </div>

        {/* Info card */}
        <div className={`${styles.infoCard} ${focusNode ? styles.infoCardVisible : ''}`}>
          {focusNode ? (
            <>
              <span className={styles.infoDot} style={{ background: focusNode.color }} />
              <span className={styles.infoRank}>#{focusNode.rank}</span>
              <span className={styles.infoTitle}>{focusNode.title}</span>
              <span className={styles.infoCat} style={{ color: focusNode.color }}>{focusNode.category}</span>
              <span className={styles.infoScore}>Score: {focusNode.value}</span>
            </>
          ) : (
            <span className={styles.infoHint}>Hover a circle to inspect · Switch mode to see circles repack</span>
          )}
        </div>

        {/* SVG */}
        <div className={styles.chartWrapper}>
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className={styles.svg}>

            {/* Category cluster labels when clustered */}
            {mode === 'clustered' && Object.entries(CLUSTER_POSITIONS).map(([cat, pos]) => (
              <text
                key={cat}
                x={pos.x} y={pos.y - 70}
                textAnchor="middle" fontSize={11}
                fontWeight={700} fill={categoryColors[cat]}
                style={{ textTransform: 'uppercase', letterSpacing: '1px', userSelect: 'none' }}
              >{cat.toUpperCase()}</text>
            ))}

            {/* Circles */}
            <AnimatePresence>
              {nodes.map(node => {
                const pos = positions[node.id];
                if (!pos) return null;
                const isHov = hoveredId === node.id;
                const dimmed = hoveredId && !isHov;

                return (
                  <motion.g
                    key={node.id}
                    animate={{ x: pos.x, y: pos.y }}
                    transition={{ type: 'spring', stiffness: 60, damping: 14 }}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <circle
                      r={node.r}
                      fill={node.color}
                      fillOpacity={dimmed ? 0.15 : isHov ? 0.95 : 0.65}
                      stroke={node.color}
                      strokeWidth={isHov ? 2.5 : 1}
                      strokeOpacity={dimmed ? 0.2 : 0.8}
                    />
                    {node.r >= 22 && (
                      <text
                        textAnchor="middle" dominantBaseline="central"
                        fontSize={Math.min(node.r * 0.38, 12)}
                        fill={dimmed ? 'transparent' : '#ffffff'}
                        fontWeight={700}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >#{node.rank}</text>
                    )}
                    {isHov && (
                      <text
                        y={node.r + 14}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#ffffff"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {node.title.length > 20 ? node.title.slice(0, 20) + '…' : node.title}
                      </text>
                    )}
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </svg>
        </div>

        {/* Category legend */}
        <div className={styles.legend}>
          {Object.entries(categoryColors).map(([cat, color]) => (
            <div key={cat} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color }} />
              <span style={{ textTransform: 'capitalize' }}>{cat}</span>
            </div>
          ))}
          <div className={styles.legendItem}>
            <span className={styles.legendNote}>Circle size = severity score</span>
          </div>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025 · Layout: D3 Force Simulation</p>
        </footer>
      </main>
    </div>
  );
}
