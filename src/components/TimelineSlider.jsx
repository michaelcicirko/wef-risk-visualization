import { YEAR_MIN, YEAR_MID, YEAR_MAX } from '../data/risks.js';
import { formatYearLabel } from '../hooks/useInterpolatedData.js';
import styles from './TimelineSlider.module.css';

/**
 * TimelineSlider Component
 * Interactive slider to scrub between 2026-2036
 * @param {number} year - Current selected year
 * @param {function} onYearChange - Callback when year changes
 */
export function TimelineSlider({ year, onYearChange }) {
  const handleChange = (e) => {
    onYearChange(Number(e.target.value));
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.yearDisplay}>
        <span className={styles.yearLabel}>{formatYearLabel(year)}</span>
      </div>
      
      <div className={styles.sliderWrapper}>
        <input
          type="range"
          min={YEAR_MIN}
          max={YEAR_MAX}
          step={0.1}
          value={year}
          onChange={handleChange}
          className={styles.slider}
          aria-label="Timeline from 2026 to 2036"
        />
        
        <div className={styles.markers}>
          <div className={styles.marker} style={{ left: '0%' }}>
            <span className={styles.markerLabel}>2026</span>
            <span className={styles.markerDot}></span>
          </div>
          <div className={styles.marker} style={{ left: '20%' }}>
            <span className={styles.markerLabel}>2028</span>
            <span className={styles.markerDot}></span>
          </div>
          <div className={styles.marker} style={{ left: '100%' }}>
            <span className={styles.markerLabel}>2036</span>
            <span className={styles.markerDot}></span>
          </div>
        </div>
      </div>
    </div>
  );
}
