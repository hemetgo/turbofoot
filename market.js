let draftedPlayers = [];
let pendingPurchase = null;

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

    // Atualizamos os títulos
    document.getElementById('market-title').innerText = "MERCADO DA BOLA";
    document.getElementById('market-sub').innerText = "Invista suas moedas para fortalecer o elenco.";

    draftedPlayers.forEach((p, idx) => {
        let disabledAttr = (gameState.coins < p.price) ? "disabled" : "";

        // Agrupa fundamentos visualmente no mercado
        let perkCounts = {};
        p.perks.forEach(perk => {
            if (!perkCounts[perk.id]) perkCounts[perk.id] = { ...perk, count: 1 };
            else perkCounts[perk.id].count++;
        });

        let perksHtml = Object.values(perkCounts).map(perk => {
            let countLabel = perk.count > 1 ? ` <b style="color:var(--accent-gold);">(x${perk.count})</b>` : "";
            return `<span data-tip="${perk.desc}">${perk.emoji} ${perk.name}${countLabel}</span>`;
        }).join('');

        list.innerHTML += `
            <div class="market-card">
                <div class="card-emoji">${p.emoji}</div>
                <div class="market-info">
                    <div class="market-name">${p.name} <span style="color:${getRankColor(p.rank)}">${p.rank}</span> <small style="color:var(--text-muted);font-weight:700">Lvl ${p.level}</small></div>
                    <div class="market-stats">
                        ${perksHtml}
                    </div>
                </div>
                <button class="market-buy-btn" ${disabledAttr} onclick="promptReplace(${idx})">COMPRAR (${p.price} 💰)</button>
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
    if (gameState.coins < pendingPurchase.price) return;

    // NOVO: Verifica se tem jogador base para substituição automática
    let baseIndex = gameState.team.findIndex(p => p.isBase);
    if (baseIndex !== -1) {
        executePurchase(baseIndex);
        return;
    }

    // Se não tiver base, abre o modal de escolha
    document.getElementById('replace-overlay').style.display = 'flex';
    const list = document.getElementById('replace-list');
    list.innerHTML = '';

    gameState.team.forEach((p, i) => {
        list.innerHTML += getPlayerCardHTML(p, `onclick="executePurchase(${i})"`);
    });
}

function closeReplaceModal() {
    pendingPurchase = null;
    document.getElementById('replace-overlay').style.display = 'none';
}

function executePurchase(replaceIndex) {
    if (!pendingPurchase) return;
    if (gameState.coins < pendingPurchase.price) return;
    gameState.coins -= pendingPurchase.price;

    // Substitui o jogador na posição escolhida (ou automática da base)
    gameState.team[replaceIndex] = pendingPurchase;

    pendingPurchase = null;
    draftedPlayers = [];

    closeReplaceModal();
    updateRosterUI();
    saveGame();
    advanceMapNode();
}