"use strict";

const player = document.getElementById("film-player");
const filmDetail = document.getElementById("film-detail");
const filmChoices = [...document.querySelectorAll(".film-choice")];
const films = new Map(filmChoices.map(choice => [choice.dataset.film, choice]));
const language = document.documentElement.lang.startsWith("zh") ? "zh" : "en";
const firstFilm = filmChoices[0].dataset.film;
let selectedFilm = firstFilm;
let pendingSeek = null;

function applySeek() {
  if (pendingSeek === null || player.readyState < 1 || !Number.isFinite(player.duration)) return;
  const time = Math.min(pendingSeek, Math.max(0, player.duration - 0.1));
  pendingSeek = null;
  player.currentTime = time;
}

player.addEventListener("loadedmetadata", applySeek);

function selectFilm(name, {time = null, play = false} = {}) {
  const choice = films.get(name);
  if (!choice) return;
  pendingSeek = Number.isFinite(time) && time >= 0 ? time : null;
  if (name !== selectedFilm) {
    player.pause();
    selectedFilm = name;
    for (const item of filmChoices) {
      if (item === choice) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    }
    player.setAttribute("aria-label", choice.querySelector("strong").textContent);
    player.poster = choice.querySelector("img").src;
    filmDetail.textContent = choice.dataset.detail;
    player.querySelector("source").src = choice.href;
    player.querySelector("a").href = choice.href;
    for (const track of player.querySelectorAll("track")) {
      track.src = choice.href.replace(/\.mp4$/, "." + track.srclang + ".vtt");
    }
    player.preload = pendingSeek === null && !play ? "none" : "metadata";
    player.load();
  } else if (pendingSeek !== null && player.readyState < 1) {
    player.preload = "metadata";
    player.load();
  }
  applySeek();
  if (play) player.play().catch(() => { /* Native controls remain available. */ });
}

function readLocation() {
  const params = new URLSearchParams(location.search);
  const requested = params.get("film");
  const time = params.has("t") ? Number(params.get("t")) : null;
  selectFilm(films.has(requested) ? requested : firstFilm, {time});
}

function markFilmInLocation(name, time = null) {
  const url = new URL(location.href);
  url.hash = "films";
  url.searchParams.set("film", name);
  if (time === null) url.searchParams.delete("t");
  else url.searchParams.set("t", String(time));
  if (location.protocol !== "file:") history.replaceState(null, "", url);
}

function plainClick(event) {
  return !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0;
}

for (const choice of filmChoices) {
  choice.addEventListener("click", event => {
    if (!plainClick(event)) return;
    event.preventDefault();
    selectFilm(choice.dataset.film, {play: true});
    markFilmInLocation(choice.dataset.film);
  });
}

for (const waypoint of document.querySelectorAll(".event")) {
  waypoint.addEventListener("click", event => {
    if (!plainClick(event)) return;
    event.preventDefault();
    const time = Number(waypoint.dataset.time);
    selectFilm("demo-extended", {time, play: true});
    markFilmInLocation("demo-extended", time);
    document.getElementById("films").scrollIntoView({block: "start"});
  });
}

document.querySelector(".primary").addEventListener("click", event => {
  if (!plainClick(event)) return;
  event.preventDefault();
  selectFilm(firstFilm, {time: 0, play: true});
  markFilmInLocation(firstFilm, 0);
  document.getElementById("films").scrollIntoView({block: "start"});
});

const languageLink = document.querySelector(".other-language");
const languageTarget = new URL(languageLink.href);
function syncLanguageLink() {
  const translated = new URL(languageTarget);
  translated.hash = location.hash;
  if (selectedFilm !== firstFilm || location.hash === "#films") {
    translated.searchParams.set("film", selectedFilm);
    const time = pendingSeek ?? player.currentTime;
    if (time > 0) translated.searchParams.set("t", String(Math.floor(time)));
  }
  languageLink.href = translated.href;
}
languageLink.addEventListener("focus", syncLanguageLink);
languageLink.addEventListener("pointerdown", syncLanguageLink);
languageLink.addEventListener("click", syncLanguageLink);
window.addEventListener("popstate", readLocation);
readLocation();

const menuButton = document.querySelector(".menu");
const mobileNav = document.getElementById("small-nav");
function setMenu(open) {
  menuButton.setAttribute("aria-expanded", String(open));
  mobileNav.hidden = !open;
}
menuButton.addEventListener("click", () => setMenu(mobileNav.hidden));
mobileNav.addEventListener("click", event => {
  if (event.target.closest("a")) setMenu(false);
});
window.matchMedia("(min-width: 43.01rem)").addEventListener("change", event => {
  if (event.matches) setMenu(false);
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !mobileNav.hidden) {
    setMenu(false);
    menuButton.focus();
  }
});

const citation = document.getElementById("bibtex");
const copyButton = document.getElementById("copy-citation");
const copyLabel = copyButton.textContent;
copyButton.setAttribute("aria-live", "polite");
let resetCopy;
copyButton.addEventListener("click", async () => {
  clearTimeout(resetCopy);
  try {
    await navigator.clipboard.writeText(citation.textContent);
    copyButton.textContent = copyButton.dataset.copied;
  } catch {
    const range = document.createRange();
    range.selectNodeContents(citation);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    copyButton.textContent = document.execCommand("copy") ? copyButton.dataset.copied : copyButton.dataset.failed;
  }
  resetCopy = setTimeout(() => { copyButton.textContent = copyLabel; }, 2500);
});
