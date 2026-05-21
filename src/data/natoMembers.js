/**
 * NATO Member Data
 * All 32 NATO members with joining year and flag emoji
 * Source: NATO official membership timeline
 */

export const natoMembers = [
  // Founding members (1949)
  { id: "belgium", country: "Belgium", flag: "🇧🇪", year: 1949, founding: true },
  { id: "canada", country: "Canada", flag: "🇨🇦", year: 1949, founding: true },
  { id: "denmark", country: "Denmark", flag: "🇩🇰", year: 1949, founding: true },
  { id: "france", country: "France", flag: "🇫🇷", year: 1949, founding: true },
  { id: "iceland", country: "Iceland", flag: "🇮🇸", year: 1949, founding: true },
  { id: "italy", country: "Italy", flag: "🇮🇹", year: 1949, founding: true },
  { id: "luxembourg", country: "Luxembourg", flag: "🇱🇺", year: 1949, founding: true },
  { id: "netherlands", country: "Netherlands", flag: "🇳🇱", year: 1949, founding: true },
  { id: "norway", country: "Norway", flag: "🇳🇴", year: 1949, founding: true },
  { id: "portugal", country: "Portugal", flag: "🇵🇹", year: 1949, founding: true },
  { id: "uk", country: "United Kingdom", flag: "🇬🇧", year: 1949, founding: true },
  { id: "us", country: "United States", flag: "🇺🇸", year: 1949, founding: true },
  
  // 1950s expansion
  { id: "greece", country: "Greece", flag: "🇬🇷", year: 1952, founding: false },
  { id: "turkey", country: "Türkiye", flag: "🇹🇷", year: 1952, founding: false },
  { id: "germany", country: "Germany", flag: "🇩🇪", year: 1955, founding: false },
  
  // 1980s expansion
  { id: "spain", country: "Spain", flag: "🇪🇸", year: 1982, founding: false },
  
  // 1999 expansion
  { id: "czechia", country: "Czechia", flag: "🇨🇿", year: 1999, founding: false },
  { id: "hungary", country: "Hungary", flag: "🇭🇺", year: 1999, founding: false },
  { id: "poland", country: "Poland", flag: "🇵🇱", year: 1999, founding: false },
  
  // 2004 big expansion (7 countries)
  { id: "bulgaria", country: "Bulgaria", flag: "🇧🇬", year: 2004, founding: false },
  { id: "estonia", country: "Estonia", flag: "🇪🇪", year: 2004, founding: false },
  { id: "latvia", country: "Latvia", flag: "🇱🇻", year: 2004, founding: false },
  { id: "lithuania", country: "Lithuania", flag: "🇱🇹", year: 2004, founding: false },
  { id: "romania", country: "Romania", flag: "🇷🇴", year: 2004, founding: false },
  { id: "slovakia", country: "Slovakia", flag: "🇸🇰", year: 2004, founding: false },
  { id: "slovenia", country: "Slovenia", flag: "🇸🇮", year: 2004, founding: false },
  
  // 2009 expansion
  { id: "albania", country: "Albania", flag: "🇦🇱", year: 2009, founding: false },
  { id: "croatia", country: "Croatia", flag: "🇭🇷", year: 2009, founding: false },
  
  // Recent expansions
  { id: "montenegro", country: "Montenegro", flag: "🇲🇪", year: 2017, founding: false },
  { id: "macedonia", country: "North Macedonia", flag: "🇲🇰", year: 2020, founding: false },
  { id: "finland", country: "Finland", flag: "🇫🇮", year: 2023, founding: false },
  { id: "sweden", country: "Sweden", flag: "🇸🇪", year: 2024, founding: false }
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
