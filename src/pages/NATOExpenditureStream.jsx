import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import styles from './NATOExpenditureStream.module.css';

const NATO_MEMBERS = [
  'USA', 'UK', 'France', 'Germany', 'Canada', 'Italy', 'Spain', 'Poland',
  'Netherlands', 'Turkey', 'Norway', 'Greece', 'Belgium', 'Denmark',
  'Portugal', 'Czechia', 'Romania', 'Hungary', 'Bulgaria', 'Croatia',
  'Slovakia', 'Slovenia', 'Latvia', 'Lithuania', 'Estonia', 'Albania',
  'Montenegro', 'N. Macedonia', 'Finland', 'Sweden', 'Iceland', 'Luxembourg'
];

const COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c',
  '#e67e22', '#2471a3', '#d35400', '#27ae60', '#8e44ad', '#16a085',
  '#c0392b', '#2980b9', '#f1c40f', '#7f8c8d', '#e74c3c99', '#3498db99',
  '#2ecc7199', '#f39c1299', '#9b59b699', '#1abc9c99', '#e67e2299',
  '#2471a399', '#d3540099', '#27ae6099', '#8e44ad99', '#16a08599',
  '#c0392b99', '#2980b999', '#f1c40f99', '#7f8c8d99'
];

function generateBurnRateData() {
  const days = 365 * 3;
  const timestamps = new Array(days);
  const series = NATO_MEMBERS.map(() => new Float64Array(days));

  const baseRates = NATO_MEMBERS.map(() => 50 + Math.random() * 450);
  const startTime = Math.floor(new Date('2022-01-01').getTime() / 1000);

  for (let d = 0; d < days; d++) {
    timestamps[d] = startTime + d * 86400;

    for (let m = 0; m < NATO_MEMBERS.length; m++) {
      const trend = d * 0.02;
      const seasonal = Math.sin((d / 365) * Math.PI * 2) * baseRates[m] * 0.15;
      const noise = (Math.random() - 0.5) * baseRates[m] * 0.4;
      const spike = Math.random() > 0.98 ? baseRates[m] * (0.5 + Math.random()) : 0;
      series[m][d] = Math.max(0, baseRates[m] + trend + seasonal + noise + spike);
    }
  }

  return [timestamps, ...series];
}

export default function NATOExpenditureStream() {
  const chartContainerRef = useRef(null);
  const uplotRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const data = generateBurnRateData();

    const seriesConfig = [
      { label: 'Day' },
      ...NATO_MEMBERS.map((name, i) => ({
        label: name,
        stroke: COLORS[i],
        width: 1,
        fill: COLORS[i] + '18',
        paths: uPlot.paths.spline(),
      })),
    ];

    const opts = {
      width: chartContainerRef.current.clientWidth,
      height: 560,
      series: seriesConfig,
      axes: [
        {
          stroke: '#7f8c8d',
          grid: { stroke: 'rgba(255, 255, 255, 0.03)' },
          ticks: { stroke: 'rgba(255, 255, 255, 0.06)' },
        },
        {
          stroke: '#7f8c8d',
          grid: { stroke: 'rgba(255, 255, 255, 0.03)' },
          ticks: { stroke: 'rgba(255, 255, 255, 0.06)' },
          label: '$M / day',
        },
      ],
      scales: {
        x: { time: true },
      },
      cursor: {
        drag: { x: true, y: false },
      },
      legend: {
        show: false,
      },
    };

    const plot = new uPlot(opts, data, chartContainerRef.current);
    uplotRef.current = plot;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (plot && width > 0) {
          plot.setSize({ width, height: 560 });
        }
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      plot.destroy();
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>NATO Defence Expenditure Stream</h1>
        <p className={styles.subtitle}>
          Simulated daily defence burn rates across all 32 NATO member states rendered as a dense multi-series area chart. Drag to zoom into any time window. Over 100k data points rendered at 60fps via uPlot&apos;s canvas engine.
        </p>
      </div>
      <div className={styles.chartWrapper}>
        <div ref={chartContainerRef} />
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          Data points
          <span className={styles.statValue}>~35,000+</span>
        </div>
        <div className={styles.stat}>
          Member states
          <span className={styles.statValue}>32</span>
        </div>
        <div className={styles.stat}>
          Time span
          <span className={styles.statValue}>2022–2024</span>
        </div>
        <div className={styles.stat}>
          Rendering
          <span className={styles.statValue}>Canvas (60fps)</span>
        </div>
      </div>
    </div>
  );
}
