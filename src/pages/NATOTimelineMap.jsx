import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { natoMembers, YEAR_START, YEAR_END, getNewMembersForYear, getMembersByYear } from '../data/natoMembers.js';
import styles from './NATOTimelineMap.module.css';

// Get all unique join years from the data
const JOIN_YEARS = [...new Set(natoMembers.map(m => m.year))].sort((a, b) => a - b);

// ISO numeric country code → NATO member ID lookup
const COUNTRY_CODE_TO_ID = {
  56: 'belgium',
  124: 'canada',
  208: 'denmark',
  250: 'france',
  352: 'iceland',
  380: 'italy',
  442: 'luxembourg',
  528: 'netherlands',
  578: 'norway',
  620: 'portugal',
  826: 'uk',
  840: 'us',
  300: 'greece',
  792: 'turkey',
  276: 'germany',
  724: 'spain',
  203: 'czechia',
  348: 'hungary',
  616: 'poland',
  100: 'bulgaria',
  233: 'estonia',
  428: 'latvia',
  440: 'lithuania',
  642: 'romania',
  703: 'slovakia',
  705: 'slovenia',
  8: 'albania',
  191: 'croatia',
  499: 'montenegro',
  807: 'macedonia',
  246: 'finland',
  752: 'sweden',
};

// Reverse: member ID → numeric code
const ID_TO_COUNTRY_CODE = Object.fromEntries(
  Object.entries(COUNTRY_CODE_TO_ID).map(([code, id]) => [id, +code])
);

// Colour constants
const COLOR_NON_MEMBER = '#1e1e2e';
const COLOR_MEMBER = '#1a5276';
const COLOR_FLASH = '#ff00ff';
const COLOR_BORDER = '#3a3a5a';
const COLOR_OCEAN = '#0d0d1a';

// Label hold duration on map before fade-out
const LABEL_HOLD_MS = 800;

