'use strict';

const app = document.getElementById('app');

const TIP_DELAY_SECONDS = 5;
const MIXED_QUESTION_COUNT = 20;
const BATCH_SIZE = 10;

const state = {
  data: null,
  categoryName: '',
  questions: [],
  index: 0,
  score: 0,
  tipTimer: null,
};

/* ---------- helpers ---------- */

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s) {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/ß/g, 'ss');
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function clearTipTimer() {
  if (state.tipTimer) {
    clearInterval(state.tipTimer);
    state.tipTimer = null;
  }
}

/* ---------- init ---------- */

async function init() {
  document.getElementById('home-link').addEventListener('click', (e) => {
    e.preventDefault();
    clearTipTimer();
    showCategories();
  });

  try {
    const res = await fetch('data/index.json');
    if (!res.ok) throw new Error('index.json: HTTP ' + res.status);
    const index = await res.json();
    const categories = await Promise.all(
      index.categories.map(async (file) => {
        const r = await fetch('data/' + file);
        if (!r.ok) throw new Error(file + ': HTTP ' + r.status);
        return r.json();
      })
    );
    state.data = { categories };
    showCategories();
  } catch (err) {
    app.innerHTML = '';
    const card = el('div', 'card error');
    card.appendChild(el('h2', null, 'Fehler beim Laden der Fragen 😕'));
    const p1 = el('p');
    p1.append('Die Fragen-Dateien im Ordner ', Object.assign(el('code'), { textContent: 'data/' }), ' konnten nicht geladen werden (' + err.message + ').');
    const p2 = el('p');
    p2.append(
      'Hinweis: Öffne die Seite über einen lokalen Server (z. B. ',
      Object.assign(el('code'), { textContent: 'python3 -m http.server' }),
      ') oder über GitHub Pages – nicht direkt als Datei.'
    );
    card.append(p1, p2);
    app.appendChild(card);
  }
}

/* ---------- category screen ---------- */

function showCategories() {
  app.innerHTML = '';

  const title = el('h2', 'screen-title', 'Wähle ein Thema');
  const grid = el('div', 'category-grid');

  for (const cat of state.data.categories) {
    const btn = el('button', 'category-card');
    btn.appendChild(el('div', 'cat-icon', cat.icon || '📚'));
    btn.appendChild(el('h3', null, cat.name));
    btn.appendChild(el('p', null, cat.description || ''));
    btn.appendChild(el('span', 'cat-count', cat.questions.length + ' Fragen'));
    btn.addEventListener('click', () => showBatches(cat));
    grid.appendChild(btn);
  }

  const allQuestions = state.data.categories.flatMap((c) => c.questions);
  const mixedCount = Math.min(MIXED_QUESTION_COUNT, allQuestions.length);
  const mixedBtn = el('button', 'category-card mixed');
  mixedBtn.appendChild(el('div', 'cat-icon', '🎲'));
  mixedBtn.appendChild(el('h3', null, 'Alles gemischt'));
  mixedBtn.appendChild(el('p', null, 'Zufällige Fragen aus allen Themen'));
  mixedBtn.appendChild(el('span', 'cat-count', mixedCount + ' Fragen'));
  mixedBtn.addEventListener('click', () =>
    startQuiz('Alles gemischt', shuffle(allQuestions).slice(0, mixedCount))
  );
  grid.appendChild(mixedBtn);

  app.append(title, grid);
}

function showBatches(cat) {
  if (cat.questions.length <= BATCH_SIZE) {
    startQuiz(cat.name, shuffle(cat.questions));
    return;
  }
  app.innerHTML = '';
  const title = el('h2', 'screen-title', (cat.icon ? cat.icon + ' ' : '') + cat.name);
  const grid = el('div', 'category-grid');
  const batchCount = Math.ceil(cat.questions.length / BATCH_SIZE);
  for (let i = 0; i < batchCount; i++) {
    const questions = cat.questions.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const first = i * BATCH_SIZE + 1;
    const btn = el('button', 'category-card');
    btn.appendChild(el('div', 'cat-icon', '📝'));
    btn.appendChild(el('h3', null, 'Teil ' + (i + 1)));
    btn.appendChild(el('p', null, 'Fragen ' + first + ' bis ' + (first + questions.length - 1)));
    btn.appendChild(el('span', 'cat-count', questions.length + ' Fragen'));
    btn.addEventListener('click', () => startQuiz(cat.name + ' · Teil ' + (i + 1), shuffle(questions)));
    grid.appendChild(btn);
  }
  const actions = el('div', 'actions');
  const back = el('button', 'btn secondary', '← Alle Themen');
  back.addEventListener('click', showCategories);
  actions.appendChild(back);
  app.append(title, grid, actions);
}

