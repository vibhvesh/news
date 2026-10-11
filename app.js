(function () {
  "use strict";
  var CATEGORIES = [
    { key: "All", hi: "सभी" },
    { key: "Khandeha", hi: "खंडेहा" },
    { key: "Chitrakoot", hi: "चित्रकूट" },
    { key: "Prayagraj", hi: "प्रयागराज" },
    { key: "Highway/Toll", hi: "हाईवे/टोल" },
    { key: "Women Safety", hi: "महिला सुरक्षा" }
  ];
  var state = { stories: [], cat: "All", q: "" };
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : "#"; }
  function fmtDate(d) {
    var p = String(d).split("-");
    var dt = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(dt) ? d : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  // A story shows under a tab if its category OR its region matches.
  function inCat(s, cat) { return cat === "All" || s.category === cat || s.region === cat; }
  function matches(s, q) {
    if (!q) return true;
    var hay = [s.title, s.summary, s.category, s.region, s.source_name].join(" ").toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }

  function renderTabs() {
    $("tabs").innerHTML = CATEGORIES.map(function (c) {
      var n = state.stories.filter(function (s) { return inCat(s, c.key); }).length;
      return '<button class="tab" role="tab" data-cat="' + esc(c.key) + '" aria-selected="' + (c.key === state.cat) + '">' +
        esc(c.key) + ' <span lang="hi">' + esc(c.hi) + '</span><span class="count">' + n + "</span></button>";
    }).join("");
  }

  function cardHTML(s) {
    var tag = s.region && s.region !== s.category ? ' · ' + esc(s.region) : "";
    return '<article class="card" id="' + esc(s.id) + '">' +
      '<div class="meta"><a class="cat" href="#cat/' + encodeURIComponent(s.category) + '">' + esc(s.category) + "</a>" + tag +
      ' · <time datetime="' + esc(s.date) + '">' + esc(fmtDate(s.date)) + "</time></div>" +
      '<h2><a href="#story/' + encodeURIComponent(s.id) + '">' + esc(s.title) + "</a></h2>" +
      "<p>" + esc(s.summary) + "</p>" +
      '<div class="links"><a href="' + esc(safeUrl(s.source_url)) + '" target="_blank" rel="noopener noreferrer">Read source: ' + esc(s.source_name) + " ↗</a></div>" +
      "</article>";
  }

  function renderStories() {
    var list = state.stories.filter(function (s) { return inCat(s, state.cat) && matches(s, state.q); });
    var label = state.cat === "All" ? "all categories" : state.cat;
    $("status").textContent = list.length + " stor" + (list.length === 1 ? "y" : "ies") + " in " + label + (state.q ? ' matching "' + state.q + '"' : "");
    if (!list.length) {
      $("stories").innerHTML = '<div class="empty">' + (state.q
        ? "No stories match your search. / कोई खबर नहीं मिली।"
        : "No stories in this category this week. / इस सप्ताह इस श्रेणी में कोई खबर नहीं।") + "</div>";
      return;
    }
    $("stories").innerHTML = list.map(cardHTML).join("");
  }

  function renderTicker() {
    var top = state.stories.slice(0, 5);
    var html = top.map(function (s) {
      return '<a href="#story/' + encodeURIComponent(s.id) + '">' + esc(s.title) + "</a>";
    }).join("");
    $("ticker").innerHTML = html + html; // duplicated for seamless loop
  }

  function openModal(s) {
    $("modal-body").innerHTML =
      '<div class="meta"><span class="cat">' + esc(s.category) + "</span>" +
      (s.region && s.region !== s.category ? " · " + esc(s.region) : "") +
      ' · <time datetime="' + esc(s.date) + '">' + esc(fmtDate(s.date)) + "</time></div>" +
      '<h2 id="modal-title">' + esc(s.title) + "</h2><p>" + esc(s.summary) + "</p>" +
      '<p class="links"><a href="' + esc(safeUrl(s.source_url)) + '" target="_blank" rel="noopener noreferrer">Read full report at ' + esc(s.source_name) + " ↗</a></p>" +
      '<p class="small" style="color:var(--muted)">Summary of a report by ' + esc(s.source_name) + ". Details as published by the source.</p>";
    $("modal").hidden = false;
    document.body.style.overflow = "hidden";
    $("modal").querySelector(".modal-close").focus();
  }
  function closeModal() {
    $("modal").hidden = true;
    document.body.style.overflow = "";
  }

  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ""));
    var story = null;
    if (h.indexOf("story/") === 0) {
      story = state.stories.find(function (x) { return x.id === h.slice(6); }) || null;
    }
    if (h.indexOf("cat/") === 0) {
      var c = h.slice(4);
      if (CATEGORIES.some(function (x) { return x.key === c; })) state.cat = c;
    } else if (h === "") {
      state.cat = state.cat || "All";
    }
    renderTabs();
    renderStories();
    if (story) openModal(story); else closeModal();
  }

  function init() {
    var now = new Date();
    $("today").textContent = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }) +
      " · " + now.toLocaleDateString("hi-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
    $("year").textContent = now.getFullYear();

    $("tabs").addEventListener("click", function (e) {
      var b = e.target.closest(".tab");
      if (!b) return;
      state.cat = b.getAttribute("data-cat");
      history.replaceState(null, "", state.cat === "All" ? location.pathname : "#cat/" + encodeURIComponent(state.cat));
      renderTabs(); renderStories();
    });
    var t;
    $("search").addEventListener("input", function (e) {
      clearTimeout(t);
      t = setTimeout(function () { state.q = e.target.value.trim(); renderStories(); }, 120);
    });
    $("modal").addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-close")) {
        history.pushState(null, "", state.cat === "All" ? location.pathname : "#cat/" + encodeURIComponent(state.cat));
        closeModal();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("modal").hidden) $("modal").querySelector(".modal-close").click();
    });
    window.addEventListener("hashchange", route);

    fetch("stories.json?v=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        state.stories = (data.stories || []).slice().sort(function (a, b) {
          return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
        });
        var m = data.meta || {};
        $("last-updated").textContent = m.last_updated_display || m.last_updated || "—";
        if (m.last_updated) $("last-updated").setAttribute("datetime", m.last_updated);
        var fb = document.querySelector(".fallback");
        if (fb) fb.remove();
        renderTicker();
        route();
      })
      .catch(function (err) {
        $("status").textContent = "Could not load stories (" + err.message + "). If opening the file directly, serve the folder over HTTP.";
      });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
