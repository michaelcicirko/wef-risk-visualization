// WMO Extreme Events Data Processor
// Processes World Meteorological Organisation extreme weather events for visualization

// Event type to color mapping
export const EVENT_TYPE_COLORS = {
  'Tornado': '#e74c3c',                    // Red
  'Flood_Flash_flood': '#3498db',          // Blue
  'Flood_Riverine_flood': '#2980b9',       // Darker blue
  'Flood_Coastal_flood': '#1abc9c',        // Teal
  'Storm_Surge': '#9b59b6',                // Purple
  'Thunderstorms_Squall_lines': '#8e44ad', // Dark purple
  'Lightning': '#f1c40f',                  // Yellow
  'Hail': '#95a5a6',                       // Gray
  'Cold_wave': '#00bcd4',                  // Cyan
  'Frost': '#81d4fa',                      // Light cyan
  'Snow': '#ecf0f1',                       // White-ish
  'Snowstorm': '#bdc3c7',                  // Light gray
  'Heat_Wave': '#e67e22',                  // Orange
  'Drought': '#d35400',                    // Dark orange
  'Wild_land_fire_Forest_fire': '#c0392b', // Dark red
  'Dust_storm_Sandstorm': '#d7ccc8',       // Sand
  'Landslide_mudslide_debris flow': '#795548', // Brown
  'Storm_surge_Coastal_flood': '#5e35b1',  // Deep purple
  'Extra_tropical_cyclone': '#607d8b',     // Blue gray
  'Other': '#7f8c8d',                      // Gray
};

// Severity mapping
export const SEVERITY_WEIGHTS = {
  'Unprecendented': 2,  // Note: typo in source data
  'Unusual': 1,
};

