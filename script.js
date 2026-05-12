const GAME_SECONDS = 60;

const modeSettings = {
  addition: { label: "Addition", symbol: "+", color: "#16834a" },
  subtraction: { label: "Subtraction", symbol: "-", color: "#e76f00" },
  multiplication: { label: "Multiplication", symbol: "x", color: "#1864d8" },
  division: { label: "Division", symbol: "÷", color: "#c5266a" },
  mixed: { label: "Mixed Mode", symbol: "🎲", color: "#7348d6" },
};

const messages = [
  "Great job!",
  "Keep going!",
  "You got this!",
  "Nice thinking!",
  "Math power!",
  "Super focus!",
];

const screens = {
  start: document.querySelector("#start-screen"),
  game: document.querySelector("#game-screen"),
  end: document.querySelector("#end-screen"),
};

const modeButtons = document.querySelectorAll(".mode-button");
const modeLabel = document.querySelector("#mode-label");
const scoreLabel = document.querySelector("#score-label");
const timeLabel = document.querySelector("#time-label");
const timerBar = document.querySelector("#timer-bar");
const encouragement = document.querySelector("#encouragement");
const problemText = document.querySelector("#problem-text");
const visualModel = document.querySelector("#visual-model");
const answerForm = document.querySelector("#answer-form");
const answerInput = document.querySelector("#answer-input");
const feedback = document.querySelector("#feedback");
const keypad = document.querySelector(".keypad");
const finalScoreLabel = document.querySelector("#final-score-label");
const finalMessage = document.querySelector("#final-message");
const answeredLabel = document.querySelector("#answered-label");
const correctLabel = document.querySelector("#correct-label");
const accuracyLabel = document.querySelector("#accuracy-label");
const bestScoreLabel = document.querySelector("#best-score-label");
const missedEmpty = document.querySelector("#missed-empty");
const missedList = document.querySelector("#missed-list");
const playAgainButton = document.querySelector("#play-again-button");
const backButton = document.querySelector("#back-button");
const printButton = document.querySelector("#print-button");

let selectedMode = "addition";
let score = 0;
let timeLeft = GAME_SECONDS;
let timerId = null;
let currentProblem = null;
let acceptingAnswers = false;
let totalAnswered = 0;
let missedProblems = [];

// Screen changes are centralized so buttons can reuse the same flow.
function showScreen(screenName) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[screenName].classList.add("active");
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomMessage() {
  return messages[randomInt(0, messages.length - 1)];
}

// Problem generators follow the requested 2nd-grade difficulty rules.
function createProblem(mode) {
  const activeMode =
    mode === "mixed"
      ? ["addition", "subtraction", "multiplication", "division"][randomInt(0, 3)]
      : mode;

  if (activeMode === "addition") {
    const left = randomInt(0, 20);
    const right = randomInt(0, 20);
    return {
      left,
      right,
      symbol: "+",
      answer: left + right,
      prompt: `${left} + ${right} = ?`,
      isStory: false,
    };
  }

  if (activeMode === "subtraction") {
    const first = randomInt(0, 20);
    const second = randomInt(0, 20);
    const left = Math.max(first, second);
    const right = Math.min(first, second);
    return {
      left,
      right,
      symbol: "-",
      answer: left - right,
      prompt: `${left} - ${right} = ?`,
      isStory: false,
    };
  }

  if (activeMode === "multiplication") {
    const left = randomInt(1, 10);
    const right = randomInt(0, 10);
    return {
      left,
      right,
      symbol: "x",
      answer: left * right,
      prompt: `${left} groups of ${right}`,
      isStory: true,
      visualType: "multiplication",
    };
  }

  const divisor = randomInt(1, 10);
  const answer = randomInt(1, 10);
  const total = divisor * answer;
  return {
    left: total,
    right: divisor,
    symbol: "÷",
    answer,
    prompt: `${total} split into ${divisor} groups`,
    isStory: true,
    visualType: "division",
  };
}

function createDots(count) {
  const dots = document.createElement("div");
  dots.className = "dots";

  for (let index = 0; index < count; index += 1) {
    const dot = document.createElement("span");
    dot.className = "dot";
    dots.append(dot);
  }

  return dots;
}

function createDotGroup(labelText, dotCount, extraClass = "") {
  const group = document.createElement("div");
  const label = document.createElement("span");

  group.className = `dot-group ${extraClass}`.trim();
  label.className = "dot-group-label";
  label.textContent = labelText;

  group.append(label, createDots(dotCount));
  return group;
}

function renderVisualModel(problem) {
  visualModel.innerHTML = "";
  visualModel.classList.toggle("active", Boolean(problem.visualType));

  if (!problem.visualType) {
    return;
  }

  const title = document.createElement("p");
  const grid = document.createElement("div");

  title.className = "visual-title";
  grid.className = "group-grid";

  if (problem.visualType === "multiplication") {
    title.textContent = `${problem.left} groups, ${problem.right} in each group`;
    for (let index = 1; index <= problem.left; index += 1) {
      grid.append(createDotGroup(`Group ${index}: ${problem.right}`, problem.right));
    }
  } else {
    title.textContent = `${problem.left} shared into ${problem.right} equal groups`;
    for (let index = 1; index <= problem.right; index += 1) {
      grid.append(createDotGroup(`Share ${index}: ?`, problem.answer, "share"));
    }
  }

  visualModel.append(title, grid);
}