/* ---------- quiz flow ---------- */

function startQuiz(name, questions) {
  state.categoryName = name;
  state.questions = questions;
  state.index = 0;
  state.score = 0;
  renderQuestion();
}

function renderQuestion() {
  clearTipTimer();
  app.innerHTML = '';

  const q = state.questions[state.index];
  const total = state.questions.length;

  const top = el('div', 'quiz-top');
  top.appendChild(el('span', 'cat-name', state.categoryName));
  top.appendChild(el('span', 'quiz-meta', 'Frage ' + (state.index + 1) + ' von ' + total + ' · ⭐ ' + state.score));

  const progress = el('div', 'progress');
  const fill = el('div', 'progress-fill');
  fill.style.width = (state.index / total) * 100 + '%';
  progress.appendChild(fill);

  const card = el('div', 'card');
  card.appendChild(el('p', 'question-text', q.question));

  if (q.type === 'choice') {
    renderChoice(card, q);
  } else if (q.type === 'blank') {
    renderBlank(card, q);
  } else if (q.type === 'order') {
    renderOrder(card, q);
  } else {
    card.appendChild(el('p', null, 'Unbekannter Fragetyp: ' + q.type));
  }

  card.appendChild(buildTipArea(q));
  app.append(top, progress, card);

  const input = card.querySelector('.blank-input');
  if (input) input.focus();
}

/* ---------- question types ---------- */

function renderChoice(card, q) {
  const options = el('div', 'options');
  for (const opt of shuffle(q.options)) {
    const btn = el('button', 'option-btn', opt);
    btn.addEventListener('click', () => {
      const isCorrect = opt === q.answer;
      for (const b of options.querySelectorAll('.option-btn')) {
        b.disabled = true;
        if (b.textContent === q.answer) b.classList.add('correct');
      }
      if (!isCorrect) btn.classList.add('wrong');
      finishQuestion(card, q, isCorrect, q.answer);
    });
    options.appendChild(btn);
  }
  card.appendChild(options);
}

function renderBlank(card, q) {
  const row = el('div', 'blank-row');
  const input = el('input', 'blank-input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  input.placeholder = 'Deine Antwort …';

  const checkBtn = el('button', 'btn', 'Prüfen');

  const submit = () => {
    if (!input.value.trim()) return;
    const guess = normalize(input.value);
    const isCorrect = q.answers.some((a) => normalize(a) === guess);
    input.disabled = true;
    checkBtn.disabled = true;
    input.classList.add(isCorrect ? 'correct' : 'wrong');
    finishQuestion(card, q, isCorrect, q.answers[0]);
  };

  checkBtn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });

  row.append(input, checkBtn);
  card.appendChild(row);
}

function renderOrder(card, q) {
  const zone = el('div', 'order-zone empty');
  const pool = el('div', 'order-pool');
  const checkBtn = el('button', 'btn', 'Prüfen');
  checkBtn.disabled = true;
  const selected = [];

  const refresh = () => {
    zone.classList.toggle('empty', selected.length === 0);
    checkBtn.disabled = pool.childElementCount > 0;
  };

  const makeChip = (word) => {
    const chip = el('button', 'chip', word);
    chip.addEventListener('click', () => {
      if (chip.disabled) return;
      if (chip.parentElement === pool) {
        selected.push(word);
        zone.appendChild(chip);
      } else {
        selected.splice(selected.lastIndexOf(word), 1);
        pool.appendChild(chip);
      }
      refresh();
    });
    return chip;
  };

  for (const word of shuffle(q.words)) pool.appendChild(makeChip(word));

  checkBtn.addEventListener('click', () => {
    const guess = normalize(selected.join(' '));
    const isCorrect = q.answers.some((a) => normalize(a) === guess);
    checkBtn.disabled = true;
    for (const chip of card.querySelectorAll('.chip')) chip.disabled = true;
    zone.style.borderColor = isCorrect ? 'var(--correct)' : 'var(--wrong)';
    finishQuestion(card, q, isCorrect, q.answers[0]);
  });

  const actions = el('div', 'actions');
  actions.appendChild(checkBtn);
  card.append(zone, pool, actions);
}

