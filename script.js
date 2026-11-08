// =============================================
// COZY STUDY TIMER — script.js
// by Bargavi Sivaraman
// =============================================

// ── THEME CONFIG ──
const themes = {
  cozy: {
    logo: '☕ cozy study',
    emoji: '☕',
    sub: 'a cozy space to study, track tasks & take care of yourself',
    floaties: ['☕','🍂','✨','📚','🌿','☁️','🎵','🍪','🌸','📖','🕯️','🍵']
  },
  purple: {
    logo: '💜 dreamy study',
    emoji: '🌙',
    sub: 'manifest your goals, one pomodoro at a time ✨',
    floaties: ['💜','✨','🌙','⭐','🔮','🌸','💫','🦋','🌺','💐','🌟','🪄']
  },
  nightowl: {
    logo: '🦉 night owl',
    emoji: '🌃',
    sub: "the night is young — let's get it done 🌃",
    floaties: ['🌙','⭐','🦉','💻','☕','🌟','🔭','🛸','💫','✨','🌌','⚡']
  },
  spring: {
    logo: '🌸 spring study',
    emoji: '🌱',
    sub: "bloom where you're planted 🌸 study session starting!",
    floaties: ['🌸','🌷','🦋','🌺','🌼','🍃','🌱','🌿','🐝','🌻','💐','🍀']
  }
};

let currentTheme = 'cozy';

function setTheme(t, el) {
  currentTheme = t;
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('.theme-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const c = themes[t];
  document.getElementById('logo').textContent = c.logo;
  document.getElementById('heroEmoji').textContent = c.emoji;
  document.getElementById('heroSub').textContent = c.sub;
  spawnFloaties(c.floaties);
  showNotif('switched to ' + t + ' theme ' + c.emoji);
}

// ── FLOATIES ──
function spawnFloaties(items) {
  const box = document.getElementById('floaties');
  box.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const el = document.createElement('div');
    el.className = 'floatie';
    el.textContent = items[Math.floor(Math.random() * items.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.fontSize = (0.8 + Math.random() * 1.3) + 'rem';
    el.style.animationDuration = (12 + Math.random() * 18) + 's';
    el.style.animationDelay = (-Math.random() * 22) + 's';
    box.appendChild(el);
  }
}

// ── RAIN ──
const canvas = document.getElementById('rainCanvas');
const ctx = canvas.getContext('2d');
let drops = [], raining = false, raf;

function initRain() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drops = [];
  for (let i = 0; i < 130; i++) {
    drops.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      len: 10 + Math.random() * 20,
      speed: 4 + Math.random() * 6,
      op: 0.08 + Math.random() * 0.25,
      w: 0.5 + Math.random() * 1
    });
  }
}

function drawRain() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drops.forEach(d => {
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - 1, d.y + d.len);
    ctx.strokeStyle = currentTheme === 'nightowl'
      ? `rgba(88,166,255,${d.op})`
      : `rgba(150,180,220,${d.op})`;
    ctx.lineWidth = d.w;
    ctx.stroke();
    d.y += d.speed;
    if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
  });
  if (raining) raf = requestAnimationFrame(drawRain);
}

function toggleRain() {
  raining = !raining;
  const btn = document.getElementById('rainBtn');
  btn.classList.toggle('active', raining);
  btn.textContent = raining ? '🌧 rain on' : '🌧 rain off';
  canvas.classList.toggle('show', raining);
  if (raining) { initRain(); drawRain(); showNotif('🌧 raining... so cozy'); }
  else { cancelAnimationFrame(raf); ctx.clearRect(0, 0, canvas.width, canvas.height); }
}

window.addEventListener('resize', () => { if (raining) initRain(); });

// ── MUSIC ──
let activeTrack = null;

function playTrack(btn) {
  if (activeTrack === btn) {
    btn.classList.remove('active');
    const wv = btn.querySelector('.music-wave');
    if (wv) wv.remove();
    activeTrack = null;
    showNotif('🔇 music off');
    return;
  }
  if (activeTrack) {
    activeTrack.classList.remove('active');
    const wv = activeTrack.querySelector('.music-wave');
    if (wv) wv.remove();
  }
  btn.classList.add('active');
  const wave = document.createElement('div');
  wave.className = 'music-wave';
  wave.innerHTML = '<span></span><span></span><span></span><span></span>';
  btn.appendChild(wave);
  activeTrack = btn;
  showNotif('🎵 opening stream...');
  setTimeout(() => window.open(btn.dataset.url, '_blank'), 400);
}