function NATOTimelineMap() {
  const svgRef = useRef(null);
  const mapContainerRef = useRef(null);
  const panelRef = useRef(null);
  const zoomRef = useRef(null);
  const projectionRef = useRef(null); // store latest projection for centroid lookup

  const [year, setYear] = useState(YEAR_START);
  const yearRef = useRef(YEAR_START);
  const [isPlaying, setIsPlaying] = useState(true);
  const [worldData, setWorldData] = useState(null);
  const [visibleMembers, setVisibleMembers] = useState([]);
  const [animationPhase, setAnimationPhase] = useState('revealing-founders');
  const [currentYearMembers, setCurrentYearMembers] = useState([]);
  const lastProcessedYear = useRef(YEAR_START);
  const foundingRevealedCountRef = useRef(0);
  const yearRevealedCountRef = useRef(0);

  // Flying label state: one label in flight at a time
  const [flyingLabel, setFlyingLabel] = useState(null);
  // { id, flag, country, fromX, fromY, phase: 'appearing'|'flying'|'done' }

  // Timing controls
  const [initialHold, setInitialHold] = useState(2000);
  const [memberRevealDelay, setMemberRevealDelay] = useState(2000);
  const [yearNormalDelay, setYearNormalDelay] = useState(400);
  const [yearBigGapDelay, setYearBigGapDelay] = useState(200);
  const [timingInputs, setTimingInputs] = useState({
    initialHold: 2000,
    memberRevealDelay: 2000,
    yearNormalDelay: 400,
    yearBigGapDelay: 200,
  });

  const [flashingIds, setFlashingIds] = useState(new Set());

  const foundingMembers = useMemo(() => {
    return natoMembers.filter(m => m.founding).sort((a, b) => a.country.localeCompare(b.country));
  }, []);

  // Fetch world TopoJSON on mount
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(res => res.json())
      .then(topo => {
        const countries = feature(topo, topo.objects.countries);
        setWorldData(countries);
      });
  }, []);

  const memberIds = useMemo(() => new Set(visibleMembers.map(m => m.id)), [visibleMembers]);

  const [svgSize, setSvgSize] = useState({ width: 900, height: 500 });

  useEffect(() => {
    if (!svgRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setSvgSize({ width, height });
      }
    });
    observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, []);

  // Set up zoom once on mount
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    const zoomBehaviour = zoom()
      .scaleExtent([1, 12])
      .on('zoom', (event) => {
        svg.select('.map-root').attr('transform', event.transform);
      });
    svg.call(zoomBehaviour);
    zoomRef.current = zoomBehaviour;
    return () => svg.on('.zoom', null);
  }, []);

  // Render map
  useEffect(() => {
    if (!worldData || !svgRef.current) return;
    const { width, height } = svgSize;
    const padding = 20;

    const projection = geoNaturalEarth1()
      .fitExtent([[padding, padding], [width - padding, height - padding]], { type: 'Sphere' });

    projectionRef.current = projection;
    const pathGen = geoPath().projection(projection);
    const svg = select(svgRef.current);

    svg.attr('width', width).attr('height', height);

    svg.selectAll('.ocean-bg').data([1]).join('rect')
      .attr('class', 'ocean-bg')
      .attr('width', width).attr('height', height)
      .attr('fill', COLOR_OCEAN).lower();

    let mapRoot = svg.select('.map-root');
    if (mapRoot.empty()) mapRoot = svg.append('g').attr('class', 'map-root');

    mapRoot.selectAll('.sphere').data([{ type: 'Sphere' }]).join('path')
      .attr('class', 'sphere').attr('d', pathGen)
      .attr('fill', 'none').attr('stroke', '#2a2a4a').attr('stroke-width', 0.5);

    const paths = mapRoot.selectAll('.country').data(worldData.features, d => d.id);
    paths.join(
      enter => enter.append('path')
        .attr('class', 'country').attr('d', pathGen)
        .attr('stroke', COLOR_BORDER).attr('stroke-width', 0.4)
        .attr('cursor', 'pointer')
        .attr('fill', d => {
          const mid = COUNTRY_CODE_TO_ID[+d.id];
          if (!mid) return COLOR_NON_MEMBER;
          if (flashingIds.has(mid)) return COLOR_FLASH;
          if (memberIds.has(mid)) return COLOR_MEMBER;
          return COLOR_NON_MEMBER;
        }),
      update => update.attr('d', pathGen)
        .attr('fill', d => {
          const mid = COUNTRY_CODE_TO_ID[+d.id];
          if (!mid) return COLOR_NON_MEMBER;
          if (flashingIds.has(mid)) return COLOR_FLASH;
          if (memberIds.has(mid)) return COLOR_MEMBER;
          return COLOR_NON_MEMBER;
        })
    );
  }, [worldData, memberIds, flashingIds, svgSize]);

  const handleResetZoom = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    select(svgRef.current).transition().duration(500)
      .call(zoomRef.current.transform, zoomIdentity);
  }, []);

  // Calculate SVG centroid for a member, returned as page-relative coords within mapContainer
  const getMemberCentroid = useCallback((memberId) => {
    if (!worldData || !projectionRef.current || !mapContainerRef.current) return null;
    const code = ID_TO_COUNTRY_CODE[memberId];
    if (!code) return null;
    const feat = worldData.features.find(f => +f.id === code);
    if (!feat) return null;
    const pathGen = geoPath().projection(projectionRef.current);
    const centroid = pathGen.centroid(feat);
    if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return null;

    // Get current zoom transform
    const svgEl = svgRef.current;
    const mapRoot = svgEl ? svgEl.querySelector('.map-root') : null;
    let tx = 0, ty = 0, tk = 1;
    if (mapRoot) {
      const transform = mapRoot.getAttribute('transform') || '';
      const match = transform.match(/translate\(([^,]+),([^)]+)\).*scale\(([^)]+)\)/);
      if (match) { tx = +match[1]; ty = +match[2]; tk = +match[3]; }
    }

    const x = centroid[0] * tk + tx;
    const y = centroid[1] * tk + ty;
    return { x, y };
  }, [worldData]);

  // Show label over country, hold, then fade out
  const triggerLabel = useCallback((member) => {
    const pos = getMemberCentroid(member.id);
    if (!pos) return;
    setFlyingLabel({ id: member.id, flag: member.flag, country: member.country, fromX: pos.x, fromY: pos.y, phase: 'appearing' });
    // Fade out after hold
    setTimeout(() => {
      setFlyingLabel(prev => prev && prev.id === member.id ? { ...prev, phase: 'fading' } : prev);
    }, LABEL_HOLD_MS);
    // Clear
    setTimeout(() => {
      setFlyingLabel(null);
    }, LABEL_HOLD_MS + 400);
  }, [getMemberCentroid]);

  // Reveal: flash map, show label, add to list — all simultaneously
  const revealMember = useCallback((member) => {
    setFlashingIds(new Set([member.id]));
    triggerLabel(member);
    setVisibleMembers(prev => {
      if (prev.find(m => m.id === member.id)) return prev;
      return [member, ...prev];
    });
    setTimeout(() => setFlashingIds(new Set()), 600);
  }, [triggerLabel]);

  // State machine animation loop
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
          return;
        }

        const nextYear = currentYearInt + 1;
        const nextYearMembers = getNewMembersForYear(nextYear);

        if (nextYearMembers.length > 0) {
          lastProcessedYear.current = nextYear;
          setCurrentYearMembers(nextYearMembers);
          yearRef.current = nextYear;
          setYear(nextYear);
          // Reveal the first member immediately — no delay between year hit and first member
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
  }, [isPlaying, animationPhase, foundingMembers, currentYearMembers, initialHold, memberRevealDelay, yearNormalDelay, yearBigGapDelay, revealMember]);

  // Scrub to any year — pauses animation and snaps state
  const handleScrub = useCallback((scrubYear) => {
    const y = parseInt(scrubYear);
    setIsPlaying(false);
    setFlyingLabel(null);
    setFlashingIds(new Set());
    yearRef.current = y;
    setYear(y);

    // Snap visible members to all who have joined by this year
    const members = getMembersByYear(y).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year; // newest first
      return a.country.localeCompare(b.country);
    });
    setVisibleMembers(members);

    // Set phase so Play resumes correctly from this year
    const nextJoinYear = JOIN_YEARS.find(jy => jy > y);
    if (nextJoinYear) {
      // There are still members to reveal — resume in year-advance from this year
      setAnimationPhase('year-advance');
      setCurrentYearMembers([]);
      yearRevealedCountRef.current = 0;
      foundingRevealedCountRef.current = foundingMembers.length; // founders done
      lastProcessedYear.current = y;
    } else {
      // At or past the end
      setAnimationPhase('year-advance');
    }
  }, [foundingMembers]);

  const handleReplay = useCallback(() => {
    setYear(YEAR_START);
    yearRef.current = YEAR_START;
    setVisibleMembers([]);
    foundingRevealedCountRef.current = 0;
    yearRevealedCountRef.current = 0;
    setCurrentYearMembers([]);
    setAnimationPhase('revealing-founders');
    lastProcessedYear.current = YEAR_START;
    setFlashingIds(new Set());
    setFlyingLabel(null);
    setIsPlaying(true);
  }, []);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Interactive Geo Map Timeline</h1>
        <p className={styles.subtitle}>Example: Geo-temporal storytelling with zoomable map and live member list</p>
      </header>

      <main className={styles.main}>
        {/* Main content row: panel + map */}
        <div className={styles.contentRow}>
          {/* Left member panel */}
          <div className={styles.memberPanel} ref={panelRef}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Members</span>
              <span className={styles.panelCount}>{visibleMembers.length} / 32</span>
            </div>
            <div className={styles.memberList}>
              <AnimatePresence>
                {visibleMembers.map(member => (
                  <motion.div
                    key={member.id}
                    className={styles.memberItem}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  >
                    <span className={styles.memberFlag}>{member.flag}</span>
                    <span className={styles.memberName}>{member.country}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Map */}
          <div className={styles.mapContainer} ref={mapContainerRef}>
            <svg ref={svgRef} className={styles.mapSvg} />

            {/* Country label — appears over country, holds, then fades */}
            {flyingLabel && (
              <div
                className={`${styles.flyingLabel} ${flyingLabel.phase === 'appearing' ? styles.flyingLabelAppear : ''} ${flyingLabel.phase === 'fading' ? styles.flyingLabelFade : ''}`}
                style={{ left: flyingLabel.fromX, top: flyingLabel.fromY }}
              >
                <span>{flyingLabel.flag}</span>
                <span>{flyingLabel.country}</span>
              </div>
            )}

            {/* Year overlay */}
            <div className={styles.yearOverlay}>
              <span
                className={styles.yearNumber}
                style={{ color: (animationPhase === 'revealing-founders' || animationPhase === 'revealing-year-members') ? '#ff00ff' : '#ffffff' }}
              >{year}</span>
              <span className={styles.memberCount}>{visibleMembers.length} members</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <button className={styles.controlButton} onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button className={styles.controlButton} onClick={handleReplay} disabled={isPlaying}>
            Replay
          </button>
          <button className={styles.controlButton} onClick={handleResetZoom}>
            Reset Zoom
          </button>
          <span className={styles.zoomHint}>Scroll to zoom · Drag to pan</span>
        </div>

        {/* Timing Controls */}
        <div className={styles.timingControls}>
          <div className={styles.timingGrid}>
            <div className={styles.timingField}>
              <label>Initial Hold (ms)</label>
              <input type="number" value={timingInputs.initialHold}
                onChange={(e) => setTimingInputs(prev => ({ ...prev, initialHold: parseInt(e.target.value) || 0 }))}
                min="500" max="10000" step="100" />
            </div>
            <div className={styles.timingField}>
              <label>Member Reveal (ms)</label>
              <input type="number" value={timingInputs.memberRevealDelay}
                onChange={(e) => setTimingInputs(prev => ({ ...prev, memberRevealDelay: parseInt(e.target.value) || 0 }))}
                min="200" max="5000" step="100" />
            </div>
            <div className={styles.timingField}>
              <label>Year Normal Gap (ms)</label>
              <input type="number" value={timingInputs.yearNormalDelay}
                onChange={(e) => setTimingInputs(prev => ({ ...prev, yearNormalDelay: parseInt(e.target.value) || 0 }))}
                min="50" max="2000" step="50" />
            </div>
            <div className={styles.timingField}>
              <label>Year Big Gap (ms)</label>
              <input type="number" value={timingInputs.yearBigGapDelay}
                onChange={(e) => setTimingInputs(prev => ({ ...prev, yearBigGapDelay: parseInt(e.target.value) || 0 }))}
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
            onChange={(e) => handleScrub(e.target.value)}
            style={{ '--progress': ((year - YEAR_START) / (YEAR_END - YEAR_START)) * 100 }}
          />
          <span className={styles.scrubberYear}>{YEAR_END}</span>
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: NATO Official Membership Records</p>
        </footer>
      </main>
    </div>
  );
}

export default NATOTimelineMap;
