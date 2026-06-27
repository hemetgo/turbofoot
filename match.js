let selectedActionNodeId = null;

function startMapMatch() {
    closeModals();

    gameState.inMatch = true;
    saveGame();

    let rivalTeam = gameState.currentNode.rival;
    const minA = GAME_BALANCE.mechanics.matchActionsMin;
    const maxA = GAME_BALANCE.mechanics.matchActionsMax;

    gameState.team.forEach(p => p.justLeveledUp = false);

    matchState = {
        userScore: 0, rivalScore: 0, combo: 0, momentum: 0,
        hasBall: Math.random() > 0.5,
        zone: 2, rivalProfile: rivalTeam, rivalTeamRef: rivalTeam,
        nextBuff: gameState.activeCampBuff || 0,
        baseTotalActions: Math.floor(Math.random() * (maxA - minA + 1)) + minA,
        currentAction: 0, badLuckCounter: 0,
        advantageFailCounter: 0,
        isExtraTime: false,
        // PREPARANDO O RASTREADOR DO ADVERSÁRIO
        stats: {
            userActions: 0,
            totalActions: 0,
            userSuccess: 0,
            userGoalsBy: {},
            rivalGoalsBy: {}, // <-- NOVO AQUI
            maxCombo: 0,
            saves: 0,
            tackles: 0
        }
    };
    matchState.totalActions = matchState.baseTotalActions;

    gameState.activeCampBuff = 0;

    document.getElementById("score-user").innerText = "0";
    document.getElementById("score-rival").innerText = "0";
    setupMarquee("match-user-name", `${gameState.club.emoji} ${tClub(gameState.club.name)}`);
    setupMarquee("match-rival-name", `${rivalTeam.emoji} ${tClub(rivalTeam.name)}`);

    showScreen("screen-match");
    document.getElementById('match-log-feed').innerHTML = '';

    addMatchLog(t('LOG_MATCH_START'), "system");
    if (matchState.nextBuff > 0) {
        addMatchLog(t('LOG_TACTICAL_FOCUS', { buff: matchState.nextBuff }), "success");
    }
    updateFieldState();

    if (shouldShowFirstMatchTutorial()) {
        setTimeout(() => startFirstMatchTutorial(), 500);
    }
}

function updateTimerDisplay() {
    let el = document.getElementById("action-counter");
    if (matchState.isExtraTime) {
        el.innerHTML = `<span style="color:var(--accent-gold); font-weight:900; letter-spacing:0.5px; text-shadow: 0 0 8px rgba(245,158,11,0.8);">${matchState.currentAction}/${matchState.baseTotalActions} 💰 ${t('MATCH_EXTRA_TIME')}</span>`;
    } else {
        el.innerText = `⏱️ ${matchState.currentAction}/${matchState.baseTotalActions}`;
    }
}

function renderMinimap(hoverNode = null) {
    const mapEl = document.getElementById("minimap-display");
    let succZ = null, failZ = null;
    if (hoverNode) {
        succZ = Math.min(4, matchState.zone + hoverNode.successMove);
        failZ = Math.max(0, matchState.zone + hoverNode.failMove);
    }

    let html = `<div class="minimap-track"><div class="field-line-center"></div><div class="field-circle-center"></div><div class="field-box-left"></div><div class="field-box-right"></div>`;
    const em = ["🥅", "🛡️", "⏺️", "⚔️", "🥅"];
    for (let z = 0; z <= 4; z++) {
        let cls = "map-zone", inner = em[z];
        if (z === matchState.zone) { cls += ` active ${matchState.hasBall ? 'ball-user' : 'ball-rival'}`; inner = "⚽"; }
        else if (z === succZ) { cls += " preview-success"; }
        else if (z === failZ) { cls += " preview-fail"; }
        html += `<div class="${cls}">${inner}</div>`;
    }
    html += `</div>`;
    mapEl.innerHTML = html;
}

function getZonePlayers(zone) {
    return gameState.team.filter(p => {
        if (p.id === gameState.captainId) return true;
        if (zone === 0) return p.position === 'GOL' || p.position === 'ZAG';
        if (zone === 1) return p.position === 'ZAG';
        if (zone === 2) return p.position === 'ZAG' || p.position === 'MEI';
        if (zone === 3) return p.position === 'MEI' || p.position === 'ATA';
        if (zone === 4) return p.position === 'ATA';
        return false;
    });
}

function renderMatchPlayers() {
    const container = document.getElementById('match-players-container');
    if (!container) return;

    container.innerHTML = '';
    const activePlayers = getZonePlayers(matchState.zone);

    activePlayers.forEach(p => {
        let temp = document.createElement('div');
        temp.innerHTML = getPlayerCardHTML(p, "", "cursor: default;");
        let card = temp.firstElementChild;
        card.setAttribute('data-id', p.id);
        container.appendChild(card);
    });
}

