import { useState } from 'react';
import { D3Chart } from './components/D3Chart.jsx';
import { TimelineSlider } from './components/TimelineSlider.jsx';
import { useInterpolatedData } from './hooks/useInterpolatedData.js';
import { categoryColors, YEAR_MIN } from './data/risks.js';
import styles from './App.module.css';

function App() {
  // Start at 2026 (current rankings)
  const [year, setYear] = useState(YEAR_MIN);
  
  // Get interpolated data based on current year
  const data = useInterpolatedData(year);
  
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Global Risks by Severity</h1>
        <p className={styles.subtitle}>
          Top 10 risks ranked over time (2026–2036)
        </p>
      </header>
      
      <main className={styles.main}>
        <D3Chart data={data} />
        <TimelineSlider year={year} onYearChange={setYear} />
        
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
        
        <footer className={styles.footer}>
          <p className={styles.source}>
            Source: World Economic Forum Global Risks Perception Survey 2025-2026
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
