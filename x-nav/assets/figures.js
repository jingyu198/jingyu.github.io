"use strict";

(() => {
  const galleries = [...document.querySelectorAll(".paper-gallery")];
  if (!document.querySelector(".paper-figure")) return;

  const controls = new Map();
  for (const gallery of galleries) {
    const links = [...gallery.querySelectorAll(".paper-figure-choice")];
    const panels = [...gallery.querySelectorAll(".paper-gallery-panels > .paper-figure")];
    controls.set(gallery, {links, panels});
  }

  function select(gallery, id) {
    const {links, panels} = controls.get(gallery);
    gallery.dataset.current = id;
    for (const panel of panels) panel.hidden = panel.id !== id;
    for (const link of links) {
      if (link.hash === "#" + id) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  }

  function syncLanguageLinks() {
    const figureHash = /^#fig-\d+$/.test(location.hash);
    for (const link of document.querySelectorAll("a.other-language")) {
      const url = new URL(link.href);
      if (!figureHash && !/^#fig-\d+$/.test(url.hash)) continue;
      url.hash = location.hash;
      link.href = url.href;
    }
  }

  function readLocation(scrollToNewPanel) {
    const target = document.getElementById(location.hash.slice(1));
    const wasHidden = target?.hidden;
    const previous = history.state?.paperFigureSelection || {};
    for (const gallery of galleries) {
      const {panels} = controls.get(gallery);
      const saved = previous[gallery.dataset.initial];
      let selected = gallery.dataset.initial;
      if (panels.some(panel => panel.id === saved)) selected = saved;
      if (panels.includes(target)) selected = target.id;
      select(gallery, selected);
    }
    syncLanguageLinks();
    if (scrollToNewPanel && wasHidden && !target.hidden) target.scrollIntoView({block: "start"});
  }

  for (const gallery of galleries) {
    const {links} = controls.get(gallery);
    for (const [index, link] of links.entries()) {
      link.addEventListener("click", event => {
        if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) return;
        if (location.protocol === "file:") return;
        event.preventDefault();
        select(gallery, link.hash.slice(1));
        if (location.hash !== link.hash) {
          const paperFigureSelection = Object.fromEntries(
            galleries.map(group => [group.dataset.initial, group.dataset.current])
          );
          history.pushState({...history.state, paperFigureSelection}, "", link.hash);
        }
        syncLanguageLinks();
      });
      link.addEventListener("keydown", event => {
        if (event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) return;
        let next;
        switch (event.key) {
          case "ArrowRight": next = (index + 1) % links.length; break;
          case "ArrowLeft": next = (index - 1 + links.length) % links.length; break;
          case "Home": next = 0; break;
          case "End": next = links.length - 1; break;
          default: return;
        }
        event.preventDefault();
        links[next].focus({preventScroll: true});
        links[next].click();
      });
    }
  }

  readLocation(false);
  window.addEventListener("hashchange", () => readLocation(true));
  window.addEventListener("popstate", () => readLocation(true));
})();
