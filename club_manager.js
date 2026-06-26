// ==========================================
// GERENCIADOR DE CLUBES E FORMAÇÕES
// ==========================================

let allSaves = [];
let activeSaveIndex = -1;
let squadSelectedPlayer = null;

// Dicionário universal de mapeamento de Formações. 
// O índice no array define a POSIÇÃO EXIGIDA do slot correspondente ao gameState.team[index].
const FORMATIONS = {
    "4-4-2": ["GOL", "ZAG", "ZAG", "ZAG", "ZAG", "MEI", "MEI", "MEI", "MEI", "ATA", "ATA"],
    "4-3-3": ["GOL", "ZAG", "ZAG", "ZAG", "ZAG", "MEI", "MEI", "MEI", "ATA", "ATA", "ATA"],
    "3-5-2": ["GOL", "ZAG", "ZAG", "ZAG", "MEI", "MEI", "MEI", "MEI", "MEI", "ATA", "ATA"],
    "5-3-2": ["GOL", "ZAG", "ZAG", "ZAG", "ZAG", "ZAG", "MEI", "MEI", "MEI", "ATA", "ATA"],
    "3-4-3": ["GOL", "ZAG", "ZAG", "ZAG", "MEI", "MEI", "MEI", "MEI", "ATA", "ATA", "ATA"]
};

// --- SISTEMA DE SALVAMENTO BLINDADO ---
function loadAllSaves() {
    try {
        const savedData = localStorage.getItem("turboFoot_saves_v8");
        allSaves = savedData ? JSON.parse(savedData) : [];
        if (!Array.isArray(allSaves)) allSaves = [];
    }
    catch (e) { allSaves = []; }
}

function saveAllClubs() {
    try {
        if (!Array.isArray(allSaves)) allSaves = [];
        if (activeSaveIndex === -1) {
            loadAllSaves();
        }

        if (activeSaveIndex !== -1 && gameState && gameState.club) {
            allSaves[activeSaveIndex] = JSON.parse(JSON.stringify(gameState));
            localStorage.setItem("turboFoot_saves_v8", JSON.stringify(allSaves));
        } else if (allSaves.length > 0) {
            // Preserve o arquivo de saves quando não há clube ativo.
            localStorage.setItem("turboFoot_saves_v8", JSON.stringify(allSaves));
        }
    } catch (e) {
        console.error("Erro Crítico de Armazenamento:", e);
        if (typeof showCustomAlert === 'function') {
            showCustomAlert("ERRO DE MEMÓRIA", "Seu dispositivo bloqueou o salvamento. Verifique se o navegador está sem espaço ou bloqueando dados de sites.");
        }
    }
}

// --- RENDERIZAR CLUBES (COM CARDS ALINHADOS) ---
function renderClubSelection() {
    loadAllSaves();
    const container = document.getElementById('saved-clubs-container');
    container.innerHTML = '';

    if (allSaves.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); text-align:center; width:100%; font-weight:bold; grid-column: 1 / -1; margin-top: 40px;">Nenhum clube fundado ainda.</p>`;
    } else {
        allSaves.forEach((save, idx) => {
            if (!save || !save.club) return;
            container.innerHTML += `
                <div class="club-select-card" onclick="loadClub(${idx})" style="position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                    <button onclick="deleteClub(${idx}, event)" style="position:absolute; top:12px; right:12px; background:rgba(239,68,68,0.2); border:1px solid #ef4444; border-radius:8px; cursor:pointer; font-size:0.9rem; padding:6px 10px; color:#fff; z-index: 10;">🗑️</button>
                    
                    <div class="club-select-header" style="margin-top: 10px;">
                        <div class="club-select-emoji" style="font-size:3.5rem;">${save.club.emoji}</div>
                        <div class="club-select-name" style="font-size:1.15rem; margin-top:12px;">${tClub(save.club.name)}</div>
                    </div>
                    
                    <div class="captain-box" style="padding: 16px; margin-top: auto;">
                        <div style="font-weight:900; color:var(--accent-gold); font-size:1.3rem;">💰 ${save.coins}</div>
                        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:6px; font-weight: 800;">Divisão Atual: ${save.meta?.highestSeriesUnlocked || 0}</div>
                    </div>
                </div>`;
        });
    }
    showScreen('screen-club-selection');
}

