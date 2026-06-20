function fireConfetti() {
    const cont = document.getElementById("main-content");
    const colors = ['#f59e0b', '#38bdf8', '#34d399', '#ec4899', '#f8fafc'];
    for (let i = 0; i < 40; i++) {
        const c = document.createElement("div");
        c.className = "confetti";
        c.style.left = Math.random() * 100 + "%";
        c.style.animationDelay = Math.random() * 0.5 + "s";
        c.style.backgroundColor = rnd(colors);
        if (Math.random() > 0.5) c.style.borderRadius = "50%";
        cont.appendChild(c);
        setTimeout(() => c.remove(), 2500);
    }
}

function getRandomLog(type, actionName = "") {
    if (!GAME_CONTENT.logTexts?.[type]) return "";
    return rnd(GAME_CONTENT.logTexts[type]).replace("{action}", actionName);
}

function addMatchLog(text, type = 'neutral') {
    if (!text) return;
    const feed = document.getElementById('match-log-feed');
    const e = document.createElement('div');
    e.className = `log-entry ${type}`; e.innerText = text;
    feed.prepend(e);
}

function createJuiceText(text, color, x, y) {
    const f = document.createElement("div");
    f.className = "floating-text"; f.innerText = text; f.style.color = color;
    f.style.left = `${clamp(x, 0, window.innerWidth - 120)}px`;
    f.style.top = `${y}px`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 600);
}

async function playSuspenseSequence(isUser, isSuccess) {
    if (!gameState.settings.showSuspense) return;
    const ov = document.getElementById("suspense-overlay");
    const textEl = document.getElementById("suspense-text");
    const teamEl = document.getElementById("suspense-team");

    ov.style.display = "flex";
    teamEl.innerText = isUser ? "🔵 SEU TIME ATACANDO" : "🔴 RIVAL ATACANDO";
    teamEl.className = `suspense-team ${isUser ? "user" : "rival"}`;

    const d = GAME_CONTENT.suspenseTexts;
    const prep = isUser ? d.userShootPrep1 : d.rivalShootPrep1;
    const result = isUser
        ? (isSuccess ? d.userGoal : d.userMiss)
        : (isSuccess ? d.rivalMiss : d.rivalGoal);

    textEl.innerText = rnd(prep);
    textEl.className = "suspense-text";
    textEl.style.color = "#fff";
    await sleep(800);

    textEl.innerText = rnd(result);
    textEl.className = "suspense-text pop";
    textEl.style.color = (isUser && isSuccess) || (!isUser && isSuccess) ? "#34d399" : "#f87171";
    await sleep(1200);
    ov.style.display = "none";
}

// --- FUNÇÕES GERAIS ---
function openOptions() {
    document.getElementById('toggle-suspense').checked = gameState.settings.showSuspense;
    document.getElementById('toggle-confirm').checked = gameState.settings.requireConfirm;
    document.getElementById('options-overlay').style.display = 'flex';
}
function toggleConfirm() { gameState.settings.requireConfirm = document.getElementById('toggle-confirm').checked; }
function closeOptions() { document.getElementById('options-overlay').style.display = 'none'; saveGame(); }
function toggleSuspense() { gameState.settings.showSuspense = document.getElementById('toggle-suspense').checked; }
function openTraitsHelp() { document.getElementById('traits-help-overlay').style.display = 'flex'; }
function closeModals() { document.querySelectorAll(".modal-overlay").forEach(m => m.style.display = 'none'); }

function openQuitConfirm() {
    document.getElementById('quit-confirm-overlay').style.display = 'flex';
}

function confirmQuitRun() {
    // Grava como derrota na memória se quiser rastrear, ou apenas reseta
    recordRun(false);
    returnToTitle();
}

function returnToTitle() {
    closeModals();
    document.body.classList.remove('in-run');
    gameState.team = [];
    gameState.club = null;
    showScreen('screen-title');
}

function updateRosterUI() {
    const traits = getTeamTraits();
    const statsHTML = `
        <span title="Chutes" style="color:var(--accent-gold)">🎯 ${traits.finishing}</span>
        <span title="Passes" style="color:var(--accent-blue)">👟 ${traits.passing}</span>
        <span title="Risco Alto" style="color:var(--accent-purple)">⚡ ${traits.pace}</span>
        <span title="Desarmes" style="color:var(--accent-green)">🪓 ${traits.tackling}</span>
        <span title="Debuff Inimigo" style="color:var(--text-muted)">🛡️ ${traits.marking}</span>
        <span title="Goleiro" style="color:var(--accent-blue)">🧤 ${traits.reflexes}</span>
        <span title="Evolução" style="color:var(--accent-green)">🌱 ${traits.growth}</span>
    `;

    let listHTML = "";
    gameState.team.forEach(p => { listHTML += getPlayerCardHTML(p); });

    // Atualiza nomes do Clube nas UI
    const sbClubInfo = document.getElementById("sidebar-club-info");
    if (sbClubInfo && gameState.club) {
        sbClubInfo.innerHTML = `<span style="font-size:1.2rem;">${gameState.club.emoji}</span> ${gameState.club.name}`;
    }

    const mobTitle = document.getElementById("mobile-roster-title");
    if (mobTitle && gameState.club) {
        mobTitle.innerHTML = `<span style="font-size:1.2rem;">${gameState.club.emoji}</span> ${gameState.club.name}`;
    }

    const sbStats = document.getElementById("sidebar-stats");
    const sbList = document.getElementById("sidebar-list");
    const sbCoins = document.getElementById("sidebar-coins");
    if (sbStats) sbStats.innerHTML = statsHTML;
    if (sbList) sbList.innerHTML = listHTML;
    if (sbCoins) sbCoins.innerText = gameState.coins;

    const modStats = document.getElementById("modal-roster-stats");
    const modList = document.getElementById("modal-roster-list");
    if (modStats) modStats.innerHTML = statsHTML;
    if (modList) modList.innerHTML = listHTML;
}

