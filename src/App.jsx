import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import RiskTimeline from './pages/RiskTimeline.jsx';
import NATOTimelineHorizontal from './pages/NATOTimelineHorizontal.jsx';
import NATOTimelineVertical from './pages/NATOTimelineVertical.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/risk-timeline" element={<RiskTimeline />} />
        <Route path="/nato-timeline-horizontal" element={<NATOTimelineHorizontal />} />
        <Route path="/nato-timeline-vertical" element={<NATOTimelineVertical />} />
      </Routes>
    </Router>
  );
}

export default App;
