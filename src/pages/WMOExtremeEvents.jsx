import { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';
import { feature } from 'topojson-client';

export default function WMOExtremeEvents() {
  const globeContainerRef = useRef(null);
  const globeInstanceRef = useRef(null);
  const [worldData, setWorldData] = useState(null);

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(setWorldData)
      .catch(err => console.error('Failed to load world data:', err));
  }, []);

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

    const countries = feature(worldData, worldData.objects.countries);
    g.polygonsData(countries.features)
      .polygonCapColor(() => '#4a6a8a')
      .polygonSideColor(() => '#2a3a4a')
      .polygonStrokeColor(() => '#5a7a9a')
      .polygonAltitude(0.005);

    globeInstanceRef.current = g;
  }, [worldData]);

  return (
    <div 
      ref={globeContainerRef} 
      style={{ width: '100vw', height: '100vh', background: '#0a0a14' }} 
    />
  );
}
