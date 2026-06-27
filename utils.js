function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(id);
    if (target) {
        target.classList.add("active");
        const scrollAreas = target.querySelectorAll('.club-options-wrapper, .market-wrapper, .match-log-container');
        scrollAreas.forEach(area => area.scrollTop = 0);
    }

    if (['screen-map', 'screen-match'].includes(id)) {
        document.body.classList.add('in-run');
    } else {
        document.body.classList.remove('in-run');
    }

    // Chama o gerenciador do novo header
    updateGlobalHeader(id);
}

function updateGlobalHeader(id) {
    const header = document.getElementById('global-header');
    if (!header) return;

    const backBtn = document.getElementById('global-header-back');
    const title = document.getElementById('global-header-title');
    const clubInfo = document.getElementById('global-header-club');
    const currencyContainer = document.getElementById('global-header-currency');
    const coinsVal = document.getElementById('global-header-coins-val');

    header.style.display = 'flex';
    backBtn.style.visibility = 'hidden';
    backBtn.onclick = null;
    clubInfo.style.display = 'none';

    // Helper para buscar o nome traduzido do clube com segurança
    function getClubName(name) {
        if (typeof tClub === 'function') return tClub(name);
        if (typeof t === 'function' && t(name) !== name) return t(name);
        return name;
    }

    // Controle de Título: Clube ou Nome do Jogo
    if (gameState.club && activeSaveIndex !== -1 && id !== 'screen-club-selection' && id !== 'screen-create-club') {
        clubInfo.style.display = 'block';
        title.style.color = 'var(--accent-gold)';
        title.style.fontSize = '0.75rem';

        if (id === 'screen-title') {
            // NO HUB: O Header exibe TURBOFOOT
            clubInfo.innerText = typeof t === 'function' ? ('🏆 ' + t('TITLE_GAME_NAME') || "⚽ TURBOFOOT") : "⚽ TURBOFOOT";
        } else {
            // NAS OUTRAS TELAS: O Header exibe o Time
            clubInfo.innerText = `${gameState.club.emoji} ${getClubName(gameState.club.name)}`;
        }
    } else {
        title.style.color = 'var(--text-main)';
        title.style.fontSize = '1.1rem';
    }

    // Atualiza saldo financeiro visualmente
    if (coinsVal) {
        coinsVal.innerText = gameState.coins || 0;
    }

    switch (id) {
        case 'screen-club-selection':
            title.setAttribute('data-i18n', 'SCREEN_SELECT_CLUB');
            title.innerText = typeof t === 'function' ? t('SCREEN_SELECT_CLUB') : "SELECIONE SEU CLUBE";
            currencyContainer.style.display = 'none';
            break;
        case 'screen-create-club':
            title.setAttribute('data-i18n', 'SCREEN_CREATE_CLUB');
            title.innerText = typeof t === 'function' ? t('SCREEN_CREATE_CLUB') : "CRIAR CLUBE";
            currencyContainer.style.display = 'none';
            backBtn.style.visibility = 'visible';
            backBtn.onclick = () => showScreen('screen-club-selection');
            break;
        case 'screen-title':
            // HEADER DO HUB
            title.removeAttribute('data-i18n');
            title.innerText = typeof t === 'function' ? (t('TITLE_SUBTITLE') || "MANAGER ROGUELITE") : "MANAGER ROGUELITE";
            currencyContainer.style.display = 'block';
            backBtn.style.visibility = 'hidden';

            // INJETA O CLUBE EM DESTAQUE NO MEIO DA TELA
            const hubClubInfo = document.getElementById('hub-club-info');
            if (hubClubInfo && gameState.club) {
                hubClubInfo.innerHTML = `
                    <div style="font-size: 7rem; margin-bottom: 8px; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.4)); line-height: 1;">${gameState.club.emoji}</div>
                    <div style="letter-spacing: 1px; padding-top: 16px">${getClubName(gameState.club.name)}</div>
                `;
            }
            break;
        case 'screen-squad':
            title.setAttribute('data-i18n', 'LABEL_SQUAD_TITLE');
            title.innerText = typeof t === 'function' ? t('LABEL_SQUAD_TITLE') : "GESTÃO DO ELENCO";
            currencyContainer.style.display = 'block';
            backBtn.style.visibility = 'visible';
            backBtn.onclick = () => returnToHub();
            break;
        case 'screen-series-select':
            title.setAttribute('data-i18n', 'LABEL_CHOOSE_DIVISION');
            title.innerText = typeof t === 'function' ? t('LABEL_CHOOSE_DIVISION') : "ESCOLHA A DIVISÃO";
            currencyContainer.style.display = 'block';
            backBtn.style.visibility = 'visible';
            backBtn.onclick = () => returnToHub();
            break;
        case 'screen-map':
            title.removeAttribute('data-i18n');
            let currentLeagueName = GAME_BALANCE.leagues && GAME_BALANCE.leagues[gameState.leagueLevel] ? GAME_BALANCE.leagues[gameState.leagueLevel].name : "LIGA";
            let leagueEmoji = GAME_BALANCE.leagues && GAME_BALANCE.leagues[gameState.leagueLevel] ? GAME_BALANCE.leagues[gameState.leagueLevel].emoji : "🏆";
            title.innerText = `${leagueEmoji} ${typeof t === 'function' ? t(currentLeagueName) : currentLeagueName}`;
            currencyContainer.style.display = 'block';
            backBtn.style.visibility = 'visible';
            backBtn.onclick = () => openQuitConfirm();
            break;
        case 'screen-market':
            title.setAttribute('data-i18n', 'LABEL_MARKET_TITLE');
            title.innerText = typeof t === 'function' ? t('LABEL_MARKET_TITLE') : "MERCADO DA BOLA";
            currencyContainer.style.display = 'block';
            backBtn.style.visibility = 'visible';
            backBtn.onclick = () => cancelMarket();
            break;
        case 'screen-match':
            header.style.display = 'none';
            break;
        default:
            header.style.display = 'none';
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

function setupMarquee(elId, text, isReverse = false) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerText = text;

    // Limpa animações nativas anteriores (se houver)
    el.getAnimations().forEach(anim => anim.cancel());
    el.style.transform = "translateX(0)";
    void el.offsetWidth;

    setTimeout(() => {
        const parent = el.parentElement;
        if (el.scrollWidth > parent.clientWidth) {
            const dist = el.scrollWidth - parent.clientWidth + 10;
            // Se isReverse for true, ele puxa o texto para o lado oposto para exibir o que cortou!
            let move = isReverse ? `${dist}px` : `-${dist}px`;

            el.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(0)', offset: 0.15 },
                { transform: `translateX(${move})`, offset: 0.85 },
                { transform: `translateX(${move})` }
            ], {
                duration: 4000,
                iterations: Infinity,
                direction: 'alternate',
                easing: 'ease-in-out'
            });
        }
    }, 100);
}

