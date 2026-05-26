import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Viewer, Entity, CameraFlyTo, CylinderGraphics } from 'resium';
import { Cartesian3, Color, Ion, OpenStreetMapImageryProvider } from 'cesium';
import styles from './CesiumWeatherGlobe.module.css';

Ion.defaultAccessToken = '';

const osmProvider = new OpenStreetMapImageryProvider({
  url: 'https://tile.openstreetmap.org/',
});

const WEATHER_EVENTS = [
  { id: 'evt-1', name: 'Cyclone Amphan', lat: 21.0, lon: 88.0, severity: 0.95, type: 'Cyclone', year: 2020 },
  { id: 'evt-2', name: 'European Heatwave', lat: 48.8, lon: 2.3, severity: 0.82, type: 'Heatwave', year: 2022 },
  { id: 'evt-3', name: 'Pakistan Floods', lat: 27.0, lon: 68.0, severity: 0.91, type: 'Flood', year: 2022 },
  { id: 'evt-4', name: 'Turkey–Syria Earthquake', lat: 37.2, lon: 37.0, severity: 0.88, type: 'Earthquake', year: 2023 },
  { id: 'evt-5', name: 'Canada Wildfires', lat: 53.0, lon: -113.0, severity: 0.78, type: 'Wildfire', year: 2023 },
  { id: 'evt-6', name: 'Hurricane Otis', lat: 16.8, lon: -99.9, severity: 0.85, type: 'Cyclone', year: 2023 },
  { id: 'evt-7', name: 'Libya Floods', lat: 32.8, lon: 13.0, severity: 0.87, type: 'Flood', year: 2023 },
  { id: 'evt-8', name: 'Moroccan Earthquake', lat: 31.1, lon: -8.0, severity: 0.80, type: 'Earthquake', year: 2023 },
];

const TYPE_COLORS = {
  Cyclone: Color.fromCssColorString('#3498db'),
  Heatwave: Color.fromCssColorString('#e74c3c'),
  Flood: Color.fromCssColorString('#2ecc71'),
  Earthquake: Color.fromCssColorString('#f39c12'),
  Wildfire: Color.fromCssColorString('#e67e22'),
};

export default function CesiumWeatherGlobe() {
  const [selected, setSelected] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);

  const destination = useMemo(() => {
    if (!flyTarget) return undefined;
    return Cartesian3.fromDegrees(flyTarget.lon, flyTarget.lat, 2000000);
  }, [flyTarget]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>Cesium Weather Globe</h1>
        <p className={styles.subtitle}>
          Photorealistic 3D globe with WMO extreme weather events rendered as volumetric cylinders. Click an event to fly to it.
        </p>
      </div>
      <div className={styles.globeWrapper}>
        <Viewer
          full={false}
          style={{ width: '100%', height: '100%' }}
          timeline={false}
          animation={false}
          homeButton={false}
          navigationHelpButton={false}
          baseLayerPicker={false}
          geocoder={false}
          sceneModePicker={false}
          fullscreenButton={false}
          imageryProvider={osmProvider}
        >
          {destination && (
            <CameraFlyTo destination={destination} duration={2} once />
          )}

          {WEATHER_EVENTS.map((evt) => {
            const height = evt.severity * 800000;
            const color = TYPE_COLORS[evt.type] || Color.GRAY;

            return (
              <Entity
                key={evt.id}
                name={evt.name}
                position={Cartesian3.fromDegrees(evt.lon, evt.lat, height / 2)}
                onClick={() => {
                  setSelected(evt);
                  setFlyTarget(evt);
                }}
              >
                <CylinderGraphics
                  length={height}
                  topRadius={50000}
                  bottomRadius={50000}
                  material={color.withAlpha(0.7)}
                  outline
                  outlineColor={color}
                  outlineWidth={2}
                />
              </Entity>
            );
          })}
        </Viewer>

        {selected && (
          <div className={styles.infoPanel}>
            <h3 className={styles.infoPanelTitle}>{selected.name}</h3>
            <p className={styles.infoPanelRow}>Type: {selected.type}</p>
            <p className={styles.infoPanelRow}>Year: {selected.year}</p>
            <p className={styles.infoPanelRow}>Severity: {(selected.severity * 100).toFixed(0)}%</p>
            <p className={styles.infoPanelRow}>Location: {selected.lat.toFixed(1)}°, {selected.lon.toFixed(1)}°</p>
          </div>
        )}
      </div>
      <div className={styles.legend}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: color.toCssColorString() }} />
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}
