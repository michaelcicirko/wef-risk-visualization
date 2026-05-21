import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { D3Chart } from '../components/D3Chart.jsx';
import { TimelineSlider } from '../components/TimelineSlider.jsx';
import { useInterpolatedData } from '../hooks/useInterpolatedData.js';
import { categoryColors, YEAR_MIN, YEAR_MAX } from '../data/risks.js';
import styles from './RiskTimeline.module.css';

function RiskTimeline() {
  const [year, setYear] = useState(YEAR_MIN);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const data = useInterpolatedData(year);
  
  // Auto-play animation: 10 seconds total from 2026 to 2036
  useEffect(() => {
    if (!isPlaying) return;
    
    const totalDuration = 10000;
    const startTime = Date.now();
    const yearRange = YEAR_MAX - YEAR_MIN;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      const currentYear = YEAR_MIN + (yearRange * progress);
      setYear(currentYear);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);
  
  const handleReplay = useCallback(() => {
    setYear(YEAR_MIN);
    setIsPlaying(true);
  }, []);
  
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Global Risks by Severity</h1>
        <p className={styles.subtitle}>
          Top 10 risks ranked over time (2026–2036)
        </p>
      </header>
      
      <main className={styles.main}>
        <div className={styles.legend}>
          <h3 className={styles.legendTitle}>Risk Categories</h3>
          <div className={styles.legendItems}>
            {Object.entries(categoryColors).map(([category, color]) => (
              <div key={category} className={styles.legendItem}>
                <span 
                  className={styles.legendColor} 
                  style={{ backgroundColor: color }}
                />
                <span className={styles.legendLabel}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className={styles.chartWrapper}>
          <D3Chart data={data} />
          <div className={styles.yearDisplay}>
            <span className={styles.yearNumber}>{Math.round(year)}</span>
          </div>
        </div>
        
        <TimelineSlider year={year} onYearChange={setYear} />
        
        <div className={styles.controls}>
          <button 
            className={styles.replayButton}
            onClick={handleReplay}
            disabled={isPlaying}
          >
            {isPlaying ? 'Playing...' : 'Replay Animation'}
          </button>
        </div>
        
        <footer className={styles.footer}>
          <p className={styles.source}>
            Source: World Economic Forum Global Risks Perception Survey 2025-2026
          </p>
        </footer>
      </main>
    </div>
  );
}

export default RiskTimeline;
