import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Matter from 'matter-js';
import styles from './PlinkoDistribution.module.css';

// --- DATA LAYER (substitution point) ---
const BINS = ['Geopolitical', 'Environmental', 'Technological', 'Societal', 'Economic'];
const BIN_COLORS = ['#ef4444', '#22c55e', '#8b5cf6', '#3b82f6', '#f59e0b'];

const WIDTH = 1000;
const HEIGHT = 650;
const PEG_ROWS = 10;
const PEG_COLS = 11;
const PEG_RADIUS = 5;
const BALL_RADIUS = 6;
const SPAWN_INTERVAL = 120;
const MAX_BALLS = 300;

export default function PlinkoDistribution() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const runnerRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const ballCountRef = useRef(0);
  const [ballCount, setBallCount] = useState(0);
  const [binCounts, setBinCounts] = useState(BINS.map(() => 0));

  const setup = useCallback(() => {
    const { Engine, Render, Runner, Bodies, Composite, Events } = Matter;

    const engine = Engine.create();
    engine.gravity.y = 0.6;
    engineRef.current = engine;

    const render = Render.create({
      canvas: canvasRef.current,
      engine,
      options: {
        width: WIDTH,
        height: HEIGHT,
        wireframes: false,
        background: '#fafbfc',
        pixelRatio: window.devicePixelRatio || 1,
      },
    });
    renderRef.current = render;

    const runner = Runner.create();
    runnerRef.current = runner;

    // Walls
    const wallOptions = { isStatic: true, render: { fillStyle: '#e2e8f0' } };
    Composite.add(engine.world, [
      Bodies.rectangle(WIDTH / 2, HEIGHT + 25, WIDTH, 50, wallOptions),
      Bodies.rectangle(-25, HEIGHT / 2, 50, HEIGHT, wallOptions),
      Bodies.rectangle(WIDTH + 25, HEIGHT / 2, 50, HEIGHT, wallOptions),
    ]);

    // Pegs
    const pegSpacingX = WIDTH / (PEG_COLS + 1);
    const pegSpacingY = (HEIGHT * 0.6) / PEG_ROWS;
    const pegStartY = 60;

    for (let row = 0; row < PEG_ROWS; row++) {
      const cols = row % 2 === 0 ? PEG_COLS : PEG_COLS - 1;
      const offsetX = row % 2 === 0 ? pegSpacingX : pegSpacingX * 1.5;
      for (let col = 0; col < cols; col++) {
        const peg = Bodies.circle(
          offsetX + col * pegSpacingX,
          pegStartY + row * pegSpacingY,
          PEG_RADIUS,
          { isStatic: true, render: { fillStyle: '#cbd5e1' }, restitution: 0.5 }
        );
        Composite.add(engine.world, peg);
      }
    }

    // Bin dividers
    const binWidth = WIDTH / BINS.length;
    const binTop = HEIGHT * 0.75;
    for (let i = 1; i < BINS.length; i++) {
      const divider = Bodies.rectangle(
        i * binWidth, binTop + (HEIGHT - binTop) / 2, 4, HEIGHT - binTop,
        { isStatic: true, render: { fillStyle: '#94a3b8' } }
      );
      Composite.add(engine.world, divider);
    }

    // Bin floor sensors
    const countsLocal = BINS.map(() => 0);
    const sensors = BINS.map((_, i) => {
      const sensor = Bodies.rectangle(
        i * binWidth + binWidth / 2, HEIGHT - 10, binWidth - 8, 20,
        { isStatic: true, isSensor: true, render: { visible: false }, label: `bin-${i}` }
      );
      Composite.add(engine.world, sensor);
      return sensor;
    });

    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        let sensorBody = null;
        let ballBody = null;
        if (bodyA.isSensor) { sensorBody = bodyA; ballBody = bodyB; }
        else if (bodyB.isSensor) { sensorBody = bodyB; ballBody = bodyA; }

        if (sensorBody && ballBody && !ballBody.isStatic && !ballBody.counted) {
          const idx = parseInt(sensorBody.label.split('-')[1], 10);
          if (!isNaN(idx)) {
            countsLocal[idx]++;
            ballBody.counted = true;
            setBinCounts([...countsLocal]);
          }
        }
      });
    });

    Render.run(render);
    Runner.run(runner, engine);

    // Spawn balls
    spawnTimerRef.current = setInterval(() => {
      if (ballCountRef.current >= MAX_BALLS) return;

      const x = WIDTH / 2 + (Math.random() - 0.5) * 60;
      const colorIdx = Math.floor(Math.random() * BIN_COLORS.length);
      const ball = Bodies.circle(x, -10, BALL_RADIUS, {
        restitution: 0.4,
        friction: 0.01,
        render: { fillStyle: BIN_COLORS[colorIdx] },
      });
      Composite.add(engine.world, ball);
      ballCountRef.current++;
      setBallCount(ballCountRef.current);
    }, SPAWN_INTERVAL);
  }, []);

  const cleanup = useCallback(() => {
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
    if (renderRef.current) Matter.Render.stop(renderRef.current);
    if (engineRef.current) {
      Matter.Composite.clear(engineRef.current.world, false);
      Matter.Engine.clear(engineRef.current);
    }
    engineRef.current = null;
    renderRef.current = null;
    runnerRef.current = null;
    ballCountRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setBallCount(0);
    setBinCounts(BINS.map(() => 0));
    setup();
  }, [cleanup, setup]);

  useEffect(() => {
    setup();
    return cleanup;
  }, [setup, cleanup]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>Plinko Distribution</h1>
        <p className={styles.subtitle}>
          Galton board simulation: synthetic data points fall through staggered pegs and sort into WEF risk category bins. Watch the distribution form in real-time. Powered by Matter.js physics.
        </p>
      </div>
      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
      </div>
      <div className={styles.binLabels}>
        {BINS.map((bin, i) => (
          <span key={bin} className={styles.binLabel} style={{ color: BIN_COLORS[i] }}>
            {bin} ({binCounts[i]})
          </span>
        ))}
      </div>
      <div className={styles.controls}>
        <button className={styles.controlBtn} onClick={reset}>⟳ Reset</button>
      </div>
      <div className={styles.stats}>
        <span className={styles.stat}>Balls: <span className={styles.statValue}>{ballCount}</span></span>
        <span className={styles.stat}>Max: <span className={styles.statValue}>{MAX_BALLS}</span></span>
        <span className={styles.stat}>Engine: <span className={styles.statValue}>Matter.js</span></span>
      </div>
    </div>
  );
}
