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
    teamEl.innerText = isUser ? t("BADGE_USER_ATTACKING") : t("BADGE_RIVAL_ATTACKING");
    teamEl.className = `suspense-team ${isUser ? "user" : "rival"}`;

    const d = GAME_CONTENT.suspenseTexts;
    const prep = isUser ? d.userShootPrep1 : d.rivalShootPrep1;
    const result = isUser
        ? (isSuccess ? d.userGoal : d.userMiss)
        : (isSuccess ? d.rivalMiss : d.rivalGoal);

    textEl.innerText = t(rnd(prep));
    textEl.className = "suspense-text";
    textEl.style.color = "#fff";
    await sleep(800);

    textEl.innerText = t(rnd(result));
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

    // --- CORREÇÃO AQUI ---
    gameState.season.map = []; // Destrói o mapa para encerrar a run de verdade
    saveGame();
    // ---------------------

    returnToTitle();
}

function returnToTitle() {
    closeModals();
    document.body.classList.remove('in-run');

    // Se por algum motivo o player voltar ao título sem clube, trava na tela de seleção
    if (!gameState.club) {
        if (typeof renderClubSelection === 'function') {
            renderClubSelection();
        }
    } else {
        // Usa a nova função do sistema persistente (club_manager.js)
        if (typeof returnToHub === 'function') {
            returnToHub();
        } else {
            showScreen('screen-title');
            updateMissionsBadge();
        }
    }
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
    if (sbClubInfo && gameState.club) sbClubInfo.innerHTML = `<span style="font-size:1.2rem;">${gameState.club.emoji}</span> ${tClub(gameState.club.name)}`;

    const mobTitle = document.getElementById("mobile-roster-title");
    if (mobTitle && gameState.club) mobTitle.innerHTML = `<span style="font-size:1.2rem;">${gameState.club.emoji}</span> ${tClub(gameState.club.name)}`;

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
    document.getElementById('htp-title').innerText = t(data.title);

    let html = `<p style="font-size:0.95rem; color:var(--text-muted); margin-bottom:20px; line-height:1.5;">${t(data.intro).replace(/\n/g, '<br>')}</p>`;
    html += `<h3 style="color:var(--accent-blue); margin-bottom:8px; font-size:1rem; text-transform:uppercase;">${t(data.traitsTitle)}</h3>`;
    html += `<p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">${t(data.traitsIntro)}</p>`;
    html += `<div class="trait-help-list">`;

    const colors = ['trait-gold', 'trait-blue', 'trait-purple', 'trait-green', 'trait-muted', 'trait-blue', 'trait-green'];

    // Variável alterada de 't' para 'trait' para podermos usar a função t() livremente
    data.traits.forEach((trait, i) => {
        html += `<div class="trait-help-item ${colors[i % colors.length]}"><strong>${t(trait.name)}</strong><br><span style="font-weight:600; color:var(--text-muted);">${t(trait.desc)}</span></div>`;
    });
    html += `</div>`;

    document.getElementById('htp-body').innerHTML = html;
}

function openRosterModal() {
    updateRosterUI();
    document.getElementById('roster-overlay').style.display = 'flex';
}

// --- HISTÓRICO ---
// ==========================================
// SISTEMA DE HISTÓRICO EM DUAS ETAPAS
// ==========================================

