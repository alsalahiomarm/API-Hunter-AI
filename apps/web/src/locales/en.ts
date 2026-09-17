export default {
  nav: {
    brand: 'API <span class="text-primary">Hunter</span><span class="ml-1 text-accent">AI</span>',
    channel: "Channel",
    bot: "Bot",
  },
  hero: {
    badge: "Hunting agent running 24/7",
    title: 'Hunt <span class="text-primary">free API keys</span><br><span class="text-accent">real</span> & updated Free Tier plans',
    description:
      "An AI agent scans GitHub repos, forums, and developer blogs daily — analyzes data, verifies links, and publishes them here and on Telegram the moment they're found.",
    joinChannel: "Join Telegram Channel",
    tryBot: "Try the Bot",
    stats: {
      total: "Service Found",
      freeTier: "Fully Free",
      freeCredit: "Free Credit",
      providers: "Provider",
    },
  },
  dashboard: {
    title: "Open Services Inventory",
    subtitle: "Live list pulled directly from the agent database — hit refresh anytime.",
    counter: "Service(s) shown",
    loading: "Loading...",
    unknownError: "Unknown error",
    fetchError: "Failed to fetch data",
  },
  filter: {
    search: "Search by service or company... e.g. Gemini, Tavily, Groq",
    clearSearch: "Clear search",
    category: "Category:",
    all: "All",
    status: "Status:",
    allStatus: "All Statuses",
  },
  table: {
    service: "Service",
    category: "Category",
    freePlan: "Free Plan",
    status: "Status",
    codeExample: "Code Example",
    actions: "Actions",
    activateNow: "Activate Now",
    documentation: "Documentation",
  },
  card: {
    activateNow: "Activate Now",
    documentation: "Documentation",
  },
  empty: {
    title: "No matching results",
    description:
      "Try changing search terms or removing filters, or check back later — the agent is constantly hunting for new services.",
  },
  footer: {
    ctaTitle: "Never miss a new free key",
    ctaDescription:
      "The agent publishes new discoveries on the channel instantly, and the bot answers your questions in private chat.",
    channel: "Channel",
    bot: "Bot",
    brand: "API Hunter AI",
    disclaimer:
      "Educational tool - always verify terms of service and provider pricing",
  },
  copy: {
    copy: "Copy",
    copied: "Copied",
  },
  code: {
    python: "Python",
    javascript: "JavaScript",
    bash: "Bash (cURL)",
    text: "Tech",
    noCode: "# No code example available",
  },
  searchResults: {
    title: "Search results for:",
    latest: "Latest catches from the hunter",
    noResults: '😔 No results matching "',
    tryAnother:
      'Try a different query, e.g. "search API key" or "AI model" or "database"',
    clickButton:
      "Click a button to go directly, or type another request differently.",
  },
  greeting: {
    title: "Welcome!",
    subtitle: "I'm the free API key hunter 🪤",
    instructions: "Tell me what you need in Arabic or English, like:",
    examples:
      '"search API key" · "AI model" · "image generation" · "database"',
    selectCategory: "Or pick a category from the buttons 👇",
  },
  help: {
    title: "🪤 Key Hunter - Available Commands:",
    start: "▪️ /start - Welcome message",
    latest: "▪️ /latest - Latest 3 discovered services",
    search: "▪️ /search <keyword> - Direct search",
    categories: "▪️ /categories - Browse by category",
    naturalLanguage: "Or just write your request in natural language, e.g.:",
    example1: '"I want a free API key for internet search"',
    example2: '"Give me the best key for Gemini model"',
  },
  blockedNote: {
    title:
      "💡 Some search services are blocked in certain countries — here are alternatives that work from their servers:",
    ddg: "• DuckDuckGo Instant Answer — no key required at all",
    googleCSE: "• Google Programmable Search — 100 queries/day",
    firecrawl: "• Firecrawl Search — search & crawl from their servers",
    wikimedia:
      "• Wikimedia · Openverse · Internet Archive — data & media no key needed",
  },
  dataModeNote:
    "⚠️ <i>Database is being synced — these are results from demo data.</i>",
  categories: {
    AI_MODELS: "AI Models",
    SEARCH_TOOLS: "Search Tools",
    AUDIO_IMAGE: "Audio & Image",
    DATABASES: "Databases",
    DEV_TOOLS: "Dev Tools",
    OTHER: "Other",
  },
  status: {
    FREE_TIER: "Fully Free",
    FREE_CREDIT: "Free Credit",
    TRIAL: "Trial",
    PENDING: "Verifying",
    VERIFIED: "Verified",
    FAILED: "Failed",
  },
} as const;
