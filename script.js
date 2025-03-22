let players = JSON.parse(localStorage.getItem('players')) || [];
let matchHistory = JSON.parse(localStorage.getItem('matchHistory')) || [];
const K = 15;

function savePlayers() { localStorage.setItem('players', JSON.stringify(players)); }
function saveHistory() { localStorage.setItem('matchHistory', JSON.stringify(matchHistory)); }

function addPlayer() {
  const name = document.getElementById('playerName').value.trim();
  const rating = parseInt(document.getElementById('playerRating').value);
  if (name && rating) {
    players.push({ name, rating, winStreak: 0, bestStreak: 0, points: 0 });
    savePlayers();
    renderPlayers();
    document.getElementById('playerName').value = '';
    document.getElementById('playerRating').value = '';
  }
}

function clearPlayers() { localStorage.removeItem('players'); players = []; renderPlayers(); renderLeaderboard(); }
function clearMatchHistory() { localStorage.removeItem('matchHistory'); matchHistory = []; renderMatchHistory(); updateChart(); }

function renderPlayers() {
  const playerList = document.getElementById('playerList');
  const options1 = document.getElementById('player1');
  const options2 = document.getElementById('player2');
  playerList.innerHTML = options1.innerHTML = options2.innerHTML = '';
  players.forEach((p, index) => {
    playerList.innerHTML += `<div>${p.name} - Rating: ${p.rating} - Points: ${p.points}</div>`;
    options1.innerHTML += `<option value="${index}">${p.name}</option>`;
    options2.innerHTML += `<option value="${index}">${p.name}</option>`;
  });
}

function expectedScore(rA, rB) { return 1 / (1 + Math.pow(10, (rB - rA) / 400)); }

function recordMatch() {
  const p1Index = document.getElementById('player1').value;
  const p2Index = document.getElementById('player2').value;
  const result = document.getElementById('matchResult').value;
  if (p1Index === p2Index) return alert("Select two different players!");

  const playerA = players[p1Index];
  const playerB = players[p2Index];
  const ratingA = playerA.rating;
  const ratingB = playerB.rating;

  let scoreA, scoreB, winner;
  if (result === 'win') { scoreA = 1; scoreB = 0; playerA.winStreak++; playerB.winStreak = 0; playerA.points += 1; winner = playerA.name; }
  else if (result === 'loss') { scoreA = 0; scoreB = 1; playerB.winStreak++; playerA.winStreak = 0; playerB.points += 1; winner = playerB.name; }
  else { scoreA = scoreB = 0.5; playerA.winStreak = playerB.winStreak = 0; playerA.points += 0.5; playerB.points += 0.5; winner = 'Draw'; }

  playerA.bestStreak = Math.max(playerA.bestStreak, playerA.winStreak);
  playerB.bestStreak = Math.max(playerB.bestStreak, playerB.winStreak);

  playerA.rating += Math.round(K * (scoreA - expectedScore(ratingA, ratingB)));
  playerB.rating += Math.round(K * (scoreB - expectedScore(ratingB, ratingA)));

  matchHistory.push({ playerA: playerA.name, playerB: playerB.name, result, winner, oldRatingA: ratingA, newRatingA: playerA.rating, oldRatingB: ratingB, newRatingB: playerB.rating, date: new Date().toISOString().split('T')[0] });

  savePlayers(); saveHistory(); renderPlayers(); renderLeaderboard(); renderMatchHistory(); updateChart();
}

function undoLastMatch() {
  const last = matchHistory.pop();
  if (last) {
    const playerA = players.find(p => p.name === last.playerA);
    const playerB = players.find(p => p.name === last.playerB);
    if (playerA) playerA.rating = last.oldRatingA;
    if (playerB) playerB.rating = last.oldRatingB;
    savePlayers(); saveHistory();
    renderPlayers(); renderLeaderboard(); renderMatchHistory(); updateChart();
  }
}

function renderLeaderboard() {
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  let html = `<table><tr><th>Player</th><th>Rating</th><th>Best Streak</th><th>Points</th></tr>`;
  sorted.forEach(p => html += `<tr><td>${p.name}</td><td>${p.rating}</td><td>${p.bestStreak}</td><td>${p.points}</td></tr>`);
  html += `</table>`;
  document.getElementById('leaderboard').innerHTML = html;
}

function renderMatchHistory() {
  const filterPlayer = document.getElementById('filterPlayer').value.toLowerCase();
  const filterDate = document.getElementById('filterDate').value;
  let filtered = matchHistory;
  if (filterPlayer) filtered = filtered.filter(m => m.playerA.toLowerCase().includes(filterPlayer) || m.playerB.toLowerCase().includes(filterPlayer));
  if (filterDate) filtered = filtered.filter(m => m.date === filterDate);

  let html = `<table><tr><th>Date</th><th>Player A</th><th>Old Rating</th><th>New Rating</th><th>Player B</th><th>Old Rating</th><th>New Rating</th><th>Winner</th></tr>`;
  filtered.forEach(m => html += `<tr><td>${m.date}</td><td>${m.playerA}</td><td>${m.oldRatingA}</td><td>${m.newRatingA}</td><td>${m.playerB}</td><td>${m.oldRatingB}</td><td>${m.newRatingB}</td><td>${m.winner}</td></tr>`);
  html += `</table>`;
  document.getElementById('matchHistory').innerHTML = html;
}

function exportCSV() {
  let csv = 'Date,Player A,Old Rating A,New Rating A,Player B,Old Rating B,New Rating B,Winner\n';
  matchHistory.forEach(m => {
    csv += `${m.date},${m.playerA},${m.oldRatingA},${m.newRatingA},${m.playerB},${m.oldRatingB},${m.newRatingB},${m.winner}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'match_history.csv';
  link.click();
}

function resetFilters() { document.getElementById('filterPlayer').value = ''; document.getElementById('filterDate').value = ''; renderMatchHistory(); }

let chart;
function updateChart() {
  const ctx = document.getElementById('ratingChart').getContext('2d');
  const labels = matchHistory.map(m => m.date);
  const data = players.map(player => {
    const ratings = matchHistory.filter(m => m.playerA === player.name || m.playerB === player.name).map(m => m.playerA === player.name ? m.newRatingA : m.newRatingB);
    return { label: player.name, data: ratings, fill: false, borderColor: '#' + Math.floor(Math.random() * 16777215).toString(16) };
  });

  if (chart) chart.destroy();
  chart = new Chart(ctx, { type: 'line', data: { labels, datasets: data } });
}

renderPlayers(); renderLeaderboard(); renderMatchHistory(); updateChart();