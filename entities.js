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
            perks.push(rndWeighted(PERK_LIST));
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

function generateBasePlayer(baseLevel = 1, numTraits = 0, focusTraitId = null, focusChance = 0) {
    let iden = generateIdentity(true);
    let perks = [];

    if (numTraits > 0) {
        for (let i = 0; i < numTraits; i++) {
            // ESCOLA DE TALENTOS (meta): puxa o trait do DNA da base.
            let alreadyHasFocus = perks.some(p => p.id === focusTraitId);
            if (focusTraitId && !alreadyHasFocus && Math.random() < focusChance) {
                let focusPerk = PERK_LIST.find(p => p.id === focusTraitId);
                if (focusPerk) {
                    perks.push(focusPerk);
                    continue;
                }
            }
            perks.push(rndWeighted(PERK_LIST));
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

        let perksArray = Object.values(perkCounts).map(perk => {
            let countLabel = perk.count > 1 ? ` <span style="color:var(--accent-gold); font-weight:900;">x${perk.count}</span>` : "";
            // Tags redesenhadas para casar com a tela de seleção de clubes
            return `<div data-tip="${perk.desc}" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: rgba(0,0,0,0.4); padding: 4px 6px; border-radius: 6px; border: 1px solid var(--border-light); font-size: 0.75rem; font-weight: 800; white-space: nowrap; width: 100%; color: #e2e8f0; pointer-events: auto;">${perk.emoji} ${perk.name}${countLabel}</div>`;
        });

        perksHTML = `<div style="display: flex; flex-direction: column; width: 100%; gap: 4px; z-index: 10;">${perksArray.join('')}</div>`;
    } else {
        perksHTML = `<div data-tip="Não possui bônus de habilidade." style="display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.2); border: 1px dashed var(--border-light); border-radius: 6px; padding: 4px; font-size: 0.75rem; color: var(--text-muted); width: 100%; height: 100%; pointer-events: auto;">Sem Habilidade</div>`;
    }

    let nameSize = Math.min(0.85, 12 / Math.max(10, p.name.length));
    let starBadge = p.isStar ? `<div style="position: absolute; top: -8px; right: -8px; font-size: 1.4rem; filter: drop-shadow(0 0 5px rgba(245,158,11,0.8)); z-index: 5;">⭐</div>` : '';

    return `
        <div class="player-card" data-perks="${dataPerks}" ${onClickAttr} style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 12px; width: 100%; min-height: 160px; box-sizing: border-box; position: relative; flex: 1; transition: all 0.2s;">
            
            ${starBadge}
            
            <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-size: 1.2rem; line-height: 1; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));">${p.flag || '🏳️'}</div>
                <div style="padding: 2px 6px; font-size: 0.7rem; font-weight: 900; color: #fff; background: rgba(0,0,0,0.6); border: 1px solid var(--border-light); border-radius: 6px;">Nv <span style="color: var(--accent-green);">${p.level}</span></div>
            </div>
            
            <div class="card-emoji" style="font-size: 3rem; line-height: 1; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); margin: 0 0 8px 0;">${p.emoji}</div>
            
            <div class="card-name" style="font-size: ${nameSize}rem; text-align: center; width: 100%; font-weight: 900; color: #fff; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 12px; letter-spacing: -0.5px;">
                ${p.name}
            </div>
            
            <div style="width: 100%; margin-top: auto;">
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
            let countLabel = perk.count > 1 ? ` <span style="color:var(--accent-gold);">x${perk.count}</span>` : "";
            return `<div data-tip="${perk.desc}" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.7rem; background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-light); pointer-events: auto;">${perk.emoji} ${perk.name}${countLabel}</div>`;
        });

        perksHTML = `<div style="display: flex; gap: 4px; flex-wrap: wrap;">${perksArray.join('')}</div>`;
    } else {
        perksHTML = `<div data-tip="Não possui bônus de habilidade." style="font-size: 0.7rem; color: var(--text-muted); pointer-events: auto;">Sem Habilidade</div>`;
    }

    let starBadge = p.isStar ? `<span style="font-size: 0.9rem; filter: drop-shadow(0 0 5px rgba(245,158,11,0.8)); margin-left: 4px;">⭐</span>` : '';

    return `
        <div class="player-card" data-perks="${dataPerks}" style="display: flex; flex-direction: row; align-items: center; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 8px; padding: 8px 12px; width: 100%; min-height: 60px; transition: all 0.2s;">
            
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 55px; flex-shrink: 0;">
                <span style="font-size: 1.1rem; line-height: 1; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));">${p.flag || '🏳️'}</span>
                <span style="font-size: 2rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${p.emoji}</span>
            </div>

            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; margin-left: 12px;">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 0.85rem; font-weight: 900; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase;">${p.name}</span>
                    ${starBadge}
                </div>
                <div style="color: var(--accent-blue); font-weight: 800; width: 100%;">
                    ${perksHTML}
                </div>
            </div>

            <div style="flex-shrink: 0; margin-left: 8px;">
                <span style="display: flex; justify-content: center; align-items: center; padding: 4px 8px; font-size: 0.8rem; font-weight: 900; color: #fff; background: rgba(0,0,0,0.6); border: 1px solid var(--border-accent); border-radius: 6px;">Nv <span style="color: var(--accent-green); margin-left: 4px;">${p.level}</span></span>
            </div>
        </div>`;
}

