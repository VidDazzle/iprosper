/**
 * U.S. states + DC — the top level of the local-SEO location tree.
 * Every state gets a landing page at /locations/[slug]; counties and cities hang
 * off of it. Slugs are lowercase-hyphenated state names.
 */

export interface UsState {
  name: string;
  abbr: string;
  slug: string;
  capital: string;
}

export const US_STATES: UsState[] = [
  { name: "Alabama", abbr: "AL", slug: "alabama", capital: "Montgomery" },
  { name: "Alaska", abbr: "AK", slug: "alaska", capital: "Juneau" },
  { name: "Arizona", abbr: "AZ", slug: "arizona", capital: "Phoenix" },
  { name: "Arkansas", abbr: "AR", slug: "arkansas", capital: "Little Rock" },
  { name: "California", abbr: "CA", slug: "california", capital: "Sacramento" },
  { name: "Colorado", abbr: "CO", slug: "colorado", capital: "Denver" },
  { name: "Connecticut", abbr: "CT", slug: "connecticut", capital: "Hartford" },
  { name: "Delaware", abbr: "DE", slug: "delaware", capital: "Dover" },
  { name: "District of Columbia", abbr: "DC", slug: "district-of-columbia", capital: "Washington" },
  { name: "Florida", abbr: "FL", slug: "florida", capital: "Tallahassee" },
  { name: "Georgia", abbr: "GA", slug: "georgia", capital: "Atlanta" },
  { name: "Hawaii", abbr: "HI", slug: "hawaii", capital: "Honolulu" },
  { name: "Idaho", abbr: "ID", slug: "idaho", capital: "Boise" },
  { name: "Illinois", abbr: "IL", slug: "illinois", capital: "Springfield" },
  { name: "Indiana", abbr: "IN", slug: "indiana", capital: "Indianapolis" },
  { name: "Iowa", abbr: "IA", slug: "iowa", capital: "Des Moines" },
  { name: "Kansas", abbr: "KS", slug: "kansas", capital: "Topeka" },
  { name: "Kentucky", abbr: "KY", slug: "kentucky", capital: "Frankfort" },
  { name: "Louisiana", abbr: "LA", slug: "louisiana", capital: "Baton Rouge" },
  { name: "Maine", abbr: "ME", slug: "maine", capital: "Augusta" },
  { name: "Maryland", abbr: "MD", slug: "maryland", capital: "Annapolis" },
  { name: "Massachusetts", abbr: "MA", slug: "massachusetts", capital: "Boston" },
  { name: "Michigan", abbr: "MI", slug: "michigan", capital: "Lansing" },
  { name: "Minnesota", abbr: "MN", slug: "minnesota", capital: "Saint Paul" },
  { name: "Mississippi", abbr: "MS", slug: "mississippi", capital: "Jackson" },
  { name: "Missouri", abbr: "MO", slug: "missouri", capital: "Jefferson City" },
  { name: "Montana", abbr: "MT", slug: "montana", capital: "Helena" },
  { name: "Nebraska", abbr: "NE", slug: "nebraska", capital: "Lincoln" },
  { name: "Nevada", abbr: "NV", slug: "nevada", capital: "Carson City" },
  { name: "New Hampshire", abbr: "NH", slug: "new-hampshire", capital: "Concord" },
  { name: "New Jersey", abbr: "NJ", slug: "new-jersey", capital: "Trenton" },
  { name: "New Mexico", abbr: "NM", slug: "new-mexico", capital: "Santa Fe" },
  { name: "New York", abbr: "NY", slug: "new-york", capital: "Albany" },
  { name: "North Carolina", abbr: "NC", slug: "north-carolina", capital: "Raleigh" },
  { name: "North Dakota", abbr: "ND", slug: "north-dakota", capital: "Bismarck" },
  { name: "Ohio", abbr: "OH", slug: "ohio", capital: "Columbus" },
  { name: "Oklahoma", abbr: "OK", slug: "oklahoma", capital: "Oklahoma City" },
  { name: "Oregon", abbr: "OR", slug: "oregon", capital: "Salem" },
  { name: "Pennsylvania", abbr: "PA", slug: "pennsylvania", capital: "Harrisburg" },
  { name: "Rhode Island", abbr: "RI", slug: "rhode-island", capital: "Providence" },
  { name: "South Carolina", abbr: "SC", slug: "south-carolina", capital: "Columbia" },
  { name: "South Dakota", abbr: "SD", slug: "south-dakota", capital: "Pierre" },
  { name: "Tennessee", abbr: "TN", slug: "tennessee", capital: "Nashville" },
  { name: "Texas", abbr: "TX", slug: "texas", capital: "Austin" },
  { name: "Utah", abbr: "UT", slug: "utah", capital: "Salt Lake City" },
  { name: "Vermont", abbr: "VT", slug: "vermont", capital: "Montpelier" },
  { name: "Virginia", abbr: "VA", slug: "virginia", capital: "Richmond" },
  { name: "Washington", abbr: "WA", slug: "washington", capital: "Olympia" },
  { name: "West Virginia", abbr: "WV", slug: "west-virginia", capital: "Charleston" },
  { name: "Wisconsin", abbr: "WI", slug: "wisconsin", capital: "Madison" },
  { name: "Wyoming", abbr: "WY", slug: "wyoming", capital: "Cheyenne" },
];

export const STATE_BY_SLUG: Record<string, UsState> = Object.fromEntries(US_STATES.map((s) => [s.slug, s]));
export const STATE_BY_ABBR: Record<string, UsState> = Object.fromEntries(US_STATES.map((s) => [s.abbr, s]));
