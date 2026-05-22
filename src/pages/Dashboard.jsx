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
    },
    {
      id: 'nato-timeline-horizontal',
      title: 'NATO Timeline — Horizontal Grid',
      description: 'Animated timeline showing NATO expansion in a 3-column grid layout. 12 founding members (1949) to 32 members (2024).',
      thumbnail: '/nato-timeline-horizontal-thumb.png',
      path: '/nato-timeline-horizontal'
    },
    {
      id: 'nato-timeline-vertical',
      title: 'NATO Timeline — Vertical Feed',
      description: 'Animated vertical feed showing NATO expansion. Scrolling list reveals members as years progress, with large year display fixed on the right.',
      thumbnail: '/nato-timeline-vertical-thumb.png',
      path: '/nato-timeline-vertical'
    },
    {
      id: 'nato-timeline-vertical-population',
      title: 'NATO Timeline — Population View',
      description: 'Same vertical feed animation with population data displayed under each country name. Shows all 32 NATO members with their current populations.',
      thumbnail: '/nato-timeline-vertical-population-thumb.png',
      path: '/nato-timeline-vertical-population'
    },
    {
      id: 'nato-timeline-vertical-population-3',
      title: 'NATO Timeline — Population View (3 Visible)',
      description: 'Same population timeline but shows only 3 countries at a time for a more compact vertical feed.',
      thumbnail: '/nato-timeline-vertical-population-3-thumb.png',
      path: '/nato-timeline-vertical-population-3'
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
