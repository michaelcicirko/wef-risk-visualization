import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveMarimekko } from '@nivo/marimekko';
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import { ResponsiveBump } from '@nivo/bump';
import { riskData, categoryColors } from '../data/risks.js';
import styles from './NivoShowcase.module.css';

const YEARS = [2026, 2028, 2036];
const CATEGORIES = ['geopolitical', 'economic', 'societal', 'technological', 'environmental'];

const CAT_LABEL = c => c.charAt(0).toUpperCase() + c.slice(1);

// ── Marimekko data ───────────────────────────────────────────────────────────
// width = total category severity (as fraction of all), stacked bars = individual risks
// IMPORTANT: every row must contain ALL dimension keys (pad absent ones with 0)
// otherwise d3-stack produces undefined → bars collapse to zero.
function buildMarimekkoData(year) {
  const risks = riskData[year] || [];
  const allKeys = [...new Set(risks.map(r => r.id))];

  return CATEGORIES.map(cat => {
    const catRisks = risks.filter(r => r.category === cat);
    const obj = { id: CAT_LABEL(cat) };
    // Fill every key with 0 first, then set real values
    allKeys.forEach(k => { obj[k] = 0; });
    catRisks.forEach(r => { obj[r.id] = r.value; });
    obj._total = catRisks.reduce((s, r) => s + r.value, 0);
    return obj;
  }).sort((a, b) => b._total - a._total);
}

function getMarimekkoKeys(year) {
  const risks = riskData[year] || [];
  // Use stable r.id slugs as dimension keys (no truncation collisions)
  return [...new Set(risks.map(r => r.id))];
}

// ── Circle Packing data ──────────────────────────────────────────────────────
function buildCircleData(year) {
  const risks = riskData[year] || [];
  return {
    name: 'WEF Risks',
    children: CATEGORIES.map(cat => ({
      name: CAT_LABEL(cat),
      color: categoryColors[cat],
      children: risks.filter(r => r.category === cat).map(r => ({
        name: r.title.length > 20 ? r.title.slice(0, 18) + '…' : r.title,
        value: r.value,
        color: categoryColors[cat],
      })),
    })),
  };
}

// ── Bump data ────────────────────────────────────────────────────────────────
function buildBumpData() {
  const allIds = new Map();
  YEARS.forEach(y => {
    (riskData[y] || []).forEach(r => {
      if (!allIds.has(r.id)) allIds.set(r.id, { id: r.id, title: r.title, category: r.category });
    });
  });

  return [...allIds.values()].map(risk => ({
    // Use the stable slug id — guarantees uniqueness; Nivo crashes on duplicate ids
    id: risk.id,
    label: risk.title.length > 28 ? risk.title.slice(0, 26) + '…' : risk.title,
    data: YEARS.map(y => {
      const r = (riskData[y] || []).find(r => r.id === risk.id);
      return { x: String(y), y: r ? r.rank : null };
    }).filter(d => d.y !== null),
    color: categoryColors[risk.category] || '#5a5a8a',
  })).filter(s => s.data.length >= 2);
}

const nivoTheme = {
  background: '#13131f',
  textColor: '#aaaacc',
  fontSize: 11,
  axis: {
    domain: { line: { stroke: '#3a3a5a', strokeWidth: 1 } },
    ticks: { line: { stroke: '#3a3a5a' }, text: { fill: '#7f8c8d', fontSize: 10 } },
    legend: { text: { fill: '#aaaacc', fontSize: 12 } },
  },
  grid: { line: { stroke: '#1a1a2e', strokeWidth: 1 } },
  legends: { text: { fill: '#aaaacc', fontSize: 10 } },
  tooltip: {
    container: {
      background: '#1e1e2e',
      color: '#ffffff',
      fontSize: 12,
      borderRadius: 6,
      border: '1px solid #3a3a5a',
    },
  },
};

// ── Charts ───────────────────────────────────────────────────────────────────

function MarimekkoChart({ year }) {
  const data = useMemo(() => buildMarimekkoData(year), [year]);
  const keys = useMemo(() => getMarimekkoKeys(year), [year]);

  // Map each r.id → its category colour (with slight lightness variation per rank within category)
  const colourMap = useMemo(() => {
    const map = {};
    CATEGORIES.forEach(cat => {
      const base = categoryColors[cat];
      const catRisks = (riskData[year] || []).filter(r => r.category === cat);
      catRisks.forEach((r, i) => {
        const opacity = Math.round(255 * (0.55 + 0.45 * (i / Math.max(catRisks.length - 1, 1))));
        map[r.id] = base + opacity.toString(16).padStart(2, '0');
      });
    });
    return map;
  }, [year]);

  return (
    <div className={styles.chartBox}>
      <div className={styles.chartTitle}>Marimekko — Risk Categories × Risks</div>
      <div className={styles.chartSub}>Column width = category share of total severity. Bar height = individual risk weight within the category.</div>
      <div style={{ height: 400 }}>
        <ResponsiveMarimekko
          data={data}
          id="id"
          value="_total"
          dimensions={keys.map(k => ({ id: k, value: k }))}
          colors={bar => colourMap[bar.id] || '#5a5a8a'}
          theme={nivoTheme}
          margin={{ top: 40, right: 20, bottom: 60, left: 60 }}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            legendPosition: 'middle',
            legend: 'Risk Category',
            legendOffset: 42,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            legendPosition: 'middle',
            legend: 'Severity Score',
            legendOffset: -48,
          }}
          animate
          motionConfig="gentle"
          tooltip={({ bar }) => (
            <div style={{ padding: '8px 12px', background: '#1e1e2e', border: '1px solid #3a3a5a', borderRadius: 6, color: '#fff', fontSize: 12 }}>
              <strong>{bar.datum.id}</strong><br />
              Total severity: {bar.datum._total}
            </div>
          )}
        />
      </div>
    </div>
  );
}

