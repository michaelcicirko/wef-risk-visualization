import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Globe from 'globe.gl';
import { feature } from 'topojson-client';
import { loadProcessedWMOData } from '../data/wmoExtremeEvents.js';
import styles from './WMOExtremeEvents.module.css';

export default function WMOExtremeEvents() {
  const globeContainerRef = useRef(null);
  const globeInstanceRef = useRef(null);
  const [worldData, setWorldData] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch world topology
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(setWorldData)
      .catch(err => console.error('Failed to load world data:', err));
  }, []);

  // Fetch WMO extreme events data
  useEffect(() => {
    loadProcessedWMOData()
      .then(({ data }) => setEvents(data))
      .catch(err => console.error('Failed to load WMO data:', err));
  }, []);

  // Initialize globe
  useEffect(() => {
    if (!globeContainerRef.current || globeInstanceRef.current || !worldData) return;

    const g = Globe()(globeContainerRef.current);

    g.backgroundColor('#0a0a14')
      .showAtmosphere(true)
      .atmosphereColor('#1a3a5a')
      .atmosphereAltitude(0.1)
      .width(globeContainerRef.current.clientWidth)
      .height(globeContainerRef.current.clientHeight);

    g.controls().autoRotate = true;
    g.controls().autoRotateSpeed = 0.5;

    // Add landmass polygons
    const countries = feature(worldData, worldData.objects.countries);
    g.polygonsData(countries.features)
      .polygonCapColor(() => '#4a6a8a')
      .polygonSideColor(() => '#2a3a4a')
      .polygonStrokeColor(() => '#5a7a9a')
      .polygonAltitude(0.005);

    globeInstanceRef.current = g;
  }, [worldData]);

  // Add event points when data loads
  useEffect(() => {
    const g = globeInstanceRef.current;
    if (!g || events.length === 0) return;

    g.pointsData(events)
      .pointLat(d => d.position[1])
      .pointLng(d => d.position[0])
      .pointColor(d => d.color)
      .pointRadius(d => 0.4 + d.severityScore * 0.2)
      .pointAltitude(d => d.isMostSignificant ? 0.08 : 0.04)
      .pointResolution(12)
      .onPointClick(point => {
        setSelectedEvent(point);
        if (globeInstanceRef.current) {
          globeInstanceRef.current.controls().autoRotate = false;
        }
      });
  }, [events]);

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const closePanel = () => {
    setSelectedEvent(null);
    if (globeInstanceRef.current) {
      globeInstanceRef.current.controls().autoRotate = true;
    }
  };

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
        <h1 className={styles.title}>WMO Extreme Weather Events</h1>
        <span className={styles.subtitle}>December 2024 – June 2026</span>
      </nav>
      
      <div ref={globeContainerRef} className={styles.globeContainer} />
      
      {selectedEvent && (
        <aside className={styles.infoPanel}>
          <button className={styles.closeButton} onClick={closePanel}>×</button>
          
          <div className={styles.eventHeader}>
            <span 
              className={styles.eventTypeBadge} 
              style={{ backgroundColor: selectedEvent.color }}
            >
              {selectedEvent.eventTypeDisplay}
            </span>
            {selectedEvent.isMostSignificant && (
              <span className={styles.significantBadge}>★ Most Significant</span>
            )}
          </div>
          
          <h2 className={styles.eventCountry}>{selectedEvent.country}</h2>
          
          <div className={styles.eventMeta}>
            <div className={styles.metaItem}>
              <label>Date</label>
              <span>{formatDate(selectedEvent.startDate)}</span>
            </div>
            {selectedEvent.endDate && selectedEvent.endDate !== selectedEvent.startDate && (
              <div className={styles.metaItem}>
                <label>End Date</label>
                <span>{formatDate(selectedEvent.endDate)}</span>
              </div>
            )}
            <div className={styles.metaItem}>
              <label>Severity</label>
              <span className={selectedEvent.rarity === 'Unprecendented' ? styles.severe : ''}>
                {selectedEvent.rarity}
              </span>
            </div>
            <div className={styles.metaItem}>
              <label>Coordinates</label>
              <span>{selectedEvent.position[1].toFixed(2)}°, {selectedEvent.position[0].toFixed(2)}°</span>
            </div>
          </div>
          
          {selectedEvent.locationDescription && (
            <div className={styles.descriptionSection}>
              <h4>Location</h4>
              <p>{selectedEvent.locationDescription}</p>
            </div>
          )}
          
          {selectedEvent.description && (
            <div className={styles.descriptionSection}>
              <h4>Description</h4>
              <p>{selectedEvent.description}</p>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
