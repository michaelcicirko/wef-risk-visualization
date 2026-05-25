import { useRef, useState, useMemo, useCallback, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Float, Text, Billboard, Stars, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { riskData, categoryColors } from '../data/risks.js';
import styles from './RiskBubbles3D.module.css';

const TIME_STATES = [2026, 2028, 2036];

// Spread bubbles across 3D space in a sphere distribution
function buildPositions(n, seed = 42) {
  const positions = [];
  const phi = Math.PI * (Math.sqrt(5) - 1); // golden angle
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    positions.push([
      r * Math.cos(theta) * 6,
      y * 6,
      r * Math.sin(theta) * 6,
    ]);
  }
  return positions;
}

// Individual risk bubble
function RiskBubble({ risk, position, isActive, isHovered, onClick, onPointerOver, onPointerOut }) {
  const meshRef = useRef();
  const color = categoryColors[risk.category] || '#5a5a8a';
  const radius = 0.18 + risk.value * 0.09;
  const emissiveIntensity = isHovered ? 2.2 : isActive ? 1.4 : 0.6;

  useFrame((state) => {
    if (!meshRef.current) return;
    // Gentle idle pulse
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.2 + position[0]) * 0.04;
    meshRef.current.scale.setScalar(isHovered ? 1.25 * pulse : pulse);
  });

  return (
    <Float speed={1.4} rotationIntensity={0.3} floatIntensity={isHovered ? 0.8 : 0.4}>
      <group position={position}>
        <mesh
          ref={meshRef}
          onClick={onClick}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        >
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={emissiveIntensity}
            roughness={0.1}
            metalness={0.3}
            transparent
            opacity={isActive ? 1 : 0.35}
          />
        </mesh>

        {/* Rank badge */}
        <Billboard>
          <Text
            position={[0, radius + 0.18, 0]}
            fontSize={0.2}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            #{risk.rank}
          </Text>
        </Billboard>

        {/* Label on hover */}
        {isHovered && (
          <Billboard>
            <Text
              position={[0, -(radius + 0.28), 0]}
              fontSize={0.16}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              maxWidth={2.5}
              textAlign="center"
              outlineWidth={0.015}
              outlineColor="#000000"
            >
              {risk.title}
            </Text>
          </Billboard>
        )}
      </group>
    </Float>
  );
}

// Category cluster label
function CategoryLabel({ category, position }) {
  const color = categoryColors[category] || '#5a5a8a';
  return (
    <Billboard position={position}>
      <Text
        fontSize={0.22}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
        fontWeight={700}
      >
        {category.toUpperCase()}
      </Text>
    </Billboard>
  );
}

// Camera auto-rotate when autoOrbit is on
function AutoOrbit({ enabled }) {
  const { camera } = useThree();
  const angleRef = useRef(0);
  useFrame((_, delta) => {
    if (!enabled) return;
    angleRef.current += delta * 0.25;
    camera.position.x = 18 * Math.sin(angleRef.current);
    camera.position.z = 18 * Math.cos(angleRef.current);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// Main scene
function Scene({ yearIndex, setHovered, hovered, setClicked, clicked, autoOrbit }) {
  const risks = riskData[TIME_STATES[yearIndex]] || [];
  const positions = useMemo(() => buildPositions(risks.length), [risks.length]);

  // Category centroid positions for labels
  const catCentroids = useMemo(() => {
    const cats = {};
    risks.forEach((r, i) => {
      if (!cats[r.category]) cats[r.category] = { sum: [0, 0, 0], count: 0 };
      const p = positions[i] || [0, 0, 0];
      cats[r.category].sum[0] += p[0];
      cats[r.category].sum[1] += p[1];
      cats[r.category].sum[2] += p[2];
      cats[r.category].count += 1;
    });
    return Object.entries(cats).map(([cat, { sum, count }]) => ({
      cat,
      pos: sum.map(v => v / count + 0.5),
    }));
  }, [risks, positions]);

  return (
    <>
      <AutoOrbit enabled={autoOrbit} />
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-10, -5, -10]} intensity={0.5} color="#4444ff" />
      <Stars radius={40} depth={30} count={2000} factor={3} fade speed={0.5} />

      {risks.map((risk, i) => (
        <RiskBubble
          key={risk.id}
          risk={risk}
          position={positions[i] || [0, 0, 0]}
          isActive={!clicked || clicked === risk.id}
          isHovered={hovered === risk.id}
          onClick={() => setClicked(c => c === risk.id ? null : risk.id)}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(risk.id); }}
          onPointerOut={() => setHovered(null)}
        />
      ))}

      {catCentroids.map(({ cat, pos }) => (
        <CategoryLabel key={cat} category={cat} position={pos} />
      ))}

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.8}
        />
      </EffectComposer>
    </>
  );
}

