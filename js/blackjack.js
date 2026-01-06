// Blackjack (simple, no betting)
// Dealer has 1 face-up + 1 face-down (hole) until reveal
// Player can hit/stand
// Dealer hits until 17+
// Aces count as 11 or 1

(function initBlackjack() {
  const dealerCardsEl = document.getElementById("dealerCards");
  const dealerHoleEl = document.getElementById("dealerHole");
  const playerCardsEl = document.getElementById("playerCards");

  const dealerScoreEl = document.getElementById("dealerScore");
  const playerScoreEl = document.getElementById("playerScore");
  const statusEl = document.getElementById("bjStatus");

const dealBtn  = document.getElementById("dealBtn");
const hitBtn   = document.getElementById("hitBtn");
const standBtn = document.getElementById("standBtn");
const resetBtn = document.getElementById("resetBtn");

  // If this script is included on a page without the blackjack UI, do nothing.
  const required = [
    dealerCardsEl, dealerHoleEl, playerCardsEl,
    dealerScoreEl, playerScoreEl, statusEl,
    dealBtn, hitBtn, standBtn, resetBtn
  ];
  if (required.some((el) => !el)) return;

  const SUITS = ["♠", "♥", "♦", "♣"];
  const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

  let deck = [];
  let dealerHand = [];
  let playerHand = [];
  let inRound = false;
  let holeHidden = true;

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function buildDeck() {
    const d = [];
    for (const s of SUITS) {
      for (const r of RANKS) d.push({ rank: r, suit: s });
    }
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

  function makeCardEl(cardObj) {
    const el = document.createElement("div");
    el.className = "bj-card";

    const isRed = cardObj.suit === "♥" || cardObj.suit === "♦";
    el.dataset.red = isRed ? "1" : "0";
    el.textContent = `${cardObj.rank}${cardObj.suit}`;
    return el;
  }

  function setHoleFaceDown() {
    dealerHoleEl.classList.add("bj-card-back");
    dealerHoleEl.textContent = "";
    dealerHoleEl.dataset.red = "0";
  }

  function setHoleFaceUp(cardObj) {
    dealerHoleEl.classList.remove("bj-card-back");
    const isRed = cardObj.suit === "♥" || cardObj.suit === "♦";
    dealerHoleEl.dataset.red = isRed ? "1" : "0";
    dealerHoleEl.textContent = `${cardObj.rank}${cardObj.suit}`;
  }

  function render() {
    // Player cards
    playerCardsEl.innerHTML = "";
    playerHand.forEach((c) => playerCardsEl.appendChild(makeCardEl(c)));

    // Dealer visible cards area (everything except the hole card)
    dealerCardsEl.innerHTML = "";

    if (dealerHand.length > 0) {
      dealerCardsEl.appendChild(makeCardEl(dealerHand[0])); // face-up card
    }

    // If dealer has more than 2 cards, render extras after the hole
    if (dealerHand.length > 2) {
      for (let i = 2; i < dealerHand.length; i++) {
        dealerCardsEl.appendChild(makeCardEl(dealerHand[i]));
      }
    }

    // Hole card slot
    if (holeHidden) {
      setHoleFaceDown();
      // show only first card value
      const first = handValue([dealerHand[0]]);
      dealerScoreEl.textContent = `${first} + ?`;
    } else {
      setHoleFaceUp(dealerHand[1]);
      dealerScoreEl.textContent = String(handValue(dealerHand));
    }

    playerScoreEl.textContent = String(handValue(playerHand));
  }

  function setButtons({ canDeal, canPlay }) {
    dealBtn.disabled = !canDeal;
    hitBtn.disabled = !canPlay;
    standBtn.disabled = !canPlay;
  }

  function endRound(message) {
    inRound = false;
    holeHidden = false;
    render();
    setButtons({ canDeal: true, canPlay: false });
    setStatus(message);
  }

  function dealerPlay() {
    holeHidden = false;
    render();

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
    holeHidden = true;
    inRound = true;

    setButtons({ canDeal: false, canPlay: true });
    setStatus("your move");
    render();

    const pBJ = isBlackjack(playerHand);
    const dBJ = isBlackjack(dealerHand);

    if (pBJ && dBJ) return endRound("double blackjack — push");
    if (pBJ) return endRound("blackjack — you win");
    if (dBJ) return endRound("dealer blackjack — you lose");
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
    holeHidden = true;
    inRound = false;

    dealerCardsEl.innerHTML = "";
    playerCardsEl.innerHTML = "";
    setHoleFaceDown();

    dealerScoreEl.textContent = "—";
    playerScoreEl.textContent = "—";
    setButtons({ canDeal: true, canPlay: false });
    setStatus("press deal to start");
  }

  dealBtn.addEventListener("click", startRound);
  hitBtn.addEventListener("click", hit);
  standBtn.addEventListener("click", stand);
  resetBtn.addEventListener("click", resetAll);

  resetAll();
})();
