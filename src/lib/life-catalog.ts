/**
 * Evolve Life catalog — the option lists a person picks from during onboarding,
 * and the questions that drive that flow. "First ask them questions… and it
 * pulls up the list of all these things the person can choose from."
 *
 * Kept as plain data so it's trivial to extend or localize, and so both the API
 * and the UI read from one source of truth.
 */

export type LifeCategory =
  | 'movie_genre'
  | 'tv_genre'
  | 'entertainment'
  | 'sport'
  | 'activity'
  | 'cuisine'
  | 'favorite_place'
  | 'dietary'
  | 'fitness_goal';

export interface LifeQuestion {
  category: LifeCategory;
  question: string;
  hint: string;
  options: string[];
  /** favorite_place is free-text (their actual spots), the rest are chips. */
  freeText?: boolean;
  icon: string; // graphic slug from /public/graphics or an emoji fallback
}

export const CATALOG: Record<LifeCategory, string[]> = {
  movie_genre: [
    'Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Thriller', 'Romance',
    'Documentary', 'Animation', 'Fantasy', 'Crime', 'Adventure', 'Family',
  ],
  tv_genre: [
    'Sitcom', 'Drama series', 'Reality', 'True crime', 'Sci-Fi & fantasy',
    'Docuseries', 'Anime', 'Talk shows', 'Sports', 'Cooking', 'Kids',
  ],
  entertainment: [
    'Live music', 'Concerts', 'Theater', 'Comedy clubs', 'Museums', 'Art galleries',
    'Festivals', 'Nightlife', 'Board games', 'Video games', 'Reading', 'Podcasts',
  ],
  sport: [
    'Basketball', 'Football', 'Baseball', 'Soccer', 'Tennis', 'Golf', 'Hockey',
    'MMA & boxing', 'Cycling', 'Running', 'Swimming', 'Yoga', 'Weightlifting', 'Climbing',
  ],
  activity: [
    'Biking', 'Running', 'Hiking', 'Camping', 'Fishing', 'Kayaking', 'Parks & recreation',
    'Beach', 'Skiing & snowboarding', 'Photography', 'Gardening', 'Road trips',
  ],
  cuisine: [
    'Italian', 'Mexican', 'Japanese', 'Chinese', 'Thai', 'Indian', 'Mediterranean',
    'BBQ', 'Seafood', 'Vegan', 'Steakhouse', 'Breakfast & brunch', 'Coffee', 'Desserts',
  ],
  favorite_place: [], // free-text: their actual go-to spots
  dietary: [
    'No restrictions', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free',
    'Keto', 'Halal', 'Kosher', 'Pescatarian', 'Low-carb',
  ],
  fitness_goal: [
    'Stay active', 'Build strength', 'Lose weight', 'Run a race', 'Improve flexibility',
    'Reduce stress', 'Sleep better', 'Train for an event',
  ],
};

/** The onboarding interview, in order. */
export const QUESTIONS: LifeQuestion[] = [
  { category: 'movie_genre', question: 'What kind of movies do you like?', hint: 'Pick a few — we’ll surface showtimes that fit your night.', options: CATALOG.movie_genre, icon: 'entertainment' },
  { category: 'tv_genre', question: 'What TV shows are you into?', hint: 'So we can tell you when the next episode drops.', options: CATALOG.tv_genre, icon: 'entertainment' },
  { category: 'entertainment', question: 'What kind of entertainment do you enjoy?', hint: 'Nights out, at home, or somewhere in between.', options: CATALOG.entertainment, icon: 'entertainment' },
  { category: 'sport', question: 'What sports do you like — to watch or play?', hint: 'We’ll flag games, courts, and classes near you.', options: CATALOG.sport, icon: 'fitness' },
  { category: 'activity', question: 'What outdoor & recreation activities do you like?', hint: 'Bike, run, hike, camp, fish — we’ll find the spot.', options: CATALOG.activity, icon: 'recreation' },
  { category: 'fitness_goal', question: 'What are your health & fitness goals?', hint: 'We’ll build reminders and workouts around these.', options: CATALOG.fitness_goal, icon: 'fitness' },
  { category: 'cuisine', question: 'What kind of food do you love?', hint: 'We’ll match restaurants and reviews near you.', options: CATALOG.cuisine, icon: 'dining' },
  { category: 'dietary', question: 'Any dietary preferences?', hint: 'So every food suggestion actually works for you.', options: CATALOG.dietary, icon: 'dining' },
  { category: 'favorite_place', question: 'What are your favorite places to eat or hang out?', hint: 'Type your real go-to spots — we’ll prioritize them.', options: [], freeText: true, icon: 'dining' },
];

export function isValidCategory(c: string): c is LifeCategory {
  return Object.prototype.hasOwnProperty.call(CATALOG, c);
}
