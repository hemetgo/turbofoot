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
    let baseLvl = Math.max(1, ((gameState.meta?.highestSeriesUnlocked || 0) * 3) + 3);

    // Gera 5 opções variadas (do mais fraco/barato até a "estrela" premium da loja)
    gameState.marketPool = [
        generatePlayer(Math.max(1, baseLvl - 2), false),
        generatePlayer(Math.max(1, baseLvl - 1), false),
        generatePlayer(baseLvl, false),
        generatePlayer(baseLvl + 1, false),
        generatePlayer(baseLvl + 2, true)
    ];
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
        // Delay de animação para efeito cascata
        let animDelay = `${idx * 0.1}s`;

        if (!p) {
            // Estilo VENDIDO/ESGOTADO - SEM O CARIMBO DE TEXTO (Apenas apagado)
            list.innerHTML += `
            <div class="market-card market-card-disabled" style="animation-delay: ${animDelay};">
                <div class="card-emoji">❌</div>
                <div class="market-info">
                    <div class="market-name">---</div>
                </div>
            </div>`;
            return;
        }

        let disabledAttr = (gameState.coins < p.price) ? "disabled" : "";
        let premiumClass = p.isStar ? "premium-card" : "";

        let perkCounts = {};
        if (p.perks) {
            p.perks.forEach(perk => {
                if (!perkCounts[perk.id]) perkCounts[perk.id] = { ...perk, count: 1 };
                else perkCounts[perk.id].count++;
            });
        }

        let perksHtml = Object.values(perkCounts).map(perk => {
            let countLabel = perk.count > 1 ? ` <span style="color:var(--accent-gold); font-weight:900;">x${perk.count}</span>` : "";
            return `<span data-tip="${t(perk.desc)}" style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; background: rgba(0,0,0,0.4); padding: 4px 6px; border-radius: 6px; border: 1px solid var(--border-light); font-size: 0.75rem; font-weight: 800; white-space: nowrap; color: #e2e8f0; pointer-events: auto;">${perk.emoji} ${t(perk.name)}${countLabel}</span>`;
        }).join('');

        if (!perksHtml) perksHtml = `<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 800;">Sem Habilidades</span>`;

        let starLabel = p.isStar ? `<span class="star-badge">⭐</span>` : '';
        let levelBadge = `<span class="level-badge">Nv ${p.level}</span>`;
        let posBadge = p.position ? `<span class="pos-badge pos-${p.position}">${t('POS_' + p.position)}</span>` : '';

        list.innerHTML += `
            <div class="market-card ${premiumClass}" style="animation-delay: ${animDelay};">
                <div class="card-emoji">${p.emoji}</div>
                <div class="market-info">
                    <div class="market-title-row">
                        ${posBadge}
                        <span class="fi fi-${p.flag || 'xx'}"></span>
                        <span class="market-player-name">${p.name}</span>
                        ${starLabel}
                    </div>
                    <div class="market-subtitle-row">
                        ${perksHtml}
                    </div>
                </div>
                <div class="market-actions">
                    ${levelBadge}
                    <button class="market-buy-btn" ${disabledAttr} onclick="executePurchase(${idx})">${p.price}💰</button>
                </div>
            </div>
        `;
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

    incomingContainer.innerHTML = getPlayerCardHTML(pendingPurchase);

    swapList.innerHTML = '';
    if (!gameState.reserves || gameState.reserves.length === 0) {
        swapList.innerHTML = `<p style="color: var(--text-muted); text-align:center;">Nenhum reserva disponível para substituir.</p>`;
    } else {
        gameState.reserves.forEach((player, idx) => {
            let playerCard = getPlayerCardHTML(player);

            swapList.innerHTML += `
                <div class="market-swap-row">
                    <div style="flex:1; min-width: 0; pointer-events: none;">
                        ${playerCard}
                    </div>
                    <button class="btn-icon" style="cursor: pointer; background: rgba(248, 113, 113, 0.1); border-color: var(--accent-red); color: var(--accent-red); padding: 0 16px; height: 64px; border-radius: 8px; font-size: 1.5rem; flex-shrink: 0;" onclick="replaceReserve(${idx})" data-tip="Substituir e demitir este jogador">
                        🔁
                    </button>
                </div>
            `;
        });
    }

    overlay.style.display = 'flex';
}

function replaceReserve(reserveIndex) {
    if (pendingMarketPurchase === null) return;
    const pendingPurchase = gameState.marketPool[pendingMarketPurchase];
    if (!pendingPurchase || !gameState.reserves || !gameState.reserves[reserveIndex]) return;

    if (gameState.coins < pendingPurchase.price) {
        showCustomAlert("❌ ERRO", t('LOG_COMBO_INSUFICIENT') || '💰 INSUFICIENTE');
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