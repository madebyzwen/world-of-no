const DATA_URL = "./data/languages.json";
const DUCKING_FACTOR = 0.2;
const RANDOM_POST_SCROLL_DELAY_MS = 250;
const RANDOM_SCROLL_TIMEOUT_MS = 2500;
const NO_CONFETTI_COUNT = 50;
const NO_CONFETTI_MAX_DURATION_MS = 2250;
const PLAYBACK_SPOTLIGHT_LEAD_MS = 160;
const PLAYBACK_SPOTLIGHT_DURATION_MS = 1100;

const elements = {
  search: document.querySelector("#search"),
  continent: document.querySelector("#continent-filter"),
  officialList: document.querySelector("#official-list"),
  bonusList: document.querySelector("#bonus-list"),
  extrasSection: document.querySelector("#extras-section"),
  officialCount: document.querySelector("#official-count"),
  bonusCount: document.querySelector("#bonus-count"),
  resultCount: document.querySelector("#result-count"),
  emptyState: document.querySelector("#empty-state"),
  randomButton: document.querySelector("#random-button"),
  template: document.querySelector("#language-card-template"),
  welcome: document.querySelector("#welcome"),
  enterButton: document.querySelector("#enter-button"),
  music: document.querySelector("#background-music"),
  musicToggle: document.querySelector("#music-toggle"),
  musicIcon: document.querySelector("#music-icon"),
  musicLabel: document.querySelector("#music-label"),
  musicStatus: document.querySelector("#music-status"),
  volume: document.querySelector("#volume"),
  toast: document.querySelector("#toast"),
};

let languages = [];
let filteredLanguages = [];
let activeLanguagePlayback = null;
let randomSelectionToken = 0;
let selectedVolume = Number(elements.volume.value);
let isDucking = false;
let toastTimer;
let playbackMomentTimers = [];

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en");

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function waitForScrollEnd() {
  return new Promise((resolve) => {
    const startTime = performance.now();
    let previousX = window.scrollX;
    let previousY = window.scrollY;
    let stableFrames = 0;

    function checkScroll(currentTime) {
      const currentX = window.scrollX;
      const currentY = window.scrollY;
      const hasStopped =
        Math.abs(currentX - previousX) < 0.5 &&
        Math.abs(currentY - previousY) < 0.5;

      stableFrames = hasStopped ? stableFrames + 1 : 0;
      previousX = currentX;
      previousY = currentY;

      const elapsedTime = currentTime - startTime;
      if (
        (elapsedTime >= 150 && stableFrames >= 5) ||
        elapsedTime >= RANDOM_SCROLL_TIMEOUT_MS
      ) {
        resolve();
        return;
      }

      window.requestAnimationFrame(checkScroll);
    }

    window.requestAnimationFrame(checkScroll);
  });
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 5000);
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

