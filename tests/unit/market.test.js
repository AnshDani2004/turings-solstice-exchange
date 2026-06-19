import { describe, expect, it } from "vitest";
import { initialState } from "../../src/config/constants.js";
import { generateQuote, prepareRound, simulateRound } from "../../src/market/engine.js";

describe("market engine", () => {
  it("creates a valid two-sided quote and skews heavy long inventory down", () => {
    const neutral = generateQuote({ fairValue: 100, inventory: 0, volatility: "medium", spreadMode: "balanced" });
    const long = generateQuote({ fairValue: 100, inventory: 7, volatility: "medium", spreadMode: "balanced" });
    expect(neutral.bid).toBeLessThan(neutral.ask);
    expect(long.bid).toBeLessThan(neutral.bid);
    expect(long.ask).toBeLessThan(neutral.ask);
  });

  it("is deterministic for a seed", () => {
    const market = initialState().market;
    const preparedA = prepareRound(market, 4242);
    const preparedB = prepareRound(market, 4242);
    expect(preparedA).toEqual(preparedB);
    expect(simulateRound(preparedA, "balanced", 4242)).toEqual(simulateRound(preparedB, "balanced", 4242));
  });

  it("marks PnL from cash and inventory", () => {
    const market = { ...initialState().market, midPrice: 100, cash: -500, inventory: 5, currentRegime: { volatility: "low", volatilitySigma: 0, trend: 0, liquidity: "normal" } };
    const result = simulateRound(market, "wide", 77);
    expect(result.totalPnL).toBeCloseTo(result.cash + result.inventory * result.midPrice, 2);
  });
});
