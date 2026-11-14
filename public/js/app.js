(() => {
  "use strict";
  const C = { lime: "#c8ff00", pink: "#ff2d6a", blue: "#3d7eff", blue2: "#7eb0ff", teal: "#00ffd0", orange: "#ff8c00", violet: "#c45cff", ink: "#f4f4f0", dim: "#2c2c38", nodata: "#4a4a55" };
  const NOTES = {
    "Wainscott Common SD": "Common school district; not in the state Property Tax Report Card, so no budget or levy figures.",
    "Sagaponack Common SD": "Common school district; not in the state Property Tax Report Card, so no budget or levy figures.",
    "Little Flower UFSD": "Special act district serving the Little Flower residential facility in Wading River; no public budget vote and not in the Property Tax Report Card. No boundary of its own; pin only.",
    "New Suffolk Common SD": "Non-instructional since 2024-25 (students tuitioned to Southold). No state enrollment record for 2024-25 or 2025-26 (8 students PK-12 in 2023-24) and not in the Property Tax Report Card.",
  };
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NR = '<span class="nr">Not reported</span>';
  const money = (v) => v == null ? NR : v >= 1e9 ? "$" + (v / 1e9).toFixed(2) + "B" : "$" + (v / 1e6).toFixed(1) + "M";
  const dollars = (v) => v == null ? NR : "$" + Math.round(v).toLocaleString("en-US");
  const int = (v) => v == null ? NR : Math.round(v).toLocaleString("en-US");
  const pct = (v, d = 1) => v == null ? NR : (v > 0 ? "+" : "") + v.toFixed(d) + "%";
  const cls = (v) => v == null ? "" : v > 0 ? "up" : v < 0 ? "down" : "flat";
  const isCHS = (d) => d.name.includes("Central HS");
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const sum = (xs) => xs.reduce((a, b) => a + (b || 0), 0);
  const short = (n) => n.replace(/ (UFSD|CSD|City SD|Common SD|SD)$/, "").replace(" Central HS District", " Central HS");

  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const ramp = (stops, v) => {
    if (v == null) return C.nodata;
    if (v <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (v <= stops[i][0]) {
        const [a, ca] = stops[i - 1], [b, cb] = stops[i], t = (v - a) / (b - a), x = hex(ca), y = hex(cb);
        return "rgb(" + x.map((q, k) => Math.round(q + (y[k] - q) * t)).join(",") + ")";
      }
    }
    return stops[stops.length - 1][1];
  };
  const MODES = [
    { id: "pp", label: "Per pupil", legend: "Proposed 2026-27 budget per pupil", stops: [[29000, C.blue], [42000, C.teal], [60000, C.lime], [100000, C.pink]], ticks: ["$29K", "$42K median", "$100K+"], get: (d) => (isCHS(d) ? null : d.pp) },
    { id: "budchg", label: "Budget change", legend: "Budget change, 2025-26 to 2026-27", stops: [[-1, C.teal], [1.5, C.blue], [3.5, C.lime], [7, C.pink]], ticks: ["-1%", "+3.5%", "+7%"], get: (d) => d.budchg },
    { id: "levychg", label: "Levy change", legend: "Tax levy change, 2025-26 to 2026-27", stops: [[0, C.teal], [2, C.blue], [3, C.lime], [6, C.pink]], ticks: ["0%", "+3%", "+6%"], get: (d) => d.levychg },
    { id: "k12chg", label: "Enrollment change", legend: "K-12 students, fall 2024 to fall 2025", stops: [[-8, C.pink], [-3, C.orange], [0, C.blue], [4, C.lime]], ticks: ["-8%", "0%", "+4%"], get: (d) => d.k12chg },
    { id: "county", label: "County", legend: "Nassau and Suffolk", cats: [["Nassau", C.blue], ["Suffolk", C.lime]], get: (d) => d.county },
  ];
  const colorOf = (m, d) => m.cats ? (d.county === "Nassau" ? C.blue : C.lime) : ramp(m.stops, m.get(d));

  Promise.all([fetch("data/districts.json").then((r) => r.json()), fetch("data/boundaries.geojson").then((r) => r.json())]).then(([D, G]) => init(D, G));

  function init(DATA, GEO) {
    const B = DATA.filter((d) => d.bud27 != null);
    const S = (county) => {
      const b = B.filter((d) => !county || d.county === county), e = DATA.filter((d) => (!county || d.county === county) && d.pk12 != null);
      const bud = sum(b.map((d) => d.bud27)), bud0 = sum(b.map((d) => d.bud26)), lev = sum(b.map((d) => d.levy27)), lev0 = sum(b.map((d) => d.levy26));
      const K = sum(e.map((d) => d.k12)), K0 = sum(e.map((d) => d.k12 / (1 + d.k12chg / 100)));
      return { n: DATA.filter((d) => !county || d.county === county).length, bud, budchg: (bud / bud0 - 1) * 100, lev, levchg: (lev / lev0 - 1) * 100, pk12: sum(e.map((d) => d.pk12)), k12chg: (K / K0 - 1) * 100, medpp: median(b.map((d) => d.pp)), pp: bud / sum(b.map((d) => d.enr27)), dec: e.filter((d) => d.k12chg < 0).length, ne: e.length, over: b.filter((d) => d.cap != null && d.cap < 0) };
    };
    const LI = S(null), NAS = S("Nassau"), SUF = S("Suffolk");

    // Hero stats
    const stat = (n, l, s, c) => `<div class="stat"><span class="n ${c}">${n}</span><span class="l">${l}</span><span class="s">${s}</span></div>`;
    $("#hero-stats").innerHTML = [
      stat("125", "Districts", "56 Nassau · 69 Suffolk", "c-lime"),
      stat("$" + (LI.bud / 1e9).toFixed(2) + "B", "Proposed budgets", "2026-27, 121 districts", "c-pink"),
      stat(LI.pk12.toLocaleString("en-US"), "Students PK-12", "Fall 2025", "c-teal"),
      stat(pct(LI.budchg), "Budget change", "vs 2025-26", "c-pink"),
      stat(pct(LI.k12chg), "K-12 enrollment", LI.dec + " of " + LI.ne + " districts lost students", "c-blue"),
      stat("$" + Math.round(LI.medpp).toLocaleString("en-US"), "Median per pupil", "All 121 budgets, 2026-27", "c-lime"),
    ].join("");

    // Findings
    const top = [...B].filter((d) => !isCHS(d)).sort((a, b) => b.pp - a.pp);
    const big = [...B].sort((a, b) => b.bud27 - a.bud27);
    $("#finding-copy").innerHTML = `
      <p>Long Island districts propose <b class="p">$${(LI.bud / 1e9).toFixed(2)} billion</b> in 2026-27 spending, up <b class="p">${pct(LI.budchg)}</b>, while K-12 enrollment fell <b class="t">${Math.abs(LI.k12chg).toFixed(1)}%</b> and <b class="t">${LI.dec} of ${LI.ne}</b> districts lost students.</p>
      <p>Property tax levies total <b class="l">$${(LI.lev / 1e9).toFixed(2)} billion</b>, up ${pct(LI.levchg)}. <b class="p">${LI.over.length} districts</b> proposed levies over the state tax cap: ${LI.over.map((d) => esc(short(d.name))).join(", ")}.</p>
      <p>${esc(big[0].name)} has the largest budget at <b class="bl">${money(big[0].bud27)}</b>. Per-pupil spending runs from <b class="l">${dollars(top[top.length - 1].pp)}</b> in ${esc(short(top[top.length - 1].name))} to <b class="p">${dollars(top[0].pp)}</b> in ${esc(short(top[0].name))}.</p>`;
    const cbox = (name, s, c) => `<div class="cbox"><h3 class="${c}">${name}</h3>
      <div class="row"><span>Districts</span><span>${s.n}</span></div>
      <div class="row"><span>Students PK-12</span><span>${int(s.pk12)}</span></div>
      <div class="row"><span>K-12 change</span><span class="${cls(s.k12chg) === "up" ? "" : "down"}">${pct(s.k12chg)}</span></div>
      <div class="row"><span>Budgets 2026-27</span><span>${money(s.bud)}</span></div>
      <div class="row"><span>Budget change</span><span class="up">${pct(s.budchg)}</span></div>
      <div class="row"><span>Tax levies</span><span>${money(s.lev)}</span></div>
      <div class="row"><span>Median per pupil</span><span>${dollars(s.medpp)}</span></div>
      <div class="row"><span>Over tax cap</span><span class="${s.over.length ? "over" : ""}">${s.over.length}</span></div></div>`;
    $("#county-split").innerHTML = cbox("Nassau", NAS, "glow-blue") + cbox("Suffolk", SUF, "glow-teal");
    $("#missing").innerHTML = Object.keys(NOTES).map((k) => `<li><b>${k}:</b> ${NOTES[k]}</li>`).join("");

    // Card
    const card = (d) => {
      const tags = [];
      if (isCHS(d)) tags.push(`<span class="tag" style="color:${C.orange}">Grades 7-12 only</span>`);
      if (d.revote) tags.push(`<span class="tag" style="color:${C.violet}">Revote budget</span>`);
      if (d.cap != null && d.cap < 0) tags.push(`<span class="tag" style="color:${C.pink}">Over tax cap</span>`);
      if (d.bud27 == null) tags.push(`<span class="tag" style="color:${C.ink}">No budget data</span>`);
      return `<p class="d-county" style="color:${d.county === "Nassau" ? C.blue2 : C.teal}">${d.county} County</p>
        <h3 class="d-name">${esc(d.name)}</h3>${tags.length ? `<div class="tags">${tags.join("")}</div>` : ""}
        <div class="d-big"><div><span class="n c-teal">${int(d.pk12)}</span><span class="l">Students PK-12</span></div>
        <div><span class="n c-pink">${money(d.bud27)}</span><span class="l">Budget 2026-27</span></div>
        <div><span class="n c-lime">${d.pp == null ? NR : "$" + Math.round(d.pp / 1000) + "K"}</span><span class="l">Per pupil</span></div>
        <div><span class="n c-blue">${money(d.levy27)}</span><span class="l">Tax levy</span></div></div>
        <table class="kv">
          <tr><th>K-12 change, 1 yr</th><td class="${cls(d.k12chg) === "up" ? "down" : cls(d.k12chg) === "down" ? "up" : ""}">${pct(d.k12chg)}</td></tr>
          <tr><th>Budget 2025-26</th><td>${money(d.bud26)}</td></tr>
          <tr><th>Budget change</th><td class="${cls(d.budchg)}">${pct(d.budchg, 2)}</td></tr>
          <tr><th>Levy change</th><td class="${cls(d.levychg)}">${pct(d.levychg, 2)}</td></tr>
          <tr><th>Per pupil exact</th><td>${dollars(d.pp)}</td></tr>
          <tr><th>Budget enrollment</th><td>${int(d.enr27)}</td></tr>
          <tr><th>Unrestricted fund bal.</th><td>${d.fb == null ? NR : d.fb + "%"}</td></tr>
        </table>
        ${NOTES[d.name] ? `<p class="note">${NOTES[d.name]}</p>` : ""}
        ${isCHS(d) ? `<p class="note">Central high school district: its component elementary districts are listed separately, so per-pupil spending is not comparable to K-12 districts.</p>` : ""}
        <p class="office">District office: ${esc(d.office)}</p>`;
    };

    // Map
    const LI_BOUNDS = L.latLngBounds([40.54, -73.78], [41.18, -71.85]);
    const map = L.map("map", { zoomControl: false, attributionControl: true, minZoom: 8, maxZoom: 15, zoomSnap: 0.25 });
    map.fitBounds(LI_BOUNDS);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16, attribution: "Basemap &copy; Esri" }).addTo(map);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16, opacity: 0.55 }).addTo(map);
    const byId = Object.fromEntries(DATA.map((d) => [d.id, d]));
    const fitAll = () => map.fitBounds(currentBounds(), { padding: [20, 20] });
    let mode = MODES[0], county = "", selected = null;
    const polyLayer = L.geoJSON(GEO, { style: () => ({}), onEachFeature: (f, l) => { l.on("click", () => select(byId[f.properties.id], true)); } }).addTo(map);
    const markers = {};
    DATA.forEach((d) => {
      const m = L.circleMarker([d.lat, d.lon], { radius: 6, weight: 1.5, color: "#000", fillOpacity: 1, className: "pin" });
      m.bindPopup(() => card(d), { maxWidth: 280, autoPanPadding: [40, 80] });
      m.bindTooltip(esc(short(d.name)), { className: "lbl", direction: "top", offset: [0, -6] });
      m.on("click", () => select(d, false));
      m.addTo(map); markers[d.id] = m;
    });
    function currentBounds() {
      if (!county) return LI_BOUNDS;
      return L.latLngBounds(DATA.filter((d) => d.county === county).map((d) => [d.lat, d.lon])).pad(0.08);
    }
    function paint() {
      polyLayer.setStyle((f) => {
        const d = byId[f.properties.id], vis = !county || d.county === county, sel = selected && selected.id === d.id, c = colorOf(mode, d);
        return { color: sel ? "#fff" : c, weight: sel ? 3 : 1.2, opacity: !$("#outlines").checked ? 0 : vis ? 0.9 : 0.12, fillColor: c, fillOpacity: !$("#outlines").checked ? 0 : vis ? (sel ? 0.42 : 0.2) : 0.02 };
      });
      DATA.forEach((d) => {
        const m = markers[d.id], vis = !county || d.county === county, c = colorOf(mode, d), sel = selected && selected.id === d.id;
        m.setStyle({ fillColor: c, color: sel ? "#fff" : "#000", weight: sel ? 3 : 1.5, opacity: vis ? 1 : 0.15, fillOpacity: vis ? 1 : 0.15 });
        m.setRadius(sel ? 10 : 6);
        if (m._path) m._path.style.color = c;
        if (sel) m.bringToFront();
      });
      const lg = $("#legend");
      if (mode.cats) lg.innerHTML = `<h3>${mode.legend}</h3><p>${mode.cats.map(([n, c]) => `<span class="sw" style="background:${c};box-shadow:0 0 8px ${c}"></span>${n}`).join("&nbsp;&nbsp;&nbsp;")}</p>`;
      else {
        const lo = mode.stops[0][0], hi = mode.stops[mode.stops.length - 1][0];
        const grad = mode.stops.map(([v, c]) => `${c} ${(((v - lo) / (hi - lo)) * 100).toFixed(0)}%`).join(",");
        lg.innerHTML = `<h3>${mode.legend}</h3><div class="legend-bar" style="background:linear-gradient(90deg,${grad})"></div><div class="legend-scale"><span>${mode.ticks[0]}</span><span>${mode.ticks[1]}</span><span>${mode.ticks[2]}</span></div><p style="margin-top:8px;font-size:12px"><span class="sw" style="background:${C.nodata}"></span>Not reported / not comparable</p>`;
      }
    }
    function select(d, openPopup) {
      selected = d;
      $("#card").innerHTML = card(d);
      if (openPopup) markers[d.id].openPopup();
      document.querySelectorAll("table.data tr.sel").forEach((r) => r.classList.remove("sel"));
      const row = document.querySelector(`tr[data-id="${d.id}"]`); if (row) row.classList.add("sel");
      paint();
    }
    const flyTo = (d) => {
      document.getElementById("map-stage").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => { map.flyTo([d.lat, d.lon], 11.5, { duration: 0.8 }); setTimeout(() => select(d, true), 850); }, 350);
    };
    const pills = (el, opts, cur, on) => {
      el.innerHTML = opts.map(([v, l]) => `<button type="button" class="pill${v === cur ? " on" : ""}" data-v="${v}">${l}</button>`).join("");
      el.querySelectorAll(".pill").forEach((b) => b.addEventListener("click", () => { el.querySelectorAll(".pill").forEach((x) => x.classList.toggle("on", x === b)); on(b.dataset.v); }));
    };
    pills($("#mode"), MODES.map((m) => [m.id, m.label]), "pp", (v) => { mode = MODES.find((m) => m.id === v); paint(); });
    pills($("#county-pick"), [["", "All LI"], ["Nassau", "Nassau"], ["Suffolk", "Suffolk"]], "", (v) => { county = v; paint(); fitAll(); });
    $("#outlines").addEventListener("change", paint);
    $("#reset").addEventListener("click", () => { selected = null; map.closePopup(); $("#card").innerHTML = '<p class="hint">Click a pin or a district for its enrollment, budget, tax levy and per-pupil spending.</p>'; paint(); fitAll(); });
    const sr = $("#search-results");
    $("#search").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) { sr.hidden = true; return; }
      const hits = DATA.filter((d) => d.name.toLowerCase().includes(q)).slice(0, 8);
      sr.hidden = !hits.length;
      sr.innerHTML = hits.map((d) => `<button type="button" data-id="${d.id}">${esc(d.name)}</button>`).join("");
      sr.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { const d = byId[b.dataset.id]; sr.hidden = true; map.flyTo([d.lat, d.lon], 11.5, { duration: 0.8 }); setTimeout(() => select(d, true), 850); }));
    });
    fitAll(); paint();
    window.addEventListener("resize", () => map.invalidateSize());

    // Charts
    const hbar = (rows, val, fmt, color, max) => rows.map((d) => `<div class="hbar"><button type="button" data-id="${d.id}" title="${esc(d.name)}">${esc(short(d.name))}</button><div class="track"><div class="fill" style="width:${((val(d) / max) * 100).toFixed(1)}%;background:${color};box-shadow:0 0 12px ${color}"></div></div><span class="val" style="color:${color}">${fmt(d)}</span></div>`).join("");
    const wire = (el) => el.querySelectorAll("button[data-id]").forEach((b) => b.addEventListener("click", () => flyTo(byId[b.dataset.id])));
    const ppMax = top[0].pp;
    const drawPP = (w) => {
      const rows = w === "hi" ? top.slice(0, 15) : top.slice(-15).reverse();
      $("#chart-pp").innerHTML = hbar(rows, (d) => d.pp, (d) => dollars(d.pp), w === "hi" ? C.pink : C.lime, ppMax); wire($("#chart-pp"));
    };
    pills($("#pp-tabs"), [["hi", "Highest 15"], ["lo", "Lowest 15"]], "hi", drawPP); drawPP("hi");
    $("#chart-bud").innerHTML = hbar(big.slice(0, 15), (d) => d.bud27, (d) => money(d.bud27) + " <small style='color:" + C.ink + "'>" + pct(d.budchg) + "</small>", C.blue, big[0].bud27);
    wire($("#chart-bud"));
    // Scatter
    (() => {
      const pts = B.filter((d) => !isCHS(d) && d.enr27);
      const W = 1100, H = 460, P = { l: 70, r: 20, t: 16, b: 46 };
      const xl = (v) => Math.log10(v), x0 = xl(30), x1 = xl(20000), y0 = 20000, y1 = 160000;
      const X = (v) => P.l + ((xl(v) - x0) / (x1 - x0)) * (W - P.l - P.r), Y = (v) => H - P.b - ((v - y0) / (y1 - y0)) * (H - P.t - P.b);
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Scatter of district size against budget per pupil">`;
      [50, 100, 500, 1000, 5000, 10000].forEach((v) => { s += `<line x1="${X(v)}" x2="${X(v)}" y1="${P.t}" y2="${H - P.b}" stroke="#1a1a22"/><text x="${X(v)}" y="${H - P.b + 20}" text-anchor="middle">${v >= 1000 ? v / 1000 + "K" : v}</text>`; });
      [40000, 80000, 120000, 160000].forEach((v) => { s += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1a1a22"/><text x="${P.l - 10}" y="${Y(v) + 4}" text-anchor="end">$${v / 1000}K</text>`; });
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(LI.medpp)}" y2="${Y(LI.medpp)}" stroke="${C.lime}" stroke-dasharray="4 5" opacity=".7"/><text x="${W - P.r}" y="${Y(LI.medpp) - 6}" text-anchor="end" style="fill:${C.lime}">MEDIAN $${Math.round(LI.medpp / 1000)}K</text>`;
      s += `<text x="${(W + P.l) / 2}" y="${H - 6}" text-anchor="middle" style="fill:${C.lime}">STUDENTS (BUDGET ENROLLMENT, LOG SCALE)</text>`;
      pts.forEach((d) => { const c = d.county === "Nassau" ? C.blue : C.teal; s += `<circle cx="${X(d.enr27).toFixed(1)}" cy="${Y(Math.min(d.pp, y1)).toFixed(1)}" r="6" fill="${c}" fill-opacity=".85" stroke="#000" style="filter:drop-shadow(0 0 4px ${c});cursor:pointer" data-id="${d.id}"/>`; });
      s += `</svg><div class="sc-tip" hidden></div><p class="legend" style="margin:6px 0 0;font-family:var(--mono);font-weight:700;font-size:11px;letter-spacing:.12em"><span class="sw" style="background:${C.blue};box-shadow:0 0 8px ${C.blue}"></span>NASSAU &nbsp;&nbsp; <span class="sw" style="background:${C.teal};box-shadow:0 0 8px ${C.teal}"></span>SUFFOLK</p>`;
      const el = $("#scatter"); el.innerHTML = s; const tip = el.querySelector(".sc-tip");
      el.querySelectorAll("circle").forEach((c) => {
        const d = byId[c.dataset.id];
        c.addEventListener("mouseenter", () => { tip.hidden = false; tip.innerHTML = `<b>${esc(short(d.name))}</b> · ${int(d.enr27)} students · ${dollars(d.pp)}`; const r = el.getBoundingClientRect(), b = c.getBoundingClientRect(); tip.style.left = Math.min(b.left - r.left + 10, r.width - 260) + "px"; tip.style.top = b.top - r.top - 36 + "px"; c.setAttribute("r", 9); });
        c.addEventListener("mouseleave", () => { tip.hidden = true; c.setAttribute("r", 6); });
        c.addEventListener("click", () => flyTo(d));
      });
    })();

    // Table
    const COLS = [
      ["name", "District", (d) => esc(d.name)],
      ["county", "County", (d) => `<span class="cty ${d.county[0]}">${d.county}</span>`],
      ["pk12", "Students PK-12", (d) => int(d.pk12)],
      ["k12chg", "K-12 chg", (d) => `<span class="${cls(d.k12chg) === "up" ? "down" : cls(d.k12chg) === "down" ? "up" : ""}">${pct(d.k12chg)}</span>`],
      ["bud27", "Budget 26-27", (d) => money(d.bud27)],
      ["budchg", "Budget chg", (d) => `<span class="${cls(d.budchg)}">${pct(d.budchg)}</span>`],
      ["pp", "Per pupil", (d) => dollars(d.pp) + (isCHS(d) ? ' <span class="nr">7-12</span>' : "")],
      ["levy27", "Tax levy", (d) => money(d.levy27)],
      ["levychg", "Levy chg", (d) => `<span class="${cls(d.levychg)}">${pct(d.levychg)}</span>`],
      ["cap", "Tax cap", (d) => d.cap == null ? NR : d.cap < 0 ? '<span class="over">OVER</span>' : "Within"],
    ];
    let sortK = "bud27", sortDir = -1, tq = "", tc = "";
    const drawTable = () => {
      const rows = DATA.filter((d) => (!tc || d.county === tc) && (!tq || d.name.toLowerCase().includes(tq))).sort((a, b) => {
        const x = a[sortK], y = b[sortK];
        if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
        return (typeof x === "string" ? x.localeCompare(y) : x - y) * sortDir;
      });
      $("#ex-table").innerHTML = `<table class="data"><thead><tr>${COLS.map(([k, l]) => `<th data-k="${k}" class="${k === sortK ? "sorted" : ""}">${l}${k === sortK ? (sortDir > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead><tbody>${rows.map((d) => `<tr data-id="${d.id}" class="${selected && selected.id === d.id ? "sel" : ""}">${COLS.map(([, , f]) => `<td>${f(d)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      $("#ex-count").textContent = `Showing ${rows.length} of ${DATA.length} districts`;
      document.querySelectorAll("#ex-table th").forEach((th) => th.addEventListener("click", () => { const k = th.dataset.k; if (k === sortK) sortDir *= -1; else { sortK = k; sortDir = k === "name" || k === "county" ? 1 : -1; } drawTable(); }));
      document.querySelectorAll("#ex-table tbody tr").forEach((tr) => tr.addEventListener("click", () => flyTo(byId[tr.dataset.id])));
    };
    $("#ex-q").addEventListener("input", (e) => { tq = e.target.value.trim().toLowerCase(); drawTable(); });
    pills($("#ex-county"), [["", "All"], ["Nassau", "Nassau"], ["Suffolk", "Suffolk"]], "", (v) => { tc = v; drawTable(); });
    drawTable();
  }
})();
