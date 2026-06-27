const REROLL_COST = 10; // Custo fixo para girar a loja
let pendingMarketPurchase = null;

function openHubMarket() {
    // Se o mercado estiver vazio (novo clube ou recém carregado vazio), gera os 5 jogadores
    if (!gameState.marketPool || gameState.marketPool.length === 0) {
        generateMarketPool();
    }
    showMarketScreen();
}

function generateMarketPool() {
    let teamLvl = typeof getTeamAverageLevel === 'function' ? getTeamAverageLevel() : 1;
    let baseLvl = Math.max(1, teamLvl);

    // 1. Descobre a liga mais alta que você já desbloqueou (0 a 5)
    let highestLeague = gameState.meta?.highestSeriesUnlocked || 0;

    // 2. Descobre a nacionalidade base do seu clube olhando para o primeiro jogador do time
    let clubFlag = (gameState.team && gameState.team.length > 0) ? gameState.team[0].flag : 'br';
    let clubNat = GAME_CONTENT.names.find(n => n.flag === clubFlag) || GAME_CONTENT.names[0];

    // 3. Probabilidade do jogador na loja ser forçado a ter a nacionalidade do clube.
    // Ligas: Regional (100%), D (100%), C (70%), B (40%), A (15%), Suprema (0% - Totalmente global)
    const natChances = [1.0, 1.0, 0.70, 0.40, 0.15, 0.0];
    let forceChance = natChances[highestLeague] !== undefined ? natChances[highestLeague] : 0;

    let pool = [];
    let levels = [Math.max(1, baseLvl - 1), baseLvl, baseLvl + 1, baseLvl + 2, baseLvl + 3];

    for (let i = 0; i < 5; i++) {
        let isPremium = (i === 4);

        // Joga os dados: Se cair dentro da chance, força a nacionalidade local. Senão, vai null (geração aleatória livre)
        let chosenNat = (Math.random() < forceChance) ? clubNat : null;

        pool.push(generatePlayer(levels[i], isPremium, chosenNat));
    }

    gameState.marketPool = pool;
    saveGame();
}

function rerollMarket() {
    if (gameState.coins < REROLL_COST) {
        const tx = window.innerWidth / 2;
        const ty = window.innerHeight / 2;
        createJuiceText(t('LOG_COMBO_INSUFFICIENT') || "💰 INSUFICIENTE", "var(--accent-red)", tx, ty);
        return;
    }

    gameState.coins -= REROLL_COST;
    generateMarketPool(); // Cria novos 5 jogadores e salva
    showMarketScreen();   // Atualiza a tela
}

function showMarketScreen() {
    showScreen('screen-market');
    const list = document.getElementById('market-list');
    list.innerHTML = '';

    const coinsDisplay = document.getElementById('market-coins');
    if (coinsDisplay) coinsDisplay.innerText = gameState.coins;

    document.getElementById('market-title').innerText = t('MARKET_SCOUT_TITLE') || "ESCOLHA SEUS REFORÇOS";
    document.getElementById('market-sub').innerText = t('MARKET_SUB_DEFAULT') || "Os jogadores vão para a Reserva.";

    const rerollBtn = document.getElementById('btn-market-reroll');
    if (rerollBtn) {
        if (gameState.coins < REROLL_COST) {
            rerollBtn.style.opacity = "0.5";
            rerollBtn.style.filter = "grayscale(100%)";
        } else {
            rerollBtn.style.opacity = "1";
            rerollBtn.style.filter = "none";
        }
        rerollBtn.innerHTML = `🔄 ${t('BTN_REROLL')} (${REROLL_COST}💰)`;
    }

    gameState.marketPool.forEach((p, idx) => {
        let animDelay = `${idx * 0.1}s`;

        if (!p) {
            // Card Esgotado
            list.innerHTML += `
            <div class="universal-card" style="animation-delay: ${animDelay}; opacity: 0.3; filter: grayscale(1); display:flex; align-items:center; gap:14px; background:var(--bg-card); border:1px solid var(--border-accent); border-radius:14px; padding:14px; width:100%;">
                <div style="font-size:2.5rem;">❌</div>
                <div style="font-weight:900; font-size:1.1rem;">${t('MARKET_SOLD_OUT')}</div>
            </div>`;
            return;
        }

        let isAffordable = gameState.coins >= p.price;
        let btnAttr = isAffordable ? "" : "disabled";

        // Botão de compra gigante e claro injetado na carta
        let actionHTML = `
            <div style="font-size:1.3rem; font-weight:900; color:var(--accent-gold); text-align:center;">${p.price}💰</div>
            <button class="btn-primary" style="padding:12px 20px; font-size:0.95rem; margin-top:4px;" ${btnAttr} onclick="executePurchase(${idx})">${t('MARKET_BTN_BUY') || 'CONTRATAR'}</button>
        `;

        let customStyle = `animation-delay: ${animDelay}; ` + (!isAffordable ? "opacity:0.6; filter:grayscale(30%);" : "");

        list.innerHTML += getPlayerCardHTML(p, actionHTML, customStyle);
    });
}

