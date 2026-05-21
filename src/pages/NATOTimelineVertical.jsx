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
const VISIBLE_COUNT = 5; // Number of visible members in the feed
const MEMBER_REVEAL_DELAY = 400; // ms between each member reveal

function NATOTimelineVertical() {
  const [year, setYear] = useState(YEAR_START);
  const [isPlaying, setIsPlaying] = useState(true);
  const [visibleMembers, setVisibleMembers] = useState(() => {
    // Start with just Belgium (first founding member alphabetically)
    const belgium = natoMembers.find(m => m.country === 'Belgium');
    return belgium ? [belgium] : [];
  });
  const [animationPhase, setAnimationPhase] = useState('revealing-founders'); // 'revealing-founders' | 'year-advance' | 'revealing-year-members'
  const [foundingRevealedCount, setFoundingRevealedCount] = useState(1); // Belgium is already showing
  const [yearRevealedCount, setYearRevealedCount] = useState(0); // Members revealed for current join year
  const [currentYearMembers, setCurrentYearMembers] = useState([]); // Members to reveal for current year
  const listRef = useRef(null);
  const lastProcessedYear = useRef(YEAR_START);
  const isFirstMemberOfYear = useRef(true); // Track if first member of current year
  
  // Get founding members sorted alphabetically
  const foundingMembers = useMemo(() => {
    return natoMembers.filter(m => m.founding).sort((a, b) => a.country.localeCompare(b.country));
  }, []);
  
  // State machine animation loop
  useEffect(() => {
    if (!isPlaying) return;
    
    let timeoutId;
    
    const runAnimation = () => {
      const currentYearInt = Math.floor(year);
      
      if (animationPhase === 'revealing-founders') {
        // Reveal founding members one by one while holding at 1949
        if (foundingRevealedCount < foundingMembers.length) {
          const nextMember = foundingMembers[foundingRevealedCount];
          setVisibleMembers(prev => {
            if (prev.find(m => m.id === nextMember.id)) return prev;
            return [...prev, nextMember].sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              return a.country.localeCompare(b.country);
            });
          });
          setFoundingRevealedCount(foundingRevealedCount + 1);
          timeoutId = setTimeout(runAnimation, MEMBER_REVEAL_DELAY);
        } else {
          // All founding members revealed - start year countdown
          setAnimationPhase('year-advance');
          timeoutId = setTimeout(runAnimation, 500);
        }
        
      } else if (animationPhase === 'year-advance') {
        if (currentYearInt >= YEAR_END) {
          // Animation complete
          setIsPlaying(false);
          return;
        }
        
        // Calculate next year and check if it has members
        const nextYear = currentYearInt + 1;
        const nextYearMembers = getNewMembersForYear(nextYear);
        
        if (nextYearMembers.length > 0) {
          // Next year has members - batch year update + first member together
          lastProcessedYear.current = nextYear;
          setCurrentYearMembers(nextYearMembers);
          
          // BATCH: Update year AND first member in same render cycle
          setYear(nextYear);
          const firstMember = nextYearMembers[0];
          setVisibleMembers(prev => {
            if (prev.find(m => m.id === firstMember.id)) return prev;
            return [...prev, firstMember].sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              return a.country.localeCompare(b.country);
            });
          });
          
          if (nextYearMembers.length > 1) {
            // More members to reveal - switch to reveal phase
            setYearRevealedCount(1); // First member already added
            setAnimationPhase('revealing-year-members');
            timeoutId = setTimeout(runAnimation, MEMBER_REVEAL_DELAY);
          } else {
            // Only one member - continue advancing after brief pause
            timeoutId = setTimeout(() => {
              runAnimation();
            }, 250);
          }
        } else {
          // No members next year - just advance year quickly
          const isGapYear = !JOIN_YEARS.includes(nextYear);
          const delay = isGapYear ? 150 : 250;
          
          timeoutId = setTimeout(() => {
            setYear(nextYear);
            runAnimation();
          }, delay);
        }
        
      } else if (animationPhase === 'revealing-year-members') {
        // Reveal remaining members for current year (index 0 already added with year)
        if (yearRevealedCount < currentYearMembers.length) {
          const nextMember = currentYearMembers[yearRevealedCount];
          setVisibleMembers(prev => {
            if (prev.find(m => m.id === nextMember.id)) return prev;
            return [...prev, nextMember].sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              return a.country.localeCompare(b.country);
            });
          });
          setYearRevealedCount(yearRevealedCount + 1);
          // Schedule next member with delay
          timeoutId = setTimeout(runAnimation, MEMBER_REVEAL_DELAY);
        } else {
          // All members revealed - resume year advance
          setAnimationPhase('year-advance');
          timeoutId = setTimeout(runAnimation, 250);
        }
      }
    };
    
    // Start animation after initial pause
    timeoutId = setTimeout(runAnimation, PAUSE_DURATION);
    
    return () => clearTimeout(timeoutId);
  }, [isPlaying, animationPhase, foundingRevealedCount, year, foundingMembers, currentYearMembers, yearRevealedCount]);
  
  const handleReplay = useCallback(() => {
    setYear(YEAR_START);
    const belgium = natoMembers.find(m => m.country === 'Belgium');
    setVisibleMembers(belgium ? [belgium] : []);
    setFoundingRevealedCount(1);
    setYearRevealedCount(0);
    setCurrentYearMembers([]);
    setAnimationPhase('revealing-founders');
    lastProcessedYear.current = YEAR_START;
    isFirstMemberOfYear.current = true;
    setIsPlaying(true);
  }, [foundingMembers]);
  
  // Show last 5 members in the feed
  const displayMembers = useMemo(() => {
    // Always show last 5 (or fewer if less available)
    return visibleMembers.slice(-VISIBLE_COUNT);
  }, [visibleMembers]);
  
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
