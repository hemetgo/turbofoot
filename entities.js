// Função auxiliar nova que gera o "documento de identidade" do jogador
function generateIdentity(isBase = false) {
    // Se NÃO for um perna-de-pau da base, tem 5% de chance de ser um Preset Famoso
    if (!isBase && GAME_CONTENT.presets && GAME_CONTENT.presets.length > 0 && Math.random() < 0.05) {
        let preset = rnd(GAME_CONTENT.presets);
        return { name: preset.name, emoji: preset.face, flag: preset.flag, isPreset: true, presetPerks: preset.perks };
    }

    // Geração procedural de Nome + Sobrenome por Nacionalidade
    let nat = rnd(GAME_CONTENT.names);
    let first = rnd(nat.firstNames);
    let last = rnd(nat.lastNames);
    let face = rnd(nat.faces); // Sorteia o rosto correspondente ao país

    return { name: `${first} ${last}`, emoji: face, flag: nat.flag, isPreset: false };
}

function generatePlayer(level, isPremium = false) {
    let iden = generateIdentity(false);
    let perks = [];
    let isStar = false;

    if (iden.isPreset) {
        perks = iden.presetPerks.map(pId => PERK_LIST.find(p => p.id === pId)).filter(Boolean);
        isStar = true; // Presets são sempre estrelas
    } else {
        // Chance de virar estrela baseada em ser premium ou mercado comum
        let starChance = isPremium ? 0.30 : 0.08;
        isStar = Math.random() < starChance;

        // Estrelas tem muito mais chance de vir com 2 habilidades
        let traitChance = isStar ? 0.80 : (isPremium ? 0.30 : 0.10);
        let numPerks = Math.random() < traitChance ? 2 : 1;
        for (let i = 0; i < numPerks; i++) {
            perks.push(rnd(PERK_LIST));
        }
    }

    let price = 20 + (level * 5);
    if (perks.length === 2) price += 15;
    if (isStar) price += 40; // Estrelas custam bem mais caro

    return {
        id: `p_${Date.now()}_${Math.random()}`,
        name: iden.name,
        emoji: iden.emoji,
        flag: iden.flag,
        level: level, perks: perks, isStar: isStar, price: price
    };
}

function generateCaptain(baseLevel = 1) {
    let iden = generateIdentity(false);
    let perks = [];

    if (iden.isPreset) {
        perks = iden.presetPerks.map(pId => PERK_LIST.find(p => p.id === pId)).filter(Boolean);
    } else {
        perks = [rnd(PERK_LIST), rnd(PERK_LIST)];
    }

    return {
        id: `p_${Date.now()}_${Math.random()}`,
        name: "©️ " + iden.name, // Braçadeira de Capitão
        emoji: iden.emoji,
        flag: iden.flag,
        level: baseLevel + 2, perks: perks, isStar: true, isCaptain: true
    };
}

function generateBasePlayer(baseLevel = 1, numTraits = 0) {
    let iden = generateIdentity(true);
    let perks = [];

    if (numTraits > 0) {
        for (let i = 0; i < numTraits; i++) {
            perks.push(rnd(PERK_LIST));
        }
    }

    return {
        id: `p_${Date.now()}_${Math.random()}`,
        name: iden.name,
        emoji: iden.emoji,
        flag: iden.flag,
        level: baseLevel,
        perks: perks,
        isStar: false, // Jogadores da base são comuns (nunca são estrela)
        isBase: (numTraits === 0)
    };
}

