let pendingClubOptions = [];
let selectedSeriesIndex = 0;

// NOVO: Definição de todas as Séries e Dificuldades
const SERIES_DATA = [
    { id: 0, name: "SÉRIE F", desc: "Futebol Amador. O começo da lenda.", difficulty: 80, rewardBase: 30, color: "#94a3b8" },
    { id: 1, name: "SÉRIE E", desc: "Liga de Bairro. Primeiros desafios reais.", difficulty: 110, rewardBase: 35, color: "#34d399" },
    { id: 2, name: "SÉRIE D", desc: "Divisão Regional. Os times já têm tática.", difficulty: 150, rewardBase: 40, color: "#38bdf8" },
    { id: 3, name: "SÉRIE C", desc: "Cenário Nacional. Jogadores profissionais.", difficulty: 200, rewardBase: 45, color: "#a855f7" },
    { id: 4, name: "SÉRIE B", desc: "Divisão de Acesso. A pressão e técnica sobem.", difficulty: 260, rewardBase: 55, color: "#f59e0b" },
    { id: 5, name: "SÉRIE A", desc: "A Elite do Futebol. Apenas times gigantes.", difficulty: 330, rewardBase: 70, color: "#f87171" },
    { id: 6, name: "SÉRIE S", desc: "Divisão LENDÁRIA. Implacável e cruel.", difficulty: 420, rewardBase: 100, color: "#fbbf24" }
];

async function initGame() {
    try {
        const mechanicsData = await fetch('config_mechanics.json').then(r => r.json());
        const generationData = await fetch('config_generation.json').then(r => r.json());
        const rivalsData = await fetch('config_rivals.json').then(r => r.json());
        const actionsData = await fetch('config_actions.json').then(r => r.json());
        const textsData = await fetch('config_texts.json').then(r => r.json());

        // NOVO: Injetamos nossas Séries no lugar do config_leagues genérico antigo
        GAME_BALANCE = { mechanics: mechanicsData, leagues: SERIES_DATA };
        GAME_CONTENT = {
            clubGeneration: generationData.clubGeneration, players: generationData.players,
            rivalStyles: rivalsData, nodes: actionsData,
            suspenseTexts: textsData.suspenseTexts, logTexts: textsData.logTexts,
            tooltips: textsData.tooltips, howToPlay: textsData.howToPlay
        };

        PERK_LIST = textsData.perks;

        loadSaveData();
        populateHowToPlay();
        document.getElementById('loading-screen').style.display = 'none';
        returnToTitle();

    } catch (e) {
        console.error(e);
        document.getElementById('loading-screen').innerHTML = `
            <div style="padding: 20px; text-align: center; color: #f87171;">
                <h3 style="margin-bottom: 10px;">Erro Crítico de Inicialização</h3>
                <p style="font-size:0.8rem; font-family: monospace;">${e.message}</p>
            </div>`;
    }
}

function startRunFlow() {
    const container = document.getElementById('series-options-container');
    container.innerHTML = '';

    let highestUnlocked = gameState.meta?.highestSeriesUnlocked || 0;

    SERIES_DATA.forEach((series, idx) => {
        let isLocked = idx > highestUnlocked;
        let lockedAttr = isLocked ? 'style="opacity:0.3; filter:grayscale(1); pointer-events:none;"' : '';
        let lockIcon = isLocked ? '🔒' : '🏆';

        container.innerHTML += `
            <div class="club-select-card" ${lockedAttr} onclick="selectSeries(${idx})">
                <div class="club-select-header">
                    <div class="club-select-emoji">${lockIcon}</div>
                    <div class="club-select-name" style="color: ${isLocked ? '#94a3b8' : series.color}">${series.name}</div>
                </div>
                <div class="captain-box" style="justify-content: center; min-height: 80px;">
                    <div style="font-size: 0.85rem; color: #fff; font-weight: 800; text-align: center;">${series.desc}</div>
                </div>
            </div>
        `;
    });

    showScreen('screen-series-select');
}

// NOVO: Ao clicar na série, sorteamos os times e mostramos a próxima tela
function selectSeries(idx) {
    selectedSeriesIndex = idx;
    pendingClubOptions = [];

    let bases = GAME_CONTENT.clubGeneration.bases;
    let adjs = GAME_CONTENT.clubGeneration.adjectives;

    for (let i = 0; i < 3; i++) {
        const base = rnd(bases);
        const adj = rnd(adjs);

        let team = [];
        let captain = generateCaptain();
        team.push(captain);
        for (let j = 0; j < 10; j++) team.push(generateBasePlayer());

        pendingClubOptions.push({
            club: { name: `${base.name} ${adj}`, emoji: base.emoji, isPlayer: true },
            team: team,
            captain: captain
        });
    }

    const container = document.getElementById('club-options-container');
    container.innerHTML = '';

    pendingClubOptions.forEach((option, idx) => {
        const c = option.club;
        const cap = option.captain;

        container.innerHTML += `
            <div class="club-select-card" onclick="chooseClub(${idx})">
                <div class="club-select-header">
                    <div class="club-select-emoji">${c.emoji}</div>
                    <div class="club-select-name">${c.name}</div>
                </div>
                <div class="captain-box">
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 900; letter-spacing: 1px;">⭐ DESTAQUE DA BASE</div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        <div style="font-size: 2.2rem; line-height: 1;">${cap.emoji}</div>
                        <div style="font-weight: 900; color: #fff; font-size: 1rem;">${cap.name} <span style="color: var(--accent-gold);">${cap.rank}</span></div>
                        <div style="font-size: 0.8rem; color: var(--accent-blue); font-weight: 800; margin-top: 4px;">
                            ${cap.perks[0].emoji} ${cap.perks[0].name} & ${cap.perks[1].emoji} ${cap.perks[1].name}
                        </div>
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 8px; font-weight:700; border-top: 1px solid var(--border-light); padding-top: 8px; width: 100%;">+ 10 Atletas da Base</div>
                </div>
            </div>
        `;
    });

    showScreen('screen-club-select');
}

function chooseClub(index) {
    document.body.classList.add('in-run');
    gameState.club = pendingClubOptions[index].club;
    gameState.team = pendingClubOptions[index].team;

    // NOVO: Define a dificuldade do jogo com base na Série escolhida
    gameState.leagueLevel = selectedSeriesIndex;

    gameState.coins = GAME_BALANCE.mechanics.initialCoins;
    startNewSeason();
}

document.addEventListener("DOMContentLoaded", initGame);