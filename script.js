// Wheel Spinner (no libraries)
// - Items are entered one per line
// - Shuffle button randomizes item order
// - Spin button animates, then reports winner at the pointer (top)

const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");

const itemsInput = document.getElementById("itemsInput");
const updateBtn = document.getElementById("updateBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const spinBtn = document.getElementById("spinBtn");
const resetBtn = document.getElementById("resetBtn");

const statusText = document.getElementById("statusText");
const winnerText = document.getElementById("winnerText");

// Default items so it works immediately
let items = ["Pizza", "Sushi", "Tacos", "Ramen", "Burgers", "Salad", "Pho", "BBQ"];

itemsInput.value = items.join("\n");

let currentRotation = 0; // radians
let spinning = false;
let animReq = null;

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
  // Fisher-Yates
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
// Pointer is at angle = -PI/2 in canvas coordinates, but we treat the wheel
// as rotated by currentRotation. We want which slice is at the pointer.
function getWinnerIndex() {
  const n = items.length;
  if (n === 0) return -1;

  const slice = (2 * Math.PI) / n;

  // The pointer direction in standard polar (0 at +x, CCW positive) is -PI/2 (top).
  // The wheel is rotated by currentRotation, so the angle in wheel-space is:
  // wheelAngle = pointerAngle - currentRotation
  const pointerAngle = -Math.PI / 2;
  let wheelAngle = pointerAngle - currentRotation;

  // Normalize to [0, 2PI)
  wheelAngle = ((wheelAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  // Slices are drawn starting at angle 0.
  // wheelAngle tells us where pointer lands in wheel's fixed coordinate system.
  const index = Math.floor(wheelAngle / slice);
  return index;
}

function drawWheel() {
  const n = items.length;

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background ring
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
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
    ctx.font = "700 20px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
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

    // Alternating slice color (simple, readable)
    const isEven = i % 2 === 0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = isEven ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)";
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    const label = items[i];
    const mid = start + slice / 2;

    ctx.save();
    ctx.rotate(mid);
    ctx.translate(radius * 0.62, 0);
    ctx.rotate(Math.PI / 2);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "700 16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Fit text (basic)
    const maxWidth = radius * 0.62;
    drawFittedText(label, 0, 0, maxWidth);

    ctx.restore();
  }

  // Center cap
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fill();

  ctx.restore();

  // Pointer line hint (top)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -radius);
  ctx.stroke();
  ctx.restore();
}

function drawFittedText(text, x, y, maxWidth) {
  // Simple shrink-to-fit
  let fontSize = 16;
  ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
    fontSize -= 1;
    ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  }
  ctx.fillText(text, x, y);
}

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

  // Choose a random final rotation.
  // Add multiple full turns for drama, plus random offset.
  const minTurns = 5;
  const maxTurns = 9;
  const turns = minTurns + Math.random() * (maxTurns - minTurns);

  // Random angle in [0, 2PI)
  const randAngle = Math.random() * Math.PI * 2;

  const startRotation = currentRotation;
  const targetRotation = startRotation + turns * Math.PI * 2 + randAngle;

  const durationMs = 3200; // total spin time
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

      // Determine winner
      const idx = getWinnerIndex();
      const winner = idx >= 0 ? items[idx] : "—";
      setWinner(winner);
      setStatus("Done");
    }
  }

  animReq = requestAnimationFrame(frame);
}

function updateWheelFromInput() {
  stopSpinIfNeeded();
  const cleaned = cleanItemsFromTextarea();
  items = cleaned;
  setWinner("—");
  setStatus(items.length ? "Updated" : "Add items to start");
  drawWheel();
}

function shuffleWheel() {
  stopSpinIfNeeded();
  const cleaned = cleanItemsFromTextarea();
  items = cleaned;
  shuffleArray(items);
  itemsInput.value = items.join("\n");
  setWinner("—");
  setStatus("Shuffled");
  drawWheel();
}