function playPlaybackMoment(card, word) {
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

function updateMusicButton() {
  const isPlaying = !elements.music.paused;
  elements.musicIcon.textContent = isPlaying ? "⏸" : "▶";
  elements.musicLabel.textContent = isPlaying
    ? "Pause music"
    : "Play music";
}

async function playMusic() {
  try {
    await elements.music.play();
    elements.musicStatus.textContent = "";
  } catch {
    elements.musicStatus.textContent = "Optional music file not found.";
  }
  updateMusicButton();
}

function setDucking(enabled) {
  isDucking = enabled;
  elements.music.volume = enabled
    ? selectedVolume * DUCKING_FACTOR
    : selectedVolume;
}

function updatePlaybackCard(card, isPlaying) {
  card?.classList.toggle("is-speaking", isPlaying);
  card
    ?.querySelector(".speak-button")
    ?.setAttribute("aria-pressed", String(isPlaying));
}

function stopLanguagePlayback({ restoreMusic = true } = {}) {
  const playback = activeLanguagePlayback;
  if (!playback) {
    if (restoreMusic) setDucking(false);
    return;
  }

  activeLanguagePlayback = null;
  playback.audio.pause();
  playback.audio.removeAttribute("src");
  playback.audio.load();
  updatePlaybackCard(playback.card, false);
  if (restoreMusic) setDucking(false);
}

function finishLanguagePlayback(playback) {
  if (activeLanguagePlayback !== playback) return;
  activeLanguagePlayback = null;
  updatePlaybackCard(playback.card, false);
  setDucking(false);
}

function reportLanguageAudioError(playback, reason) {
  if (activeLanguagePlayback !== playback) return;
  const mediaError = playback.audio.error;
  console.error("Language audio could not be played.", {
    id: playback.language.id,
    language: playback.language.language,
    source: playback.language.audio,
    mediaErrorCode: mediaError?.code ?? null,
    reason,
  });
  showToast(
    `The audio file for ${playback.language.language} is missing or damaged.`,
  );
  finishLanguagePlayback(playback);
}

async function playLanguageAudio(language, card) {
  stopLanguagePlayback({ restoreMusic: false });
  playPlaybackMoment(card, language.word);

  const audio = new Audio();
  audio.preload = "metadata";
  audio.src = language.audio;
  const playback = { audio, card, language };
  activeLanguagePlayback = playback;

  audio.addEventListener("ended", () => finishLanguagePlayback(playback), {
    once: true,
  });
  audio.addEventListener(
    "error",
    () => reportLanguageAudioError(playback, "Media error event"),
    { once: true },
  );
  audio.addEventListener(
    "abort",
    () => reportLanguageAudioError(playback, "Loading aborted"),
    { once: true },
  );
  updatePlaybackCard(card, true);
  setDucking(true);

  try {
    await audio.play();
  } catch (error) {
    if (activeLanguagePlayback !== playback) return;
    console.error("Language audio could not be started.", {
      id: language.id,
      language: language.language,
      source: language.audio,
      error,
    });
    showToast(
      `The audio file for ${language.language} could not be started.`,
    );
    finishLanguagePlayback(playback);
  }
}

function createCard(language) {
  const card = elements.template.content.firstElementChild.cloneNode(true);
  card.dataset.id = language.id;
  card.tabIndex = -1;
  card.querySelector(".flag").textContent = language.flag || "🌐";
  card.querySelector(".language-name").textContent = language.language;
  card.querySelector(".native-name").textContent = language.nativeName;
  card.querySelector(".word").textContent = language.word;

  const transliteration = card.querySelector(".transliteration");
  transliteration.textContent = language.transliteration
    ? `Transliteration: ${language.transliteration}`
    : "";
  transliteration.hidden = !language.transliteration;

  const note = card.querySelector(".note");
  note.textContent = language.note || "";
  note.hidden = !language.note;

  const speakButton = card.querySelector(".speak-button");
  const accessibleLabel = `Play “${language.word}” in ${language.language}`;
  speakButton.setAttribute("aria-label", accessibleLabel);
  speakButton.setAttribute("aria-pressed", "false");
  speakButton.querySelector(".visually-hidden").textContent = accessibleLabel;
  speakButton.addEventListener("click", () => {
    randomSelectionToken += 1;
    playLanguageAudio(language, card);
  });

  return card;
}

function render() {
  elements.officialList.replaceChildren();
  elements.bonusList.replaceChildren();

  const official = filteredLanguages.filter(
    (language) => language.category === "official",
  );
  const bonus = filteredLanguages.filter(
    (language) => language.category === "bonus",
  );

  official.forEach((language) =>
    elements.officialList.append(createCard(language)),
  );
  bonus.forEach((language) => elements.bonusList.append(createCard(language)));

  elements.officialCount.textContent = String(official.length);
  elements.officialCount.setAttribute(
    "aria-label",
    `${official.length} visible official languages`,
  );
  elements.bonusCount.textContent = String(bonus.length);
  elements.resultCount.textContent = `${filteredLanguages.length} ${
    filteredLanguages.length === 1 ? "result" : "results"
  }`;
  elements.extrasSection.hidden = bonus.length === 0;
  elements.emptyState.hidden = filteredLanguages.length !== 0;
}

function applyFilters() {
  const query = normalize(elements.search.value.trim());
  const continent = elements.continent.value;

  filteredLanguages = languages.filter((language) => {
    const searchable = normalize(
      [
        language.language,
        language.nativeName,
        language.word,
        language.transliteration,
        language.continent,
      ].join(" "),
    );
    return (
      (continent === "all" || language.continent === continent) &&
      (!query || searchable.includes(query))
    );
  });

  render();
}

function populateContinents() {
  const continents = [...new Set(languages.map((item) => item.continent))].sort(
    (a, b) => a.localeCompare(b, "en"),
  );
  continents.forEach((continent) => {
    const option = document.createElement("option");
    option.value = continent;
    option.textContent = continent;
    elements.continent.append(option);
  });
}

async function selectRandomLanguage() {
  if (filteredLanguages.length === 0) {
    showToast("No languages match the current filters.");
    return;
  }

  const selectionToken = ++randomSelectionToken;
  document
    .querySelector(".language-card.is-highlighted")
    ?.classList.remove("is-highlighted");
  const language =
    filteredLanguages[Math.floor(Math.random() * filteredLanguages.length)];
  const card = document.querySelector(
    `.language-card[data-id="${CSS.escape(language.id)}"]`,
  );
  card.classList.add("is-highlighted");
  card.focus({ preventScroll: true });
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  await waitForScrollEnd();
  await wait(RANDOM_POST_SCROLL_DELAY_MS);

  if (
    selectionToken !== randomSelectionToken ||
    document.activeElement !== card
  ) {
    if (selectionToken !== randomSelectionToken) return;
    console.error("Random selection could not set focus.", {
      id: language.id,
      language: language.language,
    });
    showToast("The selected language could not be focused.");
    return;
  }

  playLanguageAudio(language, card);
}

function validateData(data) {
  if (!Array.isArray(data)) throw new Error("The language data is not a list.");
  const required = [
    "id",
    "language",
    "nativeName",
    "word",
    "locale",
    "continent",
    "category",
    "audio",
  ];
  const ids = new Set();

  data.forEach((entry) => {
    if (required.some((field) => !String(entry[field] ?? "").trim())) {
      throw new Error(
        `Incomplete language entry: ${entry.id || "without ID"}`,
      );
    }
    if (!["official", "bonus"].includes(entry.category)) {
      throw new Error(`Invalid category for ${entry.id}.`);
    }
    const expectedAudioPath = `assets/audio/languages/${entry.id}.mp3`;
    if (entry.audio !== expectedAudioPath) {
      throw new Error(`Invalid audio path for ${entry.id}.`);
    }
    if (ids.has(entry.id)) throw new Error(`Duplicate ID: ${entry.id}`);
    ids.add(entry.id);
  });

  if (data.filter((entry) => entry.category === "official").length !== 50) {
    throw new Error("There must be exactly 50 official languages.");
  }
}

async function initialize() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    validateData(data);
    languages = data;
    filteredLanguages = data;
    populateContinents();
    render();
  } catch (error) {
    elements.officialList.innerHTML =
      '<p class="error-message">The language data could not be loaded. Please run the site through a local web server.</p>';
    elements.resultCount.textContent = "Loading error";
    console.error("Language data could not be loaded:", error);
  }
}

