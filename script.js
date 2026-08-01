// ================= CONFIG =================
const ROWS = 18,
  COLS = 34,
  CELL = 26;

const ALGOS = {
  dijkstra: {
    label: "Purple Line",
    short: "Dijkstra's Algorithm",
    color: "#A855F7",
    desc: "Expands the cheapest known route first using a priority queue. Always finds the optimal path when travel costs are non‑negative — the gold standard for weighted networks.",
  },
  astar: {
    label: "Green Line",
    short: "A* Search",
    color: "#34D399",
    desc: "Like Dijkstra, but adds a heuristic — straight‑line distance to the destination — to prioritise promising stations first. Usually reaches the destination while scanning far fewer nodes.",
  },
  bellmanford: {
    label: "Yellow Line",
    short: "Bellman–Ford",
    color: "#FBBF24",
    desc: "Relaxes every edge in the network, round after round, until nothing improves. Slower and sweeps the whole grid repeatedly, but can handle negative weights that break Dijkstra.",
  },
  bfs: {
    label: "Blue Line",
    short: "Breadth‑First Search",
    color: "#38BDF8",
    desc: "Explores hop‑by‑hop, ignoring travel cost entirely. Finds the path with the fewest stops — not necessarily the cheapest one when some segments are congested.",
  },
};

let currentAlgo = "dijkstra";
let mode = "wall";
let isDrawing = false;
let running = false;

// ================= GRID STATE =================
function makeGrid() {
  const g = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push({ wall: false, weight: 1 });
    g.push(row);
  }
  return g;
}
let grid = makeGrid();
let start = { r: 3, c: 3 };
let end = { r: ROWS - 4, c: COLS - 4 };

// visualization state
let visitedCells = new Map(); // "r,c" -> revealTime
let pathCellsFinal = [];
let pathRevealStart = null;
let runStartTime = null;
let runEndTime = null;
let lastResult = null;
let animToken = 0;

// ================= ALGORITHMS =================
function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}
function neighbors(r, c) {
  return [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ].filter(([nr, nc]) => inBounds(nr, nc));
}

class MinHeap {
  constructor() {
    this.a = [];
  }
  size() {
    return this.a.length;
  }
  push(item) {
    this.a.push(item);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.a[p].f <= this.a[i].f) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  pop() {
    const top = this.a[0];
    const last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      let i = 0;
      while (true) {
        let l = i * 2 + 1,
          r = i * 2 + 2,
          s = i;
        if (l < this.a.length && this.a[l].f < this.a[s].f) s = l;
        if (r < this.a.length && this.a[r].f < this.a[s].f) s = r;
        if (s === i) break;
        [this.a[s], this.a[i]] = [this.a[i], this.a[s]];
        i = s;
      }
    }
    return top;
  }
}

function reconstructPath(prev, start, end) {
  if (prev[end.r][end.c] === null && !(start.r === end.r && start.c === end.c))
    return [];
  const path = [];
  let cur = end;
  while (cur) {
    path.push(cur);
    if (cur.r === start.r && cur.c === start.c) break;
    cur = prev[cur.r][cur.c];
  }
  path.reverse();
  return path;
}
function pathCostOf(grid, path) {
  let cost = 0;
  for (let i = 1; i < path.length; i++)
    cost += grid[path[i].r][path[i].c].weight;
  return cost;
}

function dijkstraLike(grid, start, end, astar) {
  const dist = Array.from({ length: ROWS }, () => Array(COLS).fill(Infinity));
  const prev = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const visitedOrder = [];
  const heap = new MinHeap();
  dist[start.r][start.c] = 0;
  const h = (r, c) => (astar ? Math.abs(r - end.r) + Math.abs(c - end.c) : 0);
  heap.push({ r: start.r, c: start.c, f: h(start.r, start.c) });
  while (heap.size()) {
    const cur = heap.pop();
    if (visited[cur.r][cur.c]) continue;
    visited[cur.r][cur.c] = true;
    visitedOrder.push([{ r: cur.r, c: cur.c }]);
    if (cur.r === end.r && cur.c === end.c) break;
    for (const [nr, nc] of neighbors(cur.r, cur.c)) {
      if (grid[nr][nc].wall || visited[nr][nc]) continue;
      const nd = dist[cur.r][cur.c] + grid[nr][nc].weight;
      if (nd < dist[nr][nc]) {
        dist[nr][nc] = nd;
        prev[nr][nc] = { r: cur.r, c: cur.c };
        heap.push({ r: nr, c: nc, f: nd + h(nr, nc) });
      }
    }
  }
  const path = reconstructPath(prev, start, end);
  return {
    visitedOrder,
    path,
    found: path.length > 0,
    nodesVisited: visitedOrder.length,
    cost: dist[end.r][end.c] === Infinity ? null : dist[end.r][end.c],
  };
}

