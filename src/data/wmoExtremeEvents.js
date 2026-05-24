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
