import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import styles from './RiskPipelineFlow.module.css';

// --- DATA LAYER (substitution point) ---
const RISK_NODES_DATA = [
  { id: 'geo-1', label: 'Interstate Conflict', score: 0.92, category: 'Geopolitical' },
  { id: 'geo-2', label: 'State Collapse', score: 0.78, category: 'Geopolitical' },
  { id: 'env-1', label: 'Extreme Weather', score: 0.88, category: 'Environmental' },
  { id: 'env-2', label: 'Biodiversity Loss', score: 0.74, category: 'Environmental' },
  { id: 'tech-1', label: 'AI Misinformation', score: 0.85, category: 'Technological' },
  { id: 'tech-2', label: 'Cyber Attacks', score: 0.81, category: 'Technological' },
  { id: 'soc-1', label: 'Cost of Living', score: 0.83, category: 'Societal' },
  { id: 'soc-2', label: 'Forced Migration', score: 0.76, category: 'Societal' },
  { id: 'econ-1', label: 'Debt Crises', score: 0.79, category: 'Economic' },
  { id: 'econ-2', label: 'Trade Fragmentation', score: 0.71, category: 'Economic' },
  { id: 'impact-1', label: 'Humanitarian Crisis', score: 0.95, category: 'Impact' },
  { id: 'impact-2', label: 'Economic Instability', score: 0.87, category: 'Impact' },
];

const CATEGORY_COLORS = {
  Geopolitical: '#ef4444',
  Environmental: '#22c55e',
  Technological: '#8b5cf6',
  Societal: '#3b82f6',
  Economic: '#f59e0b',
  Impact: '#1a1a2e',
};

const EDGES_DATA = [
  { id: 'e1', source: 'geo-1', target: 'soc-2' },
  { id: 'e2', source: 'geo-1', target: 'econ-1' },
  { id: 'e3', source: 'geo-2', target: 'soc-2' },
  { id: 'e4', source: 'env-1', target: 'soc-1' },
  { id: 'e5', source: 'env-1', target: 'soc-2' },
  { id: 'e6', source: 'env-2', target: 'env-1' },
  { id: 'e7', source: 'tech-1', target: 'geo-1' },
  { id: 'e8', source: 'tech-2', target: 'econ-2' },
  { id: 'e9', source: 'soc-1', target: 'impact-2' },
  { id: 'e10', source: 'soc-2', target: 'impact-1' },
  { id: 'e11', source: 'econ-1', target: 'impact-2' },
  { id: 'e12', source: 'econ-2', target: 'econ-1' },
  { id: 'e13', source: 'tech-1', target: 'soc-1' },
  { id: 'e14', source: 'geo-2', target: 'impact-1' },
];

// --- LAYOUT ---
const COLUMN_X = { Geopolitical: 50, Environmental: 50, Technological: 300, Societal: 550, Economic: 550, Impact: 850 };
const COLUMN_Y_START = { Geopolitical: 50, Environmental: 300, Technological: 150, Societal: 50, Economic: 300, Impact: 150 };
const CATEGORY_OFFSET = {};

function getNodePosition(node) {
  const cat = node.category;
  if (!CATEGORY_OFFSET[cat]) CATEGORY_OFFSET[cat] = 0;
  const y = COLUMN_Y_START[cat] + CATEGORY_OFFSET[cat] * 120;
  CATEGORY_OFFSET[cat]++;
  return { x: COLUMN_X[cat], y };
}

const initialNodes = RISK_NODES_DATA.map((n) => ({
  id: n.id,
  type: 'riskNode',
  position: getNodePosition(n),
  data: { label: n.label, score: n.score, category: n.category, color: CATEGORY_COLORS[n.category] },
}));

const initialEdges = EDGES_DATA.map((e) => ({
  ...e,
  animated: true,
  style: { stroke: '#94a3b8', strokeWidth: 1.5 },
}));

// --- CUSTOM NODE ---
function RiskNode({ data }) {
  return (
    <div className={styles.riskNode}>
      <Handle type="target" position={Position.Left} style={{ background: data.color }} />
      <div className={styles.riskNodeTitle}>{data.label}</div>
      <div className={styles.riskNodeBar}>
        <div
          className={styles.riskNodeBarFill}
          style={{ width: `${data.score * 100}%`, background: data.color }}
        />
      </div>
      <div className={styles.riskNodeScore}>{(data.score * 100).toFixed(0)}% severity</div>
      <Handle type="source" position={Position.Right} style={{ background: data.color }} />
    </div>
  );
}

const nodeTypes = { riskNode: RiskNode };

// --- COMPONENT ---
export default function RiskPipelineFlow() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>Risk Pipeline Flow</h1>
        <p className={styles.subtitle}>
          Interactive node-based diagram mapping WEF systemic risk cascade. Nodes contain severity readouts; animated dashed edges represent causal flow between risk domains.
        </p>
      </div>
      <div className={styles.flowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
      <div className={styles.stats}>
        <span className={styles.stat}>Nodes: <span className={styles.statValue}>{nodes.length}</span></span>
        <span className={styles.stat}>Edges: <span className={styles.statValue}>{edges.length}</span></span>
        <span className={styles.stat}>Engine: <span className={styles.statValue}>React Flow (@xyflow/react)</span></span>
      </div>
    </div>
  );
}
