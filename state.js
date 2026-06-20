const IS_DESKTOP = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
let GAME_BALANCE = {}; let GAME_CONTENT = {};

let gameState = {
    meta: { highestSeriesUnlocked: 0 }, // NOVO: Armazena o meta-progresso (0 = Série F, 6 = Série S)
    coins: 0, leagueLevel: 0, club: null, team: [], activeCampBuff: 0, currentNode: null,
    settings: { showSuspense: true, requireConfirm: !IS_DESKTOP },
    season: { number: 1, map: [], currentStage: 0, history: [], matchHistory: [] },
    runHistory: [] 
};

let matchState = {
    userScore: 0, rivalScore: 0, combo: 0, momentum: 0, hasBall: true, zone: 2, 
    rivalProfile: null, rivalTeamRef: null, nextBuff: 0, totalActions: 10, currentAction: 0, badLuckCounter: 0
};

let PERK_LIST = [];

function loadSaveData() {
    if (localStorage.getItem("turboFoot_mgr_v7")) {
        try { 
            let saved = JSON.parse(localStorage.getItem("turboFoot_mgr_v7")); 
            // Faz um merge para manter a compatibilidade de saves antigos com o novo sistema meta
            gameState = { ...gameState, ...saved };
            if (!gameState.meta) gameState.meta = { highestSeriesUnlocked: 0 };
        } catch (e) { }
    } else {
        gameState.coins = GAME_BALANCE.mechanics?.initialCoins || 0;
        gameState.settings = { showSuspense: true };
        gameState.meta = { highestSeriesUnlocked: 0 };
    }
    
    if (!gameState.season.history) gameState.season.history = [];
    if (!gameState.season.matchHistory) gameState.season.matchHistory = [];
    if (!gameState.runHistory) gameState.runHistory = [];
    if (typeof gameState.activeCampBuff === "undefined") gameState.activeCampBuff = 0;
}

function saveGame() { localStorage.setItem("turboFoot_mgr_v7", JSON.stringify(gameState)); }