import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import 'echarts-liquidfill';
import { riskData, categoryColors } from '../data/risks.js';
import { natoSpending, regionColors, NATO_TARGET_PCT } from '../data/natoSpending.js';
import styles from './EChartsShowcase.module.css';

const YEARS = [2026, 2028, 2036];
const CATEGORIES = ['geopolitical', 'economic', 'societal', 'technological', 'environmental'];

const CAT_COLORS_ARR = CATEGORIES.map(c => categoryColors[c]);

// ── Helpers ────────────────────────────────────────────────────────────────

function getCatTotals(year) {
  const risks = riskData[year] || [];
  return CATEGORIES.map(cat => risks.filter(r => r.category === cat).reduce((s, r) => s + r.value, 0));
}

function getNATOMeets2Pct(year = 2023) {
  const meets = natoSpending.filter(c => (c[year]?.gdpPct || 0) >= NATO_TARGET_PCT).length;
  return Math.round((meets / natoSpending.length) * 100);
}

// ── Chart 1: Liquid Fill Gauge — NATO 2% target compliance ─────────────────
function LiquidGauge({ year }) {
  const pct = getNATOMeets2Pct(year) / 100;

  const option = {
    backgroundColor: '#13131f',
    series: [{
      type: 'liquidFill',
      data: [pct, pct * 0.95, pct * 0.88],
      radius: '75%',
      center: ['50%', '50%'],
      color: ['#2471a3', '#1a5276', '#154360'],
      backgroundStyle: { color: '#1e1e2e', borderColor: '#2a2a4a', borderWidth: 2 },
      label: {
        formatter: `${Math.round(pct * 100)}%\nmeet 2% target`,
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
      },
      outline: { show: true, borderDistance: 6, itemStyle: { borderColor: '#2471a3', borderWidth: 3 } },
      waveAnimation: true,
      animationDuration: 2000,
    }],
  };

  return (
    <div className={styles.chartBox}>
      <div className={styles.chartTitle}>NATO 2% GDP Target Compliance (2023)</div>
      <div className={styles.chartSub}>Percentage of members meeting the defence spending threshold</div>
      <ReactECharts option={option} style={{ height: 340 }} />
    </div>
  );
}

// ── Chart 2: Parallel Coordinates — NATO spending by country ───────────────
function ParallelCoords() {
  const countries = natoSpending
    .filter(c => c[2021] && c[2022] && c[2023])
    .sort((a, b) => (b[2023]?.gdpPct || 0) - (a[2023]?.gdpPct || 0));

  const data = countries.map(c => [
    c[2021]?.gdpPct || 0,
    c[2022]?.gdpPct || 0,
    c[2023]?.gdpPct || 0,
    c[2023]?.gdpAbsUsdBn || 0,
    c.country,
  ]);

  const rColor = c => regionColors[c.region] || '#5a5a8a';

  const option = {
    backgroundColor: '#13131f',
    parallel: {
      left: 60, right: 120, top: 60, bottom: 40,
      parallelAxisDefault: {
        nameLocation: 'end',
        nameGap: 10,
        nameTextStyle: { color: '#aaaacc', fontSize: 11 },
        axisLine: { lineStyle: { color: '#3a3a5a' } },
        axisTick: { lineStyle: { color: '#3a3a5a' } },
        axisLabel: { color: '#7f8c8d', fontSize: 10 },
        splitLine: { show: false },
      },
    },
    parallelAxis: [
      { dim: 0, name: '2021 %GDP', min: 0, max: 5 },
      { dim: 1, name: '2022 %GDP', min: 0, max: 5 },
      { dim: 2, name: '2023 %GDP', min: 0, max: 5 },
      { dim: 3, name: 'Spend $B', min: 0, max: 920 },
    ],
    series: [{
      type: 'parallel',
      lineStyle: { width: 1.5, opacity: 0.7 },
      data: data.map(d => ({
        value: d,
        lineStyle: { color: rColor(countries.find(c => c.country === d[4])) },
      })),
      emphasis: { lineStyle: { width: 3, opacity: 1 } },
    }],
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e1e2e',
      borderColor: '#3a3a5a',
      textStyle: { color: '#ffffff', fontSize: 12 },
      formatter: params => {
        const v = params.data?.value;
        if (!v) return '';
        return `<b>${v[4]}</b><br/>2021: ${v[0].toFixed(2)}%<br/>2022: ${v[1].toFixed(2)}%<br/>2023: ${v[2].toFixed(2)}%<br/>Spend: $${v[3].toFixed(1)}B`;
      },
    },
  };

  return (
    <div className={styles.chartBox}>
      <div className={styles.chartTitle}>Parallel Coordinates — NATO Defence Spending</div>
      <div className={styles.chartSub}>Each line = one NATO member. Axes: % GDP 2021, 2022, 2023, absolute spend ($B). Colour by region.</div>
      <ReactECharts option={option} style={{ height: 380 }} />
    </div>
  );
}

