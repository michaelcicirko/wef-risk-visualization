import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Globe from 'globe.gl';
import { feature } from 'topojson-client';
import { natoMembers, YEAR_START, YEAR_END, getNewMembersForYear, getMembersByYear } from '../data/natoMembers.js';
import styles from './NATOGlobe.module.css';

// All unique join years
const JOIN_YEARS = [...new Set(natoMembers.map(m => m.year))].sort((a, b) => a - b);

// member id → approx centroid [lat, lng] for camera targeting
const MEMBER_CENTROIDS = {
  belgium:     [50.5, 4.5],
  canada:      [60.0, -95.0],
  denmark:     [56.0, 10.0],
  france:      [46.0, 2.0],
  iceland:     [65.0, -18.0],
  italy:       [42.5, 12.5],
  luxembourg:  [49.8, 6.1],
  netherlands: [52.3, 5.3],
  norway:      [60.5, 8.5],
  portugal:    [39.5, -8.0],
  uk:          [54.0, -2.0],
  us:          [38.0, -97.0],
  greece:      [39.0, 22.0],
  turkey:      [39.0, 35.0],
  germany:     [51.0, 10.0],
  spain:       [40.0, -4.0],
  czechia:     [49.8, 15.5],
  hungary:     [47.2, 19.5],
  poland:      [52.0, 20.0],
  bulgaria:    [42.7, 25.5],
  estonia:     [58.6, 25.0],
  latvia:      [56.9, 24.6],
  lithuania:   [55.9, 23.9],
  romania:     [45.9, 24.9],
  slovakia:    [48.7, 19.7],
  slovenia:    [46.1, 14.8],
  albania:     [41.2, 20.2],
  croatia:     [45.1, 15.2],
  montenegro:  [42.7, 19.4],
  macedonia:   [41.6, 21.7],
  finland:     [64.0, 26.0],
  sweden:      [62.0, 15.0],
};

// ISO numeric → member id
const COUNTRY_CODE_TO_ID = {
  56: 'belgium', 124: 'canada', 208: 'denmark', 250: 'france',
  352: 'iceland', 380: 'italy', 442: 'luxembourg', 528: 'netherlands',
  578: 'norway', 620: 'portugal', 826: 'uk', 840: 'us',
  300: 'greece', 792: 'turkey', 276: 'germany', 724: 'spain',
  203: 'czechia', 348: 'hungary', 616: 'poland', 100: 'bulgaria',
  233: 'estonia', 428: 'latvia', 440: 'lithuania', 642: 'romania',
  703: 'slovakia', 705: 'slovenia', 8: 'albania', 191: 'croatia',
  499: 'montenegro', 807: 'macedonia', 246: 'finland', 752: 'sweden',
};

const COLOR_NON_MEMBER  = '#1e1e2e';
const COLOR_MEMBER      = '#1a5276';
const COLOR_FLASH       = '#ff00ff';
const COLOR_BORDER      = '#3a3a5a';
const LABEL_HOLD_MS     = 800;

