import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import p5 from 'p5';
import styles from './RiskTerrain.module.css';

const RISK_AMPLITUDES = [
  { name: 'Interstate Conflict', amp: 1.0 },
  { name: 'Extreme Weather', amp: 0.9 },
  { name: 'Misinformation', amp: 0.85 },
  { name: 'AI Adverse Outcomes', amp: 0.8 },
  { name: 'Biodiversity Loss', amp: 0.75 },
  { name: 'Cost of Living', amp: 0.7 },
  { name: 'Cyber Insecurity', amp: 0.65 },
  { name: 'Inequality', amp: 0.6 },
  { name: 'Pollution', amp: 0.55 },
  { name: 'Involuntary Migration', amp: 0.5 },
  { name: 'Social Cohesion Erosion', amp: 0.45 },
  { name: 'Debt Crisis', amp: 0.4 },
  { name: 'State Collapse', amp: 0.35 },
  { name: 'Infectious Diseases', amp: 0.3 },
  { name: 'Geo-economic Fragmentation', amp: 0.25 },
];

export default function RiskTerrain() {
  const canvasRef = useRef(null);
  const p5Ref = useRef(null);
  const yearRef = useRef(2026);
  const [year, setYear] = useState(2026);

  useEffect(() => {
    yearRef.current = year;
  }, [year]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const sketch = (p) => {
      const cols = 80;
      const rows = 50;
      const scl = 14;

      p.setup = () => {
        const width = canvasRef.current.clientWidth;
        const height = canvasRef.current.clientHeight;
        p.createCanvas(width, height, p.WEBGL);
        p.colorMode(p.HSB, 360, 100, 100, 100);
      };

      p.draw = () => {
        p.background(8, 50, 4);

        const yearFactor = (yearRef.current - 2026) / 10;
        const totalAmp = RISK_AMPLITUDES.reduce((sum, r) => sum + r.amp, 0);
        const avgAmp = totalAmp / RISK_AMPLITUDES.length;
        const amplitude = (avgAmp + yearFactor * 0.4) * 120;

        p.rotateX(p.PI / 3);
        p.translate(-cols * scl / 2, -rows * scl / 2);

        const flying = p.frameCount * 0.02;

        for (let y = 0; y < rows - 1; y++) {
          p.beginShape(p.TRIANGLE_STRIP);
          for (let x = 0; x < cols; x++) {
            const nx = x * 0.08;
            const ny = (y + flying) * 0.08;
            const z1 = p.noise(nx, ny) * amplitude;
            const z2 = p.noise(nx, (y + 1 + flying) * 0.08) * amplitude;

            const hue1 = p.map(z1, 0, amplitude, 120, 0);
            const hue2 = p.map(z2, 0, amplitude, 120, 0);

            p.fill(hue1, 80, 70, 80);
            p.noStroke();
            p.vertex(x * scl, y * scl, z1);
            p.fill(hue2, 80, 70, 80);
            p.vertex(x * scl, (y + 1) * scl, z2);
          }
          p.endShape();
        }
      };
    };

    const instance = new p5(sketch, canvasRef.current);
    p5Ref.current = instance;

    return () => {
      instance.remove();
      p5Ref.current = null;
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>WEF Risk Terrain</h1>
        <p className={styles.subtitle}>
          15 WEF risk severities drive Perlin noise amplitude on a 3D polygon mesh. Advance the timeline from 2026 to 2036 to watch the terrain grow more volatile as risk projections intensify.
        </p>
      </div>
      <div className={styles.canvasWrapper} ref={canvasRef} />
      <div className={styles.controls}>
        <span className={styles.label}>Projection Year</span>
        <input
          type="range"
          min="2026"
          max="2036"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className={styles.slider}
        />
        <span className={styles.value}>{year}</span>
      </div>
    </div>
  );
}