// ── TIMER ──
const MODES = {
  focus: { lbl: 'focus time',       mins: 25 },
  short: { lbl: 'short break ☕',   mins: 5  },
  long:  { lbl: 'long break 🌿',    mins: 15 }
};

let mode = 'focus';
let total = 25 * 60;
let remain = 25 * 60;
let running = false;
let iv = null;
let sessions = 0;
let mins = 0;
let tasksDone = 0;
let endAt = 0; // wall-clock deadline while the timer runs
let streak = parseInt(localStorage.getItem('studyStreak'), 10) || 0;
let tasks = [];
try {
  const stored = JSON.parse(localStorage.getItem('studyTasks') || '[]');
  if (Array.isArray(stored)) tasks = stored.filter(t => t && typeof t.text === 'string');
} catch (e) {
  localStorage.removeItem('studyTasks'); // corrupt data — start fresh instead of crashing
}

function setMode(m, el) {
  if (running) return;
  mode = m;
  total = MODES[m].mins * 60;
  remain = total;
  document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('timerModeLbl').textContent = MODES[m].lbl;
  updateDisplay();
  updateRing();
}

function toggleTimer() { running ? pause() : start(); }

function start() {
  running = true;
  endAt = Date.now() + remain * 1000;
  const b = document.getElementById('startBtn');
  b.textContent = '⏸ pause';
  b.classList.add('running');
  iv = setInterval(tick, 1000);
}

function pause() {
  running = false;
  remain = Math.max(0, Math.round((endAt - Date.now()) / 1000));
  const b = document.getElementById('startBtn');
  b.textContent = '▶ resume';
  b.classList.remove('running');
  clearInterval(iv);
}

function tick() {
  // derive the countdown from the wall clock so throttled or late
  // intervals (e.g. background tabs) can't make the timer drift
  remain = Math.max(0, Math.round((endAt - Date.now()) / 1000));
  updateDisplay();
  updateRing();
  if (remain <= 0) done();
}

function done() {
  clearInterval(iv);
  running = false;
  const b = document.getElementById('startBtn');
  b.textContent = '▶ start';
  b.classList.remove('running');
  if (mode === 'focus') {
    sessions++;
    mins += MODES.focus.mins;
    updateDots();
    showNotif(sessions % 4 === 0 ? '🌿 4 sessions! take a long break!' : '🍅 session done! take a break ☕');
  } else {
    showNotif('✨ break over! back to focus!');
  }
  updateStats();
  remain = total;
  updateDisplay();
  updateRing();
}

function resetTimer() {
  clearInterval(iv);
  running = false;
  remain = total;
  const b = document.getElementById('startBtn');
  b.textContent = '▶ start';
  b.classList.remove('running');
  updateDisplay();
  updateRing();
}

function skipSession() { done(); }

function updateDisplay() {
  const m = Math.floor(remain / 60).toString().padStart(2, '0');
  const s = (remain % 60).toString().padStart(2, '0');
  document.getElementById('timerDisplay').textContent = m + ':' + s;
  document.title = running ? m + ':' + s + ' — cozy study ☕' : 'cozy study timer ☕';
}

function updateRing() {
  document.getElementById('progressRing').style.strokeDashoffset = (2 * Math.PI * 88) * (1 - remain / total);
}

function updateDots() {
  const row = document.getElementById('dotsRow');
  row.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const d = document.createElement('div');
    d.className = 'dot' + (i < sessions ? (i === 3 || i === 7 ? ' long' : ' done') : '');
    row.appendChild(d);
  }
}

// ── TASKS ──
function addTask() {
  const v = document.getElementById('taskInput').value.trim();
  if (!v) return;
  tasks.push({ text: v, done: false, id: Date.now() });
  document.getElementById('taskInput').value = '';
  save();
  render();
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  if (t.done) tasksDone++;
  else tasksDone = Math.max(0, tasksDone - 1);
  updateStats();
  save();
  render();
}

function delTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  render();
}

function clearDone() {
  tasks = tasks.filter(t => !t.done);
  save();
  render();
}

