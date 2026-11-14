(() => {
  "use strict";
  const C = { lime: "#c8ff00", pink: "#ff2d6a", blue: "#3d7eff", blue2: "#7eb0ff", teal: "#00ffd0", orange: "#ff8c00", violet: "#c45cff", ink: "#f4f4f0", nodata: "#4a4a55" };
  const NOTES = {
    "Wainscott Common SD": "Common school district; not in the state Property Tax Report Card, so no budget or levy figures.",
    "Sagaponack Common SD": "Common school district; not in the state Property Tax Report Card, so no budget or levy figures.",
    "Little Flower UFSD": "Special act district serving the Little Flower residential facility in Wading River; no public budget vote and not in the Property Tax Report Card. No boundary of its own; pin only.",
    "New Suffolk Common SD": "Non-instructional since 2024-25 (students tuitioned to Southold). No state enrollment, test or staff record for 2024-25 or 2025-26 (8 students PK-12 in 2023-24) and not in the Property Tax Report Card.",
  };
  const MAXC = 6;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nr = (t) => `<span class="nr">${t || "Not reported"}</span>`;
  const NR = nr();
  const money = (v) => v == null ? NR : v >= 1e9 ? "$" + (v / 1e9).toFixed(2) + "B" : "$" + (v / 1e6).toFixed(1) + "M";
  const dollars = (v) => v == null ? NR : "$" + Math.round(v).toLocaleString("en-US");
  const int = (v) => v == null ? NR : Math.round(v).toLocaleString("en-US");
  const pct = (v, d = 1) => v == null ? NR : (v > 0 ? "+" : "") + v.toFixed(d) + "%";
  const rate = (v, flag) => v == null ? nr(flag) : Math.round(v) + "%";
  const cls = (v) => v == null ? "" : v > 0 ? "up" : v < 0 ? "down" : "flat";
  const isCHS = (d) => d.name.includes("Central HS");
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const sum = (xs) => xs.reduce((a, b) => a + (b || 0), 0);
  const short = (n) => n.replace(/ (UFSD|CSD|City SD|Common SD|SD)$/, "").replace(" Central HS District", " Central HS");
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const ramp = (stops, v) => {
    if (v == null) return C.nodata;
    if (v <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i], t = (v - a) / (b - a), x = hex(ca), y = hex(cb);
      return "rgb(" + x.map((q, k) => Math.round(q + (y[k] - q) * t)).join(",") + ")";
    }
    return stops[stops.length - 1][1];
  };
  const MODES = [
    { id: "pp", label: "Per pupil", legend: "Proposed 2026-27 budget per pupil", stops: [[29000, C.blue], [42000, C.teal], [60000, C.lime], [100000, C.pink]], ticks: ["$29K", "$42K median", "$100K+"], get: (d) => (isCHS(d) ? null : d.pp) },
    { id: "budchg", label: "Budget change", legend: "Budget change, 2025-26 to 2026-27", stops: [[-1, C.teal], [1.5, C.blue], [3.5, C.lime], [7, C.pink]], ticks: ["-1%", "+3.5%", "+7%"], get: (d) => d.budchg },
    { id: "levychg", label: "Levy change", legend: "Tax levy change, 2025-26 to 2026-27", stops: [[0, C.teal], [2, C.blue], [3, C.lime], [6, C.pink]], ticks: ["0%", "+3%", "+6%"], get: (d) => d.levychg },
    { id: "k12chg", label: "Enrollment change", legend: "K-12 students, fall 2024 to fall 2025", stops: [[-8, C.pink], [-3, C.orange], [0, C.blue], [4, C.lime]], ticks: ["-8%", "0%", "+4%"], get: (d) => d.k12chg },
    { id: "grad", label: "Grad rate", legend: "4-year graduation rate, 2021 cohort (Aug 2025)", stops: [[75, C.pink], [88, C.orange], [94, C.blue], [99, C.lime]], ticks: ["75%", "90%", "99%"], get: (d) => d.grad },
    { id: "ela", label: "ELA 3-8", legend: "Grades 3-8 ELA, % proficient, 2025", stops: [[25, C.pink], [45, C.orange], [62, C.blue], [82, C.lime]], ticks: ["25%", "55%", "82%"], get: (d) => d.ela },
    { id: "math", label: "Math 3-8", legend: "Grades 3-8 math, % proficient, 2025", stops: [[25, C.pink], [45, C.orange], [65, C.blue], [88, C.lime]], ticks: ["25%", "55%", "88%"], get: (d) => d.math },
    { id: "tsal", label: "Teacher pay", legend: "Median full-time classroom teacher salary, 2024-25", stops: [[95000, C.blue], [115000, C.teal], [132000, C.lime], [149000, C.pink]], ticks: ["$95K", "$123K", "$149K"], get: (d) => d.tsal },
    { id: "county", label: "County", legend: "Nassau and Suffolk", cats: [["Nassau", C.blue], ["Suffolk", C.lime]], get: (d) => d.county },
  ];
  const colorOf = (m, d) => m.cats ? (d.county === "Nassau" ? C.blue : C.lime) : ramp(m.stops, m.get(d));

  // Compare rows: [label, getter, formatter, direction (1 higher better, -1 lower better, 0 neutral)]
  const capTxt = (d) => d.cap == null ? NR : d.cap < 0 ? '<span class="over">Over cap</span>' : "Within cap";
  const CROWS = [
    ["Students PK-12, fall 2025", (d) => d.pk12, (d) => int(d.pk12), 0],
    ["K-12 change, 1 yr", (d) => d.k12chg, (d) => pct(d.k12chg), 1],
    ["Budget 2026-27", (d) => d.bud27, (d) => money(d.bud27), 0],
    ["Budget change", (d) => d.budchg, (d) => pct(d.budchg, 2), -1],
    ["Per pupil 2026-27", (d) => (isCHS(d) ? null : d.pp), (d) => dollars(d.pp) + (isCHS(d) ? ' <span class="nr">7-12</span>' : ""), -1],
    ["Tax levy 2026-27", (d) => d.levy27, (d) => money(d.levy27), 0],
    ["Levy change", (d) => d.levychg, (d) => pct(d.levychg, 2), -1],
    ["Tax cap", (d) => (d.cap == null ? null : d.cap < 0 ? 0 : 1), capTxt, 1],
    ["Grad rate, 4-yr", (d) => d.grad, (d) => rate(d.grad, d.grad_flag), 1],
    ["ELA 3-8 proficient", (d) => d.ela, (d) => rate(d.ela, d.ela_flag), 1],
    ["Math 3-8 proficient", (d) => d.math, (d) => rate(d.math, d.math_flag), 1],
    ["Regents Algebra I prof.", (d) => d.alg1, (d) => rate(d.alg1, d.alg1_flag), 1],
    ["Regents ELA prof.", (d) => d.rela, (d) => rate(d.rela, d.rela_flag), 1],
    ["Median teacher salary", (d) => d.tsal, (d) => dollars(d.tsal), 0],
    ["Avg teacher salary (FTE)", (d) => d.tsal_avg, (d) => dollars(d.tsal_avg), 0],
  ];

  Promise.all([fetch("data/districts.json").then((r) => r.json()), fetch("data/boundaries.geojson").then((r) => r.json())]).then(([D, G]) => init(D, G));

  function init(DATA, GEO) {
    const byId = Object.fromEntries(DATA.map((d) => [d.id, d]));
    const B = DATA.filter((d) => d.bud27 != null);
    const S = (county) => {
      const all = DATA.filter((d) => !county || d.county === county), b = B.filter((d) => !county || d.county === county), e = all.filter((d) => d.pk12 != null);
      const bud = sum(b.map((d) => d.bud27)), bud0 = sum(b.map((d) => d.bud26)), lev = sum(b.map((d) => d.levy27)), lev0 = sum(b.map((d) => d.levy26));
      const K = sum(e.map((d) => d.k12)), K0 = sum(e.map((d) => d.k12 / (1 + d.k12chg / 100)));
      const med = (k) => median(all.filter((d) => d[k] != null).map((d) => d[k]));
      return { n: all.length, bud, budchg: (bud / bud0 - 1) * 100, lev, levchg: (lev / lev0 - 1) * 100, pk12: sum(e.map((d) => d.pk12)), k12chg: (K / K0 - 1) * 100, medpp: median(b.map((d) => d.pp)), dec: e.filter((d) => d.k12chg < 0).length, ne: e.length, over: b.filter((d) => d.cap != null && d.cap < 0), grad: med("grad"), ela: med("ela"), math: med("math"), tsal: med("tsal") };
    };
    const LI = S(null), NAS = S("Nassau"), SUF = S("Suffolk");

    const stat = (n, l, s, c) => `<div class="stat"><span class="n ${c}">${n}</span><span class="l">${l}</span><span class="s">${s}</span></div>`;
    $("#hero-stats").innerHTML = [
      stat("125", "Districts", "56 Nassau · 69 Suffolk", "c-lime"),
      stat("$" + (LI.bud / 1e9).toFixed(2) + "B", "Proposed budgets", "2026-27, 121 districts", "c-pink"),
      stat(LI.pk12.toLocaleString("en-US"), "Students PK-12", "Fall 2025", "c-teal"),
      stat(pct(LI.budchg), "Budget change", "vs 2025-26", "c-pink"),
      stat(pct(LI.k12chg), "K-12 enrollment", LI.dec + " of " + LI.ne + " districts lost students", "c-blue"),
      stat("$" + Math.round(LI.medpp).toLocaleString("en-US"), "Median per pupil", "All 121 budgets, 2026-27", "c-lime"),
      stat(Math.round(LI.grad) + "%", "Median grad rate", "4-yr, 2021 cohort · 99 districts", "c-teal"),
      stat(Math.round(LI.ela) + "%", "Median ELA 3-8", "% proficient, 2025", "c-blue"),
      stat("$" + Math.round(LI.tsal / 1000) + "K", "Median teacher pay", "District medians, 2024-25", "c-pink"),
    ].join("");

    const top = [...B].filter((d) => !isCHS(d)).sort((a, b) => b.pp - a.pp);
    const big = [...B].sort((a, b) => b.bud27 - a.bud27);
    const gr = DATA.filter((d) => d.grad != null).sort((a, b) => a.grad - b.grad);
    const sal = DATA.filter((d) => d.tsal != null).sort((a, b) => b.tsal - a.tsal);
    $("#finding-copy").innerHTML = `
      <p>Long Island districts propose <b class="p">$${(LI.bud / 1e9).toFixed(2)} billion</b> in 2026-27 spending, up <b class="p">${pct(LI.budchg)}</b>, while K-12 enrollment fell <b class="t">${Math.abs(LI.k12chg).toFixed(1)}%</b> and <b class="t">${LI.dec} of ${LI.ne}</b> districts lost students.</p>
      <p>Property tax levies total <b class="l">$${(LI.lev / 1e9).toFixed(2)} billion</b>, up ${pct(LI.levchg)}. <b class="p">${LI.over.length} districts</b> proposed levies over the state tax cap: ${LI.over.map((d) => esc(short(d.name))).join(", ")}.</p>
      <p>${esc(big[0].name)} has the largest budget at <b class="bl">${money(big[0].bud27)}</b>. Per-pupil spending runs from <b class="l">${dollars(top[top.length - 1].pp)}</b> in ${esc(short(top[top.length - 1].name))} to <b class="p">${dollars(top[0].pp)}</b> in ${esc(short(top[0].name))}.</p>
      <p>Four-year graduation rates run from <b class="p">${gr[0].grad}%</b> in ${esc(short(gr[0].name))} to <b class="l">${gr[gr.length - 1].grad}%</b> in ${esc(short(gr[gr.length - 1].name))}. The median classroom teacher earns <b class="bl">${dollars(sal[0].tsal)}</b> in ${esc(short(sal[0].name))}, the highest on the island.</p>`;
    const cbox = (name, s, c) => `<div class="cbox"><h3 class="${c}">${name}</h3>
      <div class="row"><span>Districts</span><span>${s.n}</span></div>
      <div class="row"><span>Students PK-12</span><span>${int(s.pk12)}</span></div>
      <div class="row"><span>K-12 change</span><span class="down">${pct(s.k12chg)}</span></div>
      <div class="row"><span>Budgets 2026-27</span><span>${money(s.bud)}</span></div>
      <div class="row"><span>Budget change</span><span class="up">${pct(s.budchg)}</span></div>
      <div class="row"><span>Tax levies</span><span>${money(s.lev)}</span></div>
      <div class="row"><span>Median per pupil</span><span>${dollars(s.medpp)}</span></div>
      <div class="row"><span>Over tax cap</span><span class="${s.over.length ? "over" : ""}">${s.over.length}</span></div>
      <div class="row"><span>Median grad rate</span><span>${Math.round(s.grad)}%</span></div>
      <div class="row"><span>Median ELA / math 3-8</span><span>${Math.round(s.ela)}% / ${Math.round(s.math)}%</span></div>
      <div class="row"><span>Median teacher salary</span><span>${dollars(s.tsal)}</span></div></div>`;
    $("#county-split").innerHTML = cbox("Nassau", NAS, "glow-blue") + cbox("Suffolk", SUF, "glow-teal");
    $("#missing").innerHTML = Object.keys(NOTES).map((k) => `<li><b>${k}:</b> ${NOTES[k]}</li>`).join("");

    // ---------- compare state ----------
    let cmp = [];
    const inCmp = (d) => cmp.includes(d.id);
    const cmpBtn = (d) => `<button type="button" class="cmp-toggle${inCmp(d) ? " on" : ""}" data-cmp="${d.id}">${inCmp(d) ? "✓ In compare" : "+ Compare"}</button>`;

    const card = (d, compact) => {
      const tags = [];
      if (isCHS(d)) tags.push(`<span class="tag" style="color:${C.orange}">Grades 7-12 only</span>`);
      if (d.revote) tags.push(`<span class="tag" style="color:${C.violet}">Revote budget</span>`);
      if (d.cap != null && d.cap < 0) tags.push(`<span class="tag" style="color:${C.pink}">Over tax cap</span>`);
      if (d.bud27 == null) tags.push(`<span class="tag" style="color:${C.ink}">No budget data</span>`);
      return `<p class="d-county" style="color:${d.county === "Nassau" ? C.blue2 : C.teal}">${d.county} County${d.grades ? " · Grades " + d.grades : ""}</p>
        <h3 class="d-name">${esc(d.name)}</h3>${tags.length ? `<div class="tags">${tags.join("")}</div>` : ""}
        <div class="d-big"><div><span class="n c-teal">${int(d.pk12)}</span><span class="l">Students PK-12</span></div>
        <div><span class="n c-pink">${money(d.bud27)}</span><span class="l">Budget 2026-27</span></div>
        <div><span class="n c-lime">${d.pp == null ? NR : "$" + Math.round(d.pp / 1000) + "K"}</span><span class="l">Per pupil</span></div>
        <div><span class="n c-blue">${money(d.levy27)}</span><span class="l">Tax levy</span></div>
        <div><span class="n c-lime">${d.grad == null ? nr(d.grad_flag) : d.grad + "%"}</span><span class="l">Grad rate</span></div>
        <div><span class="n c-pink">${d.tsal == null ? NR : "$" + Math.round(d.tsal / 1000) + "K"}</span><span class="l">Median teacher pay</span></div></div>
        ${cmpBtn(d)}
        <table class="kv">
          <tr><th>K-12 change, 1 yr</th><td class="${cls(d.k12chg) === "up" ? "down" : cls(d.k12chg) === "down" ? "up" : ""}">${pct(d.k12chg)}</td></tr>
          <tr><th>Budget change</th><td class="${cls(d.budchg)}">${pct(d.budchg, 2)}</td></tr>
          <tr><th>Levy change</th><td class="${cls(d.levychg)}">${pct(d.levychg, 2)}</td></tr>
          <tr><th>Tax cap</th><td>${capTxt(d)}</td></tr>
          <tr><th>ELA 3-8 proficient</th><td>${rate(d.ela, d.ela_flag)}</td></tr>
          <tr><th>Math 3-8 proficient</th><td>${rate(d.math, d.math_flag)}</td></tr>
          ${compact ? "" : `<tr><th>Regents Algebra I prof.</th><td>${rate(d.alg1, d.alg1_flag)}</td></tr>
          <tr><th>Regents ELA prof.</th><td>${rate(d.rela, d.rela_flag)}</td></tr>
          <tr><th>Grad cohort</th><td>${d.gradn == null ? nr(d.grad_flag) : int(d.gradn) + " students"}</td></tr>
          <tr><th>Avg teacher salary (FTE)</th><td>${dollars(d.tsal_avg)}</td></tr>
          <tr><th>Classroom teachers</th><td>${int(d.tcount)}</td></tr>
          <tr><th>Budget 2025-26</th><td>${money(d.bud26)}</td></tr>
          <tr><th>Per pupil exact</th><td>${dollars(d.pp)}</td></tr>
          <tr><th>Unrestricted fund bal.</th><td>${d.fb == null ? NR : d.fb + "%"}</td></tr>`}
        </table>
        ${NOTES[d.name] ? `<p class="note">${NOTES[d.name]}</p>` : ""}
        ${isCHS(d) ? `<p class="note">Central high school district: its component elementary districts are listed separately, so per-pupil spending is not comparable to K-12 districts.</p>` : ""}
        ${compact ? "" : `<p class="office">District office: ${esc(d.office)}</p>`}`;
    };

    // ---------- map ----------
    const LI_BOUNDS = L.latLngBounds([40.54, -73.78], [41.18, -71.85]);
    const map = L.map("map", { zoomControl: false, minZoom: 8, maxZoom: 15, zoomSnap: 0.25 });
    map.fitBounds(LI_BOUNDS);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16, attribution: "Basemap &copy; Esri" }).addTo(map);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16, opacity: 0.55 }).addTo(map);
    let mode = MODES[0], county = "", selected = null;
    const isMod = (e) => e && e.originalEvent && (e.originalEvent.shiftKey || e.originalEvent.ctrlKey || e.originalEvent.metaKey);
    const polyLayer = L.geoJSON(GEO, { style: () => ({}), onEachFeature: (f, l) => l.on("click", (e) => { const d = byId[f.properties.id]; if (isMod(e)) toggleCmp(d); else select(d, true); }) }).addTo(map);
    const markers = {};
    DATA.forEach((d) => {
      const m = L.circleMarker([d.lat, d.lon], { radius: 6, weight: 1.5, color: "#000", fillOpacity: 1, className: "pin" });
      m.bindPopup(() => card(d, true), { maxWidth: 290, autoPanPadding: [40, 80] });
      m.bindTooltip(esc(short(d.name)), { className: "lbl", direction: "top", offset: [0, -6] });
      m.on("click", (e) => { if (isMod(e)) { m.closePopup(); toggleCmp(d); } else select(d, false); });
      m.addTo(map); markers[d.id] = m;
    });
    const currentBounds = () => county ? L.latLngBounds(DATA.filter((d) => d.county === county).map((d) => [d.lat, d.lon])).pad(0.08) : LI_BOUNDS;
    const fitAll = () => map.fitBounds(currentBounds(), { padding: [20, 20] });

    function paint() {
      const on = $("#outlines").checked;
      polyLayer.setStyle((f) => {
        const d = byId[f.properties.id], vis = !county || d.county === county, sel = selected && selected.id === d.id, cm = inCmp(d), c = colorOf(mode, d);
        return { color: sel || cm ? "#fff" : c, weight: sel ? 3 : cm ? 2.5 : 1.2, dashArray: cm && !sel ? "5 4" : null, opacity: !on ? 0 : vis ? 0.9 : 0.12, fillColor: c, fillOpacity: !on ? 0 : vis ? (sel || cm ? 0.4 : 0.14) : 0.02 };
      });
      DATA.forEach((d) => {
        const m = markers[d.id], vis = !county || d.county === county, c = colorOf(mode, d), sel = selected && selected.id === d.id, cm = inCmp(d);
        m.setStyle({ fillColor: c, color: sel || cm ? "#fff" : "#000", weight: sel || cm ? 3 : 1.5, opacity: vis || cm ? 1 : 0.15, fillOpacity: vis || cm ? 1 : 0.15 });
        m.setRadius(sel ? 10 : cm ? 9 : 6);
        if (m._path) { m._path.style.color = cm ? C.pink : c; m._path.classList.toggle("cmp-pin", cm); }
        if (sel || cm) m.bringToFront();
        const want = cm ? "cmp" : "hover";
        if (m._tipMode !== want) {
          m.unbindTooltip();
          if (cm) m.bindTooltip(`<b>${cmp.indexOf(d.id) + 1}</b> ${esc(short(d.name))}`, { className: "lbl cmp-lbl", direction: "top", offset: [0, -8], permanent: true }).openTooltip();
          else m.bindTooltip(esc(short(d.name)), { className: "lbl", direction: "top", offset: [0, -6] });
          m._tipMode = want;
        } else if (cm) m.setTooltipContent(`<b>${cmp.indexOf(d.id) + 1}</b> ${esc(short(d.name))}`);
      });
      const lg = $("#legend");
      if (mode.cats) lg.innerHTML = `<h3>${mode.legend}</h3><p>${mode.cats.map(([n, c]) => `<span class="sw" style="background:${c};box-shadow:0 0 8px ${c}"></span>${n}`).join("&nbsp;&nbsp;&nbsp;")}</p>`;
      else {
        const lo = mode.stops[0][0], hi = mode.stops[mode.stops.length - 1][0];
        const grad = mode.stops.map(([v, c]) => `${c} ${(((v - lo) / (hi - lo)) * 100).toFixed(0)}%`).join(",");
        lg.innerHTML = `<h3>${mode.legend}</h3><div class="legend-bar" style="background:linear-gradient(90deg,${grad})"></div><div class="legend-scale"><span>${mode.ticks[0]}</span><span>${mode.ticks[1]}</span><span>${mode.ticks[2]}</span></div><p style="margin-top:8px;font-size:12px"><span class="sw" style="background:${C.nodata}"></span>No figure (not reported, suppressed or no high school)</p>`;
      }
      lg.insertAdjacentHTML("beforeend", `<p class="tip">Shift- or Ctrl-click pins to compare</p>`);
    }
    function select(d, openPopup) {
      selected = d;
      $("#card").innerHTML = card(d, false);
      if (openPopup) markers[d.id].openPopup();
      document.querySelectorAll("#ex-table tr.sel").forEach((r) => r.classList.remove("sel"));
      const row = document.querySelector(`#ex-table tr[data-id="${d.id}"]`); if (row) row.classList.add("sel");
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
    const HINT = '<p class="hint">Click a pin or a district for its enrollment, budget, test scores, graduation rate and teacher pay. Shift- or Ctrl-click pins, or tick table rows, to compare up to six.</p>';
    $("#card").innerHTML = HINT;
    $("#reset").addEventListener("click", () => { selected = null; map.closePopup(); $("#card").innerHTML = HINT; paint(); fitAll(); });
    const sr = $("#search-results");
    $("#search").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) { sr.hidden = true; return; }
      const hits = DATA.filter((d) => d.name.toLowerCase().includes(q)).slice(0, 8);
      sr.hidden = !hits.length;
      sr.innerHTML = hits.map((d) => `<button type="button" data-id="${d.id}">${esc(d.name)}</button>`).join("");
      sr.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { const d = byId[b.dataset.id]; sr.hidden = true; map.flyTo([d.lat, d.lon], 11.5, { duration: 0.8 }); setTimeout(() => select(d, true), 850); }));
    });
    fitAll();
    window.addEventListener("resize", () => map.invalidateSize());

    // ---------- compare ----------
    const toast = (msg) => { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2200); };
    function toggleCmp(d) {
      if (inCmp(d)) cmp = cmp.filter((x) => x !== d.id);
      else { if (cmp.length >= MAXC) { toast(`Compare holds up to ${MAXC} districts`); syncCmp(); return; } cmp.push(d.id); }
      syncCmp();
    }
    function syncCmp(fromHash) {
      paint();
      document.querySelectorAll("[data-cmp]").forEach((b) => { const on = cmp.includes(b.dataset.cmp); b.classList.toggle("on", on); b.textContent = on ? "✓ In compare" : "+ Compare"; });
      document.querySelectorAll("#ex-table input.rowcmp").forEach((c) => (c.checked = cmp.includes(c.dataset.id)));
      if (!fromHash) {
        const h = cmp.length ? "#compare=" + cmp.join(",") : " ";
        history.replaceState(null, "", cmp.length ? h : location.pathname + location.search);
      }
      drawTray();
    }
    function drawTray() {
      const tray = $("#cmp-tray");
      document.body.classList.toggle("has-tray", cmp.length > 0);
      if (!cmp.length) { tray.hidden = true; tray.classList.remove("open"); return; }
      tray.hidden = false;
      const ds = cmp.map((id) => byId[id]);
      $("#cmp-chips").innerHTML = ds.map((d, i) => `<span class="chip"><b>${i + 1}</b>${esc(short(d.name))}<button type="button" aria-label="Remove ${esc(d.name)}" data-rm="${d.id}">×</button></span>`).join("");
      $("#cmp-count").textContent = `${cmp.length} of ${MAXC}`;
      $("#cmp-open").disabled = cmp.length < 2;
      $("#cmp-open").textContent = tray.classList.contains("open") ? "Hide table" : cmp.length < 2 ? "Pick 2+" : "Compare " + cmp.length;
      // table
      const head = `<tr><th class="mlab">Metric</th>${ds.map((d, i) => `<th><span class="cn">${i + 1}</span>${esc(short(d.name))}<span class="cc ${d.county[0]}">${d.county}</span><button type="button" class="rm" data-rm="${d.id}" aria-label="Remove ${esc(d.name)}">Remove</button></th>`).join("")}</tr>`;
      const body = CROWS.map(([lab, get, fmt, dir]) => {
        const vals = ds.map(get), nums = vals.filter((v) => v != null);
        let hi = null, lo = null;
        if (nums.length >= 2 && Math.max(...nums) !== Math.min(...nums)) { hi = Math.max(...nums); lo = Math.min(...nums); }
        return `<tr><th class="mlab">${lab}${dir === 0 ? ' <span class="dir">high / low</span>' : ""}</th>${ds.map((d, i) => {
          const v = vals[i]; let c = "";
          if (hi != null && v != null) {
            if (dir === 0) c = v === hi ? "hi" : v === lo ? "lo" : "";
            else c = (dir > 0 ? v === hi : v === lo) ? "best" : (dir > 0 ? v === lo : v === hi) ? "worst" : "";
          }
          return `<td class="${c}">${fmt(d)}</td>`;
        }).join("")}</tr>`;
      }).join("");
      $("#cmp-table").innerHTML = `<table class="cmp"><thead>${head}</thead><tbody>${body}</tbody></table>`;
    }
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cmp]"); if (b) { e.preventDefault(); toggleCmp(byId[b.dataset.cmp]); return; }
      const r = e.target.closest("[data-rm]"); if (r) { e.preventDefault(); cmp = cmp.filter((x) => x !== r.dataset.rm); syncCmp(); }
    });
    $("#cmp-open").addEventListener("click", () => { $("#cmp-tray").classList.toggle("open"); drawTray(); });
    $("#cmp-close").addEventListener("click", () => { $("#cmp-tray").classList.remove("open"); drawTray(); });
    $("#cmp-clear").addEventListener("click", () => { cmp = []; $("#cmp-tray").classList.remove("open"); syncCmp(); });
    $("#cmp-link").addEventListener("click", () => {
      const url = location.origin + location.pathname + "#compare=" + cmp.join(",");
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast("Link copied"), () => { prompt("Copy this link", url); });
    });
    const fitCmp = () => { if (cmp.length) map.fitBounds(L.latLngBounds(cmp.map((id) => [byId[id].lat, byId[id].lon])).pad(0.35), { maxZoom: 11.5, paddingTopLeft: [innerWidth > 980 ? 320 : 20, 40], paddingBottomRight: [innerWidth > 980 ? 360 : 20, 40] }); };
    const fromHash = () => {
      const m = location.hash.match(/compare=([\d,]+)/);
      cmp = m ? m[1].split(",").filter((id) => byId[id]).filter((v, i, a) => a.indexOf(v) === i).slice(0, MAXC) : [];
      if (cmp.length >= 2) { $("#cmp-tray").classList.add("open"); map.closePopup(); }
      syncCmp(true);
      fitCmp();
    };
    window.addEventListener("hashchange", fromHash);

    // ---------- charts ----------
    const hbar = (rows, val, fmt, color, max) => rows.map((d) => `<div class="hbar"><button type="button" data-id="${d.id}" title="${esc(d.name)}">${esc(short(d.name))}</button><div class="track"><div class="fill" style="width:${((val(d) / max) * 100).toFixed(1)}%;background:${color};box-shadow:0 0 12px ${color}"></div></div><span class="val" style="color:${color}">${fmt(d)}</span></div>`).join("");
    const wire = (el) => el.querySelectorAll("button[data-id]").forEach((b) => b.addEventListener("click", () => flyTo(byId[b.dataset.id])));
    const drawPP = (w) => {
      const rows = w === "hi" ? top.slice(0, 15) : top.slice(-15).reverse();
      $("#chart-pp").innerHTML = hbar(rows, (d) => d.pp, (d) => dollars(d.pp), w === "hi" ? C.pink : C.lime, top[0].pp); wire($("#chart-pp"));
    };
    pills($("#pp-tabs"), [["hi", "Highest 15"], ["lo", "Lowest 15"]], "hi", drawPP); drawPP("hi");
    $("#chart-bud").innerHTML = hbar(big.slice(0, 15), (d) => d.bud27, (d) => money(d.bud27) + " <small style='color:" + C.ink + "'>" + pct(d.budchg) + "</small>", C.blue, big[0].bud27); wire($("#chart-bud"));
    const drawSal = (w) => {
      const rows = w === "hi" ? sal.slice(0, 15) : sal.slice(-15).reverse();
      $("#chart-sal").innerHTML = hbar(rows, (d) => d.tsal, (d) => dollars(d.tsal), w === "hi" ? C.pink : C.teal, sal[0].tsal); wire($("#chart-sal"));
    };
    pills($("#sal-tabs"), [["hi", "Highest 15"], ["lo", "Lowest 15"]], "hi", drawSal); drawSal("hi");
    const scatter = (el, pts, xget, yget, X0, X1, Y0, Y1, xticks, yticks, xfmt, yfmt, xlab, medY, tipf, logx) => {
      const W = 1100, H = 440, P = { l: 70, r: 20, t: 16, b: 46 };
      const xs = (v) => (logx ? Math.log10(v) : v), x0 = xs(X0), x1 = xs(X1);
      const X = (v) => P.l + ((xs(v) - x0) / (x1 - x0)) * (W - P.l - P.r), Y = (v) => H - P.b - ((v - Y0) / (Y1 - Y0)) * (H - P.t - P.b);
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
      xticks.forEach((v) => { s += `<line x1="${X(v)}" x2="${X(v)}" y1="${P.t}" y2="${H - P.b}" stroke="#1a1a22"/><text x="${X(v)}" y="${H - P.b + 20}" text-anchor="middle">${xfmt(v)}</text>`; });
      yticks.forEach((v) => { s += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1a1a22"/><text x="${P.l - 10}" y="${Y(v) + 4}" text-anchor="end">${yfmt(v)}</text>`; });
      if (medY != null) s += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(medY)}" y2="${Y(medY)}" stroke="${C.lime}" stroke-dasharray="4 5" opacity=".7"/><text x="${W - P.r}" y="${Y(medY) - 6}" text-anchor="end" style="fill:${C.lime}">MEDIAN ${yfmt(medY)}</text>`;
      s += `<text x="${(W + P.l) / 2}" y="${H - 6}" text-anchor="middle" style="fill:${C.lime}">${xlab}</text>`;
      pts.forEach((d) => { const c = d.county === "Nassau" ? C.blue : C.teal; s += `<circle cx="${X(Math.min(Math.max(xget(d), X0), X1)).toFixed(1)}" cy="${Y(Math.min(Math.max(yget(d), Y0), Y1)).toFixed(1)}" r="6" fill="${c}" fill-opacity=".85" stroke="#000" style="filter:drop-shadow(0 0 4px ${c});cursor:pointer" data-id="${d.id}"/>`; });
      s += `</svg><div class="sc-tip" hidden></div><p class="sc-key"><span class="sw" style="background:${C.blue};box-shadow:0 0 8px ${C.blue}"></span>NASSAU &nbsp;&nbsp; <span class="sw" style="background:${C.teal};box-shadow:0 0 8px ${C.teal}"></span>SUFFOLK</p>`;
      el.innerHTML = s; const tip = el.querySelector(".sc-tip");
      el.querySelectorAll("circle").forEach((c) => {
        const d = byId[c.dataset.id];
        c.addEventListener("mouseenter", () => { tip.hidden = false; tip.innerHTML = tipf(d); const r = el.getBoundingClientRect(), b = c.getBoundingClientRect(); tip.style.left = Math.max(0, Math.min(b.left - r.left + 10, r.width - 300)) + "px"; tip.style.top = b.top - r.top - 36 + "px"; c.setAttribute("r", 9); });
        c.addEventListener("mouseleave", () => { tip.hidden = true; c.setAttribute("r", 6); });
        c.addEventListener("click", () => flyTo(d));
      });
    };
    scatter($("#scatter"), B.filter((d) => !isCHS(d) && d.enr27), (d) => d.enr27, (d) => d.pp, 30, 20000, 20000, 160000, [50, 100, 500, 1000, 5000, 10000], [40000, 80000, 120000, 160000], (v) => (v >= 1000 ? v / 1000 + "K" : v), (v) => "$" + Math.round(v / 1000) + "K", "STUDENTS (BUDGET ENROLLMENT, LOG SCALE)", LI.medpp, (d) => `<b>${esc(short(d.name))}</b> · ${int(d.enr27)} students · ${dollars(d.pp)}`, true);
    scatter($("#scatter2"), DATA.filter((d) => d.pp != null && d.ela != null && !isCHS(d)), (d) => d.pp, (d) => d.ela, 25000, 110000, 10, 100, [30000, 50000, 70000, 90000, 110000], [20, 40, 60, 80, 100], (v) => "$" + v / 1000 + "K", (v) => Math.round(v) + "%", "BUDGET PER PUPIL 2026-27 (CAPPED AT $110K)", LI.ela, (d) => `<b>${esc(short(d.name))}</b> · ${dollars(d.pp)} · ELA ${d.ela}%`, false);

    // ---------- table ----------
    const COLS = [
      ["cmp", "✓", (d) => `<input type="checkbox" class="rowcmp" data-id="${d.id}" aria-label="Compare ${esc(d.name)}"${inCmp(d) ? " checked" : ""}>`],
      ["name", "District", (d) => esc(d.name)],
      ["county", "County", (d) => `<span class="cty ${d.county[0]}">${d.county}</span>`],
      ["pk12", "Students", (d) => int(d.pk12)],
      ["k12chg", "K-12 chg", (d) => `<span class="${cls(d.k12chg) === "up" ? "down" : cls(d.k12chg) === "down" ? "up" : ""}">${pct(d.k12chg)}</span>`],
      ["bud27", "Budget 26-27", (d) => money(d.bud27)],
      ["budchg", "Budget chg", (d) => `<span class="${cls(d.budchg)}">${pct(d.budchg)}</span>`],
      ["pp", "Per pupil", (d) => dollars(d.pp) + (isCHS(d) ? ' <span class="nr">7-12</span>' : "")],
      ["levy27", "Tax levy", (d) => money(d.levy27)],
      ["levychg", "Levy chg", (d) => `<span class="${cls(d.levychg)}">${pct(d.levychg)}</span>`],
      ["cap", "Tax cap", (d) => d.cap == null ? NR : d.cap < 0 ? '<span class="over">OVER</span>' : "Within"],
      ["grad", "Grad rate", (d) => d.grad == null ? nr(d.grad_flag === "No high school" ? "No HS" : d.grad_flag) : d.grad + "%"],
      ["ela", "ELA 3-8", (d) => d.ela == null ? nr(d.ela_flag === "Suppressed by NYSED" ? "Suppr." : d.ela_flag === "No students tested" ? "None" : "N/R") : d.ela + "%"],
      ["math", "Math 3-8", (d) => d.math == null ? nr(d.math_flag === "Suppressed by NYSED" ? "Suppr." : d.math_flag === "No students tested" ? "None" : "N/R") : d.math + "%"],
      ["tsal", "Teacher median", (d) => dollars(d.tsal)],
    ];
    let sortK = "bud27", sortDir = -1, tq = "", tc = "";
    const drawTable = () => {
      const rows = DATA.filter((d) => (!tc || d.county === tc) && (!tq || d.name.toLowerCase().includes(tq))).sort((a, b) => {
        const x = a[sortK], y = b[sortK];
        if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
        return (typeof x === "string" ? x.localeCompare(y) : x - y) * sortDir;
      });
      $("#ex-table").innerHTML = `<table class="data"><thead><tr>${COLS.map(([k, l]) => `<th data-k="${k}" class="${k === sortK ? "sorted" : ""}${k === "cmp" ? " ck" : ""}" title="${k === "cmp" ? "Tick to compare" : "Sort"}">${l}${k === sortK ? (sortDir > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead><tbody>${rows.map((d) => `<tr data-id="${d.id}" class="${selected && selected.id === d.id ? "sel" : ""}">${COLS.map(([k, , f]) => `<td${k === "cmp" ? ' class="ck"' : ""}>${f(d)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      $("#ex-count").textContent = `Showing ${rows.length} of ${DATA.length} districts`;
      document.querySelectorAll("#ex-table th").forEach((th) => th.addEventListener("click", () => { const k = th.dataset.k; if (k === "cmp") return; if (k === sortK) sortDir *= -1; else { sortK = k; sortDir = k === "name" || k === "county" ? 1 : -1; } drawTable(); }));
      document.querySelectorAll("#ex-table tbody tr").forEach((tr) => tr.addEventListener("click", (e) => {
        if (e.target.closest("td.ck")) { if (e.target.tagName !== "INPUT") { const c = tr.querySelector("input"); c.checked = !c.checked; } toggleCmp(byId[tr.dataset.id]); return; }
        flyTo(byId[tr.dataset.id]);
      }));
    };
    $("#ex-q").addEventListener("input", (e) => { tq = e.target.value.trim().toLowerCase(); drawTable(); });
    pills($("#ex-county"), [["", "All"], ["Nassau", "Nassau"], ["Suffolk", "Suffolk"]], "", (v) => { tc = v; drawTable(); });
    drawTable();
    fromHash();
  }
})();
