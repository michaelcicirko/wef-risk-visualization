import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GraphCanvas, darkTheme } from 'reagraph';
import styles from './DemocracyHierarchy3D.module.css';

const LEVEL_COLORS = {
  root: '#f1c40f',
  sector: '#e74c3c',
  subIndustry: '#3498db',
  company: '#2ecc71',
};

const SECTOR_COLORS = {
  'Information Technology': '#00d2ff',
  'Health Care': '#e74c3c',
  'Financials': '#f39c12',
  'Consumer Discretionary': '#9b59b6',
  'Communication Services': '#1abc9c',
  'Industrials': '#e67e22',
  'Consumer Staples': '#27ae60',
  'Energy': '#c0392b',
  'Utilities': '#2980b9',
  'Real Estate': '#8e44ad',
  'Materials': '#d35400',
};

const MAX_COMPANIES = 100;
const MAX_PER_SUB = 2;

function buildGraphFromTree(tree) {
  const nodes = [];
  const edges = [];

  // Count total companies we'll actually include
  let companyBudget = MAX_COMPANIES;

  const totalCompanies = Math.min(MAX_COMPANIES, tree.children.reduce((s, c) => s + (c.companyCount || 0), 0));
  nodes.push({
    id: tree.id,
    label: tree.label,
    fill: LEVEL_COLORS.root,
    data: { level: 'root', count: totalCompanies, size: 14 },
  });

  tree.children.forEach((sector) => {
    const sColor = SECTOR_COLORS[sector.label] || '#95a5a6';

    // Only include sub-industries that have companies left in budget
    const includedSubs = [];

    sector.children.forEach((sub) => {
      if (companyBudget <= 0) return;
      const take = Math.min(sub.children.length, MAX_PER_SUB, companyBudget);
      if (take > 0) {
        includedSubs.push({ ...sub, children: sub.children.slice(0, take), totalInSub: sub.children.length });
        companyBudget -= take;
      }
    });

    if (includedSubs.length === 0) return;

    const sectorCompanyCount = includedSubs.reduce((s, sub) => s + sub.children.length, 0);
    const sectorSize = 5 + Math.sqrt(sectorCompanyCount) * 1.5;

    nodes.push({
      id: sector.id,
      label: sector.label,
      fill: sColor,
      data: { level: 'sector', count: sector.companyCount, size: sectorSize },
    });
    edges.push({ id: `${tree.id}-${sector.id}`, source: tree.id, target: sector.id });

    includedSubs.forEach((sub) => {
      const subSize = 3 + Math.sqrt(sub.children.length) * 1.2;

      nodes.push({
        id: sub.id,
        label: sub.label,
        fill: sColor,
        opacity: 0.7,
        data: { level: 'subIndustry', count: sub.totalInSub, sector: sector.label, size: subSize },
      });
      edges.push({ id: `${sector.id}-${sub.id}`, source: sector.id, target: sub.id });

      sub.children.forEach((co) => {
        nodes.push({
          id: co.id,
          label: co.label,
          fill: sColor,
          opacity: 0.6,
          data: { level: 'company', fullName: co.fullName, founded: co.founded, hq: co.hq, sector: sector.label, size: 2 },
        });
        edges.push({ id: `${sub.id}-${co.id}`, source: sub.id, target: co.id });
      });
    });
  });

  return { nodes, edges };
}

export default function DemocracyHierarchy3D() {
  const graphRef = useRef(null);
  const [treeData, setTreeData] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/sp500-tree.json')
      .then((r) => r.json())
      .then(setTreeData);
  }, []);

  const { nodes, edges } = useMemo(() => {
    if (!treeData) return { nodes: [], edges: [] };
    return buildGraphFromTree(treeData);
  }, [treeData]);

  // Auto-center graph after layout settles
  useEffect(() => {
    if (nodes.length > 0 && graphRef.current) {
      const timer = setTimeout(() => {
        graphRef.current?.centerGraph();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [nodes]);

  const handleCenterGraph = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.centerGraph();
    }
  }, []);

  if (!treeData) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Link to="/" className={styles.backLink}>← Dashboard</Link>
          <h1 className={styles.title}>S&P 500 Sector Hierarchy — 3D Tree</h1>
          <p className={styles.subtitle}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>S&P 500 Sector Hierarchy — 3D Tree</h1>
        <p className={styles.subtitle}>
          {nodes.length} nodes across 4 hierarchy levels — S&P 500 → GICS Sector → Sub-Industry → Company. Click a sector or sub-industry to expand/collapse. Orbit with mouse drag, zoom with scroll.
        </p>
      </div>
      <div className={styles.graphWrapper}>
        <div className={styles.controls}>
          <button className={styles.controlBtn} onClick={handleCenterGraph}>Center</button>
        </div>
        <GraphCanvas
          ref={graphRef}
          nodes={nodes}
          edges={edges}
          layoutType="treeTd3d"
          cameraMode="rotate"
          edgeArrowPosition="none"
          sizingType="attribute"
          sizingAttribute="size"
          minNodeSize={2}
          maxNodeSize={15}
          labelType="auto"
          onNodeClick={(node) => setSelected(node)}
          theme={{
            ...darkTheme,
            canvas: {
              background: '#080812',
              fog: '#080812',
            },
          }}
        />
        {selected && selected.data && (
          <div className={styles.infoPanel}>
            <h3 className={styles.infoPanelTitle}>{selected.label}</h3>
            {selected.data.fullName && <p className={styles.infoPanelRow}>{selected.data.fullName}</p>}
            {selected.data.sector && <p className={styles.infoPanelRow}>Sector: {selected.data.sector}</p>}
            {selected.data.founded && <p className={styles.infoPanelRow}>Founded: {selected.data.founded}</p>}
            {selected.data.hq && <p className={styles.infoPanelRow}>HQ: {selected.data.hq}</p>}
            {selected.data.count != null && <p className={styles.infoPanelRow}>Companies: {selected.data.count}</p>}
          </div>
        )}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: LEVEL_COLORS.root }} />
          Root (S&P 500)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#e74c3c' }} />
          Sector (11)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#3498db' }} />
          Sub-Industry (~127)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#2ecc71' }} />
          Company (503)
        </span>
      </div>
    </div>
  );
}
