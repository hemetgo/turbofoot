const IS_DESKTOP = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
let GAME_BALANCE = {}; let GAME_CONTENT = {};

let gameState = {
    meta: { highestSeriesUnlocked: 0, metaCoins: 0, upgrades: {} },
    coins: 0, leagueLevel: 5, club: null, team: [], activeCampBuff: 0, currentNode: null,
    settings: { showSuspense: true, requireConfirm: !IS_DESKTOP },
    season: { number: 1, map: [], currentStage: 0, history: [], matchHistory: [] },
    runHistory: [],
    tutorialSeen: false
};

let matchState = {
    userScore: 0, rivalScore: 0, combo: 0, momentum: 0, hasBall: true, zone: 2,
    rivalProfile: null, rivalTeamRef: null, nextBuff: 0, totalActions: 10, currentAction: 0, badLuckCounter: 0
};

let PERK_LIST = [];

function loadSaveData() {
    // Troca os localStorage pelo getSafeStorage()
    if (getSafeStorage().getItem("turboFoot_mgr_v7")) {
        try {
            let saved = JSON.parse(getSafeStorage().getItem("turboFoot_mgr_v7"));
            gameState = { ...gameState, ...saved };

            // Corrige saves antigos que não tinham o requireConfirm salvo
            if (typeof gameState.settings.requireConfirm === "undefined") {
                gameState.settings.requireConfirm = !IS_DESKTOP;
            }

            // --- NOVO: Preferências de Áudio ---
            if (typeof gameState.settings.musicOn === "undefined") gameState.settings.musicOn = true;
            if (typeof gameState.settings.sfxOn === "undefined") gameState.settings.sfxOn = true;

            if (!gameState.meta) gameState.meta = { highestSeriesUnlocked: 0, metaCoins: 0, upgrades: {} };
            if (!gameState.meta.metaCoins) gameState.meta.metaCoins = 0;
            if (!gameState.meta.upgrades) gameState.meta.upgrades = {};
        } catch (e) { }
    } else {
        gameState.coins = GAME_BALANCE.mechanics?.initialCoins || 0;
        // BEM AQUI ESTAVA O BUG: Estávamos sobrescrevendo a configuração padrão!
        gameState.settings = { showSuspense: true, requireConfirm: !IS_DESKTOP, musicOn: true, sfxOn: true };
    }

    if (!gameState.season.history) gameState.season.history = [];
    if (!gameState.season.matchHistory) gameState.season.matchHistory = [];
    if (!gameState.runHistory) gameState.runHistory = [];
    if (typeof gameState.activeCampBuff === "undefined") gameState.activeCampBuff = 0;
    if (typeof gameState.tutorialSeen === "undefined") gameState.tutorialSeen = false;
}

function saveGame() {
    localStorage.setItem("turboFoot_mgr_v7", JSON.stringify(gameState));
    saveAllClubs();
}