/**
 * Intelligent Category Icon Matcher
 * Automatically detects and recommends the most appropriate emoji icon based on category name keywords.
 */

export function matchCategoryIcon(name: string, fallback = "📁"): string {
  if (!name || !name.trim()) return fallback;
  const n = name.toLowerCase().trim();

  // Beverages & Coffee
  if (/\b(coffee|chai|tea|cafe|starbucks|espresso|latte|cappuccino|mocha|brew)\b/i.test(n)) return "☕";
  if (/\b(pizza)\b/i.test(n)) return "🍕";
  if (/\b(burger|fast food|mcdonald|kfc|wendys|subway)\b/i.test(n)) return "🍔";
  if (/\b(bar|beer|wine|alcohol|cocktail|pub|drinks|liquor|brewery)\b/i.test(n)) return "🍷";
  if (/\b(bakery|cake|pastry|dessert|sweet|sweets|ice cream|donut|chocolate)\b/i.test(n)) return "🍰";
  
  // Food & Dining (User requested perfect match 🍽️)
  if (/\b(grocery|groceries|supermarket|veg|vegetable|vegetables|fruit|fruits|meat|milk|dairy|bazaar|market|ration|zepto|blinkit|instamart)\b/i.test(n)) return "🛒";
  if (/\b(food|dining|dinner|lunch|breakfast|restaurant|swiggy|zomato|meal|meals|snack|snacks|cater|catering|dine|eat|eats)\b/i.test(n)) return "🍽️";

  // Travel & Transport
  if (/\b(flight|airline|airlines|airplane|airport|ticket|tickets|travel|trip|tour|vacation|holiday|visa)\b/i.test(n)) return "✈️";
  if (/\b(hotel|stay|resort|airbnb|lodge|hostel|room stay)\b/i.test(n)) return "🏨";
  if (/\b(train|railway|railways|metro|subway|irctc|tram)\b/i.test(n)) return "🚆";
  if (/\b(bus|transit|public transit)\b/i.test(n)) return "🚌";
  if (/\b(fuel|petrol|diesel|gas|cng|gasoline|refuel|pump)\b/i.test(n)) return "⛽";
  if (/\b(taxi|cab|uber|ola|lyft|auto|rickshaw)\b/i.test(n)) return "🚕";
  if (/\b(car|drive|vehicle|parking|toll|fastag|mechanic|service|repair|car wash)\b/i.test(n)) return "🚗";
  if (/\b(bike|motorcycle|scooter|bicycle|cycle|two wheeler)\b/i.test(n)) return "🛵";

  // Housing & Living
  if (/\b(rent|lease|mortgage|housing|flat|apartment|house|home|room|pg|tenant|society)\b/i.test(n)) return "🏠";
  if (/\b(furniture|decor|furnishing|interior|sofa|bed|mattress|table)\b/i.test(n)) return "🛋️";
  if (/\b(maintenance|repair|plumber|electrician|cleaning|maid|cook|laundry|dry clean|carpenter)\b/i.test(n)) return "🔧";

  // Bills & Utilities
  if (/\b(wifi|internet|broadband|fiber|cable|network)\b/i.test(n)) return "🌐";
  if (/\b(mobile|phone|recharge|cell|telecom|airtel|jio|vodafone)\b/i.test(n)) return "📱";
  if (/\b(electricity|power|light|current|eb bill|bill|bills|utility|utilities|water|gas bill)\b/i.test(n)) return "💡";

  // Shopping & Personal Care
  if (/\b(clothes|clothing|apparel|shirt|pants|dress|shoes|footwear|sneakers|fashion|wear|zara|h&m|myntra)\b/i.test(n)) return "👗";
  if (/\b(shopping|amazon|flipkart|purchase|store|mall|buy|goods|retail)\b/i.test(n)) return "🛍️";
  if (/\b(salon|spa|haircut|barber|beauty|makeup|skincare|cosmetics|grooming|parlour)\b/i.test(n)) return "✂️";
  if (/\b(electronics|gadget|gadgets|laptop|computer|hardware|apple|phone purchase|tv|audio)\b/i.test(n)) return "💻";
  if (/\b(jewelry|jewellery|watch|gold|silver|diamond|accessories)\b/i.test(n)) return "💍";

  // Health & Fitness
  if (/\b(gym|fitness|workout|exercise|trainer|crossfit|cult|weights)\b/i.test(n)) return "🏋️";
  if (/\b(yoga|meditation|pilates)\b/i.test(n)) return "🧘";
  if (/\b(sport|sports|cricket|football|badminton|tennis|swimming)\b/i.test(n)) return "⚽";
  if (/\b(medicine|pharma|pharmacy|drugs|prescription|pills|chemist|apollo|1mg)\b/i.test(n)) return "💊";
  if (/\b(doctor|hospital|clinic|dentist|dental|therapy|physio|medical|health|checkup|lab test)\b/i.test(n)) return "🏥";
  if (/\b(eye|glasses|optician|lens|vision)\b/i.test(n)) return "👓";

  // Entertainment & Leisure
  if (/\b(movie|movies|cinema|film|theatre|theater|popcorn|pvr|inox)\b/i.test(n)) return "🎬";
  if (/\b(netflix|prime|hotstar|disney|hulu|streaming|ott|subscription|subscriptions|youtube)\b/i.test(n)) return "📺";
  if (/\b(music|spotify|apple music|concert|gig|audio|podcast)\b/i.test(n)) return "🎵";
  if (/\b(gaming|games|game|playstation|ps5|xbox|steam|nintendo|pubg)\b/i.test(n)) return "🎮";
  if (/\b(book|books|reading|kindle|novel|comic)\b/i.test(n)) return "📚";
  if (/\b(party|club|nightlife|event|outing|celebration|fun)\b/i.test(n)) return "🎉";

  // Education & Work
  if (/\b(education|school|college|university|tuition|course|udemy|coursera|exam|fees|study|class|learning)\b/i.test(n)) return "🎓";
  if (/\b(office|stationery|printing|notion|saas|software|tools|work|supplies)\b/i.test(n)) return "💼";

  // Finance, Income, Investments
  if (/\b(salary|wages|paycheck|payroll|compensation|stipend|monthly salary)\b/i.test(n)) return "💼";
  if (/\b(bonus|reward|incentive|cashback|prize)\b/i.test(n)) return "🏆";
  if (/\b(freelance|consulting|contract|client|gig|side income|upwork|fiverr|side hustle)\b/i.test(n)) return "💻";
  if (/\b(invest|investment|investments|stock|stocks|mutual fund|sip|equity|shares|dividend|trading|zerodha|groww)\b/i.test(n)) return "📈";
  if (/\b(crypto|bitcoin|btc|eth|ethereum|token)\b/i.test(n)) return "🪙";
  if (/\b(savings|deposit|interest|fixed deposit|fd|rd|bank interest|saving)\b/i.test(n)) return "🏦";
  if (/\b(tax|taxes|income tax|gst|tds|vat|audit|fine|challan|penalty)\b/i.test(n)) return "🧾";
  if (/\b(insurance|lic|term|policy|mediclaim|vehicle insurance)\b/i.test(n)) return "🛡️";
  if (/\b(loan|emi|debt|credit card payment|borrow|lending)\b/i.test(n)) return "💳";
  if (/\b(cash|atm|withdrawal|hand cash)\b/i.test(n)) return "💵";

  // Family, Pets & Others
  if (/\b(pet|pets|dog|cat|vet|veterinary|puppy|kitten|pedigree|animal)\b/i.test(n)) return "🐾";
  if (/\b(baby|kid|kids|child|children|diapers|toys|toy|daycare)\b/i.test(n)) return "👶";
  if (/\b(gift|gifts|present|donation|charity|ngo|zakat|offering|help|contribution)\b/i.test(n)) return "🎁";

  return fallback;
}

export const POPULAR_CATEGORY_ICONS = [
  "🍽️", "🛒", "☕", "🍕", "🍔", "🍰", "🍷",
  "🚗", "✈️", "🚕", "🚆", "🚌", "⛽", "🛵", "🏨",
  "🏠", "🛋️", "🔧", "💡", "🌐", "📱",
  "🛍️", "👗", "💻", "✂️", "💍",
  "🏥", "💊", "🏋️", "🧘", "⚽", "👓",
  "🎬", "📺", "🎵", "🎮", "📚", "🎉",
  "💼", "📈", "🏦", "💰", "💵", "💳", "🪙", "🧾", "🛡️", "🏆",
  "🐾", "👶", "🎁", "📁", "⭐"
];
