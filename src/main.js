import "./styles.css";
import { GLOSSARY, initialState } from "./config/constants.js";
import { playTone } from "./audio/sound.js";
import { StaticHintProvider } from "./ai/hints.js";
import { finalScore, generateQuote, prepareRound, simulateRound } from "./market/engine.js";
import { lessonFor, lessons } from "./tutorial/lessons.js";
import { logEvent, createStore } from "./state/store.js";
import { clamp } from "./utils/rng.js";

const app = document.querySelector("#app");
const store = createStore({ storage: window.localStorage });
let hasRendered = false;

const money = (value) => {
  const formatted = Math.abs(value).toFixed(2);
  return `${value >= 0 ? "+" : "−"}$${formatted}`;
};
const sign = (value) => (value > 0 ? "+" : value < 0 ? "−" : "±");
const prettyTrend = (value) => ({ "-1": "Down", 0: "Flat", 1: "Up" }[value] || "Flat");
const cap = (value) => value[0].toUpperCase() + value.slice(1);
const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

function addNotice(state, notice) {
  return { ...state, app: { ...state.app, notice } };
}

function update(transform, options) {
  store.setState((state) => transform(state), options);
}

function updateWithEvent(type, detail, transform) {
  update((state) => logEvent(transform(state), type, detail));
}

function sessionize(state) {
  if (state.session.sessionId) return state;
  const now = Date.now();
  const started = {
    ...state,
    session: {
      ...state.session,
      sessionId: `solstice-${now.toString(36)}`,
      seed: now % 2147483647,
      startedAt: now
    }
  };
  return logEvent(started, "session_start");
}

function shell(state, content, isInitialRender) {
  const progress = state.progress.completedLessons.length;
  const marketReady = state.progress.marketUnlocked;
  const classes = [
    "app-shell",
    isInitialRender ? "page-enter" : "",
    `skin-${state.settings.terminalSkin || "midnight"}`,
    state.settings.highContrast ? "high-contrast" : "",
    state.settings.reducedMotion ? "reduce-motion" : ""
  ].filter(Boolean).join(" ");
  return `
    <div class="${classes}" style="--font-scale:${state.settings.fontScale}">
      <header class="topbar">
        <button class="brand" data-action="home" aria-label="Return home">
          <span class="brand-mark" aria-hidden="true">☼</span>
          <span><strong>Turing's</strong><small>Solstice Exchange</small></span>
        </button>
        <div class="top-status" aria-label="Game progress"><span>${progress}/5 lessons</span><span class="status-dot ${marketReady ? "ready" : ""}"></span><span>${marketReady ? "market open" : "training"}</span></div>
        <nav aria-label="Game utilities" class="utility-nav">
          <button class="icon-button" data-action="glossary" aria-label="Open glossary" title="Glossary">▤</button>
          <button class="icon-button" data-action="settings" aria-label="Open settings" title="Settings">⚙</button>
        </nav>
      </header>
      <main id="main-content" tabindex="-1">${content}</main>
      <div class="sr-only" aria-live="polite" aria-atomic="true">${escapeHtml(state.app.notice || "")}</div>
    </div>`;
}

function homeView(state) {
  const completed = state.progress.completedLessons.length;
  const next = lessons.find((lesson) => !state.progress.completedLessons.includes(lesson.id)) || lessons[0];
  const lessonCards = lessons.map((lesson) => {
    const done = state.progress.completedLessons.includes(lesson.id);
    const available = state.progress.unlockedLessons.includes(lesson.id) || done;
    return `<li class="lesson-dot ${done ? "complete" : ""} ${available ? "available" : "locked"}">
      <button data-action="open-lesson" data-lesson="${lesson.id}" ${available ? "" : "disabled"} aria-label="${done ? "Replay" : "Start"} lesson ${lesson.id}: ${lesson.title}">
        <span>${done ? "✓" : available ? lesson.id : "◆"}</span><small>${lesson.title}</small>
      </button>
    </li>`;
  }).join("");
  return `
    <section class="hero panel-grid">
      <div class="hero-copy">
        <p class="eyebrow">A very long day at a very small exchange</p>
        <h1>Learn to quote before the sun sets.</h1>
        <p class="lede">Turing's machine will train you in fair value, spreads, risk, inventory, and PnL—then hand you the market for eight bright rounds.</p>
        <div class="action-row">
          <button class="button button-primary" data-action="open-lesson" data-lesson="${next.id}">${completed ? `Continue: ${next.title}` : "Begin training"} <span aria-hidden="true">→</span></button>
          <button class="button button-ghost" data-action="show-how">How it works</button>
        </div>
        <p class="microcopy">Keyboard-friendly · saves on this device · no finance background required</p>
      </div>
      <div class="sun-terminal" aria-label="A stylised sun above a market terminal">
        <div class="terminal-lines"><span>READY: TRAINEE_01</span><span>MARKET: ${state.progress.marketUnlocked ? "OPEN" : "LOCKED"}</span><span>DAYLIGHT: 08 ROUNDS</span></div>
        <div class="sun-orb" aria-hidden="true"></div>
        <div class="horizon" aria-hidden="true"></div>
      </div>
    </section>
    <section class="home-grid">
      <article class="card training-card">
        <div class="section-heading"><div><p class="eyebrow">Training tape</p><h2>Five tiny lessons</h2></div><span class="chip">${completed}/5</span></div>
        <ol class="lesson-path">${lessonCards}</ol>
        <p class="subtle">Experience first, explanation second. Turing was fussy about that.</p>
      </article>
      <article class="card market-teaser ${state.progress.marketUnlocked ? "unlocked" : ""}">
        <div class="section-heading"><div><p class="eyebrow">The longest trading day</p><h2>Solstice Market Maker</h2></div><span class="chip ${state.progress.marketUnlocked ? "mint" : ""}">${state.progress.marketUnlocked ? "UNLOCKED" : "5 lessons"}</span></div>
        <p>Decode the tape, set your spread, manage inventory, and nurse your PnL into sunset.</p>
        <div class="market-preview"><span>☀</span><span class="rail"><i style="width:${state.progress.marketUnlocked ? "100" : String(completed * 20)}%"></i></span><span>☾</span></div>
        <button class="button ${state.progress.marketUnlocked ? "button-primary" : "button-muted"}" data-action="open-market" ${state.progress.marketUnlocked ? "" : "disabled"}>${state.progress.marketUnlocked ? "Open the exchange →" : "Complete training to open"}</button>
      </article>
    </section>`;
}

