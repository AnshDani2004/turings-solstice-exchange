let context;

export function playTone(enabled, type = "tick") {
  if (!enabled || typeof window === "undefined") return;
  try {
    context ||= new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const frequencies = { tick: 440, success: 660, error: 150, unlock: 880 };
    oscillator.frequency.value = frequencies[type] || frequencies.tick;
    oscillator.type = type === "error" ? "sawtooth" : "sine";
    gain.gain.setValueAtTime(0.04, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.09);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);
  } catch {
    // Sound is cosmetic; browser audio restrictions should never block the game.
  }
}
