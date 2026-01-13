const items = [
  {
    id: "poco",
    label: "Poço dos Desejos",
    img: "IMG/po%C3%A7o_dos_desejos.png"
  },
  {
    id: "pocoPequeno",
    label: "Pequeno Poço dos Desejos",
    img: "IMG/pequeno_po%C3%A7o_dos_desejos.png"
  },
  {
    id: "fonte",
    label: "Fonte da Juventude",
    img: "IMG/fonte_da_juventude.png"
  },
  {
    id: "fontePequena",
    label: "Fonte da Juventude Pequena",
    img: "IMG/fonte_da_juventude_pequena.png"
  }
];

const worlds = [
  { id: "BR1", label: "Arvahall (br1)" },
  { id: "BR2", label: "Brisgard (br2)" },
  { id: "BR3", label: "Cirgard (br3)" },
  { id: "BR4", label: "Dinegu (br4)" },
  { id: "BR5", label: "East-Nagach (br5)" },
  { id: "BR6", label: "Fel Dranghyr (br6)" },
  { id: "BR7", label: "Greifental (br7)" },
  { id: "BR8", label: "Houndsmoor (br8)" },
  { id: "BR9", label: "Jaims (br9)" },
  { id: "BR10", label: "Korch (br10)" },
  { id: "BR11", label: "Langendorn (br11)" }
];

const statTypes = [
  { id: "diamondsTotal", label: "Diamantes (total da conta)", scope: "global" },
  { id: "diamondsFarmed", label: "Diamantes farmados no dia", scope: "global" },
  { id: "fp", label: "Pontos Forge ganhos", scope: "world" },
  { id: "medals", label: "Medalhas ganhas", scope: "world" },
  { id: "goods", label: "Mercadorias produzidas", scope: "world" },
  { id: "custom", label: "Outra estatística (personalizada)", scope: "both" }
];

const storageKey = "foe-accounts-v1";

const dom = {
  worlds: document.getElementById("worlds"),
  globalItems: document.getElementById("globalItems"),
  grandTotal: document.getElementById("grandTotal"),
  accountName: document.getElementById("accountName"),
  tabs: document.querySelectorAll(".tab-button"),
  tabPanels: document.querySelectorAll("[data-tab-panel]"),
  exportJson: document.getElementById("exportJson"),
  importJson: document.getElementById("importJson"),
  farmSummaryList: document.getElementById("farmSummaryList"),
  farmMore: document.getElementById("farmMore"),
  farmPopover: document.getElementById("farmPopover"),
  farmPopoverList: document.getElementById("farmPopoverList"),
  farmClose: document.getElementById("farmClose"),
  statForm: document.getElementById("statForm"),
  statDate: document.getElementById("statDate"),
  statType: document.getElementById("statType"),
  statWorld: document.getElementById("statWorld"),
  statCustomField: document.getElementById("statCustomField"),
  statCustomLabel: document.getElementById("statCustomLabel"),
  statValue: document.getElementById("statValue"),
  statRows: document.getElementById("statRows"),
  statEmpty: document.getElementById("statEmpty"),
  statCount: document.getElementById("statCount")
};

const state = loadState();

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    try {
      return normalizeState(JSON.parse(raw));
    } catch (_) {
      localStorage.removeItem(storageKey);
    }
  }

  return normalizeState({
    accountName: "",
    worlds: {},
    stats: [],
    diamondFarm: {}
  });
}

function normalizeState(data) {
  const base = {
    accountName: data.accountName || "",
    worlds: {},
    stats: [],
    diamondFarm: {}
  };
  worlds.forEach((world) => {
    base.worlds[world.id] = base.worlds[world.id] || {};
    items.forEach((item) => {
      const value = Number(data.worlds?.[world.id]?.[item.id] ?? 0);
      base.worlds[world.id][item.id] = Number.isFinite(value) && value >= 0 ? value : 0;
    });
  });

  base.stats = normalizeStats(Array.isArray(data.stats) ? data.stats : []);
  base.diamondFarm = normalizeDiamondFarm(data.diamondFarm || {});
  return base;
}

function normalizeStats(entries) {
  const knownWorlds = new Set(worlds.map((world) => world.id));
  const typeMap = new Map(statTypes.map((type) => [type.id, type]));
  return entries
    .map((entry) => {
      if (!entry) return null;
      const statId = typeof entry.statId === "string" ? entry.statId : entry.type;
      const type = typeMap.get(statId) || null;
      const rawWorld = entry.worldId || entry.world || "GLOBAL";
      let worldId = rawWorld === "GLOBAL" ? "GLOBAL" : rawWorld;
      if (worldId !== "GLOBAL" && !knownWorlds.has(worldId)) {
        return null;
      }
      if (type?.scope === "global") {
        worldId = "GLOBAL";
      } else if (type?.scope === "world" && worldId === "GLOBAL") {
        worldId = worlds[0].id;
      }
      const value = Number(entry.value);
      if (!Number.isFinite(value) || value < 0) return null;
      const date = typeof entry.date === "string" ? entry.date : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      const label = typeof entry.label === "string" ? entry.label.trim() : "";
      if (type?.id === "custom" && !label) return null;
      const resolvedLabel = type && type.id !== "custom" ? type.label : label;
      return {
        id: typeof entry.id === "string" ? entry.id : createId(),
        date,
        worldId,
        statId: type ? type.id : "custom",
        label: resolvedLabel,
        value: Math.round(value)
      };
    })
    .filter(Boolean);
}