function tutorialVisual(lesson) {
  if (lesson.visual.type === "prices") {
    return `<div class="price-strip" aria-label="Recent prices: ${lesson.visual.values.join(", ")}">${lesson.visual.values.map((price) => `<span>${price}</span>`).join("")}</div>`;
  }
  if (lesson.visual.type === "quotes") {
    return `<div class="fair-badge">FAIR VALUE <strong>${lesson.visual.fairValue}</strong></div><div class="quote-demo"><span>BID</span><b>99</b><i></i><b>101</b><span>ASK</span></div>`;
  }
  if (lesson.visual.type === "spread") {
    return `<div class="spread-demo"><div><span>CALM</span><b>99.7 / 100.3</b><small>tight gap</small></div><div class="risk-rail"><i></i></div><div><span>STORMY</span><b>98 / 102</b><small>wide gap</small></div></div>`;
  }
  if (lesson.visual.type === "volatility") {
    return `<div class="chart-pair"><div><small>CALM</small>${sparkline([100, 100.2, 99.9, 100.1, 100], "calm")}</div><div><small>CHOPPY</small>${sparkline([100, 102, 98, 103, 97], "hot")}</div></div><code class="tape">${lesson.visual.encoded}</code>`;
  }
  return `<div class="pnl-demo"><div><span>BOUGHT</span><b>5 × $100</b></div><span class="formula">−500 + (5 × 97)</span><div><span>MARK</span><b class="loss">−$15</b></div></div>`;
}

function tutorialView(state) {
  const lesson = lessonFor(state.tutorial.currentLesson);
  if (!lesson) return homeView(state);
  const lessonState = state.tutorial.lessonState || {};
  const selected = lessonState.selected;
  const passed = lessonState.passed;
  const feedback = selected ? (passed ? lesson.feedback : "Not quite. Let the tape cool for a moment, then try again.") : "Choose an answer and Turing will show the working.";
  const hintCount = lessonState.hintCount || 0;
  const hint = hintCount ? `<div class="hint-box lesson-hint">✦ ${StaticHintProvider.lesson(lesson, hintCount - 1)}</div>` : "";
  const choiceButtons = lesson.choices.map((choice) => {
    const isSelected = String(choice) === String(selected);
    const className = isSelected ? (passed ? "correct" : "incorrect") : "";
    return `<button class="choice-button ${className}" data-action="lesson-choice" data-choice="${escapeHtml(choice)}" ${passed ? "disabled" : ""}>${escapeHtml(choice)}${isSelected ? `<span aria-hidden="true">${passed ? "✓" : "↺"}</span>` : ""}</button>`;
  }).join("");
  const unlocked = lesson.termIds.map((id) => `<span>${GLOSSARY[id].term}</span>`).join(" · ");
  return `
    <section class="lesson-layout">
      <div class="lesson-heading"><div><p class="eyebrow">${lesson.eyebrow}</p><h1>${lesson.title}</h1></div><button class="button button-ghost compact" data-action="glossary">Glossary ▤</button></div>
      <div class="lesson-grid">
        <aside class="turing-card"><div class="turing-face" aria-hidden="true">⊙</div><p class="machine-label">TURING // TRAINER</p><p>“${lesson.intro}”</p><div class="turing-lights" aria-hidden="true"><i></i><i></i><i></i></div></aside>
        <section class="lesson-play card" aria-labelledby="lesson-question">
          <div class="lesson-visual">${tutorialVisual(lesson)}</div>
          <h2 id="lesson-question">${lesson.question}</h2>
          <div class="choice-list">${choiceButtons}</div>
          <div class="feedback ${passed ? "success" : selected ? "warning" : ""}" role="status"><span aria-hidden="true">${passed ? "✦" : selected ? "!" : "?"}</span><p>${feedback}</p></div>
          ${hint}
          ${passed ? `<div class="unlock-card"><span>UNLOCKED</span><strong>${unlocked}</strong><p>${lesson.explanation}</p></div>` : ""}
        </section>
      </div>
      <nav class="lesson-nav" aria-label="Lesson controls">
        <button class="button button-ghost" data-action="lesson-back">← Back</button>
        <button class="button button-ghost" data-action="lesson-hint">✦ Hint</button>
        ${passed ? `<button class="button button-primary" data-action="lesson-next">${lesson.id === 5 ? "Open the exchange →" : "Continue →"}</button>` : selected ? `<button class="button button-ghost" data-action="lesson-retry">Try again</button>` : ""}
      </nav>
    </section>`;
}

