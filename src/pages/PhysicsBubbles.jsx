import { useRef, useState, useMemo, Suspense, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Billboard, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Physics, RigidBody, BallCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { riskData, categoryColors } from '../data/risks.js';
import styles from './PhysicsBubbles.module.css';

const TIME_STATES = [2026, 2028, 2036];

// Floor/wall boundaries
function Walls() {
  return (
    <>
      {/* Floor */}
      <RigidBody type="fixed" position={[0, -8, 0]}>
        <BallCollider args={[0.01]} />
        <mesh>
          <boxGeometry args={[40, 0.5, 40]} />
          <meshStandardMaterial color="#0d0d1a" transparent opacity={0} />
        </mesh>
      </RigidBody>
      {/* Invisible cylinder wall */}
      <RigidBody type="fixed" position={[0, 0, 0]}>
        <BallCollider args={[0.01]} />
      </RigidBody>
    </>
  );
}

// Single physics-driven risk bubble
function PhysicsBubble({ risk, position, hovered, onHover, onLeave, onClick, isActive, explode }) {
  const rigidRef = useRef();
  const meshRef = useRef();
  const color = categoryColors[risk.category] || '#5a5a8a';
  const radius = 0.22 + risk.value * 0.1;
  const isHov = hovered === risk.id;

  // Apply explosion impulse on year change
  useEffect(() => {
    if (!explode || !rigidRef.current) return;
    const impulse = {
      x: (Math.random() - 0.5) * 18,
      y: Math.random() * 22 + 8,
      z: (Math.random() - 0.5) * 18,
    };
    rigidRef.current.applyImpulse(impulse, true);
  }, [explode]);

  useFrame(() => {
    if (!meshRef.current) return;
    const target = isHov ? 1.15 : 1.0;
    meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
  });

  return (
    <RigidBody
      ref={rigidRef}
      position={position}
      colliders="ball"
      restitution={0.5}
      friction={0.3}
      linearDamping={0.4}
      angularDamping={0.8}
      mass={radius * 2}
    >
      <BallCollider args={[radius]} />
      <group>
        <mesh
          ref={meshRef}
          onClick={onClick}
          onPointerOver={onHover}
          onPointerOut={onLeave}
        >
          <sphereGeometry args={[radius, 24, 24]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isHov ? 2.5 : isActive ? 1.2 : 0.5}
            roughness={0.15}
            metalness={0.2}
            transparent
            opacity={isActive ? 1 : 0.3}
          />
        </mesh>
        <Billboard>
          <Text
            position={[0, radius + 0.2, 0]}
            fontSize={0.18}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            #{risk.rank}
          </Text>
          {isHov && (
            <Text
              position={[0, -(radius + 0.3), 0]}
              fontSize={0.15}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              maxWidth={2.2}
              textAlign="center"
              outlineWidth={0.015}
              outlineColor="#000000"
            >
              {risk.title}
            </Text>
          )}
        </Billboard>
      </group>
    </RigidBody>
  );
}

// Gravity direction indicator
function GravityLabel({ gravity }) {
  return null; // visual handled in UI
}

function Scene({ yearIndex, hovered, setHovered, clicked, setClicked, gravity, explodeKey }) {
  const risks = riskData[TIME_STATES[yearIndex]] || [];

  // Spread initial positions in a rough grid above the floor
  const positions = useMemo(() => risks.map((_, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    return [
      (col - 1.5) * 2.5 + (Math.random() - 0.5),
      4 + row * 2.8 + Math.random(),
      (Math.random() - 0.5) * 3,
    ];
  }), [risks.length]);

  const gravityVec = useMemo(() => {
    switch (gravity) {
      case 'down':    return [0, -12, 0];
      case 'up':      return [0, 12, 0];
      case 'zero':    return [0, 0, 0];
      case 'chaos':   return [5, -6, 3];
      default:        return [0, -12, 0];
    }
  }, [gravity]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[8, 12, 8]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-8, -4, -8]} intensity={0.6} color="#3333ff" />
      <Stars radius={50} depth={30} count={1500} factor={3} fade speed={0.4} />

      <Physics gravity={gravityVec} key={`${yearIndex}-${explodeKey}`}>
        <Walls />
        {risks.map((risk, i) => (
          <PhysicsBubble
            key={`${risk.id}-${yearIndex}-${explodeKey}`}
            risk={risk}
            position={positions[i]}
            hovered={hovered}
            onHover={(e) => { e.stopPropagation(); setHovered(risk.id); }}
            onLeave={() => setHovered(null)}
            onClick={() => setClicked(c => c === risk.id ? null : risk.id)}
            isActive={!clicked || clicked === risk.id}
            explode={false}
          />
        ))}
      </Physics>

      <EffectComposer>
        <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={2.0} />
      </EffectComposer>
    </>
  );
}