export default function RiskBubbles3D() {
  const [yearIndex, setYearIndex] = useState(0);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [hovered, setHovered] = useState(null);
  const [clicked, setClicked] = useState(null);

  const currentYear = TIME_STATES[yearIndex];
  const risks = riskData[currentYear] || [];
  const focusRisk = clicked ? risks.find(r => r.id === clicked) : hovered ? risks.find(r => r.id === hovered) : null;

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>3D Risk Bubbles — WEF Global Risks</h1>
        <p className={styles.subtitle}>
          10 WEF global risks floating in 3D space as glowing spheres. Size = severity rank.
          GPU bloom glow, spring physics, auto-orbit camera. Click a bubble to lock focus.
          Drag to orbit · Scroll to zoom.
        </p>
      </header>

      <main className={styles.main}>
        {/* Controls */}
        <div className={styles.controlsBar}>
          <div className={styles.yearPills}>
            {TIME_STATES.map((y, i) => (
              <button
                key={y}
                className={`${styles.yearPill} ${i === yearIndex ? styles.yearPillActive : ''}`}
                onClick={() => { setYearIndex(i); setClicked(null); }}
              >{y}</button>
            ))}
          </div>
          <div className={styles.toggleGroup}>
            <button
              className={`${styles.toggle} ${autoOrbit ? styles.toggleOn : ''}`}
              onClick={() => setAutoOrbit(p => !p)}
            >Auto-orbit {autoOrbit ? 'ON' : 'OFF'}</button>
          </div>
        </div>

        {/* Info card */}
        <div className={`${styles.infoCard} ${focusRisk ? styles.infoCardVisible : ''}`}>
          {focusRisk && (
            <>
              <span
                className={styles.infoDot}
                style={{ background: categoryColors[focusRisk.category] }}
              />
              <span className={styles.infoRank}>#{focusRisk.rank}</span>
              <span className={styles.infoTitle}>{focusRisk.title}</span>
              <span
                className={styles.infoCat}
                style={{ color: categoryColors[focusRisk.category] }}
              >{focusRisk.category}</span>
              <span className={styles.infoScore}>Score: {focusRisk.value}</span>
            </>
          )}
          {!focusRisk && (
            <span className={styles.infoHint}>Hover or click a bubble to inspect</span>
          )}
        </div>

        {/* 3D Canvas */}
        <div className={styles.canvasWrapper}>
          <Canvas
            camera={{ position: [0, 0, 18], fov: 50 }}
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 2]}
            style={{ background: '#0d0d1a' }}
            onPointerMissed={() => setClicked(null)}
          >
            <Suspense fallback={null}>
              <Scene
                yearIndex={yearIndex}
                setHovered={setHovered}
                hovered={hovered}
                setClicked={setClicked}
                clicked={clicked}
                autoOrbit={autoOrbit}
              />
            </Suspense>
            {!autoOrbit && <OrbitControls enablePan={false} minDistance={6} maxDistance={30} />}
          </Canvas>
        </div>

        {/* Category legend */}
        <div className={styles.legend}>
          {Object.entries(categoryColors).map(([cat, color]) => (
            <div key={cat} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <span style={{ textTransform: 'capitalize' }}>{cat}</span>
            </div>
          ))}
          <div className={styles.legendItem}>
            <span className={styles.legendNote}>Sphere size = severity score</span>
          </div>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025</p>
        </footer>
      </main>
    </div>
  );
}
