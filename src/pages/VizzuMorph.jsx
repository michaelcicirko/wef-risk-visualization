import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Vizzu from 'vizzu';
import { riskData, categoryColors } from '../data/risks.js';
import styles from './VizzuMorph.module.css';

// Build Vizzu data from WEF risks across all years
function buildVizzuData() {
  const records = [];
  [2026, 2028, 2036].forEach(year => {
    (riskData[year] || []).forEach(r => {
      records.push({
        risk: r.title.length > 30 ? r.title.slice(0, 28) + '…' : r.title,
        category: r.category.charAt(0).toUpperCase() + r.category.slice(1),
        year: String(year),
        score: r.value,
        rank: r.rank,
      });
    });
  });
  return {
    series: [
      { name: 'risk',     type: 'dimension', values: [...new Set(records.map(r => r.risk))] },
      { name: 'category', type: 'dimension', values: [...new Set(records.map(r => r.category))] },
      { name: 'year',     type: 'dimension', values: ['2026', '2028', '2036'] },
      { name: 'score',    type: 'measure'   },
      { name: 'rank',     type: 'measure'   },
    ],
    records: records.map(r => [r.risk, r.category, r.year, r.score, r.rank]),
  };
}

// Colour palette matching our categoryColors
const CAT_COLORS = {
  Geopolitical:  '#e67e22',
  Societal:      '#e74c3c',
  Environmental: '#27ae60',
  Technological: '#8e44ad',
  Economic:      '#3498db',
};

// The sequence of morph steps — each is a Vizzu config object
const STEPS = [
  {
    label: '① Bar — 2026 Risks by Score',
    subtitle: 'Top 10 WEF global risks ranked for 2026',
    config: {
      channels: {
        x: { set: ['score'] },
        y: { set: ['risk'], range: { min: '0%', max: '100%' } },
        color: { set: ['category'] },
        label: { set: ['score'] },
      },
      coordSystem: 'cartesian',
      geometry: 'rectangle',
      orientation: 'horizontal',
      filter: record => record['year'] === '2026',
    },
  },
  {
    label: '② Grouped — 2026 vs 2036 by Category',
    subtitle: 'How each category\'s total score changes over the decade',
    config: {
      channels: {
        x: { set: ['year'] },
        y: { set: ['score'], range: { min: '0%', max: '110%' } },
        color: { set: ['category'] },
        label: { set: null },
      },
      coordSystem: 'cartesian',
      geometry: 'rectangle',
      orientation: 'vertical',
      filter: null,
    },
  },
  {
    label: '③ Stacked Area — Category Totals Over Time',
    subtitle: 'Stacked areas show how category dominance shifts from geopolitical to environmental',
    config: {
      channels: {
        x: { set: ['year'] },
        y: { set: ['score'], range: { min: '0%', max: '110%' } },
        color: { set: ['category'] },
        label: { set: null },
      },
      coordSystem: 'cartesian',
      geometry: 'area',
      orientation: 'vertical',
      filter: null,
    },
  },
  {
    label: '④ Scatter — Score vs Rank (2026)',
    subtitle: 'Each risk as a dot: x = severity score, y = rank position',
    config: {
      channels: {
        x: { set: ['score'] },
        y: { set: ['rank'], range: { min: '0%', max: '110%' } },
        color: { set: ['category'] },
        label: { set: ['risk'] },
        size: { set: ['score'] },
      },
      coordSystem: 'cartesian',
      geometry: 'circle',
      orientation: 'horizontal',
      filter: record => record['year'] === '2026',
    },
  },
  {
    label: '⑤ Bubble — Category Totals (2036)',
    subtitle: 'Bubble size encodes total risk severity per category by 2036',
    config: {
      channels: {
        color: { set: ['category'] },
        size: { set: ['score'] },
        label: { set: ['category'] },
        x: { set: null },
        y: { set: null },
      },
      coordSystem: 'cartesian',
      geometry: 'circle',
      orientation: 'horizontal',
      filter: record => record['year'] === '2036',
    },
  },
  {
    label: '⑥ Radial Bar — 2026 Risks',
    subtitle: 'The same bar chart — but wrapped into a radial / polar layout',
    config: {
      channels: {
        x: { set: ['risk'] },
        y: { set: ['score'], range: { min: '0%', max: '110%' } },
        color: { set: ['category'] },
        label: { set: null },
      },
      coordSystem: 'polar',
      geometry: 'rectangle',
      orientation: 'vertical',
      filter: record => record['year'] === '2026',
    },
  },
];

