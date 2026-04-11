const openButton = document.querySelector("#openInvitation");
const closeButton = document.querySelector("#closeInvitation");
const heroScreen = document.querySelector("#portada");
const inviteScreen = document.querySelector("#invitacion");
const calendarLink = document.querySelector('[data-action="calendar"]');
const inviteAudio = document.querySelector("#inviteAudio");
const audioToggleButton = document.querySelector("#audioToggle");
const audioToggleIcon = document.querySelector("#audioToggleIcon");
const inviteTitle = document.querySelector(".title");
const voteFigure = document.querySelector(".vote-figure");
const voteImage = document.querySelector(".vote-figure img");
const voteButtons = document.querySelectorAll("[data-vote-option]");
const voteFeedback = document.querySelector("#voteFeedback");
const voteResults = document.querySelector("#voteResults");
const girlVoteFill = document.querySelector("#girlVoteFill");
const boyVoteFill = document.querySelector("#boyVoteFill");
const girlVotePercent = document.querySelector("#girlVotePercent");
const boyVotePercent = document.querySelector("#boyVotePercent");
const searchParams = new URLSearchParams(window.location.search);
const isVoteTestMode = searchParams.has("test-votes");
const voteStorageKey = "gender-reveal-vote-choice-v3";
const voterNameStorageKey = "gender-reveal-voter-name-v3";
const totalsStorageKey = "gender-reveal-vote-totals-v3";
const fallbackVoteTotals = { girl: 0, boy: 0 };
const voteWebhookUrl = "/api/vote";
const voteResultsWebhookUrl = "/api/results";
const voteResultsAuthHeader = "TU_TOKEN_AQUI";

function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
}

function normalizeVoteOption(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) {
    return null;
  }

  if (["girl", "nina", "niña", "female", "femenino"].includes(normalizedValue)) {
    return "girl";
  }

  if (["boy", "nino", "niño", "male", "masculino"].includes(normalizedValue)) {
    return "boy";
  }

  return null;
}

function aggregateVoteTotals(items) {
  if (!Array.isArray(items)) {
    return null;
  }

  const aggregatedTotals = { girl: 0, boy: 0 };
  let foundVotes = false;

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const option = normalizeVoteOption(
      item.vote ?? item.option ?? item.choice ?? item.gender ?? item.prediction
    );

    if (!option) {
      continue;
    }

    aggregatedTotals[option] += 1;
    foundVotes = true;
  }

  return foundVotes ? aggregatedTotals : null;
}

function extractVoteTotals(payload) {
  const queue = [payload];
  const visitedSources = new Set();

  while (queue.length > 0) {
    const source = queue.shift();
    if (!source || visitedSources.has(source)) {
      continue;
    }

    visitedSources.add(source);

    const aggregatedTotals = aggregateVoteTotals(source);
    if (aggregatedTotals) {
      return aggregatedTotals;
    }

    if (typeof source !== "object") {
      continue;
    }

    const girl = toFiniteNumber(source.girl);
    const boy = toFiniteNumber(source.boy);
    if (
      girl !== null &&
      boy !== null
    ) {
      return { girl, boy };
    }

    const nina = toFiniteNumber(source.nina);
    const nino = toFiniteNumber(source.nino);
    if (
      nina !== null &&
      nino !== null
    ) {
      return { girl: nina, boy: nino };
    }

    const girlVotesSnake = toFiniteNumber(source.girl_votes);
    const boyVotesSnake = toFiniteNumber(source.boy_votes);
    if (
      girlVotesSnake !== null &&
      boyVotesSnake !== null
    ) {
      return { girl: girlVotesSnake, boy: boyVotesSnake };
    }

    const girlVotesCamel = toFiniteNumber(source.girlVotes);
    const boyVotesCamel = toFiniteNumber(source.boyVotes);
    if (
      girlVotesCamel !== null &&
      boyVotesCamel !== null
    ) {
      return { girl: girlVotesCamel, boy: boyVotesCamel };
    }

    const ninaVotos = toFiniteNumber(source["niña_votos"]);
    const ninoVotos = toFiniteNumber(source["niño_votos"]);
    if (
      ninaVotos !== null &&
      ninoVotos !== null
    ) {
      return { girl: ninaVotos, boy: ninoVotos };
    }

    queue.push(
      source.data,
      source.totals,
      source.results,
      source.vote_totals,
      source.voteTotals,
      source.records,
      source.items,
      source.votes
    );
  }

  return null;
}

function updateAudioToggleState() {
  if (!audioToggleButton || !audioToggleIcon || !inviteAudio) {
    return;
  }

  const isMuted = inviteAudio.muted;
  audioToggleButton.setAttribute("aria-pressed", String(!isMuted));
  audioToggleButton.setAttribute(
    "aria-label",
    isMuted ? "Activar música" : "Silenciar música"
  );
  audioToggleIcon.textContent = isMuted ? "volume_off" : "volume_up";
}