function displayProblem() {
  currentProblem = createProblem(selectedMode);
  problemText.textContent = currentProblem.prompt;
  problemText.classList.toggle("story-problem", currentProblem.isStory);
  renderVisualModel(currentProblem);
  encouragement.textContent = randomMessage();
  answerInput.value = "";
  answerInput.focus();
  acceptingAnswers = true;
}

function updateStats() {
  scoreLabel.textContent = score;
  timeLabel.textContent = timeLeft;
  timerBar.style.width = `${(timeLeft / GAME_SECONDS) * 100}%`;
}

function bestScoreKey(mode) {
  return `mathSprintBestScore:${mode}`;
}

function getBestScore(mode) {
  return Number(localStorage.getItem(bestScoreKey(mode))) || 0;
}

function saveBestScore(mode, newScore) {
  const bestScore = Math.max(getBestScore(mode), newScore);
  localStorage.setItem(bestScoreKey(mode), String(bestScore));
  return bestScore;
}

function renderMissedProblems() {
  missedList.innerHTML = "";
  missedEmpty.hidden = missedProblems.length > 0;

  missedProblems.forEach((problem) => {
    const listItem = document.createElement("li");
    const question = document.createElement("strong");
    const answer = document.createElement("span");

    question.textContent = `${problem.prompt} Answer: ${problem.correctAnswer}`;
    answer.textContent = `Your answer: ${problem.userAnswer}`;

    listItem.append(question, answer);
    missedList.append(listItem);
  });
}

function startGame(mode) {
  selectedMode = mode;
  score = 0;
  timeLeft = GAME_SECONDS;
  totalAnswered = 0;
  missedProblems = [];
  acceptingAnswers = true;
  modeLabel.textContent = modeSettings[mode].label;
  feedback.textContent = "";
  feedback.className = "feedback";
  showScreen("game");
  updateStats();
  displayProblem();

  clearInterval(timerId);
  timerId = setInterval(() => {
    timeLeft -= 1;
    updateStats();

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  clearInterval(timerId);
  acceptingAnswers = false;
  const accuracy = totalAnswered === 0 ? 0 : Math.round((score / totalAnswered) * 100);
  const bestScore = saveBestScore(selectedMode, score);

  finalScoreLabel.textContent = score;
  answeredLabel.textContent = totalAnswered;
  correctLabel.textContent = score;
  accuracyLabel.textContent = `${accuracy}%`;
  bestScoreLabel.textContent = bestScore;
  finalMessage.textContent =
    score >= 20 ? "Amazing speed and accuracy!" : score >= 10 ? "Great work today!" : "Nice practice. Keep going!";
  renderMissedProblems();
  showScreen("end");
}

function checkAnswer(event) {
  event.preventDefault();

  if (!acceptingAnswers || !currentProblem) {
    return;
  }

  const userAnswer = Number(answerInput.value);
  if (answerInput.value.trim() === "") {
    feedback.textContent = "Type an answer first.";
    feedback.className = "feedback incorrect";
    answerInput.focus();
    return;
  }

  acceptingAnswers = false;
  totalAnswered += 1;
  if (userAnswer === currentProblem.answer) {
    score += 1;
    feedback.textContent = "Correct! Great job!";
    feedback.className = "feedback correct";
  } else {
    missedProblems.push({
      left: currentProblem.left,
      right: currentProblem.right,
      symbol: currentProblem.symbol,
      prompt: currentProblem.prompt,
      userAnswer: answerInput.value,
      correctAnswer: currentProblem.answer,
    });
    feedback.textContent = `Almost! The answer was ${currentProblem.answer}.`;
    feedback.className = "feedback incorrect";
  }

  updateStats();
  window.setTimeout(() => {
    if (timeLeft > 0) {
      feedback.textContent = "";
      feedback.className = "feedback";
      displayProblem();
    }
  }, 650);
}

function handleKeypadClick(event) {
  const key = event.target.dataset.key;
  if (!key) {
    return;
  }

  if (key === "clear") {
    answerInput.value = "";
  } else if (key === "back") {
    answerInput.value = answerInput.value.slice(0, -1);
  } else {
    answerInput.value += key;
  }

  answerInput.focus();
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => startGame(button.dataset.mode));
});

answerForm.addEventListener("submit", checkAnswer);
keypad.addEventListener("click", handleKeypadClick);

playAgainButton.addEventListener("click", () => startGame(selectedMode));
backButton.addEventListener("click", () => {
  clearInterval(timerId);
  showScreen("start");
});

printButton.addEventListener("click", () => {
  window.print();
});
