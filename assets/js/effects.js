const NO_CONFETTI_COUNT = 50;
const NO_CONFETTI_MAX_DURATION_MS = 2250;
const PLAYBACK_SPOTLIGHT_LEAD_MS = 160;
const PLAYBACK_SPOTLIGHT_DURATION_MS = 1100;
const WELCOME_CONFETTI_COUNT = 75;
const WELCOME_CONFETTI_MAX_DURATION_MS = 3250;

let playbackMomentTimers = [];

export function setRandomButtonRolling(button, isRolling) {
  button.classList.toggle("is-rolling", isRolling);
  button.setAttribute("aria-busy", String(isRolling));
}

export function playWelcomeConfetti(originElement) {
  const colors = ["#d72678", "#7452d6", "#ff5da7", "#ffd166", "#42d6a4"];
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const origin = originElement.getBoundingClientRect();
  const originX = origin.left + origin.width / 2;
  const originY = origin.top + origin.height / 2;
  const layer = document.createElement("div");

  layer.className = "welcome-confetti";
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);

  for (let index = 0; index < WELCOME_CONFETTI_COUNT; index += 1) {
    const particle = document.createElement("span");
    const piece = document.createElement("span");
    const angle = ((-125 + Math.random() * 70) * Math.PI) / 180;
    const velocity = 130 + Math.random() * 150;
    const launchX = Math.cos(angle) * velocity;
    const launchY = Math.sin(angle) * velocity;
    const landingX = launchX + (Math.random() - 0.5) * 120;
    const landingY = Math.max(140, launchY + 390 + Math.random() * 170);
    const flutterX = 5 + Math.random() * 12;
    const flutterRotation = 70 + Math.random() * 130;
    const flutterDuration = 180 + Math.random() * 220;
    const duration = 2400 + Math.random() * 800;

    particle.className = "welcome-confetti__particle";
    piece.className = "welcome-confetti__piece";
    particle.style.left = `${originX}px`;
    particle.style.top = `${originY}px`;
    particle.style.color =
      colors[Math.floor(Math.random() * colors.length)];
    particle.style.setProperty("--launch-x", `${launchX}px`);
    particle.style.setProperty("--launch-y", `${launchY}px`);
    particle.style.setProperty("--landing-x", `${landingX}px`);
    particle.style.setProperty("--landing-y", `${landingY}px`);
    particle.style.setProperty("--duration", `${duration}ms`);
    particle.style.setProperty("--flutter-x", `${flutterX}px`);
    particle.style.setProperty("--flutter-x-negative", `${-flutterX}px`);
    particle.style.setProperty(
      "--flutter-rotation",
      `${flutterRotation}deg`,
    );
    particle.style.setProperty(
      "--flutter-rotation-negative",
      `${-flutterRotation}deg`,
    );
    particle.style.setProperty("--flutter-duration", `${flutterDuration}ms`);
    particle.style.setProperty(
      "--flutter-delay",
      `${-Math.random() * flutterDuration}ms`,
    );
    piece.style.width = `${0.28 + Math.random() * 0.35}rem`;
    piece.style.height = `${0.5 + Math.random() * 0.45}rem`;

    if (reducedMotion) {
      particle.classList.add("welcome-confetti__particle--reduced");
      particle.style.transform = `translate(-50%, -50%) translate3d(${launchX * 0.45}px, ${launchY * 0.35}px, 0)`;
    }

    particle.append(piece);
    layer.append(particle);
  }

  const effectDuration = reducedMotion
    ? 450
    : WELCOME_CONFETTI_MAX_DURATION_MS;

  return new Promise((resolve) => {
    window.setTimeout(() => {
      layer.remove();
      resolve();
    }, effectDuration);
  });
}