function getPlayerCardHTML(p, onClickAttr = "") {
    let hasTraits = p.perks && p.perks.length > 0;
    let perksHTML = "";
    let dataPerks = "";

    if (hasTraits) {
        dataPerks = p.perks.map(perk => perk.id).join(',');

        let perkCounts = {};
        p.perks.forEach(perk => {
            if (!perkCounts[perk.id]) perkCounts[perk.id] = { ...perk, count: 1 };
            else perkCounts[perk.id].count++;
        });

        // Adicionado: cursor de ajuda (help) e removido overflow que cortava as tooltips!
        let perksArray = Object.values(perkCounts).map(perk => {
            let countLabel = perk.count > 1 ? ` <span style="color:var(--accent-gold); font-weight:900;">(x${perk.count})</span>` : "";
            return `<div data-tip="${perk.desc}" style="position: relative; display: flex; align-items: center; justify-content: center; gap: 4px; background: rgba(0,0,0,0.4); padding: 4px 6px; border-radius: 6px; white-space: nowrap; width: 100%; box-sizing: border-box; cursor: help; z-index: 10;">${perk.emoji} ${perk.name}${countLabel}</div>`;
        });

        perksHTML = `<div style="display: flex; flex-direction: column; width: 100%; gap: 4px;">${perksArray.join('')}</div>`;
    } else {
        perksHTML = `<div style="color:var(--text-muted); width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.4); border-radius: 6px; padding: 4px; box-sizing: border-box; cursor: help; z-index: 10;" data-tip="Não possui bônus de habilidade.">Sem Habilidade</div>`;
    }

    let nameSize = Math.min(0.92, 13 / Math.max(10, p.name.length));

    // Removido o 'overflow: hidden' que decapitava as tooltips e adicionado 'flex: 1' para esticar!
    return `
        <div class="player-card" data-perks="${dataPerks}" ${onClickAttr} style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 10px 8px; width: 100%; height: 100%; min-height: 155px; box-sizing: border-box; flex: 1;">
            
            <div style="position: relative; width: 100%; display: flex; justify-content: center; align-items: flex-start; height: 55px; flex-shrink: 0;">
                <div style="position: absolute; top: 0; left: 0; font-size: 1.5rem; line-height: 1; z-index: 2;">${p.flag || '🏳️'}</div>
                <div class="card-emoji" style="font-size: 2.4rem; line-height: 1; margin: 10px 0 0 0; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); z-index: 1;">${p.emoji}</div>
                <div style="position: absolute; top: 0; right: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; z-index: 2;">
                    <span class="card-lvl" style="padding: 2px 6px; font-size: 0.7rem; font-weight: 900; color: #fff; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">Nv ${p.level}</span>
                    ${p.isStar ? '<span style="font-size: 1.1rem; filter: drop-shadow(0 0 5px rgba(245,158,11,0.8)); line-height: 1;">⭐</span>' : ''}
                </div>
            </div>
            
            <div class="card-name" style="font-size: ${nameSize}rem; text-align: center; width: 100%; font-weight: 900; white-space: nowrap; color: #fff; letter-spacing: -0.5px; margin: auto 0; padding: 0; z-index: 2;">
                ${p.name}
            </div>
            
            <div style="display: flex; flex-direction: column; justify-content: flex-end; width: 100%; font-size: 0.65rem; color: var(--accent-blue); font-weight: 800; min-height: 48px; flex-shrink: 0;">
                ${perksHTML}
            </div>
            
        </div>`;
}

function getPlayerCardHTML(p, onClickAttr = "") {
    let hasTraits = p.perks && p.perks.length > 0;
    let perksHTML = "";
    let dataPerks = "";

    if (hasTraits) {
        dataPerks = p.perks.map(perk => perk.id).join(',');

        let perkCounts = {};
        p.perks.forEach(perk => {
            if (!perkCounts[perk.id]) perkCounts[perk.id] = { ...perk, count: 1 };
            else perkCounts[perk.id].count++;
        });

        let perksArray = Object.values(perkCounts).map(perk => {
            let countLabel = perk.count > 1 ? ` <span style="color:var(--accent-gold); font-weight:900;">(x${perk.count})</span>` : "";
            // position: relative destrava a tooltip e cursor: help indica que é "passável"
            return `<div data-tip="${perk.desc}" style="position: relative; display: flex; align-items: center; justify-content: center; gap: 4px; background: rgba(0,0,0,0.4); padding: 4px 6px; border-radius: 6px; white-space: nowrap; width: 100%; box-sizing: border-box; cursor: help; z-index: 10;">${perk.emoji} ${perk.name}${countLabel}</div>`;
        });

        perksHTML = `<div style="display: flex; flex-direction: column; width: 100%; gap: 4px;">${perksArray.join('')}</div>`;
    } else {
        perksHTML = `<div style="position: relative; color:var(--text-muted); width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.4); border-radius: 6px; padding: 4px; box-sizing: border-box; cursor: help; z-index: 10;" data-tip="Não possui bônus de habilidade.">Sem Habilidade</div>`;
    }

    let nameSize = Math.min(0.92, 13 / Math.max(10, p.name.length));

    // Removido o 'overflow: hidden' que cortava o balãozinho! Adicionado flex: 1 para ocupar espaços.
    return `
        <div class="player-card" data-perks="${dataPerks}" ${onClickAttr} style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 10px 8px; width: 100%; height: 100%; min-height: 155px; box-sizing: border-box; flex: 1; transition: all 0.2s;">
            
            <div style="position: relative; width: 100%; display: flex; justify-content: center; align-items: flex-start; height: 55px; flex-shrink: 0;">
                <div style="position: absolute; top: 0; left: 0; font-size: 1.5rem; line-height: 1; z-index: 2;">${p.flag || '🏳️'}</div>
                <div class="card-emoji" style="font-size: 2.4rem; line-height: 1; margin: 10px 0 0 0; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); z-index: 1;">${p.emoji}</div>
                <div style="position: absolute; top: 0; right: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; z-index: 2;">
                    <span class="card-lvl" style="padding: 2px 6px; font-size: 0.7rem; font-weight: 900; color: #fff; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;">Nv ${p.level}</span>
                    ${p.isStar ? '<span style="font-size: 1.1rem; filter: drop-shadow(0 0 5px rgba(245,158,11,0.8)); line-height: 1;">⭐</span>' : ''}
                </div>
            </div>
            
            <div class="card-name" style="font-size: ${nameSize}rem; text-align: center; width: 100%; font-weight: 900; white-space: nowrap; color: #fff; letter-spacing: -0.5px; margin: auto 0; padding: 0; z-index: 2;">
                ${p.name}
            </div>
            
            <div style="display: flex; flex-direction: column; justify-content: flex-end; width: 100%; font-size: 0.65rem; color: var(--accent-blue); font-weight: 800; min-height: 48px; flex-shrink: 0;">
                ${perksHTML}
            </div>
            
        </div>`;
}