function highlightActor(actorId) {
    if (!actorId) return;
    document.querySelectorAll('.player-card').forEach(card => {
        if (card.getAttribute('data-id') === actorId) {
            card.classList.add('highlight-actor');
        }
    });
}

function highlightSynergyPlayers(synergyIds) {
    if (!synergyIds || synergyIds.length === 0) return;
    let validIds = getZonePlayers(matchState.zone).map(p => p.id);

    document.querySelectorAll('.player-card').forEach(card => {
        let cardId = card.getAttribute('data-id');
        let playerObj = gameState.team.find(p => p.id === cardId);
        let hasSyn = false;

        if (playerObj && playerObj.perks) {
            hasSyn = playerObj.perks.some(perk => synergyIds.includes(perk.id));
        }

        if (hasSyn && validIds.includes(cardId)) {
            card.classList.add('highlight-synergy');
        }
    });
}

function removeHighlightPlayers() {
    document.querySelectorAll('.player-card').forEach(card => {
        card.classList.remove('highlight-synergy');
        card.classList.remove('highlight-actor');
    });
}

function updateFieldState() {
    if (matchState.badLuckCounter <= 0) {
        if (Math.random() < GAME_BALANCE.mechanics.luckEvents.chance) {
            matchState.badLuckCounter = GAME_BALANCE.mechanics.luckEvents.duration;
        }
    } else { matchState.badLuckCounter = 0; }

    updateTimerDisplay();
    renderMinimap();
    renderMatchPlayers();

    const possBadge = document.getElementById("possession-badge");
    if (matchState.hasBall) {
        possBadge.innerHTML = `⚽ ${t('BADGE_USER_ATTACKING_BALL')}`;
        possBadge.style.color = "var(--accent-green)";
        possBadge.style.borderColor = "rgba(52, 211, 153, 0.4)";
        possBadge.style.background = "rgba(52, 211, 153, 0.1)";
        possBadge.setAttribute("data-tip", t(GAME_CONTENT.tooltips.possessionAtk));
        document.querySelector('.team-section.user').style.opacity = '1';
        document.querySelector('.team-section.rival').style.opacity = '0.35';
    } else {
        possBadge.innerHTML = `🛡️ ${t('BADGE_DEFENDING')}`;
        possBadge.style.color = "var(--accent-red)";
        possBadge.style.borderColor = "rgba(248, 113, 113, 0.4)";
        possBadge.style.background = "rgba(248, 113, 113, 0.1)";
        possBadge.setAttribute("data-tip", t(GAME_CONTENT.tooltips.possessionDef));
        document.querySelector('.team-section.user').style.opacity = '0.35';
        document.querySelector('.team-section.rival').style.opacity = '1';
    }

    const comboBadge = document.getElementById("combo-badge");
    comboBadge.innerText = `🔥 ${t('LABEL_COMBO')}: ${matchState.combo}`;
    comboBadge.setAttribute("data-tip", t(GAME_CONTENT.tooltips.combo));

    const tactDisplay = document.getElementById("tactical-bonus-display");
    if (matchState.nextBuff > 0) {
        tactDisplay.innerHTML = `✨ +${matchState.nextBuff} ${t('LABEL_TACTICAL')}`;
        tactDisplay.style.display = "flex";
        tactDisplay.setAttribute("data-tip", t(GAME_CONTENT.tooltips.tactical));
    } else { tactDisplay.style.display = "none"; }

    const pityBadge = document.getElementById("pity-badge");
    if (pityBadge) pityBadge.style.display = "none";

    _renderPlayerButtons();
}

function pickWeightedNodes(nodesArray, count) {
    let result = [];
    let available = [...nodesArray];
    for (let i = 0; i < count && available.length > 0; i++) {
        let totalW = available.reduce((sum, n) => sum + (n.weight !== undefined ? n.weight : 100), 0);
        let r = Math.random() * totalW;
        let current = 0;
        for (let j = 0; j < available.length; j++) {
            current += (available[j].weight !== undefined ? available[j].weight : 100);
            if (r <= current) {
                result.push(available[j]);
                available.splice(j, 1);
                break;
            }
        }
    }
    return result;
}

