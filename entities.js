// Função auxiliar nova que gera o "documento de identidade" do jogador
function generateIdentity(isBase = false, forcedNationality = null) {
    // Presets (Jogadores Especiais/Estrelas) ignoram a nacionalidade do time base
    if (!isBase && GAME_CONTENT.presets && GAME_CONTENT.presets.length > 0 && Math.random() < 0.05) {
        let preset = rnd(GAME_CONTENT.presets);
        return { name: preset.name, emoji: preset.face, flag: preset.flag, isPreset: true, presetPerks: preset.perks };
    }

    // Se recebermos uma nacionalidade forçada, usamos ela. Se não, sorteia.
    let nat = forcedNationality ? forcedNationality : rnd(GAME_CONTENT.names);
    let first = rnd(nat.firstNames);
    let last = rnd(nat.lastNames);
    let face = rnd(nat.faces);

    return { name: `${first} ${last}`, emoji: face, flag: nat.flag, isPreset: false };
}

function generatePlayer(level, isPremium = false) {
    let iden = generateIdentity(false); // Mantém aleatório para o Mercado da Bola
    let perks = [];
    let isStar = false;

    if (iden.isPreset) {
        perks = iden.presetPerks.map(pId => PERK_LIST.find(p => p.id === pId)).filter(Boolean);
        isStar = true;
    } else {
        let starChance = isPremium ? 0.30 : 0.08;
        isStar = Math.random() < starChance;

        let traitChance = isStar ? 0.80 : (isPremium ? 0.30 : 0.10);
        let numPerks = Math.random() < traitChance ? 2 : 1;
        for (let i = 0; i < numPerks; i++) {
            perks.push(rndWeighted(PERK_LIST));
        }
    }

    let price = 20 + (level * 5);
    if (perks.length === 2) price += 15;
    if (isStar) price += 40;

    return {
        id: `p_${Date.now()}_${Math.random()}`,
        name: iden.name,
        emoji: iden.emoji,
        flag: iden.flag,
        level: level, perks: perks, isStar: isStar, price: price
    };
}

function generateBasePlayer(baseLevel = 1, numTraits = 0, focusTraitId = null, focusChance = 0, forcedNationality = null) {
    let iden = generateIdentity(true, forcedNationality);
    let perks = [];

    if (numTraits > 0) {
        for (let i = 0; i < numTraits; i++) {
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
        isStar: false,
        isBase: (numTraits === 0)
    };
}

// ÚNICO GERADOR DE CARD - Padrão Horizontal de Alta Qualidade (ATUALIZADO PARA FLAG ICONS)
// ÚNICO GERADOR DE CARD - Padrão Horizontal de Alta Qualidade (ATUALIZADO PARA FLAG ICONS)
function getPlayerCardHTML(p, onClickAttr = "") {
    let hasTraits = p.perks && p.perks.length > 0;
    let perksHTML = "";
    let dataPerks = "";

    if (hasTraits) {
        dataPerks = p.perks.map(perk => perk.id).join(',');

        let perksArray = p.perks.map(perk => {
            return `<div data-tip="${perk.desc}" style="display: flex; align-items: center; gap: 4px; font-size: 0.7rem; background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-light); pointer-events: auto; overflow: hidden; max-width: 110px; flex-shrink: 1;">
                        <span style="flex-shrink: 0;">${perk.emoji}</span>
                        <span style="font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;">${perk.name}</span>
                    </div>`;
        });

        perksHTML = `<div style="display: flex; gap: 4px; flex-wrap: nowrap; overflow: hidden; width: 100%; height: 20px; align-items: center;">${perksArray.join('')}</div>`;
    } else {
        // CORREÇÃO 1: Aqui fica o "Sem Habilidade" envelopado nas crases e salvo no perksHTML
        perksHTML = `<div data-tip="${_('ui.no_skill_desc')}" style="display: flex; align-items: center; font-size: 0.7rem; color: var(--text-muted); pointer-events: auto; height: 20px;">${_('ui.no_skill')}</div>`;
    }

    let starBadge = p.isStar ? `<span style="font-size: 0.9rem; filter: drop-shadow(0 0 5px rgba(245,158,11,0.8)); margin-left: 4px;">⭐</span>` : '';
    let clickStyle = onClickAttr ? 'cursor: pointer;' : '';

    return `
        <div class="player-card" data-perks="${dataPerks}" ${onClickAttr} style="display: flex; flex-direction: row; align-items: center; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 8px; padding: 8px 12px; width: 100%; height: 64px; flex-shrink: 0; overflow: hidden; transition: all 0.2s; ${clickStyle}">
            
            <div style="display: flex; align-items: center; justify-content: center; width: 36px; flex-shrink: 0;">
                <span style="font-size: 2rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${p.emoji}</span>
            </div>

            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; margin-left: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span class="fi fi-${p.flag || 'xx'}" style="font-size: 0.8rem; border-radius: 2px; flex-shrink: 0; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));"></span>
                    <span style="font-size: 0.85rem; font-weight: 900; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase;">${p.name}</span>
                    ${starBadge}
                </div>
                <div style="color: var(--accent-blue); font-weight: 800; width: 100%;">
                    ${perksHTML}
                </div>
            </div>

            <div style="flex-shrink: 0; margin-left: 8px;">
                <!-- CORREÇÃO 2: O Nível traduzido entra corretamente aqui embaixo -->
                <span style="display: flex; justify-content: center; align-items: center; padding: 4px 8px; font-size: 0.8rem; font-weight: 900; color: #fff; background: rgba(0,0,0,0.6); border: 1px solid var(--border-accent); border-radius: 6px;">${_('ui.level')} <span style="color: var(--accent-green); margin-left: 4px;">${p.level}</span></span>
            </div>
        </div>`;
}

// Mantido por segurança para não quebrar a lógica do ui.js
function getSidebarPlayerHTML(p) {
    return getPlayerCardHTML(p);
}

// ==========================================
// FUNÇÕES AUXILIARES DA PARTIDA (MOTOR MATEMÁTICO)
// ==========================================

function getTeamAverageLevel() {
    if (!gameState.team || gameState.team.length === 0) return 1;
    let sum = gameState.team.reduce((acc, p) => acc + (p.level || 1), 0);
    return Math.floor(sum / gameState.team.length);
}

function getTeamTraits() {
    let traits = {};
    if (!gameState.team) return traits;
    gameState.team.forEach(p => {
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
    let leaderStacks = traits['leadership'] || 0;
    return Math.max(0.4, 1 - (leaderStacks * 0.2));
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