function normalizeDiamondFarm(data) {
  const base = {};
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  worlds.forEach((world) => {
    base[world.id] = {};
    const entries = data?.[world.id] || {};
    Object.keys(entries).forEach((date) => {
      if (!dateRegex.test(date)) return;
      const value = Number(entries[date]);
      if (Number.isFinite(value) && value >= 0) {
        base[world.id][date] = Math.round(value);
      }
    });
  });
  return base;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify({ version: 2, ...state }));
}

function createWorldCard(world, index) {
  const card = document.createElement("article");
  card.className = "world";
  card.style.animationDelay = `${index * 40}ms`;

  const header = document.createElement("div");
  header.className = "world__header";

  const title = document.createElement("h3");
  title.className = "world__title";
  title.textContent = world.label;

  const total = document.createElement("span");
  total.className = "world__total";
  total.dataset.worldTotal = world.id;
  total.textContent = "Total: 0";

  header.append(title, total);

  const list = document.createElement("div");
  list.className = "items";

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "item";

    const img = document.createElement("img");
    img.src = item.img;
    img.alt = item.label;

    const label = document.createElement("div");
    label.className = "item__label";
    label.textContent = item.label;

    const controls = document.createElement("div");
    controls.className = "controls";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "-";
    minus.dataset.world = world.id;
    minus.dataset.item = item.id;
    minus.dataset.action = "minus";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.value = state.worlds[world.id][item.id];
    input.dataset.world = world.id;
    input.dataset.item = item.id;

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.dataset.world = world.id;
    plus.dataset.item = item.id;
    plus.dataset.action = "plus";

    controls.append(minus, input, plus);
    row.append(img, label, controls);
    list.appendChild(row);
  });

  const farm = createFarmSection(world.id);
  card.append(header, list, farm);
  return card;
}

function createFarmSection(worldId) {
  const wrapper = document.createElement("div");
  wrapper.className = "farm";

  const header = document.createElement("div");
  header.className = "farm__header";
  header.innerHTML = `
    <div>
      <h4>Farm de Diamantes</h4>
      <p>Somado automaticamente por dia.</p>
    </div>
    <span class="farm__today" data-farm-today="${worldId}">Hoje: 0</span>
  `;

  const controls = document.createElement("div");
  controls.className = "farm__controls";

  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.placeholder = "Qtd";
  input.dataset.farmInput = worldId;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button--primary";
  button.textContent = "+";
  button.dataset.action = "farm-add";
  button.dataset.world = worldId;

  controls.append(input, button);

  const list = document.createElement("div");
  list.className = "farm__list";
  list.dataset.farmList = worldId;

  wrapper.append(header, controls, list);
  renderFarmList(worldId, list);
  return wrapper;
}

function render() {
  dom.accountName.value = state.accountName;
  dom.worlds.innerHTML = "";
  worlds.forEach((world, index) => {
    dom.worlds.appendChild(createWorldCard(world, index));
  });
  renderGlobalTotals();
  updateWorldTotals();
  renderFarmSummary();
}

function updateWorldTotals() {
  worlds.forEach((world) => {
    const worldTotal = items.reduce((sum, item) => sum + state.worlds[world.id][item.id], 0);
    const target = document.querySelector(`[data-world-total='${world.id}']`);
    if (target) {
      target.textContent = `Total: ${worldTotal}`;
    }
  });
}

function renderGlobalTotals() {
  dom.globalItems.innerHTML = "";
  const totals = items.map((item) => {
    const total = worlds.reduce((sum, world) => sum + state.worlds[world.id][item.id], 0);
    const line = document.createElement("div");
    line.className = "total-line";
    line.innerHTML = `<span>${item.label}</span><strong>${total}</strong>`;
    dom.globalItems.appendChild(line);
    return total;
  });

  const grand = totals.reduce((sum, value) => sum + value, 0);
  dom.grandTotal.textContent = grand;
}

