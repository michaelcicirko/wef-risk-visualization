import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { SigmaContainer, useLoadGraph, useSigma } from '@react-sigma/core';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import '@react-sigma/core/lib/style.css';
import { riskNodes, riskEdges } from '../data/riskNetwork.js';
import { categoryColors } from '../data/risks.js';
import styles from './SigmaGraph.module.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

function degreeOf(id) {
  return riskEdges.filter(e => e.source === id || e.target === id).length;
}

// Build the graphology graph and run ForceAtlas2 layout
function buildGraph(filter) {
  const g = new Graph({ type: 'directed', multi: false });

  riskNodes.forEach(n => {
    const deg = degreeOf(n.id);
    g.addNode(n.id, {
      label: n.label.replace('\n', ' '),
      color: categoryColors[n.category] || '#5a5a8a',
      size: 5 + deg * 2.5,
      category: n.category,
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
    });
  });

  riskEdges.forEach(e => {
    if (filter && filter !== 'all' && 
        riskNodes.find(n => n.id === e.source)?.category !== filter &&
        riskNodes.find(n => n.id === e.target)?.category !== filter) return;
    if (!g.hasEdge(e.source, e.target)) {
      g.addDirectedEdge(e.source, e.target, {
        size: e.strength,
        color: `${categoryColors[riskNodes.find(n => n.id === e.source)?.category] || '#5a5a8a'}88`,
      });
    }
  });

  // Run ForceAtlas2 layout iterations
  forceAtlas2.assign(g, {
    iterations: 150,
    settings: {
      gravity: 1,
      scalingRatio: 12,
      strongGravityMode: false,
      barnesHutOptimize: false,
    },
  });

  return g;
}

// ── Inner loader component (runs inside SigmaContainer context) ──────────────
function GraphLoader({ filter, onNodeClick, focusNode, setNodeCount, setEdgeCount }) {
  const loadGraph = useLoadGraph();
  const sigma = useSigma();

  useEffect(() => {
    const g = buildGraph(filter);
    loadGraph(g);
    setNodeCount(g.order);
    setEdgeCount(g.size);

    // Node hover: highlight neighbours
    sigma.on('enterNode', ({ node }) => {
      sigma.getGraph().nodes().forEach(n => {
        const isNeighbour = sigma.getGraph().neighbors(node).includes(n) || n === node;
        sigma.getGraph().setNodeAttribute(n, 'highlighted', isNeighbour);
        sigma.getGraph().setNodeAttribute(n, 'color',
          isNeighbour
            ? categoryColors[sigma.getGraph().getNodeAttribute(n, 'category')] || '#5a5a8a'
            : '#1e1e2e'
        );
      });
    });

    sigma.on('leaveNode', () => {
      sigma.getGraph().nodes().forEach(n => {
        sigma.getGraph().setNodeAttribute(n, 'highlighted', false);
        sigma.getGraph().setNodeAttribute(n, 'color',
          categoryColors[sigma.getGraph().getNodeAttribute(n, 'category')] || '#5a5a8a'
        );
      });
    });

    sigma.on('clickNode', ({ node }) => {
      const attrs = sigma.getGraph().getNodeAttributes(node);
      onNodeClick({ id: node, ...attrs });
    });

    sigma.on('clickStage', () => onNodeClick(null));

    return () => sigma.removeAllListeners();
  }, [filter]);

  return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SigmaGraph() {
  const [filter, setFilter]     = useState('all');
  const [focusNode, setFocusNode] = useState(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);

  const FILTERS = ['all', 'geopolitical', 'economic', 'societal', 'technological', 'environmental'];

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Risk Knowledge Graph — Sigma.js</h1>
        <p className={styles.subtitle}>
          WEF global risks as a WebGL network rendered by Sigma.js with ForceAtlas2 layout.
          Hover a node to highlight its neighbours · Click to inspect · Filter by category.
          Node size = connection degree. Edge width = causal strength.
        </p>
      </header>

      <main className={styles.main}>
        {/* Stats + filter */}
        <div className={styles.controlsBar}>
          <div className={styles.stats}>
            <span className={styles.statBadge}>{nodeCount} nodes</span>
            <span className={styles.statBadge}>{edgeCount} edges</span>
          </div>
          <div className={styles.filterGroup}>
            {FILTERS.map(f => (
              <button
                key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
                style={filter === f && f !== 'all' ? { borderColor: categoryColors[f], color: categoryColors[f] } : {}}
                onClick={() => { setFilter(f); setFocusNode(null); }}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Info card */}
        <div className={`${styles.infoCard} ${focusNode ? styles.infoCardVisible : ''}`}>
          {focusNode ? (
            <>
              <span className={styles.infoDot} style={{ background: focusNode.color }} />
              <span className={styles.infoTitle}>{focusNode.label}</span>
              <span className={styles.infoCat} style={{ color: focusNode.color }}>{focusNode.category}</span>
              <span className={styles.infoScore}>Degree: {Math.round((focusNode.size - 5) / 2.5)}</span>
            </>
          ) : (
            <span className={styles.infoHint}>Hover a node to highlight connections · Click to inspect</span>
          )}
        </div>

        {/* Graph canvas */}
        <div className={styles.graphWrapper}>
          <SigmaContainer
            key={filter}
            style={{ background: '#0d0d1a', width: '100%', height: '560px' }}
            settings={{
              renderEdgeLabels: false,
              defaultEdgeType: 'arrow',
              defaultNodeType: 'circle',
              labelFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              labelSize: 11,
              labelColor: { color: '#aaaacc' },
              edgeColor: { attribute: 'color' },
              nodeColor: { attribute: 'color' },
              minCameraRatio: 0.1,
              maxCameraRatio: 10,
              zIndex: true,
            }}
          >
            <GraphLoader
              filter={filter}
              onNodeClick={setFocusNode}
              focusNode={focusNode}
              setNodeCount={setNodeCount}
              setEdgeCount={setEdgeCount}
            />
          </SigmaContainer>
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          {Object.entries(categoryColors).map(([cat, color]) => (
            <div key={cat} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <span style={{ textTransform: 'capitalize' }}>{cat}</span>
            </div>
          ))}
          <div className={styles.legendItem}>
            <span className={styles.legendNote}>Node size = degree · Edge width = strength</span>
          </div>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025 · Rendered with Sigma.js + Graphology · Layout: ForceAtlas2</p>
        </footer>
      </main>
    </div>
  );
}
