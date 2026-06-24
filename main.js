let pendingClubOptions = [];
let selectedSeriesIndex = 0;

// Inicializa o jogo: i18n → carrega dados → renderiza
async function initGame() {
    try {
        // Inicializa o idioma e baixa o txt usando a função do i18n.js
        await loadLocale();

        // Traduz o HTML estático
        applyStaticI18n();

        const mechanicsData = await fetch('config_mechanics.json').then(r => r.json());
        const generationData = await fetch('config_generation.json').then(r => r.json());
        const rivalsData = await fetch('config_rivals.json').then(r => r.json());
        const actionsData = await fetch('config_actions.json').then(r => r.json());
        const textsData = await fetch('config_texts.json').then(r => r.json());
        const metaData = await fetch('config_meta.json').then(r => r.json());
        const leaguesData = await fetch('config_leagues.json').then(r => r.json());
        const namesData = await fetch('config_names.json').then(r => r.json());
        const presetsData = await fetch('config_presets.json').then(r => r.json());
        const missionsData = await fetch('config_missions.json').then(r => r.json());

        GAME_BALANCE = { mechanics: mechanicsData, leagues: leaguesData, meta: metaData, missions: missionsData };
        GAME_CONTENT = {
            clubGeneration: generationData.clubGeneration,
            names: namesData,
            presets: presetsData,
            rivalStyles: rivalsData,
            nodes: actionsData,
            suspenseTexts: textsData.suspenseTexts,
            logTexts: textsData.logTexts,
            tooltips: textsData.tooltips,
            howToPlay: textsData.howToPlay
        };

        PERK_LIST = textsData.perks;
        loadSaveData();
        ensureDailyMissions();
        populateHowToPlay();
        document.getElementById('loading-screen').style.display = 'none';
        returnToTitle();
    } catch (e) { console.error(e); }
}

function startRunFlow() {
    const container = document.getElementById('series-options-container');
    container.innerHTML = '';

    let highestUnlocked = gameState.meta?.highestSeriesUnlocked || 0;

    GAME_BALANCE.leagues.forEach((series, idx) => {
        let isLocked = idx > highestUnlocked;
        let lockedAttr = isLocked ? 'style="opacity:0.3; filter:grayscale(1); pointer-events:none;"' : '';
        let lockIcon = isLocked ? '🔒' : series.emoji;

        let metaPerWin = (idx + 1) * 5;
        let metaWinBonus = (idx + 1) * 50;

        let rewardsHtml = "";
        if (isLocked) {
            rewardsHtml = `
                <div style="background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 8px; width: 100%; margin-top: 12px; border: 1px dashed var(--border-accent); display: flex; align-items: center; justify-content: center; min-height: 72px;">
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase;">🔒 ${t('LEAGUE_REWARDS_TITLE_LOCKED')}</span>
                </div>
            `;
        } else {
            rewardsHtml = `
                <div style="background: rgba(0,0,0,0.4); padding: 8px 12px; border-radius: 8px; width: 100%; margin-top: 12px; border: 1px solid var(--border-light); min-height: 72px;">
                    <div style="font-size: 0.7rem; color: var(--accent-gold); font-weight: 900; text-transform: uppercase; text-align: center; margin-bottom: 6px;">${t('LEAGUE_REWARDS_TITLE')}</div>
                    <div style="font-size: 0.8rem; color: #fff; font-weight: 700; display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>🎉 ${t('LEAGUE_REWARDS_PER_VICTORY')}:</span> 
                        <span style="color: var(--accent-green);">x${metaPerWin}🏆</span>
                    </div>
                    <div style="font-size: 0.8rem; color: #fff; font-weight: 700; display: flex; justify-content: space-between;">
                        <span>👑 ${t('LEAGUE_REWARDS_CHAMPION')}:</span> 
                        <span style="color: var(--accent-gold);">+${metaWinBonus}🏆</span>
                    </div>
                </div>
            `;
        }

        container.innerHTML += `
            <div class="club-select-card" ${lockedAttr} onclick="selectSeries(${idx})" style="height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
                <div class="club-select-header">
                    <div class="club-select-emoji">${lockIcon}</div>
                    <div class="club-select-name" style="color: ${isLocked ? '#94a3b8' : series.color}">${t(series.name)}</div>
                </div>
                <div class="captain-box" style="justify-content: center; min-height: 80px; padding: 12px; flex-grow: 1; display: flex; flex-direction: column;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 800; text-align: center; line-height: 1.4; flex-grow: 1; display: flex; align-items: center; justify-content: center;">
                        ${t(series.desc)}
                    </div>
                    ${rewardsHtml}
                </div>
            </div>
        `;
    });

    showScreen('screen-series-select');
}

