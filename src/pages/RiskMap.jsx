import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Map, { Layer, Source, Popup, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { natoSpending, regionColors, NATO_TARGET_PCT } from '../data/natoSpending.js';
import styles from './RiskMap.module.css';

// Build a lookup: ISO3-uppercase → { gdpPct, country, region, meetsTarget }
// natoSpending uses 3-letter lowercase id (e.g. 'usa', 'gbr') which maps directly to ADM0_A3
function buildSpendingLookup(year) {
  const lookup = {};
  natoSpending.forEach(c => {
    const iso3 = c.id.toUpperCase(); // e.g. 'usa' → 'USA'
    const pct = c[year]?.gdpPct || 0;
    lookup[iso3] = {
      country: c.country,
      flag: c.flag,
      gdpPct: pct,
      region: c.region,
      meetsTarget: pct >= NATO_TARGET_PCT,
    };
  });
  return lookup;
}

// Free MapLibre tile style (no API key needed)
const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

// Colour scale: below 1% → dark, 1-2% → amber, 2-3% → green, 3%+ → bright
function spendColor(pct) {
  if (!pct || pct === 0) return '#1a1a2e';
  if (pct < 1.0) return '#4a2a0a';
  if (pct < 1.5) return '#7a4a10';
  if (pct < 2.0) return '#e67e22';
  if (pct < 2.5) return '#27ae60';
  if (pct < 3.5) return '#2ecc71';
  return '#00ff88';
}

export default function RiskMap() {
  const [yearIndex, setYearIndex]   = useState(2);  // default 2023
  const [popupInfo, setPopupInfo]   = useState(null);
  const [viewState, setViewState]   = useState({
    longitude: 15,
    latitude: 52,
    zoom: 2.8,
    pitch: 0,
    bearing: 0,
  });

  const DATA_YEARS = [2021, 2022, 2023];
  const year = DATA_YEARS[yearIndex];
  const lookup = useMemo(() => buildSpendingLookup(year), [year]);

  // Build GeoJSON fill-color expression
  const fillColorExpression = useMemo(() => {
    const expr = ['match', ['get', 'ADM0_A3']];
    Object.entries(lookup).forEach(([iso3, d]) => {
      expr.push(iso3, spendColor(d.gdpPct));
    });
    expr.push('#111122'); // default
    return expr;
  }, [lookup]);

  const fillOpacityExpression = useMemo(() => {
    const expr = ['match', ['get', 'ADM0_A3']];
    Object.entries(lookup).forEach(([iso3]) => {
      expr.push(iso3, 0.8);
    });
    expr.push(0.08); // non-NATO countries
    return expr;
  }, [lookup]);

  const handleClick = useCallback((e) => {
    const features = e.features;
    if (!features?.length) { setPopupInfo(null); return; }
    const iso3 = features[0].properties?.ADM0_A3;
    const data = lookup[iso3];
    if (!data) { setPopupInfo(null); return; }
    setPopupInfo({ lng: e.lngLat.lng, lat: e.lngLat.lat, ...data });
  }, [lookup]);

  const statsAbove = Object.values(lookup).filter(d => d.meetsTarget).length;
  const statsTotal = Object.values(lookup).length;
  const avgSpend   = (Object.values(lookup).reduce((s, d) => s + d.gdpPct, 0) / statsTotal).toFixed(2);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>NATO Defence Spending Map — MapLibre GL</h1>
        <p className={styles.subtitle}>
          Interactive WebGL choropleth map. Colour intensity = % GDP spent on defence.
          Click any NATO country for details. Switch year to see the post-Ukraine surge.
        </p>
      </header>

      <main className={styles.main}>
        {/* Controls + stats */}
        <div className={styles.controlsBar}>
          <div className={styles.yearPills}>
            {DATA_YEARS.map((y, i) => (
              <button
                key={y}
                className={`${styles.yearPill} ${i === yearIndex ? styles.yearPillActive : ''}`}
                onClick={() => setYearIndex(i)}
              >{y}</button>
            ))}
          </div>
          <div className={styles.stats}>
            <span className={styles.statBadge} style={{ color: '#2ecc71' }}>{statsAbove}/{statsTotal} meet 2% target</span>
            <span className={styles.statBadge}>Avg: {avgSpend}% GDP</span>
          </div>
        </div>

        {/* Map */}
        <div className={styles.mapWrapper}>
          <Map
            {...viewState}
            onMove={e => setViewState(e.viewState)}
            style={{ width: '100%', height: '540px' }}
            mapStyle={MAP_STYLE}
            interactiveLayerIds={['nato-fill']}
            onClick={handleClick}
          >
            <NavigationControl position="top-right" />

            <Source
              id="countries"
              type="geojson"
              data="https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
            >
              {/* Base fill */}
              <Layer
                id="nato-fill"
                type="fill"
                paint={{
                  'fill-color': fillColorExpression,
                  'fill-opacity': fillOpacityExpression,
                }}
              />
              {/* Border */}
              <Layer
                id="nato-border"
                type="line"
                paint={{
                  'line-color': '#2a2a4a',
                  'line-width': 0.5,
                  'line-opacity': 0.6,
                }}
              />
            </Source>

            {popupInfo && (
              <Popup
                longitude={popupInfo.lng}
                latitude={popupInfo.lat}
                anchor="bottom"
                onClose={() => setPopupInfo(null)}
                closeButton
                style={{ maxWidth: 220 }}
              >
                <div className={styles.popup}>
                  <div className={styles.popupFlag}>{popupInfo.flag} <strong>{popupInfo.country}</strong></div>
                  <div className={styles.popupRow}>
                    <span>% GDP ({year})</span>
                    <span style={{ color: popupInfo.meetsTarget ? '#2ecc71' : '#e67e22', fontWeight: 700 }}>
                      {popupInfo.gdpPct.toFixed(2)}%
                    </span>
                  </div>
                  <div className={styles.popupTarget}>
                    {popupInfo.meetsTarget ? '✓ Meets 2% NATO target' : '✗ Below 2% NATO target'}
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </div>

        {/* Colour scale legend */}
        <div className={styles.colourScale}>
          <span className={styles.scaleLabel}>% GDP:</span>
          {[
            { label: 'Non-NATO', color: '#111122' },
            { label: '<1%', color: '#4a2a0a' },
            { label: '1–1.5%', color: '#7a4a10' },
            { label: '1.5–2%', color: '#e67e22' },
            { label: '2–2.5%', color: '#27ae60' },
            { label: '2.5–3.5%', color: '#2ecc71' },
            { label: '3.5%+', color: '#00ff88' },
          ].map(s => (
            <div key={s.label} className={styles.scaleItem}>
              <span className={styles.scaleDot} style={{ background: s.color }} />
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        <footer className={styles.footer}>
          <p className={styles.source}>Source: NATO Defence Expenditure Reports · Map tiles: MapLibre (free, no key) · GeoJSON: Natural Earth</p>
        </footer>
      </main>
    </div>
  );
}
