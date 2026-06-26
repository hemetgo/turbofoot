const REROLL_COST = 10; // Custo fixo para girar a loja

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

    // Gerencia o visual do botão Reroll
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
        if (!p) {
            list.innerHTML += `
            <div class="market-card" style="opacity:0.5; filter:grayscale(1);">
                <div class="card-emoji" style="font-size: 2.2rem;">❌</div>
                <div class="market-info">
                    <div class="market-name" style="color:var(--text-muted);">${t('MARKET_SOLD_OUT') || 'Contratado'}</div>
                </div>
            </div>`;
            return;
        }

        let disabledAttr = (gameState.coins < p.price) ? "disabled" : "";

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

        let starLabel = p.isStar ? `<span style="font-size: 1.1rem; filter: drop-shadow(0 0 5px rgba(245,158,11,0.8)); margin-left: 4px;">⭐</span>` : '';
        let levelBadge = `<span style="display: inline-flex; align-items: center; padding: 2px 6px; font-size: 0.7rem; font-weight: 900; color: #fff; background: rgba(0,0,0,0.6); border: 1px solid var(--border-light); border-radius: 6px; margin-left: 8px;">Nv <span style="color: var(--accent-green); margin-left: 4px;">${p.level}</span></span>`;
        let posBadge = p.position ? `<span class="pos-badge pos-${p.position}">${t('POS_' + p.position)}</span>` : '';

        list.innerHTML += `
            <div class="market-card">
                <div class="card-emoji" style="font-size: 2.2rem;">${p.emoji}</div>
                <div class="market-info">
                    <div class="market-name" style="display:flex; align-items:center;">
                        ${posBadge}
                        <span class="fi fi-${p.flag || 'xx'}" style="font-size: 0.8rem; border-radius: 2px; flex-shrink: 0; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));"></span>
                        &nbsp;&nbsp;${p.name} ${starLabel} ${levelBadge}
                    </div>
                    <div class="market-stats" style="margin-top:8px; display: flex; flex-wrap: wrap; gap: 4px;">
                        ${perksHtml}
                    </div>
                </div>
                <button class="market-buy-btn" ${disabledAttr} onclick="executePurchase(${idx})">CONTRATAR<br>(${p.price}💰)</button>
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
        showCustomAlert("❌ ERRO", "TEXT_ROSTER_FULL");
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