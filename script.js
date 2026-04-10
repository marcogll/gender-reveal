const openButton = document.querySelector("#openInvitation");
const closeButton = document.querySelector("#closeInvitation");
const heroScreen = document.querySelector("#portada");
const inviteScreen = document.querySelector("#invitacion");
const calendarLink = document.querySelector('[data-action="calendar"]');
const inviteAudio = document.querySelector("#inviteAudio");

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
