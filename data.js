// Mock hotel catalog used for search/autocomplete when adding a hotel.
// Users can also add a hotel not in this list via free text.
// `tier` (budget/moderate/luxury) and `tags` (nearby attractions) power
// the Discover tab's recommendation engine. `website` links to each
// hotel's real official site; `address` is best-effort and may be
// approximate for the smaller chain properties (h25+) — this is demo
// data, not a verified listings database.
const MOCK_HOTELS = [
  { id: "h1", name: "The Ritz-Carlton", city: "New York", country: "USA", tier: "luxury", tags: ["Historical", "Museums", "Shopping"], address: "50 Central Park South, New York, NY 10019", website: "https://www.ritzcarlton.com/en/hotels/nyc-new-york-central-park" , nearby: ["Central Park", "Carnegie Hall", "Fifth Avenue"] },
  { id: "h2", name: "Aman Tokyo", city: "Tokyo", country: "Japan", tier: "luxury", tags: ["Shopping", "Foodie"], address: "1-5-6 Otemachi, Chiyoda City, Tokyo 100-0004, Japan", website: "https://www.aman.com/hotels/aman-tokyo" , nearby: ["Imperial Palace", "Tokyo Station", "Marunouchi shopping district"] },
  { id: "h3", name: "Hotel Bel-Air", city: "Los Angeles", country: "USA", tier: "luxury", tags: ["Nature"], address: "701 Stone Canyon Rd, Los Angeles, CA 90077", website: "https://www.dorchestercollection.com/los-angeles/hotel-bel-air/" , nearby: ["Getty Center", "Rodeo Drive", "UCLA"] },
  { id: "h4", name: "Claridge's", city: "London", country: "UK", tier: "luxury", tags: ["Historical", "Museums", "Shopping"], address: "Brook St, London W1K 4HR, UK", website: "https://www.claridges.co.uk/" , nearby: ["Bond Street", "Hyde Park", "Grosvenor Square"] },
  { id: "h5", name: "The Peninsula", city: "Hong Kong", country: "China", tier: "luxury", tags: ["Shopping", "Foodie"], address: "Salisbury Rd, Tsim Sha Tsui, Hong Kong", website: "https://www.peninsula.com/en/hong-kong/5-star-luxury-hotel-tsim-sha-tsui" , nearby: ["Victoria Harbour waterfront", "Avenue of Stars", "Hong Kong Museum of Art"] },
  { id: "h6", name: "Four Seasons George V", city: "Paris", country: "France", tier: "luxury", tags: ["Historical", "Museums", "Shopping"], address: "31 Avenue George V, 75008 Paris, France", website: "https://www.fourseasons.com/paris/" , nearby: ["Champs-Élysées", "Arc de Triomphe", "Eiffel Tower"] },
  { id: "h7", name: "Marina Bay Sands", city: "Singapore", country: "Singapore", tier: "luxury", tags: ["Shopping", "Nightlife"], address: "10 Bayfront Ave, Singapore 018956", website: "https://www.marinabaysands.com/" , nearby: ["Gardens by the Bay", "Merlion Park", "ArtScience Museum"] },
  { id: "h8", name: "The Plaza", city: "New York", country: "USA", tier: "luxury", tags: ["Historical", "Shopping"], address: "768 5th Ave, New York, NY 10019", website: "https://www.theplazany.com/" , nearby: ["Central Park", "Fifth Avenue", "Carnegie Hall"] },
  { id: "h9", name: "Burj Al Arab", city: "Dubai", country: "UAE", tier: "luxury", tags: ["Shopping", "Nightlife"], address: "Jumeirah St, Dubai, UAE", website: "https://www.jumeirah.com/en/stay/dubai/burj-al-arab" , nearby: ["Jumeirah Beach", "Wild Wadi Waterpark", "Madinat Jumeirah"] },
  { id: "h10", name: "Hotel de Russie", city: "Rome", country: "Italy", tier: "luxury", tags: ["Historical", "Museums"], address: "Via del Babuino, 9, 00187 Roma RM, Italy", website: "https://www.roccofortehotels.com/hotels-and-resorts/hotel-de-russie/" , nearby: ["Spanish Steps", "Piazza del Popolo", "Villa Borghese"] },
  { id: "h11", name: "The Beverly Hills Hotel", city: "Los Angeles", country: "USA", tier: "luxury", tags: ["Nightlife", "Shopping"], address: "9641 Sunset Blvd, Beverly Hills, CA 90210", website: "https://www.dorchestercollection.com/los-angeles/the-beverly-hills-hotel/" , nearby: ["Rodeo Drive", "Sunset Strip", "Beverly Gardens Park"] },
  { id: "h12", name: "Raffles", city: "Singapore", country: "Singapore", tier: "luxury", tags: ["Historical", "Shopping"], address: "1 Beach Rd, Singapore 189673", website: "https://www.raffles.com/singapore/" , nearby: ["Marina Bay", "Esplanade Theatres", "Merlion Park"] },
  { id: "h13", name: "The Gritti Palace", city: "Venice", country: "Italy", tier: "luxury", tags: ["Historical", "Museums"], address: "Campo Santa Maria del Giglio, 2467, 30124 Venezia VE, Italy", website: "https://www.thegrittipalace.com/" , nearby: ["St. Mark's Square", "Grand Canal", "Accademia Gallery"] },
  { id: "h14", name: "Post Ranch Inn", city: "Big Sur", country: "USA", tier: "luxury", tags: ["Nature"], address: "47900 CA-1, Big Sur, CA 93920", website: "https://www.postranchinn.com/" , nearby: ["Bixby Creek Bridge", "Pfeiffer Beach", "McWay Falls"] },
  { id: "h15", name: "Amangiri", city: "Canyon Point", country: "USA", tier: "luxury", tags: ["Nature"], address: "1 Kayenta Rd, Canyon Point, UT 84741", website: "https://www.aman.com/hotels/amangiri" , nearby: ["Lake Powell", "Antelope Canyon", "Grand Staircase-Escalante"] },
  { id: "h16", name: "The Connaught", city: "London", country: "UK", tier: "luxury", tags: ["Historical", "Museums", "Shopping"], address: "Carlos Pl, London W1K 2AL, UK", website: "https://www.the-connaught.co.uk/" , nearby: ["Bond Street", "Grosvenor Square", "Hyde Park"] },
  { id: "h17", name: "Hotel Arts", city: "Barcelona", country: "Spain", tier: "luxury", tags: ["Beach", "Foodie"], address: "Carrer de la Marina, 19-21, 08005 Barcelona, Spain", website: "https://www.hotelartsbarcelona.com/" , nearby: ["Barceloneta Beach", "Port Olímpic", "Gothic Quarter"] },
  { id: "h18", name: "Park Hyatt", city: "Tokyo", country: "Japan", tier: "luxury", tags: ["Shopping", "Foodie"], address: "3-7-1-2 Nishishinjuku, Shinjuku City, Tokyo 163-1055, Japan", website: "https://www.hyatt.com/park-hyatt/en-US/tyoph-park-hyatt-tokyo" , nearby: ["Shinjuku Gyoen", "Tokyo Metropolitan Government Building", "Golden Gai"] },
  { id: "h19", name: "The Ned", city: "London", country: "UK", tier: "moderate", tags: ["Historical", "Nightlife", "Foodie"], address: "27 Poultry, London EC2R 8AJ, UK", website: "https://www.thened.com/" , nearby: ["Bank of England", "St. Paul's Cathedral", "Leadenhall Market"] },
  { id: "h20", name: "Rosewood Mayakoba", city: "Playa del Carmen", country: "Mexico", tier: "luxury", tags: ["Beach", "Nature"], address: "Carretera Federal Cancún-Playa del Carmen Km 298, 77710 Playa del Carmen, Mexico", website: "https://www.rosewoodhotels.com/en/mayakoba" , nearby: ["Playa del Carmen beach", "Xcaret Park", "5th Avenue Playa del Carmen"] },
  { id: "h21", name: "Nihi Sumba", city: "Sumba", country: "Indonesia", tier: "luxury", tags: ["Beach", "Nature"], address: "Desa Hobawawi, Wewewa Barat, Sumba Barat Daya, Indonesia", website: "https://www.nihi.com/" , nearby: ["Nihiwatu Beach", "Weekuri Lake", "Sumba traditional villages"] },
  { id: "h22", name: "The St. Regis", city: "New York", country: "USA", tier: "luxury", tags: ["Historical", "Shopping"], address: "2 E 55th St, New York, NY 10022", website: "https://www.marriott.com/en-us/hotels/nycsr-the-st-regis-new-york/" , nearby: ["Fifth Avenue", "MoMA", "Central Park"] },
  { id: "h23", name: "Belmond Hotel Caruso", city: "Ravello", country: "Italy", tier: "luxury", tags: ["Historical", "Beach"], address: "Piazza San Giovanni del Toro, 2, 84010 Ravello SA, Italy", website: "https://www.belmond.com/hotels/europe/italy/ravello/belmond-hotel-caruso/" , nearby: ["Villa Rufolo", "Ravello Cathedral", "Amalfi Coast viewpoints"] },
  { id: "h24", name: "Soho House", city: "Chicago", country: "USA", tier: "moderate", tags: ["Nightlife", "Foodie"], address: "113-125 N Green St, Chicago, IL 60607", website: "https://www.sohohouse.com/houses/soho-house-chicago" , nearby: ["West Loop restaurants", "Union Station", "Willis Tower"] },
  { id: "h25", name: "Pod Times Square", city: "New York", country: "USA", tier: "budget", tags: ["Nightlife", "Shopping"], address: "400 W 42nd St, New York, NY 10036", website: "https://www.thepodhotel.com/pod-times-square/" , nearby: ["Times Square", "Broadway theaters", "Bryant Park"] },
  { id: "h26", name: "citizenM Boston North Station", city: "Boston", country: "USA", tier: "moderate", tags: ["Historical"], address: "50 Causeway St, Boston, MA 02114", website: "https://www.citizenm.com/destinations/boston/boston-north-station-hotel" , nearby: ["TD Garden", "Faneuil Hall", "Freedom Trail"] },
  { id: "h27", name: "The Freehand", city: "Chicago", country: "USA", tier: "budget", tags: ["Nightlife", "Foodie"], address: "19 E Ohio St, Chicago, IL 60611", website: "https://www.freehandhotels.com/chicago/" , nearby: ["Magnificent Mile", "Navy Pier", "Millennium Park"] },
  { id: "h28", name: "Hotel Erwin", city: "Los Angeles", country: "USA", tier: "moderate", tags: ["Beach", "Nightlife"], address: "1697 Pacific Ave, Venice, CA 90291", website: "https://www.hotelerwin.com/" , nearby: ["Venice Beach Boardwalk", "Muscle Beach", "Abbot Kinney Blvd"] },
  { id: "h29", name: "Yotel San Francisco", city: "San Francisco", country: "USA", tier: "budget", tags: ["Foodie"], address: "1095 Market St, San Francisco, CA 94103", website: "https://www.yotel.com/en/hotels/yotel-san-francisco" , nearby: ["Union Square", "Moscone Center", "SFMOMA"] },
  { id: "h30", name: "The Loren at Lady Bird Lake", city: "Austin", country: "USA", tier: "moderate", tags: ["Nature", "Nightlife"], address: "1211 S 1st St, Austin, TX 78704", website: "https://www.thelorenhotel.com/" , nearby: ["Lady Bird Lake Trail", "Rainey Street District", "Texas State Capitol"] },
  { id: "h31", name: "Generator Miami", city: "Miami", country: "USA", tier: "budget", tags: ["Beach", "Nightlife"], address: "2340 Collins Ave, Miami Beach, FL 33139", website: "https://staygenerator.com/hostels/miami" , nearby: ["South Beach", "Art Deco Historic District", "Lincoln Road"] },
  { id: "h32", name: "Found Hotel Chicago", city: "Chicago", country: "USA", tier: "budget", tags: ["Historical"], address: "Downtown Chicago, IL", website: "https://www.foundhotels.com/" , nearby: ["Millennium Park", "The Loop", "Art Institute of Chicago"] },

  // More options for cities that only had one hotel on file
  { id: "h33", name: "Rosewood Hong Kong", city: "Hong Kong", country: "China", tier: "luxury", tags: ["Shopping", "Foodie", "Nightlife"], address: "18 Salisbury Rd, Tsim Sha Tsui, Hong Kong", website: "https://www.rosewoodhotels.com/en/hong-kong" , nearby: ["Victoria Harbour", "Avenue of Stars", "K11 MUSEA"] },
  { id: "h34", name: "Hotel Eden", city: "Rome", country: "Italy", tier: "luxury", tags: ["Historical", "Museums", "Foodie"], address: "Via Ludovisi, 49, 00187 Roma RM, Italy", website: "https://www.dorchestercollection.com/rome/hotel-eden/" , nearby: ["Villa Borghese", "Spanish Steps", "Via Veneto"] },
  { id: "h35", name: "Hotel Danieli", city: "Venice", country: "Italy", tier: "luxury", tags: ["Historical", "Museums"], address: "Riva degli Schiavoni, 4196, 30122 Venezia VE, Italy", website: "https://www.marriott.com/en-us/hotels/vcedi-hotel-danieli-a-luxury-collection-hotel-venice/" , nearby: ["St. Mark's Square", "Bridge of Sighs", "Doge's Palace"] },
  { id: "h36", name: "Ventana Big Sur", city: "Big Sur", country: "USA", tier: "luxury", tags: ["Nature"], address: "48123 CA-1, Big Sur, CA 93920", website: "https://www.ventanabigsur.com/" , nearby: ["Point Sur Lighthouse", "Pfeiffer Big Sur State Park", "Big Sur River"] },
  { id: "h37", name: "W Barcelona", city: "Barcelona", country: "Spain", tier: "luxury", tags: ["Beach", "Nightlife"], address: "Plaça Rosa dels Vents, 1, 08039 Barcelona, Spain", website: "https://www.marriott.com/en-us/hotels/bcnwh-w-barcelona/" , nearby: ["Barceloneta Beach", "Port Vell", "La Barceloneta neighborhood"] },
  { id: "h38", name: "Mahekal Beach Resort", city: "Playa del Carmen", country: "Mexico", tier: "moderate", tags: ["Beach", "Nature"], address: "Calle 38 Norte, Playa del Carmen, Mexico", website: "https://www.mahekalbeachresort.com/" , nearby: ["Playa del Carmen 5th Avenue", "Mamitas Beach", "Cozumel ferry pier"] },
  { id: "h39", name: "Palazzo Avino", city: "Ravello", country: "Italy", tier: "luxury", tags: ["Historical", "Beach"], address: "Via San Giovanni del Toro, 28, 84010 Ravello SA, Italy", website: "https://www.palazzoavino.com/" , nearby: ["Villa Cimbrone", "Ravello Cathedral", "Amalfi Coast"] },
  { id: "h40", name: "The Liberty Hotel", city: "Boston", country: "USA", tier: "luxury", tags: ["Historical", "Nightlife"], address: "215 Charles St, Boston, MA 02114", website: "https://www.libertyhotel.com/" , nearby: ["Beacon Hill", "Charles River Esplanade", "Massachusetts General Hospital area"] },
  { id: "h41", name: "Fairmont San Francisco", city: "San Francisco", country: "USA", tier: "luxury", tags: ["Historical", "Shopping"], address: "950 Mason St, San Francisco, CA 94108", website: "https://www.fairmont.com/san-francisco/" , nearby: ["Grace Cathedral", "Lombard Street", "Union Square"] },
  { id: "h42", name: "Hotel Van Zandt", city: "Austin", country: "USA", tier: "moderate", tags: ["Nightlife", "Foodie"], address: "605 Davis St, Austin, TX 78701", website: "https://www.hotelvanzandt.com/" , nearby: ["Rainey Street District", "Lady Bird Lake", "Downtown Austin"] },
  { id: "h43", name: "Fontainebleau Miami Beach", city: "Miami", country: "USA", tier: "luxury", tags: ["Beach", "Nightlife"], address: "4441 Collins Ave, Miami Beach, FL 33140", website: "https://www.fontainebleau.com/" , nearby: ["Mid-Beach", "Collins Avenue", "Faena District"] },
  { id: "h44", name: "Atlantis The Palm", city: "Dubai", country: "UAE", tier: "luxury", tags: ["Beach", "Nightlife"], address: "Crescent Rd, Dubai, UAE", website: "https://www.atlantis.com/dubai" , nearby: ["Palm Jumeirah", "Aquaventure Waterpark", "The Pointe"] },
  { id: "h45", name: "The Fullerton Hotel Singapore", city: "Singapore", country: "Singapore", tier: "luxury", tags: ["Historical", "Shopping"], address: "1 Fullerton Square, Singapore 049178", website: "https://www.fullertonhotels.com/fullerton-hotel-singapore" , nearby: ["Marina Bay", "Merlion Park", "Boat Quay"] },
  { id: "h46", name: "Hotel Boss", city: "Singapore", country: "Singapore", tier: "budget", tags: ["Shopping", "Foodie"], address: "500 Jln Sultan, Singapore", website: "https://www.hotelboss.com.sg/" , nearby: ["Bugis Street Market", "Kampong Glam", "Sultan Mosque"] },
  { id: "h47", name: "Shibuya Granbell Hotel", city: "Tokyo", country: "Japan", tier: "budget", tags: ["Nightlife", "Shopping", "Foodie"], address: "15-17 Sakuragaokacho, Shibuya City, Tokyo, Japan", website: "https://www.granbellhotel.jp/shibuya/" , nearby: ["Shibuya Crossing", "Shibuya Scramble Square", "Meiji Shrine"] },

  // New cities
  { id: "h48", name: "Waldorf Astoria Amsterdam", city: "Amsterdam", country: "Netherlands", tier: "luxury", tags: ["Historical", "Museums", "Shopping"], address: "Herengracht 542-556, 1017 CG Amsterdam, Netherlands", website: "https://www.hilton.com/en/hotels/amswawa-waldorf-astoria-amsterdam/" , nearby: ["Herengracht canal", "Anne Frank House", "Dam Square"] },
  { id: "h49", name: "Generator Amsterdam", city: "Amsterdam", country: "Netherlands", tier: "budget", tags: ["Nightlife", "Foodie"], address: "Mauritskade 57, 1092 AD Amsterdam, Netherlands", website: "https://staygenerator.com/hostels/amsterdam" , nearby: ["Oosterpark", "Tropenmuseum", "Artis Zoo"] },
  { id: "h50", name: "Hotel Adlon Kempinski", city: "Berlin", country: "Germany", tier: "luxury", tags: ["Historical", "Museums", "Shopping"], address: "Unter den Linden 77, 10117 Berlin, Germany", website: "https://www.kempinski.com/en/hotel-adlon" , nearby: ["Brandenburg Gate", "Museum Island", "Pariser Platz"] },
  { id: "h51", name: "25hours Hotel Bikini Berlin", city: "Berlin", country: "Germany", tier: "moderate", tags: ["Shopping", "Nightlife", "Foodie"], address: "Budapester Str. 40, 10787 Berlin, Germany", website: "https://www.25hours-hotels.com/en/hotels/berlin/bikini-berlin" , nearby: ["Berlin Zoo", "Kurfürstendamm", "Kaiser Wilhelm Memorial Church"] },
  { id: "h52", name: "Mandarin Oriental Bangkok", city: "Bangkok", country: "Thailand", tier: "luxury", tags: ["Historical", "Foodie", "Nightlife"], address: "48 Oriental Ave, Bangkok, Thailand", website: "https://www.mandarinoriental.com/bangkok" , nearby: ["Chao Phraya River", "Wat Arun", "Asiatique The Riverfront"] },
  { id: "h53", name: "Lub d Bangkok Silom", city: "Bangkok", country: "Thailand", tier: "budget", tags: ["Nightlife", "Foodie"], address: "4 Decho Rd, Bangkok, Thailand", website: "https://www.lubd.com/" , nearby: ["Patpong Night Market", "Lumpini Park", "Sala Daeng BTS station"] },
  { id: "h54", name: "Park Hyatt Sydney", city: "Sydney", country: "Australia", tier: "luxury", tags: ["Historical", "Beach", "Foodie"], address: "7 Hickson Rd, The Rocks NSW 2000, Australia", website: "https://www.hyatt.com/park-hyatt/en-US/sydph-park-hyatt-sydney" , nearby: ["Sydney Opera House", "Harbour Bridge", "The Rocks Markets"] },
  { id: "h55", name: "Sydney Harbour YHA", city: "Sydney", country: "Australia", tier: "budget", tags: ["Historical", "Beach"], address: "110 Cumberland St, The Rocks NSW 2000, Australia", website: "https://www.yha.com.au/hostels/nsw/sydney-surrounds/sydney-harbour-yha/" , nearby: ["The Rocks", "Circular Quay", "Sydney Observatory Hill"] },
  { id: "h56", name: "Four Seasons Hotel Ritz Lisbon", city: "Lisbon", country: "Portugal", tier: "luxury", tags: ["Historical", "Museums", "Shopping"], address: "Rua Rodrigo da Fonseca 88, 1099-039 Lisboa, Portugal", website: "https://www.fourseasons.com/lisbon/" , nearby: ["Eduardo VII Park", "Gulbenkian Museum", "Avenida da Liberdade"] },
  { id: "h57", name: "Home Lisbon Hostel", city: "Lisbon", country: "Portugal", tier: "budget", tags: ["Historical", "Nightlife", "Foodie"], address: "Rua São Nicolau 13, Lisbon, Portugal", website: "https://www.homelisbonhostel.com/" , nearby: ["Rossio Square", "Santa Justa Lift", "Alfama district"] },
  { id: "h58", name: "Four Seasons Hotel Mexico City", city: "Mexico City", country: "Mexico", tier: "luxury", tags: ["Historical", "Museums", "Shopping"], address: "Paseo de la Reforma 500, Mexico City, Mexico", website: "https://www.fourseasons.com/mexico/" , nearby: ["Chapultepec Park", "Angel of Independence", "Zona Rosa"] },
  { id: "h59", name: "Mundo Joven Catedral", city: "Mexico City", country: "Mexico", tier: "budget", tags: ["Historical", "Nightlife"], address: "República de Guatemala 4, Mexico City, Mexico", website: "https://www.mundojovenhostels.com/" , nearby: ["Zócalo", "Metropolitan Cathedral", "Templo Mayor"] },
  { id: "h60", name: "Bellagio Las Vegas", city: "Las Vegas", country: "USA", tier: "luxury", tags: ["Nightlife", "Shopping", "Foodie"], address: "3600 S Las Vegas Blvd, Las Vegas, NV 89109", website: "https://bellagio.mgmresorts.com/" , nearby: ["Bellagio Fountains", "The Strip", "Caesars Palace"] },
  { id: "h61", name: "The LINQ Hotel", city: "Las Vegas", country: "USA", tier: "moderate", tags: ["Nightlife", "Shopping"], address: "3535 S Las Vegas Blvd, Las Vegas, NV 89109", website: "https://www.caesars.com/linq" , nearby: ["High Roller Observation Wheel", "LINQ Promenade", "Flamingo Las Vegas"] },
  { id: "h62", name: "Four Seasons Hotel Seattle", city: "Seattle", country: "USA", tier: "luxury", tags: ["Historical", "Shopping", "Foodie"], address: "99 Union St, Seattle, WA 98101", website: "https://www.fourseasons.com/seattle/" , nearby: ["Pike Place Market", "Seattle Art Museum", "Puget Sound waterfront"] },
  { id: "h63", name: "Green Tortoise Hostel Seattle", city: "Seattle", country: "USA", tier: "budget", tags: ["Historical", "Nightlife"], address: "105 Pike St, Seattle, WA 98101", website: "https://www.greentortoise.net/seattle" , nearby: ["Pike Place Market", "Seattle Waterfront", "Pioneer Square"] },
];

