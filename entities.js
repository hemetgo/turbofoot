function generatePlayer(level, isPremium = false) {
    const profile = rnd(GAME_CONTENT.players.profiles);
    let roll = Math.random() * 100;
    
    let rankRoll = isPremium ? roll + 30 : roll;
    let rank = (level >= 8 || rankRoll > 90) ? 'S' : (level >= 5 || rankRoll > 70) ? 'A' : (level >= 3 || rankRoll > 40) ? 'B' : 'C';
    
    let perks = [];
    let numPerks = Math.random() > 0.3 ? 2 : 1;
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

function generateCaptain() {
    const profile = rnd(GAME_CONTENT.players.profiles);
    let shuffledPerks = [rnd(PERK_LIST), rnd(PERK_LIST)];
    
    return {
        id: `p_${Date.now()}_${Math.random()}`, 
        name: "⭐ " + profile.name, 
        emoji: profile.emoji,
        level: 4, perks: shuffledPerks, rank: 'S'
    };
}

function generateBasePlayer() {
    const baseProfile = rnd(GAME_CONTENT.players.baseProfiles);
    return {
        id: `p_${Date.now()}_${Math.random()}`, 
        name: baseProfile.name, 
        emoji: baseProfile.emoji,
        level: 1, perks: [], rank: 'C', isBase: true
    };
}

function getRankColor(rank) {
    if (rank === 'S') return 'var(--accent-gold)'; if (rank === 'A') return '#a855f7';
    if (rank === 'B') return 'var(--accent-blue)'; return 'var(--text-muted)';
}

function getPlayerCardHTML(p, onClickAttr = "") {
    let rColor = getRankColor(p.rank);
    let isBaseClass = p.isBase ? 'base-player' : '';
    
    // Animação de Level Up
    let levelUpClass = p.justLeveledUp ? 'level-up-flash' : '';
    if (p.justLeveledUp) p.justLeveledUp = false;

    let perksHTML = "";
    let dataPerks = "";

    if (p.perks && p.perks.length > 0) {
        dataPerks = p.perks.map(perk => perk.id).join(',');
        
        let perkCounts = {};
        p.perks.forEach(perk => {
            if(!perkCounts[perk.id]) perkCounts[perk.id] = { ...perk, count: 1 };
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
        <div class="player-card ${isBaseClass} ${levelUpClass}" data-perks="${dataPerks}" ${onClickAttr}>
            <div class="card-badge" style="z-index:5;">Lvl ${p.level} • <span style="color:${rColor}; font-weight:900;">${p.rank}</span></div>
            <div class="card-emoji">${p.emoji}</div>
            <div class="card-name">${p.name}</div>
            <div class="card-stats">${perksHTML}</div>
        </div>`;
}

function getTeamPower() { 
    return { 
        atk: gameState.team.reduce((acc, p) => acc + (p.level * 3 + 10), 0), 
        def: gameState.team.reduce((acc, p) => acc + (p.level * 3 + 10), 0) 
    }; 
}

function getRivalTraitBonus(node, rival) {
    if (!rival.perks) return 0;
    let bonus = 0;
    let leagueDiff = GAME_BALANCE.leagues[gameState.leagueLevel]?.difficulty || 200;
    let traitPower = Math.floor(leagueDiff * 0.10); 
    
    rival.perks.forEach(perk => {
        if (perk.id === 'finishing' && node.type === 'shoot') bonus += traitPower;
        if (perk.id === 'passing' && node.type === 'atk') bonus += traitPower;
        if (perk.id === 'tackling' && node.type === 'def') bonus += traitPower;
        if (perk.id === 'reflexes' && node.type === 'save') bonus += traitPower;
        if (perk.id === 'pace' && node.riskLevel === 'high') bonus += traitPower;
    }); return bonus;
}

function getTeamTraits() {
    let counts = { finishing: 0, passing: 0, pace: 0, tackling: 0, marking: 0, reflexes: 0, growth: 0 };
    gameState.team.forEach(p => { if (p.perks) p.perks.forEach(perk => { if (counts[perk.id] !== undefined) counts[perk.id]++; }); });
    return counts;
}

function getTraitBonusForNode(node, traits) {
    let bonus = 0;
    let traitMultiplier = 8;
    
    if (node.type === 'shoot') bonus += traits.finishing * traitMultiplier; 
    if (node.type === 'atk') bonus += traits.passing * traitMultiplier;
    if (node.type === 'def') bonus += traits.tackling * traitMultiplier; 
    if (node.type === 'save') bonus += traits.reflexes * traitMultiplier;
    if (node.riskLevel === 'high') bonus += traits.pace * traitMultiplier;
    
    return bonus;
}