import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';

// Define outside component to prevent recreation on every render
const visualizations = [
    {
      id: 'risk-timeline',
      title: 'Animated Bar Chart',
      description: 'Ranked bar chart with smooth animated transitions between time states — demonstrates how changing data rankings can be visualised over time.',
      tag: 'Bar Chart · Time Series',
      path: '/risk-timeline',
      status: 'reviewed'
    },
    {
      id: 'nato-timeline-horizontal',
      title: 'Animated Grid Timeline',
      description: 'Cards reveal progressively in a responsive grid as a year counter advances — demonstrates staggered entry animations for list-based data.',
      tag: 'Grid · Progressive Reveal',
      path: '/nato-timeline-horizontal',
      status: 'reviewed'
    },
    {
      id: 'nato-timeline-vertical',
      title: 'Vertical Feed Timeline',
      description: 'Entries scroll into a vertical feed as time progresses, with a prominent year counter fixed to the right — suitable for event-driven datasets.',
      tag: 'Vertical Feed · Event Timeline',
      path: '/nato-timeline-vertical',
      status: 'reviewed'
    },
    {
      id: 'nato-timeline-vertical-population',
      title: 'Vertical Feed + Data Attribute',
      description: 'Extends the vertical feed with a secondary data attribute shown beneath each entry — demonstrates multi-field storytelling within a timeline.',
      tag: 'Vertical Feed · Multi-field',
      path: '/nato-timeline-vertical-population',
      status: 'reviewed'
    },
    {
      id: 'nato-timeline-vertical-population-3',
      title: 'Windowed Feed (3 Items)',
      description: 'A windowed view that shows only 3 entries at a time — demonstrates a compact, focused feed ideal for screen recording or presentation.',
      tag: 'Windowed Feed · Compact',
      path: '/nato-timeline-vertical-population-3',
      status: 'reviewed'
    },
    {
      id: 'nato-timeline-vertical-population-1',
      title: 'Single-Focus Feed',
      description: 'One entry at a time with full visual emphasis — demonstrates a high-impact sequential reveal format suited to broadcast or slide-based output.',
      tag: 'Single Focus · Sequential',
      path: '/nato-timeline-vertical-population-1',
      status: 'reviewed'
    },
    {
      id: 'nato-timeline-map',
      title: 'Interactive Geo Map Timeline',
      description: 'Countries highlight on a zoomable world map as time advances, with a live member list populating alongside — demonstrates geo-temporal storytelling.',
      tag: 'Map · Geo-temporal · Interactive',
      path: '/nato-timeline-map',
      status: 'reviewed'
    },
    {
      id: 'nato-globe',
      title: '3D Globe Timeline',
      description: 'Countries illuminate on an auto-rotating 3D globe as time advances — the camera tracks each joining nation. Optimised for screen recording.',
      tag: '3D Globe · Auto-rotating · Geo-temporal',
      path: '/nato-globe',
      status: 'reviewed'
    },
    {
      id: 'scatter-plot',
      title: 'Scatter Plot',
      description: 'Points appear one-by-one on a two-axis chart — year joined vs population on a log scale — demonstrating animated sequential reveal on a coordinate plane.',
      tag: 'Scatter Plot · Log Scale · Sequential',
      path: '/scatter-plot',
      status: 'reviewed'
    },
    {
      id: 'heatmap',
      title: 'Heatmap Matrix',
      description: 'A grid of cells where colour intensity encodes rank severity — risks as rows, years as columns — demonstrating sequential animated reveal across a matrix.',
      tag: 'Heatmap · Matrix · Sequential',
      path: '/heatmap',
      status: 'reviewed'
    },
    {
      id: 'bubble-chart',
      title: 'Bubble Chart',
      description: 'Category risk scores encoded as bubble area — bubbles expand and contract with spring physics as the time state advances between years.',
      tag: 'Bubble Chart · Force Layout · Animated',
      path: '/bubble-chart',
      status: 'reviewed'
    },
    {
      id: 'radial-chart',
      title: 'Radial / Donut Chart',
      description: 'Category share of total risk score shown as arc proportions — segments morph smoothly between time states, with hover interaction and a live score legend.',
      tag: 'Radial · Donut · Proportional',
      path: '/radial-chart',
      status: 'reviewed'
    },
    {
      id: 'network-graph',
      title: 'Network Graph',
      description: 'Force-directed network of WEF global risk interconnections — causal links between risks reveal one by one, with hover to highlight connected nodes.',
      tag: 'Network · Force-directed · Causal Links',
      path: '/network-graph'
    },
    {
      id: 'treemap',
      title: 'Treemap — NATO Defence Spending',
      description: 'Hierarchical rectangles where area encodes % of GDP spent on defence — grouped by region, colour-coded by spend level, with 2021/2022/2023 snapshots showing the post-Ukraine surge.',
      tag: 'Treemap · Hierarchy · Comparative',
      path: '/treemap'
    },
    {
      id: 'stream-chart',
      title: 'Stream Chart — NATO Spending Over Time',
      description: 'Flowing stacked areas showing regional defence spending from 2014–2023 — reveals the Wales Summit pledge, Trump-era pressure, and dramatic post-Ukraine surge. Three view modes: Stream, Proportional, Stacked.',
      tag: 'Stream Chart · Stacked Area · Time Series',
      path: '/stream-chart'
    },
    {
      id: 'lollipop-chart',
      title: 'Lollipop Chart — NATO Defence Spending Ranked',
      description: 'All 32 NATO members ranked by % GDP defence spending — stems grow up and dots pop in sequentially, highest first. Shows which members meet the 2% target across 2021, 2022, and 2023.',
      tag: 'Lollipop · Ranked · Comparative',
      path: '/lollipop-chart'
    },
    {
      id: 'sunburst',
      title: 'Sunburst Diagram — WEF Risk Hierarchy',
      description: 'Concentric ring chart: inner ring = risk categories, outer ring = individual risks. Arc area encodes severity score. Risks reveal one by one, transitions across 2026 / 2028 / 2036 with hover to isolate categories.',
      tag: 'Sunburst · Hierarchy · Radial',
      path: '/sunburst'
    },
    {
      id: 'arc-diagram',
      title: 'Arc Diagram — WEF Risk Interconnections',
      description: '15 WEF global risks on a baseline connected by curved arcs — arc height encodes connection distance, stroke weight encodes strength. Reveals in narrative order: geopolitical → tech → societal → economic → environmental.',
      tag: 'Arc Diagram · Network · Causal Links',
      path: '/arc-diagram'
    },
    {
      id: 'ridgeline-plot',
      title: 'Ridgeline Plot — WEF Risk Score Profiles',
      description: 'Stacked overlapping area curves — one row per risk category, one layer per year (2026 / 2028 / 2036). Shows how each category\'s severity profile shifts over time, from geopolitical dominance in 2026 to environmental in 2036.',
      tag: 'Ridgeline · Joy Plot · Temporal',
      path: '/ridgeline-plot'
    },
    {
      id: 'radial-bar-chart',
      title: 'Radial Bar Chart — NATO Defence Spending',
      description: '32 NATO members arranged in a full circle, grouped by region. Each arc radiates outward proportional to % of GDP spent on defence. The dashed ring marks the 2% target. Arcs reveal clockwise across 2021, 2022, and 2023.',
      tag: 'Radial Bar · Circular · Comparative',
      path: '/radial-bar-chart'
    },
    {
      id: 'sankey-chart',
      title: 'Sankey Diagram — WEF Risk Flows',
      description: 'Three-layer flow diagram: risk categories → individual risks → impact domains. Link width encodes severity score. Flows reveal left-to-right showing how geopolitical, environmental, and technological risks cascade into security, economic, and digital impacts.',
      tag: 'Sankey · Flow · Causal Pathways',
      path: '/sankey-chart'
    },
    {
      id: 'chord-diagram',
      title: 'Chord Diagram — WEF Risk Category Interactions',
      description: 'Five WEF risk categories in a circle connected by ribbons — ribbon width encodes interaction strength between categories. Reveals chord by chord and transitions across 2026, 2028, 2036 to show shifting risk dominance patterns.',
      tag: 'Chord · Circular · Cross-category',
      path: '/chord-diagram'
    },
    {
      id: 'radar-chart',
      title: 'Radar Chart — WEF Risk Category Profiles',
      description: 'Five-axis spider chart showing total severity per risk category. Overlay mode stacks all three years simultaneously; animated mode cycles 2026 → 2028 → 2036 with transitions. Clearly shows geopolitical dominance in 2026 giving way to environmental by 2036.',
      tag: 'Radar · Spider · Multi-year',
      path: '/radar-chart'
    },
    {
      id: 'force-graph-3d',
      title: '3D Force Graph — WEF Risk Network',
      description: 'WebGL 3D force-directed graph: 15 WEF risk nodes floating in space, sized by connection degree, connected by causal links with flowing directional particles. Auto-orbiting camera, click to zoom into any node and highlight its neighbours.',
      tag: '3D · WebGL · Force-directed · Advanced',
      path: '/force-graph-3d'
    },
    {
      id: 'risk-bubbles-3d',
      title: '3D Risk Bubbles — WEF Global Risks',
      description: 'WEF global risks as glowing 3D spheres floating in space with spring physics and GPU bloom. Sphere size encodes severity. Auto-orbiting camera transitions across 2026, 2028, 2036. Click any bubble to lock focus and read details.',
      tag: '3D · WebGL · Physics · Bloom · Advanced',
      path: '/risk-bubbles-3d'
    },
    {
      id: 'scrollytell-report',
      title: 'Scrollytelling Report — The World\'s Greatest Risks',
      description: 'A full scroll-driven narrative report powered by GSAP ScrollTrigger. Three pinned sections reveal data as you scroll: top risks for 2026, category shift to 2036, and NATO defence spending progress — all in one cinematic journey.',
      tag: 'Scrollytelling · GSAP · Narrative · Advanced',
      path: '/scrollytell-report'
    },
    {
      id: 'physics-bubbles',
      title: 'Physics Bubbles — WEF Risks',
      description: 'WEF risks as rigid-body spheres with real Rapier WASM physics simulation. Change gravity (down, up, zero, chaos) or hit Explode to scatter the scene. GPU bloom glow. Click a bubble to inspect it.',
      tag: '3D · Physics · Rapier · Advanced',
      path: '/physics-bubbles'
    },
    {
      id: 'bump-chart',
      title: 'Bump Chart — WEF Risk Rank Changes',
      description: 'Each line traces a risk\'s rank position across 2026, 2028, and 2036. Crossing lines reveal risks overtaking each other over the decade. Hover to isolate a single risk\'s trajectory. Animate or scrub the reveal.',
      tag: 'Bump Chart · Rank Trajectory · Time Series',
      path: '/bump-chart'
    },
    {
      id: 'dot-plot-matrix',
      title: 'Dot Plot Matrix — WEF Risk Scores',
      description: 'All WEF risks as rows, all three years as columns. Dot size encodes severity score. Sort by 2026 rank, 2036 rank, most-changed, or category. Hover any row to compare scores side-by-side across all years.',
      tag: 'Dot Plot · Matrix · Comparative',
      path: '/dot-plot-matrix'
    },
    {
      id: 'packed-circles',
      title: 'Packed Circles — WEF Risk Landscape',
      description: 'WEF risks as circles sized by severity, clustered by category using D3 force simulation. Switch between clustered view (risks group by category) and packed view (all risks collapse into one mass). Watch circles drift and re-settle in real time.',
      tag: 'Force Layout · Packed Circles · Clustered',
      path: '/packed-circles'
    },
    {
      id: 'vizzu-morph',
      title: 'Chart Morphing Story — Vizzu',
      description: 'A single canvas that fluidly morphs between six chart types: bar → grouped → stacked area → scatter → bubble → radial. The transition between charts IS the story. Powered by Vizzu — a C++ engine compiled to WebAssembly.',
      tag: 'Morphing · WASM · Animated · Unique',
      path: '/vizzu-morph'
    },
    {
      id: 'echarts-showcase',
      title: 'ECharts Showcase — 4 Advanced Charts',
      description: 'Apache ECharts via a single React wrapper: Liquid Fill Gauge (NATO target compliance as rising water), Parallel Coordinates (NATO spending across axes), ThemeRiver (risk category flow), and an Animated Radar.',
      tag: 'ECharts · Liquid Gauge · Parallel Coords · ThemeRiver',
      path: '/echarts-showcase'
    },
    {
      id: 'sigma-graph',
      title: 'Risk Knowledge Graph — Sigma.js',
      description: 'WEF global risk interconnections rendered as a WebGL network by Sigma.js with ForceAtlas2 layout. Hover a node to highlight its causal connections. Filter by risk category. Node size encodes connection degree, edge width encodes causal strength.',
      tag: 'WebGL · Graph · ForceAtlas2 · Sigma.js',
      path: '/sigma-graph'
    },
    {
      id: 'nivo-showcase',
      title: 'Nivo Showcase — Marimekko · Circle Packing · Bump',
      description: 'Three declarative React charts from Nivo with built-in spring animation: Marimekko (category width × risk height), Circle Packing (nested risk hierarchy), and Bump chart (rank trajectories 2026–2036). Switch year to animate transitions.',
      tag: 'Nivo · Marimekko · Circle Packing · Bump',
      path: '/nivo-showcase'
    },
    {
      id: 'risk-map',
      title: 'NATO Defence Spending Map — MapLibre GL',
      description: 'WebGL choropleth map of all NATO members coloured by % GDP spent on defence. Click any country for details and spending data. Switch between 2021, 2022, and 2023 to see the dramatic post-Ukraine surge. No API key required.',
      tag: 'MapLibre · WebGL Map · Choropleth · Geospatial',
      path: '/risk-map'
    },
    {
      id: 'wmo-extreme-events',
      title: 'WMO Extreme Weather Events — Deck.gl Globe',
      description: '408 extreme weather events (Dec 2024–Jun 2026) from the World Meteorological Organisation visualized on an interactive 3D globe with 2D map toggle. Filter by event type, severity, and time. Click events for detailed impact descriptions. Hex clustering, 3D extruded columns for significant events.',
      tag: 'Deck.gl · 3D Globe · Geospatial · Time Filter',
      path: '/wmo-extreme-events'
    },
    {
      id: 'vdem-choropleth-map',
      title: 'V-Dem Democracy Map',
      description: 'Animated world choropleth showing democracy scores across 202 countries from 1789–2025. Watch the spread of democracy through time with a year slider and play controls.',
      tag: 'Map · Choropleth · 237 Years',
      path: '/vdem-choropleth-map'
    },
    {
      id: 'vdem-ridgeline-plot',
      title: 'V-Dem Ridgeline Plot',
      description: 'Distribution of democracy scores by decade showing how the global distribution has shifted from mostly autocratic (1800s) to mixed (2000s). Each ridge is a kernel density estimate.',
      tag: 'Distribution · Joy Plot · 24 Decades',
      path: '/vdem-ridgeline-plot'
    },
    {
      id: 'vdem-stream-graph',
      title: 'V-Dem Stream Graph',
      description: 'Population living under different regime types over time — watch the democracy waves as billions of people transition from autocracy to democracy. Wiggle layout with animated timeline.',
      tag: 'Stream · Population · Regime Types',
      path: '/vdem-stream-graph'
    },
    {
      id: 'vdem-connected-scatter',
      title: 'V-Dem Connected Scatter',
      description: 'Relationship between democracy dimensions over time — see how countries evolve on two indices simultaneously with animated trails. X/Y axis selectable.',
      tag: 'Scatter · Trails · Dimensions',
      path: '/vdem-connected-scatter'
    },
    {
      id: 'vdem-bump-chart',
      title: 'V-Dem Bump Chart',
      description: 'Top 15 country rankings by democracy score over time — watch which nations rise and fall in the global democracy rankings. Animated bump chart with selectable indices.',
      tag: 'Bump · Rankings · Top 15',
      path: '/vdem-bump-chart'
    },
    {
      id: 'vdem-comparative-lines',
      title: 'V-Dem Comparative Lines',
      description: 'Compare democracy trajectories across countries — select up to 8 countries to see how their scores diverge or converge over time. Multi-select with animated playback.',
      tag: 'Lines · Compare · Multi-Select',
      path: '/vdem-comparative-lines'
    },
    {
      id: 'vdem-country-profile',
      title: 'V-Dem Country Profile',
      description: 'Deep-dive analysis for any country — all 6 democracy indices with sparklines, best/worst years, trends, and regional/global rankings. Country selector with quick compare.',
      tag: 'Profile · Deep-dive · Sparklines',
      path: '/vdem-country-profile'
    },
    {
      id: 'vdem-hierarchy-tree',
      title: 'V-Dem Hierarchy Tree',
      description: 'WebGL 3D tree visualization of democracy indices — Liberal Democracy as root, branching into sub-components, regions, and 202 countries. Camera spirals through the structure with Reagraph.',
      tag: '3D Tree · WebGL · Hierarchy',
      path: '/vdem-hierarchy-tree'
    },
    {
      id: 'climate-candlestick',
      title: 'Climate Severity Candlestick',
      description: 'WMO extreme weather severity reframed as financial OHLC candlestick data — wicks represent theoretical max damage, bodies represent realized median. 260 weeks of synthesized climate severity rendered via Lightweight Charts.',
      tag: 'Candlestick · Canvas · Financial Metaphor',
      path: '/climate-candlestick'
    },
    {
      id: 'nato-expenditure-stream',
      title: 'NATO Defence Expenditure Stream',
      description: 'Simulated daily defence burn rates across 32 NATO member states as a dense multi-series area chart. Over 35,000 data points rendered at 60fps via uPlot canvas engine. Drag to zoom.',
      tag: 'uPlot · Canvas · High-frequency · Dense',
      path: '/nato-expenditure-stream'
    },
    {
      id: 'democracy-hierarchy-3d',
      title: 'S&P 500 Sector Hierarchy — 3D Tree',
      description: 'All 503 S&P 500 constituents arranged as a 3D top-down tree: Root → 11 GICS Sectors → 127 Sub-Industries → individual companies. Node size encodes group weight; colour encodes sector. Click any node for details. Rendered via Reagraph WebGL.',
      tag: 'Reagraph · 3D Tree · WebGL · S&P 500',
      path: '/democracy-hierarchy-3d'
    },
    {
      id: 'risk-causality-flow',
      title: 'WEF Risk Causality Flow',
      description: 'Directed acyclic graph of WEF risk cascade — 15 global risks connected by causal pathways. Advance the policy timeline slider to reveal additional feedback loops as interventions fail. Powered by AntV G6.',
      tag: 'AntV G6 · DAG · Animated · Timeline',
      path: '/risk-causality-flow'
    },
    {
      id: 'particle-migration',
      title: 'Particle Migration Simulation',
      description: '100k WebGL sprites as population particles — trigger a democratic collapse to activate Boids flocking/migration physics. Particles converge then scatter on recovery. Imperative PixiJS via useRef at 60fps.',
      tag: 'PixiJS · WebGL · 100k Particles · Physics',
      path: '/particle-migration'
    },
    {
      id: 'risk-terrain',
      title: 'WEF Risk Terrain',
      description: '15 WEF risk severities drive Perlin noise amplitude on a 3D polygon mesh. Advance from 2026 to 2036 to watch terrain grow more volatile. Rendered in p5.js WebGL mode.',
      tag: 'p5.js · WebGL · Perlin Noise · 3D Terrain',
      path: '/risk-terrain'
    },
    {
      id: 'historical-democracy-sketch',
      title: 'Historical Democracy Sketch',
      description: 'Democracy scores rendered with high roughness for pre-1900 data, transitioning to crisp lines post-1950. Roughjs applied to D3-generated SVG paths — sketchy rendering evokes historical measurement uncertainty.',
      tag: 'roughjs · D3 · SVG · Sketch Style',
      path: '/historical-democracy-sketch'
    },
    {
      id: 'cesium-weather-globe',
      title: 'Cesium Weather Globe',
      description: 'Photorealistic 3D globe with WMO extreme weather events rendered as volumetric CesiumJS cylinders. Click any event to fly the camera to its location. 8 real-world disaster events with severity-scaled height.',
      tag: 'Resium · CesiumJS · 3D Globe · Volumetric',
      path: '/cesium-weather-globe'
    },
    {
      id: 'high-density-telemetry',
      title: 'High-Density Telemetry',
      description: '1M+ simulated barometric readings rendered as a density heatmap via Observable Plot. Cyclone event clusters emerge from Gaussian noise. Render time displayed in real-time.',
      tag: 'Observable Plot · 1M Points · Density · Heatmap',
      path: '/high-density-telemetry'
    },
    {
      id: 'gpu-force-network',
      title: 'GPU Force Network',
      description: '2,000 micro-risk nodes with 5,000 edges rendered via Sigma.js WebGL. Adjust the gravity slider to invert clustering dynamics — watch risk categories separate and merge in real-time via ForceAtlas2.',
      tag: 'Sigma.js · WebGL · ForceAtlas2 · Interactive',
      path: '/gpu-force-network'
    },
    {
      id: 'democracy-sonification',
      title: 'Democracy Sonification',
      description: 'V-Dem stability index mapped to Web Audio API oscillator frequency (80–800Hz). Lower democracy scores produce lower, ominous tones. Real-time frequency spectrum visualizer. Audio starts on user click.',
      tag: 'Web Audio API · Sonification · Canvas · Interactive',
      path: '/democracy-sonification'
    },
    {
      id: 'vdem-radar-clean',
      title: 'V-Dem Democracy Radar',
      description: '6 V-Dem democracy indices for 4 countries as overlapping radar polygons. Advance the year slider from 1970 to 2024 to watch each country\'s democratic profile morph over time. Pure SVG rendering.',
      tag: 'D3 · SVG · Radar Chart · Animated',
      path: '/vdem-radar-clean'
    },
    {
      id: 'risk-pipeline-flow',
      title: 'Risk Pipeline Flow',
      description: 'Interactive node-based diagram mapping WEF systemic risk cascade. 12 risk nodes with severity readouts connected by 14 animated causal edges. Drag nodes to reorganise the flow. Powered by React Flow.',
      tag: '@xyflow/react · Node Graph · Interactive · Causal',
      path: '/risk-pipeline-flow'
    },
    {
      id: 'plinko-distribution',
      title: 'Plinko Distribution',
      description: 'Galton board simulation: synthetic data points fall through staggered pegs and sort into 5 WEF risk category bins. Live distribution forms as 300 balls cascade through Matter.js 2D physics.',
      tag: 'Matter.js · Physics · Distribution · Simulation',
      path: '/plinko-distribution'
    },
    {
      id: 'ascii-terminal',
      title: 'ASCII Terminal',
      description: 'Retro terminal with rotating ASCII globe (equirectangular-to-character projection) and risk time-series charts. CRT scanline overlay, phosphor green palette, authentic terminal chrome.',
      tag: 'ASCII · Custom Renderer · asciichart · CRT Aesthetic',
      path: '/ascii-terminal'
    },
    {
      id: 'isotype-chart',
      title: 'Isotype Chart',
      description: 'Repeated SVG person icons forming bar lengths — one icon = N million affected. 5 humanitarian categories stagger-animate on timeline advance. Year slider from 2020 to 2024.',
      tag: 'SVG · Isotype · Pictogram · Animated',
      path: '/isotype-chart'
    },
    {
      id: 'fluid-simulation',
      title: 'Fluid Simulation',
      description: 'Incompressible fluid via WebGL2 ping-pong FBO with GLSL advection shaders. Three coloured dye streams represent data migration flows. Click and drag to inject turbulence into the field.',
      tag: 'WebGL2 · Navier-Stokes · GLSL · Interactive',
      path: '/fluid-simulation'
    },
    {
      id: 'maplibre-velocity',
      title: 'MapLibre Velocity Layer',
      description: '800 animated particles following a synthetic wind vector field over a light base map. Bilinear interpolation samples velocity at particle position. Trails fade and respawn at map edges.',
      tag: 'MapLibre GL · Velocity · Particles · Geospatial',
      path: '/maplibre-velocity'
    },
    {
      id: 'webgpu-mass-data',
      title: 'WebGPU Mass Data',
      description: '1M+ simulated event density points with WebGPU feature detection. Falls back to OffscreenCanvas WebWorker rendering when WebGPU is unavailable. 5 synthetic clusters with additive colour blending.',
      tag: 'WebGPU · Canvas · WebWorker · 1M Points',
      path: '/webgpu-mass-data'
    },
    {
      id: 'gpu-physics-network',
      title: 'GPU Physics Network',
      description: '10,000 risk micro-nodes with 25,000 edges. Gravity and repulsion sliders trigger visible clustering/explosion phase transitions via ForceAtlas2 web worker. Sigma.js WebGL rendering.',
      tag: 'Sigma.js · WebGL · ForceAtlas2 · 10K Nodes',
      path: '/gpu-physics-network'
    }
  ];

function Dashboard() {
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
          {visualizations.map((viz) => (
            <Link 
              key={viz.id} 
              to={viz.path} 
              className={`${styles.card} ${viz.status === 'reviewed' ? styles.cardReviewed : styles.cardPending}`}
            >
              <span className={styles.cardTitle}>{viz.title}</span>
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
