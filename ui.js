function fireConfetti() {
    const cont = document.getElementById("main-content");
    const colors = ['#f59e0b', '#38bdf8', '#34d399', '#ec4899', '#f8fafc']; // Cores vibrantes de festa

    // Aumentei para 80 confetes para preencher bem a tela de forma distribuída
    for (let i = 0; i < 80; i++) {
        const c = document.createElement("div");

        // Posicionamento inicial espalhado no topo, fora da visão do jogador
        c.style.position = "absolute";
        c.style.left = (Math.random() * 100) + "%"; // Brota de qualquer ponto horizontal
        c.style.top = "-20px"; // Começa um pouco acima do topo da tela
        c.style.width = (Math.random() * 6 + 6) + "px";
        c.style.height = (Math.random() * 10 + 6) + "px";
        c.style.backgroundColor = rnd(colors);
        c.style.pointerEvents = "none";
        c.style.zIndex = "9999";
        if (Math.random() > 0.5) c.style.borderRadius = "50%";

        // Configurações da queda lenta e celebração
        const driftX = (Math.random() * 160 - 80); // Leve balanço para os lados enquanto flutua
        const fallDuration = 2000 + Math.random() * 1500; // Bem mais lento (de 4 a 6.5 segundos de queda)
        const startDelay = Math.random() * 500; // Efeito "chuva": eles não caem todos ao mesmo tempo

        c.animate([
            { transform: 'translateY(0) translateX(0) rotate(0deg)', opacity: 1 },
            { transform: `translateY(45vh) translateX(${driftX}px) rotate(${Math.random() * 1440}deg)`, opacity: 0 }
        ], {
            duration: fallDuration,
            easing: 'ease-out', // Suaviza a velocidade conforme eles caem
            delay: startDelay,
            fill: 'forwards'
        });

        cont.appendChild(c);

        // Garante a remoção do elemento da memória após o término da animação individual
        setTimeout(() => c.remove(), fallDuration + startDelay + 100);
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
    if (!document.getElementById('dynamic-sidebar-css')) {
        const style = document.createElement('style');
        style.id = 'dynamic-sidebar-css';
        style.innerHTML = `
            .player-card.highlight-synergy {
                box-shadow: 0 0 15px rgba(168, 85, 247, 0.6), inset 0 0 10px rgba(168, 85, 247, 0.2) !important;
                border-color: #a855f7 !important;
                transform: scale(1.02);
            }
        `;
        document.head.appendChild(style);
    }

    let modalHTML = "";
    let sidebarHTML = "";

    gameState.team.forEach(p => {
        modalHTML += getPlayerCardHTML(p);
        sidebarHTML += getSidebarPlayerHTML(p);
    });

    const sbBody = document.querySelector('.sidebar-body');
    if (sbBody) {
        sbBody.style.display = 'flex';
        sbBody.style.flexDirection = 'column';
        // Reduz o espaço interno no topo e embaixo para as cartas caberem
        sbBody.style.padding = '8px 16px';
    }

    const sbClubInfo = document.getElementById("sidebar-club-info");
    if (sbClubInfo && gameState.club) sbClubInfo.innerHTML = `<span style="font-size:1.2rem;">${gameState.club.emoji}</span> ${gameState.club.name}`;

    const mobTitle = document.getElementById("mobile-roster-title");
    if (mobTitle && gameState.club) mobTitle.innerHTML = `<span style="font-size:1.2rem;">${gameState.club.emoji}</span> ${gameState.club.name}`;

    const sbList = document.getElementById("sidebar-list");
    const sbCoins = document.getElementById("sidebar-coins");

    if (sbList) {
        sbList.className = "";
        sbList.style.display = "flex";
        sbList.style.flexDirection = "column";
        sbList.style.gap = "2px"; // Encolhe a fenda entre os cards
        sbList.style.flex = "1";
        sbList.innerHTML = sidebarHTML;
    }
    if (sbCoins) sbCoins.innerText = gameState.coins;

    const modList = document.getElementById("modal-roster-list");
    if (modList) modList.innerHTML = modalHTML;

    const mCoins = document.getElementById("market-coins");
    if (mCoins) mCoins.innerText = gameState.coins;
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
        list.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:0.9rem; padding: 20px;">Nenhuma partida registrada ainda.</p>`;
    } else {
        gameState.runHistory.forEach((run, idx) => {
            let cls = run.result === "CAMPEÃO" ? "victory" : "loss";
            list.innerHTML += `
                <div class="history-item ${cls}" onclick="viewHistoryDetails(${idx})">
                    <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1;">
                        <span style="font-size:1.8rem; flex-shrink:0;">${run.club.emoji}</span>
                        <div style="min-width:0; flex:1;">
                            <div style="font-weight:900; color:#fff; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${run.club.name}</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${run.date}</div>
                        </div>
                    </div>
                    <div style="font-weight:900; font-size:0.8rem; text-align:right; flex-shrink:0; margin-left:8px;">
                        <span style="color: ${run.result === 'CAMPEÃO' ? 'var(--accent-gold)' : 'var(--accent-red)'}">${run.result}</span><br>
                        <span style="color:var(--text-muted);">Estágio ${run.stageReached}/10</span>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById("run-history-overlay").style.display = "flex";
}

function showLevelDistribution(points, onComplete, givesTrait = false) {
    const modal = document.getElementById('level-modal-overlay');
    const grid = document.getElementById('level-team-grid');
    const pointsText = document.getElementById('level-points-text');
    const btnReset = document.getElementById('btn-level-reset');
    const btnConfirm = document.getElementById('btn-level-confirm');

    let available = points;
    let originalPoints = points;
    let allocations = {};

    // Inicia todo mundo com 0 níveis extras
    gameState.team.forEach(p => allocations[p.id] = 0);

    function render() {
        pointsText.innerText = available;
        grid.innerHTML = "";

        gameState.team.forEach(p => {
            let currentBonus = allocations[p.id];

            let levelDisplay = p.level;
            if (currentBonus > 0) {
                levelDisplay = `${p.level} <span style="color: var(--accent-green); font-weight: 900; margin-left: 2px;">+${currentBonus}</span>`;
            }

            let tempPlayer = { ...p, level: levelDisplay };
            let tempDiv = document.createElement('div');
            tempDiv.innerHTML = getPlayerCardHTML(tempPlayer);
            let cardDiv = tempDiv.firstElementChild;

            if (currentBonus > 0) {
                cardDiv.style.borderColor = "var(--accent-green)";
                cardDiv.style.boxShadow = "0 0 15px rgba(52, 211, 153, 0.2)";
            }

            // Removida a trava de nível máximo (isMaxLevel). O nível agora é infinito!
            if (available > 0) {
                cardDiv.classList.add('can-level-up');
                cardDiv.onclick = () => {
                    allocations[p.id]++;
                    available--;
                    render();
                };
            }

            grid.appendChild(cardDiv);
        });

        btnConfirm.disabled = (available > 0);
    }

    btnReset.onclick = () => {
        available = originalPoints;
        gameState.team.forEach(p => allocations[p.id] = 0);
        render();
    };

    // Botão Confirmar salva no jogo
    btnConfirm.onclick = () => {
        let gainedTrait = false;

        gameState.team.forEach(p => {
            let levelsGained = allocations[p.id];

            if (levelsGained > 0) {
                p.level += levelsGained; // Sobe o nível

                // Lógica de Trait: Roda 1 vez para cada nível ganho
                for (let i = 0; i < levelsGained; i++) {
                    if (!p.perks) p.perks = [];

                    // Só ganha se tiver menos de 2 Traits
                    if (p.perks.length < 2) {
                        let availablePerks = PERK_LIST.filter(perk => !p.perks.some(existing => existing.id === perk.id));

                        if (availablePerks.length > 0) {
                            p.perks.push(rnd(availablePerks)); // Sorteia o novo Trait
                            gainedTrait = true;
                        }
                    }
                }
            }
        });

        saveGame();
        modal.style.display = 'none';

        // Feedback visual se qualquer jogador aprendeu uma habilidade nova
        if (gainedTrait) {
            createJuiceText("NOVO TRAIT! ✨", "var(--accent-purple)", window.innerWidth / 2, window.innerHeight / 2 - 50);
        }

        if (onComplete) onComplete();
    };

    modal.style.display = 'flex';
    render();
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