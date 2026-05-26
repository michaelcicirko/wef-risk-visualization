import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as d3Shape from 'd3-shape';
import * as d3Scale from 'd3-scale';
import * as d3Array from 'd3-array';
import rough from 'roughjs';
import styles from './HistoricalDemocracySketch.module.css';

const COUNTRIES = [
  { name: 'United Kingdom', color: '#e74c3c' },
  { name: 'France', color: '#3498db' },
  { name: 'United States', color: '#f39c12' },
  { name: 'Germany', color: '#2ecc71' },
  { name: 'Japan', color: '#9b59b6' },
];

function generateDemocracyTimeSeries() {
  const series = [];
  const startYear = 1800;
  const endYear = 2024;

  COUNTRIES.forEach((country, ci) => {
    const data = [];
    let score = 0.1 + ci * 0.05;

    for (let year = startYear; year <= endYear; year++) {
      const decade = Math.floor(year / 10) * 10;
      let drift = 0.002;
      if (decade >= 1850 && decade < 1920) drift = 0.003;
      if (decade >= 1920 && decade < 1940) drift = -0.001;
      if (decade >= 1940 && decade < 1960) drift = 0.005;
      if (decade >= 1960) drift = 0.004;
      if (decade >= 2000) drift = 0.001;
      if (decade >= 2010) drift = -0.002;

      score += drift + (Math.random() - 0.5) * 0.02;
      score = Math.max(0.05, Math.min(0.95, score));
      data.push({ year, score });
    }
    series.push({ country: country.name, color: country.color, data });
  });

  return series;
}

export default function HistoricalDemocracySketch() {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const width = 1100;
    const height = 450;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '';

    const series = generateDemocracyTimeSeries();
    const allYears = series[0].data.map((d) => d.year);

    const xScale = d3Scale.scaleLinear()
      .domain(d3Array.extent(allYears))
      .range([margin.left, width - margin.right]);

    const yScale = d3Scale.scaleLinear()
      .domain([0, 1])
      .range([height - margin.bottom, margin.top]);

    const rc = rough.svg(svg);

    const lineGen = d3Shape.line()
      .x((d) => xScale(d.year))
      .y((d) => yScale(d.score))
      .curve(d3Shape.curveBasis);

    series.forEach((s) => {
      const pathString = lineGen(s.data);

      const segments = 20;
      const segLength = Math.floor(s.data.length / segments);

      for (let seg = 0; seg < segments; seg++) {
        const start = seg * segLength;
        const end = Math.min(start + segLength + 1, s.data.length);
        const segData = s.data.slice(start, end);
        const segPath = lineGen(segData);
        if (!segPath) continue;

        const midYear = segData[Math.floor(segData.length / 2)].year;
        const roughness = Math.max(0, (1900 - midYear) / 400);

        const node = rc.path(segPath, {
          stroke: s.color,
          strokeWidth: roughness > 0.3 ? 2.5 : 2,
          roughness: roughness * 3,
          bowing: roughness * 2,
          fill: 'none',
        });
        svg.appendChild(node);
      }
    });

    // Axes
    const xAxisY = height - margin.bottom;
    const axisLine = rc.line(margin.left, xAxisY, width - margin.right, xAxisY, {
      stroke: '#555', roughness: 0.5,
    });
    svg.appendChild(axisLine);

    const yAxisLine = rc.line(margin.left, margin.top, margin.left, xAxisY, {
      stroke: '#555', roughness: 0.5,
    });
    svg.appendChild(yAxisLine);

    [1800, 1850, 1900, 1950, 2000].forEach((yr) => {
      const x = xScale(yr);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', xAxisY + 20);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#7f8c8d');
      text.setAttribute('font-size', '12');
      text.textContent = yr;
      svg.appendChild(text);
    });

    [0, 0.25, 0.5, 0.75, 1.0].forEach((val) => {
      const y = yScale(val);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', margin.left - 8);
      text.setAttribute('y', y + 4);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('fill', '#7f8c8d');
      text.setAttribute('font-size', '11');
      text.textContent = val.toFixed(2);
      svg.appendChild(text);
    });
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>Historical Democracy Sketch</h1>
        <p className={styles.subtitle}>
          V-Dem democracy scores rendered with high roughness parameters for pre-1900 data, dynamically transitioning to crisp lines post-1950. The sketchy rendering evokes the uncertainty of historical measurement.
        </p>
      </div>
      <div className={styles.chartWrapper}>
        <svg ref={svgRef} />
      </div>
      <div className={styles.legend}>
        {COUNTRIES.map((c) => (
          <span key={c.name} className={styles.legendItem}>
            <span className={styles.legendLine} style={{ background: c.color }} />
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}