// Função auxiliar para coletar e formatar as ligas jogadas
function getSeasonsHistory() {
    let allSeasons = [];

    // 1. Temporadas Passadas (Histórico de Runs encerradas)
    if (gameState.runHistory && Array.isArray(gameState.runHistory)) {
        gameState.runHistory.forEach((run, idx) => {
            if (run && run.matchHistory && Array.isArray(run.matchHistory) && run.matchHistory.length > 0) {
                allSeasons.push({
                    isCurrent: false,
                    title: `Temporada ${idx + 1}`,
                    leagueLevel: run.leagueLevel !== undefined ? run.leagueLevel : 0,
                    matches: run.matchHistory,
                    result: run.result || "ELIMINADO",
                    club: run.club || gameState.club,
                    date: run.date || ""
                });
            }
        });
    }

    // 2. Temporada Atual (Em andamento)
    if (gameState.season && gameState.season.matchHistory && Array.isArray(gameState.season.matchHistory) && gameState.season.matchHistory.length > 0) {
        allSeasons.push({
            isCurrent: true,
            title: `Temporada Atual`,
            leagueLevel: gameState.leagueLevel !== undefined ? gameState.leagueLevel : 0,
            matches: gameState.season.matchHistory,
            result: "EM ANDAMENTO",
            club: gameState.club,
            date: ""
        });
    }

    // Inverte para colocar as mais recentes no topo
    return allSeasons.reverse();
}

