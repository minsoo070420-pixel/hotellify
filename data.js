// Mock hotel catalog used for search/autocomplete when adding a hotel.
// Users can also add a hotel not in this list via free text.
// `tier` (budget/moderate/luxury) and `tags` (nearby attractions) power
// the Discover tab's recommendation engine.
const MOCK_HOTELS = [
  { id: "h1", name: "The Ritz-Carlton", city: "New York", country: "USA", tier: "luxury", tags: ["Historical", "Museums", "Shopping", "MLB", "NBA"] },
  { id: "h2", name: "Aman Tokyo", city: "Tokyo", country: "Japan", tier: "luxury", tags: ["Shopping", "Foodie"] },
  { id: "h3", name: "Hotel Bel-Air", city: "Los Angeles", country: "USA", tier: "luxury", tags: ["Nature"] },
  { id: "h4", name: "Claridge's", city: "London", country: "UK", tier: "luxury", tags: ["Historical", "Museums", "Shopping"] },
  { id: "h5", name: "The Peninsula", city: "Hong Kong", country: "China", tier: "luxury", tags: ["Shopping", "Foodie"] },
  { id: "h6", name: "Four Seasons George V", city: "Paris", country: "France", tier: "luxury", tags: ["Historical", "Museums", "Shopping"] },
  { id: "h7", name: "Marina Bay Sands", city: "Singapore", country: "Singapore", tier: "luxury", tags: ["Shopping", "Nightlife"] },
  { id: "h8", name: "The Plaza", city: "New York", country: "USA", tier: "luxury", tags: ["Historical", "Shopping", "MLB", "NBA"] },
  { id: "h9", name: "Burj Al Arab", city: "Dubai", country: "UAE", tier: "luxury", tags: ["Shopping", "Nightlife"] },
  { id: "h10", name: "Hotel de Russie", city: "Rome", country: "Italy", tier: "luxury", tags: ["Historical", "Museums"] },
  { id: "h11", name: "The Beverly Hills Hotel", city: "Los Angeles", country: "USA", tier: "luxury", tags: ["Nightlife", "Shopping"] },
  { id: "h12", name: "Raffles", city: "Singapore", country: "Singapore", tier: "luxury", tags: ["Historical", "Shopping"] },
  { id: "h13", name: "The Gritti Palace", city: "Venice", country: "Italy", tier: "luxury", tags: ["Historical", "Museums"] },
  { id: "h14", name: "Post Ranch Inn", city: "Big Sur", country: "USA", tier: "luxury", tags: ["Nature"] },
  { id: "h15", name: "Amangiri", city: "Canyon Point", country: "USA", tier: "luxury", tags: ["Nature"] },
  { id: "h16", name: "The Connaught", city: "London", country: "UK", tier: "luxury", tags: ["Historical", "Museums", "Shopping"] },
  { id: "h17", name: "Hotel Arts", city: "Barcelona", country: "Spain", tier: "luxury", tags: ["Beach", "Foodie"] },
  { id: "h18", name: "Park Hyatt", city: "Tokyo", country: "Japan", tier: "luxury", tags: ["Shopping", "Foodie"] },
  { id: "h19", name: "The Ned", city: "London", country: "UK", tier: "moderate", tags: ["Historical", "Nightlife", "Foodie"] },
  { id: "h20", name: "Rosewood Mayakoba", city: "Playa del Carmen", country: "Mexico", tier: "luxury", tags: ["Beach", "Nature"] },
  { id: "h21", name: "Nihi Sumba", city: "Sumba", country: "Indonesia", tier: "luxury", tags: ["Beach", "Nature"] },
  { id: "h22", name: "The St. Regis", city: "New York", country: "USA", tier: "luxury", tags: ["Historical", "Shopping", "MLB", "NBA"] },
  { id: "h23", name: "Belmond Hotel Caruso", city: "Ravello", country: "Italy", tier: "luxury", tags: ["Historical", "Beach"] },
  { id: "h24", name: "Soho House", city: "Chicago", country: "USA", tier: "moderate", tags: ["Nightlife", "Foodie", "MLB", "NBA"] },
  { id: "h25", name: "Pod Times Square", city: "New York", country: "USA", tier: "budget", tags: ["MLB", "NBA", "Nightlife", "Shopping"] },
  { id: "h26", name: "citizenM Boston North Station", city: "Boston", country: "USA", tier: "moderate", tags: ["MLB", "NBA", "Historical"] },
  { id: "h27", name: "The Freehand", city: "Chicago", country: "USA", tier: "budget", tags: ["MLB", "NBA", "Nightlife", "Foodie"] },
  { id: "h28", name: "Hotel Erwin", city: "Los Angeles", country: "USA", tier: "moderate", tags: ["Beach", "Nightlife"] },
  { id: "h29", name: "Yotel San Francisco", city: "San Francisco", country: "USA", tier: "budget", tags: ["MLB", "NBA", "Foodie"] },
  { id: "h30", name: "The Loren at Lady Bird Lake", city: "Austin", country: "USA", tier: "moderate", tags: ["Nature", "Nightlife"] },
  { id: "h31", name: "Generator Miami", city: "Miami", country: "USA", tier: "budget", tags: ["Beach", "Nightlife"] },
  { id: "h32", name: "Found Hotel Chicago", city: "Chicago", country: "USA", tier: "budget", tags: ["MLB", "NBA", "Historical"] },
];