function loadClub(idx) {
    activeSaveIndex = idx;
    gameState = JSON.parse(JSON.stringify(allSaves[idx]));
    if (!gameState.reserves) gameState.reserves = [];
    if (!gameState.marketPool) gameState.marketPool = [];
    if (!gameState.formation) gameState.formation = "4-4-2";

    // ANTI-EXPLOIT: Se ele fechou o navegador durante a partida
    if (gameState.inMatch) {
        gameState.inMatch = false;

        // Simula a derrota e destrói o mapa da temporada atual
        if (typeof recordRun === "function") recordRun(false);
        gameState.season.map = [];
        saveAllClubs();

        // CHAMA A MODAL EM VEZ DO ALERT
        showCustomAlert(
            "⚠️ PUNIÇÃO POR ABANDONO",
            "TEXT_ABANDON_PENALTY" // Ou passa o texto direto se preferir
        );
    }

    let totalStages = GAME_BALANCE.mechanics?.runStages || 8;
    let hasActiveRun = gameState.season && gameState.season.map && gameState.season.map.length > 0 && gameState.season.currentStage < totalStages;

    if (hasActiveRun) {
        startRunFlow();
    } else {
        returnToHub();
    }
}

// Variáveis para guardar o sorteio atual do nome do clube
let currentRandomBaseIdx = 0;
let currentRandomAdjIdx = 0;

// Função chamada pelo botão 🔀
window.randomizeClubName = function () {
    currentRandomBaseIdx = Math.floor(Math.random() * GAME_CONTENT.clubGeneration.bases.length);
    currentRandomAdjIdx = Math.floor(Math.random() * GAME_CONTENT.clubGeneration.adjectives.length);

    const base = GAME_CONTENT.clubGeneration.bases[currentRandomBaseIdx];
    const adj = GAME_CONTENT.clubGeneration.adjectives[currentRandomAdjIdx];

    const displayEl = document.getElementById('display-club-name');
    if (displayEl) {
        displayEl.innerHTML = `<span style="font-size:2rem; margin-right:8px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${base.emoji}</span> ${t(base.name)} ${t(adj)}`;
    }
};

function openCreateClub() {
    const natSel = document.getElementById('create-club-nat');

    // Popula o select de nacionalidades
    natSel.innerHTML = GAME_CONTENT.names.map((n, i) => `<option value="${i}">${n.country}</option>`).join('');

    // Rola o primeiro nome aleatório
    randomizeClubName();

    showScreen('screen-create-club');
}

window.setSquadTab = function (tab) {
    const pitchCont = document.getElementById('squad-pitch-container');
    const resCont = document.getElementById('squad-reserves-container');
    const formRow = document.querySelector('#screen-squad .formation-row');
    const btnPitch = document.getElementById('squad-nav-pitch');
    const btnRes = document.getElementById('squad-nav-reserves');

    if (!pitchCont || !resCont) return;

    if (tab === 'pitch') {
        pitchCont.classList.add('active');
        resCont.classList.remove('active');
        if (formRow) formRow.style.display = '';
        if (btnPitch) btnPitch.classList.add('active');
        if (btnRes) btnRes.classList.remove('active');
    } else {
        resCont.classList.add('active');
        pitchCont.classList.remove('active');
        if (formRow) formRow.style.display = 'none';
        if (btnRes) btnRes.classList.add('active');
        if (btnPitch) btnPitch.classList.remove('active');
    }
};

