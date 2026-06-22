let pendingClubOptions = [];
let selectedSeriesIndex = 0;

async function initGame() {
    try {
        const mechanicsData = await fetch('config_mechanics.json').then(r => r.json());
        const generationData = await fetch('config_generation.json').then(r => r.json());
        const rivalsData = await fetch('config_rivals.json').then(r => r.json());
        const actionsData = await fetch('config_actions.json').then(r => r.json());
        const textsData = await fetch('config_texts.json').then(r => r.json());
        const metaData = await fetch('config_meta.json').then(r => r.json());
        const leaguesData = await fetch('config_leagues.json').then(r => r.json());
        const namesData = await fetch('config_names.json').then(r => r.json());     // NOVO
        const presetsData = await fetch('config_presets.json').then(r => r.json()); // NOVO

        GAME_BALANCE = { mechanics: mechanicsData, leagues: leaguesData, meta: metaData };
        GAME_CONTENT = {
            clubGeneration: generationData.clubGeneration,
            names: namesData,       // NOVO
            presets: presetsData,   // NOVO
            rivalStyles: rivalsData,
            nodes: actionsData,
            suspenseTexts: textsData.suspenseTexts,
            logTexts: textsData.logTexts,
            tooltips: textsData.tooltips,
            howToPlay: textsData.howToPlay
        };

        PERK_LIST = textsData.perks;
        loadSaveData();
        populateHowToPlay();
        document.getElementById('loading-screen').style.display = 'none';
        returnToTitle();
    } catch (e) { console.error(e); }
}

function startRunFlow() {
    const container = document.getElementById('series-options-container');
    container.innerHTML = '';

    let highestUnlocked = gameState.meta?.highestSeriesUnlocked || 0;

    // Alterado para buscar do GAME_BALANCE e não do chumbado
    GAME_BALANCE.leagues.forEach((series, idx) => {
        let isLocked = idx > highestUnlocked;
        let lockedAttr = isLocked ? 'style="opacity:0.3; filter:grayscale(1); pointer-events:none;"' : '';
        let lockIcon = isLocked ? '🔒' : '🏆';

        container.innerHTML += `
            <div class="club-select-card" ${lockedAttr} onclick="selectSeries(${idx})">
                <div class="club-select-header">
                    <div class="club-select-emoji">${lockIcon}</div>
                    <div class="club-select-name" style="color: ${isLocked ? '#94a3b8' : series.color}">${series.name}</div>
                </div>
                <div class="captain-box" style="justify-content: center; min-height: 80px;">
                    <div style="font-size: 0.85rem; color: #fff; font-weight: 800; text-align: center;">${series.desc}</div>
                </div>
            </div>
        `;
    });

    showScreen('screen-series-select');
}

// NOVO: Ao clicar na série, sorteamos os times e mostramos a próxima tela
function selectSeries(idx) {
    selectedSeriesIndex = idx;
    pendingClubOptions = [];

    let bases = GAME_CONTENT.clubGeneration.bases;
    let adjs = GAME_CONTENT.clubGeneration.adjectives;

    // LÊ AS MELHORIAS META
    let metaLevel = gameState.meta?.upgrades?.start_level || 0;
    let metaTraits = gameState.meta?.upgrades?.start_traits || 0; // Este é o Nível do Upgrade (ex: de 1 a 10)
    let metaFocusLvl = gameState.meta?.upgrades?.trait_focus || 0; // Nível da Escola de Talentos (0 a 5)
    let startLvl = 1 + metaLevel;

    // Escola de Talentos: cada nível dá +12% de chance (até 60% no nível 5)
    // de um jogador da base nascer com o mesmo trait do Capitão.
    let focusChance = metaFocusLvl * 0.12;

    // A MÁGICA DA DISTRIBUIÇÃO:
    // Ex: Nível 3 -> floor(3/2) = 1 jogador com 2 traits. 3%2 = 1 jogador com 1 trait.
    let playersWith2Traits = Math.floor(metaTraits / 2);
    let playersWith1Trait = metaTraits % 2;

    for (let i = 0; i < 3; i++) {
        const base = rnd(bases);
        const adj = rnd(adjs);

        let team = [];
        let captain = generateCaptain(startLvl); // Capitão usa a regra normal (nasce Rank S)
        team.push(captain);

        // Trait "âncora" da build: o primeiro trait do Capitão, usado pela
        // Escola de Talentos para puxar a base na mesma direção.
        let focusTraitId = (focusChance > 0 && captain.perks && captain.perks.length > 0) ? captain.perks[0].id : null;

        for (let j = 0; j < 10; j++) {
            let numTraitsToGive = 0;

            // Os primeiros da lista recebem 2 Traits
            if (j < playersWith2Traits) {
                numTraitsToGive = 2;
            }
            // O(s) próximo(s) recebem 1 Trait (dependendo se for par ou ímpar)
            else if (j < playersWith2Traits + playersWith1Trait) {
                numTraitsToGive = 1;
            }

            // Agora a função generateBasePlayer sabe lidar com 0, 1 ou 2 traits
            team.push(generateBasePlayer(startLvl, numTraitsToGive, focusTraitId, focusChance));
        }

        pendingClubOptions.push({
            club: { name: `${base.name} ${adj}`, emoji: base.emoji, isPlayer: true },
            team: team,
            captain: captain
        });
    }

    const container = document.getElementById('club-options-container');
    container.innerHTML = '';

    pendingClubOptions.forEach((option, idx) => {
        const c = option.club; const cap = option.captain;
        container.innerHTML += `
            <div class="club-select-card" onclick="chooseClub(${idx})">
                <div class="club-select-header"><div class="club-select-emoji">${c.emoji}</div><div class="club-select-name">${c.name}</div></div>
                <div class="captain-box">
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 900; letter-spacing: 1px;">⭐ DESTAQUE DA BASE</div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        <div style="font-size: 2.2rem; line-height: 1;">${cap.emoji}</div>
                        <div style="font-weight: 900; color: #fff; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 4px;">${cap.name} <span style="filter: drop-shadow(0 0 5px rgba(245,158,11,0.8)); font-size: 1.1rem;">⭐</span></div>
                        <div style="font-size: 0.8rem; color: var(--accent-blue); font-weight: 800; margin-top: 4px;">${cap.perks[0].emoji} ${cap.perks[0].name} & ${cap.perks[1].emoji} ${cap.perks[1].name}</div>
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 8px; font-weight:700; border-top: 1px solid var(--border-light); padding-top: 8px; width: 100%;">Nível Inicial do Time: ${startLvl} | Nível do Celeiro: ${metaTraits}${metaFocusLvl > 0 ? ` | 🔗 Escola: Nv ${metaFocusLvl}` : ''}</div>
                </div>
            </div>`;
    });
    showScreen('screen-club-select');
}

