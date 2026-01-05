// Simple Blackjack (no betting yet)
// Rules:
// - Dealer shows 1st card face up, 2nd face down until reveal
// - Player can hit/stand
// - Dealer hits until 17+
// - Aces count as 11 or 1 (best score <= 21)

const dealerCardsEl = document.getElementById("dealerCards");
const playerCardsEl = document.getElementById("playerCards");
const dealerScoreEl = document.getElementById("dealerScore");
const playerScoreEl = document.getElementById("playerScore");
const statusEl = document.getElementById("bjStatus");

const dealBtn = document.getElementById("dealBtn");
const hitBtn = document.getElementById("hitBtn");
const standBtn = document.getElementById("standBtn");
const resetBtn = document.getElementById("resetBtn");

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

let deck = [];
let dealerHand = [];
let playerHand = [];
let inRound = false;
let dealerHidden = true;

function setStatus(text) {
  statusEl.textContent = text;
}

function buildDeck() {
  const d = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      d.push({ rank: r, suit: s });
    }
  }
  // shuffle
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function drawCard() {
  if (deck.length === 0) deck = buildDeck();
  return deck.pop();
}

function handValue(hand) {
  // Count Aces as 11 initially, then reduce to 1 as needed
  let total = 0;
  let aces = 0;

  for (const c of hand) {
    if (c.rank === "A") {
      total += 11;
      aces += 1;
    } else if (["K","Q","J"].includes(c.rank)) {
      total += 10;
    } else {
      total += Number(c.rank);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function isBlackjack(hand) {
  return hand.length === 2 && handValue(hand) === 21;
}

function renderCards(el, hand, hideSecond) {
  el.innerHTML = "";
  hand.forEach((c, idx) => {
    const card = document.createElement("div");
    card.className = "bj-card";

    const isRed = c.suit === "♥" || c.suit === "♦";
    card.dataset.red = isRed ? "1" : "0";

    if (hideSecond && idx === 1) {
      card.classList.add("bj-card-back");
      card.textContent = "❔";
    } else {
      card.textContent = `${c.rank}${c.suit}`;
    }
    el.appendChild(card);
  });
}

function render() {
  renderCards(playerCardsEl, playerHand, false);
  renderCards(dealerCardsEl, dealerHand, dealerHidden);

  const pVal = handValue(playerHand);
  playerScoreEl.textContent = String(pVal);

  if (dealerHidden) {
    // show only first card value
    const first = handValue([dealerHand[0]]);
    dealerScoreEl.textContent = `${first} + ?`;
  } else {
    dealerScoreEl.textContent = String(handValue(dealerHand));
  }
}

function setButtons({ canDeal, canPlay }) {
  dealBtn.disabled = !canDeal;
  hitBtn.disabled = !canPlay;
  standBtn.disabled = !canPlay;
}

function endRound(message) {
  inRound = false;
  dealerHidden = false;
  render();
  setButtons({ canDeal: true, canPlay: false });
  setStatus(message);
}

function dealerPlay() {
  dealerHidden = false;
  render();

  // Dealer hits until 17+
  while (handValue(dealerHand) < 17) {
    dealerHand.push(drawCard());
  }

  const dVal = handValue(dealerHand);
  const pVal = handValue(playerHand);

  if (dVal > 21) return endRound("dealer busts — you win");
  if (pVal > dVal) return endRound("you win");
  if (pVal < dVal) return endRound("dealer wins");
  return endRound("push (tie)");
}

function startRound() {
  deck = buildDeck();
  dealerHand = [drawCard(), drawCard()];
  playerHand = [drawCard(), drawCard()];
  dealerHidden = true;
  inRound = true;

  setButtons({ canDeal: false, canPlay: true });
  render();

  const pBJ = isBlackjack(playerHand);
  const dBJ = isBlackjack(dealerHand);

  if (pBJ && dBJ) return endRound("double blackjack — push");
  if (pBJ) return endRound("blackjack — you win");
  if (dBJ) return endRound("dealer blackjack — you lose");

  setStatus("your move");
}

function hit() {
  if (!inRound) return;
  playerHand.push(drawCard());
  render();

  const pVal = handValue(playerHand);
  if (pVal > 21) return endRound("bust — you lose");
  if (pVal === 21) return dealerPlay();
}

function stand() {
  if (!inRound) return;
  setButtons({ canDeal: false, canPlay: false });
  setStatus("dealer playing…");
  dealerPlay();
}

function resetAll() {
  deck = [];
  dealerHand = [];
  playerHand = [];
  dealerHidden = true;
  inRound = false;

  dealerCardsEl.innerHTML = "";
  playerCardsEl.innerHTML = "";
  dealerScoreEl.textContent = "—";
  playerScoreEl.textContent = "—";
  setButtons({ canDeal: true, canPlay: false });
  setStatus("press “deal” to start");
}

dealBtn.addEventListener("click", startRound);
hitBtn.addEventListener("click", hit);
standBtn.addEventListener("click", stand);
resetBtn.addEventListener("click", resetAll);

resetAll();