// --- CRIAÇÃO DE CLUBE (COM VALIDAÇÃO DE SUCESSO) ---
function executeCreateClub() {
    try {
        const base = GAME_CONTENT.clubGeneration.bases[currentRandomBaseIdx];
        const adj = GAME_CONTENT.clubGeneration.adjectives[currentRandomAdjIdx];

        const natSelect = document.getElementById('create-club-nat');
        const natIndex = natSelect ? natSelect.value : 0;
        const nat = GAME_CONTENT.names[natIndex];

        const formationKeys = Object.keys(FORMATIONS);
        const randomFormation = formationKeys[Math.floor(Math.random() * formationKeys.length)];

        gameState = {
            meta: { highestSeriesUnlocked: 0, metaCoins: 0, upgrades: {} },
            coins: GAME_BALANCE.mechanics.initialCoins || 50,
            leagueLevel: 0,
            club: { name: `${base.name} ${adj}`, emoji: base.emoji, isPlayer: true },
            team: [], reserves: [], captainId: null, marketPool: [],
            formation: randomFormation,
            activeCampBuff: 0, currentNode: null, inMatch: false,
            settings: { showSuspense: true, requireConfirm: !IS_DESKTOP },
            season: { number: 1, map: [], currentStage: 0, history: [], matchHistory: [] },
            runHistory: [], tutorialSeen: false
        };

        const posList = FORMATIONS[randomFormation];
        for (let i = 0; i < 11; i++) {
            let p = generatePlayer(1, false);
            p.flag = nat.flag;
            p.name = `${rnd(nat.firstNames)} ${rnd(nat.lastNames)}`;
            p.emoji = rnd(nat.faces);
            p.isPreset = false;
            p.position = posList[i];

            p.perks = [];
            if (i === 5) {
                p.perks.push(rnd(PERK_LIST));
                p.perks.push(rnd(PERK_LIST));
            }
            gameState.team.push(p);
        }

        gameState.captainId = gameState.team[5].id;

        loadAllSaves();
        allSaves.push(gameState);
        activeSaveIndex = allSaves.length - 1;
        saveAllClubs();

        // TESTE REAL: Tenta ler do dispositivo para garantir que salvou de verdade
        const testSave = localStorage.getItem("turboFoot_saves_v8");
        if (!testSave || !testSave.includes(base.name)) {
            showCustomAlert("❌ ERRO NO CELULAR", "O jogo não conseguiu salvar no seu aparelho. Limpe o cache do navegador ou saia do modo anônimo.");
        } else {
            returnToHub();
        }

    } catch (e) {
        console.error("Erro ao criar clube:", e);
        if (typeof showCustomAlert === 'function') {
            showCustomAlert("❌ ERRO", "Ocorreu um erro interno ao fundar o clube.");
        }
    }
}

window.deleteClub = function (idx, event) {
    event.stopPropagation(); // Evita que o clique abra o clube
    let clubName = tClub(allSaves[idx].club.name);
    if (confirm(t('TEXT_DELETE_CLUB_CONFIRM', { club: clubName }) || `Excluir o clube ${clubName}? Isso não pode ser desfeito.`)) {
        allSaves.splice(idx, 1);
        localStorage.setItem("turboFoot_saves_v8", JSON.stringify(allSaves));
        renderClubSelection();
    }
};

function returnToHub() {
    // 1. Limpa a UI para evitar sobreposições
    closeModals();
    document.body.classList.remove('in-run');

    // 2. Vai para a tela correta
    showScreen('screen-title');

    // 3. Atualiza o visual do botão JOGAR vs CONTINUAR
    const btnPlay = document.querySelector('#screen-title button[onclick="startRunFlow()"]');
    if (btnPlay) {
        let totalStages = GAME_BALANCE.mechanics?.runStages || 8;
        let hasActiveRun = gameState.season && gameState.season.map && gameState.season.map.length > 0 && gameState.season.currentStage < totalStages;

        if (hasActiveRun) {
            btnPlay.innerHTML = '▶ CONTINUAR LIGA';
            btnPlay.style.background = 'var(--accent-blue)';
            btnPlay.style.borderColor = 'var(--accent-blue)';
            btnPlay.style.color = '#fff';
            btnPlay.removeAttribute('data-i18n');
        } else {
            btnPlay.setAttribute('data-i18n', 'BTN_PLAY');
            btnPlay.innerHTML = typeof t === 'function' ? t('BTN_PLAY') : '▶ JOGAR LIGA';
            btnPlay.style.background = '';
            btnPlay.style.borderColor = '';
            btnPlay.style.color = '';
        }
    }

    // 4. Força o salvamento e atualizações periféricas
    saveAllClubs();
    if (typeof updateMissionsBadge === 'function') updateMissionsBadge();
}

// === GESTÃO DO ELENCO (CAMPO E RESERVA) ===

window.changeFormation = function (newForm) {
    gameState.formation = newForm;
    saveAllClubs();
    renderSquadGrid();
}

function openSquadManager() {
    squadSelectedPlayer = null;
    const formSelect = document.getElementById('formation-select');
    if (formSelect && gameState.formation) formSelect.value = gameState.formation;

    // Reseta para a aba de CAMPO (Titulares) ao abrir a tela no mobile
    if (typeof setSquadTab === 'function') setSquadTab('pitch');

    renderSquadGrid();
    showScreen('screen-squad');
}