// ====== MOTOR DE PODER ======

// Pega a Média de Nível do Time
function getTeamAverageLevel() {
    let totalVirtualLevel = gameState.team.reduce((acc, p) => {
        let base = p.level + (p.isStar ? 3 : 0);
        return acc + base;
    }, 0);
    return totalVirtualLevel / Math.max(1, gameState.team.length);
}

// Verifica se a jogada tem vantagem de Trait (para acender a interface e ativar a Insistência)
function hasTraitAdvantage(node, traits) {
    if (node.synergy && node.synergy !== "pace" && traits[node.synergy] > 0) return true;
    if (node.riskLevel === "high" && traits.pace > 0) return true;
    return false;
}

// Retornos decrescentes: o 1º especialista dá 100% do bônus, o 2º dá 60%, etc.
function applyDiminishingReturns(rawCount) {
    const scale = GAME_BALANCE.mechanics.scaling || {};
    const factor = scale.traitDiminishingFactor ?? 0.60;
    const maxStacks = scale.traitMaxStacks ?? 5;

    let cappedCount = Math.min(rawCount, maxStacks);
    let effectiveValue = 0;
    let currentWeight = 1;

    for (let i = 0; i < cappedCount; i++) {
        effectiveValue += currentWeight;
        currentWeight *= factor;
    }
    return effectiveValue;
}

function getTeamTraits() {
    let counts = { finishing: 0, passing: 0, pace: 0, tackling: 0, reflexes: 0, marking: 0, vision: 0, leadership: 0 };
    gameState.team.forEach(p => {
        if (p.perks) p.perks.forEach(perk => {
            if (counts[perk.id] !== undefined) counts[perk.id]++;
        });
    });
    return counts;
}

function getTeamTraitDiversity(rawCounts) {
    return Object.keys(rawCounts).filter(id => rawCounts[id] > 0).length;
}

function getVisionComboBonus(node, traits) {
    if (!traits.vision || traits.vision <= 0) return 0;
    if (node.type !== 'atk') return 0;

    const scale = GAME_BALANCE.mechanics.scaling || {};
    const diversity = getTeamTraitDiversity(traits);
    let diversityBonus = Math.max(0, diversity - 1) * (scale.visionDiversityBonus ?? 0.18);
    let baseChance = scale.visionComboChance ?? 0.35;
    let chance = clamp(baseChance * Math.min(1, traits.vision) + diversityBonus, 0, 0.85);

    return Math.random() < chance ? 1 : 0;
}

function getLeadershipMitigation(traits) {
    if (!traits.leadership || traits.leadership <= 0) return 1;
    const scale = GAME_BALANCE.mechanics.scaling || {};
    let mitigation = scale.leadershipMitigation ?? 0.45;
    let effective = Math.min(1, applyDiminishingReturns(traits.leadership) / 2);
    return 1 - (mitigation * effective);
}