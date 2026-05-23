import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { natoMembers, YEAR_START, YEAR_END, getNewMembersForYear } from '../data/natoMembers.js';
import styles from './NATOTimelineHorizontal.module.css';

// Get all unique join years from the data
const JOIN_YEARS = [...new Set(natoMembers.map(m => m.year))].sort((a, b) => a - b);

// Build segments: 3x speed when members join, 10x speed for gaps > 3 years
// Also add 1s pause at start for founding members
const TIME_SEGMENTS = [];
let currentTime = 0;

// Add 1s pause at 1949 for founding members
TIME_SEGMENTS.push([1949, 1949, 0, "Pause at founding"]);
currentTime += 1000;

// Build segments based on join years
for (let i = 0; i < JOIN_YEARS.length - 1; i++) {
  const year = JOIN_YEARS[i];
  const nextYear = JOIN_YEARS[i + 1];
  const gap = nextYear - year;
  
  // 3x speed for the year itself
  TIME_SEGMENTS.push([year, year + 1, 3, `3x through ${year}`]);
  currentTime += 500; // 0.5s at 3x speed
  
  // Gap to next join year
  if (gap > 1) {
    const gapYears = gap - 1; // Years between this year and next join year
    const isBigGap = gapYears > 3;
    const speed = isBigGap ? 10 : 3;
    const speedLabel = isBigGap ? "10x speed" : "3x speed";
    TIME_SEGMENTS.push([year + 1, nextYear, speed, `${speedLabel} gap to ${nextYear}`]);
    currentTime += (gapYears * 1500) / speed; // Base 1.5s, divided by speed
  }
}

// Add final year (2024) at 3x speed
TIME_SEGMENTS.push([2024, 2024, 3, "End at 2024"]);
currentTime += 500;

const PAUSE_DURATION = 1000; // 1 second pause at start
const BASE_YEAR_DURATION = 1500; // 1.5 seconds per year at normal (1x) speed

// Total duration calculated from segments
const TOTAL_DURATION = Math.ceil(currentTime);