// ETAPA 1: LISTAR AS LIGAS JOGADAS
window.openHistoryModal = function () {
    const list = document.getElementById("history-list");
    const detailsPanel = document.getElementById("history-details");
    const footer = document.getElementById("history-footer");

    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.padding = "16px";
    list.style.gap = "8px";
    detailsPanel.style.display = "none";
    footer.style.display = "none";
    list.innerHTML = "";

    let seasons = getSeasonsHistory();
    window.cachedSeasonsHistory = seasons; // Guarda os dados para a Etapa 2

    if (seasons.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:0.9rem; padding: 20px;">${t("TEXT_NO_RUNS_YET") || "Nenhum histórico registrado."}</p>`;
    } else {
        seasons.forEach((season, idx) => {
            let leagueConfig = GAME_BALANCE.leagues[season.leagueLevel] || GAME_BALANCE.leagues[0];
            let isWin = season.result === "CAMPEÃO";
            let isCurrent = season.isCurrent;

            let cls = isCurrent ? "" : (isWin ? "victory" : "loss");
            let resultLabel = isCurrent ? "EM ANDAMENTO" : (isWin ? "CAMPEÃO" : "ELIMINADO");
            let colorClass = isCurrent ? "var(--accent-blue)" : (isWin ? "var(--accent-gold)" : "var(--accent-red)");

            let wins = season.matches.filter(m => m.userScore > m.rivalScore).length;
            let losses = season.matches.filter(m => m.userScore < m.rivalScore).length;
            let draws = season.matches.filter(m => m.userScore === m.rivalScore).length;

            let clubName = typeof tClub === 'function' ? tClub(season.club.name) : season.club.name;

            // Usa a classe "history-item" nativa do seu CSS
            list.innerHTML += `
                <div class="history-item ${cls}" style="border-left: 4px solid ${colorClass};" onclick="viewHistoryDetails(${idx})">
                    <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1;">
                        <span style="font-size:2rem; flex-shrink:0;">${leagueConfig.emoji}</span>
                        <div style="min-width:0; flex:1;">
                            <div style="font-weight:900; color:#fff; font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-transform:uppercase;">
                                ${t(leagueConfig.name)}
                            </div>
                            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">
                                ${season.title} • <span style="color:var(--accent-green)">${wins}V</span> <span style="color:#cbd5e1">${draws}E</span> <span style="color:var(--accent-red)">${losses}D</span>
                            </div>
                        </div>
                    </div>
                    <div style="font-weight:900; font-size:0.8rem; text-align:right; flex-shrink:0; margin-left:8px;">
                        <span style="color: ${colorClass}; text-transform:uppercase;">${resultLabel}</span><br>
                        <span style="color:var(--text-muted); font-size:0.65rem; display:flex; justify-content:flex-end; align-items:center; gap:4px; margin-top:2px;">
                            ${season.club.emoji} <span style="max-width:80px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${clubName.toUpperCase()}</span>
                        </span>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById("run-history-overlay").style.display = "flex";
};

// ETAPA 2: LISTAR PARTIDAS DA LIGA ESCOLHIDA
// ETAPA 2: LISTAR PARTIDAS DA LIGA ESCOLHIDA
window.viewHistoryDetails = function (idx) {
    let season = window.cachedSeasonsHistory[idx];
    if (!season) return;

    document.getElementById("history-list").style.display = "none";
    let content = document.getElementById("history-details-content");
    content.innerHTML = "";

    let leagueConfig = GAME_BALANCE.leagues[season.leagueLevel] || GAME_BALANCE.leagues[0];
    let clubName = typeof tClub === 'function' && season.club ? tClub(season.club.name) : (season.club ? season.club.name : 'Meu Clube');
    let myEmoji = season.club ? season.club.emoji : '🛡️';

    // Cabeçalho da Liga detalhada
    let html = `
        <div style="text-align:center; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.05);">
            <div style="font-size:3rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5)); line-height:1;">${leagueConfig.emoji}</div>
            <h3 style="color:#fff; font-size:1.4rem; text-transform:uppercase; margin-top:8px; margin-bottom:4px; letter-spacing:1px;">${t(leagueConfig.name)}</h3>
            <div style="font-size:0.85rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">${season.title}</div>
        </div>
    `;

    let matches = season.matches.slice().reverse();

    if (matches.length > 0) {
        matches.forEach(m => {
            let isWin = m.userScore > m.rivalScore;
            let isDraw = m.userScore === m.rivalScore;

            let resultColor = isWin ? 'var(--accent-green)' : (isDraw ? 'var(--text-muted)' : 'var(--accent-red)');
            let resultLetter = isWin ? 'V' : (isDraw ? 'E' : 'D');
            let resultLabel = isWin ? 'VITÓRIA' : (isDraw ? 'EMPATE' : 'DERROTA');

            let posUser = m.stats && m.stats.possession !== undefined ? m.stats.possession : 50;
            let posRival = 100 - posUser;
            let accUser = m.stats && m.stats.accuracy !== undefined ? m.stats.accuracy : 0;
            let maxCombo = m.stats && m.stats.maxCombo !== undefined ? m.stats.maxCombo : 0;
            let saves = m.stats && m.stats.saves !== undefined ? m.stats.saves : 0;
            let tackles = m.stats && m.stats.tackles !== undefined ? m.stats.tackles : 0;

            let finalScorersHtml = '';
            let scorersHtml = '';
            let rivalScorersHtml = '';

            // Pílulas: Artilheiros do Usuário (Esquerda)
            if (m.stats && m.stats.scorers) {
                let scorers = Object.values(m.stats.scorers);
                if (scorers.length > 0) {
                    scorers.forEach(s => {
                        let balls = '⚽'.repeat(s.count);
                        scorersHtml += `
                            <div style="display:inline-flex; align-items:center; gap:4px; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.2); border-radius:6px; padding:4px 10px;">
                                <span style="font-size:1rem;">${s.emoji}</span>
                                <span style="font-size:0.65rem; font-weight:800; color:var(--text-main);">${s.name.toUpperCase()}</span>
                                <span style="font-size:0.7rem; margin-left:4px;">${balls}</span>
                            </div>
                        `;
                    });
                }
            }

            // Pílulas: Artilheiros do Rival (Direita)
            if (m.stats && m.stats.rivalScorers) {
                let rivalScorers = Object.values(m.stats.rivalScorers);
                if (rivalScorers.length > 0) {
                    rivalScorers.forEach(s => {
                        let balls = '⚽'.repeat(s.count);
                        rivalScorersHtml += `
                            <div style="display:inline-flex; align-items:center; gap:4px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); border-radius:6px; padding:4px 10px;">
                                <span style="font-size:0.7rem; margin-right:4px;">${balls}</span>
                                <span style="font-size:0.65rem; font-weight:800; color:var(--text-main);">${s.name.toUpperCase()}</span>
                                <span style="font-size:1rem;">${s.emoji}</span>
                            </div>
                        `;
                    });
                }
            }

            // Une as duas metades em uma barra dupla se houver gol na partida
            if (scorersHtml !== '' || rivalScorersHtml !== '') {
                finalScorersHtml = `
                    <div style="margin-top:10px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.05); display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                        <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-start; flex:1;">${scorersHtml}</div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; flex:1;">${rivalScorersHtml}</div>
                    </div>
                `;
            }

            let rivalName = typeof tClub === 'function' ? tClub(m.rivalName) : m.rivalName;

            html += `
                <div style="background:var(--bg-card); border-left:4px solid ${resultColor}; border-radius:8px; padding:14px; margin-bottom:12px; box-shadow:0 4px 6px rgba(0,0,0,0.3); position:relative; overflow:hidden;">
                    
                    <div style="position:absolute; right:-15px; top:-5px; font-size:6rem; font-weight:900; color:${resultColor}; opacity:0.04; line-height:1; pointer-events:none;">${resultLetter}</div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; position:relative; z-index:2;">
                        <div style="display:flex; flex-direction:column; align-items:center; width:33%; gap:4px;">
                            <span style="font-size:2rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${myEmoji}</span>
                            <span style="font-size:0.7rem; font-weight:900; color:var(--accent-blue); text-align:center; line-height:1.2; word-wrap:break-word; width:100%;">${clubName.toUpperCase()}</span>
                        </div>
                        
                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
                            <div style="background:rgba(0,0,0,0.5); border:1px solid var(--border-accent); padding:6px 18px; border-radius:8px; font-size:1.6rem; font-weight:900; color:#fff; letter-spacing:2px; box-shadow:inset 0 0 10px rgba(0,0,0,0.5);">
                                ${m.userScore} - ${m.rivalScore}
                            </div>
                            <div style="font-size:0.55rem; font-weight:900; color:${resultColor}; margin-top:6px; text-transform:uppercase;">${resultLabel}</div>
                        </div>
                        
                        <div style="display:flex; flex-direction:column; align-items:center; width:33%; gap:4px;">
                            <span style="font-size:2rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${m.rivalEmoji}</span>
                            <span style="font-size:0.7rem; font-weight:900; color:var(--accent-red); text-align:center; line-height:1.2; word-wrap:break-word; width:100%;">${rivalName.toUpperCase()}</span>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:rgba(0,0,0,0.2); padding:12px; border-radius:8px; position:relative; z-index:2; border: 1px solid rgba(255,255,255,0.02);">
                        
                        <div style="display:flex; flex-direction:column; gap:10px; justify-content:center; border-right:1px solid rgba(255,255,255,0.05); padding-right:12px;">
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:0.55rem; font-weight:900; margin-bottom:4px; text-transform:uppercase;">
                                    <span style="color:var(--accent-blue);">POSSE ${posUser}%</span>
                                    <span style="color:var(--accent-red);">${posRival}% RIVAL</span>
                                </div>
                                <div style="width:100%; height:5px; background:var(--accent-red); border-radius:3px; overflow:hidden; display:flex;">
                                    <div style="width:${posUser}%; height:100%; background:var(--accent-blue);"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:0.55rem; font-weight:900; margin-bottom:4px; text-transform:uppercase;">
                                    <span style="color:var(--text-muted);">ACERTO DE AÇÕES</span>
                                    <span style="color:var(--accent-green);">${accUser}%</span>
                                </div>
                                <div style="width:100%; height:5px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
                                    <div style="width:${accUser}%; height:100%; background:var(--accent-green);"></div>
                                </div>
                            </div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:4px; justify-content:center; padding-left:4px;">
                            <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.02); padding:4px 8px; border-radius:4px;">
                                <span style="font-size:0.6rem; font-weight:800; color:var(--text-muted);">🔥 MÁX COMBO</span>
                                <span style="font-size:0.75rem; font-weight:900; color:var(--accent-gold);">x${maxCombo}</span>
                            </div>
                            <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.02); padding:4px 8px; border-radius:4px;">
                                <span style="font-size:0.6rem; font-weight:800; color:var(--text-muted);">🛡️ DESARMES</span>
                                <span style="font-size:0.75rem; font-weight:900; color:var(--accent-blue);">${tackles}</span>
                            </div>
                            <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.02); padding:4px 8px; border-radius:4px;">
                                <span style="font-size:0.6rem; font-weight:800; color:var(--text-muted);">🧤 DEFESAS</span>
                                <span style="font-size:0.75rem; font-weight:900; color:var(--accent-green);">${saves}</span>
                            </div>
                        </div>
                    </div>
                    ${finalScorersHtml}
                </div>
            `;
        });
    } else {
        html += `<p style="text-align:center; font-size:0.8rem; color:var(--text-muted);">${t('HISTORY_NO_RECORDS_YET') || "Nenhuma partida registrada."}</p>`;
    }

    content.innerHTML = html;
    document.getElementById("history-details").style.display = "flex";
    document.getElementById("history-footer").style.display = "flex";
};

function showLevelDistribution(points, onComplete, givesTrait = false) {
    const modal = document.getElementById('level-modal-overlay');
    const grid = document.getElementById('level-team-grid');
    const pointsText = document.getElementById('level-points-text');
    const btnConfirm = document.getElementById('btn-level-confirm');

    let available = points;
    let originalPoints = points;
    let allocations = {};

    // 1. TEXTO EXPLICATIVO: Dica sobre ganhar Habilidades (Traits)
    let infoBox = document.getElementById('level-info-box');
    if (!infoBox) {
        infoBox = document.createElement('div');
        infoBox.id = 'level-info-box';
        infoBox.style.fontSize = '0.75rem';
        infoBox.style.color = 'var(--text-muted)';
        infoBox.style.textAlign = 'center';
        infoBox.style.marginBottom = '16px';
        infoBox.style.padding = '8px';
        infoBox.style.background = 'rgba(0,0,0,0.3)';
        infoBox.style.borderRadius = '8px';
        infoBox.style.borderLeft = '3px solid var(--accent-purple)';
        infoBox.innerHTML = `${t('TEXT_TRAIN_TIP')}`;
        grid.parentNode.insertBefore(infoBox, grid);
    }

    // Inicia todo mundo com 0 níveis extras
    gameState.team.forEach(p => allocations[p.id] = 0);

    function render() {
        pointsText.innerText = available;
        grid.innerHTML = "";

        gameState.team.forEach(p => {
            let currentBonus = allocations[p.id];

            // Gera o card original intacto
            let tempDiv = document.createElement('div');
            tempDiv.innerHTML = getPlayerCardHTML(p);
            let cardDiv = tempDiv.firstElementChild;

            // Feedback visual de card selecionado
            if (currentBonus > 0) {
                cardDiv.style.borderColor = "var(--accent-green)";
                cardDiv.style.boxShadow = "inset 0 0 15px rgba(52, 211, 153, 0.15)";
            }

            if (available > 0) {
                cardDiv.classList.add('can-level-up');
                cardDiv.onclick = () => {
                    allocations[p.id]++;
                    available--;
                    render();
                };
            }

            // O TRUQUE DE MESTRE: Modifica apenas a área do Nível (lado direito do card)
            // Sem alterar a grid, sem botões flutuantes!
            let levelSection = cardDiv.lastElementChild;

            if (currentBonus > 0) {
                levelSection.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div class="remove-pt-btn" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.4); border-radius: 6px; cursor: pointer; z-index: 10;">
                            <div style="width: 10px; height: 3px; background: var(--accent-red); border-radius: 2px;"></div>
                        </div>
                        <span style="display: flex; justify-content: center; align-items: center; padding: 4px 8px; font-size: 0.8rem; font-weight: 900; color: #fff; background: rgba(52, 211, 153, 0.15); border: 1px solid var(--accent-green); border-radius: 6px; box-shadow: 0 0 10px rgba(52, 211, 153, 0.2);">
                            Nv <span style="color: #fff; margin-left: 4px;">${p.level}</span>
                            <span style="color: var(--accent-green); margin-left: 4px;">+${currentBonus}</span>
                        </span>
                    </div>
                `;

                let minusBtn = levelSection.querySelector('.remove-pt-btn');
                minusBtn.onclick = (e) => {
                    e.stopPropagation(); // Evita que o clique no "-" dê um nível sem querer
                    allocations[p.id]--;
                    available++;
                    render();
                };
            }

            grid.appendChild(cardDiv);
        });

        btnConfirm.disabled = false;

        if (available === 0) {
            btnConfirm.style.background = "var(--accent-green)";
            btnConfirm.style.color = "#000";
            btnConfirm.style.boxShadow = "0 0 15px rgba(52, 211, 153, 0.4)";
            btnConfirm.innerText = t("BTN_CONFIRM");
        } else {
            btnConfirm.style.background = "";
            btnConfirm.style.color = "";
            btnConfirm.style.boxShadow = "";
            btnConfirm.innerText = t("BTN_CONFIRM");
        }
    }

    btnConfirm.onclick = (e) => {
        // AVISO VISUAL: O jogador esqueceu de usar os pontos
        if (available > 0) {
            btnConfirm.classList.add("shake");
            pointsText.parentElement.classList.add("shake");

            setTimeout(() => {
                btnConfirm.classList.remove("shake");
                pointsText.parentElement.classList.remove("shake");
            }, 300);

            const tx = e.clientX || window.innerWidth / 2;
            const ty = (e.clientY || window.innerHeight / 2) - 40;
            createJuiceText(t("TEXT_USE_ALL_POINTS"), "var(--accent-red)", tx, ty);
            return;
        }

        let gainedTrait = false;

        gameState.team.forEach(p => {
            let levelsGained = allocations[p.id];

            if (levelsGained > 0) {
                p.level += levelsGained;

                for (let i = 0; i < levelsGained; i++) {
                    if (!p.perks) p.perks = [];

                    if (p.perks.length < 2) {
                        let availablePerks = PERK_LIST.filter(perk => !p.perks.some(existing => existing.id === perk.id));

                        if (availablePerks.length > 0) {
                            p.perks.push(rndWeighted(availablePerks));
                            gainedTrait = true;
                        }
                    }
                }
            }
        });

        saveGame();
        modal.style.display = 'none';

        btnConfirm.style.background = "";
        btnConfirm.style.color = "";
        btnConfirm.style.boxShadow = "";

        if (gainedTrait) {
            createJuiceText(t("TEXT_NEW_TRAIT"), "var(--accent-purple)", window.innerWidth / 2, window.innerHeight / 2 - 50);
        }

        if (onComplete) onComplete();
    };

    modal.style.display = 'flex';
    render();
}



window.closeHistoryDetails = function () {
    document.getElementById("history-list").style.display = "flex";
    document.getElementById("history-details").style.display = "none";
    document.getElementById("history-footer").style.display = "none";
};

function setMobileTab(tab) {
    const btnMap = document.getElementById('nav-btn-map');
    const btnTeam = document.getElementById('nav-btn-team');

    if (tab === 'team') {
        document.body.classList.remove('viewing-map');
        document.body.classList.add('viewing-team');

        btnMap.classList.remove('active');
        btnTeam.classList.add('active');
    } else {
        document.body.classList.remove('viewing-team');
        document.body.classList.add('viewing-map');

        btnTeam.classList.remove('active');
        btnMap.classList.add('active');
    }
}

// Inicializa o estado padrão ao carregar o jogo
document.body.classList.add('viewing-map');