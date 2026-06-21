function generatePlayer(level, isPremium = false) {
    const profile = rnd(GAME_CONTENT.players.profiles);
    let roll = Math.random() * 100;

    let rankRoll = isPremium ? roll + 30 : roll;
    let rank = (level >= 8 || rankRoll > 90) ? 'S' : (level >= 5 || rankRoll > 70) ? 'A' : (level >= 3 || rankRoll > 40) ? 'B' : 'C';

    let perks = [];

    // NOVO: 30% chance se for Premium, 10% chance se for normal
    let traitChance = isPremium ? 0.30 : 0.10;
    let numPerks = Math.random() < traitChance ? 2 : 1;

    for (let i = 0; i < numPerks; i++) {
        perks.push(rnd(PERK_LIST));
    }

    let price = 20 + (level * 5);
    if (numPerks === 2) price += 15;
    if (rank === 'S') price += 40;
    else if (rank === 'A') price += 20;
    else if (rank === 'B') price += 10;

    return {
        id: `p_${Date.now()}_${Math.random()}`,
        name: profile.name,
        emoji: profile.emoji,
        level: level, perks: perks, rank: rank, price: price
    };
}

function generateCaptain(baseLevel = 1) {
    const profile = rnd(GAME_CONTENT.players.profiles);
    let shuffledPerks = [rnd(PERK_LIST), rnd(PERK_LIST)];

    return {
        id: `p_${Date.now()}_${Math.random()}`,
        name: "⭐ " + profile.name,
        emoji: profile.emoji,
        level: baseLevel + 2, perks: shuffledPerks, rank: 'S', isCaptain: true
    };
}

function generateBasePlayer(baseLevel = 1, numTraits = 0) {
    let profile;
    let perks = [];
    let rank = 'C';

    if (numTraits > 0) {
        // Se tem habilidade, é um craque da base! Pega os nomes da lista boa.
        profile = rnd(GAME_CONTENT.players.profiles);

        for (let i = 0; i < numTraits; i++) {
            perks.push(rnd(PERK_LIST));
        }

        rank = numTraits === 2 ? 'A' : 'B';
    } else {
        // Sem habilidade, é o jogador cru/ruim da base. Pega os nomes zueiros.
        profile = rnd(GAME_CONTENT.players.baseProfiles);
    }

    return {
        id: `p_${Date.now()}_${Math.random()}`,
        name: profile.name,
        emoji: profile.emoji,
        level: baseLevel,
        perks: perks,
        rank: rank,
        isBase: (numTraits === 0) // Só recebe estilo visual cinza se não tiver traits
    };
}

function getRankColor(rank) {
    if (rank === 'S') return 'var(--accent-gold)'; if (rank === 'A') return '#a855f7';
    if (rank === 'B') return 'var(--accent-blue)'; return 'var(--text-muted)';
}

function getPlayerCardHTML(p, onClickAttr = "") {
    let rColor = getRankColor(p.rank);
    let hasTraits = p.perks && p.perks.length > 0;
    let isBaseClass = (p.isBase && !hasTraits) ? 'base-player' : '';

    let perksHTML = "";
    let dataPerks = "";

    if (hasTraits) {
        dataPerks = p.perks.map(perk => perk.id).join(',');

        let perkCounts = {};
        p.perks.forEach(perk => {
            if (!perkCounts[perk.id]) perkCounts[perk.id] = { ...perk, count: 1 };
            else perkCounts[perk.id].count++;
        });

        Object.values(perkCounts).forEach(perk => {
            let countLabel = perk.count > 1 ? ` <span style="color:var(--accent-gold); font-weight:900;">(x${perk.count})</span>` : "";
            perksHTML += `<div class="card-perk" data-tip="${perk.desc}">${perk.emoji} ${perk.name}${countLabel}</div>`;
        });
    } else {
        perksHTML = `<div class="card-perk" style="color:var(--text-muted); justify-content:center;" data-tip="Não possui bônus de habilidade.">Sem Habilidade</div>`;
    }

    return `
        <div class="player-card ${isBaseClass}" data-perks="${dataPerks}" ${onClickAttr}>
            <div class="card-header-stats">
                <span class="card-lvl">Nv ${p.level}</span>
                <span class="card-rank" style="color:${rColor}; text-shadow: 0 0 5px ${rColor}40;">${p.rank}</span>
            </div>
            <div class="card-emoji">${p.emoji}</div>
            <div class="card-name">${p.name}</div>
            <div class="card-stats">${perksHTML}</div>
        </div>`;
}

function getTeamPower() {
    let avgLevel = gameState.team.reduce((acc, p) => acc + p.level, 0) / Math.max(1, gameState.team.length);
    let currentLeague = GAME_BALANCE.leagues[gameState.leagueLevel];
    let leagueDiff = currentLeague.difficulty;
    let scale = GAME_BALANCE.mechanics.scaling;

    // Agora o multiplicador base é puxado especificamente da Liga atual!
    let baseP = leagueDiff * currentLeague.playerBaseMult;
    let levelP = leagueDiff * (avgLevel / 10) * scale.playerLevelMaxMult;
    let total = Math.floor(baseP + levelP);

    return { atk: total, def: total };
}

function getRivalTraitBonus(node, rival) {
    if (!rival.perks) return 0;
    let bonus = 0;
    let leagueDiff = GAME_BALANCE.leagues[gameState.leagueLevel].difficulty;
    let traitPower = Math.floor(leagueDiff * GAME_BALANCE.mechanics.scaling.traitPowerMult);

    rival.perks.forEach(perk => {
        // Verifica a sinergia única
        if (node.synergy && perk.id === node.synergy) {
            bonus += traitPower;
        }
    });
    return bonus;
}

function getTeamTraits() {
    let counts = { finishing: 0, passing: 0, pace: 0, tackling: 0, marking: 0, reflexes: 0 };
    gameState.team.forEach(p => {
        let weight = p.isCaptain ? 1.2 : 1.0;
        if (p.perks) p.perks.forEach(perk => {
            if (counts[perk.id] !== undefined) counts[perk.id] += weight;
        });
    });
    return counts;
}

function getTraitBonusForNode(node, traits) {
    let leagueDiff = GAME_BALANCE.leagues[gameState.leagueLevel].difficulty;
    let traitPower = Math.floor(leagueDiff * GAME_BALANCE.mechanics.scaling.traitPowerMult);
    let bonus = 0;

    // Bônus aplicado a partir da sinergia única do JSON
    if (node.synergy && traits[node.synergy]) {
        bonus += traits[node.synergy] * traitPower;
    }

    return bonus;
}