function updateAudioToggleVisibility() {
  if (!audioToggleButton || !inviteScreen) {
    return;
  }

  const isInviteVisible = inviteScreen.classList.contains("is-active");
  audioToggleButton.hidden = !isInviteVisible;
  audioToggleButton.classList.toggle("is-hidden", !isInviteVisible);
}

function updateAudioTogglePosition() {
  if (!audioToggleButton || !inviteTitle || audioToggleButton.hidden) {
    return;
  }

  const titleBounds = inviteTitle.getBoundingClientRect();
  const buttonSize = audioToggleButton.offsetWidth || 56;
  const reservedRight = 18;
  const defaultBottom = 20;
  const reservedLeft = window.innerWidth - reservedRight - buttonSize;
  const reservedTop = window.innerHeight - defaultBottom - buttonSize;
  const overlapsTitle =
    titleBounds.right >= reservedLeft &&
    titleBounds.left <= window.innerWidth - reservedRight &&
    titleBounds.bottom >= reservedTop &&
    titleBounds.top <= window.innerHeight - defaultBottom;

  audioToggleButton.classList.toggle("is-raised", overlapsTitle);
}

function readVoteTotals() {
  try {
    const storedTotals = JSON.parse(localStorage.getItem(totalsStorageKey));
    if (
      storedTotals &&
      Number.isFinite(storedTotals.girl) &&
      Number.isFinite(storedTotals.boy)
    ) {
      return storedTotals;
    }
  } catch {}

  return { ...fallbackVoteTotals };
}

function saveVoteTotals(totals) {
  localStorage.setItem(totalsStorageKey, JSON.stringify(totals));
}

function renderVoteResults(totals) {
  if (!voteResults || !girlVoteFill || !boyVoteFill || !girlVotePercent || !boyVotePercent) {
    return;
  }

  const totalVotes = totals.girl + totals.boy;
  const girlPercent = totalVotes === 0 ? 0 : Math.round((totals.girl / totalVotes) * 100);
  const boyPercent = totalVotes === 0 ? 0 : 100 - girlPercent;

  voteResults.hidden = false;
  girlVoteFill.style.width = `${girlPercent}%`;
  boyVoteFill.style.width = `${boyPercent}%`;
  girlVotePercent.textContent = `${girlPercent}%`;
  boyVotePercent.textContent = `${boyPercent}%`;
}

function setVoteFeedback(message) {
  if (!voteFeedback) {
    return;
  }

  voteFeedback.textContent = message;
  voteFeedback.classList.toggle("is-visible", Boolean(message));
}

function lockVoteButtons() {
  voteButtons.forEach((button) => {
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
  });
}