function getSidebarPlayerHTML(p) {
    let hasTraits = p.perks && p.perks.length > 0;
    let perksHTML = "";
    let dataPerks = "";

    if (hasTraits) {
        dataPerks = p.perks.map(perk => perk.id).join(',');
        let perkCounts = {};
        p.perks.forEach(perk => {
            if (!perkCounts[perk.id]) perkCounts[perk.id] = { ...perk, count: 1 };
            else perkCounts[perk.id].count++;
        });

        let perksArray = Object.values(perkCounts).map(perk => {
            let countLabel = perk.count > 1 ? ` (x${perk.count})` : "";
            // Fonte da habilidade restaurada para 0.75rem
            return `<div data-tip="${perk.desc}" style="position: relative; display: flex; align-items: center; gap: 3px; cursor: help; z-index: 10;"><span style="font-size: 0.75rem;">${perk.emoji}</span> <span>${perk.name}${countLabel}</span></div>`;
        });

        perksHTML = `<div style="display: flex; gap: 8px; width: 100%; flex-wrap: wrap;">${perksArray.join('')}</div>`;
    } else {
        perksHTML = `<div style="position: relative; color:var(--text-muted); cursor: help; z-index: 10;" data-tip="Não possui bônus de habilidade.">Sem Habilidade</div>`;
    }

    let isCaptain = p.name.includes("©️");
    let cleanName = p.name.replace("©️ ", "");

    let captainBadge = isCaptain ? `<span style="color:var(--accent-gold); font-size:0.8rem; margin-right: 4px;">©️</span>` : '';
    let starBadge = p.isStar ? `<span style="font-size: 0.9rem; filter: drop-shadow(0 0 5px rgba(245,158,11,0.8)); margin-left: 4px;">⭐</span>` : '';

    // Altura mínima restaurada para 56px (não amassa o texto) e máxima para 70px (preenche espaços vazios)
    return `
        <div class="player-card" data-perks="${dataPerks}" style="display: flex; flex-direction: row; align-items: center; background: rgba(0,0,0,0.25); border: 1px solid var(--border-light); border-radius: 8px; padding: 6px 12px; width: 100%; box-sizing: border-box; flex: 1; min-height: 56px; max-height: 70px; transition: all 0.2s;">
            
            <!-- Bandeira e Rosto (Tamanho restaurado) -->
            <div style="display: flex; align-items: center; justify-content: flex-start; gap: 8px; width: 55px; flex-shrink: 0;">
                <span style="font-size: 1.1rem; line-height: 1;">${p.flag || '🏳️'}</span>
                <span style="font-size: 1.8rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${p.emoji}</span>
            </div>

            <!-- Nome e Habilidades (Fontes originais restauradas) -->
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; margin-left: 4px;">
                <div style="display: flex; align-items: center; margin-bottom: 2px;">
                    ${starBadge}${captainBadge}
                    <span style="font-size: 0.85rem; font-weight: 900; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cleanName}</span>
                </div>
                <div style="font-size: 0.65rem; color: var(--accent-blue); font-weight: 800; width: 100%;">
                    ${perksHTML}
                </div>
            </div>

            <!-- Nível -->
            <div style="flex-shrink: 0; margin-left: 8px;">
                <span style="display: flex; justify-content: center; align-items: center; padding: 3px 8px; font-size: 0.75rem; font-weight: 900; color: #fff; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;">Nv ${p.level}</span>
            </div>
        </div>`;
}

function getTeamPower() {
    // Cada jogador "Estrela" conta como se tivesse +3 níveis na média de força da equipe!
    let totalVirtualLevel = gameState.team.reduce((acc, p) => acc + p.level + (p.isStar ? 3 : 0), 0);
    let avgLevel = totalVirtualLevel / Math.max(1, gameState.team.length);

    let currentLeague = GAME_BALANCE.leagues[gameState.leagueLevel];
    let leagueDiff = currentLeague.difficulty;
    let scale = GAME_BALANCE.mechanics.scaling;

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