export default function VizzuMorph() {
  const divRef      = useRef(null);
  const chartRef    = useRef(null);
  const [step, setStep]       = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady]     = useState(false);
  const playRef = useRef(false);

  // Init Vizzu once
  useEffect(() => {
    if (!divRef.current || chartRef.current) return;
    let chart;
    (async () => {
      try {
        const palette = Object.values(CAT_COLORS);
        chart = new Vizzu(divRef.current);
        await chart.initializing;
        const { filter: initFilter, ...initConfig } = STEPS[0].config;
        await chart.animate({
          data: { ...buildVizzuData(), filter: initFilter ?? null },
          config: initConfig,
          style: {
            plot: {
              backgroundColor: '#13131f',
              xAxis: { label: { color: '#7f8c8d' }, interlacing: { color: '#1a1a2e' } },
              yAxis: { label: { color: '#7f8c8d' }, interlacing: { color: '#1a1a2e' } },
              marker: { colorPalette: palette.join(' '), label: { color: '#ffffff', fontSize: '0.7em' } },
            },
            legend: { label: { color: '#aaaacc' }, backgroundColor: '#13131f' },
            backgroundColor: '#13131f',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          },
        }, 0);
        chartRef.current = chart;
        setReady(true);
      } catch (e) {
        console.error('Vizzu init error:', e);
      }
    })();

    return () => {
      if (chartRef.current) {
        try { chartRef.current.detach(); } catch {}
        chartRef.current = null;
      }
    };
  }, []);

  const goTo = useCallback(async (targetStep, duration = 0.9) => {
    if (!chartRef.current || !ready) return;
    const cfg = STEPS[targetStep];
    const { filter, ...restConfig } = cfg.config;
    try {
      await chartRef.current.animate(
        { config: restConfig, data: { filter: filter ?? null } },
        { duration, easing: 'ease-in-out' }
      );
      setStep(targetStep);
    } catch (e) {
      if (!String(e).includes('cancelled')) console.error(e);
    }
  }, [ready]);

  // Auto-play through steps
  useEffect(() => {
    if (!playing) { playRef.current = false; return; }
    playRef.current = true;
    let current = step;

    const advance = async () => {
      if (!playRef.current) return;
      const next = (current + 1) % STEPS.length;
      current = next;
      await goTo(next, 1.2);
      if (playRef.current) {
        setTimeout(advance, 2200);
      }
    };
    setTimeout(advance, 600);
    return () => { playRef.current = false; };
  }, [playing]);

  const handleStep = (i) => {
    setPlaying(false);
    goTo(i, 0.85);
  };

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Chart Morphing — Vizzu</h1>
        <p className={styles.subtitle}>
          A single canvas that fluidly morphs between chart types — bar, grouped, area, scatter, bubble, radial.
          The transition between charts IS the story. Powered by Vizzu (C++ compiled to WebAssembly).
        </p>
      </header>

      <main className={styles.main}>
        {/* Step info */}
        <div className={styles.stepInfo}>
          <span className={styles.stepLabel}>{STEPS[step].label}</span>
          <span className={styles.stepSub}>{STEPS[step].subtitle}</span>
        </div>

        {/* Canvas */}
        <div className={styles.canvasWrapper}>
          {!ready && <div className={styles.loading}>Loading Vizzu engine…</div>}
          <div ref={divRef} className={styles.canvas} />
        </div>

        {/* Step pills */}
        <div className={styles.stepPills}>
          {STEPS.map((s, i) => (
            <button
              key={i}
              className={`${styles.stepPill} ${i === step ? styles.stepPillActive : ''}`}
              onClick={() => handleStep(i)}
            >{i + 1}</button>
          ))}
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <button
            className={`${styles.playBtn} ${playing ? styles.playBtnActive : ''}`}
            onClick={() => setPlaying(p => !p)}
            disabled={!ready}
          >{playing ? '⏸ Pause' : '▶ Auto-play'}</button>
          <button
            className={styles.btn}
            onClick={() => handleStep((step - 1 + STEPS.length) % STEPS.length)}
            disabled={!ready}
          >← Prev</button>
          <button
            className={styles.btn}
            onClick={() => handleStep((step + 1) % STEPS.length)}
            disabled={!ready}
          >Next →</button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>
            Source: WEF Global Risks Report 2025 · Rendered by Vizzu (Apache 2.0) — WASM chart morphing engine
          </p>
        </footer>
      </main>
    </div>
  );
}
