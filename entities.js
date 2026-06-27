function generateIdentity(isBase = false, forcedNationality = null) {
    // CORREÇÃO: Só permite sortear um Preset (Craque global) se NÃO houver nacionalidade forçada!
    if (!forcedNationality && !isBase && GAME_CONTENT.presets && GAME_CONTENT.presets.length > 0 && Math.random() < 0.05) {
        let preset = rnd(GAME_CONTENT.presets);
        return { name: preset.name, emoji: preset.face, flag: preset.flag, isPreset: true, presetPerks: preset.perks };
    }

    let nat = forcedNationality ? forcedNationality : rnd(GAME_CONTENT.names);
    let first = rnd(nat.firstNames);
    let last = rnd(nat.lastNames);
    let face = rnd(nat.faces);

    return { name: `${first} ${last}`, emoji: face, flag: nat.flag, isPreset: false };
}

function generatePosition() {
    let r = Math.random();
    if (r < 0.10) return "GOL"; // 10% de chance de Goleiro
    if (r < 0.40) return "ZAG"; // 30%
    if (r < 0.70) return "MEI"; // 30%
    return "ATA";               // 30%
}

// Filtro de habilidades por Posição
function getValidPerksForPosition(pos) {
    let pools = {
        "GOL": ["reflexes", "positioning", "leadership", "catimba"],
        "ZAG": ["tackling", "marking", "positioning", "heading", "leadership", "catimba"],
        "MEI": ["passing", "vision", "dribbling", "pace", "stamina", "leadership", "catimba"],
        "ATA": ["finishing", "heading", "acrobatics", "pace", "dribbling", "vision", "catimba"]
    };
    let validIds = pools[pos] || pools["MEI"];
    return PERK_LIST.filter(p => validIds.includes(p.id));
}

function generatePlayer(level, isPremium = false, forcedNationality = null, forcedPosition = null) {
    let iden = generateIdentity(false, forcedNationality);
    let position = forcedPosition || generatePosition();
    let perks = [];
    let isStar = isPremium || Math.random() < 0.08;

    // Premium ganha +2 níveis de bônus direto para valer a pena
    let finalLevel = isStar ? level + 2 : level;

    if (iden.isPreset) {
        perks = iden.presetPerks.map(pId => PERK_LIST.find(p => p.id === pId)).filter(Boolean);
        isStar = true;
    } else {
        // Força EXATAMENTE 2 habilidades compatíveis com a posição
        let validPool = getValidPerksForPosition(position);
        let p1 = rndWeighted(validPool);
        perks.push(p1);
        let remainingPool = validPool.filter(p => p.id !== p1.id);
        if (remainingPool.length > 0) perks.push(rndWeighted(remainingPool));
    }

    let basePrice = 30 + Math.floor(Math.pow(finalLevel, 1.4) * 8);
    let starMod = isStar ? 2.2 : 1.0;
    let rawPrice = Math.floor(basePrice * starMod);
    let price = Math.ceil(rawPrice / 5) * 5;

    return {
        id: `p_${Date.now()}_${Math.random()}`,
        name: iden.name, emoji: iden.emoji, flag: iden.flag,
        position: position,
        level: finalLevel, perks: perks, isStar: isStar, price: price,
        stats: { matches: 0, goals: 0, passes: 0, tackles: 0, saves: 0, cleanSheets: 0, titles: 0 }
    };
}

function generateBasePlayer(baseLevel = 1, numTraits = 2, focusTraitId = null, focusChance = 0, forcedNationality = null, forcedPosition = null) {
    return generatePlayer(baseLevel, false, forcedNationality, forcedPosition);
}

