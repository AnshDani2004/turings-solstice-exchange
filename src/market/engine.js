import { HALF_SPREADS, PHASES, VOL_MULTIPLIERS, VOL_SIGMAS } from "../config/constants.js";
import { encodeBinary, encodeCaesar } from "../utils/cipher.js";
import { clamp, choose, createRng, randomNormal, round2 } from "../utils/rng.js";

export const RIVALS = [
  { id: "blaze", name: "Blaze", role: "Momentum chaser", copy: "Chases a moving tape and makes trends louder.", accent: "coral" },
  { id: "mara", name: "Mara", role: "Patient value trader", copy: "Waits for a quote that looks too generous to ignore.", accent: "gold" },
  { id: "cipher", name: "Cipher", role: "Unknown bot", copy: "Its logic is hidden somewhere in the tape.", accent: "mint" }
];

export function phaseFor(round, maxRounds = 8) {
  const position = (round - 1) / Math.max(1, maxRounds - 1);
  return PHASES[Math.min(PHASES.length - 1, Math.floor(position * PHASES.length))];
}

export function generateRegime(random) {
  let volatility = choose(random, ["low", "medium", "high"]);
  let trend = choose(random, [-1, 0, 1]);
  let liquidity = choose(random, ["thin", "normal", "deep"]);
  const eventRoll = random();
  let event = { id: "steady", label: "Clear skies", copy: "The tape is behaving itself. That is not a promise.", choices: [], recommendation: null };
  if (eventRoll < 0.22) {
    volatility = volatility === "low" ? "medium" : "high";
    event = {
      id: "sun-flare", label: "Sun flare", copy: "A solar burst makes every price tick a little more excitable.", recommendation: "widen",
      choices: [{ id: "widen", label: "Widen immediately", note: "Put distance between you and the flare." }, { id: "hold", label: "Hold the quote", note: "Chase fills through the turbulence." }]
    };
  } else if (eventRoll < 0.44) {
    liquidity = "thin";
    event = {
      id: "thin-books", label: "Thin books", copy: "Fewer traders are showing up. Fills may become choosier.", recommendation: "wait",
      choices: [{ id: "lean", label: "Lean in for fills", note: "Make a friendlier quote and tempt the thin crowd." }, { id: "wait", label: "Stay patient", note: "Protect the book until depth returns." }]
    };
  } else if (eventRoll < 0.63) {
    trend = trend || choose(random, [-1, 1]);
    event = {
      id: "late-reversal", label: "Reversal watch", copy: "The early trend looks tired. Expect it to argue with itself later.", recommendation: "fade",
      choices: [{ id: "fade", label: "Fade the trend", note: "Prepare for the tape to turn back." }, { id: "follow", label: "Follow the trend", note: "Trust the move to keep running." }]
    };
  }
  return {
    volatility,
    volatilitySigma: VOL_SIGMAS[volatility],
    trend,
    liquidity,
    event,
    rival: choose(random, RIVALS)
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
    decodeMethod: null,
    decodeAttempted: false,
    eventDecision: null,
    lastRoundSummary: null
  };
}

export function simulateRound(market, spreadMode, seed) {
  const round = market.round + 1;
  const random = createRng(seed + round * 7919 + 37);
  const sourceRegime = market.currentRegime || generateRegime(random);
  const legacyRecommendations = { "sun-flare": "widen", "thin-books": "wait", "late-reversal": "fade" };
  const regime = {
    ...sourceRegime,
    event: {
      ...sourceRegime.event,
      recommendation: sourceRegime.event?.recommendation || legacyRecommendations[sourceRegime.event?.id] || null
    }
  };
  const quote = generateQuote({ ...market, ...regime, spreadMode });
  let midPrice = market.midPrice;
  let inventory = market.inventory;
  let cash = market.cash;
  const priceHistory = [...market.priceHistory];
  const trades = [];
  const steps = 6;
  const liquidityModifier = { thin: -0.07, normal: 0, deep: 0.07 }[regime.liquidity];
  const rival = regime.rival || RIVALS[0];

  for (let step = 0; step < steps; step += 1) {
    const flareMultiplier = regime.event?.id === "sun-flare" ? 1.4 : 1;
    const shock = randomNormal(random) * regime.volatilitySigma * 0.25 * flareMultiplier;
    const isReversal = regime.event?.id === "late-reversal" && step >= steps / 2;
    const drift = (isReversal ? -regime.trend : regime.trend) * 0.12;
    midPrice = round2(midPrice + drift + shock);
    priceHistory.push(midPrice);
    const cipherBias = rival.id === "cipher" ? (random() - 0.5) * 0.16 : 0;
    const momentumBias = rival.id === "blaze" ? regime.trend * 0.1 : 0;
    const valueBuyBias = rival.id === "mara" ? Math.max(0, market.fairValue - quote.ask) * 0.12 : 0;
    const valueSellBias = rival.id === "mara" ? Math.max(0, quote.bid - market.fairValue) * 0.12 : 0;
    const buyInterest = clamp(0.35 + liquidityModifier + regime.trend * 0.08 + momentumBias + cipherBias + valueBuyBias - Math.max(0, quote.ask - midPrice) * 0.1, 0.05, 0.85);
    const sellInterest = clamp(0.35 + liquidityModifier - regime.trend * 0.08 - momentumBias - cipherBias + valueSellBias - Math.max(0, midPrice - quote.bid) * 0.1, 0.05, 0.85);
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
  const matchedSignal = spreadMode === recommendation;
  const choiceQuality = matchedSignal ? "well matched" : "less protected";
  const nextStreak = matchedSignal ? (market.streak || 0) + 1 : 0;
  const comboBonus = matchedSignal ? round2(nextStreak * 0.5) : 0;
  const manualDecodeBonus = market.decodeMethod === "manual" ? 1 : 0;
  const decodePenalty = market.decodeAttempted && !market.decoded ? -1.5 : !market.decoded ? -0.5 : 0;
  const eventMatched = regime.event?.id === "steady" ? null : market.eventDecision === regime.event?.recommendation;
  const eventScore = eventMatched === null ? 0 : eventMatched ? 0.75 : market.eventDecision ? -0.75 : 0;
  const roundScoreBonus = round2(comboBonus + manualDecodeBonus + decodePenalty + eventScore);
  const pnlChange = round2(totalPnL - market.totalPnL);
  const isSunsetAuction = round === market.maxRounds;
  const auctionBonus = isSunsetAuction ? pnlChange : 0;
  const scoreBonus = round2((market.scoreBonus || 0) + roundScoreBonus);
  const totalAuctionBonus = round2((market.auctionBonus || 0) + auctionBonus);
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
    pnlChange,
    totalPnL,
    inventory,
    riskScore: Math.abs(inventory),
    event: regime.event,
    rival,
    matchedSignal,
    eventDecision: market.eventDecision,
    eventMatched,
    decodeMethod: market.decodeMethod,
    comboBonus,
    roundScoreBonus,
    auctionBonus,
    isSunsetAuction,
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
    scoreBonus,
    auctionBonus: totalAuctionBonus,
    streak: nextStreak,
    maxStreak: Math.max(market.maxStreak || 0, nextStreak),
    manualDecodes: (market.manualDecodes || 0) + (market.decodeMethod === "manual" ? 1 : 0),
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
  return round2(market.totalPnL + (market.scoreBonus || 0) + (market.auctionBonus || 0) - inventoryPenalty);
}