function closeModals() {
    document.querySelectorAll(".modal-overlay").forEach(m => m.style.display = 'none');
}

function hardResetSave() {
    if (confirm(t('TEXT_HARD_RESET_CONFIRM'))) {
        localStorage.removeItem("turboFoot_mgr_v7");
        location.reload();
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === '\\') {
        let cmd = prompt(t('DEBUG_PROMPT'));
        if (!cmd) return;

        let args = cmd.toLowerCase().trim().split(" ");
        let action = args[0];
        let val = parseInt(args[1]) || 0;

        switch (action) {
            case "addmeta":
                if (!gameState.meta) gameState.meta = { metaCoins: 0, upgrades: {} };
                gameState.meta.metaCoins += val;
                saveGame();
                alert(t('DEBUG_TROPHIES_ADDED', { val }));
                if (document.getElementById('meta-shop-overlay').style.display === 'flex') renderMetaShop();
                break;
            case "addcoins":
                gameState.coins += val;
                updateRosterUI();
                if (document.getElementById('screen-market').classList.contains('active')) showMarketScreen();
                alert(t('DEBUG_COINS_ADDED', { val }));
                break;
            case "win":
                if (document.getElementById('screen-match').classList.contains('active')) {
                    matchState.userScore += 10;
                    endMatchByTime();
                } else {
                    alert(t('DEBUG_MATCH_REQUIRED'));
                }
                break;
            case "unlockall":
                if (!gameState.meta) gameState.meta = { highestSeriesUnlocked: 0, metaCoins: 0, upgrades: {} };
                if (GAME_BALANCE && GAME_BALANCE.leagues) {
                    gameState.meta.highestSeriesUnlocked = GAME_BALANCE.leagues.length - 1;
                    saveGame();
                    alert(t('DEBUG_UNLOCK_ALL'));
                }
                break;
            default:
                alert(t('DEBUG_UNKNOWN_COMMAND'));
                break;
        }
    }
});

document.addEventListener("DOMContentLoaded", () => {
    let globalTooltip = document.querySelector('.tooltip-global');
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
        const rect = target.getBoundingClientRect();
        let top = rect.top - globalTooltip.offsetHeight - 8;
        let left = rect.left + (rect.width / 2) - (globalTooltip.offsetWidth / 2);
        if (top < 10) top = rect.bottom + 8;
        if (left < 10) left = 10;
        if (left + globalTooltip.offsetWidth > window.innerWidth - 10) {
            left = window.innerWidth - globalTooltip.offsetWidth - 10;
        }
        globalTooltip.style.top = `${top}px`;
        globalTooltip.style.left = `${left}px`;
    };

    const hideTooltip = (e) => {
        if (!e || !e.relatedTarget || !e.relatedTarget.closest('[data-tip]')) {
            globalTooltip.classList.remove('visible');
        }
    };

    document.addEventListener('mouseover', showTooltip);
    document.addEventListener('mouseout', hideTooltip);
    document.addEventListener('touchstart', (e) => {
        if (e.target.closest('[data-tip]')) showTooltip(e);
        else globalTooltip.classList.remove('visible');
    }, { passive: true });
});

let alertCallback = null;

function showCustomAlert(title, message, callback = null) {
    if (typeof playSFX === 'function') playSFX('error');
    document.getElementById('alert-title').innerText = title;

    // Suporte para i18n ou texto direto
    let finalMessage = typeof t === 'function' ? (t(message) !== message ? t(message) : message) : message;
    document.getElementById('alert-message').innerText = finalMessage;

    alertCallback = callback;
    document.getElementById('alert-overlay').style.display = 'flex';
}

function closeAlertModal() {
    document.getElementById('alert-overlay').style.display = 'none';
    if (alertCallback) {
        alertCallback();
        alertCallback = null;
    }
}