function _renderPlayerButtons() {
    const wrapper = document.getElementById("dynamic-nodes-wrapper");
    wrapper.innerHTML = ""; wrapper.classList.remove("pop-in"); void wrapper.offsetWidth;
    selectedActionNodeId = null;

    let pool = GAME_CONTENT.nodes.filter(n => {
        if (matchState.hasBall) return (matchState.zone === 4) ? n.type === 'shoot' : (n.type === 'atk' || n.type === 'shoot') && n.zones.includes(matchState.zone);
        return (matchState.zone === 0) ? n.type === 'save' : n.type === 'def' && n.zones.includes(matchState.zone);
    });

    const isCritical = (matchState.hasBall && matchState.zone === 4) || (!matchState.hasBall && matchState.zone === 0);
    let selected = [];

    let safeNodes = pool.filter(n => n.riskLevel === "safe");
    let riskyNodes = pool.filter(n => n.riskLevel !== "safe");

    let totalNodesNeeded = 3;
    if (!matchState.hasBall) { totalNodesNeeded = 2; safeNodes = []; }
    if (isCritical) totalNodesNeeded = 2;

    if (Math.random() < (GAME_BALANCE.mechanics.safeActionChance ?? 0.15) && safeNodes.length > 0) {
        selected.push(pickWeightedNodes(safeNodes, 1)[0]);
    }

    let neededRisky = totalNodesNeeded - selected.length;
    selected.push(...pickWeightedNodes(riskyNodes, neededRisky));

    if (!selected.some(n => n.comboReq === "ALL" ? matchState.combo > 0 : (!n.comboReq || matchState.combo >= n.comboReq))) {
        let affordable = pool.filter(n => n.comboReq === "ALL" ? matchState.combo > 0 : (!n.comboReq || matchState.combo >= n.comboReq));
        if (affordable.length > 0) selected[0] = pickWeightedNodes(affordable, 1)[0];
    }

    selected = shuffle(selected);
    wrapper.className = `field-container ${matchState.hasBall ? 'atk-theme' : 'def-theme'} pop-in`;

    const scale = GAME_BALANCE.mechanics.scaling || {};
    const rivalLevel = (matchState.rivalProfile.level !== undefined && matchState.rivalProfile.level !== null)
        ? matchState.rivalProfile.level
        : ((gameState.leagueLevel * 4) + gameState.season.currentStage);

    let rivalTraits = {};
    if (matchState.rivalProfile.perks) {
        matchState.rivalProfile.perks.forEach(p => rivalTraits[p.id] = (rivalTraits[p.id] || 0) + 1);
    }

    const teamTraits = getTeamTraits();

    let activePlayers = getZonePlayers(matchState.zone);
    if (activePlayers.length === 0) activePlayers = gameState.team;

    let chanceSet = [];

    selected.forEach((node) => {
        node.actor = rnd(activePlayers);
        let actorTraits = getActorTraits(node.actor);

        const btn = document.createElement("button");
        let canAfford = true;
        let comboBadge = "";

        if (node.comboReq === "ALL") {
            if (matchState.combo <= 0) canAfford = false;
            comboBadge = canAfford ? `<span class="combo-badge">${t('BADGE_COMBO_ALL')} 🔥</span>` : `<span class="combo-badge" style="color:var(--accent-red); border-color:var(--accent-red); background:rgba(248,113,113,0.15);">-${node.comboReq}🔥</span>`;
        }
        else if (node.comboReq > 0) {
            if (matchState.combo < node.comboReq) canAfford = false;
            comboBadge = canAfford ? `<span class="combo-badge">-${node.comboReq} 🔥</span>` : `<span class="combo-badge" style="color:var(--accent-red); border-color:var(--accent-red); background:rgba(248,113,113,0.15);">-${node.comboReq}🔥</span>`;
        }
        else if (node.comboGen > 0) {
            comboBadge = `<span class="combo-badge">+${node.comboGen} 🔥</span>`;
        }

        let finalMod = node.id === "bicycle" ? node.mod + (Math.min(matchState.combo, 6) * 0.1) : node.mod;
        let chance = (scale.baseChance || 45) * finalMod;

        if (matchState.hasBall) chance += 15; else chance -= 15;

        let pIndex = gameState.team.findIndex(p => p.id === node.actor.id);
        let expectedPos = FORMATIONS[gameState.formation || "4-4-2"][pIndex];
        let actorLvl = node.actor.level;
        let isOOP = expectedPos !== node.actor.position;
        if (isOOP && node.actor.id !== gameState.captainId) actorLvl = Math.max(1, actorLvl - 2);

        let levelDiff = actorLvl - rivalLevel;
        chance += (levelDiff * (scale.levelModPct || 6.0));

        if (node.synergy && node.synergy !== "pace") {
            chance += ((actorTraits[node.synergy] ? 1 : 0) * (scale.traitFlatPct || 15));
            chance -= (applyDiminishingReturns(rivalTraits[node.synergy] || 0) * (scale.traitFlatPct || 15));
        }

        if (node.riskLevel === "high") {
            chance += ((actorTraits["pace"] ? 1 : 0) * (scale.traitFlatPct || 15));
            chance -= (applyDiminishingReturns(rivalTraits["pace"] || 0) * (scale.traitFlatPct || 15));
        }

        if (node.type === 'def' || node.type === 'save') {
            chance += (applyDiminishingReturns(teamTraits.marking || 0) * (scale.markingGlobalPct || 4));
        } else if (node.type === 'atk' || node.type === 'shoot') {
            chance -= (applyDiminishingReturns(rivalTraits.marking || 0) * (scale.markingGlobalPct || 4));
        }

        chance += (matchState.nextBuff * (scale.buffPct || 2));
        chance += (matchState.momentum * (scale.momentumPct || 5));
        if (matchState.badLuckCounter > 0) chance -= (scale.luckPenaltyPct || 15);

        if (node.riskLevel === "safe") {
            chance = 100;
        } else {
            chance = Math.max(5, Math.min(95, Math.round(chance)));
            let tweakStep = Math.max(1, Math.floor((gameState.leagueLevel + 1) * 0.5));
            let attempts = 0;
            let currentChance = chance;
            while (chanceSet.includes(currentChance) && attempts < 10) {
                let offset = Math.ceil((attempts + 1) / 2) * tweakStep;
                currentChance = chance + (attempts % 2 === 0 ? offset : -offset);
                currentChance = Math.max(5, Math.min(95, currentChance));
                attempts++;
            }
            chance = currentChance;
            chanceSet.push(chance);
        }

        node.computedChance = chance;

        let isLegendary = (node.weight && node.weight <= 20);
        let colorClass = chance >= 50 ? "risk-safe" : chance >= 25 ? "risk-med" : "risk-high";
        if (isLegendary) colorClass += " legendary-node";
        let chanceColor = chance >= 50 ? "var(--accent-green)" : chance >= 25 ? "var(--accent-gold)" : "var(--accent-red)";

        btn.className = `node-btn ${colorClass} ${gameState.settings.requireConfirm ? 'confirm-enabled' : ''}`;

        if (!canAfford) {
            btn.style.opacity = "0.55";
            btn.style.filter = "grayscale(100%)";
            btn.style.boxShadow = "none";
        } else {
            btn.classList.add("active");
        }

        let succLabel = "";
        if (node.type === 'shoot') succLabel = t('OUTCOME_GOAL');
        else if (node.type === 'save') succLabel = t('OUTCOME_SAVE');
        else if (node.successMove < 0) succLabel = t('OUTCOME_RETREAT', { val: Math.abs(node.successMove) });
        else succLabel = node.successMove > 0 ? t('OUTCOME_ADVANCE', { val: node.successMove }) : t('OUTCOME_MAINTAIN');
        if (node.nextBuff && node.nextBuff > 0) succLabel += ` <span class="buff-text">(+✨)</span>`;

        let failLabel = node.riskLevel === "safe" ? t('OUTCOME_SAFE') : (node.type === 'save' ? t('OUTCOME_CONCEDE') : (node.failMove < 0 ? t('OUTCOME_RETREAT', { val: Math.abs(node.failMove) }) : t('OUTCOME_LOSE_POSSESSION')));
        let failClass = "fail" + (node.riskLevel === "safe" ? " safe" : "");

        let synergies = [];
        if (node.synergy) {
            let foundPerk = PERK_LIST.find(p => p.id === node.synergy);
            if (foundPerk) synergies.push(foundPerk);
        }

        let synHtml = synergies.map(s => `<span data-tip="${t(s.name)}" style="font-size:0.8rem;">${s.emoji}</span>`).join('');
        let advantage = actorTraits[node.synergy] > 0;
        let synBadge = '';

        if (synergies.length > 0) {
            if (advantage) {
                btn.classList.add("has-synergy");
                synBadge = `<div class="action-synergy active">${synHtml} <span>${t('LABEL_BONUS')}</span></div>`;
            } else {
                synBadge = `<div class="action-synergy inactive">${synHtml} <span>${t('LABEL_SYNERGY')}</span></div>`;
            }
        }

        let actorName = node.actor.name.split(' ')[0];
        let actorStar = node.actor.isStar ? '<span style="color:var(--accent-gold); font-size:0.6rem;">⭐</span>' : '';

        btn.innerHTML = `
            <div style="background: rgba(0,0,0,0.3); border-radius: 6px 6px 0 0; margin: -8px -8px 8px -8px; padding: 4px 8px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-light);">
                <div style="display:flex; align-items:center; gap:4px;">
                    <span style="font-size: 1rem;">${node.actor.emoji}</span>
                    <span style="font-size: 0.65rem; font-weight: 800; color: #fff;">${actorName.toUpperCase()} ${actorStar}</span>
                </div>
                <div style="font-size: 0.6rem; font-weight: 900; background: var(--bg-main); padding: 2px 4px; border-radius: 4px; color: var(--accent-blue);">
                    Nv ${actorLvl}
                </div>
            </div>
            <div class="node-header">
                <span class="node-chance" style="color:${chanceColor};">${chance}%</span>
                ${comboBadge}
            </div>
            <div class="node-center">
                <div class="node-icon-name">
                    <span class="node-emoji">${node.emoji}</span>
                    <span class="node-name">${t(node.name)}</span>
                </div>
                <div class="node-badges-wrapper">
                    ${synBadge}
                </div>
            </div>
            <div class="node-footer">
                <div class="outcome-row ${failClass}">❌ ${failLabel}</div>
                <div class="outcome-row succ">✅ ${succLabel}</div>
            </div>
            <div class="confirm-text">${t('LABEL_TAP_CONFIRM')}</div>
        `;

        btn.onclick = async (e) => {
            if (!canAfford) {
                createJuiceText(t('LOG_COMBO_INSUFFICIENT'), "#f87171", e.clientX || window.innerWidth / 2, (e.clientY || window.innerHeight / 2) - 30);
                btn.classList.add("shake"); setTimeout(() => btn.classList.remove("shake"), 300); return;
            }
            if (!gameState.settings.requireConfirm || selectedActionNodeId === node.id) {
                removeHighlightPlayers(); await resolveProceduralNode(node, e);
            } else {
                document.querySelectorAll(".node-btn").forEach(b => b.classList.remove("selected-action"));
                btn.classList.add("selected-action");
                selectedActionNodeId = node.id;

                removeHighlightPlayers();
                renderMinimap(node);
                highlightActor(node.actor.id);
            }
        };

        btn.onpointerenter = () => {
            renderMinimap(node);
            highlightActor(node.actor.id);
        };

        btn.onpointerleave = () => {
            if (selectedActionNodeId === node.id) return;
            removeHighlightPlayers();
            renderMinimap();

            if (selectedActionNodeId) {
                let sNode = selected.find(n => n.id === selectedActionNodeId);
                if (sNode) {
                    renderMinimap(sNode);
                    highlightActor(sNode.actor.id);
                }
            }
        };

        wrapper.appendChild(btn);
    });
}