elements.search.addEventListener("input", applyFilters);
elements.continent.addEventListener("change", applyFilters);
elements.randomButton.addEventListener("click", selectRandomLanguage);

elements.welcome.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    elements.enterButton.focus();
  }
});

elements.enterButton.addEventListener("click", () => {
  elements.welcome.hidden = true;
  document.querySelectorAll("[inert]").forEach((element) => {
    element.inert = false;
  });
  elements.musicToggle.disabled = false;
  elements.music.volume = selectedVolume;
  playMusic();
  elements.randomButton.focus({ preventScroll: true });
});

elements.musicToggle.addEventListener("click", () => {
  if (elements.music.paused) {
    playMusic();
  } else {
    elements.music.pause();
    updateMusicButton();
  }
});

elements.volume.addEventListener("input", () => {
  selectedVolume = Number(elements.volume.value);
  elements.music.volume = isDucking
    ? selectedVolume * DUCKING_FACTOR
    : selectedVolume;
});

elements.music.addEventListener("error", () => {
  elements.musicStatus.textContent = "Optional music file not found.";
  updateMusicButton();
});
elements.music.addEventListener("play", updateMusicButton);
elements.music.addEventListener("pause", updateMusicButton);

window.addEventListener("beforeunload", () => {
  stopLanguagePlayback();
});

initialize();
elements.enterButton.focus();
