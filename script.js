// Wheel Spinner (no libraries)
// - Items are entered one per line
// - Shuffle button randomizes item order
// - Spin button animates, then reports winner at the pointer (top)
//
// This version fixes:
// - High-DPI crisp canvas rendering
// - Single rendering path (no duplicate drawWheel implementations)
// - Uses NUMBERS (1..N) on the wheel for readability
// - Winner shows "number — full category"
// - Shuffle shuffles the real categories (and renumbers)

// -------------------- DOM --------------------
const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");

const itemsInput = document.getElementById("itemsInput");
const updateBtn = document.getElementById("updateBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const spinBtn = document.getElementById("spinBtn");
const resetBtn = document.getElementById("resetBtn");

const statusText = document.getElementById("statusText");
const winnerText = document.getElementById("winnerText");

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
  "steak"
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
    setStatus("Stopped");
  }
}

// Convert rotation to the index under the pointer at the top.
function getWinnerIndex() {
  const n = items.length;
  if (n === 0) return -1;

  const slice = (2 * Math.PI) / n;

  // Pointer is at top (-PI/2). Undo the wheel rotation to get pointer angle in wheel space.
  let angle = (-Math.PI / 2 - currentRotation) % (2 * Math.PI);
  if (angle < 0) angle += 2 * Math.PI;

  // Pick the slice whose CENTER is closest to the pointer (not the slice start boundary)
  const index = Math.floor((angle + slice / 2) / slice) % n;

  return index;
}


function drawNumberLabel(text) {
  // Numbers are short; keep it bold + readable
  let fontSize = 18;
  if (items.length >= 14) fontSize = 16;
  if (items.length >= 18) fontSize = 14;

  ctx.font = `800 ${fontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
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
    ctx.fillText("Add items to build the wheel", 0, 0);
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
      i % 2 === 0 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)";
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
    setStatus("Add at least 2 items to spin");
    return;
  }
  if (spinning) return;

  setWinner("—");
  setStatus("Spinning...");
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
      if (idx >= 0 && categories[idx]) {
        setWinner(`${items[idx]} — ${categories[idx]}`);
      } else {
        setWinner("—");
      }
      setStatus("Done");
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
  setStatus(categories.length ? "Updated" : "Add items to start");
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
  setStatus("Shuffled");
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
    "steak"
  ];

  items = categories.map((_, i) => String(i + 1));
  itemsInput.value = categories.join("\n");

  currentRotation = 0;
  setWinner("—");
  setStatus("Ready");
  drawWheel();
}

// -------------------- EVENTS --------------------
updateBtn.addEventListener("click", updateWheelFromInput);
shuffleBtn.addEventListener("click", shuffleWheel);
spinBtn.addEventListener("click", spin);
resetBtn.addEventListener("click", resetWheel);

// Ctrl/Cmd + Enter to update
itemsInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    updateWheelFromInput();
  }
});

// -------------------- RESIZE / INIT --------------------
function resizeAndRedraw() {
  const dpr = window.devicePixelRatio || 1;

  const cssSize = Math.min(520, Math.floor(Math.min(window.innerWidth * 0.9, 520)));
  currentCssSize = cssSize;

  canvas.style.width = cssSize + "px";
  canvas.style.height = cssSize + "px";

  canvas.width = Math.floor(cssSize * dpr);
  canvas.height = Math.floor(cssSize * dpr);

  // Draw in CSS units but render crisp in device pixels
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  drawWheel();
}

window.addEventListener("resize", resizeAndRedraw);

// Init
setStatus("Ready");
setWinner("—");
resizeAndRedraw();
