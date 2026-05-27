let zones = [];
let subzones = [];

const groupLabels = {
  waterfront: "Waterfront",
  west: "West Core",
  core: "Central Core",
  east: "East Core",
  north: "North Core",
};

const state = {
  selectedId: null,
  selectedSubzoneId: null,
  group: "all",
};

const map = document.querySelector("#downtown-map");
const zoneTitle = document.querySelector("#zone-title");
const zoneDetails = document.querySelector("#zone-details");
const zoneCards = document.querySelector("#zone-cards");
const zoneSpotlight = document.querySelector("#zone-spotlight");
const spotlightTitle = document.querySelector("#spotlight-title");
const spotlightMap = document.querySelector("#spotlight-map");
const spotlightCopy = document.querySelector("#spotlight-copy");
const spotlightClose = document.querySelector("#spotlight-close");
const filters = [...document.querySelectorAll(".filter")];
const districtNodes = [...document.querySelectorAll(".district")];

function matchesGroup(zone) {
  return state.group === "all" || zone.group === state.group;
}

function getZone(id) {
  return zones.find((zone) => zone.id === id);
}

function getZoneSubzones(zoneId) {
  return subzones.filter((subzone) => subzone.zoneId === zoneId);
}

function isSubzoneMapped(subzone) {
  return ["mapX", "mapY", "w", "h"].every((key) => typeof subzone[key] === "number");
}

function getMappedZoneSubzones(zoneId) {
  return getZoneSubzones(zoneId).filter(isSubzoneMapped);
}

function getSelectedSubzone() {
  return subzones.find((subzone) => subzone.id === state.selectedSubzoneId);
}

function getSvgLabelLines(name) {
  return name
    .replace(" / ", " ")
    .split(" ")
    .reduce((lines, word) => {
      const current = lines[lines.length - 1] || "";
      const next = current ? `${current} ${word}` : word;

      if (next.length > 16 && current) {
        lines.push(word);
      } else if (lines.length === 0) {
        lines.push(word);
      } else {
        lines[lines.length - 1] = next;
      }

      return lines;
    }, [])
    .slice(0, 3);
}

function getSubzoneRect(subzone) {
  if (typeof subzone.mapX === "number" && typeof subzone.mapY === "number") {
    return {
      x: Math.round(subzone.mapX - subzone.w / 2),
      y: Math.round(subzone.mapY - subzone.h / 2),
      w: subzone.w,
      h: subzone.h,
    };
  }

  return {
    x: subzone.x,
    y: subzone.y,
    w: subzone.w,
    h: subzone.h,
  };
}