function playNoConfetti(originElement, word) {
  const colors = ["#d72678", "#7452d6", "#ff5da7", "#a91659", "#171326"];
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const origin = originElement.getBoundingClientRect();
  const originX = origin.left + origin.width / 2;
  const originY = origin.top + origin.height / 2;
  const layer = document.createElement("div");

  layer.className = "no-confetti";
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);

  for (let index = 0; index < NO_CONFETTI_COUNT; index += 1) {
    const particle = document.createElement("span");
    const angleProgress = index / (NO_CONFETTI_COUNT - 1);
    const angleJitter = (Math.random() - 0.5) * 4;
    const angle = ((-140 + angleProgress * 100 + angleJitter) * Math.PI) / 180;
    const velocityBand = index % 3;
    const velocity = 170 + velocityBand * 50 + Math.random() * 30;
    const launchX = Math.cos(angle) * velocity;
    const launchY = Math.sin(angle) * velocity;
    const landingX = launchX + (Math.random() - 0.5) * 100;
    const landingY = Math.max(120, launchY + 360 + Math.random() * 160);
    const flutterDistance = 5 + Math.random() * 9;
    const flutterRotation = 8 + Math.random() * 14;
    const flutterDuration = 320 + Math.random() * 240;
    const duration = 1700 + Math.random() * 500;
    const text = document.createElement("span");

    particle.className = "no-confetti__particle";
    text.className = "no-confetti__text";
    text.textContent = word;
    text.dir = "auto";
    particle.style.left = `${originX}px`;
    particle.style.top = `${originY}px`;
    particle.style.color =
      colors[Math.floor(Math.random() * colors.length)];
    particle.style.fontSize = `${0.65 + Math.random() * 0.75}rem`;
    particle.style.setProperty("--launch-x", `${launchX}px`);
    particle.style.setProperty("--launch-y", `${launchY}px`);
    particle.style.setProperty("--landing-x", `${landingX}px`);
    particle.style.setProperty("--landing-y", `${landingY}px`);
    particle.style.setProperty("--duration", `${duration}ms`);
    particle.style.setProperty("--flutter-x", `${flutterDistance}px`);
    particle.style.setProperty("--flutter-x-negative", `${-flutterDistance}px`);
    particle.style.setProperty("--flutter-rotation", `${flutterRotation}deg`);
    particle.style.setProperty(
      "--flutter-rotation-negative",
      `${-flutterRotation}deg`,
    );
    particle.style.setProperty("--flutter-duration", `${flutterDuration}ms`);
    particle.style.setProperty(
      "--flutter-delay",
      `${-Math.random() * flutterDuration}ms`,
    );

    if (reducedMotion) {
      particle.classList.add("no-confetti__particle--reduced");
      particle.style.transform = `translate(-50%, -50%) translate3d(${launchX * 0.45}px, ${launchY * 0.4}px, 0)`;
    }

    particle.append(text);
    layer.append(particle);
  }

  window.setTimeout(
    () => layer.remove(),
    reducedMotion ? 500 : NO_CONFETTI_MAX_DURATION_MS,
  );
}

function clearPlaybackMoment() {
  playbackMomentTimers.forEach((timer) => window.clearTimeout(timer));
  playbackMomentTimers = [];
  document.querySelector(".playback-spotlight")?.remove();
  document
    .querySelector(".language-card.is-celebrating")
    ?.classList.remove("is-celebrating");
  document.querySelectorAll(".no-confetti").forEach((layer) => layer.remove());
}

export function playPlaybackMoment(card, word) {
  clearPlaybackMoment();

  const spotlight = document.createElement("div");
  spotlight.className = "playback-spotlight";
  spotlight.setAttribute("aria-hidden", "true");
  document.body.append(spotlight);

  // Restart the card and word animations when the same language is replayed.
  void card.offsetWidth;
  card.classList.add("is-celebrating");

  playbackMomentTimers = [
    window.setTimeout(
      () => playNoConfetti(card.querySelector(".speak-button"), word),
      PLAYBACK_SPOTLIGHT_LEAD_MS,
    ),
    window.setTimeout(() => {
      spotlight.remove();
      card.classList.remove("is-celebrating");
      playbackMomentTimers = [];
    }, PLAYBACK_SPOTLIGHT_DURATION_MS),
  ];
}