// ÚNICO GERADOR DE CARD UNIVERSAL
function getPlayerCardHTML(p, actionHTML = "", customStyles = "", indexInfo = null) {
    let perksHTML = "";
    let dataPerks = p.perks ? p.perks.map(perk => perk.id).join(',') : "";
    let hasTraits = p.perks && p.perks.length > 0;

    if (hasTraits) {
        let perksArray = p.perks.map(perk => {
            // CORREÇÃO: Adicionado data-tip com a descrição traduzida e cursor:help
            return `<span data-tip="${t(perk.desc)}" style="display:inline-flex; align-items:center; gap:3px; font-size:0.55rem; font-weight:800; color:var(--text-muted); background:rgba(0,0,0,0.25); padding:2px 4px; border-radius:4px; border:1px solid rgba(255,255,255,0.05); ">
                        <span>${perk.emoji}</span> <span>${t(perk.name).toUpperCase()}</span>
                    </span>`;
        });
        perksHTML = `<div style="display:flex; gap:4px; flex-wrap:wrap;">${perksArray.join('')}</div>`;
    } else {
        perksHTML = `<div style="font-size:0.6rem; color:var(--text-muted); font-weight:700;">${t('TEXT_NO_PERKS')}</div>`;
    }

    let isCaptain = (gameState.captainId === p.id);

    let displayName = p.name;
    if (isCaptain) displayName += ' 👑';
    if (p.isStar) displayName += ' ⭐';

    let posLabel = t('POS_' + p.position) || p.position;
    let oopHTML = "";

    if (indexInfo && indexInfo.expectedPos && indexInfo.expectedPos !== p.position) {
        oopHTML = `<div style="font-size:0.55rem; color:var(--accent-red); font-weight:800; text-transform:uppercase; margin-top:2px; display:flex; align-items:center; gap:4px;">⚠️ Fora (Ideal: ${indexInfo.expectedPos})</div>`;
    }

    // Badge de Gols na Temporada
    let runGoals = (gameState.season && gameState.season.playerStats && gameState.season.playerStats[p.id]?.goals) || 0;
    let runGoalsBadge = runGoals > 0 ? `<span style="font-size:0.6rem; background:rgba(245,158,11,0.2); border:1px solid var(--accent-gold); color:var(--accent-gold); padding:2px 6px; border-radius:10px; margin-left:6px; white-space:nowrap;">⚽ ${runGoals}</span>` : "";

    // --- ATUALIZAÇÃO: Verifica se indexInfo.hideInfo é true para esconder a lupa ---
    let hideInfo = indexInfo && indexInfo.hideInfo === true;
    let infoBtn = hideInfo ? "" : `<button class="btn-icon" style="padding:4px 8px; font-size:0.9rem; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.4); border-radius:8px; cursor:pointer; transition:transform 0.2s;" onclick="event.stopPropagation(); showPlayerStats('${p.id}')">🔍</button>`;

    return `
        <div class="player-card universal-card" data-id="${p.id}" data-perks="${dataPerks}" style="position:relative; display:flex; align-items:center; gap:8px; background:var(--bg-card); border:1px solid var(--border-light); border-radius:10px; padding:6px 8px; width:100%; min-height: 72px; height: 100%; transition:all 0.2s; box-sizing: border-box; ${customStyles}">
            
            <!-- Coluna 1: Avatar + Level -->
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; flex-shrink:0; min-width:40px;">
                <span style="font-size:1.6rem; line-height:1; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${p.emoji}</span>
                <div style="background:rgba(0,0,0,0.4); border-radius:4px; padding:1px 4px; font-size:0.55rem; font-weight:900; color:var(--accent-green); border:1px solid rgba(255,255,255,0.1);">Nv ${p.level}</div>
            </div>
            
            <!-- Coluna 2: Informações -->
            <div style="flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center;">
                
                <div style="display:flex; align-items:center; gap:4px; flex-wrap:nowrap; overflow:hidden; width:100%; margin-bottom: 3px;">
                    <span class="pos-badge pos-${p.position}" style="font-size:0.5rem; padding:1px 4px; margin:0; flex-shrink:0; border:1px solid rgba(255,255,255,0.1);">${posLabel}</span>
                    <span class="fi fi-${p.flag || 'xx'}" style="border-radius:2px; font-size:0.75rem; flex-shrink:0;"></span>
                    <span style="font-size:0.85rem; font-weight:900; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-transform:uppercase; letter-spacing:-0.5px;">${displayName}</span>
                    ${runGoalsBadge}
                </div>
                
                <!-- Altura mínima reduzida para as habilidades -->
                <div style="min-height: 18px; display:flex; align-items:center;">
                    ${perksHTML}
                </div>
                
                ${oopHTML}
            </div>
            
            <!-- Coluna 3: Botões Injetados -->
            <div style="display:flex; flex-direction:row; gap:4px; align-items:center; margin-left:auto; flex-shrink:0;">
                ${infoBtn}
                ${actionHTML}
            </div>
            
        </div>
    `;
}