function sparkline(values, variant = "") {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 160},${52 - ((value - min) / range) * 42}`).join(" ");
  return `<svg class="sparkline ${variant}" viewBox="0 0 160 56" role="img" aria-label="Recent price movement"><polyline points="${points}" fill="none" pathLength="1" /></svg>`;
}

function pnlChart(rounds) {
  const values = [0, ...rounds.map((round) => round.totalPnL)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 240},${72 - ((value - min) / range) * 54}`).join(" ");
  const zero = 72 - ((0 - min) / range) * 54;
  return `<div class="pnl-chart"><div><span>PNL BY ROUND</span><small>0 → ${rounds.length} rounds</small></div><svg viewBox="0 0 240 84" role="img" aria-label="Total PnL after each market round"><line x1="0" x2="240" y1="${zero}" y2="${zero}" /><polyline points="${points}" fill="none" /></svg></div>`;
}

function marketSnapshot(market) {
  const inventoryAlarm = Math.abs(market.inventory) >= 4 ? `<p class="inventory-alarm">⚠ Inventory alarm: flatten before sunset.</p>` : "";
  return `<article class="snapshot-card"><p class="card-label">Market snapshot</p><div class="metric-grid">
    <div><small>MID</small><strong>$${market.midPrice.toFixed(2)}</strong></div>
    <div><small>FAIR</small><strong>$${market.fairValue.toFixed(2)}</strong></div>
    <div><small>VOL</small><strong class="${market.volatility === "high" ? "coral" : ""}">${cap(market.volatility)}</strong></div>
    <div><small>INV</small><strong>${sign(market.inventory)}${Math.abs(market.inventory)}</strong></div>
    <div><small>STREAK</small><strong class="streak-value">×${market.streak || 0}</strong></div>
    <div><small>RUN SCORE</small><strong>${money(finalScore(market))}</strong></div>
  </div><div class="quote-readout"><span>BID <b>$${market.quote.bid.toFixed(2)}</b></span><i></i><span>ASK <b>$${market.quote.ask.toFixed(2)}</b></span></div>${inventoryAlarm}</article>`;
}

function marketIntro(state) {
  const target = state.market.dailyTarget;
  return `<section class="market-intro card"><p class="eyebrow">Training complete · exchange protocol 01</p><h1>The Solstice Exchange opens at dawn.</h1><p class="lede">Eight rounds. Each round: read Turing's signal, preview a quote, watch the fills, and keep your inventory from becoming the plot.</p><div class="win-condition"><span>YOUR WIN CONDITION</span><b>Reach a ${money(target)} score by sunset.</b><p>Match signals to build a streak, earn +$1 for manual decoding, and avoid an inventory penalty above ±4. Round 8 is a doubled-stakes Sunset Auction.</p></div><div class="how-steps"><div><span>1</span><b>Decode</b><small>Manual decodes earn a bonus; guided decoding avoids a penalty.</small></div><div><span>2</span><b>Preview</b><small>Inspect the bid, ask, rival, and risk before committing.</small></div><div><span>3</span><b>Survive</b><small>Build streaks, meet event tactics, and win the sunset auction.</small></div></div><button class="button button-primary" data-action="prepare-round">Open round one →</button></section>`;
}

