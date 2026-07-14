/**
 * Counties and cities for the local-SEO tree.
 *
 * This is a SEED dataset: Florida — and the Pensacola / Escambia County metro in
 * particular — is covered deeply (the launch market), and every other state has
 * its largest cities and primary counties so the engine demonstrably serves the
 * whole country. The shape is intentionally simple (name + state + county) so the
 * full U.S. Census "Incorporated Places" and county gazetteer can be generated
 * straight into these two arrays later without touching any page or route code.
 */

export interface CountySeed {
  name: string;      // e.g. "Escambia County"
  stateAbbr: string; // e.g. "FL"
  seat: string;      // county seat city
}

export interface CitySeed {
  name: string;      // e.g. "Pensacola"
  stateAbbr: string;
  county: string;    // county name it belongs to
  population?: number;
}

// ---------------------------------------------------------------------------
// COUNTIES
// ---------------------------------------------------------------------------

export const COUNTIES: CountySeed[] = [
  // Florida — launch state (Northwest Florida / Panhandle first)
  { name: "Escambia County", stateAbbr: "FL", seat: "Pensacola" },
  { name: "Santa Rosa County", stateAbbr: "FL", seat: "Milton" },
  { name: "Okaloosa County", stateAbbr: "FL", seat: "Crestview" },
  { name: "Walton County", stateAbbr: "FL", seat: "DeFuniak Springs" },
  { name: "Bay County", stateAbbr: "FL", seat: "Panama City" },
  { name: "Leon County", stateAbbr: "FL", seat: "Tallahassee" },
  { name: "Duval County", stateAbbr: "FL", seat: "Jacksonville" },
  { name: "Orange County", stateAbbr: "FL", seat: "Orlando" },
  { name: "Hillsborough County", stateAbbr: "FL", seat: "Tampa" },
  { name: "Pinellas County", stateAbbr: "FL", seat: "Clearwater" },
  { name: "Miami-Dade County", stateAbbr: "FL", seat: "Miami" },
  { name: "Broward County", stateAbbr: "FL", seat: "Fort Lauderdale" },
  { name: "Palm Beach County", stateAbbr: "FL", seat: "West Palm Beach" },
  // A primary county for each other major state
  { name: "Los Angeles County", stateAbbr: "CA", seat: "Los Angeles" },
  { name: "Cook County", stateAbbr: "IL", seat: "Chicago" },
  { name: "Harris County", stateAbbr: "TX", seat: "Houston" },
  { name: "Maricopa County", stateAbbr: "AZ", seat: "Phoenix" },
  { name: "New York County", stateAbbr: "NY", seat: "New York" },
  { name: "King County", stateAbbr: "WA", seat: "Seattle" },
  { name: "Fulton County", stateAbbr: "GA", seat: "Atlanta" },
  { name: "Clark County", stateAbbr: "NV", seat: "Las Vegas" },
  { name: "Wayne County", stateAbbr: "MI", seat: "Detroit" },
  { name: "Denver County", stateAbbr: "CO", seat: "Denver" },
  { name: "Marion County", stateAbbr: "IN", seat: "Indianapolis" },
  { name: "Davidson County", stateAbbr: "TN", seat: "Nashville" },
  { name: "Mecklenburg County", stateAbbr: "NC", seat: "Charlotte" },
];

// ---------------------------------------------------------------------------
// CITIES
// ---------------------------------------------------------------------------

