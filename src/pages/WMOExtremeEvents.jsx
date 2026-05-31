import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Globe from 'globe.gl';
import { feature } from 'topojson-client';
import { loadProcessedWMOData, EVENT_TYPE_COLORS, EVENT_TYPE_ICONS } from '../data/wmoExtremeEvents.js';
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
      .showAtmosphere(false)
      .width(globeContainerRef.current.clientWidth)
      .height(globeContainerRef.current.clientHeight);

    g.controls().autoRotate = true;
    g.controls().autoRotateSpeed = 0.2;

    // Add landmass polygons
    const countries = feature(worldData, worldData.objects.countries);
    g.polygonsData(countries.features)
      .polygonCapColor(() => '#4a6a8a')
      .polygonSideColor(() => '#2a3a4a')
      .polygonStrokeColor(() => '#5a7a9a')
      .polygonAltitude(0.005);

    globeInstanceRef.current = g;

    return () => {
      g._destructor?.();
      globeInstanceRef.current = null;
    };
  }, [worldData]);

  // Add event markers when data loads
  useEffect(() => {
    const g = globeInstanceRef.current;
    if (!g || events.length === 0) return;

    // Debug: log unique event types
    const uniqueTypes = [...new Set(events.map(e => e.eventType))];
    console.log('Event types in data:', uniqueTypes);
    console.log('Available icons:', Object.keys(EVENT_TYPE_ICONS));

    // Helper to create SVG icon
    const createIcon = (event) => {
      const path = EVENT_TYPE_ICONS[event.eventType] || EVENT_TYPE_ICONS['Other'];
      const color = event.color || '#ffffff';
      const size = event.isMostSignificant ? 32 : 24;
      
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="${color}" opacity="0.85"/>
          <path d="${path}" fill="white"/>
        </svg>
      `;
    };

    g.htmlElementsData(events)
      .htmlLat(d => d.position[1])
      .htmlLng(d => d.position[0])
      .htmlAltitude(d => d.isMostSignificant ? 0.08 : 0.04)
      .htmlElement(d => {
        const el = document.createElement('div');
        el.innerHTML = createIcon(d);
        el.style.cursor = 'pointer';
        el.style.pointerEvents = 'auto';
        el.onclick = () => {
          setSelectedEvent(d);
          if (globeInstanceRef.current) {
            globeInstanceRef.current.controls().autoRotate = false;
          }
        };
        return el;
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