function marketBrief(state) {
  const market = state.market;
  if (!market.currentRegime) return marketIntro(state);
  const signal = market.signal;
  const isBinary = signal.type === "binary";
  const savedEvent = market.currentRegime.event || { id: "steady", label: "Clear skies", copy: "The tape is behaving itself. That is not a promise.", choices: [] };
  const legacyEventDetails = {
    "sun-flare": { recommendation: "widen", choices: [{ id: "widen", label: "Widen immediately", note: "Put distance between you and the flare." }, { id: "hold", label: "Hold the quote", note: "Chase fills through the turbulence." }] },
    "thin-books": { recommendation: "wait", choices: [{ id: "lean", label: "Lean in for fills", note: "Make a friendlier quote and tempt the thin crowd." }, { id: "wait", label: "Stay patient", note: "Protect the book until depth returns." }] },
    "late-reversal": { recommendation: "fade", choices: [{ id: "fade", label: "Fade the trend", note: "Prepare for the tape to turn back." }, { id: "follow", label: "Follow the trend", note: "Trust the move to keep running." }] }
  };
  const event = { ...savedEvent, ...(legacyEventDetails[savedEvent.id] || {}), ...savedEvent, choices: savedEvent.choices?.length ? savedEvent.choices : (legacyEventDetails[savedEvent.id]?.choices || []) };
  const rival = market.currentRegime.rival || { id: "cipher", name: "Cipher", role: "Unknown bot", copy: "Its logic is hidden somewhere in the tape.", accent: "mint" };
  const isSunsetAuction = market.round + 1 === market.maxRounds;
  const selectedSpread = market.selectedSpread;
  const previewQuote = selectedSpread ? generateQuote({ fairValue: market.fairValue, inventory: market.inventory, volatility: market.volatility, spreadMode: selectedSpread }) : null;
  const guidedProgress = Math.min(market.decodeProgress || 0, signal.decoded.length);
  const guidedText = signal.decoded.slice(0, guidedProgress) || "· · ·";
  const decoded = market.decoded ? `<p class="decoded">✓ ${market.decodeMethod === "manual" ? "Manual decode: +$1 bonus" : "Turing guided the decode—no penalty."} <b>${signal.decoded}</b></p>` : "";
  const hint = market.hint ? `<p class="hint-box">✦ ${escapeHtml(market.hint)}</p>` : "";
  const decodeHelp = market.decodeHelp ? `<p class="helper-copy">Binary maps groups of 8 digits to letters. Caesar shifts letters three places; logic clues are already plain language in disguise.</p>` : "";
  const guidedDecoder = `<div class="guided-decoder"><span>GUIDED DECODE</span><code>${guidedText}</code><button data-action="reveal-signal-char" ${guidedProgress >= signal.decoded.length ? "disabled" : ""}>Reveal next character</button></div>`;
  const eventTactics = (event.choices || []).map((choice) => `<button class="${market.eventDecision === choice.id ? "selected" : ""}" data-action="choose-event-action" data-event-action="${choice.id}" aria-pressed="${market.eventDecision === choice.id}"><b>${choice.label}</b><small>${choice.note}</small></button>`).join("");
  const eventCard = event.id === "steady" ? "" : `<div class="market-event ${event.id}"><div><span>EVENT // ${event.label}</span><p>${event.copy}</p></div><div class="event-tactics"><small>TACTICAL CALL</small>${eventTactics}</div></div>`;
  const rivalCard = `<article class="rival-card ${rival.accent}"><p class="card-label">Active rival</p><div><span aria-hidden="true">${rival.id === "blaze" ? "⚡" : rival.id === "mara" ? "◈" : "?"}</span><section><b>${rival.name}</b><small>${rival.role}</small></section></div><p>${rival.copy}</p></article>`;
  const spreadLabels = {
    tight: ["Tight", "More fills · less shelter"],
    balanced: ["Balanced", "A practical middle"],
    wide: ["Wide", "More shelter · fewer fills"]
  };
  const spreadControls = Object.entries(spreadLabels).map(([mode, [label, note]]) => `<button class="${selectedSpread === mode ? "selected" : ""}" data-action="choose-spread" data-spread="${mode}" aria-pressed="${selectedSpread === mode}"><b>${label}</b><small>${note}</small></button>`).join("");
  const quotePreview = previewQuote ? `<div class="quote-preview"><span>PROPOSED ${selectedSpread.toUpperCase()} QUOTE</span><div><b>BID $${previewQuote.bid.toFixed(2)}</b><i></i><b>ASK $${previewQuote.ask.toFixed(2)}</b></div><small>${selectedSpread === "wide" ? "More room for a surprise." : selectedSpread === "tight" ? "Friendlier, but closer to the weather." : "A useful middle ground."} A matching signal would make streak ×${(market.streak || 0) + 1}.</small><button class="button button-primary compact" data-action="confirm-spread">Confirm ${cap(selectedSpread)} quote →</button></div>` : `<p class="quote-note">Choose a spread to preview its actual bid and ask before sending it to the market.</p>`;
  return `<section class="market-screen">
    <div class="market-title"><div><p class="eyebrow">SOLSTICE EXCHANGE // LIVE</p><h1>${market.phase} market ${isSunsetAuction ? "<em>Sunset Auction</em>" : ""}</h1></div><div class="round-badge"><span>ROUND</span><b>${market.round + 1} <small>/ ${market.maxRounds}</small></b></div></div>
    <div class="day-meter" aria-label="Day progress, round ${market.round + 1} of ${market.maxRounds}"><span>☼ Dawn</span><div><i style="width:${((market.round + 1) / market.maxRounds) * 100}%"></i></div><span>Sunset ☾</span></div>
    <div class="run-objective"><span>DAY TARGET ${money(market.dailyTarget)}</span><b>Run score ${money(finalScore(market))}</b><strong class="${market.streak ? "hot" : ""}">Signal streak ×${market.streak || 0}</strong>${isSunsetAuction ? "<em>FINAL ROUND: PnL counts twice.</em>" : ""}</div>
    ${eventCard}
    <div class="market-grid">
      <aside class="market-info"><div class="card signal-card"><p class="card-label">Turing signal <span>${signal.type}</span></p><code>${escapeHtml(signal.encoded)}</code>${decoded}<div class="mini-actions"><button data-action="decode-help">Decode help</button><button data-action="market-hint">✦ Hint</button></div>${decodeHelp}${guidedDecoder}${hint}</div>${marketSnapshot(market)}${rivalCard}</aside>
      <section class="market-center card"><div class="chart-heading"><div><p class="card-label">Recent price tape</p><strong>${prettyTrend(market.trend)} trend · ${cap(market.liquidity)} liquidity</strong></div><span class="phase-chip">${market.phase}</span></div>${sparkline(market.priceHistory, market.volatility === "high" ? "hot" : "")}
        <div class="turing-observation"><span aria-hidden="true">⊙</span><p>“${isBinary ? "The tape is binary: take it eight bits at a time." : signal.type === "caesar" ? "Three letters away, the message waits." : "The machine prefers simple rules to mystical vibes."}”</p></div>
        <label class="decode-entry">Decode manually <input data-decode-input type="text" autocomplete="off" placeholder="Type the decoded message" aria-label="Decoded signal" /><button data-action="check-decode">Check</button></label>
      </section>
      <aside class="quote-panel card"><p class="card-label">Choose your spread</p><h2>How much room do you need?</h2><div class="spread-controls">${spreadControls}</div>${quotePreview}<p class="quote-note">The quote will skew a little to help flatten heavy inventory.</p></aside>
    </div>
  </section>`;
}