function bfsAlgo(grid, start, end) {
  const prev = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const visitedOrder = [];
  const q = [{ r: start.r, c: start.c }];
  seen[start.r][start.c] = true;
  let foundEnd = false;
  while (q.length) {
    const cur = q.shift();
    visitedOrder.push([{ r: cur.r, c: cur.c }]);
    if (cur.r === end.r && cur.c === end.c) {
      foundEnd = true;
      break;
    }
    for (const [nr, nc] of neighbors(cur.r, cur.c)) {
      if (grid[nr][nc].wall || seen[nr][nc]) continue;
      seen[nr][nc] = true;
      prev[nr][nc] = { r: cur.r, c: cur.c };
      q.push({ r: nr, c: nc });
    }
  }
  const path = foundEnd ? reconstructPath(prev, start, end) : [];
  return {
    visitedOrder,
    path,
    found: path.length > 0,
    nodesVisited: visitedOrder.length,
    cost: path.length ? pathCostOf(grid, path) : null,
  };
}

function bellmanFordAlgo(grid, start, end) {
  const dist = Array.from({ length: ROWS }, () => Array(COLS).fill(Infinity));
  const prev = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  dist[start.r][start.c] = 0;
  const cells = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) if (!grid[r][c].wall) cells.push({ r, c });
  const visitedOrder = [];
  const everReached = new Set();
  everReached.add(start.r + "," + start.c);
  const maxRounds = ROWS * COLS;
  for (let round = 0; round < maxRounds; round++) {
    const changed = [];
    for (const cell of cells) {
      const d = dist[cell.r][cell.c];
      if (d === Infinity) continue;
      for (const [nr, nc] of neighbors(cell.r, cell.c)) {
        if (grid[nr][nc].wall) continue;
        const nd = d + grid[nr][nc].weight;
        if (nd < dist[nr][nc]) {
          dist[nr][nc] = nd;
          prev[nr][nc] = { r: cell.r, c: cell.c };
          changed.push({ r: nr, c: nc });
          everReached.add(nr + "," + nc);
        }
      }
    }
    if (changed.length === 0) break;
    visitedOrder.push(changed);
  }
  const path = reconstructPath(prev, start, end);
  return {
    visitedOrder,
    path,
    found: path.length > 0,
    nodesVisited: everReached.size,
    cost: dist[end.r][end.c] === Infinity ? null : dist[end.r][end.c],
  };
}

function runAlgo(name, grid, start, end) {
  if (name === "dijkstra") return dijkstraLike(grid, start, end, false);
  if (name === "astar") return dijkstraLike(grid, start, end, true);
  if (name === "bfs") return bfsAlgo(grid, start, end);
  if (name === "bellmanford") return bellmanFordAlgo(grid, start, end);
}

// ================= CANVAS SETUP =================
const canvas = document.getElementById("grid");
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;
const ctx = canvas.getContext("2d");

