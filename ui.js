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
    updateMissionsBadge();
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
function openHistoryModal() {
    const list = document.getElementById("history-list");
    const detailsPanel = document.getElementById("history-details");
    const footer = document.getElementById("history-footer");

    list.style.display = "flex";
    detailsPanel.style.display = "none";
    footer.style.display = "none";
    list.innerHTML = "";

    if (!gameState.runHistory || gameState.runHistory.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:0.9rem; padding: 20px;">${t("TEXT_NO_RUNS_YET")}</p>`;
    } else {
        gameState.runHistory.forEach((run, idx) => {
            let cls = run.result === "CAMPEÃO" ? "victory" : "loss";
            let resultLabel = run.result === "CAMPEÃO" ? t("LABEL_CHAMPION") : t("LABEL_ELIMINATED");
            list.innerHTML += `
                <div class="history-item ${cls}" onclick="viewHistoryDetails(${idx})">
                    <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1;">
                        <span style="font-size:1.8rem; flex-shrink:0;">${run.club.emoji}</span>
                        <div style="min-width:0; flex:1;">
                            <div style="width:100%; position:relative; height:1.2rem; overflow:hidden;">
                                <div id="hist-run-name-${idx}" style="font-weight:900; color:#fff; font-size:0.9rem; white-space:nowrap; position:absolute; left:0;"></div>
                            </div>
                            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${run.date}</div>
                        </div>
                    </div>
                    <div style="font-weight:900; font-size:0.8rem; text-align:right; flex-shrink:0; margin-left:8px;">
                        <span style="color: ${run.result === 'CAMPEÃO' ? 'var(--accent-gold)' : 'var(--accent-red)'}">${resultLabel}</span><br>
                        <span style="color:var(--text-muted);">${t("LABEL_STAGE_REACHED", { stage: run.stageReached })}</span>
                    </div>
                </div>
            `;
        });

        setTimeout(() => {
            gameState.runHistory.forEach((run, idx) => {
                // Utilização do tClub para traduzir o nome composto no histórico
                setupMarquee(`hist-run-name-${idx}`, tClub(run.club.name));
            });
        }, 100);
    }
    document.getElementById("run-history-overlay").style.display = "flex";
}

function viewHistoryDetails(idx) {
    const run = gameState.runHistory[idx];
    document.getElementById("history-list").style.display = "none";

    let html = `<h3 style="color:var(--text-muted); text-align:center; margin-bottom:15px; font-size:0.8rem; text-transform:uppercase;">PARTIDAS DA RUN</h3>`;

    if (run.matches && run.matches.length > 0) {
        run.matches.forEach((m, mIdx) => {
            let isWin = m.userScore > m.rivalScore;
            let mColor = isWin ? "var(--accent-green)" : "var(--accent-red)";

            html += `
                <div class="history-match-card" style="border-left: 3px solid ${mColor};">
                    <div class="history-match-teams">
                        
                        <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px; min-width:0; width:100%;">
                            <div style="min-width:0; flex:1; position:relative; height:1.2rem; overflow:hidden;">
                                <div id="hist-user-name-${mIdx}" class="history-team-name" style="position:absolute; right:0; white-space:nowrap;"></div>
                            </div>
                            <span class="history-team-emoji" style="flex-shrink:0;">${run.club.emoji}</span>
                        </div>
                        
                        <div class="history-match-score" style="color: ${mColor};">
                            ${m.userScore} <span style="color:var(--text-muted); font-size:0.8rem;">x</span> ${m.rivalScore}
                        </div>
                        
                        <div style="display:flex; align-items:center; justify-content:flex-start; gap:8px; min-width:0; width:100%;">
                            <span class="history-team-emoji" style="flex-shrink:0;">${m.rivalEmoji}</span>
                            <div style="min-width:0; flex:1; position:relative; height:1.2rem; overflow:hidden;">
                                <div id="hist-rival-name-${mIdx}" class="history-team-name" style="position:absolute; left:0; white-space:nowrap;"></div>
                            </div>
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

    setTimeout(() => {
        if (run.matches) {
            run.matches.forEach((m, mIdx) => {
                // Utilização do tClub para traduzir o detalhe das partidas
                setupMarquee(`hist-user-name-${mIdx}`, tClub(run.club.name), true);
                setupMarquee(`hist-rival-name-${mIdx}`, tClub(m.rivalName), false);
            });
        }
    }, 100);
}

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
        infoBox.innerHTML = `💡 Evoluir um jogador com menos de 2 habilidades garante a ele uma <strong style="color:var(--accent-purple);">Nova Habilidade Aleatória!</strong>`;
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

function closeHistoryDetails() {
    document.getElementById("history-list").style.display = "flex";
    document.getElementById("history-details").style.display = "none";
    document.getElementById("history-footer").style.display = "none";
}

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