function roundSummary(state) {
  const market = state.market;
  const summary = market.lastRoundSummary;
  const lastEvents = market.tradeHistory.slice(-Math.min(4, summary.fills)).map((trade) => `<li><span class="${trade.side}">${trade.side === "buy" ? "Bought" : "Sold"}</span><b>$${trade.price.toFixed(2)}</b></li>`).join("") || "<li><span>No fills</span><b>Quiet tape</b></li>";
  const final = market.round === market.maxRounds;
  const approval = summary.matchedSignal && (summary.eventMatched !== false) ? "TURING APPROVES // STREAK INTACT" : summary.eventMatched === false ? "TACTICAL CALL MISSED // TAPE REPLIES" : "SIGNAL MISSED // RESET AND REQUOTE";
  const scoreClass = summary.roundScoreBonus >= 0 ? "good" : "bad";
  const auctionNote = summary.isSunsetAuction ? `<div class="auction-note">SUNSET AUCTION // ${money(summary.auctionBonus)} added again to the final score.</div>` : "";
  return `<section class="summary-layout"><div class="summary-hero card ${scoreClass}"><p class="eyebrow">ROUND ${summary.round} // ${summary.phase.toUpperCase()} COMPLETE</p><h1>${summary.pnlChange >= 0 ? "A little daylight gained." : "The tape took a bite."}</h1><div class="terminal-celebration ${scoreClass}">${approval}</div><div class="summary-metrics"><div><small>ROUND PNL</small><b class="${summary.pnlChange >= 0 ? "gain" : "loss"}">${money(summary.pnlChange)}</b></div><div><small>RUN SCORE</small><b class="${finalScore(market) >= 0 ? "gain" : "loss"}">${money(finalScore(market))}</b></div><div><small>STREAK</small><b>×${market.streak}</b></div></div><div class="score-breakdown"><span>Signal/streak ${money(summary.roundScoreBonus)}</span>${summary.event?.id !== "steady" ? `<span>Event tactic ${summary.eventMatched ? "✓" : "—"}</span>` : ""}${summary.decodeMethod === "manual" ? "<span>Manual decode +$1</span>" : ""}</div>${auctionNote}<div class="coach-note"><span>⊙</span><p>${summary.teachingNote}</p></div><button class="button button-primary" data-action="${final ? "show-results" : "market-next"}">${final ? "See sunset results →" : "Continue to next round →"}</button></div><aside class="card event-ticker"><p class="card-label">Execution ticker</p><ul>${lastEvents}</ul><div class="quote-readout"><span>BID <b>$${summary.quote.bid.toFixed(2)}</b></span><i></i><span>ASK <b>$${summary.quote.ask.toFixed(2)}</b></span></div><p class="subtle">${summary.fills} fill${summary.fills === 1 ? "" : "s"} · ${cap(summary.regime.volatility)} volatility · ${cap(summary.spreadMode)} spread · ${summary.rival.name}</p></aside></section>`;
}

function marketView(state) {
  if (!state.progress.marketUnlocked) return homeView(state);
  if (state.market.lastRoundSummary) return roundSummary(state);
  return marketBrief(state);
}

