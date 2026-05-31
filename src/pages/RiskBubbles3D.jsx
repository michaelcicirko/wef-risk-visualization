import { useRef, useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Float, Text, Billboard, Stars, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { topRiskCountries, riskClassColors, POSITION_SCALE, getBubbleRadius } from '../data/informRisk.js';
import styles from './RiskBubbles3D.module.css';

const COUNTRIES = topRiskCountries;
console.log('COUNTRIES loaded:', COUNTRIES.length, COUNTRIES[0]);

// Build 3D position from risk dimensions: X=Hazard, Y=Vulnerability, Z=Coping
function buildPosition(country) {
  return [
    country.hazard * POSITION_SCALE,
    country.vulnerability * POSITION_SCALE,
    country.coping * POSITION_SCALE,
  ];
}

// Individual country bubble
function CountryBubble({ country, position, isActive, isHovered, onClick, onPointerOver, onPointerOut }) {
  const meshRef = useRef();
  const color = riskClassColors[country.riskClass] || '#5a5a8a';
  const radius = getBubbleRadius(country.riskScore);
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
            position={[0, radius + 0.3, 0]}
            fontSize={0.18}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {country.id}
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
              {country.title}
            </Text>
          </Billboard>
        )}
      </group>
    </Float>
  );
}

// Data center for axis positioning (based on actual data cluster)
const DATA_CENTER = [72, 72, 66]; // Center of 64-country dataset

// 3D Axis labels - positioned at data cluster center, not origin
function AxisLabels({ visible }) {
  if (!visible) return null;
  const [cx, cy, cz] = DATA_CENTER;
  return (
    <>
      <Billboard position={[cx + 60, cy, cz]}>
        <Text fontSize={2} color="#ff6b6b" anchorX="center">Hazard →</Text>
      </Billboard>
      <Billboard position={[cx, cy + 60, cz]}>
        <Text fontSize={2} color="#4ecdc4" anchorX="center">Vulnerability →</Text>
      </Billboard>
      <Billboard position={[cx, cy, cz + 60]}>
        <Text fontSize={2} color="#95e1d3" anchorX="center">Coping →</Text>
      </Billboard>
    </>
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
function Scene({ setHovered, hovered, setClicked, clicked, autoOrbit, showAxes, cameraControlsRef }) {
  const countries = COUNTRIES;
  const groupRef = useRef();
  const positions = useMemo(() => 
    countries.map(c => buildPosition(c)), 
    [countries]
  );

  // Fit camera to all bubbles on initial load
  useEffect(() => {
    const fitCamera = () => {
      if (cameraControlsRef?.current && groupRef.current) {
        cameraControlsRef.current.fitToBox(groupRef.current, true, {
          paddingLeft: 0.15,
          paddingRight: 0.15,
          paddingTop: 0.15,
          paddingBottom: 0.15,
        });
      }
    };
    // Delay to ensure CameraControls is mounted
    const timer = setTimeout(fitCamera, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AutoOrbit enabled={autoOrbit} />
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-10, -5, -10]} intensity={0.5} color="#4444ff" />
      <Stars radius={25} depth={20} count={1000} factor={2} fade speed={0.5} />

      <group ref={groupRef} data-bounds>
        {countries.map((country, i) => (
          <CountryBubble
            key={country.id}
            country={country}
            position={positions[i] || [0, 0, 0]}
            isActive={!clicked || clicked === country.id}
            isHovered={hovered === country.id}
            onClick={() => setClicked(c => c === country.id ? null : country.id)}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(country.id); }}
            onPointerOut={() => setHovered(null)}
          />
        ))}
      </group>

      <AxisLabels visible={showAxes} />

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
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [hovered, setHovered] = useState(null);
  const [clicked, setClicked] = useState(null);
  const cameraControlsRef = useRef();

  const countries = COUNTRIES;
  const focusCountry = clicked ? countries.find(c => c.id === clicked) : hovered ? countries.find(c => c.id === hovered) : null;

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>3D Risk Profile — INFORM Index 2026</h1>
        <p className={styles.subtitle}>
          All countries by risk class positioned in 3D risk space.
          X=Hazard & Exposure · Y=Vulnerability · Z=Coping Capacity · Size=Risk Score.
          Drag to orbit · Scroll to zoom · Toggle axes for orientation.
        </p>
      </header>

      <main className={styles.main}>
        {/* Controls */}
        <div className={styles.controlsBar}>
          <div className={styles.toggleGroup}>
            <button
              className={`${styles.toggle} ${autoOrbit ? styles.toggleOn : ''}`}
              onClick={() => setAutoOrbit(p => !p)}
            >Auto-orbit {autoOrbit ? 'ON' : 'OFF'}</button>
            <button
              className={`${styles.toggle} ${showAxes ? styles.toggleOn : ''}`}
              onClick={() => setShowAxes(p => !p)}
            >Axes {showAxes ? 'ON' : 'OFF'}</button>
            <button
              className={styles.replayButton}
              onClick={() => {
                if (cameraControlsRef.current) {
                  cameraControlsRef.current.fitToBox(document.querySelector('[data-bounds]'), true, {
                    paddingLeft: 0.1, paddingRight: 0.1, paddingTop: 0.1, paddingBottom: 0.1
                  });
                }
              }}
            >↺ Reset View</button>
          </div>
        </div>

        {/* Info card */}
        <div className={`${styles.infoCard} ${focusCountry ? styles.infoCardVisible : ''}`}>
          {focusCountry && (
            <>
              <span
                className={styles.infoDot}
                style={{ background: riskClassColors[focusCountry.riskClass] }}
              />
              <span className={styles.infoTitle}>{focusCountry.title}</span>
              <span
                className={styles.infoCat}
                style={{ color: riskClassColors[focusCountry.riskClass] }}
              >{focusCountry.riskClass}</span>
              <span className={styles.infoScore}>Risk: {focusCountry.riskScore.toFixed(1)}</span>
              <span className={styles.infoScore}>H:{focusCountry.hazard.toFixed(1)} V:{focusCountry.vulnerability.toFixed(1)} C:{focusCountry.coping.toFixed(1)}</span>
            </>
          )}
          {!focusCountry && (
            <span className={styles.infoHint}>Hover or click a bubble to inspect</span>
          )}
        </div>

        {/* 3D Canvas */}
        <div className={styles.canvasWrapper}>
          <Canvas
            camera={{ position: [60, 60, 100], fov: 60 }}
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 2]}
            style={{ background: '#0d0d1a' }}
            onPointerMissed={() => setClicked(null)}
          >
            <Suspense fallback={null}>
              <Scene
                setHovered={setHovered}
                hovered={hovered}
                setClicked={setClicked}
                clicked={clicked}
                autoOrbit={autoOrbit}
                showAxes={showAxes}
              />
            </Suspense>
            <CameraControls
              ref={cameraControlsRef}
              enabled={!autoOrbit}
              minDistance={30}
              maxDistance={500}
              dollySpeed={0.8}
              truckSpeed={1.0}
            />
          </Canvas>
        </div>

        {/* Risk class legend */}
        <div className={styles.legend}>
          {Object.entries(riskClassColors).map(([riskClass, color]) => (
            <div key={riskClass} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <span>{riskClass}</span>
            </div>
          ))}
          <div className={styles.legendItem}>
            <span className={styles.legendNote}>Size = Risk Score · Position = Hazard/Vulnerability/Coping</span>
          </div>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: INFORM Risk Index 2026 — Sample of 64 Countries</p>
        </footer>
      </main>
    </div>
  );
}
