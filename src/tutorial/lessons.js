export const lessons = [
  {
    id: 1,
    termIds: ["fair-value"],
    title: "Fair Value",
    eyebrow: "Lesson 1 of 5 · Dawn calibration",
    intro: "Markets are noisy. Your first job is not to panic; it is to estimate what the asset is really worth.",
    visual: { type: "prices", values: [99, 100, 100, 101, 100] },
    question: "What seems like the fairest current value?",
    choices: [98, 100, 103],
    correct: 100,
    feedback: "Exactly. The prints cluster around 100; the noisy 99 and 101 do not get to run the whole show.",
    explanation: "Fair Value is your best estimate of a reasonable price right now. Traders use it as an anchor before deciding whether a bid or ask is attractive.",
    hints: ["Look for the centre of the recent prices, not the most dramatic tick.", "Most prints landed on the same number."]
  },
  {
    id: 2,
    termIds: ["bid", "ask"],
    title: "Bid & Ask",
    eyebrow: "Lesson 2 of 5 · Two-sided speech",
    intro: "A market maker speaks in two prices: one to buy, one to sell.",
    visual: { type: "quotes", fairValue: 100 },
    question: "Which quote makes sense around fair value 100?",
    choices: ["Bid 101 · Ask 99", "Bid 99 · Ask 101", "Bid 103 · Ask 104"],
    correct: "Bid 99 · Ask 101",
    feedback: "Correct. You buy at the bid and sell at the ask; a sensible quote normally surrounds fair value.",
    explanation: "The Bid is the price you are willing to buy at. The Ask is the price you are willing to sell at. Market makers show both.",
    hints: ["A quote should have its buy price below its sell price.", "The fair value should sit between a healthy bid and ask."]
  },
  {
    id: 3,
    termIds: ["spread"],
    title: "Spread",
    eyebrow: "Lesson 3 of 5 · Room to breathe",
    intro: "Narrow spreads win attention. Wide spreads buy safety.",
    visual: { type: "spread" },
    question: "During a risky market, which quote gives the market maker the most protection?",
    choices: ["99.7 / 100.3", "99 / 101", "98 / 102"],
    correct: "98 / 102",
    feedback: "Right. It is less inviting, but its wider gap protects you when prices are jumping around.",
    explanation: "The Spread is the gap between the bid and ask. Tight spreads can attract more trades. Wide spreads protect you when the market becomes riskier.",
    hints: ["Subtract bid from ask. The largest gap is the defensive one.", "Risky conditions favour more breathing room."]
  },
  {
    id: 4,
    termIds: ["volatility"],
    title: "Volatility",
    eyebrow: "Lesson 4 of 5 · A dancing price",
    intro: "Prices do not always walk; sometimes they dance. Turing's tape has a clue.",
    visual: { type: "volatility", encoded: "01010110 01001111 01001100" },
    question: "The choppy chart and the machine's “VOL” message mean you should choose…",
    choices: ["A tight spread", "A balanced spread", "A wide spread"],
    correct: "A wide spread",
    feedback: "Correct. High volatility means more uncertainty, so a wider spread gives your quote some armour.",
    explanation: "Volatility means how much prices move around. When volatility is high, a wider spread usually reduces risk.",
    hints: ["Binary groups can map to letters; here the tape says VOL.", "When the chart is jumpy, don’t stand too close to the edge."]
  },
  {
    id: 5,
    termIds: ["inventory", "pnl"],
    title: "Inventory & PnL",
    eyebrow: "Lesson 5 of 5 · Surviving what you hold",
    intro: "A clever quote is not enough. You also need to survive what you hold.",
    visual: { type: "pnl", inventory: 5, entry: 100, mark: 97 },
    question: "You bought 5 units at 100; the market ends at 97. Is this position helping?",
    choices: ["Safe: PnL is +15", "Risky: PnL is −15", "Neutral: PnL is 0"],
    correct: "Risky: PnL is −15",
    feedback: "Exactly. Cash is −500 and inventory is now worth 485, so your PnL is −15. Tiny formula; real sting.",
    explanation: "Inventory is what you hold. PnL means Profit and Loss. If price moves against your inventory, your PnL falls.",
    hints: ["Multiply the 3-point price move by the five units.", "Long inventory loses when the final price is lower."]
  }
];

export const lessonFor = (id) => lessons.find((lesson) => lesson.id === Number(id));