function openHowToPlay() {
    document.getElementById('how-to-play-overlay').style.display = 'flex';
}

function populateHowToPlay() {
    const data = GAME_CONTENT.howToPlay;
    if (!data) return;
    document.getElementById('htp-title').innerText = data.title;

    let html = `<p style="font-size:0.95rem; color:var(--text-muted); margin-bottom:20px; line-height:1.5;">${data.intro.replace(/\n/g, '<br>')}</p>`;
    html += `<h3 style="color:var(--accent-blue); margin-bottom:8px; font-size:1rem; text-transform:uppercase;">${data.traitsTitle}</h3>`;
    html += `<p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">${data.traitsIntro}</p>`;
    html += `<div class="trait-help-list">`;

    const colors = ['trait-gold', 'trait-blue', 'trait-purple', 'trait-green', 'trait-muted', 'trait-blue', 'trait-green'];

    data.traits.forEach((t, i) => {
        html += `<div class="trait-help-item ${colors[i % colors.length]}"><strong>${t.name}</strong><br><span style="font-weight:600; color:var(--text-muted);">${t.desc}</span></div>`;
    });
    html += `</div>`;

    document.getElementById('htp-body').innerHTML = html;
}

function openRosterModal() {
    updateRosterUI();
    document.getElementById('roster-overlay').style.display = 'flex';
}

// --- HISTÓRICO ---
function openHistoryModal() {
    const list = document.getElementById("history-list");
    const detailsPanel = document.getElementById("history-details");
    const footer = document.getElementById("history-footer");

    list.style.display = "flex";
    detailsPanel.style.display = "none";
    footer.style.display = "none";
    list.innerHTML = "";

    if (!gameState.runHistory || gameState.runHistory.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:0.9rem; padding: 20px;">Nenhuma run registrada ainda.</p>`;
    } else {
        gameState.runHistory.forEach((run, idx) => {
            let cls = run.result === "CAMPEÃO" ? "victory" : "loss";
            list.innerHTML += `
                <div class="history-item ${cls}" onclick="viewHistoryDetails(${idx})">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:1.8rem;">${run.club.emoji}</span>
                        <div>
                            <div style="font-weight:900; color:#fff; font-size:0.9rem;">${run.club.name}</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${run.date}</div>
                        </div>
                    </div>
                    <div style="font-weight:900; font-size:0.8rem; text-align:right;">
                        <span style="color: ${run.result === 'CAMPEÃO' ? 'var(--accent-gold)' : 'var(--accent-red)'}">${run.result}</span><br>
                        <span style="color:var(--text-muted);">Estágio ${run.stageReached}/10</span>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById("run-history-overlay").style.display = "flex";
}

function viewHistoryDetails(idx) {
    const run = gameState.runHistory[idx];
    document.getElementById("history-list").style.display = "none";

    let html = `<h3 style="color:var(--text-muted); text-align:center; margin-bottom:15px; font-size:0.8rem; text-transform:uppercase;">PARTIDAS DA RUN</h3>`;

    if (run.matches && run.matches.length > 0) {
        run.matches.forEach((m) => {
            let isWin = m.userScore > m.rivalScore;
            let mColor = isWin ? "var(--accent-green)" : "var(--accent-red)";
            let mIcon = m.type === 'elite' ? '🔥' : m.type === 'boss' ? '👑' : '⚽';

            html += `
                <div class="history-match-card" style="border-left: 3px solid ${mColor};">
                    <div class="history-match-teams">
                        <div class="history-team user-team">
                            <span class="history-team-emoji">${run.club.emoji}</span>
                            <span class="history-team-name">${run.club.name}</span>
                        </div>
                        <div class="history-match-score" style="color: ${mColor};">
                            ${m.userScore} <span style="color:var(--text-muted); font-size:0.8rem;">x</span> ${m.rivalScore}
                        </div>
                        <div class="history-team rival-team">
                            <span class="history-team-emoji">${m.rivalEmoji}</span>
                            <span class="history-team-name">${m.rivalName}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        html += `<p style="text-align:center; font-size:0.8rem; color:var(--text-muted);">Sem registros.</p>`;
    }

    html += `<h3 style="color:var(--text-muted); text-align:center; margin:24px 0 16px 0; font-size:0.8rem; text-transform:uppercase;">ELENCO FINAL</h3>`;
    html += `<div class="roster-grid">`;
    if (run.finalTeam) { run.finalTeam.forEach(p => { html += getPlayerCardHTML(p); }); }
    html += `</div>`;

    document.getElementById("history-details-content").innerHTML = html;
    document.getElementById("history-details").style.display = "flex";
    document.getElementById("history-footer").style.display = "flex";
}

function closeHistoryDetails() {
    document.getElementById("history-list").style.display = "flex";
    document.getElementById("history-details").style.display = "none";
    document.getElementById("history-footer").style.display = "none";
}