// Event type to icon mapping (SVG paths for Deck.gl IconLayer)
export const EVENT_TYPE_ICONS = {
  'Tornado': 'M32 8c-8 4-12 12-12 20 0 6 2 12 6 16 2-4 4-8 4-12 0-8-4-16-12-20 4 2 8 4 14 4 6 0 10-2 14-4-8 4-12 12-12 20 0 4 2 8 4 12 4-4 6-10 6-16 0-8-4-16-12-20 4 2 8 4 14 4 6 0 10-2 14-4-6 3-10 9-10 16 0 3 1 6 2 8l-8 16h20l-8-16c1-2 2-5 2-8 0-7-4-13-10-16z',
  'Flood_Flash_flood': 'M16 24c0-4 8-12 16-12s16 8 16 12c0 8-8 16-16 16s-16-8-16-16zm8 8c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4zm16 0c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4z',
  'Flood_Riverine_flood': 'M16 24c0-4 8-12 16-12s16 8 16 12c0 8-8 16-16 16s-16-8-16-16zm8 8c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4zm16 0c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4z',
  'Flood_Coastal_flood': 'M16 24c0-4 8-12 16-12s16 8 16 12c0 8-8 16-16 16s-16-8-16-16zm8 8c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4zm16 0c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4z',
  'Storm_Surge': 'M24 12c-4 0-8 4-8 8 0 2 1 4 2 6-6 2-10 8-10 14 0 8 6 14 14 14h16c6 0 10-4 10-10 0-4-2-8-6-10 2-2 3-4 3-6 0-6-4-10-10-10-2 0-4 1-6 2-2-4-6-6-10-6-2 0-4 1-5 2z',
  'Thunderstorms_Squall_lines': 'M28 8l-4 16h8l-4 24 20-28h-10l8-12H28z',
  'Lightning': 'M36 8L20 28h10l-6 28 22-28h-12l10-20H36z',
  'Hail': 'M32 12c-6 0-10 4-10 10 0 3 1 5 3 7-4 2-7 6-7 11 0 7 5 12 12 12h8c5 0 9-4 9-9 0-3-1-6-4-8 2-2 3-4 3-6 0-5-4-9-9-9-2 0-4 1-5 2-2-4-5-7-10-7z',
  'Cold_wave': 'M32 8v8l6-4-6 8 6 2-6 4 6 6-6 2 6 8-6-4v8c0 4-4 4-4 4s-4 0-4-4v-8l-6 4 6-8-6-2 6-4-6-6 6-2-6-8 6 4v-8c0-4 4-4 4-4s4 0 4 4z',
  'Frost': 'M32 8v12l10-6-10 10 10 4-10 6 10 10-10-4v12c0 3-2 3-2 3s-2 0-2-3v-12l-10 4',
  'Snow': 'M32 8v12l10-6-10 10 10 4-10 6 10 10-10-4v12c0 3-2 3-2 3s-2 0-2-3v-12l-10 4',
  'Snowstorm': 'M32 8v12l10-6-10 10 10 4-10 6 10 10-10-4v12c0 3-2 3-2 3s-2 0-2-3v-12l-10 4',
  'Heat_Wave': 'M32 12c-4 0-6 3-6 6v20c0 3 2 6 6 6s6-3 6-6v-20c0-3-2-6-6-6zm0 4c1 0 2 1 2 2v4h-4v-4c0-1 1-2 2-2z',
  'Drought': 'M16 48c8-4 16-4 24 0 4-2 8-2 12 0-4-8-12-12-24-12s-20 4-24 12c4-2 8-2 12 0z M20 40c4-2 8-2 12 0M16 44c8-4 16-4 24 0',
  'Wild_land_fire_Forest_fire': 'M32 48c-8 0-12-8-8-16 2-4 4-6 4-10 0-4-2-8-4-10 4 4 8 6 8 12 0 4-2 8-4 10 4-2 8-6 8-12 0-6-4-10-8-12 2 2 4 6 4 10 0 4-2 6-4 10 4 8 0 16-8 16 4-2 8-2 12 0z',
  'Dust_storm_Sandstorm': 'M12 24h40v4H12zm0 8h40v4H12zm0 8h32v4H12z',
  'Landslide_mudslide_debris flow': 'M16 48l8-16 8 8 8-8 8 16H16z M24 36l-4 8h8l-4-8z',
  'Storm_surge_Coastal_flood': 'M16 24c0-4 8-12 16-12s16 8 16 12c0 8-8 16-16 16s-16-8-16-16z',
  'Extra_tropical_cyclone': 'M32 8c-12 0-20 8-20 20 0 8 4 16 12 20-4-4-8-12-8-20 0-10 8-16 16-16s16 6 16 16c0 8-4 16-8 20 8-4 12-12 12-20 0-12-8-20-20-20z',
  // Additional mappings for event types in data
  'Tropical_cyclone': 'M32 8c-12 0-20 8-20 20 0 8 4 16 12 20-4-4-8-12-8-20 0-10 8-16 16-16s16 6 16 16c0 8-4 16-8 20 8-4 12-12 12-20 0-12-8-20-20-20z',
  'Flood': 'M16 24c0-4 8-12 16-12s16 8 16 12c0 8-8 16-16 16s-16-8-16-16zm8 8c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4zm16 0c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4z',
  'Drought_Dry_spell': 'M16 48c8-4 16-4 24 0 4-2 8-2 12 0-4-8-12-12-24-12s-20 4-24 12c4-2 8-2 12 0z',
  'Heat_wave': 'M32 12c-4 0-6 3-6 6v20c0 3 2 6 6 6s6-3 6-6v-20c0-3-2-6-6-6zm0 4c1 0 2 1 2 2v4h-4v-4c0-1 1-2 2-2z',
  'Rain_wet_spell': 'M20 20c-6 0-10 4-10 10s4 10 10 10 10-4 10-10-4-10-10-10zm12 4c-4 0-8 4-8 8s4 8 8 8 8-4 8-8-4-8-8-8z',
  'Wind': 'M16 24h32v4H16zm0 8h24v4H16zm0 8h28v4H16z',
  'Icing_Freezing_rain': 'M32 8v12l6-4-6 8 6 2-6 4 6 6-6 2 6 8-6-4v8c0 2-1 2-1 2s-1 0-1-2v-8l-6 4',
  'High_UV_radiation': 'M32 8c-8 0-12 6-12 12 0 4 2 8 6 10-4 2-8 6-8 12 0 8 6 14 14 14s14-6 14-14c0-6-4-10-8-12 4-2 6-6 6-10 0-6-4-12-12-12zm0 4c4 0 8 4 8 8s-4 8-8 8-8-4-8-8 4-8 8-8z',
  'Fog_Haze_Smog': 'M12 20h40v4H12zm0 12h40v4H12zm0 12h32v4H12z',
  'Avalanche': 'M16 44l8-16 8 8 8-8 8 16H16z',
  'Other': 'M32 16c-8 0-16 8-16 16s8 16 16 16 16-8 16-16-8-16-16-16z'
};

// Cache for loaded data
let cachedData = null;

// Async load WMO data from public folder
async function loadWMOData() {
  if (cachedData) return cachedData;
  
  const response = await fetch('/wmo-extreme-events.json');
  if (!response.ok) {
    throw new Error(`Failed to load WMO data: ${response.status}`);
  }
  
  cachedData = await response.json();
  return cachedData;
}