async function sendVoteToWebhook({ name, option }) {
  const response = await fetch(voteWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      voter_name: name,
      vote: option,
      voted_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook responded with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  const payload = await response.json();
  return extractVoteTotals(payload);
}

async function fetchLatestVoteTotals() {
  const response = await fetch(voteResultsWebhookUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: voteResultsAuthHeader,
    },
  });

  if (!response.ok) {
    throw new Error(`Webhook responded with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  const payload = await response.json();
  return extractVoteTotals(payload);
}

async function handleVoteSelection(selectedOption) {
  const existingVote = localStorage.getItem(voteStorageKey);
  let totals = readVoteTotals();

  if (existingVote && !isVoteTestMode) {
    const storedName = localStorage.getItem(voterNameStorageKey);
    renderVoteResults(totals);
    setVoteFeedback(
      existingVote === "girl"
        ? `Ya votaste por niña${storedName ? `, ${storedName}` : ""}.`
        : `Ya votaste por niño${storedName ? `, ${storedName}` : ""}.`
    );
    lockVoteButtons();
    return;
  }

  const voteLabel = selectedOption === "girl" ? "NIÑA" : "NIÑO";
  const voterName = window.prompt("Escribe tu nombre para registrar tu voto:");

  if (voterName === null) {
    setVoteFeedback("Registro cancelado.");
    return;
  }

  const normalizedName = voterName.trim();
  if (!normalizedName) {
    setVoteFeedback("Escribe tu nombre para continuar.");
    return;
  }

  const isConfirmed = window.confirm(
    `${normalizedName}, tu voto será por ${voteLabel}. ¿Estás seguro?`
  );

  if (!isConfirmed) {
    setVoteFeedback("Voto cancelado.");
    return;
  }

  if (isVoteTestMode) {
    totals[selectedOption] += 1;
  } else {
    try {
      const webhookTotals = await sendVoteToWebhook({
        name: normalizedName,
        option: selectedOption,
      });
      if (webhookTotals) {
        totals = webhookTotals;
      } else {
        totals[selectedOption] += 1;
      }
    } catch {
      setVoteFeedback("No se pudo registrar tu voto. Intenta de nuevo.");
      return;
    }
  }

  if (!isVoteTestMode) {
    localStorage.setItem(voteStorageKey, selectedOption);
    localStorage.setItem(voterNameStorageKey, normalizedName);
  }
  saveVoteTotals(totals);
  renderVoteResults(totals);
  setVoteFeedback(
    isVoteTestMode
      ? selectedOption === "girl"
        ? `${normalizedName}, voto de prueba por niña registrado.`
        : `${normalizedName}, voto de prueba por niño registrado.`
      : selectedOption === "girl"
        ? `${normalizedName}, tu voto por niña fue registrado.`
        : `${normalizedName}, tu voto por niño fue registrado.`
  );
  if (!isVoteTestMode) {
    lockVoteButtons();
  }
}

if (voteFigure && voteImage) {
  const existingVote = localStorage.getItem(voteStorageKey);
  if (existingVote && !isVoteTestMode) {
    const storedName = localStorage.getItem(voterNameStorageKey);
    renderVoteResults(readVoteTotals());
    setVoteFeedback(
      existingVote === "girl"
        ? `Ya votaste por niña${storedName ? `, ${storedName}` : ""}.`
        : `Ya votaste por niño${storedName ? `, ${storedName}` : ""}.`
    );
    lockVoteButtons();
  }

  if (!isVoteTestMode) {
    void fetchLatestVoteTotals()
      .then((totals) => {
        if (!totals) {
          return;
        }

        saveVoteTotals(totals);
        renderVoteResults(totals);
      })
      .catch(() => {});
  } else {
    renderVoteResults(readVoteTotals());
    setVoteFeedback("Modo test activo: puedes registrar varios votos aquí.");
  }

  voteFigure.addEventListener("click", (event) => {
    const existingSelection = localStorage.getItem(voteStorageKey);
    if (existingSelection && !isVoteTestMode) {
      void handleVoteSelection(existingSelection);
      return;
    }

    const imageBounds = voteImage.getBoundingClientRect();
    const clickX = event.clientX;
    const clickY = event.clientY;
    const isInsideImage =
      clickX >= imageBounds.left &&
      clickX <= imageBounds.right &&
      clickY >= imageBounds.top &&
      clickY <= imageBounds.bottom;

    if (!isInsideImage) {
      return;
    }

    const midpoint = imageBounds.left + imageBounds.width / 2;
    void handleVoteSelection(clickX < midpoint ? "girl" : "boy");
  });
}

if (audioToggleButton && inviteAudio) {
  updateAudioToggleState();
  updateAudioToggleVisibility();
  updateAudioTogglePosition();

  audioToggleButton.addEventListener("click", () => {
    inviteAudio.muted = !inviteAudio.muted;
    updateAudioToggleState();
  });

  inviteAudio.addEventListener("volumechange", updateAudioToggleState);
  window.addEventListener("scroll", updateAudioTogglePosition, { passive: true });
  window.addEventListener("resize", updateAudioTogglePosition);
}

if (openButton && heroScreen && inviteScreen) {
  openButton.addEventListener("click", () => {
    heroScreen.classList.add("is-hidden");
    heroScreen.classList.remove("is-active");
    inviteScreen.classList.add("is-active");
    inviteScreen.setAttribute("aria-hidden", "false");
    if (inviteAudio) {
      inviteAudio.volume = 0.45;
      inviteAudio.play().catch(() => {});
    }
    updateAudioToggleVisibility();
    updateAudioToggleState();
    updateAudioTogglePosition();
  });
}

if (closeButton && heroScreen && inviteScreen) {
  closeButton.addEventListener("click", () => {
    inviteScreen.classList.remove("is-active");
    inviteScreen.setAttribute("aria-hidden", "true");
    heroScreen.classList.add("is-active");
    heroScreen.classList.remove("is-hidden");
    if (inviteAudio) {
      inviteAudio.pause();
      inviteAudio.currentTime = 0;
    }
    updateAudioToggleVisibility();
  });
}

if (calendarLink) {
  const calendarUrl = new URL("https://calendar.google.com/calendar/render");
  calendarUrl.searchParams.set("action", "TEMPLATE");
  calendarUrl.searchParams.set("text", "Gender Reveal de Ale y Marco");
  calendarUrl.searchParams.set("details", "Acompáñanos a celebrar nuestro gender reveal.");
  calendarUrl.searchParams.set(
    "location",
    "C. Salvador Galindo 225, La Aurora, Saltillo, Coah."
  );
  calendarUrl.searchParams.set("dates", "20260426T213000Z/20260426T233000Z");
  calendarLink.setAttribute("href", calendarUrl.toString());
  calendarLink.setAttribute("target", "_blank");
  calendarLink.setAttribute("rel", "noreferrer");
}