function CirclePackingChart({ year }) {
  const data = useMemo(() => buildCircleData(year), [year]);

  return (
    <div className={styles.chartBox}>
      <div className={styles.chartTitle}>Circle Packing — WEF Risk Hierarchy</div>
      <div className={styles.chartSub}>Outer circles = risk categories. Inner circles = individual risks. Size = severity score.</div>
      <div style={{ height: 420 }}>
        <ResponsiveCirclePacking
          data={data}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          id="name"
          value="value"
          colors={node => node.data.color || '#5a5a8a'}
          childColor={{ from: 'color', modifiers: [['brighter', 0.4]] }}
          padding={4}
          enableLabels
          label={node => node.data.name}
          labelSkipRadius={16}
          labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
          borderWidth={1}
          borderColor={{ from: 'color', modifiers: [['darker', 0.5]] }}
          animate
          motionConfig="gentle"
          theme={nivoTheme}
          tooltip={({ data }) => (
            <div style={{ padding: '8px 12px', background: '#1e1e2e', border: '1px solid #3a3a5a', borderRadius: 6, color: '#fff', fontSize: 12 }}>
              <strong>{data.name}</strong>
              {data.value && <><br />Score: {data.value}</>}
            </div>
          )}
        />
      </div>
    </div>
  );
}

function BumpChart() {
  const series = useMemo(() => buildBumpData(), []);

  return (
    <div className={styles.chartBox}>
      <div className={styles.chartTitle}>Bump Chart (Nivo) — Risk Rank Trajectories</div>
      <div className={styles.chartSub}>Each line traces a risk's rank position across 2026 → 2028 → 2036. Hover to highlight. Colour by category.</div>
      <div style={{ height: 460 }}>
        <ResponsiveBump
          data={series}
          colors={({ id }) => {
            const match = series.find(s => s.id === id);
            return match?.color || '#5a5a8a';
          }}
          margin={{ top: 40, right: 200, bottom: 50, left: 60 }}
          axisTop={{ tickSize: 5, tickPadding: 5 }}
          axisBottom={{ tickSize: 5, tickPadding: 5, legend: 'Year', legendPosition: 'middle', legendOffset: 36 }}
          axisLeft={{ tickSize: 5, tickPadding: 5, legend: 'Rank', legendPosition: 'middle', legendOffset: -44 }}
          lineWidth={2}
          activeLineWidth={5}
          inactiveLineWidth={1}
          inactiveOpacity={0.2}
          pointSize={8}
          activePointSize={14}
          inactivePointSize={4}
          pointColor={{ theme: 'background' }}
          pointBorderWidth={2}
          activePointBorderWidth={2}
          pointBorderColor={{ from: 'serie.color' }}
          enableGridX={false}
          theme={nivoTheme}
          animate
          motionConfig="gentle"
          tooltip={({ serie }) => (
            <div style={{ padding: '8px 12px', background: '#1e1e2e', border: '1px solid #3a3a5a', borderRadius: 6, color: '#fff', fontSize: 12 }}>
              <strong>{serie.label || serie.id}</strong>
            </div>
          )}
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NivoShowcase() {
  const [yearIndex, setYearIndex] = useState(0);
  const [activeChart, setActiveChart] = useState('all');

  const year = YEARS[yearIndex];
  const TABS = ['all', 'marimekko', 'circles', 'bump'];

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Nivo Showcase — Marimekko · Circle Packing · Bump</h1>
        <p className={styles.subtitle}>
          Three chart types from Nivo — React-native with built-in spring animation, dark theme, and interactive tooltips.
          All zero D3 code: fully declarative components.
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.controlsBar}>
          <div className={styles.tabs}>
            {TABS.map(t => (
              <button key={t} className={`${styles.tab} ${activeChart === t ? styles.tabActive : ''}`} onClick={() => setActiveChart(t)}>
                {t === 'all' ? 'All Charts' : t === 'marimekko' ? 'Marimekko' : t === 'circles' ? 'Circle Packing' : 'Bump'}
              </button>
            ))}
          </div>
          <div className={styles.yearPills}>
            {YEARS.map((y, i) => (
              <button key={y} className={`${styles.yearPill} ${i === yearIndex ? styles.yearPillActive : ''}`} onClick={() => setYearIndex(i)}>{y}</button>
            ))}
          </div>
        </div>

        <div className={styles.chartsGrid}>
          {(activeChart === 'all' || activeChart === 'marimekko') && <MarimekkoChart year={year} />}
          {(activeChart === 'all' || activeChart === 'circles')   && <CirclePackingChart year={year} />}
          {(activeChart === 'all' || activeChart === 'bump')      && <BumpChart />}
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025 · Powered by Nivo (MIT)</p>
        </footer>
      </main>
    </div>
  );
}