export const CITIES: CitySeed[] = [
  // --- Florida: Escambia County (Pensacola metro) — launch market, deepest ---
  { name: "Pensacola", stateAbbr: "FL", county: "Escambia County", population: 54312 },
  { name: "Century", stateAbbr: "FL", county: "Escambia County", population: 1698 },
  { name: "Ferry Pass", stateAbbr: "FL", county: "Escambia County", population: 34943 },
  { name: "Brent", stateAbbr: "FL", county: "Escambia County", population: 22026 },
  { name: "Bellview", stateAbbr: "FL", county: "Escambia County", population: 23355 },
  { name: "West Pensacola", stateAbbr: "FL", county: "Escambia County", population: 21939 },
  { name: "Warrington", stateAbbr: "FL", county: "Escambia County", population: 14350 },
  { name: "Myrtle Grove", stateAbbr: "FL", county: "Escambia County", population: 15870 },
  { name: "Ensley", stateAbbr: "FL", county: "Escambia County", population: 20602 },
  { name: "Cantonment", stateAbbr: "FL", county: "Escambia County", population: 3500 },
  { name: "Gonzalez", stateAbbr: "FL", county: "Escambia County", population: 13673 },
  // --- Florida: Santa Rosa County (Pensacola metro) ---
  { name: "Milton", stateAbbr: "FL", county: "Santa Rosa County", population: 10850 },
  { name: "Pace", stateAbbr: "FL", county: "Santa Rosa County", population: 22730 },
  { name: "Navarre", stateAbbr: "FL", county: "Santa Rosa County", population: 45533 },
  { name: "Gulf Breeze", stateAbbr: "FL", county: "Santa Rosa County", population: 6303 },
  // --- Florida: Okaloosa / Walton / Bay (Emerald Coast) ---
  { name: "Crestview", stateAbbr: "FL", county: "Okaloosa County", population: 27134 },
  { name: "Fort Walton Beach", stateAbbr: "FL", county: "Okaloosa County", population: 20922 },
  { name: "Destin", stateAbbr: "FL", county: "Okaloosa County", population: 14066 },
  { name: "Niceville", stateAbbr: "FL", county: "Okaloosa County", population: 15900 },
  { name: "DeFuniak Springs", stateAbbr: "FL", county: "Walton County", population: 6900 },
  { name: "Panama City", stateAbbr: "FL", county: "Bay County", population: 32220 },
  // --- Florida: major metros statewide ---
  { name: "Tallahassee", stateAbbr: "FL", county: "Leon County", population: 201731 },
  { name: "Jacksonville", stateAbbr: "FL", county: "Duval County", population: 949611 },
  { name: "Orlando", stateAbbr: "FL", county: "Orange County", population: 307573 },
  { name: "Tampa", stateAbbr: "FL", county: "Hillsborough County", population: 384959 },
  { name: "Clearwater", stateAbbr: "FL", county: "Pinellas County", population: 117292 },
  { name: "Miami", stateAbbr: "FL", county: "Miami-Dade County", population: 442241 },
  { name: "Fort Lauderdale", stateAbbr: "FL", county: "Broward County", population: 182760 },
  { name: "West Palm Beach", stateAbbr: "FL", county: "Palm Beach County", population: 117415 },

  // --- Largest cities in every other state (national coverage) ---
  { name: "Birmingham", stateAbbr: "AL", county: "Jefferson County", population: 197575 },
  { name: "Montgomery", stateAbbr: "AL", county: "Montgomery County", population: 200603 },
  { name: "Huntsville", stateAbbr: "AL", county: "Madison County", population: 215006 },
  { name: "Anchorage", stateAbbr: "AK", county: "Anchorage Municipality", population: 291247 },
  { name: "Fairbanks", stateAbbr: "AK", county: "Fairbanks North Star Borough", population: 32515 },
  { name: "Phoenix", stateAbbr: "AZ", county: "Maricopa County", population: 1608139 },
  { name: "Tucson", stateAbbr: "AZ", county: "Pima County", population: 542629 },
  { name: "Mesa", stateAbbr: "AZ", county: "Maricopa County", population: 504258 },
  { name: "Little Rock", stateAbbr: "AR", county: "Pulaski County", population: 202591 },
  { name: "Fayetteville", stateAbbr: "AR", county: "Washington County", population: 93949 },
  { name: "Los Angeles", stateAbbr: "CA", county: "Los Angeles County", population: 3898747 },
  { name: "San Diego", stateAbbr: "CA", county: "San Diego County", population: 1386932 },
  { name: "San Jose", stateAbbr: "CA", county: "Santa Clara County", population: 1013240 },
  { name: "San Francisco", stateAbbr: "CA", county: "San Francisco County", population: 873965 },
  { name: "Sacramento", stateAbbr: "CA", county: "Sacramento County", population: 524943 },
  { name: "Denver", stateAbbr: "CO", county: "Denver County", population: 715522 },
  { name: "Colorado Springs", stateAbbr: "CO", county: "El Paso County", population: 478961 },
  { name: "Aurora", stateAbbr: "CO", county: "Arapahoe County", population: 386261 },
  { name: "Bridgeport", stateAbbr: "CT", county: "Fairfield County", population: 148654 },
  { name: "Hartford", stateAbbr: "CT", county: "Hartford County", population: 121054 },
  { name: "New Haven", stateAbbr: "CT", county: "New Haven County", population: 134023 },
  { name: "Wilmington", stateAbbr: "DE", county: "New Castle County", population: 70898 },
  { name: "Dover", stateAbbr: "DE", county: "Kent County", population: 39403 },
  { name: "Washington", stateAbbr: "DC", county: "District of Columbia", population: 689545 },
  { name: "Atlanta", stateAbbr: "GA", county: "Fulton County", population: 498715 },
  { name: "Augusta", stateAbbr: "GA", county: "Richmond County", population: 202081 },
  { name: "Savannah", stateAbbr: "GA", county: "Chatham County", population: 147780 },
  { name: "Honolulu", stateAbbr: "HI", county: "Honolulu County", population: 350964 },
  { name: "Hilo", stateAbbr: "HI", county: "Hawaii County", population: 44186 },
  { name: "Boise", stateAbbr: "ID", county: "Ada County", population: 235684 },
  { name: "Meridian", stateAbbr: "ID", county: "Ada County", population: 117635 },
  { name: "Chicago", stateAbbr: "IL", county: "Cook County", population: 2746388 },
  { name: "Aurora", stateAbbr: "IL", county: "Kane County", population: 180542 },
  { name: "Naperville", stateAbbr: "IL", county: "DuPage County", population: 149540 },
  { name: "Indianapolis", stateAbbr: "IN", county: "Marion County", population: 887642 },
  { name: "Fort Wayne", stateAbbr: "IN", county: "Allen County", population: 263886 },
  { name: "Des Moines", stateAbbr: "IA", county: "Polk County", population: 214133 },
  { name: "Cedar Rapids", stateAbbr: "IA", county: "Linn County", population: 137710 },
  { name: "Wichita", stateAbbr: "KS", county: "Sedgwick County", population: 397532 },
  { name: "Overland Park", stateAbbr: "KS", county: "Johnson County", population: 197238 },
  { name: "Louisville", stateAbbr: "KY", county: "Jefferson County", population: 633045 },
  { name: "Lexington", stateAbbr: "KY", county: "Fayette County", population: 322570 },
  { name: "New Orleans", stateAbbr: "LA", county: "Orleans Parish", population: 383997 },
  { name: "Baton Rouge", stateAbbr: "LA", county: "East Baton Rouge Parish", population: 227470 },
  { name: "Shreveport", stateAbbr: "LA", county: "Caddo Parish", population: 187593 },
  { name: "Portland", stateAbbr: "ME", county: "Cumberland County", population: 68408 },
  { name: "Lewiston", stateAbbr: "ME", county: "Androscoggin County", population: 37121 },
  { name: "Baltimore", stateAbbr: "MD", county: "Baltimore City", population: 585708 },
  { name: "Columbia", stateAbbr: "MD", county: "Howard County", population: 104681 },
  { name: "Boston", stateAbbr: "MA", county: "Suffolk County", population: 675647 },
  { name: "Worcester", stateAbbr: "MA", county: "Worcester County", population: 206518 },
  { name: "Springfield", stateAbbr: "MA", county: "Hampden County", population: 155929 },
  { name: "Detroit", stateAbbr: "MI", county: "Wayne County", population: 639111 },
  { name: "Grand Rapids", stateAbbr: "MI", county: "Kent County", population: 198917 },
  { name: "Minneapolis", stateAbbr: "MN", county: "Hennepin County", population: 429954 },
  { name: "Saint Paul", stateAbbr: "MN", county: "Ramsey County", population: 311527 },
  { name: "Jackson", stateAbbr: "MS", county: "Hinds County", population: 153701 },
  { name: "Gulfport", stateAbbr: "MS", county: "Harrison County", population: 72926 },
  { name: "Kansas City", stateAbbr: "MO", county: "Jackson County", population: 508090 },
  { name: "St. Louis", stateAbbr: "MO", county: "St. Louis City", population: 301578 },
  { name: "Billings", stateAbbr: "MT", county: "Yellowstone County", population: 117116 },
  { name: "Missoula", stateAbbr: "MT", county: "Missoula County", population: 73489 },
  { name: "Omaha", stateAbbr: "NE", county: "Douglas County", population: 486051 },
  { name: "Lincoln", stateAbbr: "NE", county: "Lancaster County", population: 291082 },
  { name: "Las Vegas", stateAbbr: "NV", county: "Clark County", population: 641903 },
  { name: "Henderson", stateAbbr: "NV", county: "Clark County", population: 317610 },
  { name: "Reno", stateAbbr: "NV", county: "Washoe County", population: 264165 },
  { name: "Manchester", stateAbbr: "NH", county: "Hillsborough County", population: 115644 },
  { name: "Nashua", stateAbbr: "NH", county: "Hillsborough County", population: 91322 },
  { name: "Newark", stateAbbr: "NJ", county: "Essex County", population: 311549 },
  { name: "Jersey City", stateAbbr: "NJ", county: "Hudson County", population: 292449 },
  { name: "Albuquerque", stateAbbr: "NM", county: "Bernalillo County", population: 564559 },
  { name: "Las Cruces", stateAbbr: "NM", county: "Doña Ana County", population: 111385 },
  { name: "New York", stateAbbr: "NY", county: "New York County", population: 8804190 },
  { name: "Buffalo", stateAbbr: "NY", county: "Erie County", population: 278349 },
  { name: "Rochester", stateAbbr: "NY", county: "Monroe County", population: 211328 },
  { name: "Charlotte", stateAbbr: "NC", county: "Mecklenburg County", population: 874579 },
  { name: "Raleigh", stateAbbr: "NC", county: "Wake County", population: 467665 },
  { name: "Greensboro", stateAbbr: "NC", county: "Guilford County", population: 299035 },
  { name: "Fargo", stateAbbr: "ND", county: "Cass County", population: 125990 },
  { name: "Bismarck", stateAbbr: "ND", county: "Burleigh County", population: 73622 },
  { name: "Columbus", stateAbbr: "OH", county: "Franklin County", population: 905748 },
  { name: "Cleveland", stateAbbr: "OH", county: "Cuyahoga County", population: 372624 },
  { name: "Cincinnati", stateAbbr: "OH", county: "Hamilton County", population: 309317 },
  { name: "Oklahoma City", stateAbbr: "OK", county: "Oklahoma County", population: 681054 },
  { name: "Tulsa", stateAbbr: "OK", county: "Tulsa County", population: 413066 },
  { name: "Portland", stateAbbr: "OR", county: "Multnomah County", population: 652503 },
  { name: "Salem", stateAbbr: "OR", county: "Marion County", population: 175535 },
  { name: "Eugene", stateAbbr: "OR", county: "Lane County", population: 176654 },
  { name: "Philadelphia", stateAbbr: "PA", county: "Philadelphia County", population: 1603797 },
  { name: "Pittsburgh", stateAbbr: "PA", county: "Allegheny County", population: 302971 },
  { name: "Allentown", stateAbbr: "PA", county: "Lehigh County", population: 125845 },
  { name: "Providence", stateAbbr: "RI", county: "Providence County", population: 190934 },
  { name: "Warwick", stateAbbr: "RI", county: "Kent County", population: 82823 },
  { name: "Columbia", stateAbbr: "SC", county: "Richland County", population: 136632 },
  { name: "Charleston", stateAbbr: "SC", county: "Charleston County", population: 150227 },
  { name: "Sioux Falls", stateAbbr: "SD", county: "Minnehaha County", population: 192517 },
  { name: "Rapid City", stateAbbr: "SD", county: "Pennington County", population: 74703 },
  { name: "Nashville", stateAbbr: "TN", county: "Davidson County", population: 689447 },
  { name: "Memphis", stateAbbr: "TN", county: "Shelby County", population: 633104 },
  { name: "Knoxville", stateAbbr: "TN", county: "Knox County", population: 190740 },
  { name: "Houston", stateAbbr: "TX", county: "Harris County", population: 2304580 },
  { name: "San Antonio", stateAbbr: "TX", county: "Bexar County", population: 1434625 },
  { name: "Dallas", stateAbbr: "TX", county: "Dallas County", population: 1304379 },
  { name: "Austin", stateAbbr: "TX", county: "Travis County", population: 961855 },
  { name: "Salt Lake City", stateAbbr: "UT", county: "Salt Lake County", population: 199723 },
  { name: "West Valley City", stateAbbr: "UT", county: "Salt Lake County", population: 140230 },
  { name: "Burlington", stateAbbr: "VT", county: "Chittenden County", population: 44743 },
  { name: "Virginia Beach", stateAbbr: "VA", county: "Virginia Beach City", population: 459470 },
  { name: "Richmond", stateAbbr: "VA", county: "Richmond City", population: 226610 },
  { name: "Norfolk", stateAbbr: "VA", county: "Norfolk City", population: 238005 },
  { name: "Seattle", stateAbbr: "WA", county: "King County", population: 737015 },
  { name: "Spokane", stateAbbr: "WA", county: "Spokane County", population: 228989 },
  { name: "Tacoma", stateAbbr: "WA", county: "Pierce County", population: 219346 },
  { name: "Charleston", stateAbbr: "WV", county: "Kanawha County", population: 48864 },
  { name: "Huntington", stateAbbr: "WV", county: "Cabell County", population: 46842 },
  { name: "Milwaukee", stateAbbr: "WI", county: "Milwaukee County", population: 577222 },
  { name: "Madison", stateAbbr: "WI", county: "Dane County", population: 269840 },
  { name: "Green Bay", stateAbbr: "WI", county: "Brown County", population: 107395 },
  { name: "Cheyenne", stateAbbr: "WY", county: "Laramie County", population: 65132 },
  { name: "Casper", stateAbbr: "WY", county: "Natrona County", population: 59038 },
];
