import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import styles from './MapLibreVelocity.module.css';

// --- DATA LAYER (substitution point) ---
const PARTICLE_COUNT = 800;
const TRAIL_LENGTH = 6;
const GRID_SIZE = 32;

function generateVectorField() {
  const u = new Float32Array(GRID_SIZE * GRID_SIZE);
  const v = new Float32Array(GRID_SIZE * GRID_SIZE);
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const idx = y * GRID_SIZE + x;
      const nx = x / GRID_SIZE;
      const ny = y / GRID_SIZE;
      u[idx] = Math.sin(ny * Math.PI * 2) * 2 + Math.cos(nx * Math.PI * 3) * 0.5;
      v[idx] = Math.cos(nx * Math.PI * 2) * 1.5 - Math.sin(ny * Math.PI * 4) * 0.3;
    }
  }
  return { u, v };
}

function bilinearSample(field, x, y) {
  const fx = ((x + 180) / 360) * GRID_SIZE;
  const fy = ((90 - y) / 180) * GRID_SIZE;
  const ix = Math.floor(fx) % GRID_SIZE;
  const iy = Math.floor(fy) % GRID_SIZE;
  const ix1 = (ix + 1) % GRID_SIZE;
  const iy1 = (iy + 1) % GRID_SIZE;
  const tx = fx - Math.floor(fx);
  const ty = fy - Math.floor(fy);
  const a = field[iy * GRID_SIZE + ix];
  const b = field[iy * GRID_SIZE + ix1];
  const c = field[iy1 * GRID_SIZE + ix];
  const d = field[iy1 * GRID_SIZE + ix1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

export default function MapLibreVelocity() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        name: 'White',
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors, &copy; CARTO',
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#ffffff' },
          },
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [0, 30],
      zoom: 1.5,
    });

    mapRef.current = map;

    const { u, v } = generateVectorField();

    // Initialize particles
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      lon: Math.random() * 360 - 180,
      lat: Math.random() * 140 - 70,
      trail: [],
      age: Math.floor(Math.random() * 80),
      maxAge: 80 + Math.floor(Math.random() * 40),
    }));

    // Custom canvas layer
    const canvasLayer = {
      id: 'velocity-particles',
      type: 'custom',
      onAdd(map, gl) {
        const canvas = document.createElement('canvas');
        canvas.width = map.getCanvas().width;
        canvas.height = map.getCanvas().height;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        map.getCanvasContainer().appendChild(canvas);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
      },
      render(gl, matrix) {
        const ctx = this.ctx;
        const canvas = this.canvas;
        const mapCanvas = mapRef.current.getCanvas();
        if (canvas.width !== mapCanvas.width || canvas.height !== mapCanvas.height) {
          canvas.width = mapCanvas.width;
          canvas.height = mapCanvas.height;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p) => {
          const vu = bilinearSample(u, p.lon, p.lat);
          const vv = bilinearSample(v, p.lon, p.lat);
          p.lon += vu * 0.3;
          p.lat += vv * 0.3;
          p.age++;

          if (p.lon > 180) p.lon -= 360;
          if (p.lon < -180) p.lon += 360;
          if (p.lat > 70) p.lat = -70 + Math.random() * 10;
          if (p.lat < -70) p.lat = 70 - Math.random() * 10;

          if (p.age > p.maxAge) {
            p.lon = Math.random() * 360 - 180;
            p.lat = Math.random() * 140 - 70;
            p.trail = [];
            p.age = 0;
          }

          const point = mapRef.current.project([p.lon, p.lat]);
          p.trail.push({ x: point.x, y: point.y });
          if (p.trail.length > TRAIL_LENGTH) p.trail.shift();

          if (p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) {
              ctx.lineTo(p.trail[i].x, p.trail[i].y);
            }
            const alpha = Math.min(1, (p.maxAge - p.age) / 20);
            const speed = Math.sqrt(vu * vu + vv * vv);
            const hue = 200 - speed * 20;
            ctx.strokeStyle = `hsla(${hue}, 80%, 50%, ${alpha * 0.7})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });

        mapRef.current.triggerRepaint();
      },
    };

    map.on('load', () => {
      map.addLayer(canvasLayer);
    });

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      map.remove();
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>MapLibre Velocity Layer</h1>
        <p className={styles.subtitle}>
          Animated particle velocity field over a light base map. {PARTICLE_COUNT} particles follow a synthetic wind vector field with bilinear interpolation. Trails fade on respawn. Pan and zoom the map freely.
        </p>
      </div>
      <div className={styles.mapWrapper} ref={mapContainerRef} />
      <div className={styles.stats}>
        <span className={styles.stat}>Particles: <span className={styles.statValue}>{PARTICLE_COUNT}</span></span>
        <span className={styles.stat}>Grid: <span className={styles.statValue}>{GRID_SIZE}×{GRID_SIZE}</span></span>
        <span className={styles.stat}>Trail: <span className={styles.statValue}>{TRAIL_LENGTH} segments</span></span>
        <span className={styles.stat}>Engine: <span className={styles.statValue}>MapLibre GL Custom Layer</span></span>
      </div>
    </div>
  );
}