const TIER_META = {
  budget: { label: "Budget-Friendly", emoji: "💸" },
  moderate: { label: "Moderate", emoji: "🙂" },
  luxury: { label: "Luxurious", emoji: "✨" },
};

// Trip themes for the fit-matching flow: city -> hotel -> theme -> answer.
// `tags`/`tierBoost` drive the fit score against a hotel's own tags/tier;
// `tagReasons` supplies the human-readable explanation for each match.
const THEME_META = {
  romantic: {
    label: "Romantic",
    emoji: "💕",
    blurb: "A getaway built for two",
    tierBoost: ["luxury"],
    tags: ["Beach", "Historical", "Foodie", "Nightlife"],
    tagReasons: {
      Beach: "a scenic beach backdrop for sunset walks",
      Historical: "charming historic streets perfect for romantic strolls",
      Foodie: "acclaimed restaurants nearby for a special dinner",
      Nightlife: "intimate bars and lounges for an evening out",
    },
  },
  family: {
    label: "Family",
    emoji: "👨‍👩‍👧",
    blurb: "Fun and easy for everyone",
    tierBoost: ["moderate", "budget"],
    tags: ["Beach", "Nature", "Museums", "Shopping"],
    tagReasons: {
      Beach: "an easy, safe beach for the kids",
      Nature: "outdoor space for the whole family to explore",
      Museums: "kid-friendly museums and attractions close by",
      Shopping: "family-friendly shopping nearby",
    },
  },
  business: {
    label: "Business",
    emoji: "💼",
    blurb: "Efficient and well-located",
    tierBoost: ["luxury", "moderate"],
    tags: ["Historical", "Shopping", "Foodie", "Nightlife"],
    tagReasons: {
      Historical: "centrally located in the city core",
      Shopping: "close to the main commercial district",
      Foodie: "solid options nearby for client dinners",
      Nightlife: "convenient spots to unwind after meetings",
    },
  },
  adventure: {
    label: "Adventure",
    emoji: "🧗",
    blurb: "Built around getting outside",
    tierBoost: [],
    tags: ["Nature", "Beach"],
    tagReasons: {
      Nature: "easy access to trails and the outdoors",
      Beach: "water sports and beach adventures nearby",
    },
  },
  relaxation: {
    label: "Relaxation",
    emoji: "🧘",
    blurb: "Slow down and unwind",
    tierBoost: ["luxury"],
    tags: ["Beach", "Nature"],
    tagReasons: {
      Beach: "a tranquil beachfront setting to unwind",
      Nature: "peaceful natural surroundings for total relaxation",
    },
  },
};
