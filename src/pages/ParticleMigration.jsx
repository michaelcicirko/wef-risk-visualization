import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Application, Container, Sprite, Texture, Graphics } from 'pixi.js';
import styles from './ParticleMigration.module.css';

const PARTICLE_COUNT = 100000;
const BOID_SEPARATION = 12;
const BOID_ALIGNMENT = 0.05;
const BOID_COHESION = 0.002;
const MAX_SPEED = 3;

export default function ParticleMigration() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const particlesRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [particleCount] = useState(PARTICLE_COUNT);
  const collapsedRef = useRef(false);

  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);

  useEffect(() => {
    if (!canvasRef.current) return;

    let destroyed = false;
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    const app = new Application();

    const init = async () => {
      await app.init({
        width,
        height,
        backgroundColor: 0x050510,
        antialias: false,
        resolution: 1,
        canvas: undefined,
      });

      if (destroyed) {
        app.destroy(true);
        return;
      }

      canvasRef.current.appendChild(app.canvas);
      appRef.current = app;

      const gfx = new Graphics();
      gfx.circle(0, 0, 2);
      gfx.fill({ color: 0xffffff });
      const dotTexture = app.renderer.generateTexture(gfx);
      gfx.destroy();

      const container = new Container();
      app.stage.addChild(container);

      const positions = new Float32Array(particleCount * 2);
      const velocities = new Float32Array(particleCount * 2);
      const sprites = [];

      const colors = [0xe74c3c, 0xf39c12, 0x3498db, 0x2ecc71, 0x9b59b6];

      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        positions[i * 2] = x;
        positions[i * 2 + 1] = y;
        velocities[i * 2] = (Math.random() - 0.5) * 2;
        velocities[i * 2 + 1] = (Math.random() - 0.5) * 2;

        const sprite = new Sprite(dotTexture);
        sprite.anchor.set(0.5);
        sprite.x = x;
        sprite.y = y;
        sprite.tint = colors[i % colors.length];
        sprite.alpha = 0.6;
        container.addChild(sprite);
        sprites.push(sprite);
      }

      particlesRef.current = { positions, velocities, sprites };

      app.ticker.add(() => {
        const pos = particlesRef.current.positions;
        const vel = particlesRef.current.velocities;
        const spr = particlesRef.current.sprites;
        const isCollapsed = collapsedRef.current;

        const cx = width / 2;
        const cy = height / 2;

        for (let i = 0; i < particleCount; i++) {
          const idx = i * 2;

          if (isCollapsed) {
            const dx = cx - pos[idx];
            const dy = cy - pos[idx + 1];
            vel[idx] += dx * BOID_COHESION;
            vel[idx + 1] += dy * BOID_COHESION;
            vel[idx] += (Math.random() - 0.5) * 0.3;
            vel[idx + 1] += (Math.random() - 0.5) * 0.3;
          }

          vel[idx] *= 0.98;
          vel[idx + 1] *= 0.98;

          const speed = Math.sqrt(vel[idx] ** 2 + vel[idx + 1] ** 2);
          if (speed > MAX_SPEED) {
            vel[idx] = (vel[idx] / speed) * MAX_SPEED;
            vel[idx + 1] = (vel[idx + 1] / speed) * MAX_SPEED;
          }

          pos[idx] += vel[idx];
          pos[idx + 1] += vel[idx + 1];

          if (pos[idx] < 0) { pos[idx] = 0; vel[idx] *= -0.5; }
          if (pos[idx] > width) { pos[idx] = width; vel[idx] *= -0.5; }
          if (pos[idx + 1] < 0) { pos[idx + 1] = 0; vel[idx + 1] *= -0.5; }
          if (pos[idx + 1] > height) { pos[idx + 1] = height; vel[idx + 1] *= -0.5; }

          spr[i].x = pos[idx];
          spr[i].y = pos[idx + 1];
        }
      });
    };

    init();

    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [particleCount]);

  const triggerCollapse = () => {
    setCollapsed(true);
    setTimeout(() => setCollapsed(false), 4000);
  };

  const triggerScatter = () => {
    if (!particlesRef.current) return;
    const vel = particlesRef.current.velocities;
    for (let i = 0; i < particleCount; i++) {
      vel[i * 2] = (Math.random() - 0.5) * 8;
      vel[i * 2 + 1] = (Math.random() - 0.5) * 8;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>Particle Migration Simulation</h1>
        <p className={styles.subtitle}>
          100k WebGL sprites as population particles — trigger a democratic collapse to activate flocking/migration physics. Particles converge toward center under Boids cohesion rules then scatter on recovery.
        </p>
      </div>
      <div className={styles.canvasWrapper} ref={canvasRef} />
      <div className={styles.controls}>
        <button className={`${styles.btn} ${collapsed ? styles.btnActive : ''}`} onClick={triggerCollapse}>
          Democratic Collapse
        </button>
        <button className={styles.btn} onClick={triggerScatter}>
          Scatter / Recovery
        </button>
      </div>
      <div className={styles.stats}>
        <span>Particles: <span className={styles.statValue}>{particleCount.toLocaleString()}</span></span>
        <span>Renderer: <span className={styles.statValue}>PixiJS WebGL</span></span>
        <span>State: <span className={styles.statValue}>{collapsed ? 'Collapsing' : 'Free'}</span></span>
      </div>
    </div>
  );
}
