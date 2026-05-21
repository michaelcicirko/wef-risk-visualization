import { useMemo } from 'react';
import { interpolate } from 'd3-interpolate';
import { riskData, YEAR_MIN, YEAR_MID, YEAR_MAX } from '../data/risks.js';

/**
 * Custom hook to interpolate risk data between time states
 * Returns exact keyframe data at 2026, 2028, 2036
 * Smoothly animates position changes between keyframes
 * @param {number} year - Current year from slider (2026-2036)
 * @returns {Array} Array of 10 risk objects for display
 */
export function useInterpolatedData(year) {
  return useMemo(() => {
    // At exact keyframe years, return that year's data directly
    if (year === YEAR_MIN) {
      return riskData[YEAR_MIN].map((d, i) => ({ ...d, displayRank: i + 1 }));
    }
    if (year === YEAR_MID) {
      return riskData[YEAR_MID].map((d, i) => ({ ...d, displayRank: i + 1 }));
    }
    if (year === YEAR_MAX) {
      return riskData[YEAR_MAX].map((d, i) => ({ ...d, displayRank: i + 1 }));
    }
    
    // Determine which segment we're in
    let startData, endData, progress;
    
    if (year < YEAR_MID) {
      // Segment 1: 2026 to 2028
      startData = riskData[YEAR_MIN];
      endData = riskData[YEAR_MID];
      progress = (year - YEAR_MIN) / (YEAR_MID - YEAR_MIN);
    } else {
      // Segment 2: 2028 to 2036
      startData = riskData[YEAR_MID];
      endData = riskData[YEAR_MAX];
      progress = (year - YEAR_MID) / (YEAR_MAX - YEAR_MID);
    }
    
    // Create lookup maps
    const endDataById = new Map(endData.map(d => [d.id, d]));
    const startDataById = new Map(startData.map(d => [d.id, d]));
    
    // Process each item from START data (maintains start order)
    const result = [];
    
    for (let i = 0; i < startData.length; i++) {
      const startRisk = startData[i];
      const endRisk = endDataById.get(startRisk.id);
      
      if (endRisk) {
        // Item exists in both - interpolate position
        const startPos = i + 1; // 1-10
        const endPos = endData.findIndex(d => d.id === startRisk.id) + 1;
        const interpolatedRank = interpolate(startPos, endPos)(progress);
        
        result.push({
          ...startRisk,
          rank: interpolatedRank,
          displayRank: interpolatedRank
        });
      } else {
        // Item only in start - fade out (slide down)
        const fadePosition = i + 1 + progress * 5;
        result.push({
          ...startRisk,
          rank: fadePosition,
          displayRank: fadePosition
        });
      }
    }
    
    // Add items that only exist in END data (fade in from bottom)
    for (let i = 0; i < endData.length; i++) {
      const endRisk = endData[i];
      if (!startDataById.has(endRisk.id)) {
        const endPos = i + 1;
        const startPos = 15; // Start from below
        const interpolatedRank = interpolate(startPos, endPos)(progress);
        
        result.push({
          ...endRisk,
          rank: interpolatedRank,
          displayRank: interpolatedRank
        });
      }
    }
    
    // Sort by interpolated position and take top 10
    return result
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 10)
      .map((d, i) => ({ ...d, displayRank: i + 1 }));
  }, [year]);
}

/**
 * Helper to format year for display
 * @param {number} year 
 * @returns {string} Formatted year label
 */
export function formatYearLabel(year) {
  if (year === YEAR_MIN) return '2026 (Current)';
  if (year === YEAR_MID) return '2028 (Short-term)';
  if (year === YEAR_MAX) return '2036 (Long-term)';
  return String(year);
}
