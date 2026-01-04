const questionText = document.getElementById("questionText");
const subText = document.getElementById("subText");
const image = document.getElementById("entryImage");
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const buttons = document.querySelector(".buttons");

let noClickedOnce = false;

noBtn.addEventListener("click", () => {
  if (!noClickedOnce) {
    // First "No"
    questionText.textContent = "are u sures 🥺";
    subText.textContent = "im babie";
    image.src = "assets/sad.gif";

    yesBtn.textContent = "i do love u";
    noBtn.textContent = "Still no";

    noClickedOnce = true;
  } else {
    // Optional: second "No" behavior
    questionText.textContent = "ill kill u";
    subText.textContent = "theres only 1 option";
    image.src = "assets/attac.gif";

    yesBtn.textContent = "yes i love you";
    noBtn.style.display = "none"; // hide No button
  }
});

yesBtn.addEventListener("click", () => {
  // Swap to the "yes" gif
  image.src = "assets/yay.gif";

  // Hide everything else
  questionText.style.display = "none";
  subText.style.display = "none";
  buttons.style.display = "none";

  // Optional: make gif a bit bigger / centered
  image.style.width = "220px";

  // Auto-redirect to home
  setTimeout(() => {
    window.location.href = "home.html";
  }, 1800); // 1.8 seconds
});