function cssVar(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0d1220";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const now = performance.now();
  const algoColor = ALGOS[currentAlgo].color;

  // grid + walls + traffic
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      const x = c * CELL,
        y = r * CELL;
      if (cell.wall) {
        ctx.fillStyle = "#2A3348";
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);
      } else if (cell.weight > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.clip();
        ctx.fillStyle = "rgba(122,90,34,0.35)";
        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = "rgba(251,191,36,0.35)";
        ctx.lineWidth = 2;
        for (let i = -CELL; i < CELL * 2; i += 6) {
          ctx.beginPath();
          ctx.moveTo(x + i, y + CELL);
          ctx.lineTo(x + i + CELL, y);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.045)";
        ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      }
    }
  }

  // visited cells (pop animation)
  visitedCells.forEach((t, key) => {
    const [r, c] = key.split(",").map(Number);
    if (grid[r][c].wall) return;
    const progress = Math.min(1, (now - t) / 180);
    const alpha = 0.12 + 0.3 * progress;
    const inset = (1 - progress) * (CELL * 0.35);
    const x = c * CELL,
      y = r * CELL;
    ctx.fillStyle = hexToRgba(algoColor, alpha);
    ctx.fillRect(
      x + 1 + inset,
      y + 1 + inset,
      CELL - 2 - inset * 2,
      CELL - 2 - inset * 2,
    );
  });

  // final path (progressive reveal, glowing line)
  if (pathCellsFinal.length > 1) {
    let segCount = pathCellsFinal.length - 1;
    if (pathRevealStart !== null) {
      const elapsed = now - pathRevealStart;
      const perSeg = 22;
      segCount = Math.min(
        pathCellsFinal.length - 1,
        Math.floor(elapsed / perSeg),
      );
    }
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = algoColor;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = algoColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i <= segCount && i < pathCellsFinal.length; i++) {
      const cell = pathCellsFinal[i];
      const x = cell.c * CELL + CELL / 2,
        y = cell.r * CELL + CELL / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // travelling dot at the head
    if (segCount < pathCellsFinal.length - 1) {
      const head =
        pathCellsFinal[Math.min(segCount + 1, pathCellsFinal.length - 1)];
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(
        head.c * CELL + CELL / 2,
        head.r * CELL + CELL / 2,
        4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // start / end pins
  drawPin(start, cssVarFallback("--start", "#22C55E"), "S");
  drawPin(end, cssVarFallback("--end", "#EF4444"), "E");

  const stillAnimatingPop = [...visitedCells.values()].some(
    (t) => now - t < 180,
  );
  const stillAnimatingPath =
    pathRevealStart !== null &&
    now - pathRevealStart < pathCellsFinal.length * 22 + 100;
  if (running || stillAnimatingPop || stillAnimatingPath) {
    requestAnimationFrame(draw);
  }
}

function cssVarFallback(name, fallback) {
  const v = cssVar(name);
  return v || fallback;
}

function drawPin(pos, color, label) {
  const x = pos.c * CELL + CELL / 2,
    y = pos.r * CELL + CELL / 2;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(x, y, CELL * 0.36, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#0A0E17";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#0A0E17";
  ctx.font = "700 11px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 0.5);
  ctx.restore();
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16),
    g = parseInt(h.substring(2, 4), 16),
    b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ================= UI: line selector =================
const lineList = document.getElementById("lineList");
const infoCard = document.getElementById("infoCard");
function renderLineList() {
  lineList.innerHTML = "";
  Object.entries(ALGOS).forEach(([key, algo]) => {
    const btn = document.createElement("button");
    btn.className = "line-btn" + (key === currentAlgo ? " active" : "");
    btn.style.setProperty("--roundel", algo.color);
    btn.innerHTML = `<span class="roundel">${algo.short
      .match(/[A-Z*]/g)
      .slice(0, 2)
      .join("")}</span>
<span><span class="line-name">${algo.label}</span><br><span class="line-sub">${algo.short}</span></span>`;
    btn.onclick = () => {
      if (running) return;
      currentAlgo = key;
      renderLineList();
      applyTheme();
    };
    lineList.appendChild(btn);
  });
  infoCard.style.setProperty("--roundel", ALGOS[currentAlgo].color);
  infoCard.textContent = ALGOS[currentAlgo].desc;
}
function applyTheme() {
  document
    .querySelectorAll(".btn-primary")
    .forEach((el) =>
      el.style.setProperty("--roundel", ALGOS[currentAlgo].color),
    );
  document
    .getElementById("btnRun")
    .style.setProperty("--roundel", ALGOS[currentAlgo].color);
  draw();
}
renderLineList();

// ================= UI: mode tools =================
document.getElementById("modeSeg").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn || running) return;
  mode = btn.dataset.mode;
  document
    .querySelectorAll("#modeSeg button")
    .forEach((b) => b.classList.toggle("active", b === btn));
});