function NATOTimelineHorizontal() {
  const [year, setYear] = useState(YEAR_START);
  const [isPlaying, setIsPlaying] = useState(true);
  const [visibleMembers, setVisibleMembers] = useState([]);
  
  // Calculate which members should be visible based on current year
  // Sort by year (chronological), then alphabetically within each year
  useEffect(() => {
    const members = natoMembers
      .filter(m => m.year <= Math.floor(year))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.country.localeCompare(b.country);
      });
    setVisibleMembers(members);
  }, [year]);
  
  // Variable speed animation with dynamic timing
  useEffect(() => {
    if (!isPlaying) return;
    
    const startTime = Date.now();
    
    // Calculate durations from TIME_SEGMENTS
    const segmentDurations = TIME_SEGMENTS.map(([start, end, speed]) => {
      if (speed === 0) return PAUSE_DURATION;
      const yearSpan = end - start;
      return (yearSpan * BASE_YEAR_DURATION) / speed;
    });
    
    // Calculate cumulative end times
    const segmentEndTimes = [];
    let cumulative = 0;
    for (const duration of segmentDurations) {
      cumulative += duration;
      segmentEndTimes.push(cumulative);
    }
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const lastSegmentEnd = segmentEndTimes[segmentEndTimes.length - 1] || TOTAL_DURATION;
      
      if (elapsed >= lastSegmentEnd) {
        setYear(YEAR_END);
        setIsPlaying(false);
        return;
      }
      
      // Find which segment we're in
      let segmentIndex = 0;
      let timeInPreviousSegments = 0;
      
      for (let i = 0; i < segmentEndTimes.length; i++) {
        if (elapsed <= segmentEndTimes[i]) {
          segmentIndex = i;
          timeInPreviousSegments = i > 0 ? segmentEndTimes[i - 1] : 0;
          break;
        }
      }
      
      // Safety check: if elapsed is past all segments, use the last one
      if (elapsed > segmentEndTimes[segmentEndTimes.length - 1]) {
        segmentIndex = TIME_SEGMENTS.length - 1;
        timeInPreviousSegments = segmentEndTimes[segmentEndTimes.length - 2] || 0;
      }
      
      const [segStart, segEnd, segSpeed] = TIME_SEGMENTS[segmentIndex];
      const timeInSegment = elapsed - timeInPreviousSegments;
      const segmentDuration = segmentDurations[segmentIndex];
      
      let currentYear;
      if (segSpeed === 0) {
        // During pause, stay at start year
        currentYear = segStart;
      } else {
        // Calculate progress within segment
        const segmentProgress = timeInSegment / segmentDuration;
        currentYear = segStart + (segEnd - segStart) * segmentProgress;
      }
      
      setYear(currentYear);
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);
  
  const handleReplay = useCallback(() => {
    setYear(YEAR_START);
    setVisibleMembers([]);
    setIsPlaying(true);
  }, []);
  
  // Track which members are new in the current year for stagger animation
  const newMemberIds = useMemo(() => {
    const yearInt = Math.floor(year);
    const joiningThisYear = getNewMembersForYear(yearInt);
    return new Set(joiningThisYear.map(m => m.id));
  }, [year]);
  
  // Calculate stagger delay for new members
  const getStaggerDelay = (memberId) => {
    if (!newMemberIds.has(memberId)) return 0; // No delay for existing members
    
    const count = newMemberIds.size;
    const index = Array.from(newMemberIds).indexOf(memberId);
    
    let baseDelay;
    if (count >= 7) baseDelay = 0.12; // 2004 expansion
    else if (count >= 3) baseDelay = 0.15; // 1999 expansion
    else if (count === 2) baseDelay = 0.2;  // 1952, 2009
    else baseDelay = 0.1; // Single or founding
    
    return index * baseDelay;
  };
  
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Animated Grid Timeline</h1>
        <p className={styles.subtitle}>
          Example: Progressive card reveal in a responsive grid layout
        </p>
      </header>
      
      <main className={styles.main}>
        {/* Top Section: Year + Counter */}
        <div className={styles.topSection}>
          <div className={styles.yearDisplay}>
            <motion.span 
              className={styles.yearNumber}
              key={Math.floor(year)}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {Math.floor(year)}
            </motion.span>
          </div>
          
          <div className={styles.counter}>
            <span className={styles.counterNumber}>{visibleMembers.length}</span>
            <span className={styles.counterLabel}>members</span>
          </div>
        </div>
        
        {/* Member Grid - 3 columns */}
        <div className={styles.gridContainer}>
          <motion.div 
            className={styles.memberGrid}
            layout
          >
            <AnimatePresence mode="popLayout">
              {visibleMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  className={styles.memberCell}
                  layout
                  initial={{ 
                    scale: 1.2, 
                    opacity: 0,
                    y: -20
                  }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    y: 0
                  }}
                  exit={{ 
                    scale: 0.9, 
                    opacity: 0
                  }}
                  transition={{
                    layout: { duration: 0.4, ease: "easeOut" },
                    scale: { duration: 0.3, delay: getStaggerDelay(member.id) },
                    opacity: { duration: 0.25, delay: getStaggerDelay(member.id) },
                    y: { duration: 0.35, ease: "easeOut", delay: getStaggerDelay(member.id) }
                  }}
                >
                  <span className={styles.flag}>{member.flag}</span>
                  <span className={styles.countryName}>{member.country}</span>
                  <span className={styles.yearJoined}>{member.year}</span>
                  {member.founding && (
                    <span className={styles.foundingBadge}>Founding</span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
        
        {/* Controls */}
        <div className={styles.controls}>
          <button 
            className={styles.controlButton}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button 
            className={styles.controlButton}
            onClick={handleReplay}
            disabled={isPlaying}
          >
            Replay
          </button>
        </div>
        
        {/* Progress bar */}
        <div className={styles.progressContainer}>
          <div 
            className={styles.progressBar}
            style={{ 
              width: `${((year - YEAR_START) / (YEAR_END - YEAR_START)) * 100}%` 
            }}
          />
        </div>
        
        <footer className={styles.footer}>
          <p className={styles.source}>
            Source: NATO Official Membership Records
          </p>
        </footer>
      </main>
    </div>
  );
}

export default NATOTimelineHorizontal;