async function resolveProceduralNode(node, event) {
    document.querySelectorAll(".node-btn").forEach(b => { b.style.pointerEvents = "none"; });

    let actorTraits = getActorTraits(node.actor);
    const hasAdvantage = actorTraits[node.synergy] > 0;
    const pityThreshold = GAME_BALANCE.mechanics.pityThreshold;

    let isSuccess = false;
    let wasPityUsed = false;
    let usedSecondChance = false;
    let wasAttacking = matchState.hasBall;

    // CONTAGEM DE AÇÕES TOTAIS E POSSE
    matchState.stats.totalActions++;
    if (wasAttacking) matchState.stats.userActions++;

    if (node.riskLevel === "safe") {
        isSuccess = true;
    } else {
        if (hasAdvantage && matchState.advantageFailCounter >= pityThreshold) {
            isSuccess = true; wasPityUsed = true; matchState.advantageFailCounter = 0;
        } else {
            let roll = Math.random() * 100;
            isSuccess = roll <= node.computedChance;
            if (!isSuccess && hasAdvantage) {
                if ((Math.random() * 100) <= node.computedChance) { isSuccess = true; usedSecondChance = true; }
            }
            if (hasAdvantage) { matchState.advantageFailCounter = isSuccess ? 0 : matchState.advantageFailCounter + 1; }
        }
    }

    const x = event.clientX || window.innerWidth / 2, y = event.clientY || window.innerHeight / 2;
    matchState.currentAction++;
    updateTimerDisplay();

    if (node.type === 'shoot' || node.type === 'save') await playSuspenseSequence((node.type === 'shoot'), isSuccess);

    let goalScored = false, isUserGoal = false;
    let actor = node.actor.name.split(' ')[0];

    if (isSuccess) {
        // --- GRAVAÇÃO DE SUCESSO, DEFESAS E DESARMES ---
        if (wasAttacking) matchState.stats.userSuccess++;
        if (!wasAttacking && node.type === 'save') matchState.stats.saves++;
        if (!wasAttacking && node.type === 'def') matchState.stats.tackles++;

        matchState.momentum = clamp(matchState.momentum + 1, -3, 3);
        if (node.comboReq === "ALL") matchState.combo = 0; else if (node.comboReq) matchState.combo = Math.max(0, matchState.combo - node.comboReq);
        if (node.comboGen) matchState.combo += node.comboGen;

        let teamTraits = getTeamTraits();
        if (teamTraits['vision'] > 0 && Math.random() < (teamTraits['vision'] * 0.15)) {
            matchState.combo += 1; addMatchLog(t('LOG_VISION_PLAY'), "success");
        }

        // SALVA O MAIOR COMBO ALCANÇADO APÓS QUALQUER SOMA
        matchState.stats.maxCombo = Math.max(matchState.stats.maxCombo, matchState.combo);

        document.getElementById("game-container").classList.add("flash-success");
        setTimeout(() => document.getElementById("game-container").classList.remove("flash-success"), 400);

        if (!matchState.hasBall) matchState.hasBall = true;
        matchState.zone = Math.min(4, matchState.zone + node.successMove);
        matchState.nextBuff = node.nextBuff || 0;

        if (node.forcePossessionLoss) { matchState.hasBall = false; addMatchLog(t('LOG_FOUL'), "fail"); }

        if (node.type === 'shoot' && matchState.zone >= 4) { goalScored = true; isUserGoal = true; }
        else if (node.type !== 'shoot' && node.type !== 'save') {
            if (wasPityUsed || usedSecondChance) {
                createJuiceText(t('JUICE_SYNERGY'), "#a855f7", x, y - 50);
                addMatchLog((t('LOG_SYNERGY_SAVE') || `✨ {name} usou sua habilidade para salvar a jogada!`).replace('{name}', actor), "success");
            } else if (hasAdvantage) {
                createJuiceText(t('JUICE_BONUS'), "#a855f7", x, y - 50);
                addMatchLog((t('LOG_BONUS_PLAY') || `🔥 Bela jogada de {name}!`).replace('{name}', actor), "success");
            } else {
                createJuiceText(matchState.nextBuff > 0 ? t('LOG_NICE') : t(node.name), "#34d399", x, y);
                addMatchLog((t('LOG_ACTION_SUCCESS') || `✅ {name} executou com sucesso: {action}`).replace('{name}', actor).replace('{action}', t(node.name)), 'success');
            }
        }
        else if (node.type === 'save') {
            createJuiceText(t('LOG_GREAT_DEFENSE_TITLE'), "#38bdf8", x, y);
            addMatchLog((t('LOG_MIRACLE_SAVE') || `🧤 MILAGRE DE {name}! Defesaça!`).replace('{name}', actor.toUpperCase()), 'success');
        }
    } else {
        let mitigation = getLeadershipMitigation(getTeamTraits());
        matchState.momentum = clamp(matchState.momentum - Math.max(1, Math.round(1 * mitigation)), -3, 3);
        matchState.combo = 0; matchState.nextBuff = 0;
        document.getElementById("game-container").classList.add("shake");
        setTimeout(() => document.getElementById("game-container").classList.remove("shake"), 300);

        if (matchState.hasBall) matchState.hasBall = false;
        let mitigatedFailMove = Math.round(node.failMove * mitigation);

        if (wasAttacking && !matchState.hasBall) {
            matchState.zone = Math.max(0, matchState.zone + mitigatedFailMove - 1);
            createJuiceText(t('LOG_COUNTER_ATTACK_TITLE'), "#ef4444", x, y - 80);
            addMatchLog((t('LOG_COUNTER_ATTACK') || `🚨 Contra-ataque! {name} perdeu a bola!`).replace('{name}', actor), "fail");
        } else {
            matchState.zone = Math.max(0, matchState.zone + mitigatedFailMove);
        }

        if (node.type === 'save') { goalScored = true; isUserGoal = false; }
        else if (!wasAttacking || node.type !== 'shoot') {
            createJuiceText(t('LOG_FAILED'), "#f87171", x, y);
            addMatchLog((t('LOG_ACTION_FAIL') || `⚠️ {name} falhou na tentativa de {action}...`).replace('{name}', actor).replace('{action}', t(node.name)), 'fail');
        }
        else if (node.type === 'shoot') {
            createJuiceText(t('LOG_MISSED'), "#94a3b8", x, y);
            addMatchLog((t('LOG_SHOOT_MISS') || `🤦‍♂️ Inacreditável! {name} mandou pra fora!`).replace('{name}', actor), 'fail');
        }
    }

    if (goalScored) return handleGoal(isUserGoal, node.actor);
    if (matchState.currentAction >= matchState.totalActions) return endMatchByTime();
    updateFieldState();
}