const TIER_META = {
  budget: { label: "Budget-Friendly", emoji: "💸" },
  moderate: { label: "Moderate", emoji: "🙂" },
  luxury: { label: "Luxurious", emoji: "✨" },
};

const ATTRACTION_TAGS = ["MLB", "NBA", "Historical", "Beach", "Nature", "Nightlife", "Museums", "Shopping", "Foodie"];

// Mock friends with pre-existing ranked lists, used to demo the social
// feed and match-score features without a real backend. `hoursAgo` is
// relative to "now" so the feed always looks fresh when demoed.
const MOCK_FRIENDS = [
  {
    id: "f1",
    name: "Jordan Lee",
    avatar: "🧳",
    ranked: [
      { hotelId: "h2", bucket: "liked", score: 9.6, hoursAgo: 4 },
      { hotelId: "h9", bucket: "liked", score: 8.1, hoursAgo: 30 },
      { hotelId: "h4", bucket: "fine", score: 5.4, hoursAgo: 55 },
      { hotelId: "h11", bucket: "disliked", score: 2.0, hoursAgo: 100 },
    ],
  },
  {
    id: "f2",
    name: "Priya Nair",
    avatar: "✈️",
    ranked: [
      { hotelId: "h6", bucket: "liked", score: 9.9, hoursAgo: 10 },
      { hotelId: "h13", bucket: "liked", score: 8.7, hoursAgo: 40 },
      { hotelId: "h1", bucket: "fine", score: 6.0, hoursAgo: 70 },
      { hotelId: "h9", bucket: "fine", score: 4.2, hoursAgo: 95 },
    ],
  },
  {
    id: "f3",
    name: "Marcus Chen",
    avatar: "🌍",
    ranked: [
      { hotelId: "h15", bucket: "liked", score: 10.0, hoursAgo: 2 },
      { hotelId: "h14", bucket: "liked", score: 8.9, hoursAgo: 20 },
      { hotelId: "h7", bucket: "liked", score: 7.5, hoursAgo: 65 },
      { hotelId: "h24", bucket: "disliked", score: 3.0, hoursAgo: 120 },
    ],
  },
  {
    id: "f4",
    name: "Sofia Ricci",
    avatar: "🗺️",
    ranked: [
      { hotelId: "h13", bucket: "liked", score: 9.4, hoursAgo: 15 },
      { hotelId: "h23", bucket: "liked", score: 9.0, hoursAgo: 45 },
      { hotelId: "h10", bucket: "fine", score: 5.8, hoursAgo: 80 },
      { hotelId: "h17", bucket: "fine", score: 4.6, hoursAgo: 130 },
    ],
  },
];
