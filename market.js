let draftedPlayers = [];
let pendingPurchase = null;
let pendingDraftIndex = -1; // Guarda qual slot da loja está sendo comprado

// Função única e robusta para abrir e precificar o mercado
function openShopNode() {
    let stage = gameState.season.currentStage || 0;
    let runBonus = Math.floor(stage * 0.5);
    let baseLvl = Math.max(1, (6 - gameState.leagueLevel) + runBonus);

    // Oferece opções variadas:
    // Jogador 1: Mais barato, Nível Menor
    // Jogador 2: Normal da run
    // Jogador 3: Jogador Premium (Feirão embutido)
    draftedPlayers = [
        generatePlayer(Math.max(1, baseLvl - 1), false),
        generatePlayer(baseLvl, false),
        generatePlayer(baseLvl + 2, true)
    ];

    showMarketScreen();
}

function showMarketScreen() {
    showScreen('screen-market');
    const list = document.getElementById('market-list');
    list.innerHTML = '';

    document.getElementById('market-title').innerText = t('MARKET_SCOUT_TITLE');
    document.getElementById('market-sub').innerText = t('MARKET_SCOUT_SUB');

    draftedPlayers.forEach((p, idx) => {
        if (!p) {
            list.innerHTML += `
            <div class="market-card" style="opacity:0.5; filter:grayscale(1);">
                <div class="card-emoji" style="font-size: 2.2rem;">❌</div>
                <div class="market-info">
                    <div class="market-name" style="color:var(--text-muted);">${t('MARKET_SOLD_OUT')}</div>
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
            // Usando a função t() nas chaves do perk
            return `<span data-tip="${t(perk.desc)}" style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; background: rgba(0,0,0,0.4); padding: 4px 6px; border-radius: 6px; border: 1px solid var(--border-light); font-size: 0.75rem; font-weight: 800; white-space: nowrap; color: #e2e8f0; pointer-events: auto;">${perk.emoji} ${t(perk.name)}${countLabel}</span>`;
        }).join('');

        if (!perksHtml) perksHtml = `<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 800;">Sem Habilidade</span>`;

        let starLabel = p.isStar ? `<span style="font-size: 1.1rem; filter: drop-shadow(0 0 5px rgba(245,158,11,0.8)); margin-left: 4px;">⭐</span>` : '';

        let levelBadge = `<span style="display: inline-flex; align-items: center; padding: 2px 6px; font-size: 0.7rem; font-weight: 900; color: #fff; background: rgba(0,0,0,0.6); border: 1px solid var(--border-light); border-radius: 6px; margin-left: 8px;">Nv <span style="color: var(--accent-green); margin-left: 4px;">${p.level}</span></span>`;

        list.innerHTML += `
            <div class="market-card">
                <div class="card-emoji" style="font-size: 2.2rem;">${p.emoji}</div>
                <div class="market-info">
                    <div class="market-name" style="display:flex; align-items:center;">
                        ${p.name} ${starLabel} ${levelBadge}
                    </div>
                    <div class="market-stats" style="margin-top:8px; display: flex; flex-wrap: wrap; gap: 4px;">
                        ${perksHtml}
                    </div>
                </div>
                <button class="market-buy-btn" ${disabledAttr} onclick="promptReplace(${idx})">${t('MARKET_BTN_BUY')}<br>(${p.price} 💰)</button>
            </div>
        `;
    });
}

function cancelMarket() {
    draftedPlayers = [];
    if (gameState.currentNode && gameState.currentNode.type === 'shop') {
        advanceMapNode();
    } else {
        returnToTitle();
    }
}

function promptReplace(draftIndex) {
    pendingPurchase = draftedPlayers[draftIndex];
    pendingDraftIndex = draftIndex; // Salva de qual posição ele veio

    if (!pendingPurchase) return;
    if (gameState.coins < pendingPurchase.price) return;

    // Removemos a verificação que substituía automaticamente.
    // Agora, o modal de elenco SEMPRE abre para o jogador escolher o substituído.
    document.getElementById('replace-overlay').style.display = 'flex';
    const list = document.getElementById('replace-list');
    list.innerHTML = '';

    gameState.team.forEach((p, i) => {
        list.innerHTML += getPlayerCardHTML(p, `onclick="executePurchase(${i})"`);
    });
}

function closeReplaceModal() {
    pendingPurchase = null;
    pendingDraftIndex = -1;
    document.getElementById('replace-overlay').style.display = 'none';
}

function executePurchase(replaceIndex) {
    if (!pendingPurchase) return;
    if (gameState.coins < pendingPurchase.price) return;

    gameState.coins -= pendingPurchase.price;

    // Substitui o jogador na posição escolhida (ou automática da base)
    gameState.team[replaceIndex] = pendingPurchase;

    // Esgota a carta no mercado para não ser comprada de novo
    if (pendingDraftIndex !== -1) {
        draftedPlayers[pendingDraftIndex] = null;
    }

    pendingPurchase = null;
    pendingDraftIndex = -1;

    progressDailyMission('visit_market', 1);

    closeReplaceModal();
    updateRosterUI();
    saveGame();

    // Redesenha o mercado para atualizar saldo e mostrar a carta "Esgotada"
    showMarketScreen();
}