function handleGoal(isUserGoal, actorObj = null) {
    document.getElementById("dynamic-nodes-wrapper").innerHTML = "";

    if (isUserGoal) {
        matchState.userScore++;
        document.getElementById("score-user").innerText = matchState.userScore;
        createJuiceText(t('JUICE_GOAL_USER'), "#f59e0b", window.innerWidth / 2, window.innerHeight / 2 - 100);

        let scorer = actorObj;
        if (!scorer) {
            let strikers = getZonePlayers(4);
            scorer = strikers.length > 0 ? rnd(strikers) : gameState.team[0];
        }
        let scorerName = scorer.name.split(' ')[0];

        if (!matchState.stats.userGoalsBy[scorer.id]) {
            matchState.stats.userGoalsBy[scorer.id] = { name: scorerName, emoji: scorer.emoji, count: 0 };
        }
        matchState.stats.userGoalsBy[scorer.id].count++;

        addMatchLog((t('LOG_GOAL_USER') || `⚽ GOLAÇO DE {name}!!!`).replace('{name}', scorerName.toUpperCase()), "goal-user");
        addMatchLog(t('LOG_RIVAL_RESTART'), "fail");
        fireConfetti();

    } else {
        matchState.rivalScore++;
        document.getElementById("score-rival").innerText = matchState.rivalScore;
        createJuiceText(t('LOG_GOAL_AGAINST'), "#ef4444", window.innerWidth / 2, window.innerHeight / 2);

        // --- SALVA O GOL PARA O RIVAL ---
        let rivalId = "rival_striker";
        let attackLabel = t('LABEL_ATTACK') || "ATAQUE";

        if (!matchState.stats.rivalGoalsBy[rivalId]) {
            matchState.stats.rivalGoalsBy[rivalId] = { name: attackLabel, emoji: matchState.rivalProfile.emoji, count: 0 };
        }
        matchState.stats.rivalGoalsBy[rivalId].count++;

        let defenders = getZonePlayers(0);
        let defenseLabel = t('LABEL_DEFENSE') || "Defesa";
        let keeper = defenders.length > 0 ? rnd(defenders).name : defenseLabel;

        addMatchLog((t('LOG_GOAL_RIVAL') || `❌ GOL DO RIVAL... {name} não conseguiu evitar.`).replace('{name}', keeper), "goal-rival");

        addMatchLog(t('LOG_TEAM_FURIOUS'), "success");
        fireDespairEffect();
    }

    matchState.zone = 2;
    matchState.hasBall = !isUserGoal;
    matchState.nextBuff = 0;
    matchState.combo = 0;
    matchState.momentum = isUserGoal ? -3 : 3;

    if (matchState.isExtraTime) {
        setTimeout(() => finishMatchRewards(), 700);
        return;
    }

    if (matchState.currentAction >= matchState.totalActions) {
        setTimeout(() => endMatchByTime(), 700);
        return;
    }
    setTimeout(() => updateFieldState(), 700);
}