// Parse timestamp to Date object
function parseTimestamp(ts) {
  return new Date(ts);
}

// Process raw WMO data into visualization-ready format
export function processWMOData(wmoData) {
  const features = wmoData.layers?.[0]?.features || [];
  
  return features.map((feature, index) => {
    const attrs = feature.attributes || {};
    const geometry = feature.geometry || {};
    
    // Parse timestamps
    const startDate = attrs.start_of_event ? parseTimestamp(attrs.start_of_event) : null;
    const endDate = attrs.end_of_event ? parseTimestamp(attrs.end_of_event) : null;
    
    // Get color for event type
    const eventType = attrs.event_type || 'Other';
    const color = EVENT_TYPE_COLORS[eventType] || EVENT_TYPE_COLORS.Other;
    
    // Calculate severity score
    const rarity = attrs.rar || 'Unusual';
    const isMostSignificant = attrs.most_signifcant_3_events === 'Yes';
    const severityScore = (SEVERITY_WEIGHTS[rarity] || 1) * (isMostSignificant ? 1.5 : 1);
    
    return {
      id: index,
      originalId: feature.id || index,
      position: [geometry.x, geometry.y], // [longitude, latitude]
      country: attrs.country_label_2 || 'Unknown',
      eventType: eventType,
      eventTypeDisplay: eventType.replace(/_/g, ' '),
      startDate: startDate,
      endDate: endDate,
      startTimestamp: attrs.start_of_event,
      endTimestamp: attrs.end_of_event,
      rarity: rarity,
      isMostSignificant: isMostSignificant,
      severityScore: severityScore,
      color: color,
      locationDescription: attrs.location_description || '',
      description: attrs.description || '',
    };
  }).filter(event => event.position[0] !== undefined && event.position[1] !== undefined);
}

// Get all unique event types
export function getEventTypes(processedData) {
  const types = new Set(processedData.map(d => d.eventType));
  return [...types].sort();
}

// Get date range from data
export function getDateRange(processedData) {
  const dates = processedData
    .filter(d => d.startDate)
    .map(d => d.startDate.getTime());
  
  if (dates.length === 0) return { min: null, max: null };
  
  return {
    min: new Date(Math.min(...dates)),
    max: new Date(Math.max(...dates)),
  };
}

// Filter events by criteria
export function filterEvents(events, filters) {
  return events.filter(event => {
    // Event type filter
    if (filters.eventTypes?.length > 0 && !filters.eventTypes.includes(event.eventType)) {
      return false;
    }
    
    // Severity filter
    if (filters.severity && event.rarity !== filters.severity) {
      return false;
    }
    
    // Most significant only filter
    if (filters.mostSignificantOnly && !event.isMostSignificant) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange && event.startDate) {
      const eventTime = event.startDate.getTime();
      if (eventTime < filters.dateRange[0] || eventTime > filters.dateRange[1]) {
        return false;
      }
    }
    
    // Country filter
    if (filters.country && event.country !== filters.country) {
      return false;
    }
    
    return true;
  });
}

// Get statistics for the dataset
export function getStatistics(events) {
  const stats = {
    total: events.length,
    byType: {},
    byCountry: {},
    bySeverity: {},
    byMonth: {},
    mostSignificantCount: 0,
  };
  
  events.forEach(event => {
    // By type
    stats.byType[event.eventType] = (stats.byType[event.eventType] || 0) + 1;
    
    // By country
    stats.byCountry[event.country] = (stats.byCountry[event.country] || 0) + 1;
    
    // By severity
    stats.bySeverity[event.rarity] = (stats.bySeverity[event.rarity] || 0) + 1;
    
    // By month
    if (event.startDate) {
      const monthKey = event.startDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;
    }
    
    // Most significant count
    if (event.isMostSignificant) {
      stats.mostSignificantCount++;
    }
  });
  
  return stats;
}

// Get top countries by event count
export function getTopCountries(events, limit = 10) {
  const countryCounts = {};
  events.forEach(e => {
    countryCounts[e.country] = (countryCounts[e.country] || 0) + 1;
  });
  
  return Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([country, count]) => ({ country, count }));
}

// Async data loading function
export async function loadProcessedWMOData() {
  const wmoData = await loadWMOData();
  const processed = processWMOData(wmoData);
  return {
    data: processed,
    dateRange: getDateRange(processed),
    eventTypes: getEventTypes(processed),
    statistics: getStatistics(processed),
  };
}