function getSubzonePath(subzone, rect) {
  const { x, y, w, h } = rect;

  if (subzone.type === "park") {
    return `M${x + 18} ${y} H${x + w - 18} L${x + w} ${y + 18} V${y + h - 18} L${x + w - 18} ${y + h} H${x + 18} L${x} ${y + h - 18} V${y + 18} Z`;
  }

  if (subzone.type === "terminal") {
    return `M${x} ${y + 10} H${x + w - 24} L${x + w} ${y + h / 2} L${x + w - 24} ${y + h - 10} H${x} Z`;
  }

  if (subzone.type === "station") {
    return `M${x + 18} ${y} H${x + w - 18} L${x + w} ${y + 18} V${y + h - 18} L${x + w - 18} ${y + h} H${x + 18} L${x} ${y + h - 18} V${y + 18} Z`;
  }

  if (subzone.type === "waterfront") {
    return `M${x} ${y + 14} H${x + w - 20} L${x + w} ${y + 34} V${y + h - 10} H${x + 18} L${x} ${y + h - 28} Z`;
  }

  if (subzone.type === "square" || subzone.type === "civic" || subzone.type === "cultural") {
    return `M${x + 16} ${y} H${x + w - 16} V${y + 16} H${x + w} V${y + h - 16} H${x + w - 16} V${y + h} H${x + 16} V${y + h - 16} H${x} V${y + 16} H${x + 16} Z`;
  }

  if (subzone.type === "district") {
    return `M${x} ${y + 14} H${x + 22} V${y} H${x + w - 18} V${y + 18} H${x + w} V${y + h - 16} H${x + w - 26} V${y + h} H${x + 18} V${y + h - 20} H${x} Z`;
  }

  if (subzone.type === "building") {
    return `M${x} ${y} H${x + w - 18} L${x + w} ${y + 18} V${y + h} H${x + 16} L${x} ${y + h - 16} Z`;
  }

  return `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
}

function getTypeLabel(type) {
  const labels = {
    arena: "A",
    attraction: "A",
    building: "B",
    civic: "C",
    corridor: "R",
    cultural: "C",
    district: "D",
    landmark: "L",
    park: "P",
    square: "S",
    station: "U",
    terminal: "T",
    tower: "N",
    waterfront: "W",
  };

  return labels[type] || "S";
}

function estimateSvgTextWidth(lines) {
  const longestLine = Math.max(...lines.map((line) => line.length));
  return longestLine * 9.6;
}

function renderDistrictState() {
  districtNodes.forEach((node) => {
    const zone = getZone(node.dataset.zone);
    const isMatch = zone && matchesGroup(zone);
    const isSelected = zone && zone.id === state.selectedId;

    node.classList.toggle("is-muted", !isMatch);
    node.classList.toggle("is-selected", Boolean(isSelected));
  });
}

function renderSubzoneBlocks(zone) {
  const zoneSubzones = getMappedZoneSubzones(zone.id);

  if (zoneSubzones.length === 0) {
    return `
      <text class="region-empty" x="450" y="230">
        <tspan x="450">Map placement pending</tspan>
        <tspan x="450" dy="28">Subzones are loaded and ready for layout.</tspan>
      </text>
    `;
  }

  return zoneSubzones
    .map(
      (subzone, index) => {
        const labelLines = getSvgLabelLines(subzone.name);
        const rect = getSubzoneRect(subzone);
        const centerX = rect.x + rect.w / 2;
        const centerY = rect.y + rect.h / 2;
        const startY = centerY - (labelLines.length - 1) * 12 + 6;
        const labelWidth = Math.min(rect.w - 24, estimateSvgTextWidth(labelLines));
        const labelX = Math.max(rect.x + 12 + labelWidth / 2, Math.min(centerX, rect.x + rect.w - 12 - labelWidth / 2));

        return `
        <g class="subzone-block ${
          subzone.id === state.selectedSubzoneId ? "is-selected" : ""
        } type-${subzone.type}" data-subzone="${subzone.id}" tabindex="0" role="button" aria-label="${subzone.name}">
          <path d="${getSubzonePath(subzone, rect)}" />
          <text class="subzone-label" x="${labelX}" y="${startY}">
            ${labelLines
              .map((line, lineIndex) => `<tspan x="${labelX}" dy="${lineIndex === 0 ? 0 : 24}">${line}</tspan>`)
              .join("")}
          </text>
        </g>
      `;
      },
    )
    .join("");
}

function renderRegionBoard(zone) {
  const water = zone.group === "waterfront"
    ? '<path class="region-water" d="M0 318 C124 282 230 334 350 314 C486 292 574 342 720 310 C808 290 852 278 900 292 V500 H0 Z" />'
    : "";
  const zoneShape = zone.id === "harbourfront"
    ? "M72 108 H774 L846 184 L814 260 L850 338 L760 416 L592 382 L448 426 L314 394 L100 424 L52 312 L78 228 Z"
    : "M74 76 H812 L842 142 L824 230 L852 322 L790 420 L612 392 L450 430 L290 396 L96 422 L50 310 L70 208 Z";

  return `
    <svg class="region-map" viewBox="0 0 900 500" role="img" aria-label="${zone.name} detail board">
      <rect class="region-bg" width="900" height="500" />
      ${water}
      <path class="region-zone ${zone.group}-fill" d="${zoneShape}" />
      <text class="region-title" x="450" y="54">${zone.name}</text>
      ${renderSubzoneBlocks(zone)}
    </svg>
  `;
}

function renderDetails(zone) {
  const zoneSubzones = getZoneSubzones(zone.id);

  zoneTitle.textContent = zone.name;
  zoneDetails.innerHTML = `
    <div class="tag-row">
      <span class="tag">${groupLabels[zone.group]}</span>
      <span class="tag">${zoneSubzones.length} subzones</span>
    </div>
    <div class="detail-row">
      <span>Role</span>
      <span>${zone.role}</span>
    </div>
    <div class="detail-row">
      <span>Why</span>
      <span>${zone.summary}</span>
    </div>
    <div class="detail-row">
      <span>Detail</span>
      <span>Expanded subzone board opened below the downtown map.</span>
    </div>
  `;
}

function renderSubzoneList(zone) {
  const zoneSubzones = getZoneSubzones(zone.id);

  if (zoneSubzones.length === 0) {
    return `
      <div class="empty-subzones">
        This zone does not have landmark subzones yet.
      </div>
    `;
  }

  return `
    <div class="spot-list">
      ${zoneSubzones
        .map(
          (subzone, index) => `
            <button class="spot-item ${
              subzone.id === state.selectedSubzoneId ? "is-selected" : ""
            }" type="button" data-subzone="${subzone.id}">
              <span class="type-${subzone.type}" aria-hidden="true"></span>
              <strong>${subzone.name}</strong>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderSelectedSubzoneCopy() {
  const selectedSubzone = getSelectedSubzone();

  if (!selectedSubzone) {
    return "Pick a landmark subzone to prepare the future nearby-bars list.";
  }

  return selectedSubzone.summary;
}

function renderSpotlight(zone) {
  const zoneSubzones = getZoneSubzones(zone.id);

  spotlightTitle.textContent = `${zone.name} Subzones`;
  spotlightMap.innerHTML = renderRegionBoard(zone);
  spotlightCopy.innerHTML = `
    <div class="tag-row">
      <span class="tag">${groupLabels[zone.group]}</span>
      <span class="tag">${zoneSubzones.length} subzones</span>
      <span class="tag">venues later</span>
    </div>
    <p>${zone.summary}</p>
    ${renderSubzoneList(zone)}
    <div class="detail-row">
      <span>Selected</span>
      <span>${renderSelectedSubzoneCopy()}</span>
    </div>
    <div class="detail-row">
      <span>Later</span>
      <span>${zone.later}</span>
    </div>
  `;
  zoneSpotlight.classList.remove("is-hidden");
  bindSubzoneClicks();
}

function renderOverview() {
  state.selectedSubzoneId = null;
  zoneTitle.textContent = "Downtown overview";
  zoneDetails.innerHTML = `
    <p class="empty-state">
      This version is about the map skeleton: downtown Toronto is divided into clickable
      subzones first, with event and venue data arriving as later overlays.
    </p>
  `;
  zoneSpotlight.classList.add("is-hidden");
}

function selectSubzone(id) {
  const zone = getZone(state.selectedId);
  if (!zone) return;

  state.selectedSubzoneId = id;
  renderSpotlight(zone);
}

function bindSubzoneClicks() {
  const subzoneTargets = [...zoneSpotlight.querySelectorAll("[data-subzone]")];

  subzoneTargets.forEach((target) => {
    target.addEventListener("click", () => selectSubzone(target.dataset.subzone));
    target.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectSubzone(target.dataset.subzone);
      }
    });
  });
}

function selectZone(id) {
  const zone = getZone(id);
  if (!zone) return;

  state.selectedId = id;
  state.selectedSubzoneId = null;
  renderDistrictState();
  renderDetails(zone);
  renderSpotlight(zone);
  zoneSpotlight.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCards() {
  if (!zoneCards) return;

  zoneCards.replaceChildren();

  zones.filter(matchesGroup).forEach((zone) => {
    const zoneSubzones = getZoneSubzones(zone.id);
    const card = document.createElement("button");
    card.className = "zone-card";
    card.type = "button";
    card.dataset.zone = zone.id;
    card.innerHTML = `
      <h3>${zone.name}</h3>
      <p>${zone.role}</p>
      <div class="tag-row">
        <span class="tag">${groupLabels[zone.group]}</span>
        <span class="tag">${zoneSubzones.length} subzones</span>
      </div>
    `;
    card.addEventListener("click", () => selectZone(zone.id));
    zoneCards.append(card);
  });
}

function setGroup(group) {
  state.group = group;
  filters.forEach((button) => button.classList.toggle("is-active", button.dataset.group === group));
  renderDistrictState();
  renderCards();
}

function bindDistrictClicks() {
  districtNodes.forEach((node) => {
    node.addEventListener("click", () => selectZone(node.dataset.zone));
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectZone(node.dataset.zone);
      }
    });
  });
}

async function loadData() {
  const [zonesResponse, subzonesResponse] = await Promise.all([
    fetch("./data/zones.json?v=5"),
    fetch("./data/subzones.json?v=5"),
  ]);

  if (!zonesResponse.ok || !subzonesResponse.ok) {
    throw new Error("Could not load map data");
  }

  zones = await zonesResponse.json();
  subzones = await subzonesResponse.json();
}

function initializeApp() {
  bindDistrictClicks();

  filters.forEach((button) => {
    button.addEventListener("click", () => setGroup(button.dataset.group));
  });

  spotlightClose.addEventListener("click", () => {
    state.selectedId = null;
    renderDistrictState();
    renderOverview();
    map.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  map.addEventListener("click", (event) => {
    if (!event.target.closest(".district")) {
      state.selectedId = null;
      renderDistrictState();
      renderOverview();
    }
  });

  renderDistrictState();
  renderCards();
}

loadData()
  .then(initializeApp)
  .catch((error) => {
    zoneTitle.textContent = "Data failed to load";
    zoneDetails.innerHTML = `
      <p class="empty-state">
        Run this prototype through a local static server so it can load JSON data.
      </p>
    `;
    console.error(error);
  });
