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

    document.getElementById('market-title').innerText = "MERCADO DA BOLA";
    document.getElementById('market-sub').innerText = "Invista suas moedas para fortalecer o elenco.";

    draftedPlayers.forEach((p, idx) => {
        if (!p) {
            // Renderiza corretamente o Slot Esgotado
            list.innerHTML += `
            <div class="market-card" style="opacity:0.5; filter:grayscale(1);">
                <div class="card-emoji" style="font-size: 2.2rem;">❌</div>
                <div class="market-info">
                    <div class="market-name" style="color:var(--text-muted);">Esgotado</div>
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
            let countLabel = perk.count > 1 ? ` <b style="color:var(--accent-gold);">(x${perk.count})</b>` : "";
            return `<span data-tip="${perk.desc}" style="display:inline-flex; align-items:center; gap:4px;">${perk.emoji} ${perk.name}${countLabel}</span>`;
        }).join(' <span style="color:var(--border-light)">|</span> ');

        if (!perksHtml) perksHtml = `<span style="color:var(--text-muted);">Sem Habilidade</span>`;

        let starLabel = p.isStar ? `<span style="font-size: 1.1rem; filter: drop-shadow(0 0 5px rgba(245,158,11,0.8)); margin-left: 4px;">⭐</span>` : '';

        list.innerHTML += `
            <div class="market-card">
                <div class="card-emoji" style="font-size: 2.2rem;">${p.emoji}</div>
                <div class="market-info">
                    <div class="market-name" style="display:flex; align-items:center;">
                        ${p.name} ${starLabel} 
                        <small style="color:var(--text-muted); font-weight:700; margin-left: 8px; background:rgba(0,0,0,0.4); padding:2px 6px; border-radius:4px;">Nv ${p.level}</small>
                    </div>
                    <div class="market-stats" style="margin-top:4px; font-size:0.75rem;">
                        ${perksHtml}
                    </div>
                </div>
                <button class="market-buy-btn" ${disabledAttr} onclick="promptReplace(${idx})">COMPRAR<br>(${p.price} 💰)</button>
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

    // Verifica se tem jogador base para substituição automática
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

    closeReplaceModal();
    updateRosterUI();
    saveGame();

    // Redesenha o mercado para atualizar saldo e mostrar a carta "Esgotada"
    showMarketScreen();
}