export const StaticHintProvider = {
  lesson(lesson, count = 0) {
    return lesson.hints[Math.min(count, lesson.hints.length - 1)];
  },
  market(regime, inventory) {
    if (Math.abs(inventory) >= 4) return "Your inventory is getting loud. Quotes naturally skew to encourage the other side of the trade.";
    if (regime.volatility === "high") return "Fast prices reward a little personal space. Compare the protection offered by each spread.";
    if (regime.trend > 0) return "The trend is rising. Think about which side is more likely to trade with you.";
    if (regime.volatility === "low") return "A quiet market can reward a friendlier quote, provided your inventory is comfortable.";
    return "Read the tape, then choose the spread that fits the risk instead of the one that merely looks heroic.";
  }
};

// Kept deliberately inert for a public static build. A server-side proxy can implement this contract later.
export const GeminiHintProvider = {
  enabled: false,
  async hint() {
    throw new Error("Live Gemini hints require a secured proxy and are disabled in this build.");
  }
};
