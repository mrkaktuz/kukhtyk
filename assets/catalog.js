/* Каталог продуктів і рецептів. Дані: window.DATASETS[<body data-dataset>]. */
(function () {
  var D = window.DATASETS[document.body.getAttribute("data-dataset")];
  if (!D) return;
  var P = D.P, R = D.R, PCATS = D.PCATS, RCATS = D.RCATS, MIN = D.MIN, MAX = D.MAX;
  P.forEach(function (p, i) { p.id = "p" + i; });
  var RMAP = {}; R.forEach(function (r) { RMAP[r.id] = r; });
  var state = { tab: "p", q: "", cat: { p: "Усі", r: "Усі" }, open: false };
  var $ = function (id) { return document.getElementById(id); };
  var $list = $("list"), $count = $("count"), $chips = $("chips"), $q = $("q"), $tog = $("toggleAll"), $legend = $("legend");

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function plural(n, a, b, c) { var m = n % 10, k = n % 100; if (m === 1 && k !== 11) return a; if (m >= 2 && m <= 4 && (k < 12 || k > 14)) return b; return c; }
  function icon(cat) { return window.ico(D.ICONS[cat] || "bowl"); }

  function renderChips() {
    var cats = state.tab === "p" ? PCATS : RCATS, cur = state.cat[state.tab];
    $chips.innerHTML = cats.map(function (c) {
      return '<button type="button" class="chip" data-cat="' + esc(c) + '" aria-pressed="' + (cur === c) + '">' + (c === "Усі" ? "" : icon(c)) + esc(c) + "</button>";
    }).join("");
  }

  function pHTML(d) {
    var left = (d.a - MIN) / (MAX - MIN) * 100, width = Math.max((d.b - d.a) / (MAX - MIN) * 100, 2.5);
    if (left < 0) left = 0; if (left + width > 100) left = 100 - width;
    var cls = D.heat(d);
    var body = "<dl><div><dt>Підготовка</dt><dd>" + esc(d.p) + "</dd></div>" +
      (d.d ? "<div><dt>Процес</dt><dd>" + esc(d.d) + "</dd></div>" : "") +
      "<div><dt>Ознака готовності</dt><dd>" + esc(d.r) + "</dd></div></dl>" +
      (d.tip ? '<div class="tip">' + esc(d.tip) + "</div>" : "") +
      (d.rec ? '<div class="recs">' + d.rec.map(function (id) { return '<button type="button" class="rec-btn" data-rec="' + id + '">Рецепт: ' + esc(RMAP[id].n) + " →</button>"; }).join("") + "</div>" : "");
    return '<details class="item" id="' + d.id + '"' + (state.open ? " open" : "") + "><summary>" +
      '<span class="badge-ico">' + icon(d.c) + "</span>" +
      '<span class="name">' + esc(d.n) + (d.sub ? "<small>" + esc(d.sub) + "</small>" : "") + "</span>" +
      '<span class="temp">' + esc(d.t) + "</span>" +
      '<span class="bar"><span class="fill ' + cls + '" style="left:' + left.toFixed(1) + "%;width:" + width.toFixed(1) + '%"></span></span>' +
      '<span class="time"><span>' + D.timeLabel + '</span><span class="t">' + esc(d.h) + "</span></span>" +
      '</summary><div class="body">' + body + "</div></details>";
  }

  function rHTML(r) {
    return '<details class="item" id="r-' + r.id + '"' + (state.open ? " open" : "") + "><summary>" +
      '<span class="badge-ico">' + icon(r.c) + "</span>" +
      '<span class="name">' + esc(r.n) + (r.src ? '<span class="src">Liberton</span>' : "") + "<small>" + esc(r.m) + "</small></span>" +
      '<span class="temp tt" title="Підготовка ' + esc(r.pr) + ' + готування ' + esc(r.ck) + '">' + window.ico("clock") + esc(r.tt) + "</span>" +
      '</summary><div class="body">' +
      '<dl class="times"><div><dt>Підготовка</dt><dd>' + esc(r.pr) + '</dd></div><div><dt>Готування</dt><dd>' + esc(r.ck) + '</dd></div><div><dt>Разом</dt><dd>' + esc(r.tt) + "</dd></div></dl>" +
      "<div><h4>Інгредієнти</h4><ul class=\"ing\">" + r.ing.map(function (i) { return "<li><span>" + esc(i[0]) + '</span><span class="q">' + esc(i[1]) + "</span></li>"; }).join("") + "</ul></div>" +
      "<div><h4>Приготування</h4><ol class=\"steps\">" + r.st.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></div>" +
      ((r.rd || r.sto) ? "<dl>" + (r.rd ? "<div><dt>Ознаки готовності</dt><dd>" + esc(r.rd) + "</dd></div>" : "") + (r.sto ? "<div><dt>Зберігання</dt><dd>" + esc(r.sto) + "</dd></div>" : "") + "</dl>" : "") +
      (r.note ? '<div class="tip">' + esc(r.note) + "</div>" : "") +
      (r.book ? '<div class="tip book"><b>У книзі Liberton:</b> ' + esc(r.book) + "</div>" : "") +
      (r.src ? '<div class="tip book">Рецепт із фірмової книги рецептів Liberton, адаптований і доповнений.</div>' : "") +
      "</div></details>";
  }

  function match(text, q) { return text.toLowerCase().indexOf(q) !== -1; }
  function filtered(tab) {
    var q = state.q.trim().toLowerCase(), cat = state.cat[tab];
    if (tab === "p") return P.filter(function (d) {
      if (cat !== "Усі" && d.c !== cat) return false;
      return !q || match([d.n, d.sub, d.c, d.p, d.d, d.tip].join(" "), q);
    });
    return R.filter(function (r) {
      if (cat !== "Усі" && r.c !== cat) return false;
      return !q || match([r.n, r.c, r.m, r.ing.map(function (i) { return i[0]; }).join(" "), r.st.join(" ")].join(" "), q);
    });
  }

  function render() {
    var tab = state.tab, rows = filtered(tab);
    $("n-p").textContent = filtered("p").length;
    $("n-r").textContent = filtered("r").length;
    $legend.hidden = tab !== "p";
    $count.textContent = rows.length + " " + (tab === "p" ? plural(rows.length, "продукт", "продукти", "продуктів") : plural(rows.length, "рецепт", "рецепти", "рецептів"));
    if (!rows.length) { $list.innerHTML = '<div class="empty">Нічого не знайдено. Спробуйте інше слово, іншу вкладку або оберіть «Усі».</div>'; return; }
    var fn = tab === "p" ? pHTML : rHTML, cats = tab === "p" ? PCATS : RCATS, html = "";
    if (state.cat[tab] === "Усі" && !state.q.trim()) {
      cats.slice(1).forEach(function (c) {
        var g = rows.filter(function (d) { return d.c === c; });
        if (g.length) html += '<div class="group-title">' + icon(c) + esc(c) + "</div>" + g.map(fn).join("");
      });
    } else html = rows.map(fn).join("");
    $list.innerHTML = html;
  }

  function setTab(t) {
    state.tab = t;
    $("tab-p").setAttribute("aria-selected", t === "p");
    $("tab-r").setAttribute("aria-selected", t === "r");
    renderChips(); render();
  }
  function reveal(tab, elId) {
    state.q = ""; $q.value = ""; state.cat[tab] = "Усі"; setTab(tab);
    var el = document.getElementById(elId);
    if (el) { el.open = true; setTimeout(function () { el.scrollIntoView({ block: "start", behavior: "instant" }); }, 60); }
  }

  document.querySelector(".tabs").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]"); if (b) setTab(b.getAttribute("data-tab"));
  });
  $chips.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-cat]"); if (!b) return;
    state.cat[state.tab] = b.getAttribute("data-cat"); renderChips(); render();
  });
  $q.addEventListener("input", function () {
    state.q = $q.value;
    if (state.q.trim() && !filtered(state.tab).length) {
      var other = state.tab === "p" ? "r" : "p";
      if (filtered(other).length) { setTab(other); return; }
    }
    render();
  });
  $list.addEventListener("click", function (e) {
    var b = e.target.closest("[data-rec]"); if (b) reveal("r", "r-" + b.getAttribute("data-rec"));
  });
  $tog.addEventListener("click", function () {
    state.open = !state.open;
    $tog.textContent = state.open ? "Згорнути все" : "Розгорнути все";
    var all = $list.querySelectorAll("details.item");
    for (var i = 0; i < all.length; i++) all[i].open = state.open;
  });

  renderChips(); render();
  function fromHash() {
    var h = (location.hash || "").slice(1);
    if (/^r-/.test(h) && RMAP[h.slice(2)]) reveal("r", h);
    else if (/^p\d+$/.test(h) && P[+h.slice(1)]) reveal("p", h);
  }
  fromHash();
  window.addEventListener("hashchange", fromHash);
})();