function NATOGlobe() {
  const globeContainerRef = useRef(null);
  const globeInstanceRef  = useRef(null);
  const panelRef          = useRef(null);
  const yearRef           = useRef(YEAR_START);
  const foundingRevealedCountRef = useRef(0);
  const yearRevealedCountRef     = useRef(0);
  const autoRotateRef     = useRef(true);
  // Refs the globe color callbacks read directly — no geometry rebuild needed
  const memberSetRef      = useRef(new Set());
  const flashingSetRef    = useRef(new Set());
  // Single camera timeout — cancel previous before setting new
  const cameraTimeoutRef  = useRef(null);

  const [year, setYear]                       = useState(YEAR_START);
  const [isPlaying, setIsPlaying]             = useState(true);
  const [worldData, setWorldData]             = useState(null);
  const [visibleMembers, setVisibleMembers]   = useState([]);
  const [flyingLabel, setFlyingLabel]         = useState(null);
  const [animationPhase, setAnimationPhase]   = useState('revealing-founders');
  const [currentYearMembers, setCurrentYearMembers] = useState([]);
  const lastProcessedYear = useRef(YEAR_START);

  // Timing
  const [memberRevealDelay, setMemberRevealDelay] = useState(1800);
  const [yearNormalDelay, setYearNormalDelay]     = useState(120);
  const [yearBigGapDelay, setYearBigGapDelay]     = useState(400);
  const [initialHold, setInitialHold]             = useState(1000);
  const [timingInputs, setTimingInputs] = useState({
    memberRevealDelay: 1800, yearNormalDelay: 120, yearBigGapDelay: 400, initialHold: 1000,
  });

  const foundingMembers = useMemo(() => natoMembers.filter(m => m.founding), []);

  // ── Fetch world topology ──
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(setWorldData);
  }, []);

  // ── Helper: re-bind color/altitude callbacks without touching polygon geometry ──
  const refreshGlobeColors = useCallback(() => {
    const g = globeInstanceRef.current;
    if (!g) return;
    g.polygonCapColor(feat => {
        const memberId = COUNTRY_CODE_TO_ID[+feat.id];
        if (!memberId) return COLOR_NON_MEMBER;
        if (flashingSetRef.current.has(memberId)) return COLOR_FLASH;
        return memberSetRef.current.has(memberId) ? COLOR_MEMBER : COLOR_NON_MEMBER;
      })
      .polygonAltitude(feat => {
        const memberId = COUNTRY_CODE_TO_ID[+feat.id];
        if (!memberId) return 0.005;
        if (flashingSetRef.current.has(memberId)) return 0.06;
        return memberSetRef.current.has(memberId) ? 0.02 : 0.005;
      });
  }, []);

  // ── Initialise globe.gl + load polygon data ONCE ──
  useEffect(() => {
    if (!globeContainerRef.current || globeInstanceRef.current || !worldData) return;

    const g = Globe()(globeContainerRef.current);

    g.backgroundColor('#0d0d1a')
     .showGraticules(false)
     .showAtmosphere(true)
     .atmosphereColor('#1a2a4a')
     .atmosphereAltitude(0.12)
     .width(globeContainerRef.current.clientWidth)
     .height(globeContainerRef.current.clientHeight);

    g.controls().autoRotate = true;
    g.controls().autoRotateSpeed = 0.4;
    g.controls().enableZoom = false;

    // Load polygon geometry ONCE — never call polygonsData() again
    const countries = feature(worldData, worldData.objects.countries);
    g.polygonsData(countries.features)
     .polygonSideColor(() => COLOR_BORDER)
     .polygonStrokeColor(() => COLOR_BORDER);

    globeInstanceRef.current = g;
    // Apply initial colors immediately
    refreshGlobeColors();
  }, [worldData, refreshGlobeColors]);

  // ── Show label over country on globe ──
  const triggerLabel = useCallback((member) => {
    setFlyingLabel({ id: member.id, flag: member.flag, country: member.country, phase: 'appearing' });
    setTimeout(() => {
      setFlyingLabel(prev => prev?.id === member.id ? { ...prev, phase: 'fading' } : prev);
    }, LABEL_HOLD_MS);
    setTimeout(() => setFlyingLabel(null), LABEL_HOLD_MS + 400);
  }, []);

  // ── Rotate globe to face the joining country ──
  const focusCountry = useCallback((memberId) => {
    const g = globeInstanceRef.current;
    if (!g) return;
    const centroid = MEMBER_CENTROIDS[memberId];
    if (!centroid) return;
    // Cancel any pending autoRotate re-enable from previous reveal
    if (cameraTimeoutRef.current) clearTimeout(cameraTimeoutRef.current);
    g.controls().autoRotate = false;
    g.pointOfView({ lat: centroid[0], lng: centroid[1], altitude: 1.8 }, 900);
    cameraTimeoutRef.current = setTimeout(() => {
      if (autoRotateRef.current && globeInstanceRef.current) {
        globeInstanceRef.current.controls().autoRotate = true;
      }
    }, 2200);
  }, []);

  // ── Reveal a single member ──
  const revealMember = useCallback((member) => {
    // Update refs immediately — globe callbacks read these, no geometry rebuild
    memberSetRef.current = new Set([...memberSetRef.current, member.id]);
    flashingSetRef.current = new Set([member.id]);
    refreshGlobeColors();
    triggerLabel(member);
    focusCountry(member.id);
    // React UI state update (panel list only)
    setVisibleMembers(prev => {
      if (prev.find(m => m.id === member.id)) return prev;
      return [member, ...prev];
    });
    // Clear flash after 600ms via ref + color refresh
    setTimeout(() => {
      flashingSetRef.current = new Set();
      refreshGlobeColors();
    }, 600);
  }, [triggerLabel, focusCountry, refreshGlobeColors]);

  // ── State machine animation loop ──
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId;

    const runAnimation = () => {
      const currentYearInt = Math.floor(yearRef.current);

      if (animationPhase === 'revealing-founders') {
        if (foundingRevealedCountRef.current < foundingMembers.length) {
          const member = foundingMembers[foundingRevealedCountRef.current];
          revealMember(member);
          foundingRevealedCountRef.current += 1;
          timeoutId = setTimeout(runAnimation, memberRevealDelay);
        } else {
          setAnimationPhase('year-advance');
          timeoutId = setTimeout(runAnimation, memberRevealDelay);
        }

      } else if (animationPhase === 'year-advance') {
        if (currentYearInt >= YEAR_END) {
          setIsPlaying(false);
          autoRotateRef.current = true;
          if (globeInstanceRef.current) globeInstanceRef.current.controls().autoRotate = true;
          return;
        }

        const nextYear = currentYearInt + 1;
        const nextYearMembers = getNewMembersForYear(nextYear);

        if (nextYearMembers.length > 0) {
          lastProcessedYear.current = nextYear;
          setCurrentYearMembers(nextYearMembers);
          yearRef.current = nextYear;
          setYear(nextYear);
          revealMember(nextYearMembers[0]);
          yearRevealedCountRef.current = 1;
          if (nextYearMembers.length > 1) {
            setAnimationPhase('revealing-year-members');
            timeoutId = setTimeout(runAnimation, memberRevealDelay);
          } else {
            setAnimationPhase('year-advance');
            timeoutId = setTimeout(runAnimation, memberRevealDelay);
          }
        } else {
          const nextJoinYear = JOIN_YEARS.find(y => y > nextYear);
          const gapToNextJoin = nextJoinYear ? nextJoinYear - nextYear : 0;
          const delay = gapToNextJoin > 3 ? yearBigGapDelay : yearNormalDelay;
          yearRef.current = nextYear;
          setYear(nextYear);
          timeoutId = setTimeout(runAnimation, delay);
        }

      } else if (animationPhase === 'revealing-year-members') {
        if (yearRevealedCountRef.current < currentYearMembers.length) {
          const member = currentYearMembers[yearRevealedCountRef.current];
          revealMember(member);
          yearRevealedCountRef.current += 1;
          timeoutId = setTimeout(runAnimation, memberRevealDelay);
        } else {
          setAnimationPhase('year-advance');
          timeoutId = setTimeout(runAnimation, memberRevealDelay);
        }
      }
    };

    timeoutId = setTimeout(runAnimation, initialHold);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, animationPhase, foundingMembers, currentYearMembers, initialHold,
      memberRevealDelay, yearNormalDelay, yearBigGapDelay, revealMember]);

  // ── Scrub ──
  const handleScrub = useCallback((scrubYear) => {
    const y = parseInt(scrubYear);
    setIsPlaying(false);
    setFlyingLabel(null);
    flashingSetRef.current = new Set();
    yearRef.current = y;
    setYear(y);
    const members = getMembersByYear(y).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return a.country.localeCompare(b.country);
    });
    memberSetRef.current = new Set(members.map(m => m.id));
    setVisibleMembers(members);
    refreshGlobeColors();
    setAnimationPhase('year-advance');
    setCurrentYearMembers([]);
    yearRevealedCountRef.current = 0;
    foundingRevealedCountRef.current = foundingMembers.length;
    lastProcessedYear.current = y;
  }, [foundingMembers, refreshGlobeColors]);

  // ── Replay ──
  const handleReplay = useCallback(() => {
    setYear(YEAR_START);
    yearRef.current = YEAR_START;
    setVisibleMembers([]);
    memberSetRef.current = new Set();
    flashingSetRef.current = new Set();
    foundingRevealedCountRef.current = 0;
    yearRevealedCountRef.current = 0;
    setCurrentYearMembers([]);
    setAnimationPhase('revealing-founders');
    lastProcessedYear.current = YEAR_START;
    setFlyingLabel(null);
    refreshGlobeColors();
    autoRotateRef.current = true;
    if (globeInstanceRef.current) {
      globeInstanceRef.current.controls().autoRotate = true;
      globeInstanceRef.current.pointOfView({ lat: 50, lng: 10, altitude: 2.2 }, 1200);
    }
    setTimeout(() => setIsPlaying(true), 200);
  }, [refreshGlobeColors]);

  const isJoinYear = animationPhase === 'revealing-founders' || animationPhase === 'revealing-year-members';

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>3D Globe Timeline</h1>
        <p className={styles.subtitle}>Example: Geo-temporal storytelling on an auto-rotating 3D globe</p>
      </header>

      <main className={styles.main}>
        {/* Globe wrapper — globe.gl canvas + React overlays as siblings */}
        <div className={styles.globeWrapper}>

          {/* globe.gl owns this div entirely — React renders it EMPTY, never adds children */}
          <div className={styles.globeCanvas} ref={globeContainerRef} />

          {/* React owns this overlay — sits on top via position:absolute */}
          <div className={styles.globeOverlay}>
            {/* Left member panel */}
            <div className={styles.memberPanel} ref={panelRef}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Members</span>
                <span className={styles.panelCount}>{visibleMembers.length} / 32</span>
              </div>
              <div className={styles.memberList}>
                <AnimatePresence initial={false}>
                  {visibleMembers.map(member => (
                    <motion.div
                      key={member.id}
                      className={styles.memberItem}
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    >
                      <span className={styles.memberFlag}>{member.flag}</span>
                      <span className={styles.memberName}>{member.country}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Floating label */}
            {flyingLabel && (
              <div className={`${styles.flyingLabel} ${flyingLabel.phase === 'appearing' ? styles.flyingLabelAppear : ''} ${flyingLabel.phase === 'fading' ? styles.flyingLabelFade : ''}`}>
                <span>{flyingLabel.flag}</span>
                <span>{flyingLabel.country}</span>
              </div>
            )}

            {/* Year overlay */}
            <div className={styles.yearOverlay}>
              <span
                className={styles.yearNumber}
                style={{ color: isJoinYear ? '#ff00ff' : '#ffffff' }}
              >{year}</span>
              <span className={styles.memberCount}>{visibleMembers.length} members</span>
            </div>
          </div>

        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <button className={styles.controlButton} onClick={() => setIsPlaying(p => !p)}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button className={styles.controlButton} onClick={handleReplay} disabled={isPlaying}>
            Replay
          </button>
          <span className={styles.zoomHint}>Globe auto-rotates · drag to reorient</span>
        </div>

        {/* Scrubber */}
        <div className={styles.scrubberContainer}>
          <span className={styles.scrubberYear}>{YEAR_START}</span>
          <input
            type="range"
            className={styles.scrubber}
            min={YEAR_START}
            max={YEAR_END}
            step={1}
            value={year}
            onChange={e => handleScrub(e.target.value)}
            style={{ '--progress': ((year - YEAR_START) / (YEAR_END - YEAR_START)) * 100 }}
          />
          <span className={styles.scrubberYear}>{YEAR_END}</span>
        </div>

        {/* Timing controls */}
        <div className={styles.timingControls}>
          <div className={styles.timingGrid}>
            <div className={styles.timingField}>
              <label>Initial Hold (ms)</label>
              <input type="number" value={timingInputs.initialHold}
                onChange={e => setTimingInputs(p => ({ ...p, initialHold: parseInt(e.target.value) || 0 }))}
                min="500" max="10000" step="100" />
            </div>
            <div className={styles.timingField}>
              <label>Member Reveal (ms)</label>
              <input type="number" value={timingInputs.memberRevealDelay}
                onChange={e => setTimingInputs(p => ({ ...p, memberRevealDelay: parseInt(e.target.value) || 0 }))}
                min="200" max="5000" step="100" />
            </div>
            <div className={styles.timingField}>
              <label>Year Normal Gap (ms)</label>
              <input type="number" value={timingInputs.yearNormalDelay}
                onChange={e => setTimingInputs(p => ({ ...p, yearNormalDelay: parseInt(e.target.value) || 0 }))}
                min="50" max="2000" step="50" />
            </div>
            <div className={styles.timingField}>
              <label>Year Big Gap (ms)</label>
              <input type="number" value={timingInputs.yearBigGapDelay}
                onChange={e => setTimingInputs(p => ({ ...p, yearBigGapDelay: parseInt(e.target.value) || 0 }))}
                min="50" max="2000" step="50" />
            </div>
          </div>
          <button className={styles.confirmButton} onClick={() => {
            setInitialHold(timingInputs.initialHold);
            setMemberRevealDelay(timingInputs.memberRevealDelay);
            setYearNormalDelay(timingInputs.yearNormalDelay);
            setYearBigGapDelay(timingInputs.yearBigGapDelay);
          }}>
            Confirm
          </button>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Example data: NATO Membership Records</p>
        </footer>
      </main>
    </div>
  );
}

export default NATOGlobe;