function resultsView(state) {
  const market = state.market;
  const score = finalScore(market);
  const won = score >= market.dailyTarget;
  const best = market.bestRound;
  const history = market.roundHistory || [];
  const bestDecision = history.filter((round) => round.matchedSignal).sort((a, b) => b.pnlChange - a.pnlChange)[0] || best;
  const biggestRisk = history.reduce((largest, round) => (!largest || round.riskScore > largest.riskScore ? round : largest), null);
  const risk = Math.abs(market.inventory);
  const coach = risk > 4 ? "You made it to sunset, but your inventory wanted a starring role. Next time, let your quotes nudge it flatter." : won ? "Target cleared. Your signals, quotes, and nerve held together long enough for Turing to register a delighted click." : "You reached sunset, but not today’s target. Chase the streak, trust a good signal, and make the auction count.";
  const unlocks = (market.newUnlocks || []).map((unlock) => `<li>${unlock}</li>`).join("");
  const auction = history.at(-1)?.auctionBonus || 0;
  return `<section class="results"><div class="sunset-panel ${won ? "target-cleared" : ""}"><p class="eyebrow">THE LONGEST TRADING DAY // COMPLETE</p><h1>${won ? "Target cleared at sunset." : "Sunset, with a rematch waiting."}</h1><div class="score-orb"><span>FINAL SCORE · TARGET ${money(market.dailyTarget)}</span><b class="${won ? "gain" : "loss"}">${money(score)}</b><small>PnL ${money(market.totalPnL)} · streak bonuses ${money(market.scoreBonus)} · auction ${money(auction)}</small></div><p class="coach-final">⊙ “${coach}”</p>${unlocks ? `<section class="unlock-reel"><span>NEW FIELD NOTES</span><ul>${unlocks}</ul></section>` : ""}${pnlChart(history)}<div class="results-grid debrief-grid"><div><small>BEST ROUND</small><b>${best ? `#${best.round} · ${money(best.pnlChange)}` : "—"}</b></div><div><small>BEST DECISION</small><b>${bestDecision ? `#${bestDecision.round} · ${cap(bestDecision.spreadMode)} matched signal` : "—"}</b></div><div><small>BIGGEST RISK</small><b>${biggestRisk ? `#${biggestRisk.round} · ${sign(biggestRisk.inventory)}${Math.abs(biggestRisk.inventory)} units` : "—"}</b></div><div><small>MAX STREAK</small><b>×${market.maxStreak || 0} · ${market.manualDecodes || 0} manual decodes</b></div></div><div class="action-row centered"><button class="button button-primary" data-action="restart-market">Trade another day ↻</button><button class="button button-ghost" data-action="home">Return home</button></div></div></section>`;
}

function awardRun(state) {
  const score = finalScore(state.market);
  const current = new Set(state.progress.achievements || []);
  const skins = new Set(state.progress.unlockedSkins || ["midnight"]);
  const newUnlocks = [];
  const award = (id, label, skin) => {
    if (!current.has(id)) {
      current.add(id);
      newUnlocks.push(label);
    }
    if (skin) skins.add(skin);
  };
  award("sunset-survivor", "Sunset Survivor · finished a full trading day", "sunrise");
  if (score >= state.market.dailyTarget) award("sun-chaser", "Sun Chaser · cleared the daily target", "sunrise");
  if ((state.market.manualDecodes || 0) >= 3) award("codebreaker", "Codebreaker · 3 manual Turing decodes", "cipher");
  if (Math.abs(state.market.inventory) <= 2) award("steady-hands", "Steady Hands · closed with manageable inventory");
  if ((state.market.maxStreak || 0) >= 3) award("hot-tape", "Hot Tape · built a 3-signal streak");
  return {
    ...state,
    progress: { ...state.progress, achievements: [...current], unlockedSkins: [...skins] },
    market: { ...state.market, newUnlocks }
  };
}

function glossaryView(state) {
  const unlocked = state.progress.glossaryUnlocked;
  const terms = Object.entries(GLOSSARY).map(([id, value]) => {
    const available = unlocked.includes(id);
    return `<article class="glossary-item ${available ? "" : "locked"}"><div><span>${available ? "✦" : "◆"}</span><h2>${available ? value.term : "Locked term"}</h2></div><p>${available ? value.definition : "Complete training lessons to unlock this note from Turing's machine."}</p></article>`;
  }).join("");
  return `<section class="page-section"><p class="eyebrow">TURING'S FIELD NOTES</p><h1>Glossary</h1><p class="lede">Plain English, because markets are confusing enough before anyone adds ceremonial fog.</p><div class="glossary-grid">${terms}</div><button class="button button-ghost" data-action="back">← Return</button></section>`;
}

function settingsView(state) {
  const setting = (key, label, note) => `<label class="setting-row"><span><b>${label}</b><small>${note}</small></span><input type="checkbox" data-action="toggle-setting" data-setting="${key}" ${state.settings[key] ? "checked" : ""} /></label>`;
  const skinNames = { midnight: ["Midnight Terminal", "Default exchange glow"], sunrise: ["Sunrise Circuit", "Unlocked by completing a full run"], cipher: ["Cipher Mint", "Unlocked with 3 manual decodes"] };
  const skins = Object.entries(skinNames).map(([id, [label, note]]) => `<button class="skin-choice ${state.settings.terminalSkin === id ? "selected" : ""}" data-action="select-skin" data-skin="${id}" ${state.progress.unlockedSkins.includes(id) ? "" : "disabled"}><b>${label}</b><small>${state.progress.unlockedSkins.includes(id) ? note : "Locked"}</small></button>`).join("");
  return `<section class="page-section settings-page"><p class="eyebrow">EXCHANGE CONTROLS</p><h1>Settings</h1><div class="settings-card card">${setting("soundOn", "Sound effects", "Small browser-generated ticks and chimes; never autoplayed.")}${setting("reducedMotion", "Reduce motion", "Use calmer transitions. System preference is also respected.")}${setting("highContrast", "High contrast", "Strengthen panel edges and text separation.")}${setting("showCaptions", "Show captions", "Keep descriptive text near visual market elements.")}<div class="setting-row"><span><b>Font size</b><small>Adjust the in-game reading size.</small></span><div class="font-controls"><button data-action="font-down" aria-label="Decrease font size">A−</button><b>${Math.round(state.settings.fontScale * 100)}%</b><button data-action="font-up" aria-label="Increase font size">A+</button></div></div></div><section class="skin-panel"><p class="eyebrow">Terminal skins</p><div>${skins}</div></section><div class="settings-footer"><button class="button button-ghost" data-action="back">← Return</button><button class="button danger" data-action="reset-progress">Reset saved progress</button></div></section>`;
}