function selectSeries(idx) {
    selectedSeriesIndex = idx;
    pendingClubOptions = [];

    let shuffledBases = shuffle(GAME_CONTENT.clubGeneration.bases);
    let shuffledAdjs = shuffle(GAME_CONTENT.clubGeneration.adjectives);

    let metaLevel = gameState.meta?.upgrades?.start_level || 0;
    let metaTraits = gameState.meta?.upgrades?.start_traits || 0;
    let metaFocusLvl = gameState.meta?.upgrades?.trait_focus || 0;
    let startLvl = 1 + metaLevel;
    let focusChance = metaFocusLvl * 0.12;

    let playersWith2Traits = 1 + Math.floor(metaTraits / 2);
    let playersWith1Trait = metaTraits % 2;

    for (let i = 0; i < 3; i++) {
        const base = shuffledBases[i];
        const adj = shuffledAdjs[i];

        let shuffledNames = shuffle(GAME_CONTENT.names);
        let clubNationalities = [];

        let natDistribution = GAME_BALANCE.leagues[idx].natDistribution || [11];

        natDistribution.forEach((count, natIndex) => {
            for (let k = 0; k < count; k++) {
                clubNationalities.push(shuffledNames[natIndex]);
            }
        });

        clubNationalities = shuffle(clubNationalities);

        let team = [];
        let traitDistribution = [];

        for (let j = 0; j < 11; j++) {
            if (j < playersWith2Traits) traitDistribution.push(2);
            else if (j < playersWith2Traits + playersWith1Trait) traitDistribution.push(1);
            else traitDistribution.push(0);
        }
        traitDistribution = shuffle(traitDistribution);

        let focusTraitId = metaFocusLvl > 0 ? rnd(PERK_LIST).id : null;

        for (let j = 0; j < 11; j++) {
            let numTraitsToGive = traitDistribution[j];
            team.push(generateBasePlayer(startLvl, numTraitsToGive, focusTraitId, focusChance, clubNationalities[j]));
        }

        let traitCounts = {};
        team.forEach(p => {
            if (p.perks) {
                p.perks.forEach(perk => {
                    if (!traitCounts[perk.id]) {
                        traitCounts[perk.id] = { count: 0, name: perk.name, emoji: perk.emoji, desc: perk.desc };
                    }
                    traitCounts[perk.id].count++;
                });
            }
        });

        pendingClubOptions.push({
            club: { name: `${base.name} ${adj}`, emoji: base.emoji, isPlayer: true },
            team: team,
            traitCounts: traitCounts
        });
    }

    const container = document.getElementById('club-options-container');
    container.innerHTML = '';

    const headerBlock = document.querySelector('#screen-club-select .champ-title-block');
    if (headerBlock) {
        headerBlock.innerHTML = `
            <div class="champ-league-label">${t('LABEL_CHOOSE_CLUB')}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 800; margin-top: 4px; text-transform: uppercase;">
                Elenco inicial no Nível <span style="color: var(--accent-green); font-weight: 900;">${startLvl}</span>
            </div>
        `;
    }

    pendingClubOptions.forEach((option, idx) => {
        const c = option.club;

        let traitsHtml = "";
        let traitsArray = Object.values(option.traitCounts).sort((a, b) => b.count - a.count);

        if (traitsArray.length > 0) {
            // Alterado de 't' para 'trait' para evitar conflito com a função de tradução t()
            let tags = traitsArray.map(trait =>
                `<span data-tip="${t(trait.desc)}" style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; background: rgba(0,0,0,0.4); padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; border: 1px solid var(--border-light); white-space: nowrap; color: #e2e8f0; pointer-events: auto;">${trait.emoji} ${t(trait.name)} <span style="color:var(--accent-gold); font-weight:900;">x${trait.count}</span></span>`
            ).join('');
            traitsHtml = `<div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 8px;">${tags}</div>`;
        }

        container.innerHTML += `
            <div class="club-select-card" onclick="chooseClub(${idx})">
                <div class="club-select-header">
                    <div class="club-select-emoji" style="font-size: 3.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">${c.emoji}</div>
                    <div class="club-select-name">${tClub(c.name)}</div>
                </div>
                <div class="captain-box" style="padding: 16px;">
                    <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${t('CLUB_ABILITIES')}</div>
                    ${traitsHtml}
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

    let metaCoinsBonus = (gameState.meta?.upgrades?.start_coins || 0) * 15;
    gameState.coins = GAME_BALANCE.mechanics.initialCoins + metaCoinsBonus;

    startNewSeason();
}

// ==========================================
// SISTEMA META: LOJA E REEMBOLSO (VAMPIRE SURVIVORS STYLE)
// ==========================================

function getUpgradeCost(upg, level) {
    return Math.floor(upg.baseCost * Math.pow(upg.costMult, level));
}

function getTotalSpent() {
    let total = 0;
    GAME_BALANCE.meta.upgrades.forEach(upg => {
        let currentLvl = gameState.meta.upgrades[upg.id] || 0;
        for (let i = 0; i < currentLvl; i++) {
            total += getUpgradeCost(upg, i);
        }
    });
    return total;
}

let pendingRefundAmount = 0;

function refundMetaUpgrades() {
    pendingRefundAmount = getTotalSpent();
    if (pendingRefundAmount <= 0) return;

    document.getElementById('refund-amount-text').innerText = pendingRefundAmount;
    document.getElementById('refund-confirm-overlay').style.display = 'flex';
}

function closeRefundConfirm() {
    document.getElementById('refund-confirm-overlay').style.display = 'none';
    pendingRefundAmount = 0;
}

function executeRefund() {
    if (pendingRefundAmount > 0) {
        gameState.meta.metaCoins += pendingRefundAmount;
        gameState.meta.upgrades = {};
        saveGame();
        renderMetaShop();

        createJuiceText(`+${pendingRefundAmount} 🏆`, "var(--accent-gold)", window.innerWidth / 2, window.innerHeight / 2);
    }
    closeRefundConfirm();
}

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
        let cost = getUpgradeCost(upg, currentLvl);
        let canAfford = (gameState.meta.metaCoins >= cost) && !isMax;

        let btnHtml = "";

        if (isMax) {
            btnHtml = `<button class="btn-secondary btn-sm" disabled style="width: 120px; opacity: 0.4; cursor: not-allowed; border-color: rgba(255,255,255,0.1);">${t('UPGRADE_BTN_MAX')}</button>`;
        } else if (!canAfford) {
            btnHtml = `
                <button class="btn-secondary btn-sm" disabled style="width: 120px; opacity: 0.3; filter: grayscale(100%); cursor: not-allowed; display:flex; flex-direction:column; align-items:center; gap:4px;">
                    <span style="font-weight:900;">${t('UPGRADE_BTN_BUY')}</span>
                    <span style="font-size:0.9rem;">${cost}🏆</span>
                </button>`;
        } else {
            btnHtml = `
                <button class="btn-primary btn-sm" onclick="buyMetaUpgrade('${upg.id}', ${cost})" style="width: 120px; background: rgba(245, 158, 11, 0.15); border: 1px solid var(--accent-gold); box-shadow: 0 4px 15px rgba(245,158,11,0.15); display:flex; flex-direction:column; align-items:center; gap:4px;">
                    <span style="color:var(--accent-gold); font-weight:900;">${t('UPGRADE_BTN_BUY')}</span>
                    <span style="color:#fff; font-size:0.9rem;">${cost}🏆</span>
                </button>`;
        }

        list.innerHTML += `
            <div class="options-row" style="display:flex; justify-content:space-between; align-items:center; gap: 16px; border-left: 4px solid var(--accent-gold);">
                <div style="flex:1;">
                    <div style="font-weight:900; color:var(--accent-gold); font-size:1.1rem; text-transform:uppercase;">${t(upg.name)} <span style="color:#fff; font-size:0.8rem; background:rgba(0,0,0,0.4); padding:2px 6px; border-radius:6px; vertical-align: middle;">Nv. ${currentLvl}/${upg.maxLevel}</span></div>
                    <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">${t(upg.desc)}</div>
                </div>
                <div>${btnHtml}</div>
            </div>`;
    });

    let totalSpent = getTotalSpent();
    if (totalSpent > 0) {
        list.innerHTML += `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-light); text-align: center;">
                <button class="btn-secondary" style="border-color: var(--accent-red); color: var(--accent-red); width: 100%;" onclick="refundMetaUpgrades()">
                    🔄 ${t('UPGRADE_BTN_REFUND')} (${totalSpent}🏆)
                </button>
            </div>
        `;
    }
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