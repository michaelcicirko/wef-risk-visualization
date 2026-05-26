import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import styles from './GPUForceNetwork.module.css';

const NODE_COUNT = 2000;
const EDGE_COUNT = 5000;
const CATEGORIES = ['Economic', 'Environmental', 'Geopolitical', 'Societal', 'Technological'];
const CATEGORY_COLORS = {
  Economic: '#f39c12',
  Environmental: '#2ecc71',
  Geopolitical: '#e74c3c',
  Societal: '#3498db',
  Technological: '#9b59b6',
};

function buildGraph() {
  const graph = new Graph();

  for (let i = 0; i < NODE_COUNT; i++) {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    graph.addNode(`n${i}`, {
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
      size: 1 + Math.random() * 3,
      color: CATEGORY_COLORS[cat],
      label: i < 20 ? `Risk-${i}` : undefined,
      category: cat,
    });
  }

  for (let i = 0; i < EDGE_COUNT; i++) {
    const src = `n${Math.floor(Math.random() * NODE_COUNT)}`;
    const tgt = `n${Math.floor(Math.random() * NODE_COUNT)}`;
    if (src !== tgt && !graph.hasEdge(src, tgt)) {
      graph.addEdge(src, tgt, { size: 0.3, color: 'rgba(255,255,255,0.05)' });
    }
  }

  return graph;
}

export default function GPUForceNetwork() {
  const containerRef = useRef(null);
  const sigmaRef = useRef(null);
  const graphRef = useRef(null);
  const [gravity, setGravity] = useState(1);
  const layoutRunning = useRef(false);
  const cancelLayout = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = buildGraph();
    graphRef.current = graph;

    const renderer = new Sigma(graph, containerRef.current, {
      renderLabels: true,
      labelColor: { color: '#e0e0e0' },
      labelFont: 'sans-serif',
      labelSize: 10,
      labelRenderedSizeThreshold: 8,
      defaultEdgeType: 'line',
    });

    sigmaRef.current = renderer;

    const settings = forceAtlas2.inferSettings(graph);
    settings.gravity = gravity;
    settings.scalingRatio = 2;
    settings.barnesHutOptimize = true;

    const positions = forceAtlas2(graph, {
      iterations: 100,
      settings,
    });

    Object.entries(positions).forEach(([node, pos]) => {
      graph.setNodeAttribute(node, 'x', pos.x);
      graph.setNodeAttribute(node, 'y', pos.y);
    });

    renderer.refresh();

    return () => {
      renderer.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    };
  }, []);

  const handleGravityChange = useCallback((e) => {
    const val = parseFloat(e.target.value);
    setGravity(val);

    const graph = graphRef.current;
    if (!graph) return;

    const settings = forceAtlas2.inferSettings(graph);
    settings.gravity = val;
    settings.scalingRatio = 2;
    settings.barnesHutOptimize = true;

    const positions = forceAtlas2(graph, {
      iterations: 50,
      settings,
    });

    Object.entries(positions).forEach(([node, pos]) => {
      graph.setNodeAttribute(node, 'x', pos.x);
      graph.setNodeAttribute(node, 'y', pos.y);
    });

    if (sigmaRef.current) sigmaRef.current.refresh();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>GPU Force Network</h1>
        <p className={styles.subtitle}>
          {NODE_COUNT.toLocaleString()} micro-risk nodes with {EDGE_COUNT.toLocaleString()} edges rendered via Sigma.js WebGL. Adjust gravity to invert clustering dynamics.
        </p>
      </div>
      <div className={styles.graphWrapper}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        <div className={styles.controls}>
          <span className={styles.sliderLabel}>Gravity</span>
          <input
            type="range"
            className={styles.slider}
            min="0.1"
            max="20"
            step="0.1"
            value={gravity}
            onChange={handleGravityChange}
          />
          <span className={styles.sliderValue}>{gravity.toFixed(1)}</span>
        </div>
      </div>
      <div className={styles.stats}>
        <span className={styles.stat}>Nodes: <span className={styles.statValue}>{NODE_COUNT.toLocaleString()}</span></span>
        <span className={styles.stat}>Edges: <span className={styles.statValue}>{EDGE_COUNT.toLocaleString()}</span></span>
        <span className={styles.stat}>Renderer: <span className={styles.statValue}>Sigma.js WebGL</span></span>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <span key={cat} className={styles.stat}>
            <span style={{ color }}>{cat}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