function howView() {
  return `<section class="page-section"><p class="eyebrow">OPERATING MANUAL // SHORT EDITION</p><h1>Make a price. Learn from it.</h1><div class="how-cards"><article class="card"><span>01</span><h2>Train</h2><p>Five interactive micro-lessons build the vocabulary. There is no test until after you make a choice.</p></article><article class="card"><span>02</span><h2>Read</h2><p>In each market round, Turing's signal points toward the kind of risk you face. Decode it yourself, ask for help, or simply reason it out.</p></article><article class="card"><span>03</span><h2>Quote</h2><p>A tight spread attracts trades; a wide spread buffers a storm. Inventory gently shifts your quote to help you unwind it.</p></article></div><button class="button button-primary" data-action="back">Got it →</button></section>`;
}

function render(state) {
  const route = state.app.route;
  const view = route === "tutorial" ? tutorialView(state)
    : route === "market" ? marketView(state)
      : route === "results" ? resultsView(state)
        : route === "glossary" ? glossaryView(state)
          : route === "settings" ? settingsView(state)
            : route === "how" ? howView()
              : homeView(state);
  app.innerHTML = shell(state, view, !hasRendered);
  hasRendered = true;
}

function currentRoute(state, route, notice = "") {
  return addNotice({ ...state, app: { ...state.app, route } }, notice);
}