function chooseClub(index) {
    document.body.classList.add('in-run');
    gameState.club = pendingClubOptions[index].club;
    gameState.team = pendingClubOptions[index].team;
    gameState.leagueLevel = selectedSeriesIndex;

    // PATROCÍNIO INICIAL META
    let metaCoinsBonus = (gameState.meta?.upgrades?.start_coins || 0) * 15;
    gameState.coins = GAME_BALANCE.mechanics.initialCoins + metaCoinsBonus;

    startNewSeason();
}

// ====== COLOQUE NO FINAL DO ARQUIVO PARA GERENCIAR A LOJA: ======
function openMetaShop() {
    renderMetaShop();
    document.getElementById('meta-shop-overlay').style.display = 'flex';
}

function renderMetaShop() {
    const list = document.getElementById('meta-shop-list');
    list.innerHTML = '';
    document.getElementById('meta-coins-display').innerText = gameState.meta.metaCoins || 0;

    GAME_BALANCE.meta.upgrades.forEach(upg => {
        let currentLvl = gameState.meta.upgrades[upg.id] || 0;
        let isMax = currentLvl >= upg.maxLevel;
        let cost = Math.floor(upg.baseCost * Math.pow(upg.costMult, currentLvl));
        let canAfford = (gameState.meta.metaCoins >= cost) && !isMax;

        let btnHtml = "";

        if (isMax) {
            // Estado: Máximo
            btnHtml = `<button class="btn-secondary btn-sm" disabled style="width: 120px; opacity: 0.4; cursor: not-allowed; border-color: rgba(255,255,255,0.1);">MÁXIMO</button>`;
        } else if (!canAfford) {
            // Estado: Sem dinheiro (Desativado)
            btnHtml = `
                <button class="btn-secondary btn-sm" disabled style="width: 120px; opacity: 0.3; filter: grayscale(100%); cursor: not-allowed; display:flex; flex-direction:column; align-items:center; gap:4px;">
                    <span style="font-weight:900;">COMPRAR</span>
                    <span style="font-size:0.9rem;">${cost} 🏆</span>
                </button>`;
        } else {
            // Estado: Comprar (Ativo)
            btnHtml = `
                <button class="btn-primary btn-sm" onclick="buyMetaUpgrade('${upg.id}', ${cost})" style="width: 120px; background: rgba(245, 158, 11, 0.15); border: 1px solid var(--accent-gold); box-shadow: 0 4px 15px rgba(245,158,11,0.15); display:flex; flex-direction:column; align-items:center; gap:4px;">
                    <span style="color:var(--accent-gold); font-weight:900;">COMPRAR</span>
                    <span style="color:#fff; font-size:0.9rem;">${cost} 🏆</span>
                </button>`;
        }

        list.innerHTML += `
            <div class="options-row" style="display:flex; justify-content:space-between; align-items:center; gap: 16px; border-left: 4px solid var(--accent-gold);">
                <div style="flex:1;">
                    <div style="font-weight:900; color:var(--accent-gold); font-size:1.1rem; text-transform:uppercase;">${upg.name} <span style="color:#fff; font-size:0.8rem; background:rgba(0,0,0,0.4); padding:2px 6px; border-radius:6px; vertical-align: middle;">Nv. ${currentLvl}/${upg.maxLevel}</span></div>
                    <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">${upg.desc}</div>
                </div>
                <div>${btnHtml}</div>
            </div>`;
    });
}

function buyMetaUpgrade(id, cost) {
    if (gameState.meta.metaCoins >= cost) {
        gameState.meta.metaCoins -= cost;
        if (!gameState.meta.upgrades[id]) gameState.meta.upgrades[id] = 0;
        gameState.meta.upgrades[id]++;
        saveGame();
        renderMetaShop();
        fireConfetti();
    }
}

document.addEventListener("DOMContentLoaded", initGame);