function fireDespairEffect() {
    const cont = document.getElementById("main-content");
    const gameCont = document.getElementById("game-container");

    gameCont.animate([
        { transform: 'translate(0, 0)', boxShadow: 'inset 0 0 0px rgba(239, 68, 68, 0)' },
        { transform: 'translate(-12px, 8px)', boxShadow: 'inset 0 0 150px rgba(220, 38, 38, 0.8)' },
        { transform: 'translate(10px, -8px)' },
        { transform: 'translate(-8px, -5px)', boxShadow: 'inset 0 0 80px rgba(220, 38, 38, 0.5)' },
        { transform: 'translate(5px, 5px)' },
        { transform: 'translate(0, 0)', boxShadow: 'inset 0 0 0px rgba(239, 68, 68, 0)' }
    ], { duration: 400, easing: 'ease-out' });

    const flash = document.createElement("div");
    flash.style.position = "absolute";
    flash.style.top = "0";
    flash.style.left = "0";
    flash.style.width = "100%";
    flash.style.height = "100%";
    flash.style.backgroundColor = "rgba(220, 38, 38, 0.35)";
    flash.style.pointerEvents = "none";
    flash.style.zIndex = "9998";

    flash.animate([
        { opacity: 1 },
        { opacity: 0 }
    ], { duration: 500, fill: 'forwards' });

    cont.appendChild(flash);
    setTimeout(() => flash.remove(), 500);

    for (let i = 0; i < 12; i++) {
        const line = document.createElement("div");
        line.style.position = "absolute";
        line.style.top = "50%";
        line.style.left = "50%";
        line.style.width = (Math.random() * 40 + 30) + "px";
        line.style.height = "4px";
        line.style.backgroundColor = "#ef4444";
        line.style.borderRadius = "2px";
        line.style.transformOrigin = "left center";
        line.style.pointerEvents = "none";
        line.style.zIndex = "9999";
        line.style.boxShadow = "0 0 10px #ef4444";

        const angle = (i * 30) + (Math.random() * 15 - 7.5);

        line.animate([
            { transform: `translate(0, -50%) rotate(${angle}deg) translateX(30px) scaleX(1)`, opacity: 1 },
            { transform: `translate(0, -50%) rotate(${angle}deg) translateX(180px) scaleX(0)`, opacity: 0 }
        ], {
            duration: 350 + Math.random() * 150,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            fill: 'forwards'
        });

        cont.appendChild(line);
        setTimeout(() => line.remove(), 500);
    }
}

