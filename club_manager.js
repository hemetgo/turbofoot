let allSaves = [];
let activeSaveIndex = -1;
let squadSelectedPlayer = null;

function loadAllSaves() {
    try { allSaves = JSON.parse(localStorage.getItem("turboFoot_saves_v8")) || []; }
    catch (e) { allSaves = []; }
}

function saveAllClubs() {
    if (activeSaveIndex !== -1 && gameState.club) {
        allSaves[activeSaveIndex] = JSON.parse(JSON.stringify(gameState));
    }
    localStorage.setItem("turboFoot_saves_v8", JSON.stringify(allSaves));
}

function renderClubSelection() {
    loadAllSaves();
    const container = document.getElementById('saved-clubs-container');
    container.innerHTML = '';
    if (allSaves.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); text-align:center; width:100%; font-weight:bold;">Nenhum clube fundado ainda.</p>`;
    } else {
        allSaves.forEach((save, idx) => {
            if (!save || !save.club) return;
            container.innerHTML += `
                <div class="club-select-card" onclick="loadClub(${idx})" style="max-width: 300px; margin: 0 auto;">
                    <div class="club-select-header">
                        <div class="club-select-emoji" style="font-size:3rem;">${save.club.emoji}</div>
                        <div class="club-select-name" style="font-size:1.1rem;">${tClub(save.club.name)}</div>
                    </div>
                    <div class="captain-box" style="padding: 10px;">
                        <div style="font-weight:900; color:var(--accent-gold); font-size:1.2rem;">💰 ${save.coins}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:5px;">Divisão Atual: ${save.meta?.highestSeriesUnlocked || 0}</div>
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

    // RETROCOMPATIBILIDADE: Se for um save antigo, gera posições e designa capitão
    const posList = ["GOL", "ZAG", "ZAG", "ZAG", "ZAG", "MEI", "MEI", "MEI", "MEI", "ATA", "ATA"];
    if (gameState.team.length > 0 && !gameState.team[0].position) {
        gameState.team.forEach((p, i) => p.position = posList[i] || "MEI");
        gameState.reserves.forEach(p => p.position = "ATA");
    }
    if (!gameState.captainId && gameState.team.length > 0) {
        gameState.captainId = gameState.team[5].id; // Meio campista padrão
    }

    returnToHub();
}

function openCreateClub() {
    const baseSel = document.getElementById('create-club-base');
    const adjSel = document.getElementById('create-club-adj');
    const natSel = document.getElementById('create-club-nat');

    baseSel.innerHTML = GAME_CONTENT.clubGeneration.bases.map((b, i) => `<option value="${i}">${b.emoji} ${t(b.name)}</option>`).join('');
    adjSel.innerHTML = GAME_CONTENT.clubGeneration.adjectives.map((a, i) => `<option value="${i}">${t(a)}</option>`).join('');
    natSel.innerHTML = GAME_CONTENT.names.map((n, i) => `<option value="${i}">${n.country}</option>`).join('');

    showScreen('screen-create-club');
}

function executeCreateClub() {
    const base = GAME_CONTENT.clubGeneration.bases[document.getElementById('create-club-base').value];
    const adj = GAME_CONTENT.clubGeneration.adjectives[document.getElementById('create-club-adj').value];
    const nat = GAME_CONTENT.names[document.getElementById('create-club-nat').value];

    gameState = {
        meta: { highestSeriesUnlocked: 0, metaCoins: 0, upgrades: {} },
        coins: GAME_BALANCE.mechanics.initialCoins || 50,
        leagueLevel: 0,
        club: { name: `${base.name} ${adj}`, emoji: base.emoji, isPlayer: true },
        team: [], reserves: [], captainId: null,
        activeCampBuff: 0, currentNode: null,
        settings: { showSuspense: true, requireConfirm: !IS_DESKTOP },
        season: { number: 1, map: [], currentStage: 0, history: [], matchHistory: [] },
        runHistory: [], tutorialSeen: false
    };

    // FORMACÃO INICIAL FIXA: 4-4-2
    const posList = ["GOL", "ZAG", "ZAG", "ZAG", "ZAG", "MEI", "MEI", "MEI", "MEI", "ATA", "ATA"];
    for (let i = 0; i < 11; i++) {
        gameState.team.push(generateBasePlayer(1, 0, null, 0, nat, posList[i]));
    }
    gameState.captainId = gameState.team[5].id; // Define 1 meio campista como capitao padrão

    allSaves.push(gameState);
    activeSaveIndex = allSaves.length - 1;
    saveAllClubs();
    returnToHub();
}

function returnToHub() {
    closeModals();
    document.body.classList.remove('in-run');
    const hubInfo = document.getElementById('hub-club-info');
    if (hubInfo && gameState.club) {
        hubInfo.innerHTML = `<div style="font-size:3rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">${gameState.club.emoji}</div>
                             <div style="font-size:1.5rem; text-transform:uppercase;">${tClub(gameState.club.name)}</div>
                             <div style="font-size:1rem; color:var(--accent-gold); margin-top:5px; background:rgba(245,158,11,0.1); padding:4px 10px; border-radius:8px; display:inline-block; border:1px solid rgba(245,158,11,0.3);">💰 ${gameState.coins}</div>`;
    }
    showScreen('screen-title');
    saveAllClubs();
    updateMissionsBadge();
}

function openSquadManager() {
    squadSelectedPlayer = null;
    renderSquadGrid();
    showScreen('screen-squad');
}

function renderSquadGrid() {
    const sGrid = document.getElementById('squad-starters-grid');
    const rGrid = document.getElementById('squad-reserves-grid');
    const rTitle = document.getElementById('reserves-title');

    sGrid.innerHTML = ''; rGrid.innerHTML = '';

    let resCount = gameState.reserves ? gameState.reserves.length : 0;
    rTitle.innerHTML = t('LABEL_RESERVES', { count: resCount });

    const squadCoins = document.getElementById('squad-coins');
    if (squadCoins) squadCoins.innerText = gameState.coins;

    const createCard = (p, index, isStarter) => {
        let temp = document.createElement('div');
        temp.innerHTML = getPlayerCardHTML(p);
        let card = temp.firstElementChild;
        card.style.cursor = 'pointer';

        if (squadSelectedPlayer && squadSelectedPlayer.id === p.id) {
            card.style.borderColor = "var(--accent-blue)";
            card.style.boxShadow = "0 0 15px rgba(56, 189, 248, 0.4)";
            card.style.transform = "scale(1.02)";
        }

        card.onclick = () => handleSquadClick(p, index, isStarter);
        return card;
    };

    // Ordenar visuais para manter formação arrumada GOL -> ZAG -> MEI -> ATA
    const order = { 'GOL': 1, 'ZAG': 2, 'MEI': 3, 'ATA': 4 };
    let displayTeam = [...gameState.team].map((p, i) => ({ p, i })).sort((a, b) => order[a.p.position] - order[b.p.position]);

    displayTeam.forEach((item) => sGrid.appendChild(createCard(item.p, item.i, true)));
    if (gameState.reserves) gameState.reserves.forEach((p, i) => rGrid.appendChild(createCard(p, i, false)));
}

function handleSquadClick(player, index, isStarter) {
    if (!squadSelectedPlayer) {
        squadSelectedPlayer = { player, index, isStarter, id: player.id };
        renderSquadGrid();
        return;
    }

    if (squadSelectedPlayer.id === player.id) {
        // CLIQUE DUPLO NO MESMO JOGADOR: SE FOR TITULAR, VIRA CAPITÃO!
        if (isStarter) {
            gameState.captainId = player.id;
            createJuiceText(t('TEXT_CAPTAIN_SET'), "var(--accent-gold)", window.innerWidth / 2, 100);
            saveAllClubs();
        }
        squadSelectedPlayer = null;
        renderSquadGrid();
        return;
    }

    // Lógica de Troca
    let arr1 = squadSelectedPlayer.isStarter ? gameState.team : gameState.reserves;
    let arr2 = isStarter ? gameState.team : gameState.reserves;

    let p1 = arr1[squadSelectedPlayer.index];
    let p2 = arr2[index];

    // Validação de Goleiro: 1 Goleiro titular OBRIGATÓRIO.
    if ((p1.position === 'GOL' && p2.position !== 'GOL') || (p1.position !== 'GOL' && p2.position === 'GOL')) {
        createJuiceText(t('TEXT_GOL_SWAP_ERROR'), "var(--accent-red)", window.innerWidth / 2, 100);
        squadSelectedPlayer = null;
        renderSquadGrid();
        return;
    }

    // Executa a Troca
    arr1[squadSelectedPlayer.index] = p2;
    arr2[index] = p1;

    // Se o capitão for pro banco, perde a faixa
    if (gameState.captainId === p1.id && !squadSelectedPlayer.isStarter) gameState.captainId = gameState.team[0].id;
    if (gameState.captainId === p2.id && !isStarter) gameState.captainId = gameState.team[0].id;

    squadSelectedPlayer = null;
    saveAllClubs();
    renderSquadGrid();
}