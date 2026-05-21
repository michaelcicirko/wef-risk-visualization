import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { natoMembers, YEAR_START, YEAR_END, getNewMembersForYear } from '../data/natoMembers.js';
import styles from './NATOTimelineVertical.module.css';

// Get all unique join years from the data
const JOIN_YEARS = [...new Set(natoMembers.map(m => m.year))].sort((a, b) => a - b);

// Build segments: 3x speed when members join, 10x speed for gaps > 3 years
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
  currentTime += 500;
  
  // Gap to next join year
  if (gap > 1) {
    const gapYears = gap - 1;
    const isBigGap = gapYears > 3;
    const speed = isBigGap ? 10 : 3;
    TIME_SEGMENTS.push([year + 1, nextYear, speed, `${isBigGap ? '10x' : '3x'} gap to ${nextYear}`]);
    currentTime += (gapYears * 1500) / speed;
  }
}

// Add final year (2024) at 3x speed
TIME_SEGMENTS.push([2024, 2024, 3, "End at 2024"]);
currentTime += 500;

const PAUSE_DURATION = 1000;
const BASE_YEAR_DURATION = 1500;
const TOTAL_DURATION = Math.ceil(currentTime);
const VISIBLE_COUNT = 10; // Number of visible members in the feed

function NATOTimelineVertical() {
  const [year, setYear] = useState(YEAR_START);
  const [isPlaying, setIsPlaying] = useState(true);
  const [visibleMembers, setVisibleMembers] = useState([]);
  const listRef = useRef(null);
  
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
  
  // No auto-scroll needed - we maintain exactly 10 visible items with fade animations
  
  // Variable speed animation
  useEffect(() => {
    if (!isPlaying) return;
    
    const startTime = Date.now();
    
    const segmentDurations = TIME_SEGMENTS.map(([start, end, speed]) => {
      if (speed === 0) return PAUSE_DURATION;
      const yearSpan = end - start;
      return (yearSpan * BASE_YEAR_DURATION) / speed;
    });
    
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
      
      let segmentIndex = 0;
      let timeInPreviousSegments = 0;
      
      for (let i = 0; i < segmentEndTimes.length; i++) {
        if (elapsed <= segmentEndTimes[i]) {
          segmentIndex = i;
          timeInPreviousSegments = i > 0 ? segmentEndTimes[i - 1] : 0;
          break;
        }
      }
      
      if (elapsed > segmentEndTimes[segmentEndTimes.length - 1]) {
        segmentIndex = TIME_SEGMENTS.length - 1;
        timeInPreviousSegments = segmentEndTimes[segmentEndTimes.length - 2] || 0;
      }
      
      const [segStart, segEnd, segSpeed] = TIME_SEGMENTS[segmentIndex];
      const timeInSegment = elapsed - timeInPreviousSegments;
      const segmentDuration = segmentDurations[segmentIndex];
      
      let currentYear;
      if (segSpeed === 0) {
        currentYear = segStart;
      } else {
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
  
  // Show all 12 founding members at 1949, then last 10 for subsequent years
  const displayMembers = useMemo(() => {
    const currentYear = Math.floor(year);
    // At founding year (1949), show all 12 founding members
    // After that, show last 10 members
    if (currentYear === 1949 && visibleMembers.length === 12) {
      return visibleMembers; // Show all 12 founding members
    }
    return visibleMembers.slice(-VISIBLE_COUNT);
  }, [visibleMembers, year]);
  
  // Track which members are new in the current year for animation
  const newMemberIds = useMemo(() => {
    const yearInt = Math.floor(year);
    const joiningThisYear = getNewMembersForYear(yearInt);
    return new Set(joiningThisYear.map(m => m.id));
  }, [year]);
  
  // Check if current year has new members joining (for year color highlight)
  const hasNewMembersThisYear = useMemo(() => {
    const yearInt = Math.floor(year);
    const joiningThisYear = getNewMembersForYear(yearInt);
    return joiningThisYear.length > 0;
  }, [year]);
  
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>NATO Timeline — Vertical Feed</h1>
        <p className={styles.subtitle}>
          Expansion from 12 to 32 members (1949–2024)
        </p>
      </header>
      
      <main className={styles.main}>
        {/* Content Container */}
        <div className={styles.content}>
          {/* Left: Member List - exactly 10 items, fade in at bottom, fade out at top */}
          <div className={styles.listContainer}>
            <div className={styles.memberList}>
              <AnimatePresence mode="popLayout">
                {displayMembers.map((member, index) => (
                  <motion.div
                    key={member.id}
                    className={styles.memberRow}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{
                      layout: { duration: 0.3 },
                      opacity: { duration: 0.3 },
                      y: { duration: 0.25, ease: "easeOut" }
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
            </div>
          </div>
          
          {/* Right: Year Display - vertically centered with list */}
          <div className={styles.yearSection}>
            <motion.div 
              className={styles.yearDisplay}
              key={Math.floor(year)}
              initial={{ scale: 1.1, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <span className={`${styles.yearNumber} ${hasNewMembersThisYear ? styles.yearHighlight : ''}`}>
                {Math.floor(year)}
              </span>
            </motion.div>
            
            <div className={styles.counter}>
              <span className={styles.counterNumber}>{visibleMembers.length}</span>
              <span className={styles.counterLabel}>members</span>
            </div>
          </div>
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

export default NATOTimelineVertical;
