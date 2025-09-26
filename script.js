/* =========================
   State & Persistence
========================= */
let players = JSON.parse(localStorage.getItem('players')) || [];
let matchHistory = JSON.parse(localStorage.getItem('matchHistory')) || [];
const K = 15;

function savePlayers() { localStorage.setItem('players', JSON.stringify(players)); }
function saveHistory() { localStorage.setItem('matchHistory', JSON.stringify(matchHistory)); }

/* =========================
   Theme (persisted)
========================= */
const THEME_KEY = 'fcc_theme';
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  localStorage.setItem(THEME_KEY, theme);
  updateChart(true);
}

function loadTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) {
    applyTheme(stored);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

/* =========================
   Player CRUD
========================= */
function addPlayer() {
  const name = document.getElementById('playerName').value.trim();
  const rating = parseInt(document.getElementById('playerRating').value, 10);
  if (!name || isNaN(rating)) {
    showToast("Enter a valid name and rating", "error");
    return;
  }

  players.push({ name, rating, winStreak: 0, bestStreak: 0, points: 0 });
  savePlayers();
  renderPlayers();
  renderLeaderboard();
  document.getElementById('playerName').value = '';
  document.getElementById('playerRating').value = '';
  showToast(`Player "${name}" added ✅`, "success");
}

function clearPlayers() {
  localStorage.removeItem('players');
  players = [];
  renderPlayers();
  renderLeaderboard();
  showToast("All players cleared ❌", "info");
}

/* =========================
   Matches & Ratings
========================= */
function expectedScore(rA, rB) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function recordMatch() {
  const p1Index = document.getElementById('player1').value;
  const p2Index = document.getElementById('player2').value;
  const result = document.getElementById('matchResult').value;

  if (p1Index === '' || p2Index === '') {
    showToast("Select both players", "error");
    return;
  }
  if (p1Index === p2Index) {
    showToast("Players must be different", "error");
    return;
  }

  const playerA = players[p1Index];
  const playerB = players[p2Index];
  const ratingA = playerA.rating;
  const ratingB = playerB.rating;

  let scoreA, scoreB, winner;
  if (result === 'win') {
    scoreA = 1; scoreB = 0;
    playerA.winStreak++; playerB.winStreak = 0;
    playerA.points += 1;
    winner = playerA.name;
  } else if (result === 'loss') {
    scoreA = 0; scoreB = 1;
    playerB.winStreak++; playerA.winStreak = 0;
    playerB.points += 1;
    winner = playerB.name;
  } else {
    scoreA = 0.5; scoreB = 0.5;
    playerA.winStreak = 0; playerB.winStreak = 0;
    playerA.points += 0.5; playerB.points += 0.5;
    winner = 'Draw';
  }

  playerA.bestStreak = Math.max(playerA.bestStreak, playerA.winStreak);
  playerB.bestStreak = Math.max(playerB.bestStreak, playerB.winStreak);

  playerA.rating += Math.round(K * (scoreA - expectedScore(ratingA, ratingB)));
  playerB.rating += Math.round(K * (scoreB - expectedScore(ratingB, ratingA)));

  matchHistory.push({
    playerA: playerA.name,
    playerB: playerB.name,
    result,
    winner,
    oldRatingA: ratingA,
    newRatingA: playerA.rating,
    oldRatingB: ratingB,
    newRatingB: playerB.rating,
    date: new Date().toISOString().split('T')[0]
  });

  savePlayers();
  saveHistory();
  renderPlayers();
  renderLeaderboard();
  renderMatchHistory();
  updateChart();

  showToast(`Match recorded ✅ Winner: ${winner}`, "success");
}

/* =========================
   Undo Last Match + Toast
========================= */
function undoLastMatch() {
  const last = matchHistory.pop();
  if (!last) {
    showToast("No match to undo", "info");
    return;
  }

  const playerA = players.find(p => p.name === last.playerA);
  const playerB = players.find(p => p.name === last.playerB);

  if (playerA) {
    playerA.rating = last.oldRatingA;
    if (last.result === 'win') playerA.points -= 1;
    if (last.result === 'draw') playerA.points -= 0.5;
    playerA.winStreak = 0;
  }
  if (playerB) {
    playerB.rating = last.oldRatingB;
    if (last.result === 'loss') playerB.points -= 1;
    if (last.result === 'draw') playerB.points -= 0.5;
    playerB.winStreak = 0;
  }

  savePlayers();
  saveHistory();
  renderPlayers();
  renderLeaderboard();
  renderMatchHistory();
  updateChart();

  showToast("Last match undone ✅", "info");
}

/* =========================
   Rendering
========================= */
function renderPlayers() {
  const playerList = document.getElementById('playerList');
  const p1 = document.getElementById('player1');
  const p2 = document.getElementById('player2');

  playerList.innerHTML = '';
  p1.innerHTML = '<option value="" disabled selected>Select Player 1</option>';
  p2.innerHTML = '<option value="" disabled selected>Select Player 2</option>';

  players.forEach((p, idx) => {
    const div = document.createElement('div');
    div.textContent = `${p.name} — Rating: ${p.rating} — Points: ${p.points}`;
    playerList.appendChild(div);

    p1.insertAdjacentHTML('beforeend', `<option value="${idx}">${p.name}</option>`);
    p2.insertAdjacentHTML('beforeend', `<option value="${idx}">${p.name}</option>`);
  });
}

function renderLeaderboard() {
  const searchTerm = document.getElementById('globalSearch')?.value.trim().toLowerCase() || '';
  const sorted = [...players].sort((a, b) => b.rating - a.rating);

  const filtered = searchTerm
    ? sorted.filter(p => p.name.toLowerCase().includes(searchTerm))
    : sorted;

  const html = `
    <table aria-label="Leaderboard">
      <thead>
        <tr>
          <th>Player</th>
          <th>Rating</th>
          <th>Best Streak</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${p.rating}</td>
            <td>${p.bestStreak}</td>
            <td>${p.points}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  document.getElementById('leaderboard').innerHTML = html;
}

/* =========================
   Match History (local filters only)
========================= */
function renderMatchHistory() {
  const filterPlayer = document.getElementById('filterPlayer')?.value.trim().toLowerCase() || '';
  const filterDate = document.getElementById('filterDate')?.value || '';

  let filtered = [...matchHistory];

  if (filterPlayer) {
    filtered = filtered.filter(m =>
      m.playerA.toLowerCase().includes(filterPlayer) ||
      m.playerB.toLowerCase().includes(filterPlayer)
    );
  }
  if (filterDate) {
    filtered = filtered.filter(m => m.date === filterDate);
  }

  const html = `
    <table aria-label="Match history">
      <thead>
        <tr>
          <th>Date</th>
          <th>Player A</th>
          <th>Old Rating</th>
          <th>New Rating</th>
          <th>Player B</th>
          <th>Old Rating</th>
          <th>New Rating</th>
          <th>Winner</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(m => `
          <tr>
            <td>${m.date}</td>
            <td>${m.playerA}</td>
            <td>${m.oldRatingA}</td>
            <td>${m.newRatingA}</td>
            <td>${m.playerB}</td>
            <td>${m.oldRatingB}</td>
            <td>${m.newRatingB}</td>
            <td>${m.winner}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  document.getElementById('matchHistory').innerHTML = html;
}

/* =========================
   Utilities
========================= */
function exportCSV() {
  if (matchHistory.length === 0) {
    showToast("No matches to export", "error");
    return;
  }

  let csv = 'Date,Player A,Old Rating A,New Rating A,Player B,Old Rating B,New Rating B,Winner\n';
  matchHistory.forEach(m => {
    csv += `${m.date},${m.playerA},${m.oldRatingA},${m.newRatingA},${m.playerB},${m.oldRatingB},${m.newRatingB},${m.winner}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'match_history.csv';
  link.click();

  showToast("CSV exported 📄", "success");
}

function clearMatchHistory() {
  localStorage.removeItem('matchHistory');
  matchHistory = [];
  renderMatchHistory();
  updateChart();
  showToast("Match history cleared ❌", "info");
}

function resetFilters() {
  document.getElementById('filterPlayer').value = '';
  document.getElementById('filterDate').value = '';
  renderMatchHistory();
}

function resetAllFilters() {
  document.getElementById('globalSearch').value = '';
  document.getElementById('filterPlayer').value = '';
  document.getElementById('filterDate').value = '';

  renderLeaderboard();
  renderMatchHistory();

  showToast("Filters reset 🔄", "info");
}

/* =========================
   Toast Notification
========================= */
function showToast(message, type = "success") {
  const oldToast = document.querySelector(".toast");
  if (oldToast) oldToast.remove();

  let toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  if (type === "success") toast.style.background = "#16a34a"; // green
  if (type === "error") toast.style.background = "#dc2626";   // red
  if (type === "info") toast.style.background = "#2563eb";    // blue

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 50);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/* =========================
   Chart
========================= */
let chart;
function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function updateChart(forceRebuild = false) {
  const ctx = document.getElementById('ratingChart').getContext('2d');
  const labels = matchHistory.map(m => m.date);

  const datasets = players.map(player => {
    const ratings = matchHistory
      .filter(m => m.playerA === player.name || m.playerB === player.name)
      .map(m => (m.playerA === player.name ? m.newRatingA : m.newRatingB));

    const seed = [...player.name].reduce((a,c)=>a + c.charCodeAt(0), 0);
    const hue = seed % 360;
    const color = `hsl(${hue} 70% 50%)`;

    return { label: player.name, data: ratings, fill: false, tension: 0.25, borderWidth: 2, borderColor: color };
  });

  const textColor = getCssVar('--text') || '#111';
  const gridColor = getCssVar('--border') || '#ddd';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: textColor } },
      tooltip: { titleColor: textColor, bodyColor: textColor }
    },
    scales: {
      x: { ticks: { color: textColor }, grid: { color: gridColor } },
      y: { ticks: { color: textColor }, grid: { color: gridColor } }
    }
  };

  if (chart && (forceRebuild || chart.config.data.labels.length !== labels.length)) {
    chart.destroy();
    chart = null;
  }

  if (!chart) {
    chart = new Chart(ctx, { type: 'line', data: { labels, datasets }, options });
  } else {
    chart.data.labels = labels;
    chart.data.datasets = datasets;
    chart.options = options;
    chart.update();
  }
}

/* =========================
   Events & Boot
========================= */
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
  });

  document.getElementById('globalSearch').addEventListener('input', renderLeaderboard);
  document.getElementById('resetFiltersBtn').addEventListener('click', resetAllFilters);

  document.getElementById('filterPlayer').addEventListener('input', renderMatchHistory);
  document.getElementById('filterDate').addEventListener('input', renderMatchHistory);

  renderPlayers();
  renderLeaderboard();
  renderMatchHistory();
  updateChart();
});