// ================= Canvas interaction =================
function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width,
    scaleY = canvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  const c = Math.floor(x / CELL),
    r = Math.floor(y / CELL);
  if (!inBounds(r, c)) return null;
  return { r, c };
}

function applyToolAt(r, c) {
  if ((r === start.r && c === start.c) || (r === end.r && c === end.c)) {
    if (mode === "start" || mode === "end") {
    } else return;
  }
  if (mode === "wall") {
    if (!(r === start.r && c === start.c) && !(r === end.r && c === end.c))
      grid[r][c] = { wall: true, weight: 1 };
  } else if (mode === "traffic") {
    if (
      !(r === start.r && c === start.c) &&
      !(r === end.r && c === end.c) &&
      !grid[r][c].wall
    )
      grid[r][c].weight = 5;
  } else if (mode === "erase") {
    grid[r][c] = { wall: false, weight: 1 };
  } else if (mode === "start") {
    if (!(r === end.r && c === end.c)) {
      grid[r][c] = { wall: false, weight: 1 };
      start = { r, c };
    }
  } else if (mode === "end") {
    if (!(r === start.r && c === start.c)) {
      grid[r][c] = { wall: false, weight: 1 };
      end = { r, c };
    }
  }
}

canvas.addEventListener("pointerdown", (e) => {
  if (running) return;
  isDrawing = true;
  const cell = cellFromEvent(e);
  if (!cell) return;
  clearPathOnly();
  applyToolAt(cell.r, cell.c);
  draw();
});
canvas.addEventListener("pointermove", (e) => {
  if (!isDrawing || running) return;
  const cell = cellFromEvent(e);
  if (!cell) return;
  applyToolAt(cell.r, cell.c);
  draw();
});
window.addEventListener("pointerup", () => (isDrawing = false));

// ================= Buttons =================
document.getElementById("btnRandom").addEventListener("click", () => {
  if (running) return;
  generateRandomNetwork();
  clearPathOnly();
  draw();
});
document.getElementById("btnClearBoard").addEventListener("click", () => {
  if (running) return;
  grid = makeGrid();
  clearPathOnly();
  draw();
});
document.getElementById("btnClearPath").addEventListener("click", () => {
  animToken++;
  running = false;
  clearPathOnly();
  resetStats();
  draw();
});
document.getElementById("btnRun").addEventListener("click", () => startRun());
document
  .getElementById("btnCompare")
  .addEventListener("click", () => runCompareAll());

const speedSlider = document.getElementById("speed");
const speedVal = document.getElementById("speedVal");
speedSlider.addEventListener("input", updateSpeedLabel);
function updateSpeedLabel() {
  const v = +speedSlider.value;
  speedVal.textContent = v > 20 ? "Fast" : v > 10 ? "Medium" : "Slow";
}
updateSpeedLabel();
function stepDelay() {
  const v = +speedSlider.value; // 1..30
  return Math.max(1, 34 - v); // higher slider = smaller delay
}

function clearPathOnly() {
  visitedCells = new Map();
  pathCellsFinal = [];
  pathRevealStart = null;
  lastResult = null;
}

function generateRandomNetwork() {
  for (let attempt = 0; attempt < 25; attempt++) {
    grid = makeGrid();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if ((r === start.r && c === start.c) || (r === end.r && c === end.c))
          continue;
        const roll = Math.random();
        if (roll < 0.22) grid[r][c].wall = true;
        else if (roll < 0.4) grid[r][c].weight = 5;
      }
    }
    const test = bfsAlgo(grid, start, end);
    if (test.found) return;
  }
}

// ================= Stats / board =================
const statusPill = document.getElementById("statusPill");
const statTime = document.getElementById("statTime");
const statNodes = document.getElementById("statNodes");
const statLen = document.getElementById("statLen");
const statCost = document.getElementById("statCost");

