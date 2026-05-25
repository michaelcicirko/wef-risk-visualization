# WEF Risk Visualization

Interactive data visualizations for World Economic Forum Global Risks Report and V-Dem democracy data.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (port 9000)
npm run server:start

# Or use the standard dev command
npm run dev
```

**Dashboard:** http://localhost:9000/

## Server Management

We use **port 9000** consistently with HTTP verification:

```bash
# Start server with verification
npm run server:start

# Check if server is running
npm run server:status

# Restart server
npm run server:restart

# Stop server
npm run server:stop
```

**Important:** The server binds to `localhost` (not 127.0.0.1) for Browser MCP compatibility.

## Visualizations

### V-Dem Democracy Visualizations

| Route | Description |
|-------|-------------|
| `/` | Dashboard with all visualizations |
| `/vdem-choropleth-map` | World map with democracy scores (1789-2025) |
| `/vdem-ridgeline-plot` | Distribution by decade (24 decades) |
| `/vdem-stream-graph` | Population by regime type over time |
| `/vdem-connected-scatter` | **NEW** Dimensions relationship with animated trails |

### Other Visualizations

| Route | Description |
|-------|-------------|
| `/risk-bubbles-3d` | 3D interactive risk bubbles |
| `/sigma-graph` | Risk knowledge graph network |
| `/wmo-extreme-events` | WMO extreme weather events map |

## Development Notes

### Server Port Standard
- **Port:** 9000 (locked - do not change)
- **Host:** localhost (required for Browser MCP access)
- **Protocol:** HTTP
- **Verification:** HTTP 200 response required before declaring "ready"

### Browser MCP Access
- Works with: `http://localhost:9000`
- Does NOT work with: `http://127.0.0.1:9000`
- Use Browser Preview for automated testing

### Data
- **V-Dem Dataset:** Version 16, 202 countries, 1789-2025
- **Population field:** `e_mipopula` (pre-2000 only)
- **Democracy indices:** polyarchy, liberal democracy, etc.

## Troubleshooting

### Server won't start
```bash
# Check if something is using port 9000
lsof -Pi :9000

# Kill any zombie processes
npm run server:stop

# Start fresh
npm run server:start
```

### HTTP 000 / Connection refused
- Check `npm run server:status` 
- Verify you're using `localhost` not `127.0.0.1`
- Check `.vite.log` for errors

### Browser MCP timeout
- Use `localhost:9000` not `127.0.0.1:9000`
- Try Browser Preview feature instead

## Tech Stack

- React 19 + Vite
- React Router
- D3.js for data visualization
- Framer Motion for animations
- Three.js / React Three Fiber for 3D
- Deck.gl for maps
- Nivo for specialized charts

## Project Structure

```
src/
├── pages/           # Visualization components
├── data/            # V-Dem dataset & utilities
├── components/      # Shared components
├── App.jsx          # Routes
└── main.jsx         # Entry point

scripts/
└── dev-server.sh    # Server management with verification
```
