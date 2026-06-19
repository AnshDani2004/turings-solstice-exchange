import { describe, expect, it } from "vitest";
import { initialState } from "../../src/config/constants.js";
import { finalScore, prepareRound, simulateRound } from "../../src/market/engine.js";

describe("eight-round market run", () => {
  it("reaches sunset without losing deterministic accounting", () => {
    let market = initialState().market;
    const seed = 20260621;
    for (let round = 1; round <= market.maxRounds; round += 1) {
      market = prepareRound(market, seed);
      market = simulateRound(market, round % 3 === 0 ? "wide" : "balanced", seed);
      expect(market.round).toBe(round);
      expect(market.lastRoundSummary.round).toBe(round);
      expect(market.lastRoundSummary.event).toHaveProperty("id");
      expect(market.lastRoundSummary.rival).toHaveProperty("name");
      expect(market.roundHistory).toHaveLength(round);
      expect(Number.isFinite(market.totalPnL)).toBe(true);
    }
    expect(Number.isFinite(finalScore(market))).toBe(true);
    expect(market.priceHistory.length).toBeGreaterThan(8);
  });
});
