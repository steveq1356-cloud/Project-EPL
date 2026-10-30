import confetti from 'canvas-confetti';

// A small burst of confetti — for finishing every task or logging a milestone.
// Skipped automatically for people who prefer reduced motion.
export function celebrate(origin = { x: 0.5, y: 0.6 }) {
  confetti({
    particleCount: 70,
    spread: 70,
    startVelocity: 32,
    ticks: 160,
    scalar: 0.9,
    origin,
    colors: ['#2f6fdb', '#16a061', '#d48a06', '#dc3d64', '#8b4fd8'],
    disableForReducedMotion: true,
  });
}

// Where an element sits on screen, as confetti's 0–1 origin.
export function originOf(el) {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
}
