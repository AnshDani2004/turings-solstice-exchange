import { describe, expect, it } from "vitest";
import { SAVE_KEY } from "../../src/config/constants.js";
import { createStore, loadState } from "../../src/state/store.js";

function memoryStorage() {
  const contents = new Map();
  return { getItem: (key) => contents.get(key) || null, setItem: (key, value) => contents.set(key, value) };
}

describe("saved game state", () => {
  it("starts with the first lesson unlocked", () => {
    const state = loadState(memoryStorage());
    expect(state.progress.unlockedLessons).toEqual([1]);
    expect(state.market.maxRounds).toBe(8);
  });

  it("persists player preferences", () => {
    const storage = memoryStorage();
    const first = createStore({ storage });
    first.setState((state) => ({ ...state, settings: { ...state.settings, highContrast: true } }));
    expect(JSON.parse(storage.getItem(SAVE_KEY)).settings.highContrast).toBe(true);
    expect(createStore({ storage }).getState().settings.highContrast).toBe(true);
  });
});