function startFreshMarket(state) {
  const base = initialState().market;
  return {
    ...state,
    app: { ...state.app, route: "market" },
    market: base,
    session: { ...state.session, seed: (Date.now() + state.session.seed) % 2147483647 }
  };
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  const state = store.getState();
  const tone = action.includes("choice") || action.includes("spread") ? "tick" : "success";
  playTone(state.settings.soundOn, tone);

  if (action === "home") update((next) => currentRoute(next, "home", "Home terminal restored."));
  if (action === "back") update((next) => currentRoute(next, "home"));
  if (action === "settings") update((next) => currentRoute(next, "settings", "Settings opened."));
  if (action === "glossary") update((next) => currentRoute(next, "glossary", "Glossary opened."));
  if (action === "show-how") update((next) => currentRoute(next, "how"));
  if (action === "open-lesson") {
    const id = Number(button.dataset.lesson);
    updateWithEvent("lesson_start", { lesson: id }, (next) => ({ ...next, app: { ...next.app, route: "tutorial" }, tutorial: { currentLesson: id, attempts: 0, lessonState: {} } }));
  }
  if (action === "lesson-choice") {
    const lesson = lessonFor(state.tutorial.currentLesson);
    const choice = button.dataset.choice;
    const passed = String(choice) === String(lesson.correct);
    updateWithEvent("lesson_submit", { lesson: lesson.id, passed }, (next) => addNotice({ ...next, tutorial: { ...next.tutorial, attempts: next.tutorial.attempts + 1, lessonState: { selected: choice, passed } } }, passed ? "Correct. Term unlocked." : "Not quite. Hint available."));
  }
  if (action === "lesson-retry") update((next) => addNotice({ ...next, tutorial: { ...next.tutorial, lessonState: {} } }, "Try again. The machine is patient."));
  if (action === "lesson-hint") {
    const lesson = lessonFor(state.tutorial.currentLesson);
    const count = state.tutorial.lessonState?.hintCount || 0;
    updateWithEvent("hint_requested", { lesson: lesson.id }, (next) => addNotice({ ...next, tutorial: { ...next.tutorial, lessonState: { ...next.tutorial.lessonState, hintCount: count + 1 } } }, StaticHintProvider.lesson(lesson, count)));
  }
  if (action === "lesson-back") {
    const previous = Math.max(1, state.tutorial.currentLesson - 1);
    update((next) => currentRoute({ ...next, tutorial: { currentLesson: previous, attempts: 0, lessonState: {} } }, "tutorial"));
  }
  if (action === "lesson-next") {
    const lesson = lessonFor(state.tutorial.currentLesson);
    if (!state.tutorial.lessonState?.passed) return;
    updateWithEvent("lesson_pass", { lesson: lesson.id }, (next) => {
      const completedLessons = [...new Set([...next.progress.completedLessons, lesson.id])].sort((a, b) => a - b);
      const glossaryUnlocked = [...new Set([...next.progress.glossaryUnlocked, ...lesson.termIds])];
      if (lesson.id === lessons.length) {
        return addNotice({ ...next, app: { ...next.app, route: "market" }, progress: { ...next.progress, completedLessons, glossaryUnlocked, marketUnlocked: true, unlockedLessons: [1, 2, 3, 4, 5] }, tutorial: { currentLesson: lesson.id, attempts: 0, lessonState: {} } }, "Training complete. The exchange opens at dawn.");
      }
      return addNotice({ ...next, progress: { ...next.progress, completedLessons, glossaryUnlocked, unlockedLessons: [...new Set([...next.progress.unlockedLessons, lesson.id + 1])].sort() }, tutorial: { currentLesson: lesson.id + 1, attempts: 0, lessonState: {} } }, `Lesson ${lesson.id + 1} unlocked.`);
    });
  }
  if (action === "open-market") update((next) => currentRoute(next, "market", "The exchange is ready."));
  if (action === "prepare-round") updateWithEvent("round_start", { round: state.market.round + 1 }, (next) => addNotice({ ...next, market: prepareRound(next.market, next.session.seed) }, `Round ${state.market.round + 1}: signal received.`));
  if (action === "decode-help") update((next) => addNotice({ ...next, market: { ...next.market, decodeHelp: !next.market.decodeHelp } }, "Decode help toggled."));
  if (action === "reveal-signal-char") updateWithEvent("signal_decode_help", { round: state.market.round + 1 }, (next) => {
    const total = next.market.signal.decoded.length;
    const decodeProgress = Math.min(total, (next.market.decodeProgress || 0) + 1);
    const complete = decodeProgress === total;
    return addNotice({ ...next, market: { ...next.market, decodeProgress, decoded: complete, decodeMethod: complete ? "guided" : next.market.decodeMethod } }, complete ? "The guided decode is complete. You avoided the signal penalty." : "One character revealed. Keep going, or use the pattern to finish it yourself.");
  });
  if (action === "market-hint") updateWithEvent("hint_requested", { round: state.market.round + 1 }, (next) => addNotice({ ...next, market: { ...next.market, hint: StaticHintProvider.market(next.market.currentRegime, next.market.inventory) } }, "Turing offers a nudge."));
  if (action === "check-decode") {
    const answer = app.querySelector("[data-decode-input]")?.value?.trim().toUpperCase();
    const correct = answer === state.market.signal.decoded.toUpperCase();
    updateWithEvent("signal_decoded", { correct }, (next) => addNotice({ ...next, market: { ...next.market, decoded: correct, decodeMethod: correct ? "manual" : null, decodeAttempted: true } }, correct ? "Manual decode confirmed: +$1 if you send a quote this round." : "Misread tape: this round carries a score penalty unless you finish with guided decode."));
  }
  if (action === "choose-event-action") {
    const eventDecision = button.dataset.eventAction;
    updateWithEvent("event_tactic_selected", { round: state.market.round + 1, eventDecision }, (next) => addNotice({ ...next, market: { ...next.market, eventDecision } }, "Tactical call locked. Now make your quote fit it."));
  }
  if (action === "choose-spread") {
    const spreadMode = button.dataset.spread;
    updateWithEvent("spread_previewed", { round: state.market.round + 1, spreadMode }, (next) => addNotice({ ...next, market: { ...next.market, selectedSpread: spreadMode } }, `${cap(spreadMode)} quote previewed. Confirm when you are ready to send it.`));
  }
  if (action === "confirm-spread") {
    const spreadMode = state.market.selectedSpread;
    if (!spreadMode) return;
    updateWithEvent("spread_selected", { round: state.market.round + 1, spreadMode }, (next) => {
      const market = simulateRound(next.market, spreadMode, next.session.seed);
      return addNotice({ ...next, market }, `Round ${market.round} complete: ${money(market.lastRoundSummary.pnlChange)}.`);
    });
  }
  if (action === "market-next") updateWithEvent("round_start", { round: state.market.round + 1 }, (next) => addNotice({ ...next, market: prepareRound({ ...next.market, lastRoundSummary: null, decoded: false, hint: "", decodeHelp: false, decodeMethod: null, decodeAttempted: false, eventDecision: null }, next.session.seed) }, `Round ${next.market.round + 1}: signal received.`));
  if (action === "show-results") updateWithEvent("market_finished", {}, (next) => currentRoute(awardRun(next), "results", "Sunset results ready."));
  if (action === "restart-market") update((next) => addNotice(startFreshMarket(next), "A new daylight session is ready."));
  if (action === "toggle-setting") {
    const key = button.dataset.setting;
    const checked = button.checked;
    updateWithEvent("settings_changed", { key, value: checked }, (next) => addNotice({ ...next, settings: { ...next.settings, [key]: checked } }, `${key === "soundOn" ? "Sound" : cap(key)} ${checked ? "on" : "off"}.`));
  }
  if (action === "font-down" || action === "font-up") update((next) => ({ ...next, settings: { ...next.settings, fontScale: clamp(next.settings.fontScale + (action === "font-up" ? 0.1 : -0.1), 0.9, 1.3) } }));
  if (action === "select-skin") {
    const terminalSkin = button.dataset.skin;
    updateWithEvent("settings_changed", { terminalSkin }, (next) => addNotice({ ...next, settings: { ...next.settings, terminalSkin } }, `${cap(terminalSkin)} terminal skin selected.`));
  }
  if (action === "reset-progress") {
    const clean = initialState();
    store.setState(() => sessionize(addNotice(clean, "Local progress reset.")));
  }
});

app.addEventListener("change", (event) => {
  const input = event.target.closest("input[data-action='toggle-setting']");
  if (!input) return;
  const key = input.dataset.setting;
  const checked = input.checked;
  playTone(store.getState().settings.soundOn, "tick");
  updateWithEvent("settings_changed", { key, value: checked }, (state) => addNotice({ ...state, settings: { ...state.settings, [key]: checked } }, `${key === "soundOn" ? "Sound" : cap(key)} ${checked ? "on" : "off"}.`));
});

store.subscribe(render);
store.setState((state) => sessionize(state));