function getSidebarPlayerHTML(p) { return getPlayerCardHTML(p); }

// ==========================================
// FUNÇÕES AUXILIARES DA PARTIDA (MOTOR MATEMÁTICO)
// ==========================================

function getTeamAverageLevel() {
    if (!gameState.team || gameState.team.length === 0) return 1;
    // O Level médio agora depende do setor em que a bola está
    let players = getZonePlayers(matchState.zone);
    if (players.length === 0) return 1;

    let sum = players.reduce((acc, p) => acc + (p.level || 1), 0);
    return Math.floor(sum / players.length);
}

function getTeamTraits() {
    let traits = {};
    if (!gameState.team) return traits;

    // Apenas os traits dos jogadores da zona atual contam para a jogada
    let players = getZonePlayers(matchState.zone);

    players.forEach(p => {
        if (p.perks) {
            p.perks.forEach(perk => {
                traits[perk.id] = (traits[perk.id] || 0) + 1;
            });
        }
    });
    return traits;
}

// Aplica retornos decrescentes (stack de habilidades iguais não dão bônus infinito)
function applyDiminishingReturns(count) {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 1.5;
    return 1.8 + (count - 3) * 0.1; // Limita o impacto de times com 5+ habilidades iguais
}

function hasTraitAdvantage(node, traits) {
    if (!node.synergy) return false;
    return (traits[node.synergy] || 0) > 0;
}

function getVisionComboBonus(node, traits) {
    let visionStacks = traits['vision'] || 0;
    if (visionStacks > 0 && Math.random() < (visionStacks * 0.15)) {
        return 1; // +1 Combo extra gerado pela visão de jogo
    }
    return 0;
}

function getLeadershipMitigation(traits) {
    // Agora a Liderança SÓ FUNCIONA se quem tem o trait for o CAPITÃO escolhido.
    let captain = gameState.team.find(p => p.id === gameState.captainId);
    if (!captain || !captain.perks) return 1; // Sem mitigação

    let hasLeadership = captain.perks.some(p => p.id === 'leadership');
    return hasLeadership ? 0.6 : 1; // Se o capitão tem liderança, corta o dano de falha em 40%
}

/**
 * Gera um time adversário completo (5 jogadores) com base nas configurações da liga.
 * NÃO É CHAMADA ATUALMENTE pelo fluxo do mapa (season.js usa apenas 1 "perfil" de rival
 * com level + perks, não um elenco de 5 jogadores). Mantida disponível caso o jogo
 * evolua para gerar elencos rivais completos em vez de um único "perfil" de dificuldade.
 * @param {Object} leagueConfig - O objeto da liga vindo do config_leagues.json
 * @param {Number} currentMatchIndex - O índice da rodada/partida atual dentro da liga (começa em 0)
 * @param {Number} teamSize - Quantidade de jogadores a serem gerados no time rival (padrão 5)
 * @returns {Array} Retorna o array de objetos de jogadores adversários
 */
function generateEnemyTeam(leagueConfig, currentMatchIndex, teamSize = 5) {
    // Calcula o nível e traits aplicando o fator de crescimento (scaling) baseado na rodada atual
    let matchLevel = Math.floor(leagueConfig.enemyBaseLevel + (leagueConfig.levelScaling * currentMatchIndex));
    let matchTraits = Math.floor(leagueConfig.enemyBaseTraits + (leagueConfig.traitScaling * currentMatchIndex));

    // Se a liga tiver escalonamento dinâmico baseado no time do jogador (ex: Liga Suprema)
    if (leagueConfig.dynamicScaling) {
        let playerTeamLevel = getTeamAverageLevel();
        let offset = leagueConfig.levelOffset || 0;

        // Garante que o nível do rival acompanhe o jogador caso ele esteja forte demais
        matchLevel = Math.max(matchLevel, playerTeamLevel + offset);
    }

    // Travas de segurança para evitar valores inválidos ou negativos
    matchLevel = Math.max(1, matchLevel);
    matchTraits = Math.max(0, matchTraits);

    // Gera o elenco adversário utilizando o gerador padrão horizontal do sistema
    let enemyTeam = [];
    for (let i = 0; i < teamSize; i++) {
        enemyTeam.push(generateBasePlayer(matchLevel, matchTraits));
    }

    return enemyTeam;
}