// LÓGICA DO TOOLTIP DE PC
window.showPcTooltip = function (p, event) {
    if (!IS_DESKTOP || squadSelectedPlayer) return; // Se está trocando, não polui a tela
    const tooltip = document.getElementById('pc-player-tooltip');
    if (!tooltip) return;
    tooltip.innerHTML = getPlayerCardHTML(p);
    tooltip.style.display = 'block';
    movePcTooltip(event);
};

window.movePcTooltip = function (event) {
    if (!IS_DESKTOP) return;
    const tooltip = document.getElementById('pc-player-tooltip');
    if (tooltip && tooltip.style.display === 'block') {
        let x = event.clientX + 15;
        let y = event.clientY + 15;
        // Evita sair da tela
        if (x + 290 > window.innerWidth) x = event.clientX - 290;
        if (y + 100 > window.innerHeight) y = event.clientY - 100;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }
};

window.hidePcTooltip = function () {
    const tooltip = document.getElementById('pc-player-tooltip');
    if (tooltip) tooltip.style.display = 'none';
};

// LÓGICA DO POPUP MOBILE
let mobileActionPlayer = null;

window.openMobilePlayerModal = function (player, index, isStarter) {
    mobileActionPlayer = { player, index, isStarter, id: player.id };
    document.getElementById('mobile-player-card-container').innerHTML = getPlayerCardHTML(player);

    let btnCaptain = document.getElementById('btn-make-captain');
    if (isStarter) {
        btnCaptain.style.display = 'block';
        if (gameState.captainId === player.id) {
            btnCaptain.innerText = "JÁ É CAPITÃO";
            btnCaptain.disabled = true;
            btnCaptain.style.opacity = "0.5";
        } else {
            btnCaptain.innerText = "👑 CAPITÃO";
            btnCaptain.disabled = false;
            btnCaptain.style.opacity = "1";
        }
    } else {
        btnCaptain.style.display = 'none';
    }
    document.getElementById('mobile-player-action-overlay').style.display = 'flex';
};

window.startSwapFromMobile = function () {
    document.getElementById('mobile-player-action-overlay').style.display = 'none';
    squadSelectedPlayer = mobileActionPlayer; // Inicia a troca!

    // NAVEGAÇÃO AUTOMÁTICA INTELIGENTE 🧠
    // Apenas do reserva para o campo a aba deve mudar automaticamente.
    // Se o jogador escolhido já é titular, não troca a aba no mobile.
    if (!squadSelectedPlayer.isStarter) {
        setSquadTab('pitch');
    }

    renderSquadGrid(); // Redesenha a tela pra todo mundo tremer
};

window.makeCaptainFromMobile = function () {
    document.getElementById('mobile-player-action-overlay').style.display = 'none';
    gameState.captainId = mobileActionPlayer.id;
    createJuiceText(t('TEXT_CAPTAIN_SET') || "CAPITÃO!", "var(--accent-gold)", window.innerWidth / 2, window.innerHeight / 2);
    saveAllClubs();
    renderSquadGrid();
};

