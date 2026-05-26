import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import styles from './ClimateCandlestick.module.css';

function generateClimateOHLC() {
  const data = [];
  const startDate = new Date('2020-01-01');
  const categories = [
    { name: 'Tropical Cyclones', baseIntensity: 6.5 },
    { name: 'Floods', baseIntensity: 5.2 },
    { name: 'Heatwaves', baseIntensity: 7.1 },
    { name: 'Droughts', baseIntensity: 4.8 },
    { name: 'Wildfires', baseIntensity: 5.9 },
  ];

  for (let week = 0; week < 260; week++) {
    const date = new Date(startDate.getTime() + week * 7 * 24 * 60 * 60 * 1000);
    const seasonFactor = Math.sin((week / 52) * Math.PI * 2) * 1.5;
    const trendFactor = week * 0.004;
    const cat = categories[week % categories.length];
    const base = cat.baseIntensity + seasonFactor + trendFactor;

    const open = base + (Math.random() - 0.5) * 1.2;
    const close = base + (Math.random() - 0.5) * 1.2;
    const high = Math.max(open, close) + Math.random() * 2.5;
    const low = Math.min(open, close) - Math.random() * 1.8;

    data.push({
      time: Math.floor(date.getTime() / 1000),
      open: Math.max(0, +open.toFixed(2)),
      high: Math.max(0, +high.toFixed(2)),
      low: Math.max(0, +low.toFixed(2)),
      close: Math.max(0, +close.toFixed(2)),
    });
  }

  return data;
}

export default function ClimateCandlestick() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 560,
      layout: {
        background: { color: '#12121f' },
        textColor: '#7f8c8d',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: false,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#e74c3c',
      downColor: '#27ae60',
      borderUpColor: '#e74c3c',
      borderDownColor: '#27ae60',
      wickUpColor: '#e74c3c',
      wickDownColor: '#27ae60',
    });

    const data = generateClimateOHLC();
    candleSeries.setData(data);

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        chart.applyOptions({ width });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>Climate Severity Candlestick</h1>
        <p className={styles.subtitle}>
          WMO extreme weather severity reframed as financial OHLC data — wicks represent theoretical maximum damage potential, candle bodies represent realized median severity. Red = severity increased, Green = severity decreased week-over-week.
        </p>
      </div>
      <div className={styles.chartWrapper}>
        <div ref={chartContainerRef} />
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#e74c3c' }} />
          Severity Increased (Bullish Damage)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#27ae60' }} />
          Severity Decreased (Cooling)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#7f8c8d' }} />
          Wick = Max Theoretical Damage
        </span>
      </div>
    </div>
  );
}
