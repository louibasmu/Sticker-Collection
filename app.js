// STICKERS comes from data.js (a list of objects, one per spreadsheet row)

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const objectFilter = document.getElementById("objectFilter");
const seriesFilter = document.getElementById("seriesFilter");
const sortBy = document.getElementById("sortBy");
const dialog = document.getElementById("detail");

// 1. Fill the dropdowns with every distinct object / series
function fillSelect(select, key) {
  const values = [...new Set(STICKERS.map(s => s[key]).filter(Boolean))].sort();
  for (const v of values) select.add(new Option(v, v));
}
fillSelect(objectFilter, "object");
fillSelect(seriesFilter, "series");

// 2. Decide which stickers match the current search + filters
function matches(s) {
  const q = search.value.trim().toLowerCase();
  const haystack = [s.name, s.text, s.company, s.series, s.colors, s.provenance, s.creator, s.date].join(" ").toLowerCase();
  return (!q || haystack.includes(q))
      && (!objectFilter.value || s.object === objectFilter.value)
      && (!seriesFilter.value || s.series === seriesFilter.value);
}

// Which view are we in? "stickers" or "objects"
let view = "stickers";
const objDialog = document.getElementById("objDetail");

// Turn the messy "date" text into a number we can sort on (year*12 + month).
// Handles "March 23, 2025", "12/11/2026", "Fall 2025 (...)", "2016-17 (...)". Unknown dates return null.
function dateValue(text) {
  if (!text) return null;
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  let m = text.match(/^([A-Za-z]+) \d+, (\d{4})/);          // March 23, 2025
  if (m && months.includes(m[1].slice(0, 3).toLowerCase()))
    return +m[2] * 12 + months.indexOf(m[1].slice(0, 3).toLowerCase());
  m = text.match(/^(\d+)\/\d+\/(\d{4})$/);                 // 12/11/2026
  if (m) return +m[2] * 12 + (+m[1] - 1);
  m = text.match(/(\d{4})/);                                  // first 4-digit year anywhere
  if (!m) return null;
  const seasons = { winter: 0, spring: 3, summer: 6, fall: 9 };
  const season = Object.keys(seasons).find(k => text.toLowerCase().startsWith(k));
  return +m[1] * 12 + (season ? seasons[season] : 0);
}

// Sort a list of stickers by the dropdown choice. Sticker with no date always go last.
function sortStickers(list) {
  const byText = key => (a, b) => (a[key] || "\uffff").localeCompare(b[key] || "\uffff", undefined, { numeric: true, sensitivity: "base" });
  const byDate = dir => (a, b) => {
    const x = dateValue(a.date), y = dateValue(b.date);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return dir * (x - y);
  };
  const choice = sortBy.value;
  const sorted = [...list];                       // copy so STICKERS itself stays in order
  if (choice === "az") sorted.sort(byText("name"));
  else if (choice === "za") sorted.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: "base" }));
  else if (choice === "oldest") sorted.sort(byDate(1));
  else if (choice === "newest") sorted.sort(byDate(-1));
  else if (choice === "series") sorted.sort(byText("series"));
  else if (choice === "object") sorted.sort(byText("object"));
  else sorted.sort((a, b) => (+a.index || 999) - (+b.index || 999)); // catalog number
  return sorted;
}

// 3. Draw the cards
function render() {
  if (view === "objects") return renderObjects();
  grid.className = "";
  const shown = sortStickers(STICKERS.filter(matches));
  document.getElementById("count").textContent = `${shown.length} of ${STICKERS.length} stickers`;
  grid.innerHTML = "";
  for (const s of shown) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="thumb">${s.img ? `<img src="${s.img}" alt="${s.name}" loading="lazy">`
                                 : `<span class="noimg">No close-up yet</span>`}</div>
      ${s.repeat ? '<span class="badge">Repeat</span>' : ""}
      <div class="label">${s.name}<small>${s.object}</small></div>`;
    card.addEventListener("click", () => openDetail(s));
    grid.appendChild(card);
  }
}

// Objects view: one card per object, using the first photo as its cover
function renderObjects() {
  const q = search.value.trim().toLowerCase();
  const shown = OBJECTS.filter(o => !q || (o.name + " " + o.context).toLowerCase().includes(q));
  document.getElementById("count").textContent = `${shown.length} objects`;
  grid.className = "objects";
  grid.innerHTML = "";
  for (const o of shown) {
    const n = STICKERS.filter(s => s.object === o.name).length;
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="thumb"><img src="photos/${o.photos[0]}.jpg" alt="${o.name}" loading="lazy"></div>
      <div class="label">${o.name}<small>${n} stickers</small></div>`;
    card.addEventListener("click", () => openObject(o));
    grid.appendChild(card);
  }
}