function render() {
  const list = document.getElementById('taskList');
  list.innerHTML = '';
  if (!tasks.length) {
    list.innerHTML = '<div style="text-align:center;color:var(--muted2);font-size:0.78rem;padding:26px 0;font-family:Fraunces,serif;font-style:italic;">no tasks yet... add one above ✍️</div>';
  } else {
    tasks.forEach(t => {
      const el = document.createElement('div');
      el.className = 'task-item' + (t.done ? ' done' : '');
      el.innerHTML =
        '<button class="task-check" onclick="toggleTask(' + t.id + ')">' + (t.done ? '✓' : '') + '</button>' +
        '<span class="task-text">' + esc(t.text) + '</span>' +
        '<button class="task-del" onclick="delTask(' + t.id + ')">✕</button>';
      list.appendChild(el);
    });
  }
  const rem = tasks.filter(t => !t.done).length;
  document.getElementById('taskCount').textContent =
    rem === 0 ? 'all done! 🎉' : rem + ' task' + (rem !== 1 ? 's' : '') + ' left';
}

function save() { localStorage.setItem('studyTasks', JSON.stringify(tasks)); }
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── STATS ──
function updateStats() {
  document.getElementById('sF').textContent = sessions;
  document.getElementById('sM').textContent = mins;
  document.getElementById('sT').textContent = tasksDone;
  document.getElementById('sS').textContent = '🔥 ' + streak;
}

// ── MOOD ──
const moodMsgs = {
  focused:   "let's get it 🎯 you're already in the zone!",
  tired:     "take it slow ☕ even small steps count today",
  happy:     "good energy! let's ride that wave 🌸",
  stressed:  "breathe first, then one task at a time 💛",
  cozy:      "perfect study vibes 🧸 let's make it count",
  motivated: "let's gooo ⚡ nothing can stop you today!"
};

function setMood(el) {
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('moodMsg').textContent = moodMsgs[el.dataset.mood] || '';
}

// ── QUOTES ──
const quotes = [
  { t: "The secret of getting ahead is getting started.",              a: "Mark Twain" },
  { t: "Done is better than perfect.",                                  a: "Sheryl Sandberg" },
  { t: "An investment in knowledge pays the best interest.",            a: "Benjamin Franklin" },
  { t: "It always seems impossible until it's done.",                   a: "Nelson Mandela" },
  { t: "Be so good they can't ignore you.",                             a: "Steve Martin" },
  { t: "You are capable of more than you know.",                        a: "Unknown" },
  { t: "Push yourself because no one else is going to do it for you.",  a: "Unknown" },
  { t: "Even NASA wasn't built in a day. 🚀",                          a: "Unknown" },
  { t: "The expert in anything was once a beginner.",                   a: "Helen Hayes" },
  { t: "Code a little, learn a lot.",                                   a: "Unknown" },
  { t: "Dream big. Start small. Act now.",                              a: "Unknown" },
  { t: "Your only limit is your mind.",                                 a: "Unknown" }
];

let lastQ = -1;

function newQuote() {
  let i;
  do { i = Math.floor(Math.random() * quotes.length); } while (i === lastQ);
  lastQ = i;
  const t = document.getElementById('quoteText');
  t.style.opacity = '0';
  setTimeout(() => {
    t.textContent = '"' + quotes[i].t + '"';
    document.getElementById('quoteAuthor').textContent = '— ' + quotes[i].a;
    t.style.opacity = '1';
  }, 250);
}

// ── NOTIFICATION ──
function showNotif(msg) {
  const n = document.getElementById('notif');
  n.textContent = msg;
  n.classList.add('show');
  setTimeout(() => n.classList.remove('show'), 3000);
}

// ── STREAK ──
function checkStreak() {
  const today = new Date().toDateString();
  const last  = localStorage.getItem('lastStudyDate');
  if (last !== today) {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    streak = last === yest.toDateString() ? streak + 1 : 1;
    localStorage.setItem('studyStreak', streak);
    localStorage.setItem('lastStudyDate', today);
    updateStats();
  }
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  const opts = { weekday: 'long', month: 'long', day: 'numeric' };
  document.getElementById('dateTag').textContent =
    new Date().toLocaleDateString('en-US', opts).toLowerCase();
  render();
  updateStats();
  updateDots();
  newQuote();
  checkStreak();
  spawnFloaties(themes.cozy.floaties);
});
