// STICKERS comes from data.js (a list of objects, one per spreadsheet row)

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const objectFilter = document.getElementById("objectFilter");
const seriesFilter = document.getElementById("seriesFilter");
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
  const haystack = [s.name, s.text, s.company, s.series, s.colors].join(" ").toLowerCase();
  return (!q || haystack.includes(q))
      && (!objectFilter.value || s.object === objectFilter.value)
      && (!seriesFilter.value || s.series === seriesFilter.value);
}

// Which view are we in? "stickers" or "objects"
let view = "stickers";
const objDialog = document.getElementById("objDetail");

// 3. Draw the cards
function render() {
  if (view === "objects") return renderObjects();
  grid.className = "";
  const shown = STICKERS.filter(matches);
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

function openObject(o) {
  const stickers = STICKERS.filter(s => s.object === o.name);
  document.getElementById("objBody").innerHTML = `
    <h2>${o.name}</h2>
    ${o.context ? `<p class="context">${o.context}</p>` : ""}
    <div class="photos">${o.photos.map(p => `<img src="photos/${p}.jpg" alt="${o.name}">`).join("")}</div>
    <h3>Stickers on it (${stickers.length})</h3>
    <div class="mini">${stickers.map(s => `<div data-id="${s.id}">${s.img ? `<img src="${s.img}" alt="">` : ""}${s.name}</div>`).join("")}</div>`;
  // clicking a mini sticker opens that sticker's detail popup
  for (const el of document.querySelectorAll(".mini div")) {
    el.onclick = () => { objDialog.close(); openDetail(STICKERS.find(s => s.id == el.dataset.id)); };
  }
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
  objectFilter.hidden = seriesFilter.hidden = (v === "objects");
  render();
}
document.getElementById("viewStickers").onclick = () => setView("stickers");
document.getElementById("viewObjects").onclick = () => setView("objects");

// 4. The popup with big sticker, details, and the full photo
function openDetail(s) {
  const row = (label, value) => value ? `<dt>${label}</dt><dd>${value}</dd>` : "";
  document.getElementById("dSticker").src = s.img || "";
  document.getElementById("dSticker").style.display = s.img ? "" : "none";
  document.getElementById("dInfo").innerHTML = `
    <h2>${s.name}</h2>
    <dl>
      ${row("Text on sticker", s.text)}
      ${row("Series", s.series)}
      ${row("Company / product", s.company)}
      ${row("Object", s.object)}
      ${row("Location on object", s.where)}
      ${row("Condition", s.status)}
      ${row("Colors", s.colors)}
      ${row("Story", s.story)}
      ${s.repeat ? row("Repeat?", "Yes, I have more than one") : ""}
    </dl>`;
  document.getElementById("dPhoto").src = `photos/${s.photo}.jpg`;
  dialog.showModal();
}
document.getElementById("close").onclick = () => dialog.close();
dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); }); // click outside closes

for (const el of [search, objectFilter, seriesFilter]) el.addEventListener("input", render);
render();