function getGlobalFarmTotals() {
  const totals = {};
  worlds.forEach((world) => {
    const entries = state.diamondFarm?.[world.id] || {};
    Object.keys(entries).forEach((date) => {
      totals[date] = (totals[date] || 0) + entries[date];
    });
  });
  return Object.entries(totals)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderFarmSummary() {
  const all = getGlobalFarmTotals();
  const latest = all.slice(0, 3);
  renderFarmRows(dom.farmSummaryList, latest, all.length === 0);
  renderFarmRows(dom.farmPopoverList, all, all.length === 0);

  if (all.length > 3) {
    dom.farmMore.hidden = false;
  } else {
    dom.farmMore.hidden = true;
    closeFarmPopover();
  }
}

function renderFarmRows(container, entries, isEmpty) {
  if (!container) return;
  container.innerHTML = "";
  if (isEmpty) {
    container.innerHTML = `<div class="farm-summary__empty">Nenhum registro ainda.</div>`;
    return;
  }
  entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "farm-summary__row";
    row.innerHTML = `<span>${formatDate(entry.date)}</span><strong>${entry.total}</strong>`;
    container.appendChild(row);
  });
}

function adjustValue(worldId, itemId, delta) {
  const current = state.worlds[worldId][itemId];
  const next = Math.max(0, current + delta);
  state.worlds[worldId][itemId] = next;
  saveState();
  const input = document.querySelector(`input[data-world='${worldId}'][data-item='${itemId}']`);
  if (input) {
    input.value = next;
  }
  updateWorldTotals();
  renderGlobalTotals();
}

function handleInputChange(event) {
  const input = event.target;
  if (!input.matches("input[data-world][data-item]")) return;
  const worldId = input.dataset.world;
  const itemId = input.dataset.item;
  const value = Math.max(0, Number.parseInt(input.value, 10) || 0);
  state.worlds[worldId][itemId] = value;
  input.value = value;
  saveState();
  updateWorldTotals();
  renderGlobalTotals();
}

function handleButtonClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "farm-add") {
    handleFarmAdd(button.dataset.world);
    return;
  }
  const worldId = button.dataset.world;
  const itemId = button.dataset.item;
  const delta = button.dataset.action === "plus" ? 1 : -1;
  adjustValue(worldId, itemId, delta);
}

function handleAccountName(event) {
  state.accountName = event.target.value;
  saveState();
}

function initTabs() {
  dom.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
  });
}

function setActiveTab(tabId) {
  dom.tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === tabId;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  dom.tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabId;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function initSelectors() {
  dom.statType.innerHTML = "";
  statTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type.id;
    option.textContent = type.label;
    dom.statType.appendChild(option);
  });

  dom.statWorld.innerHTML = "";
  const globalOption = document.createElement("option");
  globalOption.value = "GLOBAL";
  globalOption.textContent = "Global (conta toda)";
  dom.statWorld.appendChild(globalOption);

  worlds.forEach((world) => {
    const option = document.createElement("option");
    option.value = world.id;
    option.textContent = world.label;
    dom.statWorld.appendChild(option);
  });
}

function handleStatTypeChange() {
  const type = statTypes.find((stat) => stat.id === dom.statType.value);
  const isCustom = type?.id === "custom";
  const isGlobal = type?.scope === "global";

  dom.statCustomField.hidden = !isCustom;
  dom.statCustomLabel.required = isCustom;
  if (!isCustom) {
    dom.statCustomLabel.value = "";
  }

  if (isGlobal) {
    dom.statWorld.value = "GLOBAL";
    dom.statWorld.disabled = true;
  } else {
    dom.statWorld.disabled = false;
    if (dom.statWorld.value === "GLOBAL") {
      dom.statWorld.value = worlds[0].id;
    }
  }
}

function handleStatSubmit(event) {
  event.preventDefault();
  const type = statTypes.find((stat) => stat.id === dom.statType.value);
  if (!type) return;

  const date = dom.statDate.value || todayISO();
  const rawValue = Number.parseInt(dom.statValue.value, 10);
  if (!Number.isFinite(rawValue) || rawValue < 0) return;

  let worldId = dom.statWorld.value;
  if (type.scope === "global") {
    worldId = "GLOBAL";
  }

  const customLabel = dom.statCustomLabel.value.trim();
  if (type.id === "custom" && !customLabel) return;

  const entry = {
    id: createId(),
    date,
    worldId,
    statId: type.id,
    label: type.id === "custom" ? customLabel : type.label,
    value: rawValue
  };

  state.stats.unshift(entry);
  saveState();
  renderStats();
  dom.statForm.reset();
  dom.statDate.value = todayISO();
  dom.statType.value = type.id;
  handleStatTypeChange();
}