export default function PhysicsBubbles() {
  const [yearIndex, setYearIndex]   = useState(0);
  const [hovered, setHovered]       = useState(null);
  const [clicked, setClicked]       = useState(null);
  const [gravity, setGravity]       = useState('down');
  const [explodeKey, setExplodeKey] = useState(0);

  const currentYear = TIME_STATES[yearIndex];
  const risks = riskData[currentYear] || [];
  const focusRisk = risks.find(r => r.id === (clicked || hovered));

  const handleYearChange = (i) => {
    setYearIndex(i);
    setClicked(null);
    setExplodeKey(k => k + 1);
  };

  const handleExplode = () => setExplodeKey(k => k + 1);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Physics Bubbles — WEF Risks</h1>
        <p className={styles.subtitle}>
          WEF global risks as rigid-body spheres with real physics simulation (Rapier WASM).
          Gravity, collision, restitution. Change gravity mode or explode the scene.
          Drag to orbit · Scroll to zoom · Click a bubble to focus it.
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
                onClick={() => handleYearChange(i)}
              >{y}</button>
            ))}
          </div>
          <div className={styles.gravityGroup}>
            {['down', 'up', 'zero', 'chaos'].map(g => (
              <button
                key={g}
                className={`${styles.gravityBtn} ${gravity === g ? styles.gravityBtnActive : ''}`}
                onClick={() => { setGravity(g); setExplodeKey(k => k + 1); }}
              >{g === 'down' ? '↓' : g === 'up' ? '↑' : g === 'zero' ? '○' : '⚡'} {g}</button>
            ))}
          </div>
          <button className={styles.explodeBtn} onClick={handleExplode}>💥 Explode</button>
        </div>

        {/* Info card */}
        <div className={`${styles.infoCard} ${focusRisk ? styles.infoCardVisible : ''}`}>
          {focusRisk ? (
            <>
              <span className={styles.infoDot} style={{ background: categoryColors[focusRisk.category] }} />
              <span className={styles.infoRank}>#{focusRisk.rank}</span>
              <span className={styles.infoTitle}>{focusRisk.title}</span>
              <span className={styles.infoCat} style={{ color: categoryColors[focusRisk.category] }}>
                {focusRisk.category}
              </span>
              <span className={styles.infoScore}>Score: {focusRisk.value}</span>
            </>
          ) : (
            <span className={styles.infoHint}>Hover or click a bubble to inspect · Change year to scatter bubbles</span>
          )}
        </div>

        {/* Canvas */}
        <div className={styles.canvasWrapper}>
          <Canvas
            camera={{ position: [0, 4, 20], fov: 52 }}
            gl={{ antialias: true }}
            dpr={[1, 2]}
            style={{ background: '#0d0d1a' }}
            onPointerMissed={() => setClicked(null)}
          >
            <Suspense fallback={null}>
              <Scene
                yearIndex={yearIndex}
                hovered={hovered}
                setHovered={setHovered}
                clicked={clicked}
                setClicked={setClicked}
                gravity={gravity}
                explodeKey={explodeKey}
              />
            </Suspense>
            <OrbitControls enablePan={false} minDistance={8} maxDistance={35} />
          </Canvas>
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          {Object.entries(categoryColors).map(([cat, color]) => (
            <div key={cat} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <span style={{ textTransform: 'capitalize' }}>{cat}</span>
            </div>
          ))}
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: WEF Global Risks Report 2025 · Physics: Rapier WASM via @react-three/rapier</p>
        </footer>
      </main>
    </div>
  );
}