/* ---------- tip (locked for 5 seconds) ---------- */

function buildTipArea(q) {
  const area = el('div', 'tip-area');
  const btn = el('button', 'tip-btn');
  btn.disabled = true;

  let remaining = TIP_DELAY_SECONDS;
  btn.textContent = '💡 Tipp verfügbar in ' + remaining + ' s …';

  state.tipTimer = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      btn.textContent = '💡 Tipp verfügbar in ' + remaining + ' s …';
    } else {
      clearTipTimer();
      btn.disabled = false;
      btn.textContent = '💡 Tipp anzeigen';
    }
  }, 1000);

  btn.addEventListener('click', () => {
    btn.remove();
    area.appendChild(el('div', 'tip-text', q.tip));
  });

  area.appendChild(btn);
  return area;
}

/* ---------- feedback & results ---------- */

function finishQuestion(card, q, isCorrect, correctAnswer) {
  clearTipTimer();
  const tipBtn = card.querySelector('.tip-btn');
  if (tipBtn) tipBtn.remove();

  if (isCorrect) state.score++;

  const feedback = el('div', 'feedback');
  const verdict = el('div', 'verdict ' + (isCorrect ? 'ok' : 'no'));
  verdict.append(isCorrect ? '✅ Richtig!' : '❌ Leider falsch.');
  if (!isCorrect) {
    verdict.appendChild(el('span', 'right-answer', 'Richtige Antwort: ' + correctAnswer));
  }

  const explanation = el('div', 'explanation');
  explanation.appendChild(el('span', 'label', 'Erklärung'));
  explanation.append(q.explanation);

  const actions = el('div', 'actions');
  const isLast = state.index === state.questions.length - 1;
  const nextBtn = el('button', 'btn', isLast ? 'Ergebnis anzeigen 🏁' : 'Weiter →');
  nextBtn.addEventListener('click', () => {
    if (isLast) {
      showResults();
    } else {
      state.index++;
      renderQuestion();
    }
  });
  actions.appendChild(nextBtn);

  feedback.append(verdict, explanation, actions);
  card.appendChild(feedback);
  nextBtn.focus();
}

function showResults() {
  clearTipTimer();
  app.innerHTML = '';

  const total = state.questions.length;
  const percent = Math.round((state.score / total) * 100);

  let emoji, msg;
  if (percent >= 90) {
    emoji = '🏆';
    msg = 'Ausgezeichnet! Du bist bereit für das nächste Niveau!';
  } else if (percent >= 70) {
    emoji = '🎉';
    msg = 'Sehr gut gemacht! Weiter so!';
  } else if (percent >= 50) {
    emoji = '💪';
    msg = 'Gut! Mit etwas Übung wird es noch besser.';
  } else {
    emoji = '📖';
    msg = 'Nicht aufgeben – Übung macht den Meister!';
  }

  const card = el('div', 'card result-card');
  card.appendChild(el('h2', 'screen-title', state.categoryName + ' – Ergebnis'));
  card.appendChild(el('div', 'result-emoji', emoji));
  card.appendChild(el('div', 'result-score', state.score + ' von ' + total + ' richtig (' + percent + ' %)'));
  card.appendChild(el('p', 'result-msg', msg));

  const actions = el('div', 'actions');
  const againBtn = el('button', 'btn', '🔁 Nochmal üben');
  againBtn.addEventListener('click', () => startQuiz(state.categoryName, shuffle(state.questions)));
  const homeBtn = el('button', 'btn secondary', '📚 Andere Themen');
  homeBtn.addEventListener('click', showCategories);
  actions.append(againBtn, homeBtn);

  card.appendChild(actions);
  app.appendChild(card);
}

init();
