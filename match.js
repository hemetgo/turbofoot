let selectedActionNodeId = null;

function startMapMatch() {
    closeModals();
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
        isExtraTime: false
    };
    matchState.totalActions = matchState.baseTotalActions;

    gameState.activeCampBuff = 0;

    document.getElementById("score-user").innerText = "0";
    document.getElementById("score-rival").innerText = "0";
    setupMarquee("match-user-name", `${gameState.club.emoji} ${gameState.club.name}`);
    setupMarquee("match-rival-name", `${rivalTeam.emoji} ${rivalTeam.name}`);

    showScreen("screen-match");
    document.getElementById('match-log-feed').innerHTML = '';
    addMatchLog("A bola rola para o desafio no Mapa!", "system");
    if (matchState.nextBuff > 0) addMatchLog(`Seu time entra focado (+${matchState.nextBuff} Tática no 1º turno) devido ao Treinamento!`, "success");
    updateFieldState();
}

function updateTimerDisplay() {
    let el = document.getElementById("action-counter");
    if (matchState.isExtraTime) {
        el.innerHTML = `<span style="color:var(--accent-gold); font-weight:900; letter-spacing:0.5px; text-shadow: 0 0 8px rgba(245,158,11,0.8);">${matchState.currentAction}/${matchState.baseTotalActions} 🏆 PRORROGAÇÃO - GOL DE OURO</span>`;
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

function highlightSynergyPlayers(synergyIds) {
    if (!synergyIds || synergyIds.length === 0) return;
    document.querySelectorAll('.player-card').forEach(card => {
        let cardPerks = card.getAttribute('data-perks') || "";
        let hasSyn = synergyIds.some(id => cardPerks.includes(id));
        if (hasSyn) {
            card.classList.add('highlight-synergy');
        }
    });
}

function removeHighlightPlayers() {
    document.querySelectorAll('.player-card').forEach(card => {
        card.classList.remove('highlight-synergy');
    });
}

function updateFieldState() {
    if (matchState.badLuckCounter <= 0) {
        if (Math.random() < GAME_BALANCE.mechanics.luckEvents.chance) {
            matchState.badLuckCounter = GAME_BALANCE.mechanics.luckEvents.duration;
            addMatchLog("⚠️ Momento de azar! Precisão reduzida.", "fail");
        }
    } else { matchState.badLuckCounter = 0; }

    updateTimerDisplay();
    renderMinimap();

    const possBadge = document.getElementById("possession-badge");
    if (matchState.hasBall) {
        possBadge.innerHTML = "⚽ SEU ATAQUE";
        possBadge.style.color = "var(--accent-green)";
        possBadge.style.borderColor = "rgba(52, 211, 153, 0.4)";
        possBadge.style.background = "rgba(52, 211, 153, 0.1)";
        possBadge.setAttribute("data-tip", GAME_CONTENT.tooltips.possessionAtk);
        document.querySelector('.team-section.user').style.opacity = '1';
        document.querySelector('.team-section.rival').style.opacity = '0.35';
    } else {
        possBadge.innerHTML = "🛡️ DEFENDENDO";
        possBadge.style.color = "var(--accent-red)";
        possBadge.style.borderColor = "rgba(248, 113, 113, 0.4)";
        possBadge.style.background = "rgba(248, 113, 113, 0.1)";
        possBadge.setAttribute("data-tip", GAME_CONTENT.tooltips.possessionDef);
        document.querySelector('.team-section.user').style.opacity = '0.35';
        document.querySelector('.team-section.rival').style.opacity = '1';
    }

    const comboBadge = document.getElementById("combo-badge");
    comboBadge.innerText = `🔥 Combo: ${matchState.combo}`;
    comboBadge.setAttribute("data-tip", GAME_CONTENT.tooltips.combo);

    const tactDisplay = document.getElementById("tactical-bonus-display");
    if (matchState.nextBuff > 0) {
        tactDisplay.innerHTML = `✨ +${matchState.nextBuff} Tática`;
        tactDisplay.style.display = "flex";
        tactDisplay.setAttribute("data-tip", GAME_CONTENT.tooltips.tactical);
    } else { tactDisplay.style.display = "none"; }

    const pityBadge = document.getElementById("pity-badge");
    if (pityBadge) {
        if (matchState.advantageFailCounter > 0) {
            pityBadge.style.display = "flex";
            let isGuaranteed = matchState.advantageFailCounter >= 2;
            pityBadge.innerHTML = isGuaranteed ? `✨ 100% GARANTIDO!` : `✨ Insistência: ${matchState.advantageFailCounter}/2`;
            pityBadge.setAttribute("data-tip", "Se falhar 2 vezes seguidas com Sinergia, a 3ª tentativa será um Sucesso Garantido!");
        } else {
            pityBadge.style.display = "none";
        }
    }

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

    if (Math.random() < (GAME_BALANCE.mechanics.safeActionChance ?? 0.15) && safeNodes.length > 0) {
        selected.push(pickWeightedNodes(safeNodes, 1)[0]);
    }

    let neededRisky = (isCritical ? 2 : 3) - selected.length;
    let chosenRisky = pickWeightedNodes(riskyNodes, neededRisky);
    selected.push(...chosenRisky);

    if (!selected.some(n => n.comboReq === "ALL" ? matchState.combo > 0 : (!n.comboReq || matchState.combo >= n.comboReq))) {
        let affordable = pool.filter(n => n.comboReq === "ALL" ? matchState.combo > 0 : (!n.comboReq || matchState.combo >= n.comboReq));
        if (affordable.length > 0) selected[0] = pickWeightedNodes(affordable, 1)[0];
    }

    selected = shuffle(selected);
    wrapper.className = `field-container ${matchState.hasBall ? 'atk-theme' : 'def-theme'} pop-in`;

    // ===== NOVO MOTOR MATEMÁTICO BASEADO EM PORCENTAGENS =====
    const scale = GAME_BALANCE.mechanics.scaling || {};
    const BASE_CHANCE = scale.baseChance || 45;
    const LEVEL_PCT = scale.levelModPct || 2.5;
    const TRAIT_PCT = scale.traitFlatPct || 15;
    const MARKING_PCT = scale.markingGlobalPct || 4;
    const MOMENTUM_PCT = scale.momentumPct || 5;
    const BUFF_PCT = scale.buffPct || 2;
    const LUCK_PENALTY = scale.luckPenaltyPct || 15;

    const avgPlayerLevel = getTeamAverageLevel();
    // Usa o Nível do Rival salvo ou calcula de forma retroativa para saves antigos
    const rivalLevel = (matchState.rivalProfile.level !== undefined && matchState.rivalProfile.level !== null)
        ? matchState.rivalProfile.level
        : ((gameState.leagueLevel * 4) + gameState.season.currentStage);

    const traits = getTeamTraits();
    let rivalTraits = {};
    if (matchState.rivalProfile.perks) {
        matchState.rivalProfile.perks.forEach(p => {
            rivalTraits[p.id] = (rivalTraits[p.id] || 0) + 1;
        });
    }

    let chanceSet = [];

    selected.forEach((node) => {
        const btn = document.createElement("button");
        let canAfford = true;
        let comboBadge = "";

        if (node.comboReq === "ALL") {
            if (matchState.combo <= 0) canAfford = false;
            comboBadge = canAfford ? `<span class="combo-badge">TUDO 🔥</span>` : `<span class="combo-badge" style="color:var(--accent-red); border-color:var(--accent-red); background:rgba(248,113,113,0.15);">-${node.comboReq}🔥</span>`;
        }
        else if (node.comboReq > 0) {
            if (matchState.combo < node.comboReq) canAfford = false;
            comboBadge = canAfford ? `<span class="combo-badge">-${node.comboReq} 🔥</span>` : `<span class="combo-badge" style="color:var(--accent-red); border-color:var(--accent-red); background:rgba(248,113,113,0.15);">-${node.comboReq}🔥</span>`;
        }
        else if (node.comboGen > 0) {
            comboBadge = `<span class="combo-badge">+${node.comboGen} 🔥</span>`;
        }

        let finalMod = node.id === "bicycle" ? node.mod + (Math.min(matchState.combo, 6) * 0.1) : node.mod;

        // 1. CHANCE BASE
        let chance = BASE_CHANCE * finalMod;

        // 2. MODIFICADOR DE NÍVEL DIRETO
        let levelDiff = avgPlayerLevel - rivalLevel;
        chance += (levelDiff * LEVEL_PCT);

        // 3. SINERGIA DE TRAITS (Player vs Rival)
        if (node.synergy && node.synergy !== "pace") {
            let pStacks = applyDiminishingReturns(traits[node.synergy] || 0);
            let rStacks = applyDiminishingReturns(rivalTraits[node.synergy] || 0);
            chance += (pStacks * TRAIT_PCT);
            chance -= (rStacks * TRAIT_PCT);
        }

        // VELOCIDADE (Afeta qualquer jogada Risco Alto)
        if (node.riskLevel === "high") {
            let pPace = applyDiminishingReturns(traits.pace || 0);
            let rPace = applyDiminishingReturns(rivalTraits.pace || 0);
            chance += (pPace * TRAIT_PCT);
            chance -= (rPace * TRAIT_PCT);
        }

        // 4. MARCAÇÃO/COLOCAÇÃO (Afeta TODAS as jogadas defensivas/ofensivas de forma global)
        if (node.type === 'def' || node.type === 'save') {
            // Player defendendo: A marcação do PLAYER ajuda
            let pMark = applyDiminishingReturns(traits.marking || 0);
            chance += (pMark * MARKING_PCT);
        } else if (node.type === 'atk' || node.type === 'shoot') {
            // Player atacando: A marcação do RIVAL atrapalha
            let rMark = applyDiminishingReturns(rivalTraits.marking || 0);
            chance -= (rMark * MARKING_PCT);
        }

        // 5. FATORES DA PARTIDA (Buffs, Azar, Momentum)
        chance += (matchState.nextBuff * BUFF_PCT);
        chance += (matchState.momentum * MOMENTUM_PCT);
        if (matchState.badLuckCounter > 0) chance -= LUCK_PENALTY;

        if (node.riskLevel === "safe") {
            chance = 100;
        } else {
            chance = Math.round(chance);
            chance = Math.max(5, Math.min(95, chance));

            // Desempate visual para não ficarem ações iguais
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
        let colorClass = chance >= 65 ? "risk-safe" : chance >= 40 ? "risk-med" : "risk-high";
        if (isLegendary) colorClass += " legendary-node";

        let chanceColor = chance >= 65 ? "var(--accent-green)" : chance >= 40 ? "var(--accent-gold)" : "var(--accent-red)";

        btn.className = `node-btn ${colorClass} ${gameState.settings.requireConfirm ? 'confirm-enabled' : ''}`;

        if (!canAfford) {
            btn.style.opacity = "0.55";
            btn.style.filter = "grayscale(100%)";
            btn.style.boxShadow = "none";
        } else {
            btn.classList.add("active");
        }

        let succLabel = "";
        if (node.type === 'shoot') succLabel = "Gol";
        else if (node.type === 'save') succLabel = "Defesa";
        else if (node.successMove < 0) succLabel = `Recua ${Math.abs(node.successMove)}`;
        else succLabel = node.successMove > 0 ? `Avança +${node.successMove}` : "Mantém";

        if (node.nextBuff && node.nextBuff > 0) succLabel += ` <span class="buff-text">(+✨)</span>`;

        let failLabel = "";
        let failClass = "fail";
        if (node.riskLevel === "safe") { failLabel = "Sem Risco"; failClass += " safe"; }
        else if (node.type === 'save') failLabel = "Sofre Gol";
        else failLabel = node.failMove < 0 ? `Recua ${Math.abs(node.failMove)}` : "Perde Posse";

        let synergies = [];
        if (node.synergy) {
            let foundPerk = PERK_LIST.find(p => p.id === node.synergy);
            if (foundPerk) synergies.push(foundPerk);
        }

        let synHtml = synergies.map(s => `<span data-tip="${s.name}" style="font-size:0.8rem;">${s.emoji}</span>`).join('');
        let synBadge = '';
        let synergyIds = synergies.map(s => s.id);
        let advantage = hasTraitAdvantage(node, traits);

        if (synergies.length > 0) {
            if (advantage) {
                btn.classList.add("has-synergy");
                synBadge = `<div class="action-synergy active">${synHtml} <span>BÔNUS</span></div>`;
            } else {
                synBadge = `<div class="action-synergy inactive">${synHtml} <span>Sinergia</span></div>`;
            }
        }

        btn.innerHTML = `
            <div class="node-header">
                <span class="node-chance" style="color:${chanceColor};">🎯 ${chance}%</span>
                ${comboBadge}
            </div>
            <div class="node-center">
                <div class="node-icon-name">
                    <span class="node-emoji">${node.emoji}</span>
                    <span class="node-name">${node.name}</span>
                </div>
                <div class="node-badges-wrapper">
                    ${synBadge}
                </div>
            </div>
            <div class="node-footer">
                <div class="outcome-row ${failClass}">❌ ${failLabel}</div>
                <div class="outcome-row succ">✅ ${succLabel}</div>
            </div>
            <div class="confirm-text">TOQUE P/ CONFIRMAR</div>
        `;

        btn.onclick = async (e) => {
            if (!canAfford) {
                const tx = e.clientX || window.innerWidth / 2;
                const ty = e.clientY || window.innerHeight / 2;
                createJuiceText("COMBO INSUFICIENTE!", "#f87171", tx, ty - 30);

                btn.classList.add("shake");
                setTimeout(() => btn.classList.remove("shake"), 300);
                return;
            }

            if (!gameState.settings.requireConfirm || selectedActionNodeId === node.id) {
                removeHighlightPlayers();
                await resolveProceduralNode(node, e);
            }
            else {
                document.querySelectorAll(".node-btn").forEach(b => b.classList.remove("selected-action"));
                btn.classList.add("selected-action");
                selectedActionNodeId = node.id;
                renderMinimap(node);
            }
        };
        btn.onpointerenter = () => {
            renderMinimap(node);
            if (advantage && canAfford) highlightSynergyPlayers(synergyIds);
        };
        btn.onpointerleave = () => {
            renderMinimap();
            removeHighlightPlayers();
        };
        wrapper.appendChild(btn);
    });
}

async function resolveProceduralNode(node, event) {
    document.querySelectorAll(".node-btn").forEach(b => { b.style.pointerEvents = "none"; });

    const traits = getTeamTraits();
    const hasAdvantage = hasTraitAdvantage(node, traits);

    let isSuccess = false;
    let wasPityUsed = false;
    let usedSecondChance = false;

    if (node.riskLevel === "safe") {
        isSuccess = true;
    } else {
        if (hasAdvantage && matchState.advantageFailCounter >= 2) {
            isSuccess = true;
            wasPityUsed = true;
            matchState.advantageFailCounter = 0;
        } else {
            let roll = Math.random() * 100;
            isSuccess = roll <= node.computedChance;

            if (!isSuccess && hasAdvantage) {
                let roll2 = Math.random() * 100;
                if (roll2 <= node.computedChance) {
                    isSuccess = true;
                    usedSecondChance = true;
                }
            }

            if (hasAdvantage) {
                if (isSuccess) {
                    matchState.advantageFailCounter = 0;
                } else {
                    matchState.advantageFailCounter++;
                }
            }
        }
    }

    const x = event.clientX || window.innerWidth / 2, y = event.clientY || window.innerHeight / 2;
    matchState.currentAction++;
    updateTimerDisplay();

    if (node.type === 'shoot' || node.type === 'save') await playSuspenseSequence((node.type === 'shoot'), isSuccess);

    let goalScored = false, isUserGoal = false;

    if (isSuccess) {
        matchState.momentum = clamp(matchState.momentum + 1, -3, 3);

        if (node.comboReq === "ALL") matchState.combo = 0; else if (node.comboReq) matchState.combo = Math.max(0, matchState.combo - node.comboReq);
        if (node.comboGen) matchState.combo += node.comboGen;

        let visionBonus = getVisionComboBonus(node, traits);
        if (visionBonus > 0) {
            matchState.combo += visionBonus;
            addMatchLog("🔗 Visão de jogo! O time se entende em campo.", "success");
        }

        document.getElementById("game-container").classList.add("flash-success");
        setTimeout(() => document.getElementById("game-container").classList.remove("flash-success"), 400);

        if (!matchState.hasBall) matchState.hasBall = true;
        matchState.zone = Math.min(4, matchState.zone + node.successMove);
        matchState.nextBuff = node.nextBuff || 0;

        if (node.forcePossessionLoss) {
            matchState.hasBall = false;
            addMatchLog("Falta feita! O rival assume o jogo.", "fail");
        }

        if (node.type === 'shoot' && matchState.zone >= 4) { goalScored = true; isUserGoal = true; }
        else if (node.type !== 'shoot' && node.type !== 'save') { createJuiceText(matchState.nextBuff > 0 ? "Lindo! ✨" : node.name, "#34d399", x, y); addMatchLog(getRandomLog('success', node.name), 'success'); }
        else if (node.type === 'save') { createJuiceText("DEFESAÇA!", "#38bdf8", x, y); addMatchLog("Defesa espetacular!", 'success'); }
    } else {
        let mitigation = getLeadershipMitigation(traits);

        matchState.momentum = clamp(matchState.momentum - Math.max(1, Math.round(1 * mitigation)), -3, 3);
        matchState.combo = 0; matchState.nextBuff = 0;
        document.getElementById("game-container").classList.add("shake");
        setTimeout(() => document.getElementById("game-container").classList.remove("shake"), 300);

        if (matchState.hasBall) matchState.hasBall = false;
        let mitigatedFailMove = Math.round(node.failMove * mitigation);
        matchState.zone = Math.max(0, matchState.zone + mitigatedFailMove);

        if (node.type === 'save') { goalScored = true; isUserGoal = false; }
        else if (node.type !== 'shoot' && node.type !== 'save') { createJuiceText("Falhou!", "#f87171", x, y); addMatchLog(getRandomLog('fail', node.name), 'fail'); }
        else if (node.type === 'shoot') { createJuiceText("Pra fora!", "#94a3b8", x, y); addMatchLog("A finalização não foi boa.", 'fail'); }
    }

    if (goalScored) return handleGoal(isUserGoal);
    if (matchState.currentAction >= matchState.totalActions) return endMatchByTime();
    updateFieldState();
}

function handleGoal(isUserGoal) {
    document.getElementById("dynamic-nodes-wrapper").innerHTML = "";
    if (isUserGoal) {
        matchState.userScore++; document.getElementById("score-user").innerText = matchState.userScore;
        createJuiceText("⚽ GOOOOL!!", "#f59e0b", window.innerWidth / 2, window.innerHeight / 2 - 100);
        addMatchLog(getRandomLog('goalUser'), "goal-user");
        fireConfetti();
    } else {
        matchState.rivalScore++; document.getElementById("score-rival").innerText = matchState.rivalScore;
        createJuiceText("😢 Gol", "#ef4444", window.innerWidth / 2, window.innerHeight / 2);
        addMatchLog(getRandomLog('goalRival'), "goal-rival");
        fireDespairEffect();
    }
    matchState.zone = 2; matchState.hasBall = !isUserGoal; matchState.nextBuff = 0; matchState.combo = 0; matchState.momentum = 0;

    if (matchState.isExtraTime) {
        setTimeout(() => finishMatchRewards(), 700);
        return;
    }

    if (matchState.currentAction >= matchState.totalActions) { setTimeout(() => endMatchByTime(), 700); return; }
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

            addMatchLog("Fim do tempo regulamentar. PRORROGAÇÃO COM GOL DE OURO!", "system");
            createJuiceText("GOL DE OURO!", "#f59e0b", window.innerWidth / 2, window.innerHeight / 2);
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
    addMatchLog(getRandomLog('matchEnd'), "system");

    if (!gameState.season.matchHistory) gameState.season.matchHistory = [];
    gameState.season.matchHistory.push({
        rivalName: matchState.rivalProfile.name,
        rivalEmoji: matchState.rivalProfile.emoji,
        type: gameState.currentNode.type,
        userScore: matchState.userScore,
        rivalScore: matchState.rivalScore
    });

    setTimeout(() => {
        if (!isVictory) {
            recordRun(false);
            progressDailyMission('play_runs', 1);

            document.getElementById("pm-title").innerText = "ELIMINADO";
            document.getElementById("pm-title").className = `pm-title loss`;
            document.getElementById("pm-score").innerText = `${matchState.userScore} x ${matchState.rivalScore}`;
            document.getElementById("pm-info").innerText = "A campanha terminou mais cedo. Você não sobreviveu ao mapa.";

            document.querySelector(".pm-rewards").style.display = "none";

            document.querySelector("#post-match-overlay .btn-primary").innerText = "VOLTAR AO MENU";
            document.querySelector("#post-match-overlay .btn-primary").onclick = () => {
                document.querySelector(".pm-rewards").style.display = "flex";
                document.getElementById('post-match-overlay').style.display = 'none';
                returnToTitle();
            };
            document.getElementById("post-match-overlay").style.display = "flex";
            return;
        }

        const threat = GAME_BALANCE.mechanics.threatLevels[gameState.currentNode.type] || GAME_BALANCE.mechanics.threatLevels['match'];
        const base = GAME_BALANCE.leagues[gameState.leagueLevel].rewardBase;

        // Progresso de missões diárias
        progressDailyMission('win_matches', 1);
        progressDailyMission('score_goals', matchState.userScore);
        if (gameState.currentNode.type === 'elite') progressDailyMission('beat_elite', 1);
        if (gameState.currentNode.type === 'boss') progressDailyMission('beat_boss', 1);

        let mult = threat.coinMult;
        let coins = Math.floor(base * (1 + Math.min(matchState.combo, 6) * GAME_BALANCE.mechanics.comboCoinMultiplier)) * mult;

        gameState.coins += coins;
        updateRosterUI();

        document.getElementById("pm-title").innerText = "VITÓRIA!";
        document.getElementById("pm-title").className = `pm-title victory`;
        document.getElementById("pm-score").innerText = `${matchState.userScore} x ${matchState.rivalScore}`;

        document.getElementById("pm-info").innerText = gameState.currentNode.type === 'boss' ? "O CHEFÃO CAIU! MAPA VENCIDO!" : "O caminho está livre. Continue subindo!";

        let rewardsText = `+${coins} 💰`;
        document.getElementById("pm-coins").innerText = rewardsText;

        document.querySelector("#post-match-overlay .btn-primary").innerText = "DISTRIBUIR NÍVEIS";
        document.querySelector("#post-match-overlay .btn-primary").onclick = () => {
            document.getElementById('post-match-overlay').style.display = 'none';

            let niveisGanhos = threat.expReward || 1;

            showLevelDistribution(niveisGanhos, () => {
                advanceMapNode();
            });
        };

        document.getElementById("post-match-overlay").style.display = "flex";
    }, 500);
}

function advanceMapAfterMatch() {
    document.getElementById('post-match-overlay').style.display = 'none';
    advanceMapNode();
}