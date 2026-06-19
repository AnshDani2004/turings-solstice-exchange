*This is a submission for the [June Solstice Game Jam](https://dev.to/challenges/june-game-jam-2026-06-03)*

## What I Built

I built **Turing’s Solstice Exchange**, a beginner-friendly browser game where Alan Turing’s fictional training machine teaches the foundations of market making. Players complete five quick, interactive lessons on Fair Value, Bid and Ask, Spread, Volatility, Inventory, and PnL. Then the exchange opens for an eight-round “longest trading day” that moves from dawn to sunset.

The solstice theme is structural rather than decorative: the sun meter, named day phases, warm terminal glow, and sunset score make the short run feel like one long bright day. The Alan Turing tribute appears in Binary and Caesar-shift signals, logic clues, machine-style output, and a friendly code-minded teacher.

## Video Demo

Demo video: **recording pending publication**. The 90-second narration and shot list are in [`docs/video-script.md`](./video-script.md).

## Code

Repository: **add GitHub repository URL after first push**  
Live demo: **add GitHub Pages URL after Pages is enabled**

## How I Built It

The game is a DOM-first vanilla HTML, CSS, and JavaScript app, built with Vite only for local development and static production builds. It is intentionally small, framework-free, and GitHub Pages friendly.

The market loop is deterministic from a seed. Each round creates a market regime with a trend, volatility, liquidity condition, an active rival trader, and occasional Solstice event (Sun Flare, Thin Books, or Reversal Watch); generates a Binary, Caesar, or logic signal; lets the player make a tactical event call and preview the actual bid/ask before committing a spread; simulates fills and price movement; then marks cash plus inventory to market for PnL. Matching signals builds a streak, manual decoding earns a bonus, and the final Sunset Auction doubles that round’s PnL in the score. The sunset debrief adds a PnL-by-round chart, best matched decision, largest inventory-risk moment, and unlockable terminal skins.

I treated accessibility as part of the game design: semantic headings, real form controls, visible keyboard focus, large target sizes, aria-live feedback, responsive layouts, a reduced-motion setting, high contrast, font scaling, and persisted preferences. The app stores only local progress/settings/event logs in browser storage—no third-party analytics.

## Prize Category

**Best Ode to Alan Turing** — Turing is integrated into the central mechanics rather than added as a label: code-breaking signals, logical prompts, deterministic machine-like simulation, and a warm terminal narrator all make the tribute playable.

## Team

Solo project.

## Credits

- No external visual or audio assets are required. Icons and visual effects are implemented with text, CSS, and inline SVG-like DOM shapes.
- The project uses Vite and Vitest for development/testing only.
- GitHub Pages workflow follows GitHub’s documented custom-workflow deployment pattern.

## AI Disclosure

This project was implemented with AI-assisted development tooling. The released game does not send player data to generative AI and does not include an exposed API key. It ships with a handcrafted static-hint provider. A `GeminiHintProvider` interface is present but disabled; it is only a future extension point for a secured server-side proxy, not a running feature in the public build. The Open Graph/social-preview background was generated with OpenAI image generation and is included as a static asset; it is not used at runtime to generate any player-facing content.
