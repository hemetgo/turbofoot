// ==========================================
// GERENCIADOR DE CLUBES E FORMAÇÕES
// ==========================================

let allSaves = [];
let activeSaveIndex = -1;
let squadSelectedPlayer = null;
let isSelectingCaptain = false;

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
        const savedData = getSafeStorage().getItem("turboFoot_saves_v8"); // <-- Modificado
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
            getSafeStorage().setItem("turboFoot_saves_v8", JSON.stringify(allSaves)); // <-- Modificado
        } else if (allSaves.length > 0) {
            getSafeStorage().setItem("turboFoot_saves_v8", JSON.stringify(allSaves)); // <-- Modificado
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
        container.innerHTML = `<p style="color:var(--text-muted); text-align:center; width:100%; font-weight:bold; grid-column: 1 / -1; margin-top: 40px;">${t('TEXT_NO_CLUBS_YET') || "Nenhum clube fundado ainda."}</p>`;
    } else {
        allSaves.forEach((save, idx) => {
            if (!save || !save.club) return;

            // Puxa a liga atual do save (se não existir, cai na Liga Regional [0])
            let highestIdx = save.meta?.highestSeriesUnlocked || 0;
            let leagueConfig = GAME_BALANCE.leagues && GAME_BALANCE.leagues[highestIdx] ? GAME_BALANCE.leagues[highestIdx] : { name: 'Liga Regional', emoji: '🏆' };

            let clubName = typeof tClub === 'function' ? tClub(save.club.name) : save.club.name;

            container.innerHTML += `
                <div class="club-select-card" onclick="loadClub(${idx})" style="position: relative; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                    <button onclick="deleteClub(${idx}, event)" style="position:absolute; top:12px; right:12px; background:rgba(239,68,68,0.2); border:1px solid #ef4444; border-radius:8px; cursor:pointer; font-size:0.9rem; padding:6px 10px; color:#fff; z-index: 10;">🗑️</button>
                    
                    <div class="club-select-header" style="margin-top: 10px;">
                        <div class="club-select-emoji" style="font-size:3.5rem;">${save.club.emoji}</div>
                        <div class="club-select-name" style="font-size:1.15rem; margin-top:12px;">${clubName.toUpperCase()}</div>
                    </div>
                    
                    <div class="captain-box" style="padding: 16px; margin-top: auto; display:flex; flex-direction:column; gap:8px;">
                        <div style="font-weight:900; color:var(--accent-gold); font-size:1.3rem;">💰 ${save.coins}</div>
                        
                        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:6px; font-weight: 800;">${leagueConfig.emoji} ${t(leagueConfig.name)}</div>
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

    // Atualiza o áudio assim que o save (e suas settings) está carregado
    if (typeof updateAudioState === 'function') updateAudioState();

    // ANTI-EXPLOIT: Se ele fechou o navegador durante a partida
    if (gameState.inMatch) {
        gameState.inMatch = false;

        // Simula a derrota e destrói o mapa da temporada atual
        if (typeof recordRun === "function") recordRun(false);
        gameState.season.map = [];
        saveAllClubs();

        // Navega primeiro; depois exibe o alerta (returnToHub chama closeModals internamente)
        returnToHub();
        setTimeout(function () {
            showCustomAlert(
                t('ALERT_ABANDON_PENALTY_TITLE'),
                t('ALERT_ABANDON_PENALTY_TEXT')
            );
        }, 150);
        return;
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

// Sorteia apenas o nome do clube
function randomizeClubName() {
    currentRandomBaseIdx = Math.floor(Math.random() * GAME_CONTENT.clubGeneration.bases.length);
    currentRandomAdjIdx  = Math.floor(Math.random() * GAME_CONTENT.clubGeneration.adjectives.length);
    const base = GAME_CONTENT.clubGeneration.bases[currentRandomBaseIdx];
    const adj  = GAME_CONTENT.clubGeneration.adjectives[currentRandomAdjIdx];

    document.getElementById('display-club-name').innerText = `${base.emoji} ${t(base.name)} ${t(adj)}`;

    if (typeof playSFX === 'function') playSFX('click');
}

// Sorteia apenas o pais de origem
function randomizeCountry() {
    const natSelect = document.getElementById('create-club-nat');
    if (natSelect && natSelect.options.length > 0) {
        natSelect.selectedIndex = Math.floor(Math.random() * natSelect.options.length);
    }
    if (typeof playSFX === 'function') playSFX('click');
}

function openCreateClub() {
    const natSel = document.getElementById('create-club-nat');

    // 1. Criamos um array auxiliar que guarda o índice original e gera o Emoji da bandeira
    let countriesList = GAME_CONTENT.names.map((n, index) => {
        // Truque de Mágica do JS: Converte o código ISO (ex: 'br') em Emoji de bandeira 🇧🇷
        let flagEmoji = n.flag ? [...n.flag.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('') : '';

        return {
            originalIndex: index,
            countryName: n.country,
            emoji: flagEmoji
        };
    });

    // 2. Ordenamos esse array alfabeticamente pelo nome do país
    countriesList.sort((a, b) => a.countryName.localeCompare(b.countryName));

    // 3. Populamos o Select mantendo o "value" como o índice original do arquivo JSON
    natSel.innerHTML = countriesList.map(n => `<option value="${n.originalIndex}">${n.emoji} ${n.countryName}</option>`).join('');

    // Rola o primeiro nome e país aleatórios
    randomizeClubName();
    randomizeCountry();

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
            let p = generatePlayer(1, false, nat, posList[i]);
            p.isStar = false; // GARANTE que o time nasça humilde e sem estrelas
            gameState.team.push(p);
        }

        gameState.captainId = gameState.team[5].id;

        loadAllSaves();
        allSaves.push(gameState);
        activeSaveIndex = allSaves.length - 1;
        saveAllClubs();

        // TESTE REAL: Tenta ler da Nuvem/Aparelho para garantir que salvou de verdade
        const testSave = getSafeStorage().getItem("turboFoot_saves_v8"); // <-- Modificado
        if (!testSave || !testSave.includes(base.name)) {
            showCustomAlert("❌ ERRO NO CELULAR", "O jogo não conseguiu salvar. Limpe o cache do navegador ou saia do modo anônimo.");
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
    event.stopPropagation(); // Evita que o clique no botão da lixeira abra o clube sem querer

    let clubName = typeof tClub === 'function' ? tClub(allSaves[idx].club.name) : allSaves[idx].club.name;

    // Pega o texto traduzido e injeta o nome do clube
    let confirmText = t('TEXT_DELETE_CLUB_CONFIRM') || `Tem certeza que deseja excluir o clube {club}? Isso não pode ser desfeito.`;
    confirmText = confirmText.replace('{club}', clubName.toUpperCase());

    // Chama o Modal Customizado que já tínhamos criado
    showCustomConfirm(
        t('TITLE_DELETE_CLUB') || "EXCLUIR CLUBE",
        confirmText,
        () => {
            // Ação executada se o usuário clicar em "CONFIRMAR"
            allSaves.splice(idx, 1);
            getSafeStorage().setItem("turboFoot_saves_v8", JSON.stringify(allSaves)); // <-- Modificado
            renderClubSelection();

            // Feedback visual flutuante
            if (typeof createJuiceText === 'function') {
                createJuiceText(t('LOG_CLUB_DELETED') || "CLUBE EXCLUÍDO", "var(--accent-red)", window.innerWidth / 2, window.innerHeight / 2);
            }
        }
    );
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
            btnCaptain.innerText = t('BTN_ALREADY_CAPTAIN');
            btnCaptain.disabled = true;
            btnCaptain.style.opacity = "0.5";
        } else {
            btnCaptain.innerText = t('BTN_CAPTAIN');
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

window.toggleCaptainSelection = function () {
    isSelectingCaptain = !isSelectingCaptain;
    squadSelectedPlayer = null; // Cancela qualquer troca de posição em andamento
    renderSquadGrid();
};

window.assignCaptain = function (playerId) {
    gameState.captainId = playerId;
    isSelectingCaptain = false; // Desliga o modo de seleção após escolher

    if (typeof createJuiceText === 'function') {
        createJuiceText(t('TEXT_CAPTAIN_SET') || "CAPITÃO!", "var(--accent-gold)", window.innerWidth / 2, window.innerHeight / 2);
    }

    saveAllClubs();
    renderSquadGrid();
};

// Função genérica e dinâmica para criar alertas de confirmação bonitos
window.showCustomConfirm = function (title, message, onConfirm) {
    let overlay = document.getElementById('custom-confirm-overlay');

    // Se o modal não existir no HTML, o JS cria ele dinamicamente na primeira vez
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-confirm-overlay';
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '10005';
        overlay.innerHTML = `
            <div class="options-box text-center">
                <div class="modal-header flex-between" style="align-items: flex-start;">
                    <h2 class="options-title text-danger" id="confirm-title"></h2>
                    <button class="btn-icon" onclick="document.getElementById('custom-confirm-overlay').style.display='none'">❌</button>
                </div>
                <div class="modal-body">
                    <p class="modal-subtitle" id="confirm-message" style="margin-top:0; white-space: pre-wrap; color: var(--text-main); font-weight: 600;"></p>
                </div>
                <div class="modal-footer" style="flex-direction:row; gap:10px;">
                    <button class="btn-secondary" style="flex:1;" onclick="document.getElementById('custom-confirm-overlay').style.display='none'">${typeof t === 'function' ? t('BTN_CANCEL') : 'CANCELAR'}</button>
                    <button class="btn-primary" id="confirm-action-btn" style="flex:1; background:var(--accent-red); box-shadow:none;">${typeof t === 'function' ? t('BTN_CONFIRM') : 'CONFIRMAR'}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;

    const btnConfirm = document.getElementById('confirm-action-btn');
    btnConfirm.onclick = () => {
        overlay.style.display = 'none';
        if (onConfirm) onConfirm();
    };

    overlay.style.display = 'flex';
};

// Nova lógica de dispensa usando o alerta customizado
window.fireReserve = function (idx) {
    let p = gameState.reserves[idx];
    let pName = p.name.toUpperCase();

    showCustomConfirm(
        t('TITLE_FIRE_PLAYER') || "DISPENSAR JOGADOR",
        t('TEXT_FIRE_PLAYER_CONFIRM', { name: pName }) || `Tem certeza que deseja dispensar o jogador ${pName}? Esta ação não pode ser desfeita.`,
        () => {
            gameState.reserves.splice(idx, 1);
            saveAllClubs();
            renderSquadGrid();
            // Um pequeno feedback visual (juice) na tela para confirmar que deu certo
            if (typeof createJuiceText === 'function') {
                createJuiceText(t('LOG_FIRED') || "DISPENSADO", "var(--accent-red)", window.innerWidth / 2, window.innerHeight / 2);
            }
        }
    );
};

function renderSquadGrid() {
    const squadCoins = document.getElementById('squad-coins');
    if (squadCoins) squadCoins.innerText = gameState.coins;

    const rGrid = document.getElementById('squad-reserves-grid');
    const pGrid = document.getElementById('squad-pitch-container');
    const rTitle = document.getElementById('reserves-title');

    rGrid.innerHTML = '';
    // --- SUBSTITUA ESTA PARTE EM renderSquadGrid() ---
    let resCount = gameState.reserves ? gameState.reserves.length : 0;

    // Deixando o limite (12) explícito e colorido caso esteja cheio
    let colorCount = resCount >= 12 ? 'var(--accent-red)' : 'var(--text-main)';
    rTitle.innerHTML = `${t('LABEL_RESERVES')} <span style="color:${colorCount}; font-weight:900;">(${resCount}/12)</span>`;
    pGrid.innerHTML = '';

    let formationDef = FORMATIONS[gameState.formation || "4-4-2"];

    // SUBSTITUA ESTE BLOCO:
    const sectors = [
        { pos: "GOL", label: t('SECTOR_GOL') || "GOLEIRO", players: [] },
        { pos: "ZAG", label: t('SECTOR_ZAG') || "DEFESA", players: [] },
        { pos: "MEI", label: t('SECTOR_MEI') || "MEIO-CAMPO", players: [] },
        { pos: "ATA", label: t('SECTOR_ATA') || "ATAQUE", players: [] }
    ];

    gameState.team.forEach((p, idx) => {
        let expectedPos = formationDef[idx];
        let sector = sectors.find(s => s.pos === expectedPos);
        if (sector) sector.players.push({ player: p, index: idx, expectedPos });
    });

    // 1. Renderiza os Titulares
    sectors.forEach(sec => {
        if (sec.players.length === 0) return;

        let sectorTitle = document.createElement('div');
        sectorTitle.className = 'squad-sector-title';
        sectorTitle.innerHTML = `${sec.label} <span style="color:var(--text-muted); font-size:0.8rem;">(${sec.players.length})</span>`;
        pGrid.appendChild(sectorTitle);

        let sectorList = document.createElement('div');
        sectorList.style.display = 'flex';
        sectorList.style.flexDirection = 'column';
        sectorList.style.gap = '10px';
        sectorList.style.marginBottom = '24px';

        sec.players.forEach(item => {
            let p = item.player;

            let isSelected = squadSelectedPlayer && squadSelectedPlayer.id === p.id;
            let isSwapTarget = squadSelectedPlayer && !isSelected;

            let customStyles = "cursor: pointer;";

            // --- NOVO: Lógica de destaque do Modo Capitão ---
            if (isSelectingCaptain) {
                if (gameState.captainId !== p.id) {
                    // Pulsa em dourado quem PODE ser o novo capitão
                    customStyles += " animation: pulseSwapTarget 1.5s infinite ease-in-out; border-color: var(--accent-gold); box-shadow: inset 0 0 10px rgba(245,158,11,0.2);";
                } else {
                    // Deixa o capitão atual "apagado" e com opacidade reduzida
                    customStyles += " opacity: 0.4; filter: grayscale(1);";
                }
            }

            let temp = document.createElement('div');
            // Removemos o btnCap daqui, pois a interface agora está super limpa!
            temp.innerHTML = getPlayerCardHTML(p, "", customStyles, { expectedPos: item.expectedPos });
            let card = temp.firstElementChild;

            // --- NOVO: Muda a ação do clique dependendo do modo ---
            if (isSelectingCaptain) {
                card.onclick = (e) => {
                    e.stopPropagation();
                    if (gameState.captainId !== p.id) assignCaptain(p.id);
                    else toggleCaptainSelection(); // Se clicar no capitão atual, só cancela
                };
            } else {
                if (isSelected) card.classList.add('swap-selected');
                else if (isSwapTarget) card.classList.add('swap-target');
                card.onclick = (e) => handleSquadClick(p, item.index, true, e);
            }

            sectorList.appendChild(card);
        });
        pGrid.appendChild(sectorList);
    });

    // 2. Renderiza os Reservas
    if (gameState.reserves) {
        gameState.reserves.forEach((p, i) => {

            // Lógica de Destaque para as Reservas
            let isSelected = squadSelectedPlayer && squadSelectedPlayer.id === p.id;
            let isSwapTarget = squadSelectedPlayer && !isSelected;

            let btnFire = `<button class="btn-icon" style="padding:12px; border-color:var(--accent-red); color:var(--accent-red); font-size:1.1rem; background:rgba(248,113,113,0.1);" onclick="event.stopPropagation(); fireReserve(${i})">🗑️</button>`;

            let temp = document.createElement('div');
            temp.innerHTML = getPlayerCardHTML(p, btnFire, "cursor: pointer;");
            let card = temp.firstElementChild;

            // Aplica as classes dinamicamente
            if (isSelected) card.classList.add('swap-selected');
            else if (isSwapTarget) card.classList.add('swap-target');

            card.onclick = (e) => handleSquadClick(p, i, false, e);
            rGrid.appendChild(card);
        });
    }

    const btnToggleCap = document.getElementById('btn-toggle-captain');
    if (btnToggleCap) {
        if (isSelectingCaptain) {
            btnToggleCap.style.background = 'var(--accent-gold)';
            btnToggleCap.style.color = '#000';
            btnToggleCap.innerHTML = `❌ <span data-i18n="BTN_CANCEL">${t('BTN_CANCEL')}</span>`;
        } else {
            btnToggleCap.style.background = 'transparent';
            btnToggleCap.style.color = 'var(--accent-gold)';
            btnToggleCap.innerHTML = `👑 <span data-i18n="BTN_SET_CAPTAIN">${t('BTN_SET_CAPTAIN')}</span>`;
        }
    }
}

function handleSquadClick(player, index, isStarter, event) {
    if (!squadSelectedPlayer) {
        squadSelectedPlayer = { player, index, isStarter, id: player.id };
        renderSquadGrid();
        return;
    }

    if (squadSelectedPlayer.id === player.id) {
        squadSelectedPlayer = null;
        renderSquadGrid();
        return;
    }

    let arr1 = squadSelectedPlayer.isStarter ? gameState.team : gameState.reserves;
    let arr2 = isStarter ? gameState.team : gameState.reserves;

    let p1 = arr1[squadSelectedPlayer.index];
    let p2 = arr2[index];

    // Executa a Troca efetiva (Sem a trava de GOL!)
    arr1[squadSelectedPlayer.index] = p2;
    arr2[index] = p1;

    if (gameState.captainId === p1.id && !squadSelectedPlayer.isStarter) gameState.captainId = gameState.team[1].id;
    if (gameState.captainId === p2.id && !isStarter) gameState.captainId = gameState.team[1].id;

    // REGRA NOVA: O campo NUNCA pode ficar sem capitão.
    if (gameState.reserves.find(r => r.id === gameState.captainId)) {
        gameState.captainId = gameState.team[0].id;
    }

    squadSelectedPlayer = null;
    saveAllClubs();
    renderSquadGrid();
}