// Mock hotel catalog used for search/autocomplete when adding a hotel.
// Users can also add a hotel not in this list via free text.
// `tier` (budget/moderate/luxury) and `tags` (nearby attractions) power
// the Discover tab's recommendation engine. `website` links to each
// hotel's real official site; `address` is best-effort and may be
// approximate for the smaller chain properties (h25+) — this is demo
// data, not a verified listings database.
const MOCK_HOTELS = [
  { id: "h1", name: "The Ritz-Carlton", city: "New York", country: "USA", tier: "luxury", tags: ["Historical", "Museums", "Shopping", "MLB", "NBA"], address: "50 Central Park South, New York, NY 10019", website: "https://www.ritzcarlton.com/en/hotels/nyc-new-york-central-park" },
  { id: "h2", name: "Aman Tokyo", city: "Tokyo", country: "Japan", tier: "luxury", tags: ["Shopping", "Foodie"], address: "1-5-6 Otemachi, Chiyoda City, Tokyo 100-0004, Japan", website: "https://www.aman.com/hotels/aman-tokyo" },
  { id: "h3", name: "Hotel Bel-Air", city: "Los Angeles", country: "USA", tier: "luxury", tags: ["Nature"], address: "701 Stone Canyon Rd, Los Angeles, CA 90077", website: "https://www.dorchestercollection.com/los-angeles/hotel-bel-air/" },
  { id: "h4", name: "Claridge's", city: "London", country: "UK", tier: "luxury", tags: ["Historical", "Museums", "Shopping"], address: "Brook St, London W1K 4HR, UK", website: "https://www.claridges.co.uk/" },
  { id: "h5", name: "The Peninsula", city: "Hong Kong", country: "China", tier: "luxury", tags: ["Shopping", "Foodie"], address: "Salisbury Rd, Tsim Sha Tsui, Hong Kong", website: "https://www.peninsula.com/en/hong-kong/5-star-luxury-hotel-tsim-sha-tsui" },
  { id: "h6", name: "Four Seasons George V", city: "Paris", country: "France", tier: "luxury", tags: ["Historical", "Museums", "Shopping"], address: "31 Avenue George V, 75008 Paris, France", website: "https://www.fourseasons.com/paris/" },
  { id: "h7", name: "Marina Bay Sands", city: "Singapore", country: "Singapore", tier: "luxury", tags: ["Shopping", "Nightlife"], address: "10 Bayfront Ave, Singapore 018956", website: "https://www.marinabaysands.com/" },
  { id: "h8", name: "The Plaza", city: "New York", country: "USA", tier: "luxury", tags: ["Historical", "Shopping", "MLB", "NBA"], address: "768 5th Ave, New York, NY 10019", website: "https://www.theplazany.com/" },
  { id: "h9", name: "Burj Al Arab", city: "Dubai", country: "UAE", tier: "luxury", tags: ["Shopping", "Nightlife"], address: "Jumeirah St, Dubai, UAE", website: "https://www.jumeirah.com/en/stay/dubai/burj-al-arab" },
  { id: "h10", name: "Hotel de Russie", city: "Rome", country: "Italy", tier: "luxury", tags: ["Historical", "Museums"], address: "Via del Babuino, 9, 00187 Roma RM, Italy", website: "https://www.roccofortehotels.com/hotels-and-resorts/hotel-de-russie/" },
  { id: "h11", name: "The Beverly Hills Hotel", city: "Los Angeles", country: "USA", tier: "luxury", tags: ["Nightlife", "Shopping"], address: "9641 Sunset Blvd, Beverly Hills, CA 90210", website: "https://www.dorchestercollection.com/los-angeles/the-beverly-hills-hotel/" },
  { id: "h12", name: "Raffles", city: "Singapore", country: "Singapore", tier: "luxury", tags: ["Historical", "Shopping"], address: "1 Beach Rd, Singapore 189673", website: "https://www.raffles.com/singapore/" },
  { id: "h13", name: "The Gritti Palace", city: "Venice", country: "Italy", tier: "luxury", tags: ["Historical", "Museums"], address: "Campo Santa Maria del Giglio, 2467, 30124 Venezia VE, Italy", website: "https://www.thegrittipalace.com/" },
  { id: "h14", name: "Post Ranch Inn", city: "Big Sur", country: "USA", tier: "luxury", tags: ["Nature"], address: "47900 CA-1, Big Sur, CA 93920", website: "https://www.postranchinn.com/" },
  { id: "h15", name: "Amangiri", city: "Canyon Point", country: "USA", tier: "luxury", tags: ["Nature"], address: "1 Kayenta Rd, Canyon Point, UT 84741", website: "https://www.aman.com/hotels/amangiri" },
  { id: "h16", name: "The Connaught", city: "London", country: "UK", tier: "luxury", tags: ["Historical", "Museums", "Shopping"], address: "Carlos Pl, London W1K 2AL, UK", website: "https://www.the-connaught.co.uk/" },
  { id: "h17", name: "Hotel Arts", city: "Barcelona", country: "Spain", tier: "luxury", tags: ["Beach", "Foodie"], address: "Carrer de la Marina, 19-21, 08005 Barcelona, Spain", website: "https://www.hotelartsbarcelona.com/" },
  { id: "h18", name: "Park Hyatt", city: "Tokyo", country: "Japan", tier: "luxury", tags: ["Shopping", "Foodie"], address: "3-7-1-2 Nishishinjuku, Shinjuku City, Tokyo 163-1055, Japan", website: "https://www.hyatt.com/park-hyatt/en-US/tyoph-park-hyatt-tokyo" },
  { id: "h19", name: "The Ned", city: "London", country: "UK", tier: "moderate", tags: ["Historical", "Nightlife", "Foodie"], address: "27 Poultry, London EC2R 8AJ, UK", website: "https://www.thened.com/" },
  { id: "h20", name: "Rosewood Mayakoba", city: "Playa del Carmen", country: "Mexico", tier: "luxury", tags: ["Beach", "Nature"], address: "Carretera Federal Cancún-Playa del Carmen Km 298, 77710 Playa del Carmen, Mexico", website: "https://www.rosewoodhotels.com/en/mayakoba" },
  { id: "h21", name: "Nihi Sumba", city: "Sumba", country: "Indonesia", tier: "luxury", tags: ["Beach", "Nature"], address: "Desa Hobawawi, Wewewa Barat, Sumba Barat Daya, Indonesia", website: "https://www.nihi.com/" },
  { id: "h22", name: "The St. Regis", city: "New York", country: "USA", tier: "luxury", tags: ["Historical", "Shopping", "MLB", "NBA"], address: "2 E 55th St, New York, NY 10022", website: "https://www.marriott.com/en-us/hotels/nycsr-the-st-regis-new-york/" },
  { id: "h23", name: "Belmond Hotel Caruso", city: "Ravello", country: "Italy", tier: "luxury", tags: ["Historical", "Beach"], address: "Piazza San Giovanni del Toro, 2, 84010 Ravello SA, Italy", website: "https://www.belmond.com/hotels/europe/italy/ravello/belmond-hotel-caruso/" },
  { id: "h24", name: "Soho House", city: "Chicago", country: "USA", tier: "moderate", tags: ["Nightlife", "Foodie", "MLB", "NBA"], address: "113-125 N Green St, Chicago, IL 60607", website: "https://www.sohohouse.com/houses/soho-house-chicago" },
  { id: "h25", name: "Pod Times Square", city: "New York", country: "USA", tier: "budget", tags: ["MLB", "NBA", "Nightlife", "Shopping"], address: "400 W 42nd St, New York, NY 10036", website: "https://www.thepodhotel.com/pod-times-square/" },
  { id: "h26", name: "citizenM Boston North Station", city: "Boston", country: "USA", tier: "moderate", tags: ["MLB", "NBA", "Historical"], address: "50 Causeway St, Boston, MA 02114", website: "https://www.citizenm.com/destinations/boston/boston-north-station-hotel" },
  { id: "h27", name: "The Freehand", city: "Chicago", country: "USA", tier: "budget", tags: ["MLB", "NBA", "Nightlife", "Foodie"], address: "19 E Ohio St, Chicago, IL 60611", website: "https://www.freehandhotels.com/chicago/" },
  { id: "h28", name: "Hotel Erwin", city: "Los Angeles", country: "USA", tier: "moderate", tags: ["Beach", "Nightlife"], address: "1697 Pacific Ave, Venice, CA 90291", website: "https://www.hotelerwin.com/" },
  { id: "h29", name: "Yotel San Francisco", city: "San Francisco", country: "USA", tier: "budget", tags: ["MLB", "NBA", "Foodie"], address: "1095 Market St, San Francisco, CA 94103", website: "https://www.yotel.com/en/hotels/yotel-san-francisco" },
  { id: "h30", name: "The Loren at Lady Bird Lake", city: "Austin", country: "USA", tier: "moderate", tags: ["Nature", "Nightlife"], address: "1211 S 1st St, Austin, TX 78704", website: "https://www.thelorenhotel.com/" },
  { id: "h31", name: "Generator Miami", city: "Miami", country: "USA", tier: "budget", tags: ["Beach", "Nightlife"], address: "2340 Collins Ave, Miami Beach, FL 33139", website: "https://staygenerator.com/hostels/miami" },
  { id: "h32", name: "Found Hotel Chicago", city: "Chicago", country: "USA", tier: "budget", tags: ["MLB", "NBA", "Historical"], address: "Downtown Chicago, IL", website: "https://www.foundhotels.com/" },
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
