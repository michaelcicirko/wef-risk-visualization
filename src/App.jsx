import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import RiskTimeline from './pages/RiskTimeline.jsx';
import NATOTimelineHorizontal from './pages/NATOTimelineHorizontal.jsx';
import NATOTimelineVertical from './pages/NATOTimelineVertical.jsx';
import NATOTimelineVerticalPopulation from './pages/NATOTimelineVerticalPopulation.jsx';
import NATOTimelineVerticalPopulation3 from './pages/NATOTimelineVerticalPopulation3.jsx';
import NATOTimelineVerticalPopulation1 from './pages/NATOTimelineVerticalPopulation1.jsx';
import NATOTimelineMap from './pages/NATOTimelineMap.jsx';
import NATOGlobe from './pages/NATOGlobe.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/risk-timeline" element={<RiskTimeline />} />
        <Route path="/nato-timeline-horizontal" element={<NATOTimelineHorizontal />} />
        <Route path="/nato-timeline-vertical" element={<NATOTimelineVertical />} />
        <Route path="/nato-timeline-vertical-population" element={<NATOTimelineVerticalPopulation />} />
        <Route path="/nato-timeline-vertical-population-3" element={<NATOTimelineVerticalPopulation3 />} />
        <Route path="/nato-timeline-vertical-population-1" element={<NATOTimelineVerticalPopulation1 />} />
        <Route path="/nato-timeline-map" element={<NATOTimelineMap />} />
        <Route path="/nato-globe" element={<NATOGlobe />} />
      </Routes>
    </Router>
  );
}

export default App;
