import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { scaleBand } from 'd3-scale';
import { easeCubicOut } from 'd3-ease';
import { transition } from 'd3-transition';
import { categoryColors } from '../data/risks.js';
import styles from './D3Chart.module.css';

/**
 * D3Chart Component
 * Renders an interactive horizontal bar chart with animated transitions
 * @param {Array} data - Array of 10 risk objects from useInterpolatedData
 */
export function D3Chart({ data }) {
  const svgRef = useRef(null);
  
  // Chart dimensions
  const margin = { top: 20, right: 300, bottom: 20, left: 40 };
  const width = 800 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;
  
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    const svg = select(svgRef.current);
    
    // Clear previous contents on first render
    if (svg.selectAll('*').empty()) {
      svg.attr('width', width + margin.left + margin.right)
         .attr('height', height + margin.top + margin.bottom);
      
      // Create main group with margins
      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Add rank numbers group
      g.append('g').attr('class', 'ranks');
      
      // Add bars group
      g.append('g').attr('class', 'bars');
      
      // Add labels group
      g.append('g').attr('class', 'labels');
    }
    
    const g = svg.select('g');
    
    // Create scales
    // All bars same width - no value scaling
    const barWidth = width * 0.8; // 80% of container width
    
    const yScale = scaleBand()
      .domain(data.map(d => d.displayRank))
      .range([0, height])
      .padding(0.1);
    
    // DATA JOIN: Bars with object constancy via key function (d.id)
    const bars = g.select('.bars')
      .selectAll('rect')
      .data(data, d => d.id);
    
    // ENTER: Create new bars if needed
    const barsEnter = bars.enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('height', yScale.bandwidth())
      .attr('rx', 4) // Rounded corners
      .attr('y', d => yScale(d.displayRank))
      .attr('width', barWidth)
      .attr('fill', d => categoryColors[d.category])
      .attr('opacity', 0); // Start invisible
    
    // ENTER + UPDATE: Animate to new positions
    const barsUpdate = barsEnter.merge(bars);
    barsUpdate
      .transition().duration(300).ease(easeCubicOut)
      .attr('y', d => yScale(d.displayRank))
      .attr('width', barWidth)
      .attr('fill', d => categoryColors[d.category])
      .attr('opacity', 1);
    
    // EXIT: Remove bars that no longer exist (shouldn't happen with 10 items)
    bars.exit().remove();
    
    // DATA JOIN: Rank numbers
    const ranks = g.select('.ranks')
      .selectAll('text')
      .data(data, d => d.id);
    
    const ranksEnter = ranks.enter()
      .append('text')
      .attr('class', 'rank')
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('x', -10)
      .attr('y', d => yScale(d.displayRank) + yScale.bandwidth() / 2)
      .text(d => d.displayRank)
      .attr('opacity', 0);
    
    const ranksUpdate = ranksEnter.merge(ranks);
    ranksUpdate
      .transition().duration(300).ease(easeCubicOut)
      .attr('y', d => yScale(d.displayRank) + yScale.bandwidth() / 2)
      .text(d => d.displayRank)
      .attr('opacity', 1);
    
    ranks.exit().remove();
    
    // DATA JOIN: Risk titles (labels inside bars)
    const labels = g.select('.labels')
      .selectAll('text')
      .data(data, d => d.id);
    
    const labelsEnter = labels.enter()
      .append('text')
      .attr('class', 'label')
      .attr('dominant-baseline', 'middle')
      .attr('x', 10)
      .attr('y', d => yScale(d.displayRank) + yScale.bandwidth() / 2)
      .text(d => d.title)
      .attr('fill', 'white')
      .attr('opacity', 0);
    
    const labelsUpdate = labelsEnter.merge(labels);
    labelsUpdate
      .transition().duration(300).ease(easeCubicOut)
      .attr('y', d => yScale(d.displayRank) + yScale.bandwidth() / 2)
      .text(d => d.title)
      .attr('opacity', 1);
    
    labels.exit().remove();
    
  }, [data, height, margin.left, margin.right, margin.top, width]);
  
  return (
    <div className={styles.chartContainer}>
      <svg ref={svgRef} className={styles.chart}></svg>
    </div>
  );
}
