import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';

function Dashboard() {
  const visualizations = [
    {
      id: 'risk-timeline',
      title: 'Animated Bar Chart',
      description: 'Ranked bar chart with smooth animated transitions between time states — demonstrates how changing data rankings can be visualised over time.',
      tag: 'Bar Chart · Time Series',
      path: '/risk-timeline'
    },
    {
      id: 'nato-timeline-horizontal',
      title: 'Animated Grid Timeline',
      description: 'Cards reveal progressively in a responsive grid as a year counter advances — demonstrates staggered entry animations for list-based data.',
      tag: 'Grid · Progressive Reveal',
      path: '/nato-timeline-horizontal'
    },
    {
      id: 'nato-timeline-vertical',
      title: 'Vertical Feed Timeline',
      description: 'Entries scroll into a vertical feed as time progresses, with a prominent year counter fixed to the right — suitable for event-driven datasets.',
      tag: 'Vertical Feed · Event Timeline',
      path: '/nato-timeline-vertical'
    },
    {
      id: 'nato-timeline-vertical-population',
      title: 'Vertical Feed + Data Attribute',
      description: 'Extends the vertical feed with a secondary data attribute shown beneath each entry — demonstrates multi-field storytelling within a timeline.',
      tag: 'Vertical Feed · Multi-field',
      path: '/nato-timeline-vertical-population'
    },
    {
      id: 'nato-timeline-vertical-population-3',
      title: 'Windowed Feed (3 Items)',
      description: 'A windowed view that shows only 3 entries at a time — demonstrates a compact, focused feed ideal for screen recording or presentation.',
      tag: 'Windowed Feed · Compact',
      path: '/nato-timeline-vertical-population-3'
    },
    {
      id: 'nato-timeline-vertical-population-1',
      title: 'Single-Focus Feed',
      description: 'One entry at a time with full visual emphasis — demonstrates a high-impact sequential reveal format suited to broadcast or slide-based output.',
      tag: 'Single Focus · Sequential',
      path: '/nato-timeline-vertical-population-1'
    },
    {
      id: 'nato-timeline-map',
      title: 'Interactive Geo Map Timeline',
      description: 'Countries highlight on a zoomable world map as time advances, with a live member list populating alongside — demonstrates geo-temporal storytelling.',
      tag: 'Map · Geo-temporal · Interactive',
      path: '/nato-timeline-map'
    },
    {
      id: 'nato-globe',
      title: '3D Globe Timeline',
      description: 'Countries illuminate on an auto-rotating 3D globe as time advances — the camera tracks each joining nation. Optimised for screen recording.',
      tag: '3D Globe · Auto-rotating · Geo-temporal',
      path: '/nato-globe'
    }
  ];

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>Visualisation Capabilities</h1>
        <p className={styles.subtitle}>
          A showcase of interactive data visualisation formats — each example demonstrates a different approach to animated, time-based storytelling.
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.grid}>
          {[...visualizations].reverse().map((viz) => (
            <Link 
              key={viz.id} 
              to={viz.path} 
              className={styles.card}
            >
              <div className={styles.cardContent}>
                {viz.tag && <span className={styles.cardTag}>{viz.tag}</span>}
                <h2 className={styles.cardTitle}>{viz.title}</h2>
                <p className={styles.cardDescription}>{viz.description}</p>
                <span className={styles.cardLink}>View Example →</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        <p className={styles.source}>
          Example data: NATO Membership Records · WEF Global Risks Perception Survey
        </p>
      </footer>
    </div>
  );
}

export default Dashboard;
