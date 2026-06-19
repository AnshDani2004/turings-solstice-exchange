import { MAX_EVENTS, SAVE_KEY, initialState } from "../config/constants.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

function mergeSaved(saved) {
  const base = initialState();
  if (!saved || typeof saved !== "object") return base;
  return {
    ...base,
    ...saved,
    app: base.app,
    progress: { ...base.progress, ...saved.progress },
    settings: { ...base.settings, ...saved.settings },
    session: { ...base.session, events: Array.isArray(saved.session?.events) ? saved.session.events.slice(-MAX_EVENTS) : [] },
    tutorial: { ...base.tutorial, ...saved.tutorial },
    market: { ...base.market, ...saved.market }
  };
}

export function loadState(storage) {
  try {
    return mergeSaved(JSON.parse(storage?.getItem(SAVE_KEY) || "null"));
  } catch {
    return initialState();
  }
}

export function createStore({ storage } = {}) {
  let state = loadState(storage);
  const listeners = new Set();
  const emit = () => listeners.forEach((listener) => listener(state));
  const save = () => {
    try {
      storage?.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable in private contexts; the game remains playable.
    }
  };
  return {
    getState: () => state,
    setState: (updater, { persist = true } = {}) => {
      const candidate = typeof updater === "function" ? updater(clone(state)) : updater;
      state = candidate;
      if (persist) save();
      emit();
      return state;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset: () => {
      state = initialState();
      save();
      emit();
    }
  };
}

export function logEvent(state, type, detail = {}) {
  const event = { type, detail, at: Date.now() };
  return {
    ...state,
    session: {
      ...state.session,
      events: [...(state.session.events || []), event].slice(-MAX_EVENTS)
    }
  };
}
