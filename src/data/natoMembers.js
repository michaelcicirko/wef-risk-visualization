/**
 * NATO Member Data
 * All 32 NATO members with joining year and flag emoji
 * Source: NATO official membership timeline
 */

export const natoMembers = [
  // Founding members (1949)
  { id: "belgium", country: "Belgium", flag: "🇧🇪", year: 1949, founding: true, population: 11825551 },
  { id: "canada", country: "Canada", flag: "🇨🇦", year: 1949, founding: true, population: 41472081 },
  { id: "denmark", country: "Denmark", flag: "🇩🇰", year: 1949, founding: true, population: 6031247 },
  { id: "france", country: "France", flag: "🇫🇷", year: 1949, founding: true, population: 69100000 },
  { id: "iceland", country: "Iceland", flag: "🇮🇸", year: 1949, founding: true, population: 394324 },
  { id: "italy", country: "Italy", flag: "🇮🇹", year: 1949, founding: true, population: 58943000 },
  { id: "luxembourg", country: "Luxembourg", flag: "🇱🇺", year: 1949, founding: true, population: 690959 },
  { id: "netherlands", country: "Netherlands", flag: "🇳🇱", year: 1949, founding: true, population: 18130000 },
  { id: "norway", country: "Norway", flag: "🇳🇴", year: 1949, founding: true, population: 5627400 },
  { id: "portugal", country: "Portugal", flag: "🇵🇹", year: 1949, founding: true, population: 10749635 },
  { id: "uk", country: "United Kingdom", flag: "🇬🇧", year: 1949, founding: true, population: 69551332 },
  { id: "us", country: "United States", flag: "🇺🇸", year: 1949, founding: true, population: 341784857 },
  
  // 1950s expansion
  { id: "greece", country: "Greece", flag: "🇬🇷", year: 1952, founding: false, population: 10372335 },
  { id: "turkey", country: "Türkiye", flag: "🇹🇷", year: 1952, founding: false, population: 86092168 },
  { id: "germany", country: "Germany", flag: "🇩🇪", year: 1955, founding: false, population: 84075075 },
  
  // 1980s expansion
  { id: "spain", country: "Spain", flag: "🇪🇸", year: 1982, founding: false, population: 49687120 },
  
  // 1999 expansion
  { id: "czechia", country: "Czechia", flag: "🇨🇿", year: 1999, founding: false, population: 10915839 },
  { id: "hungary", country: "Hungary", flag: "🇭🇺", year: 1999, founding: false, population: 9500000 },
  { id: "poland", country: "Poland", flag: "🇵🇱", year: 1999, founding: false, population: 37351000 },
  
  // 2004 big expansion (7 countries)
  { id: "bulgaria", country: "Bulgaria", flag: "🇧🇬", year: 2004, founding: false, population: 6423207 },
  { id: "estonia", country: "Estonia", flag: "🇪🇪", year: 2004, founding: false, population: 1360745 },
  { id: "latvia", country: "Latvia", flag: "🇱🇻", year: 2004, founding: false, population: 1856932 },
  { id: "lithuania", country: "Lithuania", flag: "🇱🇹", year: 2004, founding: false, population: 2884324 },
  { id: "romania", country: "Romania", flag: "🇷🇴", year: 2004, founding: false, population: 19036031 },
  { id: "slovakia", country: "Slovakia", flag: "🇸🇰", year: 2004, founding: false, population: 5409407 },
  { id: "slovenia", country: "Slovenia", flag: "🇸🇮", year: 2004, founding: false, population: 2118697 },
  
  // 2009 expansion
  { id: "albania", country: "Albania", flag: "🇦🇱", year: 2009, founding: false, population: 2791765 },
  { id: "croatia", country: "Croatia", flag: "🇭🇷", year: 2009, founding: false, population: 3875325 },
  
  // Recent expansions
  { id: "montenegro", country: "Montenegro", flag: "🇲🇪", year: 2017, founding: false, population: 638479 },
  { id: "macedonia", country: "North Macedonia", flag: "🇲🇰", year: 2020, founding: false, population: 1836713 },
  { id: "finland", country: "Finland", flag: "🇫🇮", year: 2023, founding: false, population: 5650152 },
  { id: "sweden", country: "Sweden", flag: "🇸🇪", year: 2024, founding: false, population: 10590000 }
];

export const YEAR_START = 1949;
export const YEAR_END = 2024;

/**
 * Get members that have joined by a specific year
 */
export function getMembersByYear(year) {
  return natoMembers.filter(member => member.year <= year);
}

/**
 * Get members joining in a specific year
 */
export function getNewMembersForYear(year) {
  return natoMembers
    .filter(member => member.year === year)
    .sort((a, b) => a.country.localeCompare(b.country));
}
