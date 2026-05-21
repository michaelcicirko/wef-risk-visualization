import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import RiskTimeline from './pages/RiskTimeline.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/risk-timeline" element={<RiskTimeline />} />
      </Routes>
    </Router>
  );
}

export default App;