// one label/value pair, skipped when empty
const orow = (label, value) => value ? `<dt>${label}</dt><dd>${value}</dd>` : "";

// fromSticker (optional): the sticker popup we came from, so we can offer a Back button
function openObject(o, fromSticker = null) {
  const stickers = STICKERS.filter(s => s.object === o.name);
  document.getElementById("objBody").innerHTML = `
    ${fromSticker ? `<button class="back" id="objBack">← Back to ${fromSticker.name}</button>` : ""}
    <h2>${o.name}</h2>
    <dl class="record">
      ${orow("Date", o.date)}${orow("Creator / source", o.creator)}${orow("Description", o.description)}
      ${orow("Format / medium", o.format)}${orow("Provenance", o.provenance)}${orow("Significance", o.significance)}
    </dl>
    ${o.context ? `<h3>In my words</h3><p class="context">${o.context}</p>` : ""}
    <div class="photos">${o.photos.map(p => `<img src="photos/${p}.jpg" alt="${o.name}">`).join("")}</div>
    <h3>Stickers on it (${stickers.length})</h3>
    <div class="mini">${stickers.map(s => `<div data-id="${s.id}">${s.img ? `<img src="${s.img}" alt="">` : ""}${s.name}</div>`).join("")}</div>`;
  // clicking a mini sticker opens that sticker's detail popup
  for (const el of document.querySelectorAll(".mini div")) {
    el.onclick = () => { objDialog.close(); openDetail(STICKERS.find(s => s.id == el.dataset.id), o); };
  }
  const back = document.getElementById("objBack");
  if (back) back.onclick = () => { objDialog.close(); openDetail(fromSticker); };
  objDialog.showModal();
}
document.getElementById("objClose").onclick = () => objDialog.close();
objDialog.addEventListener("click", e => { if (e.target === objDialog) objDialog.close(); });

// Toggle buttons
function setView(v) {
  view = v;
  document.getElementById("viewStickers").classList.toggle("active", v === "stickers");
  document.getElementById("viewObjects").classList.toggle("active", v === "objects");
  // the dropdown filters only make sense for stickers
  objectFilter.hidden = seriesFilter.hidden = sortBy.hidden = (v === "objects");
  render();
}
document.getElementById("viewStickers").onclick = () => setView("stickers");
document.getElementById("viewObjects").onclick = () => setView("objects");

// Build a one-line description from the sticker's text, colors and series
function describe(s) {
  const bits = [];
  if (s.text) bits.push(`Text reads "${s.text}".`);
  if (s.colors) bits.push(`Colors: ${s.colors}.`);
  if (s.series) bits.push(`Series: ${s.series}.`);
  return bits.join(" ");
}

// 4. The popup with big sticker, details, and the full photo
// fromObject (optional): the object popup we came from, for the Back button
function openDetail(s, fromObject = null) {
  const row = (label, value) => value ? `<dt>${label}</dt><dd>${value}</dd>` : "";
  document.getElementById("dSticker").src = s.img || "";
  document.getElementById("dSticker").style.display = s.img ? "" : "none";
  // Catalog record: the same fields the assignment asks for (title, date, creator, description, format, provenance, significance)
  document.getElementById("dInfo").innerHTML = `
    <h2>${s.name}</h2>
    <p class="ident">Catalog no. ${s.index || "n/a"}</p>
    <dl>
      ${row("Date", s.date)}
      ${row("Creator / source", s.creator)}
      ${row("Description", describe(s))}
      ${row("Format / medium", s.format)}
      ${row("Dimensions", s.dimensions)}
      ${row("Provenance", s.provenance)}
      ${row("Significance", s.significance)}
      ${row("Story", s.story)}
      ${row("Current location", [s.object, s.where].filter(Boolean).join(", "))}
      ${row("Condition", s.status)}
      ${s.repeat ? row("Repeat?", "Yes, I have more than one") : ""}
    </dl>`;
  document.getElementById("dPhoto").src = `photos/${s.photo}.jpg`;

  // Back button (only when we arrived from an object popup)
  const dBack = document.getElementById("dBack");
  dBack.hidden = !fromObject;
  if (fromObject) {
    dBack.textContent = `← Back to ${fromObject.name}`;
    dBack.onclick = () => { dialog.close(); openObject(fromObject); };
  }

  // Clicking the "where it lives" photo opens that object's description
  const obj = OBJECTS.find(o => o.name === s.object);
  const photo = document.getElementById("dPhoto");
  photo.classList.toggle("clickable", !!obj);
  photo.onclick = obj ? () => { dialog.close(); openObject(obj, s); } : null;
  dialog.showModal();
}
document.getElementById("close").onclick = () => dialog.close();
dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); }); // click outside closes

for (const el of [search, objectFilter, seriesFilter, sortBy]) el.addEventListener("input", render);
render();