function resetStats() {
  statusPill.className = "status-pill status-idle";
  statusPill.textContent = "STANDBY";
  statTime.innerHTML = "0<small>ms</small>";
  statNodes.textContent = "0";
  statLen.innerHTML = "—<small>hops</small>";
  statCost.textContent = "—";
}
resetStats();

function timerLoop(token) {
  if (token !== animToken) return;
  if (!running) return;
  const elapsed = Math.round(performance.now() - runStartTime);
  statTime.innerHTML = elapsed + "<small>ms</small>";
  requestAnimationFrame(() => timerLoop(token));
}

// ================= Run animation =================
function setControlsDisabled(disabled) {
  document
    .querySelectorAll(".btn, .line-btn, #modeSeg button")
    .forEach((el) => (el.disabled = disabled));
  document.getElementById("btnClearPath").disabled = false;
}

async function startRun() {
  if (running) return;
  clearPathOnly();
  animToken++;
  const token = animToken;
  running = true;
  setControlsDisabled(true);
  statusPill.className = "status-pill status-run";
  statusPill.textContent = "SCANNING…";
  runStartTime = performance.now();
  timerLoop(token);

  const result = runAlgo(currentAlgo, grid, start, end);
  lastResult = result;
  const delay = stepDelay();

  for (let i = 0; i < result.visitedOrder.length; i++) {
    if (token !== animToken) return;
    const batch = result.visitedOrder[i];
    const now = performance.now();
    for (const n of batch) visitedCells.set(n.r + "," + n.c, now);
    statNodes.textContent = visitedCells.size;
    draw();
    await sleep(delay);
  }

  if (token !== animToken) return;
  running = false;
  const elapsedFinal = Math.round(performance.now() - runStartTime);
  statTime.innerHTML = elapsedFinal + "<small>ms</small>";

  if (result.found) {
    pathCellsFinal = result.path;
    pathRevealStart = performance.now();
    statLen.innerHTML = result.path.length - 1 + "<small>hops</small>";
    statCost.textContent = result.cost;
    statusPill.className = "status-pill status-found";
    statusPill.textContent = "ROUTE FOUND";
  } else {
    statusPill.className = "status-pill status-none";
    statusPill.textContent = "NO ROUTE";
    statLen.innerHTML = "—<small>hops</small>";
    statCost.textContent = "—";
  }
  setControlsDisabled(false);
  draw();
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// ================= Compare all =================
function runCompareAll() {
  if (running) return;
  const rows = Object.entries(ALGOS).map(([key, algo]) => {
    const t0 = performance.now();
    const res = runAlgo(key, grid, start, end);
    const t1 = performance.now();
    return { key, algo, res, ms: t1 - t0 };
  });
  const maxNodes = Math.max(...rows.map((r) => r.res.nodesVisited), 1);
  const bestCost = Math.min(
    ...rows.filter((r) => r.res.found).map((r) => r.res.cost),
    Infinity,
  );

  const table = document.getElementById("compareTable");
  let html = `<tr><th>Line</th><th>Nodes Scanned</th><th>Route Cost</th><th>Hops</th><th>Compute</th></tr>`;
  rows.forEach(({ key, algo, res, ms }) => {
    const barPct = Math.round((res.nodesVisited / maxNodes) * 100);
    const costDisplay = res.found
      ? res.cost === bestCost
        ? `<span class="best">${res.cost} ★</span>`
        : res.cost
      : `<span class="no-route">no route</span>`;
    html += `<tr>
<td class="ct-line"><span class="dot" style="background:${algo.color}"></span>${algo.label}<br><span style="color:var(--muted);font-size:10.5px">${algo.short}</span></td>
<td class="bar-cell"><div>${res.nodesVisited}</div><div class="bar-track"><div class="bar-fill" style="width:${barPct}%;background:${algo.color}"></div></div></td>
<td>${costDisplay}</td>
<td>${res.found ? res.path.length - 1 : "—"}</td>
<td>${ms.toFixed(2)} ms</td>
</tr>`;
  });
  table.innerHTML = html;
  document.getElementById("comparePanel").style.display = "block";
  document
    .getElementById("comparePanel")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ================= Init =================
generateRandomNetwork();
applyTheme();
draw();
