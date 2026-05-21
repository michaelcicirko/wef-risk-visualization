import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';

function Dashboard() {
  const visualizations = [
    {
      id: 'risk-timeline',
      title: 'Global Risks Timeline',
      description: 'Animated bar chart showing top 10 global risks from 2026 to 2036 with smooth transitions between time states.',
      thumbnail: '/risk-timeline-thumb.png',
      path: '/risk-timeline'
    }
  ];

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>WEF Visualizations Dashboard</h1>
        <p className={styles.subtitle}>
          Interactive data visualizations from the World Economic Forum
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.grid}>
          {visualizations.map((viz) => (
            <Link 
              key={viz.id} 
              to={viz.path} 
              className={styles.card}
            >
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>{viz.title}</h2>
                <p className={styles.cardDescription}>{viz.description}</p>
                <span className={styles.cardLink}>View Visualization →</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        <p className={styles.source}>
          Source: World Economic Forum Global Risks Perception Survey
        </p>
      </footer>
    </div>
  );
}

export default Dashboard;
