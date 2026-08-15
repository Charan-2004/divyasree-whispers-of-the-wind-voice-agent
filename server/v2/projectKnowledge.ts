/**
 * Whispers of the Wind (WOW) - Structured Project Knowledge Base & FAQ Retrieval Layer
 * High-authority verified project facts based strictly on official assignment specifications.
 */

export interface ProjectFactCategory {
  category: string;
  facts: Record<string, string>;
}

export const PROJECT_KNOWLEDGE_BASE = {
  developer: {
    name: "Divyasree Developers",
    heritage: "Over 30 years of premier real estate excellence across Bengaluru, Hyderabad, and Chennai.",
    reputation: "Known for high-end commercial hubs (technoparks) and bespoke luxury residential communities."
  },
  project: {
    name: "Whispers of the Wind",
    code: "WOW",
    type: "Ultra-luxury masterplanned plotted villa community",
    total_area: "38-acre secluded private valley development",
    open_space_percentage: "74% dedicated to open landscapes, greenery, and nature trails",
    topography: "Unique private valley topography enveloped by scenic hill panoramas at the foothills of Nandi Hills."
  },
  location: {
    corridor: "North Bengaluru Airport Corridor / Nandi Valley",
    landmark: "Foot of Nandi Hills, adjacent to Devanahalli - Heggadihalli road",
    distance_to_airport: "Approximately 20 minutes from Kempegowda International Airport (BLR)",
    drive_time_central_blr: "Around 50 to 60 minutes from Central Bengaluru via Bellary Road expressway"
  },
  product: {
    plot_sizes: "1,200 sq.ft. (compact luxury) up to 3,199 sq.ft. (estate plots)",
    customization: "Buyer can build bespoke villa adhering to sustainable valley architectural guidelines",
    infrastructure: "Underground cabling, paved internal avenues, storm water drainage, solar lighting."
  },
  pricing: {
    starting_price: "₹92.4 Lakh inclusive of taxes",
    max_price: "₹2.46 Crore inclusive of taxes",
    price_per_sqft_range: "Around ₹7,700 per sq.ft.",
    booking_structure: "Flexible installment plan tied to development milestones; assistance from leading banks."
  },
  amenities: {
    clubhouse_size: "20,000 square feet world-class signature clubhouse",
    clubhouse_facilities: "Infinity-edge pool, gymnasium, spa/wellness salon, badminton & tennis courts, indoor games lounge, private dining banquet",
    outdoor_features: "74% open greenery, organic farming zones, fruit orchards, reflexology trails, meditation decks, children's adventure park, cycling tracks."
  },
  timeline_and_legal: {
    possession_date: "December 2029 (ongoing phased masterplan)",
    project_status: "Ongoing active land and infrastructure development",
    approvals: "Fully compliant with planning authorities and RERA guidelines."
  },
  investment_rationale: {
    growth_drivers: "North Bengaluru is Karnataka's prime growth hub with IT investment regions (KIADB Aerospace, Hardware Park, BIAL ITIR).",
    appreciation_outlook: "Plotted land assets in branded gated communities historically offer superior compounding appreciation.",
    rental_or_stay: "High demand for weekend luxury homestays and vacation villas near Nandi Hills."
  }
};

/**
 * Direct FAQ database for instant high-confidence answering
 */
export const PROJECT_FAQS = [
  {
    keywords: ['price', 'cost', 'costing', 'rate', 'starting', 'expensive', 'budget', 'kitna', 'price list', 'how much'],
    answer: "Our private villa plots start at ₹92.4 lakh and range up to ₹2.46 crore inclusive of taxes, depending on plot size from 1,200 to 3,199 square feet."
  },
  {
    keywords: ['location', 'where', 'distance', 'airport', 'far', 'nandi', 'kahan', 'situated'],
    answer: "Whispers of the Wind is nestled in Nandi Valley, right near Nandi Hills in North Bangalore, about 20 minutes from Bangalore International Airport."
  },
  {
    keywords: ['clubhouse', 'amenity', 'amenities', 'pool', 'gym', 'sports', 'facilities'],
    answer: "The community features a grand 20,000 square foot luxury clubhouse with an infinity pool, sports courts, wellness spa, alongside organic farming zones and nature trails across 74% open greenery."
  },
  {
    keywords: ['possession', 'ready to move', 'when', 'timeline', 'completion', 'date', 'ready'],
    answer: "Scheduled possession is in December 2029 as part of our phased masterplan, with on-ground infrastructure and landscaping currently progressing."
  },
  {
    keywords: ['size', 'sizes', 'dimension', 'dimensions', 'area', 'plot size', 'sqft', 'sq ft', 'square feet'],
    answer: "Plot sizes range from 1,200 square feet up to 3,199 square feet, giving you ample space to build a custom private family villa."
  },
  {
    keywords: ['developer', 'builder', 'company', 'divyasree', 'about builder'],
    answer: "Whispers of the Wind is developed by Divyasree Developers, who bring over 30 years of premier institutional real estate heritage across South India."
  },
  {
    keywords: ['roi', 'returns', 'yield', 'capital appreciation', 'what is the return', 'growth rate'],
    answer: "Positioned in the booming North Bangalore airport corridor near KIADB tech parks, plotted land in this private valley offers strong long-term capital appreciation."
  },
  {
    keywords: ['who gave', 'how did you get', 'where did you get', 'got my number', 'gave you my number', 'get my number', 'kahan se', 'kisne diya', 'source', 'reference', 'number first'],
    answer: "I apologize for any surprise — your contact was shared with us through our premium property partner network for real estate inquiries in Bangalore. May I take just one minute to introduce Whispers of the Wind, or would you prefer I not disturb you?"
  }
];

/**
 * Searches and retrieves the best matching verified FAQ answer (only for actual inquiries)
 */
export function queryProjectFAQ(query: string): string | null {
  const lower = query.toLowerCase().trim();
  
  // Guard: Pure answers to qualification questions should never be treated as FAQ lookups
  if (
    lower === 'investment' || 
    lower === 'long term investment' || 
    lower === 'you long term investment' || 
    lower === 'weekend' || 
    lower === 'self use' || 
    lower === 'weekend retreat' || 
    lower === 'both' ||
    lower === 'yes' ||
    lower === 'no' ||
    lower === 'yes i do' ||
    lower === 'yes i am'
  ) {
    return null;
  }

  const isQuestion = 
    lower.includes('what') || 
    lower.includes('where') || 
    lower.includes('how') || 
    lower.includes('who') || 
    lower.includes('when') || 
    lower.includes('why') || 
    lower.includes('which') || 
    lower.includes('is there') || 
    lower.includes('do you have') || 
    lower.includes('tell me about') || 
    lower.includes('explain') || 
    lower.includes('details') || 
    lower.includes('got my number') || 
    lower.includes('get my number') || 
    lower.includes('roi') || 
    lower.includes('returns') ||
    lower.endsWith('?');

  if (!isQuestion) return null;

  for (const faq of PROJECT_FAQS) {
    if (faq.keywords.some(k => lower.includes(k))) {
      return faq.answer;
    }
  }
  return null;
}
