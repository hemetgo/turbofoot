let pendingClubOptions = [];

async function initGame() {
    try {
        const mechanicsData = await fetch('config_mechanics.json').then(r => r.json());
        const leaguesData = await fetch('config_leagues.json').then(r => r.json());
        const generationData = await fetch('config_generation.json').then(r => r.json());
        const rivalsData = await fetch('config_rivals.json').then(r => r.json());
        const actionsData = await fetch('config_actions.json').then(r => r.json());
        const textsData = await fetch('config_texts.json').then(r => r.json());

        GAME_BALANCE = { mechanics: mechanicsData, leagues: leaguesData };
        GAME_CONTENT = {
            clubGeneration: generationData.clubGeneration, players: generationData.players,
            rivalStyles: rivalsData, nodes: actionsData,
            suspenseTexts: textsData.suspenseTexts, logTexts: textsData.logTexts,
            tooltips: textsData.tooltips, howToPlay: textsData.howToPlay
        };

        // Carregando as habilidades direto do JSON para a variável global
        PERK_LIST = textsData.perks;

        loadSaveData();
        populateHowToPlay(); // Constrói a aba Como Jogar
        document.getElementById('loading-screen').style.display = 'none';
        returnToTitle();

    } catch (e) {
        console.error(e);
        document.getElementById('loading-screen').innerHTML = `
            <div style="padding: 20px; text-align: center; color: #f87171;">
                <h3 style="margin-bottom: 10px;">Erro Crítico de Inicialização</h3>
                <p style="font-size:0.8rem; font-family: monospace;">${e.message}</p>
                <p style="font-size:0.8rem; margin-top:15px; color:#94a3b8;">Dica: Verifique se todos os arquivos JSON estão na pasta raiz e sem erros de formatação.</p>
            </div>`;
    }
}

function startRunFlow() {
    pendingClubOptions = [];

    // Nova leitura usando as propriedades .bases e .adjectives do JSON
    let bases = GAME_CONTENT.clubGeneration.bases;
    let adjs = GAME_CONTENT.clubGeneration.adjectives;

    for (let i = 0; i < 3; i++) {
        // Sorteia um objeto base inteiro (já vem com nome e emoji blindados juntos)
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
    gameState.leagueLevel = 5;
    gameState.coins = GAME_BALANCE.mechanics.initialCoins;
    startNewSeason();
}

document.addEventListener("DOMContentLoaded", initGame);