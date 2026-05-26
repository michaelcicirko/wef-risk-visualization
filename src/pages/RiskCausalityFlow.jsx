import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Graph } from '@antv/g6';
import styles from './RiskCausalityFlow.module.css';

const RISK_NODES = [
  { id: 'geo-conflict', label: 'Interstate Conflict', category: 'Geopolitical' },
  { id: 'geo-fragmentation', label: 'Geo-economic Fragmentation', category: 'Geopolitical' },
  { id: 'misinfo', label: 'Misinformation', category: 'Technological' },
  { id: 'cyber', label: 'Cyber Insecurity', category: 'Technological' },
  { id: 'ai-risk', label: 'AI Adverse Outcomes', category: 'Technological' },
  { id: 'climate-extreme', label: 'Extreme Weather', category: 'Environmental' },
  { id: 'biodiversity', label: 'Biodiversity Loss', category: 'Environmental' },
  { id: 'pollution', label: 'Pollution', category: 'Environmental' },
  { id: 'cost-living', label: 'Cost of Living Crisis', category: 'Economic' },
  { id: 'debt-crisis', label: 'Debt Crisis', category: 'Economic' },
  { id: 'inequality', label: 'Inequality', category: 'Societal' },
  { id: 'migration', label: 'Involuntary Migration', category: 'Societal' },
  { id: 'erosion-cohesion', label: 'Erosion of Social Cohesion', category: 'Societal' },
  { id: 'infectious', label: 'Infectious Diseases', category: 'Societal' },
  { id: 'state-collapse', label: 'State Collapse', category: 'Geopolitical' },
];

const CATEGORY_COLORS = {
  Geopolitical: '#e74c3c',
  Technological: '#3498db',
  Environmental: '#27ae60',
  Economic: '#f39c12',
  Societal: '#9b59b6',
};

function buildEdgesForPhase(phase) {
  const baseEdges = [
    { source: 'geo-conflict', target: 'geo-fragmentation' },
    { source: 'geo-fragmentation', target: 'cost-living' },
    { source: 'misinfo', target: 'erosion-cohesion' },
    { source: 'cyber', target: 'geo-fragmentation' },
    { source: 'climate-extreme', target: 'migration' },
    { source: 'climate-extreme', target: 'biodiversity' },
    { source: 'biodiversity', target: 'infectious' },
    { source: 'cost-living', target: 'inequality' },
    { source: 'inequality', target: 'erosion-cohesion' },
    { source: 'erosion-cohesion', target: 'state-collapse' },
    { source: 'debt-crisis', target: 'cost-living' },
    { source: 'ai-risk', target: 'misinfo' },
    { source: 'pollution', target: 'climate-extreme' },
    { source: 'migration', target: 'erosion-cohesion' },
    { source: 'geo-conflict', target: 'migration' },
  ];

  const phaseEdges = [
    { source: 'ai-risk', target: 'cyber' },
    { source: 'state-collapse', target: 'geo-conflict' },
    { source: 'debt-crisis', target: 'geo-fragmentation' },
    { source: 'climate-extreme', target: 'cost-living' },
    { source: 'infectious', target: 'cost-living' },
  ];

  const count = Math.min(Math.floor((phase / 100) * phaseEdges.length), phaseEdges.length);
  const active = [...baseEdges, ...phaseEdges.slice(0, count)];

  return active.map((e, i) => ({
    id: `edge-${i}`,
    source: e.source,
    target: e.target,
  }));
}

export default function RiskCausalityFlow() {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    const nodes = RISK_NODES.map((n) => ({
      id: n.id,
      data: {
        label: n.label,
        category: n.category,
      },
      style: {
        fill: CATEGORY_COLORS[n.category],
        stroke: CATEGORY_COLORS[n.category],
        labelText: n.label,
        labelFill: '#e0e0e0',
        labelFontSize: 10,
        size: 28,
      },
    }));

    const edges = buildEdgesForPhase(0).map((e) => ({
      ...e,
      style: {
        stroke: '#555',
        lineWidth: 1.5,
        endArrow: true,
        lineDash: [4, 4],
      },
    }));

    const graph = new Graph({
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      data: { nodes, edges },
      layout: {
        type: 'dagre',
        rankdir: 'LR',
        nodesep: 30,
        ranksep: 80,
      },
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
      animation: true,
      theme: 'dark',
      background: '#080812',
      edge: {
        style: {
          stroke: '#555',
          lineWidth: 1.5,
          endArrow: true,
        },
      },
      node: {
        style: {
          labelPlacement: 'bottom',
          labelOffsetY: 8,
        },
      },
    });

    graph.render().then(() => {
      if (!destroyed) {
        graphRef.current = graph;
      }
    });

    return () => {
      destroyed = true;
      graphRef.current = null;
      graph.destroy();
    };
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const edges = buildEdgesForPhase(phase).map((e) => ({
      ...e,
      style: {
        stroke: '#555',
        lineWidth: 1.5,
        endArrow: true,
      },
    }));

    try {
      const currentData = graph.getData();
      graph.setData({ nodes: currentData.nodes, edges });
      graph.draw();
    } catch (err) {
      // Graph may have been destroyed during async render
    }
  }, [phase]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>WEF Risk Causality Flow</h1>
        <p className={styles.subtitle}>
          Directed graph of WEF risk cascade — edges represent causal pathways between global risks. Advance the policy timeline to reveal additional feedback loops and cascading connections.
        </p>
      </div>
      <div className={styles.graphWrapper}>
        <div ref={containerRef} className={styles.graphCanvas} />
      </div>
      <div className={styles.timelineWrapper}>
        <span className={styles.timelineLabel}>Policy Timeline</span>
        <input
          type="range"
          min="0"
          max="100"
          value={phase}
          onChange={(e) => setPhase(Number(e.target.value))}
          className={styles.timelineSlider}
        />
        <span className={styles.timelineValue}>{phase}%</span>
      </div>
      <p className={styles.info}>
        Drag to pan, scroll to zoom. Move the timeline slider to reveal additional causal connections as policy interventions fail.
      </p>
    </div>
  );
}