function endMatchByTime() {
    if (matchState.userScore === matchState.rivalScore) {
        if (!matchState.isExtraTime) {
            matchState.isExtraTime = true;
            matchState.totalActions++;

            addMatchLog(t('LOG_GOLDEN_GOAL_INTRO'), "system");
            createJuiceText(t('LOG_GOLDEN_GOAL_TITLE'), "#f59e0b", window.innerWidth / 2, window.innerHeight / 2);
            updateFieldState();
            return;
        } else {
            matchState.totalActions++;
            updateFieldState();
            return;
        }
    }

    finishMatchRewards();
}

function finishMatchRewards() {
    const isVictory = matchState.userScore > matchState.rivalScore;
    addMatchLog(t(getRandomLog('matchEnd')), "system");

    let posPct = matchState.stats.totalActions > 0 ? Math.round((matchState.stats.userActions / matchState.stats.totalActions) * 100) : 50;
    let accPct = matchState.stats.userActions > 0 ? Math.round((matchState.stats.userSuccess / matchState.stats.userActions) * 100) : 0;

    if (!gameState.season.matchHistory) gameState.season.matchHistory = [];

    gameState.season.matchHistory.push({
        rivalName: matchState.rivalProfile.name,
        rivalEmoji: matchState.rivalProfile.emoji,
        type: gameState.currentNode.type,
        userScore: matchState.userScore,
        rivalScore: matchState.rivalScore,
        stats: {
            possession: posPct,
            accuracy: accPct,
            maxCombo: matchState.stats.maxCombo,
            saves: matchState.stats.saves,
            tackles: matchState.stats.tackles,
            scorers: matchState.stats.userGoalsBy,
            rivalScorers: matchState.stats.rivalGoalsBy // <-- NOVO AQUI
        }
    });

    setTimeout(() => {
        if (!isVictory) {
            document.getElementById("pm-title").innerText = t('LABEL_ELIMINATED');
            document.getElementById("pm-title").className = `pm-title loss`;
            document.getElementById("pm-score").innerText = `${matchState.userScore} x ${matchState.rivalScore}`;
            document.getElementById("pm-info").innerText = t('TEXT_ELIMINATED_DESC');

            document.querySelector(".pm-rewards").style.display = "none";

            document.querySelector("#post-match-overlay .btn-primary").innerText = t('BTN_VIEW_SEASON_SUMMARY');
            document.querySelector("#post-match-overlay .btn-primary").onclick = () => {
                document.querySelector(".pm-rewards").style.display = "flex";
                document.getElementById('post-match-overlay').style.display = 'none';
                finishSeason(false);
            };

            gameState.inMatch = false;
            gameState.season.map = [];
            saveGame();

            document.getElementById("post-match-overlay").style.display = "flex";
            return;
        }

        const threat = GAME_BALANCE.mechanics.threatLevels[gameState.currentNode.type] || GAME_BALANCE.mechanics.threatLevels['match'];
        const base = GAME_BALANCE.leagues[gameState.leagueLevel].rewardBase;

        progressDailyMission('win_matches', 1);
        progressDailyMission('score_goals', matchState.userScore);
        if (gameState.currentNode.type === 'elite') progressDailyMission('beat_elite', 1);
        if (gameState.currentNode.type === 'boss') progressDailyMission('beat_boss', 1);

        let mult = threat.coinMult;
        let coins = Math.floor(base * (1 + Math.min(matchState.combo, 6) * GAME_BALANCE.mechanics.comboCoinMultiplier) * mult);

        gameState.coins += coins;
        updateRosterUI();

        document.getElementById("pm-title").innerText = t('LABEL_VICTORY');
        document.getElementById("pm-title").className = `pm-title victory`;
        document.getElementById("pm-score").innerText = `${matchState.userScore} x ${matchState.rivalScore}`;
        document.getElementById("pm-info").innerText = gameState.currentNode.type === 'boss' ? t('TEXT_BOSS_DEFEATED') : t('TEXT_PATH_CLEAR');

        if (gameState.currentNode.type === 'boss') {
            document.querySelector(".pm-rewards").style.display = "none";
            document.querySelector("#post-match-overlay .btn-primary").innerText = t('BTN_VIEW_SEASON_SUMMARY');
            document.querySelector("#post-match-overlay .btn-primary").onclick = () => {
                document.getElementById('post-match-overlay').style.display = 'none';
                document.querySelector(".pm-rewards").style.display = "flex";
                advanceMapNode();
            };
        }
        else {
            document.querySelector(".pm-rewards").style.display = "flex";
            let rewardsText = `+${coins} 💰`;
            document.getElementById("pm-coins").innerText = rewardsText;

            document.querySelector("#post-match-overlay .btn-primary").innerText = t('BTN_DISTRIBUTE_LEVELS');
            document.querySelector("#post-match-overlay .btn-primary").onclick = () => {
                document.getElementById('post-match-overlay').style.display = 'none';
                let niveisGanhos = threat.expReward || 1;
                showLevelDistribution(niveisGanhos, () => {
                    advanceMapNode();
                });
            };
        }

        gameState.inMatch = false;
        saveGame();

        document.getElementById("post-match-overlay").style.display = "flex";
    }, 500);
}

function advanceMapAfterMatch() {
    document.getElementById('post-match-overlay').style.display = 'none';
    advanceMapNode();
}

// ==========================================
// FUNÇÕES AUXILIARES DA PARTIDA (MOTOR MATEMÁTICO)
// ==========================================

function getTeamTraits() {
    let traits = {};
    if (!gameState.team) return traits;
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

function getActorTraits(actor) {
    let traits = {};
    if (actor && actor.perks) {
        actor.perks.forEach(p => traits[p.id] = (traits[p.id] || 0) + 1);
    }
    return traits;
}

function applyDiminishingReturns(count) {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 1.5;
    return 1.8 + (count - 3) * 0.1;
}

function getLeadershipMitigation(traits) {
    let captain = gameState.team.find(p => p.id === gameState.captainId);
    if (!captain || !captain.perks) return 1;

    let hasLeadership = captain.perks.some(p => p.id === 'leadership');
    return hasLeadership ? 0.6 : 1;
}