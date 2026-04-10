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
const voteStorageKey = "gender-reveal-vote-choice-v2";
const voterNameStorageKey = "gender-reveal-voter-name-v2";
const totalsStorageKey = "gender-reveal-vote-totals-v2";
const fallbackVoteTotals = { girl: 8, boy: 8 };
const voteWebhookUrl =
  "https://flows.soul23.cloud/webhook/87701460-f93a-4303-a6f4-83ff280967cc";

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
}

async function handleVoteSelection(selectedOption) {
  const existingVote = localStorage.getItem(voteStorageKey);
  const totals = readVoteTotals();

  if (existingVote) {
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

  try {
    await sendVoteToWebhook({ name: normalizedName, option: selectedOption });
  } catch {
    setVoteFeedback("No se pudo registrar tu voto. Intenta de nuevo.");
    return;
  }

  totals[selectedOption] += 1;
  localStorage.setItem(voteStorageKey, selectedOption);
  localStorage.setItem(voterNameStorageKey, normalizedName);
  saveVoteTotals(totals);
  renderVoteResults(totals);
  setVoteFeedback(
    selectedOption === "girl"
      ? `${normalizedName}, tu voto por niña fue registrado.`
      : `${normalizedName}, tu voto por niño fue registrado.`
  );
  lockVoteButtons();
}

if (voteFigure && voteImage) {
  const existingVote = localStorage.getItem(voteStorageKey);
  if (existingVote) {
    const storedName = localStorage.getItem(voterNameStorageKey);
    renderVoteResults(readVoteTotals());
    setVoteFeedback(
      existingVote === "girl"
        ? `Ya votaste por niña${storedName ? `, ${storedName}` : ""}.`
        : `Ya votaste por niño${storedName ? `, ${storedName}` : ""}.`
    );
    lockVoteButtons();
  }

  voteFigure.addEventListener("click", (event) => {
    const existingSelection = localStorage.getItem(voteStorageKey);
    if (existingSelection) {
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
