const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");

const itemsInput = document.getElementById("itemsInput");
const updateBtn = document.getElementById("updateBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const spinBtn = document.getElementById("spinBtn");
const resetBtn = document.getElementById("resetBtn");

const statusText = document.getElementById("statusText");
const winnerText = document.getElementById("winnerText");

const homeBtn = document.getElementById("homeBtn");

const clearBtn = document.getElementById("clearBtn");

const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const resultModal = document.getElementById("resultModal");
const modalWinner = document.getElementById("modalWinner");
const closeModalBtn = document.getElementById("closeModalBtn");
const closeModalBtn2 = document.getElementById("closeModalBtn2");
const spinAgainBtn = document.getElementById("spinAgainBtn");

const HISTORY_STORAGE_KEY = "wheelHistory_v1";
const HISTORY_MAX = 50;


// -------------------- DATA --------------------
// Full labels (what the user types)
let categories = [
  "hot pot",
  "sushi",
  "kbbq/jbbq",
  "american",
  "ramen",
  "vietnamese",
  "italian",
  "korean",
  "mexican",
  "the couple cooks",
  "chinese",
  "thai",
  "cajun",
  "japanese",
  "steak",
  "gf picks + pays",
  "bf picks + pays"
];

// What we actually draw on the wheel (numbers)
let items = categories.map((_, i) => String(i + 1));

itemsInput.value = categories.join("\n");

// -------------------- STATE --------------------
let currentRotation = 0; // radians
let spinning = false;
let animReq = null;

// Track current CSS size of the canvas (so animation redraw uses the right size)
let currentCssSize = 520;

let history = loadHistory();

function formatTime(d) {
  // simple local time like 7:42 PM
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function renderHistory() {
  if (!historyList || !historyEmpty) return;

  historyList.innerHTML = "";

  if (history.length === 0) {
    historyEmpty.style.display = "block";
    return;
  }

  historyEmpty.style.display = "none";

  for (const h of history) {
    const li = document.createElement("li");

    li.innerHTML = `
      <div class="history-item-top">
        <span class="history-winner">${h.text}</span>
        <span class="history-time">${h.time}</span>
      </div>
    `;

    historyList.appendChild(li);
  }
}

function pushHistory(winnerTextValue) {
  history.unshift({
    text: winnerTextValue,
    time: formatTime(new Date())
  });

  if (history.length > HISTORY_MAX) history = history.slice(0, HISTORY_MAX);

  saveHistory();
  renderHistory();
}

function openModal(winnerTextValue) {
  if (!resultModal || !modalWinner) return;
  modalWinner.textContent = winnerTextValue || "—";
  resultModal.classList.add("is-open");
  resultModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  if (!resultModal) return;
  resultModal.classList.remove("is-open");
  resultModal.setAttribute("aria-hidden", "true");
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore (private mode / storage blocked)
  }
}

// -------------------- HELPERS --------------------
function setStatus(text) {
  statusText.textContent = text;
}

function setWinner(text) {
  winnerText.textContent = text;
}

function cleanItemsFromTextarea() {
  return itemsInput.value
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function shuffleArray(arr) {
  // Fisher-Yates shuffle (in place)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function stopSpinIfNeeded() {
  if (spinning) {
    spinning = false;
    if (animReq) cancelAnimationFrame(animReq);
    animReq = null;
    setStatus("stopped");
  }
}

function getWinnerIndex() {
  const n = items.length;
  if (n === 0) return -1;

  const slice = (2 * Math.PI) / n;

  // Pointer at top in canvas angle space
  const pointerWorldAngle = (3 * Math.PI) / 2;

  // Convert pointer into wheel-space (undo wheel rotation)
  let wheelAngle = pointerWorldAngle - currentRotation;
  wheelAngle = ((wheelAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  // Nearest slice CENTER:
  // slice centers are at (i + 0.5) * slice
  // so shift by half a slice, then round
  const idx = Math.round((wheelAngle - slice / 2) / slice);

  // Wrap to [0, n)
  return ((idx % n) + n) % n;
}


function drawNumberLabel(text) {
  // Numbers are short; keep it bold + readable
  let fontSize = 18;
  if (items.length >= 14) fontSize = 16;
  if (items.length >= 18) fontSize = 14;

  ctx.font = `800 ${fontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.fillStyle = "rgba(40, 40, 40, 0.9)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
}

// -------------------- DRAW --------------------
function drawWheelWithCssSize(cssSize) {
  const n = items.length;

  // Clear in CSS units
  ctx.clearRect(0, 0, cssSize, cssSize);

  const cx = cssSize / 2;
  const cy = cssSize / 2;
  const radius = Math.min(cx, cy) - 12;

  // Outer shadow circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();
  ctx.restore();

  // If no items, draw placeholder
  if (n === 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.20)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font =
      "700 20px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("add options to build wheel", 0, 0);
    ctx.restore();
    return;
  }

  const slice = (2 * Math.PI) / n;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(currentRotation);

  for (let i = 0; i < n; i++) {
    const start = i * slice;
    const end = start + slice;

    // Slice fill
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle =
      i % 2 === 0
        ? "rgba(255, 235, 238, 0.9)"
        : "rgba(255, 245, 247, 0.9)";
    ctx.fill();

    // Slice border
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const label = items[i];
    const mid = start + slice / 2;

    ctx.save();

    // Move to center, rotate with wheel + slice to get to correct position
    ctx.rotate(mid);
    ctx.translate(radius * 0.70, 0);

    // Cancel rotation so text is upright on screen
    ctx.rotate(-(currentRotation + mid));

    drawNumberLabel(label);

    ctx.restore();

  }

  // Center cap
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fill();

  ctx.restore();
}

function drawWheel() {
  drawWheelWithCssSize(currentCssSize);
}

// -------------------- SPIN --------------------
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function spin() {
  const n = items.length;
  if (n < 2) {
    setStatus("add at least 2 items to spin");
    return;
  }
  if (spinning) return;

  setWinner("—");
  setStatus("spinning...");
  spinning = true;

  const minTurns = 5;
  const maxTurns = 9;
  const turns = minTurns + Math.random() * (maxTurns - minTurns);
  const randAngle = Math.random() * Math.PI * 2;

  const startRotation = currentRotation;
  const targetRotation = startRotation + turns * Math.PI * 2 + randAngle;

  const durationMs = 3200;
  const startTime = performance.now();

  function frame(now) {
    if (!spinning) return;

    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / durationMs);
    const eased = easeOutCubic(t);

    currentRotation = startRotation + (targetRotation - startRotation) * eased;
    drawWheel();

    if (t < 1) {
      animReq = requestAnimationFrame(frame);
    } else {
      spinning = false;
      animReq = null;

      const idx = getWinnerIndex();

      let finalWinner = "—";
      if (idx >= 0 && categories[idx]) {
        finalWinner = `${items[idx]} — ${categories[idx]}`;
      }

      setWinner(finalWinner);
      setStatus("done");

      // history + popup
      pushHistory(finalWinner);
      openModal(finalWinner);

    }
  }

  animReq = requestAnimationFrame(frame);
}

// -------------------- INPUT ACTIONS --------------------
function syncFromTextarea() {
  // Read full categories, then rebuild numeric wheel labels
  categories = cleanItemsFromTextarea();
  items = categories.map((_, i) => String(i + 1));
}

function updateWheelFromInput() {
  stopSpinIfNeeded();
  syncFromTextarea();
  setWinner("—");
  setStatus(categories.length ? "updated" : "add items to start");
  drawWheel();
}

function shuffleWheel() {
  stopSpinIfNeeded();
  syncFromTextarea();
  shuffleArray(categories); // shuffle real categories
  items = categories.map((_, i) => String(i + 1)); // renumber based on new order

  // Show shuffled categories in textbox
  itemsInput.value = categories.join("\n");

  setWinner("—");
  setStatus("shuffled");
  drawWheel();
}

function clearOptions() {
  stopSpinIfNeeded();

  itemsInput.value = "";
  categories = [];
  items = [];

  currentRotation = 0;
  setWinner("—");
  setStatus("cleared");
  drawWheel();
}

function resetWheel() {
  stopSpinIfNeeded();

  categories = [
    "hot pot",
    "sushi",
    "kbbq/jbbq",
    "american",
    "ramen",
    "vietnamese",
    "italian",
    "korean",
    "mexican",
    "the couple cooks",
    "chinese",
    "thai",
    "cajun",
    "japanese",
    "steak",
    "gf picks + pays",
    "bf picks + pays"
  ];

  items = categories.map((_, i) => String(i + 1));
  itemsInput.value = categories.join("\n");

  currentRotation = 0;
  setWinner("—");
  setStatus("ready");
  drawWheel();
}

// -------------------- EVENTS --------------------
updateBtn.addEventListener("click", updateWheelFromInput);
shuffleBtn.addEventListener("click", shuffleWheel);
clearBtn.addEventListener("click", clearOptions);
spinBtn.addEventListener("click", spin);
resetBtn.addEventListener("click", resetWheel);

homeBtn.addEventListener("click", () => {
  window.location.href = "home.html";
});

// Ctrl/Cmd + Enter to update
itemsInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    updateWheelFromInput();
  }
});

// History clear
clearHistoryBtn.addEventListener("click", () => {
  history = [];
  saveHistory();
  renderHistory();
});


// Modal buttons
closeModalBtn.addEventListener("click", closeModal);
closeModalBtn2.addEventListener("click", closeModal);

spinAgainBtn.addEventListener("click", () => {
  closeModal();
  spin();
});

// Click outside card to close
resultModal.addEventListener("click", (e) => {
  const target = e.target;
  if (target && target.dataset && target.dataset.close === "true") {
    closeModal();
  }
});

// ESC to close
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// -------------------- RESIZE / INIT --------------------
function resizeAndRedraw() {
  const dpr = window.devicePixelRatio || 1;

  const wheelCard = document.querySelector(".wheel-card");
  if (!wheelCard) return;

  // wheel-card has 16px padding on both sides (32px total)
  const padding = 32;

  // size the canvas to the card's inner content width
  const available = Math.floor(wheelCard.clientWidth - padding);

  // keep your existing max size cap if you want
  const cssSize = Math.min(580, Math.max(260, available));

  currentCssSize = cssSize;

  canvas.style.width = cssSize + "px";
  canvas.style.height = cssSize + "px";

  canvas.width = Math.floor(cssSize * dpr);
  canvas.height = Math.floor(cssSize * dpr);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  drawWheel();
}


window.addEventListener("resize", resizeAndRedraw);

// Init
setStatus("ready");
setWinner("—");
resizeAndRedraw();
renderHistory();

