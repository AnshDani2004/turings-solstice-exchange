import { HALF_SPREADS, PHASES, VOL_MULTIPLIERS, VOL_SIGMAS } from "../config/constants.js";
import { encodeBinary, encodeCaesar } from "../utils/cipher.js";
import { clamp, choose, createRng, randomNormal, round2 } from "../utils/rng.js";

export function phaseFor(round, maxRounds = 8) {
  const position = (round - 1) / Math.max(1, maxRounds - 1);
  return PHASES[Math.min(PHASES.length - 1, Math.floor(position * PHASES.length))];
}

export function generateRegime(random) {
  let volatility = choose(random, ["low", "medium", "high"]);
  let trend = choose(random, [-1, 0, 1]);
  let liquidity = choose(random, ["thin", "normal", "deep"]);
  const eventRoll = random();
  let event = { id: "steady", label: "Clear skies", copy: "The tape is behaving itself. That is not a promise." };
  if (eventRoll < 0.22) {
    volatility = volatility === "low" ? "medium" : "high";
    event = { id: "sun-flare", label: "Sun flare", copy: "A solar burst makes every price tick a little more excitable." };
  } else if (eventRoll < 0.44) {
    liquidity = "thin";
    event = { id: "thin-books", label: "Thin books", copy: "Fewer traders are showing up. Fills may become choosier." };
  } else if (eventRoll < 0.63) {
    trend = trend || choose(random, [-1, 1]);
    event = { id: "late-reversal", label: "Reversal watch", copy: "The early trend looks tired. Expect it to argue with itself later." };
  }
  return {
    volatility,
    volatilitySigma: VOL_SIGMAS[volatility],
    trend,
    liquidity,
    event
  };
}

export function makeSignal(regime, inventory) {
  if (regime.volatility === "high") {
    const decoded = "VOL HIGH · WIDEN";
    return { type: "binary", encoded: encodeBinary(decoded), decoded, recommendation: "wide" };
  }
  if (Math.abs(inventory) >= 4) {
    const decoded = inventory > 0 ? "REDUCE LONG RISK" : "REDUCE SHORT RISK";
    return { type: "logic", encoded: `IF INVENTORY = ${inventory > 0 ? "LONG" : "SHORT"} THEN REDUCE RISK`, decoded, recommendation: "balanced" };
  }
  if (regime.trend > 0) {
    const decoded = "TREND UP";
    return { type: "caesar", encoded: encodeCaesar(decoded), decoded, recommendation: regime.volatility === "low" ? "tight" : "balanced" };
  }
  if (regime.trend < 0) {
    const decoded = "TREND DOWN";
    return { type: "caesar", encoded: encodeCaesar(decoded), decoded, recommendation: regime.volatility === "low" ? "tight" : "balanced" };
  }
  const decoded = "BALANCED MARKET";
  return { type: "logic", encoded: "IF VOL = CALM AND TREND = FLAT THEN SPREAD = ?", decoded, recommendation: regime.volatility === "low" ? "tight" : "balanced" };
}

export function generateQuote({ fairValue, inventory, volatility, spreadMode }) {
  const halfSpread = HALF_SPREADS[spreadMode] * VOL_MULTIPLIERS[volatility];
  const inventorySkew = clamp(inventory * 0.15, -1.5, 1.5);
  return {
    bid: round2(fairValue - halfSpread - inventorySkew),
    ask: round2(fairValue + halfSpread - inventorySkew),
    halfSpread: round2(halfSpread)
  };
}

export function prepareRound(market, seed) {
  const round = market.round + 1;
  const random = createRng(seed + round * 7919);
  const regime = generateRegime(random);
  const fairValue = round2(market.midPrice + regime.trend * 0.55 + randomNormal(random) * 0.24);
  const signal = makeSignal(regime, market.inventory);
  const quote = generateQuote({ ...market, fairValue, ...regime, spreadMode: market.spreadMode });
  return {
    ...market,
    phase: phaseFor(round, market.maxRounds),
    fairValue,
    trend: regime.trend,
    volatility: regime.volatility,
    volatilitySigma: regime.volatilitySigma,
    liquidity: regime.liquidity,
    quote,
    signal,
    currentRegime: regime,
    selectedSpread: null,
    decodeProgress: 0,
    lastRoundSummary: null
  };
}

