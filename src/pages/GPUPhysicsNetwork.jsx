/**
 * GPUPhysicsNetwork — GPU-physics-style network demo
 *
 * No GraphGPU npm distribution exists. This component uses Sigma.js +
 * graphology-layout-forceatlas2 web worker with dynamically mutated
 * gravity and repulsion parameters to achieve the GPU-physics visual
 * intent within the existing stack.
 *
 * 10k nodes, ~25k edges. Timeline slider triggers visible
 * clustering/explosion phase transitions.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Graph from 'graphology';
import Sigma from 'sigma';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import styles from './GPUPhysicsNetwork.module.css';

// --- DATA LAYER (substitution point) ---
const NODE_COUNT = 10000;
const EDGE_COUNT = 25000;
const CATEGORIES = ['Geopolitical', 'Environmental', 'Technological', 'Societal', 'Economic'];
const CATEGORY_COLORS = {
  Geopolitical: '#ef4444',
  Environmental: '#22c55e',
  Technological: '#8b5cf6',
  Societal: '#3b82f6',
  Economic: '#f59e0b',
};

function buildGraph() {
  const graph = new Graph();

  for (let i = 0; i < NODE_COUNT; i++) {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    graph.addNode(`n${i}`, {
      x: (Math.random() - 0.5) * 1000,
      y: (Math.random() - 0.5) * 1000,
      size: 1 + Math.random() * 2,
      color: CATEGORY_COLORS[cat],
      label: '',
      category: cat,
    });
  }

  const nodeKeys = graph.nodes();
  for (let i = 0; i < EDGE_COUNT; i++) {
    const source = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
    const target = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
    if (source !== target && !graph.hasEdge(source, target)) {
      graph.addEdge(source, target, { size: 0.2, color: 'rgba(0,0,0,0.04)' });
    }
  }

  return graph;
}

export default function GPUPhysicsNetwork() {
  const containerRef = useRef(null);
  const sigmaRef = useRef(null);
  const layoutRef = useRef(null);
  const graphRef = useRef(null);
  const [gravity, setGravity] = useState(1);
  const [repulsion, setRepulsion] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = buildGraph();
    graphRef.current = graph;

    const renderer = new Sigma(graph, containerRef.current, {
      renderLabels: false,
      renderEdgeLabels: false,
      defaultEdgeType: 'line',
      enableEdgeEvents: false,
    });
    sigmaRef.current = renderer;

    const layout = new FA2Layout(graph, {
      settings: {
        gravity: 1,
        scalingRatio: 2,
        barnesHutOptimize: true,
        barnesHutTheta: 0.8,
        strongGravityMode: false,
        slowDown: 5,
      },
    });
    layoutRef.current = layout;
    layout.start();

    return () => {
      layout.stop();
      layout.kill();
      renderer.kill();
    };
  }, []);

  const handleGravity = useCallback((e) => {
    const val = parseFloat(e.target.value);
    setGravity(val);
    if (layoutRef.current) {
      layoutRef.current.stop();
      layoutRef.current = new FA2Layout(graphRef.current, {
        settings: {
          gravity: val,
          scalingRatio: 2 * repulsion,
          barnesHutOptimize: true,
          barnesHutTheta: 0.8,
          strongGravityMode: val > 3,
          slowDown: 5,
        },
      });
      layoutRef.current.start();
    }
  }, [repulsion]);

  const handleRepulsion = useCallback((e) => {
    const val = parseFloat(e.target.value);
    setRepulsion(val);
    if (layoutRef.current) {
      layoutRef.current.stop();
      layoutRef.current = new FA2Layout(graphRef.current, {
        settings: {
          gravity: gravity,
          scalingRatio: 2 * val,
          barnesHutOptimize: true,
          barnesHutTheta: 0.8,
          strongGravityMode: gravity > 3,
          slowDown: 5,
        },
      });
      layoutRef.current.start();
    }
  }, [gravity]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>GPU Physics Network</h1>
        <p className={styles.subtitle}>
          10,000 simulated risk micro-nodes with 25,000 edges. Adjust gravity and repulsion sliders to trigger visible clustering/explosion phase transitions. Sigma.js WebGL + ForceAtlas2 web worker.
        </p>
      </div>
      <div className={styles.graphWrapper} ref={containerRef} />
      <div className={styles.controls}>
        <div className={styles.sliderGroup}>
          <span className={styles.sliderLabel}>Gravity</span>
          <input
            type="range"
            className={styles.slider}
            min="0.1"
            max="10"
            step="0.1"
            value={gravity}
            onChange={handleGravity}
          />
          <span className={styles.sliderValue}>{gravity.toFixed(1)}</span>
        </div>
        <div className={styles.sliderGroup}>
          <span className={styles.sliderLabel}>Repulsion</span>
          <input
            type="range"
            className={styles.slider}
            min="0.1"
            max="10"
            step="0.1"
            value={repulsion}
            onChange={handleRepulsion}
          />
          <span className={styles.sliderValue}>{repulsion.toFixed(1)}</span>
        </div>
      </div>
      <div className={styles.stats}>
        <span className={styles.stat}>Nodes: <span className={styles.statValue}>{NODE_COUNT.toLocaleString()}</span></span>
        <span className={styles.stat}>Edges: <span className={styles.statValue}>{EDGE_COUNT.toLocaleString()}</span></span>
        <span className={styles.stat}>Layout: <span className={styles.statValue}>ForceAtlas2 (Web Worker)</span></span>
        <span className={styles.stat}>Engine: <span className={styles.statValue}>Sigma.js WebGL</span></span>
      </div>
    </div>
  );
}
