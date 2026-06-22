function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(id);
    if (target) {
        target.classList.add("active");

        const scrollAreas = target.querySelectorAll('.club-options-wrapper, .map-wrapper, .market-wrapper, .match-log-container');
        scrollAreas.forEach(area => area.scrollTop = 0);
    }
}

function rndWeighted(items) {
    let totalWeight = items.reduce((sum, item) => sum + (item.weight !== undefined ? item.weight : 1), 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
        let weight = items[i].weight !== undefined ? items[i].weight : 1;
        if (random < weight) {
            return items[i];
        }
        random -= weight;
    }
    return items[items.length - 1];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function shuffle(arr) {
    let array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function calcWinChance(pBase, rBase, rng) {
    const D = rBase - pBase;
    const R = rng;
    let probability = 0;

    if (D <= -R) { probability = 1; }
    else if (D >= R) { probability = 0; }
    else if (D <= 0) { probability = 1 - Math.pow(R + D, 2) / (2 * R * R); }
    else { probability = Math.pow(R - D, 2) / (2 * R * R); }

    let pct = Math.round(probability * 100);
    return clamp(pct, 5, 95);
}

function fitText(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.fontSize = '1.1rem';
    let fontSize = 1.1;
    setTimeout(() => {
        while (el.scrollWidth > el.clientWidth && fontSize > 0.6) {
            fontSize -= 0.05;
            el.style.fontSize = fontSize + 'rem';
        }
    }, 10);
}

function setupMarquee(elId, text) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerText = text;
    el.style.animation = "none";
    el.style.transform = "translateX(0)";
    void el.offsetWidth;
    setTimeout(() => {
        const parent = el.parentElement;
        if (el.scrollWidth > parent.clientWidth) {
            const dist = el.scrollWidth - parent.clientWidth + 10;
            el.style.setProperty('--scroll-dist', `-${dist}px`);
            el.style.animation = "marquee-swing 4s ease-in-out infinite alternate";
        }
    }, 100);
}

function closeModals() {
    document.querySelectorAll(".modal-overlay").forEach(m => m.style.display = 'none');
}

// ==========================================
// MODO DEBUG E RESET DE SAVE
// ==========================================

function hardResetSave() {
    if (confirm("ATENÇÃO: Você vai perder TODO o seu progresso, troféus e divisões liberadas.\n\nTem certeza absoluta?")) {
        localStorage.removeItem("turboFoot_mgr_v7");
        location.reload(); // Recarrega a página do zero
    }
}

// Atalho secreto: Aperte a tecla "\" (Contra-barra) para abrir o console de debug
document.addEventListener('keydown', (e) => {
    if (e.key === '\\') {
        let cmd = prompt("🔧 MODO DEBUG\nComandos: addmeta X, addcoins X, win, unlockall");
        if (!cmd) return;

        let args = cmd.toLowerCase().trim().split(" ");
        let action = args[0];
        let val = parseInt(args[1]) || 0;

        switch (action) {
            case "addmeta":
                if (!gameState.meta) gameState.meta = { metaCoins: 0, upgrades: {} };
                gameState.meta.metaCoins += val;
                saveGame();
                alert(`+${val} Troféus adicionados!`);
                // Se a loja estiver aberta, atualiza ela na hora
                if (document.getElementById('meta-shop-overlay').style.display === 'flex') renderMetaShop();
                break;

            case "addcoins":
                gameState.coins += val;
                updateRosterUI();
                if (document.getElementById('screen-market').classList.contains('active')) showMarketScreen();
                alert(`+${val} 💰 adicionadas!`);
                break;

            case "win":
                // Se estiver dentro de uma partida, injeta gols pro usuário e encerra
                if (document.getElementById('screen-match').classList.contains('active')) {
                    matchState.userScore += 10;
                    endMatchByTime(); // Força o fim do jogo e calcula recompensas
                } else {
                    alert("Você precisa estar dentro de uma partida (no campo) para usar o 'win'.");
                }
                break;

            // NOVO COMANDO: Liberta todas as ligas
            case "unlockall":
                if (!gameState.meta) gameState.meta = { highestSeriesUnlocked: 0, metaCoins: 0, upgrades: {} };

                if (GAME_BALANCE && GAME_BALANCE.leagues) {
                    gameState.meta.highestSeriesUnlocked = GAME_BALANCE.leagues.length - 1;
                    saveGame();
                    alert("🔓 Todas as Ligas/Divisões foram desbloqueadas com sucesso! Volte ao ecrã inicial para ver as opções.");
                } else {
                    alert("Erro: GAME_BALANCE não carregado corretamente.");
                }
                break;

            default:
                alert("Comando não reconhecido. Use:\naddmeta 100\naddcoins 100\nwin\nunlockall");
                break;
        }
    }
});

// ==========================================
// SISTEMA DE TOOLTIP GLOBAL (DELEGAÇÃO)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    let globalTooltip = document.querySelector('.tooltip-global');

    // Cria o elemento se ele não existir
    if (!globalTooltip) {
        globalTooltip = document.createElement("div");
        globalTooltip.className = "tooltip-global";
        document.body.appendChild(globalTooltip);
    }

    const showTooltip = (e) => {
        const target = e.target.closest('[data-tip]');
        if (!target) return;

        const tipText = target.getAttribute('data-tip');
        if (!tipText) return;

        globalTooltip.innerHTML = tipText;
        globalTooltip.classList.add('visible');

        // Calcula posicionamento
        const rect = target.getBoundingClientRect();
        let top = rect.top - globalTooltip.offsetHeight - 8;
        let left = rect.left + (rect.width / 2) - (globalTooltip.offsetWidth / 2);

        // Corrige se sair da tela por cima
        if (top < 10) {
            top = rect.bottom + 8;
        }

        // Corrige se sair pelas laterais
        if (left < 10) left = 10;
        if (left + globalTooltip.offsetWidth > window.innerWidth - 10) {
            left = window.innerWidth - globalTooltip.offsetWidth - 10;
        }

        globalTooltip.style.top = `${top}px`;
        globalTooltip.style.left = `${left}px`;
    };

    const hideTooltip = (e) => {
        // Se saiu do elemento e não entrou em outro tooltip, esconde
        if (!e || !e.relatedTarget || !e.relatedTarget.closest('[data-tip]')) {
            globalTooltip.classList.remove('visible');
        }
    };

    // Vigia eventos no documento todo
    document.addEventListener('mouseover', showTooltip);
    document.addEventListener('mouseout', hideTooltip);

    // Suporte mobile
    document.addEventListener('touchstart', (e) => {
        if (e.target.closest('[data-tip]')) {
            showTooltip(e);
        } else {
            globalTooltip.classList.remove('visible');
        }
    }, { passive: true });
});