export function simulateRound(market, spreadMode, seed) {
  const round = market.round + 1;
  const random = createRng(seed + round * 7919 + 37);
  const regime = market.currentRegime || generateRegime(random);
  const quote = generateQuote({ ...market, ...regime, spreadMode });
  let midPrice = market.midPrice;
  let inventory = market.inventory;
  let cash = market.cash;
  const priceHistory = [...market.priceHistory];
  const trades = [];
  const steps = 6;
  const liquidityModifier = { thin: -0.07, normal: 0, deep: 0.07 }[regime.liquidity];

  for (let step = 0; step < steps; step += 1) {
    const flareMultiplier = regime.event?.id === "sun-flare" ? 1.4 : 1;
    const shock = randomNormal(random) * regime.volatilitySigma * 0.25 * flareMultiplier;
    const isReversal = regime.event?.id === "late-reversal" && step >= steps / 2;
    const drift = (isReversal ? -regime.trend : regime.trend) * 0.12;
    midPrice = round2(midPrice + drift + shock);
    priceHistory.push(midPrice);
    const buyInterest = clamp(0.35 + liquidityModifier + regime.trend * 0.08 - Math.max(0, quote.ask - midPrice) * 0.1, 0.05, 0.85);
    const sellInterest = clamp(0.35 + liquidityModifier - regime.trend * 0.08 - Math.max(0, midPrice - quote.bid) * 0.1, 0.05, 0.85);
    if (random() < buyInterest) {
      inventory -= 1;
      cash = round2(cash + quote.ask);
      trades.push({ side: "sell", price: quote.ask, round });
    }
    if (random() < sellInterest) {
      inventory += 1;
      cash = round2(cash - quote.bid);
      trades.push({ side: "buy", price: quote.bid, round });
    }
  }

  const totalPnL = round2(cash + inventory * midPrice);
  const recommendation = market.signal?.recommendation || "balanced";
  const choiceQuality = spreadMode === recommendation ? "well matched" : "less protected";
  const teachingNote = regime.volatility === "high" && spreadMode !== "wide"
    ? "High volatility plus a narrow quote increased your risk."
    : Math.abs(inventory) >= 4
      ? "Inventory is part of the weather now; keep an eye on your exposure."
      : `${spreadMode[0].toUpperCase() + spreadMode.slice(1)} pricing was ${choiceQuality} to this round's signal.`;
  const summary = {
    round,
    phase: market.phase,
    regime,
    spreadMode,
    quote,
    fills: trades.length,
    pnlChange: round2(totalPnL - market.totalPnL),
    totalPnL,
    inventory,
    riskScore: Math.abs(inventory),
    event: regime.event,
    matchedSignal: spreadMode === recommendation,
    teachingNote
  };
  const bestRound = !market.bestRound || summary.pnlChange > market.bestRound.pnlChange ? summary : market.bestRound;

  return {
    ...market,
    round,
    midPrice,
    fairValue: round2(midPrice + regime.trend * 0.2),
    volatility: regime.volatility,
    volatilitySigma: regime.volatilitySigma,
    liquidity: regime.liquidity,
    inventory,
    cash,
    unrealisedPnL: round2(inventory * midPrice),
    totalPnL,
    spreadMode,
    quote,
    priceHistory: priceHistory.slice(-42),
    tradeHistory: [...market.tradeHistory, ...trades].slice(-80),
    roundHistory: [...market.roundHistory, summary],
    currentRegime: null,
    selectedSpread: null,
    lastRoundSummary: summary,
    bestRound
  };
}

export function finalScore(market) {
  const inventoryPenalty = Math.max(0, Math.abs(market.inventory) - 4) * 2;
  return round2(market.totalPnL - inventoryPenalty);
}
