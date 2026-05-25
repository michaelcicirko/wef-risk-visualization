import { lazy, Suspense, Component } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Route error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          background: '#0d0d1a', 
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e74c3c',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          padding: '40px'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <h2>Error Loading Visualization</h2>
            <p style={{ color: '#7f8c8d' }}>{this.state.error?.message || 'Unknown error'}</p>
            <button 
              onClick={() => window.location.href = '/'}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#2471a3',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div style={{ 
      background: '#0d0d1a', 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#7f8c8d',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid #2a2a4a',
          borderTop: '3px solid #2471a3',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p>Loading visualization...</p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const RiskTimeline                  = lazy(() => import('./pages/RiskTimeline.jsx'));
const NATOTimelineHorizontal        = lazy(() => import('./pages/NATOTimelineHorizontal.jsx'));
const NATOTimelineVertical          = lazy(() => import('./pages/NATOTimelineVertical.jsx'));
const NATOTimelineVerticalPopulation  = lazy(() => import('./pages/NATOTimelineVerticalPopulation.jsx'));
const NATOTimelineVerticalPopulation3 = lazy(() => import('./pages/NATOTimelineVerticalPopulation3.jsx'));
const NATOTimelineVerticalPopulation1 = lazy(() => import('./pages/NATOTimelineVerticalPopulation1.jsx'));
const NATOTimelineMap               = lazy(() => import('./pages/NATOTimelineMap.jsx'));
const NATOGlobe                     = lazy(() => import('./pages/NATOGlobe.jsx'));
const ScatterPlot                   = lazy(() => import('./pages/ScatterPlot.jsx'));
const Heatmap                       = lazy(() => import('./pages/Heatmap.jsx'));
const BubbleChart                   = lazy(() => import('./pages/BubbleChart.jsx'));
const RadialChart                   = lazy(() => import('./pages/RadialChart.jsx'));
const NetworkGraph                  = lazy(() => import('./pages/NetworkGraph.jsx'));
const Treemap                       = lazy(() => import('./pages/Treemap.jsx'));
const StreamChart                   = lazy(() => import('./pages/StreamChart.jsx'));
const LollipopChart                 = lazy(() => import('./pages/LollipopChart.jsx'));
const Sunburst                      = lazy(() => import('./pages/Sunburst.jsx'));
const ArcDiagram                    = lazy(() => import('./pages/ArcDiagram.jsx'));
const RidgelinePlot                 = lazy(() => import('./pages/RidgelinePlot.jsx'));
const RadialBarChart                = lazy(() => import('./pages/RadialBarChart.jsx'));
const SankeyChart                   = lazy(() => import('./pages/SankeyChart.jsx'));
const ChordDiagram                  = lazy(() => import('./pages/ChordDiagram.jsx'));
const RadarChartPage                = lazy(() => import('./pages/RadarChart.jsx'));
const ForceGraph3D                  = lazy(() => import('./pages/ForceGraph3D.jsx'));
const RiskBubbles3D                 = lazy(() => import('./pages/RiskBubbles3D.jsx'));
const ScrollytellReport             = lazy(() => import('./pages/ScrollytellReport.jsx'));
const PhysicsBubbles                = lazy(() => import('./pages/PhysicsBubbles.jsx'));
const BumpChart                     = lazy(() => import('./pages/BumpChart.jsx'));
const DotPlotMatrix                 = lazy(() => import('./pages/DotPlotMatrix.jsx'));
const PackedCircles                 = lazy(() => import('./pages/PackedCircles.jsx'));
const VizzuMorph                    = lazy(() => import('./pages/VizzuMorph.jsx'));
const EChartsShowcase               = lazy(() => import('./pages/EChartsShowcase.jsx'));
const SigmaGraph                    = lazy(() => import('./pages/SigmaGraph.jsx'));
const NivoShowcase                  = lazy(() => import('./pages/NivoShowcase.jsx'));
const RiskMap                       = lazy(() => import('./pages/RiskMap.jsx'));
const WMOExtremeEvents              = lazy(() => import('./pages/WMOExtremeEvents.jsx'));
const VDemChoroplethMap             = lazy(() => import('./pages/VDemChoroplethMap.jsx'));
const VDemRidgelinePlot             = lazy(() => import('./pages/VDemRidgelinePlot.jsx'));
const VDemStreamGraph               = lazy(() => import('./pages/VDemStreamGraph.jsx'));
const VDemConnectedScatter          = lazy(() => import('./pages/VDemConnectedScatter.jsx'));
const VDemBumpChart                 = lazy(() => import('./pages/VDemBumpChart.jsx'));
const VDemComparativeLines          = lazy(() => import('./pages/VDemComparativeLines.jsx'));
const VDemCountryProfile            = lazy(() => import('./pages/VDemCountryProfile.jsx'));

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<LoadingFallback />}>
      <RouteErrorBoundary>
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
        <Route path="/scatter-plot" element={<ScatterPlot />} />
        <Route path="/heatmap" element={<Heatmap />} />
        <Route path="/bubble-chart" element={<BubbleChart />} />
        <Route path="/radial-chart" element={<RadialChart />} />
        <Route path="/network-graph" element={<NetworkGraph />} />
        <Route path="/treemap" element={<Treemap />} />
        <Route path="/stream-chart" element={<StreamChart />} />
        <Route path="/lollipop-chart" element={<LollipopChart />} />
        <Route path="/sunburst" element={<Sunburst />} />
        <Route path="/arc-diagram" element={<ArcDiagram />} />
        <Route path="/ridgeline-plot" element={<RidgelinePlot />} />
        <Route path="/radial-bar-chart" element={<RadialBarChart />} />
        <Route path="/sankey-chart" element={<SankeyChart />} />
        <Route path="/chord-diagram" element={<ChordDiagram />} />
        <Route path="/radar-chart" element={<RadarChartPage />} />
        <Route path="/force-graph-3d" element={<ForceGraph3D />} />
        <Route path="/risk-bubbles-3d" element={<RiskBubbles3D />} />
        <Route path="/scrollytell-report" element={<ScrollytellReport />} />
        <Route path="/physics-bubbles" element={<PhysicsBubbles />} />
        <Route path="/bump-chart" element={<BumpChart />} />
        <Route path="/dot-plot-matrix" element={<DotPlotMatrix />} />
        <Route path="/packed-circles" element={<PackedCircles />} />
        <Route path="/vizzu-morph" element={<VizzuMorph />} />
        <Route path="/echarts-showcase" element={<EChartsShowcase />} />
        <Route path="/sigma-graph" element={<SigmaGraph />} />
        <Route path="/nivo-showcase" element={<NivoShowcase />} />
        <Route path="/risk-map" element={<RiskMap />} />
        <Route path="/wmo-extreme-events" element={<WMOExtremeEvents />} />
        <Route path="/vdem-choropleth-map" element={<VDemChoroplethMap />} />
        <Route path="/vdem-ridgeline-plot" element={<VDemRidgelinePlot />} />
        <Route path="/vdem-stream-graph" element={<VDemStreamGraph />} />
        <Route path="/vdem-connected-scatter" element={<VDemConnectedScatter />} />
        <Route path="/vdem-bump-chart" element={<VDemBumpChart />} />
        <Route path="/vdem-comparative-lines" element={<VDemComparativeLines />} />
        <Route path="/vdem-country-profile" element={<VDemCountryProfile />} />
      </Routes>
      </RouteErrorBoundary>
      </Suspense>
    </Router>
  );
}

export default App;