function renderSquadGrid() {
    const squadCoins = document.getElementById('squad-coins');
    if (squadCoins) squadCoins.innerText = gameState.coins;

    const rGrid = document.getElementById('squad-reserves-grid');
    const pGrid = document.getElementById('squad-pitch-container');
    const rTitle = document.getElementById('reserves-title');

    rGrid.innerHTML = '';
    let resCount = gameState.reserves ? gameState.reserves.length : 0;
    rTitle.innerHTML = t('LABEL_RESERVES', { count: resCount }) || `RESERVAS (${resCount}/12)`;

    // DESENHA O CAMPO TÁTICO
    pGrid.innerHTML = `
        <div class="pitch-lines"></div>
        <div class="pitch-row" id="row-ATA"></div>
        <div class="pitch-row" id="row-MEI"></div>
        <div class="pitch-row" id="row-ZAG"></div>
        <div class="pitch-row" id="row-GOL"></div>
    `;

    let formationDef = FORMATIONS[gameState.formation || "4-4-2"];

    const createPitchCard = (p, index) => {
        let expectedPos = formationDef[index];
        let isOOP = p.position !== expectedPos;
        let isCaptain = (gameState.captainId === p.id);

        let badgesHTML = '';
        if (isOOP) badgesHTML += `<div class="oop-icon" data-tip="FORA DE POSIÇÃO! Nível e Traits reduzidos.">⚠️</div>`;
        if (isCaptain) badgesHTML += `<div class="cap-badge" data-tip="Capitão: Ignora punições e joga o campo todo!">👑</div>`;

        let jiggleClass = squadSelectedPlayer ? 'roster-jiggle' : '';
        let selClass = squadSelectedPlayer?.id === p.id ? 'selected' : '';
        let oopClass = isOOP ? 'oop' : '';

        let card = document.createElement('div');
        card.className = `pitch-player ${jiggleClass} ${selClass} ${oopClass}`;

        card.innerHTML = `
            <div class="pitch-card-body">
                <div class="pitch-card-avatar"><span>${p.emoji}</span></div>
                <div class="pitch-card-info">
                    <div class="pitch-card-row">
                        <div class="pos-badge pos-${p.position}">${t('POS_' + p.position) || p.position}</div>
                        <div class="lvl">Nv ${p.level}</div>
                    </div>
                </div>
            </div>
            ${badgesHTML}
        `;

        card.onclick = (e) => handleSquadClick(p, index, true, e);
        card.onmouseenter = (e) => showPcTooltip(p, e);
        card.onmousemove = (e) => movePcTooltip(e);
        card.onmouseleave = () => hidePcTooltip();

        return card;
    };

    gameState.team.forEach((p, idx) => {
        let expectedPos = formationDef[idx];
        document.getElementById(`row-${expectedPos}`).appendChild(createPitchCard(p, idx));
    });

    // DESENHA A RESERVA
    const createBenchCard = (p, index) => {
        let temp = document.createElement('div');
        temp.innerHTML = getPlayerCardHTML(p);
        let card = temp.firstElementChild;
        card.style.cursor = 'pointer';

        if (squadSelectedPlayer) card.classList.add('roster-jiggle');
        if (squadSelectedPlayer && squadSelectedPlayer.id === p.id) card.classList.add('selected');

        card.onclick = (e) => handleSquadClick(p, index, false, e);
        return card;
    };

    if (gameState.reserves) {
        gameState.reserves.forEach((p, i) => rGrid.appendChild(createBenchCard(p, i)));
    }
}

function handleSquadClick(player, index, isStarter, event) {

    // CASO 1: Ninguém selecionado. Abre Modal (Mobile) ou Seleciona (PC)
    if (!squadSelectedPlayer) {
        if (!IS_DESKTOP) {
            openMobilePlayerModal(player, index, isStarter);
        } else {
            squadSelectedPlayer = { player, index, isStarter, id: player.id };
            hidePcTooltip(); // Esconde o tooltip ao iniciar a troca
            renderSquadGrid();
        }
        return;
    }

    // CASO 2: Clicou no mesmo jogador (Deseleciona ou vira Capitão)
    if (squadSelectedPlayer.id === player.id) {
        if (isStarter && IS_DESKTOP) {
            gameState.captainId = player.id;
            const tx = event ? event.clientX : window.innerWidth / 2;
            const ty = event ? event.clientY - 40 : 100;
            createJuiceText(t('TEXT_CAPTAIN_SET') || "CAPITÃO!", "var(--accent-gold)", tx, ty);
            saveAllClubs();
        }
        squadSelectedPlayer = null;
        renderSquadGrid();
        return;
    }

    // CASO 3: Clicou em outro jogador -> Executa a TROCA
    let arr1 = squadSelectedPlayer.isStarter ? gameState.team : gameState.reserves;
    let arr2 = isStarter ? gameState.team : gameState.reserves;

    let p1 = arr1[squadSelectedPlayer.index];
    let p2 = arr2[index];

    // Validação restrita de Goleiros
    if ((p1.position === 'GOL' && p2.position !== 'GOL') || (p1.position !== 'GOL' && p2.position === 'GOL')) {
        createJuiceText(t('TEXT_GOL_SWAP_ERROR') || "Erro", "var(--accent-red)", window.innerWidth / 2, 100);
        squadSelectedPlayer = null;
        renderSquadGrid();
        return;
    }

    // Executa a Troca efetiva
    arr1[squadSelectedPlayer.index] = p2;
    arr2[index] = p1;

    if (gameState.captainId === p1.id && !squadSelectedPlayer.isStarter) gameState.captainId = gameState.team[1].id;
    if (gameState.captainId === p2.id && !isStarter) gameState.captainId = gameState.team[1].id;

    squadSelectedPlayer = null;
    hidePcTooltip();
    saveAllClubs();
    renderSquadGrid();
}