function cancelMarket() {
    returnToHub();
}

function executePurchase(draftIndex) {
    let pendingPurchase = gameState.marketPool[draftIndex];

    if (!pendingPurchase) return;
    if (gameState.coins < pendingPurchase.price) return;
    if (!gameState.reserves) gameState.reserves = [];

    if (gameState.team.length + gameState.reserves.length >= 23) {
        openMarketSwapModal(draftIndex);
        return;
    }

    gameState.coins -= pendingPurchase.price;
    gameState.reserves.push(pendingPurchase);

    // Marca como esgotado no array do state persistente
    gameState.marketPool[draftIndex] = null;

    if (typeof progressDailyMission === 'function') progressDailyMission('visit_market', 1);

    saveGame();
    showMarketScreen();
}



function openMarketSwapModal(draftIndex) {
    const pendingPurchase = gameState.marketPool[draftIndex];
    if (!pendingPurchase) return;
    pendingMarketPurchase = draftIndex;

    const overlay = document.getElementById('market-swap-overlay');
    const incomingContainer = document.getElementById('market-swap-incoming');
    const swapList = document.getElementById('market-swap-list');

    if (!overlay || !incomingContainer || !swapList) {
        showCustomAlert("❌ ERRO", t('TEXT_ROSTER_FULL') || "Seu elenco está cheio.");
        return;
    }

    // Carta do novo reforço não tem botões
    incomingContainer.innerHTML = getPlayerCardHTML(pendingPurchase);

    swapList.innerHTML = '';
    if (!gameState.reserves || gameState.reserves.length === 0) {
        swapList.innerHTML = `<p style="color: var(--text-muted); text-align:center;">${t('TEXT_NO_RESERVES_FOR_SWAP')}</p>`;
    } else {
        gameState.reserves.forEach((player, idx) => {
            // Botão de substituir injetado na carta da reserva
            let actionHTML = `
                <button class="btn-primary" style="background:rgba(248,113,113,0.1); border:1px solid var(--accent-red); color:var(--accent-red); padding:16px 20px; font-size:1rem; box-shadow:none;" onclick="replaceReserve(${idx})">
                    🗑️
                </button>
            `;

            swapList.innerHTML += getPlayerCardHTML(player, actionHTML);
        });
    }

    overlay.style.display = 'flex';
}

function replaceReserve(reserveIndex) {
    if (pendingMarketPurchase === null) return;
    const pendingPurchase = gameState.marketPool[pendingMarketPurchase];
    if (!pendingPurchase || !gameState.reserves || !gameState.reserves[reserveIndex]) return;

    if (gameState.coins < pendingPurchase.price) {
        showCustomAlert("❌ ERRO", t('LOG_COMBO_INSUFFICIENT') || '💰 INSUFICIENTE');
        return;
    }

    gameState.coins -= pendingPurchase.price;
    gameState.reserves[reserveIndex] = pendingPurchase;
    gameState.marketPool[pendingMarketPurchase] = null;

    if (typeof progressDailyMission === 'function') progressDailyMission('visit_market', 1);
    saveGame();
    closeMarketSwap();
    showMarketScreen();
}

function closeMarketSwap() {
    const overlay = document.getElementById('market-swap-overlay');
    if (overlay) overlay.style.display = 'none';
    pendingMarketPurchase = null;
}

function cancelMarketSwap() {
    closeMarketSwap();
}