// ── Chart 3: ThemeRiver — WEF Risk Category Flows ─────────────────────────
function ThemeRiver() {
  const riverData = [];
  YEARS.forEach(y => {
    CATEGORIES.forEach(cat => {
      const total = (riskData[y] || []).filter(r => r.category === cat).reduce((s, r) => s + r.value, 0);
      riverData.push([String(y), total, cat.charAt(0).toUpperCase() + cat.slice(1)]);
    });
  });

  const option = {
    backgroundColor: '#13131f',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      backgroundColor: '#1e1e2e',
      borderColor: '#3a3a5a',
      textStyle: { color: '#ffffff', fontSize: 12 },
    },
    legend: {
      data: CATEGORIES.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
      textStyle: { color: '#aaaacc', fontSize: 11 },
      top: 10,
    },
    singleAxis: {
      top: 60, bottom: 50,
      type: 'category',
      data: YEARS.map(String),
      axisLine: { lineStyle: { color: '#3a3a5a' } },
      axisLabel: { color: '#aaaacc', fontSize: 13, fontWeight: 'bold' },
    },
    series: [{
      type: 'themeRiver',
      data: riverData,
      emphasis: { focus: 'series' },
      label: { show: true, color: '#ffffff', fontSize: 10 },
      color: CAT_COLORS_ARR,
    }],
  };

  return (
    <div className={styles.chartBox}>
      <div className={styles.chartTitle}>ThemeRiver — WEF Risk Category Flows</div>
      <div className={styles.chartSub}>Stream width encodes total category severity. Watch geopolitical give way to environmental by 2036.</div>
      <ReactECharts option={option} style={{ height: 300 }} />
    </div>
  );
}

// ── Chart 4: Radar with animation — Category comparison ───────────────────
function AnimatedRadar({ yearIndex }) {
  const year = YEARS[yearIndex];
  const totals = getCatTotals(year);
  const catLabels = CATEGORIES.map(c => c.charAt(0).toUpperCase() + c.slice(1));

  const option = {
    backgroundColor: '#13131f',
    color: CAT_COLORS_ARR,
    radar: {
      indicator: CATEGORIES.map((c, i) => ({ name: catLabels[i], max: 25 })),
      axisName: { color: '#aaaacc', fontSize: 11 },
      splitLine: { lineStyle: { color: '#2a2a4a' } },
      splitArea: { areaStyle: { color: ['#1a1a2e', '#13131f'] } },
      axisLine: { lineStyle: { color: '#2a2a4a' } },
    },
    series: YEARS.map((y, yi) => ({
      type: 'radar',
      name: String(y),
      data: [{
        value: getCatTotals(y),
        name: String(y),
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: yi === yearIndex ? 3 : 1.5, opacity: yi === yearIndex ? 1 : 0.3 },
        areaStyle: { opacity: yi === yearIndex ? 0.25 : 0.05 },
        itemStyle: { color: ['#e67e22', '#3498db', '#27ae60'][yi] },
      }],
    })),
    tooltip: {
      backgroundColor: '#1e1e2e',
      borderColor: '#3a3a5a',
      textStyle: { color: '#ffffff', fontSize: 12 },
    },
    legend: {
      data: YEARS.map(String),
      textStyle: { color: '#aaaacc', fontSize: 11 },
      bottom: 5,
    },
    animation: true,
    animationDuration: 600,
    animationEasing: 'cubicOut',
  };

  return (
    <div className={styles.chartBox}>
      <div className={styles.chartTitle}>ECharts Radar — WEF Category Profiles</div>
      <div className={styles.chartSub}>All three years overlaid. Selected year is highlighted; others are faint.</div>
      <ReactECharts option={option} style={{ height: 340 }} />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function EChartsShowcase() {
  const [yearIndex, setYearIndex] = useState(0);
  const [activeChart, setActiveChart] = useState('all');

  const CHARTS = ['all', 'gauge', 'parallel', 'river', 'radar'];

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>ECharts Showcase — 4 Advanced Charts</h1>
        <p className={styles.subtitle}>
          Apache ECharts powered by a single React wrapper. Liquid Fill Gauge · Parallel Coordinates ·
          ThemeRiver · Animated Radar. All interactive, all hardware-accelerated.
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.controlsBar}>
          <div className={styles.chartTabs}>
            {CHARTS.map(c => (
              <button key={c} className={`${styles.tab} ${activeChart === c ? styles.tabActive : ''}`} onClick={() => setActiveChart(c)}>
                {c === 'all' ? 'All Charts' : c === 'gauge' ? 'Liquid Gauge' : c === 'parallel' ? 'Parallel' : c === 'river' ? 'ThemeRiver' : 'Radar'}
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
          {(activeChart === 'all' || activeChart === 'gauge') && <LiquidGauge year={2023} />}
          {(activeChart === 'all' || activeChart === 'parallel') && <ParallelCoords />}
          {(activeChart === 'all' || activeChart === 'river') && <ThemeRiver />}
          {(activeChart === 'all' || activeChart === 'radar') && <AnimatedRadar yearIndex={yearIndex} />}
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025 · NATO Defence Expenditure · Powered by Apache ECharts (Apache 2.0)</p>
        </footer>
      </main>
    </div>
  );
}