function renderStats() {
  dom.statRows.innerHTML = "";
  if (!state.stats.length) {
    dom.statEmpty.style.display = "block";
  } else {
    dom.statEmpty.style.display = "none";
  }

  const sorted = [...state.stats].sort((a, b) => {
    if (a.date === b.date) return a.id.localeCompare(b.id);
    return b.date.localeCompare(a.date);
  });

  sorted.forEach((entry) => {
    const row = document.createElement("tr");
    const worldLabel = entry.worldId === "GLOBAL" ? "Global" : getWorldLabel(entry.worldId);

    row.innerHTML = `
      <td>${formatDate(entry.date)}</td>
      <td>${worldLabel}</td>
      <td>${entry.label}</td>
      <td>${entry.value}</td>
      <td><button class="button button--small" type="button" data-remove="${entry.id}">Remover</button></td>
    `;
    dom.statRows.appendChild(row);
  });

  dom.statCount.textContent = `${state.stats.length} registros`;
}

function handleStatRemove(event) {
  const button = event.target.closest("button[data-remove]");
  if (!button) return;
  const id = button.dataset.remove;
  state.stats = state.stats.filter((entry) => entry.id !== id);
  saveState();
  renderStats();
}

function handleExport() {
  const data = { version: 2, ...state };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `foe-accounts-${safeName(state.accountName)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    applyState(normalizeState(data));
  } catch (_) {
    alert("Não foi possível importar o JSON. Verifique o arquivo.");
  }
  event.target.value = "";
}

function applyState(newState) {
  state.accountName = newState.accountName;
  state.worlds = newState.worlds;
  state.stats = newState.stats;
  state.diamondFarm = newState.diamondFarm || normalizeDiamondFarm({});
  saveState();
  render();
  renderStats();
  renderFarmSummary();
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  const safeDate = new Date(`${value}T00:00:00`);
  return safeDate.toLocaleDateString("pt-BR");
}

function getWorldLabel(id) {
  const world = worlds.find((item) => item.id === id);
  return world ? world.label : id;
}

function safeName(name) {
  const cleaned = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "conta";
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function handleFarmAdd(worldId) {
  const input = document.querySelector(`input[data-farm-input='${worldId}']`);
  if (!input) return;
  const value = Number.parseInt(input.value, 10);
  if (!Number.isFinite(value) || value <= 0) return;
  const date = todayISO();
  if (!state.diamondFarm[worldId]) {
    state.diamondFarm[worldId] = {};
  }
  state.diamondFarm[worldId][date] = (state.diamondFarm[worldId][date] || 0) + value;
  saveState();
  input.value = "";
  renderFarmList(worldId);
  renderFarmSummary();
}

function renderFarmList(worldId, listEl) {
  const list = listEl || document.querySelector(`[data-farm-list='${worldId}']`);
  if (!list) return;
  const entries = state.diamondFarm?.[worldId] || {};
  const dates = Object.keys(entries).sort((a, b) => b.localeCompare(a));
  list.innerHTML = "";

  if (!dates.length) {
    list.innerHTML = `<div class="farm__empty">Nenhum registro ainda.</div>`;
  } else {
    dates.forEach((date) => {
      const row = document.createElement("div");
      row.className = "farm__row";
      row.innerHTML = `<span>${formatDate(date)}</span><strong>${entries[date]}</strong>`;
      list.appendChild(row);
    });
  }

  const today = todayISO();
  const todayValue = entries[today] || 0;
  const todayLabel = document.querySelector(`[data-farm-today='${worldId}']`);
  if (todayLabel) {
    todayLabel.textContent = `Hoje: ${todayValue}`;
  }
}

function openFarmPopover() {
  if (dom.farmPopover.hidden) {
    dom.farmPopover.hidden = false;
    dom.farmMore.setAttribute("aria-expanded", "true");
    document.addEventListener("click", handleDocumentClick);
  }
}

function closeFarmPopover() {
  if (!dom.farmPopover.hidden) {
    dom.farmPopover.hidden = true;
    dom.farmMore.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", handleDocumentClick);
  }
}

function handleDocumentClick(event) {
  const target = event.target;
  if (target.closest("#farmMore")) return;
  if (target.closest("#farmClose")) return;
  if (target.closest(".farm-summary__popover-card")) return;
  closeFarmPopover();
}

dom.worlds.addEventListener("click", handleButtonClick);
dom.worlds.addEventListener("input", handleInputChange);
dom.accountName.addEventListener("input", handleAccountName);
dom.statType.addEventListener("change", handleStatTypeChange);
dom.statForm.addEventListener("submit", handleStatSubmit);
dom.statRows.addEventListener("click", handleStatRemove);
dom.exportJson.addEventListener("click", handleExport);
dom.importJson.addEventListener("change", handleImport);
dom.farmMore.addEventListener("click", openFarmPopover);
dom.farmClose.addEventListener("click", closeFarmPopover);

initTabs();
initSelectors();
render();
renderStats();

if (!dom.statDate.value) {
  dom.statDate.value = todayISO();
}

handleStatTypeChange();
