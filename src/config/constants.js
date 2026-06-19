export const SAVE_KEY = "turings-solstice-exchange:v1";
export const MAX_EVENTS = 160;

export const PHASES = ["Dawn", "Morning", "Noon", "Golden Hour", "Sunset"];
export const HALF_SPREADS = { tight: 0.6, balanced: 1.1, wide: 1.9 };
export const VOL_MULTIPLIERS = { low: 0.9, medium: 1, high: 1.2 };
export const VOL_SIGMAS = { low: 0.4, medium: 0.8, high: 1.3 };

export const GLOSSARY = {
  "fair-value": {
    term: "Fair Value",
    definition: "Your best estimate of a reasonable price right now. It is an anchor, not a prophecy."
  },
  bid: {
    term: "Bid",
    definition: "The price you are willing to buy at."
  },
  ask: {
    term: "Ask",
    definition: "The price you are willing to sell at."
  },
  spread: {
    term: "Spread",
    definition: "The gap between the bid and ask. A wider gap gives more protection but can attract fewer trades."
  },
  volatility: {
    term: "Volatility",
    definition: "How much prices move around. More movement usually calls for more care."
  },
  inventory: {
    term: "Inventory",
    definition: "What you currently hold. A large position means more exposure to price moves."
  },
  pnl: {
    term: "PnL",
    definition: "Profit and Loss: the cash you made or spent plus what your inventory is worth now."
  }
};

export const initialState = () => ({
  app: { route: "home", error: null },
  progress: {
    completedLessons: [],
    unlockedLessons: [1],
    marketUnlocked: false,
    glossaryUnlocked: [],
    achievements: [],
    unlockedSkins: ["midnight"]
  },
  settings: {
    soundOn: true,
    musicOn: false,
    reducedMotion: false,
    highContrast: false,
    fontScale: 1,
    showCaptions: true,
    terminalSkin: "midnight"
  },
  session: { sessionId: "", seed: 0, startedAt: 0, events: [] },
  tutorial: { currentLesson: 1, attempts: 0, lessonState: {} },
  market: {
    round: 0,
    maxRounds: 8,
    phase: "Dawn",
    timeLeftSeconds: 480,
    midPrice: 100,
    fairValue: 100,
    trend: 0,
    volatility: "low",
    volatilitySigma: 0.4,
    liquidity: "normal",
    inventory: 0,
    cash: 0,
    realisedPnL: 0,
    unrealisedPnL: 0,
    totalPnL: 0,
    scoreBonus: 0,
    auctionBonus: 0,
    dailyTarget: 8,
    streak: 0,
    maxStreak: 0,
    manualDecodes: 0,
    spreadMode: "balanced",
    quote: { bid: 98.9, ask: 101.1 },
    signal: { type: "logic", encoded: "", decoded: "" },
    priceHistory: [100],
    tradeHistory: [],
    roundHistory: [],
    currentRegime: null,
    selectedSpread: null,
    decodeProgress: 0,
    decodeMethod: null,
    decodeAttempted: false,
    eventDecision: null,
    lastRoundSummary: null,
    bestRound: null
  }
});
