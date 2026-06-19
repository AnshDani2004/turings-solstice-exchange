import { describe, expect, it } from "vitest";
import { GLOSSARY, initialState } from "../../src/config/constants.js";
import { lessons } from "../../src/tutorial/lessons.js";

describe("tutorial progression contract", () => {
  it("gives each lesson a selectable correct response", () => {
    for (const lesson of lessons) {
      expect(lesson.choices).toContain(lesson.correct);
      expect(lesson.termIds.length).toBeGreaterThan(0);
    }
  });

  it("covers every required beginner term and unlocks the market after lesson five", () => {
    let state = initialState();
    for (const lesson of lessons) {
      state = {
        ...state,
        progress: {
          ...state.progress,
          completedLessons: [...state.progress.completedLessons, lesson.id],
          glossaryUnlocked: [...state.progress.glossaryUnlocked, ...lesson.termIds]
        }
      };
    }
    state.progress.marketUnlocked = state.progress.completedLessons.length === lessons.length;
    expect(state.progress.marketUnlocked).toBe(true);
    expect(state.progress.glossaryUnlocked.map((term) => GLOSSARY[term].term)).toEqual([
      "Fair Value", "Bid", "Ask", "Spread", "Volatility", "Inventory", "PnL"
    ]);
  });
});