function resetWheel() {
  stopSpinIfNeeded();
  items = ["Pizza", "Sushi", "Tacos", "Ramen", "Burgers", "Salad", "Pho", "BBQ"];
  itemsInput.value = items.join("\n");
  currentRotation = 0;
  setWinner("—");
  setStatus("Ready");
  drawWheel();
}

// Wire up buttons
updateBtn.addEventListener("click", updateWheelFromInput);
shuffleBtn.addEventListener("click", shuffleWheel);
spinBtn.addEventListener("click", spin);
resetBtn.addEventListener("click", resetWheel);

// Allow Ctrl+Enter to update wheel
itemsInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    updateWheelFromInput();
  }
});

// Resize canvas for crisp rendering on high DPI screens
function fitCanvasForDPR() {
  const dpr = window.devicePixelRatio || 1;
  const cssSize = Math.min(520, Math.floor(Math.min(window.innerWidth * 0.9, 520)));
  // Keep it square
  canvas.style.width = cssSize + "px";
  canvas.style.height = cssSize + "px";

  canvas.width = Math.floor(cssSize * dpr);
  canvas.height = Math.floor(cssSize * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Note: because we setTransform to dpr, drawing should use CSS pixels.
  // But our drawWheel uses canvas.width/height; instead, use cssSize for calculations:
  // We'll compensate by temporarily mapping width/height back to CSS units.
  // Easiest: store a "logical size" and draw with that.
}

function setLogicalCanvasSize() {
  // We'll define a logical coordinate system of 520x520 regardless of CSS size,
  // then scale via ctx.setTransform.
  // Simpler approach: just keep canvas width/height equal to CSS size and scale by DPR:
  // We'll do that by resetting transforms before drawing and using actual pixel width.
  // (Given the simplicity, we'll redraw with the actual pixel sizes.)
}

// Simple version: just redraw; our drawWheel uses canvas.width/height, which are pixel sizes.
// That’s fine because we set canvas size directly (not a separate logical coordinate).
function resizeAndRedraw() {
  const dpr = window.devicePixelRatio || 1;
  const cssSize = Math.min(520, Math.floor(Math.min(window.innerWidth * 0.9, 520)));

  canvas.style.width = cssSize + "px";
  canvas.style.height = cssSize + "px";

  canvas.width = Math.floor(cssSize * dpr);
  canvas.height = Math.floor(cssSize * dpr);

  // Reset transform so 1 unit = 1 pixel, then scale down by DPR for drawing in CSS pixels
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  // Because we scaled by dpr, treat canvas.width/dpr as the CSS pixel width in drawWheel.
  // So override width/height reads by setting a virtual size:
  // We'll temporarily stash CSS pixel dims for use in drawWheel via a helper.
  drawWheelWithCssSize(cssSize);
}

function drawWheelWithCssSize(cssSize) {
  // Patch: mimic canvas width/height in CSS pixels for drawing math.
  // We draw into a scaled context, so the math should use cssSize.
  // We'll adapt drawWheel() logic here quickly.
  const n = items.length;

  // Clear in CSS units
  ctx.clearRect(0, 0, cssSize, cssSize);

  const cx = cssSize / 2;
  const cy = cssSize / 2;
  const radius = Math.min(cx, cy) - 12;

  // Outer shadow
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();
  ctx.restore();

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
    ctx.font = "700 20px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
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

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)";
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const label = items[i];
    const mid = start + slice / 2;

    ctx.save();
    ctx.rotate(mid);
    ctx.translate(radius * 0.62, 0);
    ctx.rotate(Math.PI / 2);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "700 16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const maxWidth = radius * 0.62;
    drawFittedText(label, 0, 0, maxWidth);

    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fill();

  ctx.restore();
}

// Override drawWheel() to use resize-based drawing for crispness
function drawWheel() {
  // drawWheel is called during animation; we need current CSS size
  const cssSize = parseInt(canvas.style.width, 10) || 520;
  drawWheelWithCssSize(cssSize);
}

// Init
window.addEventListener("resize", () => {
  // If spinning, keep spinning; redraw with new size
  resizeAndRedraw();
});

setStatus("Ready");
setWinner("—");
resizeAndRedraw();
