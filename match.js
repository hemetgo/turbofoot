let selectedActionNodeId = null;

function startMapMatch() {
    closeModals();
    let rivalTeam = gameState.currentNode.rival;
    const minA = GAME_BALANCE.mechanics.matchActionsMin;
    const maxA = GAME_BALANCE.mechanics.matchActionsMax;

    matchState = {
        userScore: 0, rivalScore: 0, combo: 0, momentum: 0,
        hasBall: true, zone: 2, rivalProfile: rivalTeam, rivalTeamRef: rivalTeam,
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
    if (matchState.nextBuff > 0) addMatchLog("Seu time entra focado (+20 Força no 1º turno) devido ao Treinamento!", "success");
    updateFieldState();
}

function updateTimerDisplay() {
    let el = document.getElementById("action-counter");
    if (matchState.isExtraTime) {
        el.innerHTML = `<span style="color:var(--accent-gold); font-weight:900; letter-spacing:0.5px; text-shadow: 0 0 8px rgba(245,158,11,0.8);">PRORROGAÇÃO 🏆 GOL DE OURO</span>`;
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

    const momBadge = document.getElementById("momentum-badge");
    momBadge.innerText = `🌊 Momento: ${matchState.momentum > 0 ? '+' : ''}${matchState.momentum}`;
    momBadge.style.display = "flex";
    momBadge.setAttribute("data-tip", GAME_CONTENT.tooltips.momentum);

    const comboBadge = document.getElementById("combo-badge");
    comboBadge.innerText = `🔥 Combo: ${matchState.combo}`;
    comboBadge.setAttribute("data-tip", GAME_CONTENT.tooltips.combo);

    const tactDisplay = document.getElementById("tactical-bonus-display");
    if (matchState.nextBuff > 0) {
        tactDisplay.innerHTML = `✨ +${matchState.nextBuff} Tática`;
        tactDisplay.style.display = "flex";
        tactDisplay.setAttribute("data-tip", GAME_CONTENT.tooltips.tactical);
    } else { tactDisplay.style.display = "none"; }

    _renderPlayerButtons();
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
    let riskyNodes = shuffle(pool.filter(n => n.riskLevel !== "safe"));

    if (Math.random() < (GAME_BALANCE.mechanics.safeActionChance ?? 0.15) && safeNodes.length > 0) selected.push(shuffle(safeNodes)[0]);
    while (selected.length < (isCritical ? 2 : 3) && riskyNodes.length > 0) selected.push(riskyNodes.pop());

    if (!selected.some(n => n.comboReq === "ALL" ? matchState.combo > 0 : (!n.comboReq || matchState.combo >= n.comboReq))) {
        let affordable = pool.filter(n => n.comboReq === "ALL" ? matchState.combo > 0 : (!n.comboReq || matchState.combo >= n.comboReq));
        if (affordable.length > 0) selected[0] = rnd(affordable);
    }

    selected = shuffle(selected);
    wrapper.className = `field-container ${matchState.hasBall ? 'atk-theme' : 'def-theme'} pop-in`;

    const power = getTeamPower();
    const traits = getTeamTraits();
    const markingDebuff = traits.marking * 12;

    selected.forEach((node) => {
        const btn = document.createElement("button");
        let canAfford = true;
        let comboBadge = "";

        // Badge de Combo com Aviso de Falta
        if (node.comboReq === "ALL") {
            if (matchState.combo <= 0) canAfford = false;
            comboBadge = canAfford ? `<span class="combo-badge">TUDO 🔥</span>` : `<span class="combo-badge" style="color:var(--accent-red); border-color:var(--accent-red); background:rgba(248,113,113,0.15);">FALTA COMBO</span>`;
        }
        else if (node.comboReq > 0) {
            if (matchState.combo < node.comboReq) canAfford = false;
            comboBadge = canAfford ? `<span class="combo-badge">-${node.comboReq} 🔥</span>` : `<span class="combo-badge" style="color:var(--accent-red); border-color:var(--accent-red); background:rgba(248,113,113,0.15);">FALTA COMBO</span>`;
        }
        else if (node.comboGen > 0) {
            comboBadge = `<span class="combo-badge">+${node.comboGen} 🔥</span>`;
        }

        let finalMod = node.id === "bicycle" ? node.mod + (Math.min(matchState.combo, 6) * 0.1) : node.mod;
        let traitBonus = getTraitBonusForNode(node, traits);
        let pToUse = (node.type === 'atk' || node.type === 'shoot') ? power.atk : power.def;
        let pBase = (pToUse * finalMod) + matchState.nextBuff + (matchState.momentum * 5) + traitBonus;

        if (matchState.badLuckCounter > 0) pBase += GAME_BALANCE.mechanics.luckEvents.penaltyPower;

        let rBase = Math.max(1, (matchState.hasBall ? matchState.rivalProfile.def : matchState.rivalProfile.atk) - markingDebuff);
        let chance = node.riskLevel !== "safe" ? calcWinChance(pBase, rBase, GAME_BALANCE.mechanics.rngRange) : 100;

        if (traitBonus > 0 && node.riskLevel !== "safe") {
            let chanceOfFail = (100 - chance) / 100;
            let realChance = 1 - (chanceOfFail * chanceOfFail);
            chance = Math.round(realChance * 100);
        }

        let colorClass = chance >= 65 ? "risk-safe" : chance >= 40 ? "risk-med" : "risk-high";
        let chanceColor = chance >= 65 ? "var(--accent-green)" : chance >= 40 ? "var(--accent-gold)" : "var(--accent-red)";

        btn.className = `node-btn ${colorClass} active ${gameState.settings.requireConfirm ? 'confirm-enabled' : ''}`;
        if (!canAfford) btn.disabled = true;

        // ==========================================================
        // TEXTOS DE SUCESSO/FRACASSO OTIMIZADOS P/ MOBILE (Uso de Ícones)
        // ==========================================================
        let succLabel = "";
        if (node.type === 'shoot') succLabel = "Gol";
        else if (node.type === 'save') succLabel = "Defesa";
        else succLabel = node.successMove > 0 ? `Avança +${node.successMove}` : "Mantém";

        if (node.nextBuff && node.nextBuff > 0) succLabel += ` <span class="buff-text">(+✨)</span>`;

        let failLabel = "";
        let failClass = "fail";
        if (node.riskLevel === "safe") { failLabel = "Sem Risco"; failClass += " safe"; }
        else if (node.type === 'save') failLabel = "Sofre Gol";
        else failLabel = node.failMove < 0 ? `Recua ${Math.abs(node.failMove)}` : "Perde Posse";

        // ==========================================================

        let synergies = [];
        if (node.type === 'shoot') synergies.push(PERK_LIST.find(p => p.id === 'finishing'));
        if (node.type === 'atk') synergies.push(PERK_LIST.find(p => p.id === 'passing'));
        if (node.type === 'def') synergies.push(PERK_LIST.find(p => p.id === 'tackling'));
        if (node.type === 'save') synergies.push(PERK_LIST.find(p => p.id === 'reflexes'));
        if (node.riskLevel === 'high') synergies.push(PERK_LIST.find(p => p.id === 'pace'));

        let synHtml = synergies.map(s => `<span data-tip="${s.name}" style="font-size:0.8rem;">${s.emoji}</span>`).join('');
        let synBadge = '';
        let synergyIds = synergies.map(s => s.id);

        if (synergies.length > 0) {
            if (traitBonus > 0) {
                btn.classList.add("has-synergy");
                synBadge = `<div class="action-synergy active">${synHtml} <span>BÔNUS</span></div>`;
            } else {
                synBadge = `<div class="action-synergy inactive">${synHtml} <span>Sinergia</span></div>`;
            }
        }

        // HTML ESTRUTURAL BASEADO EM CLASSES (Muito mais limpo)
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
            if (!gameState.settings.requireConfirm || selectedActionNodeId === node.id) {
                removeHighlightPlayers();
                await resolveProceduralNode(node, power, e);
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
            if (traitBonus > 0) highlightSynergyPlayers(synergyIds);
        };
        btn.onpointerleave = () => {
            renderMinimap();
            removeHighlightPlayers();
        };
        wrapper.appendChild(btn);
    });
}

async function resolveProceduralNode(node, power, event) {
    document.querySelectorAll(".node-btn").forEach(b => { b.disabled = true; b.style.pointerEvents = "none"; });

    const traits = getTeamTraits();
    const traitBonus = getTraitBonusForNode(node, traits);

    let pToUse = (node.type === 'atk' || node.type === 'shoot') ? power.atk : power.def;
    let finalMod = node.id === "bicycle" ? node.mod + (Math.min(matchState.combo, 6) * 0.1) : node.mod;

    let pBaseFixed = (pToUse * finalMod) + matchState.nextBuff + (matchState.momentum * 5) + traitBonus;
    if (matchState.badLuckCounter > 0) pBaseFixed += GAME_BALANCE.mechanics.luckEvents.penaltyPower;

    let rPowFixed = Math.max(1, (matchState.hasBall ? matchState.rivalProfile.def : matchState.rivalProfile.atk) - (traits.marking * 12));
    let rTraitBonus = getRivalTraitBonus(node, matchState.rivalTeamRef);

    let pRoll = pBaseFixed + Math.floor(Math.random() * GAME_BALANCE.mechanics.rngRange);
    let rRoll = rPowFixed + rTraitBonus + Math.floor(Math.random() * GAME_BALANCE.mechanics.rngRange);

    let isSuccess = (node.riskLevel === "safe") ? true : (pRoll >= rRoll);
    let usedSecondChance = false;

    if (!isSuccess && traitBonus > 0 && node.riskLevel !== "safe") {
        let pRoll2 = pBaseFixed + Math.floor(Math.random() * GAME_BALANCE.mechanics.rngRange);
        let rRoll2 = rPowFixed + rTraitBonus + Math.floor(Math.random() * GAME_BALANCE.mechanics.rngRange);

        if (pRoll2 >= rRoll2) {
            isSuccess = true;
            usedSecondChance = true;
        }
    }

    let wasPityUsed = false;

    if (traitBonus > 0 && node.riskLevel !== "safe" && matchState.advantageFailCounter >= 2) {
        isSuccess = true;
        wasPityUsed = true;
    }

    const x = event.clientX || window.innerWidth / 2, y = event.clientY || window.innerHeight / 2;
    matchState.currentAction++;
    updateTimerDisplay();

    if (node.type === 'shoot' || node.type === 'save') await playSuspenseSequence((node.type === 'shoot'), isSuccess);

    let goalScored = false, isUserGoal = false;

    if (isSuccess) {
        if (traitBonus > 0) {
            matchState.advantageFailCounter = 0;
        }

        matchState.momentum = clamp(matchState.momentum + 1, -3, 3);

        if (wasPityUsed || usedSecondChance) {
            createJuiceText(`Sinergia! ✨`, "#a855f7", x, y - 50);
            addMatchLog(`O fundamento salvou a jogada na insistência!`, "success");
        } else if (traitBonus > 0) {
            createJuiceText(`+${traitBonus} Fundamento!`, "#a855f7", x, y - 50);
            addMatchLog(`Fundamento: +${traitBonus} na jogada!`, "success");
        }

        if (node.comboReq === "ALL") matchState.combo = 0; else if (node.comboReq) matchState.combo = Math.max(0, matchState.combo - node.comboReq);
        if (node.comboGen) matchState.combo += node.comboGen;

        document.getElementById("game-container").classList.add("flash-success");
        setTimeout(() => document.getElementById("game-container").classList.remove("flash-success"), 400);

        if (!matchState.hasBall) matchState.hasBall = true;
        matchState.zone = Math.min(4, matchState.zone + node.successMove);
        matchState.nextBuff = node.nextBuff || 0;

        if (node.type === 'shoot' && matchState.zone >= 4) { goalScored = true; isUserGoal = true; }
        else if (node.type !== 'shoot' && node.type !== 'save') { createJuiceText(matchState.nextBuff > 0 ? "Lindo! ✨" : node.name, "#34d399", x, y); addMatchLog(getRandomLog('success', node.name), 'success'); }
        else if (node.type === 'save') { createJuiceText("DEFESAÇA!", "#38bdf8", x, y); addMatchLog("Defesa espetacular!", 'success'); }
    } else {
        if (traitBonus > 0 && node.riskLevel !== "safe") {
            matchState.advantageFailCounter++;
        }

        matchState.momentum = clamp(matchState.momentum - 1, -3, 3);
        matchState.combo = 0; matchState.nextBuff = 0;
        document.getElementById("game-container").classList.add("shake");
        setTimeout(() => document.getElementById("game-container").classList.remove("shake"), 300);

        if (matchState.hasBall) matchState.hasBall = false;
        matchState.zone = Math.max(0, matchState.zone + node.failMove);

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
        addMatchLog(getRandomLog('goalUser'), "goal-user"); fireConfetti();
    } else {
        matchState.rivalScore++; document.getElementById("score-rival").innerText = matchState.rivalScore;
        createJuiceText("😢 Gol", "#ef4444", window.innerWidth / 2, window.innerHeight / 2);
        addMatchLog(getRandomLog('goalRival'), "goal-rival");
    }
    matchState.zone = 2; matchState.hasBall = !isUserGoal; matchState.nextBuff = 0; matchState.combo = 0; matchState.momentum = 0;

    if (matchState.isExtraTime) {
        setTimeout(() => finishMatchRewards(), 700);
        return;
    }

    if (matchState.currentAction >= matchState.totalActions) { setTimeout(() => endMatchByTime(), 700); return; }
    setTimeout(() => updateFieldState(), 700);
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

            document.getElementById("pm-title").innerText = "ELIMINADO";
            document.getElementById("pm-title").className = `pm-title loss`;
            document.getElementById("pm-score").innerText = `${matchState.userScore} x ${matchState.rivalScore}`;
            document.getElementById("pm-info").innerText = "A campanha terminou mais cedo. Você não sobreviveu ao mapa.";
            document.getElementById("pm-coins").innerText = "+0 💰";

            document.querySelector("#post-match-overlay .btn-primary").innerText = "VOLTAR AO MENU";
            document.querySelector("#post-match-overlay .btn-primary").onclick = () => {
                document.getElementById('post-match-overlay').style.display = 'none';
                returnToTitle();
            };
            document.getElementById("post-match-overlay").style.display = "flex";
            return;
        }

        const base = GAME_BALANCE.leagues[gameState.leagueLevel].rewardBase;
        let mult = gameState.currentNode.type === 'elite' ? 2 : (gameState.currentNode.type === 'boss' ? 3 : 1);
        let coins = Math.floor(base * (1 + Math.min(matchState.combo, 6) * GAME_BALANCE.mechanics.comboCoinMultiplier)) * mult;

        let levelGainBase = gameState.currentNode.type === 'elite' ? 2 : 1;
        let totalLevelsGained = 0;

        gameState.team.forEach(p => {
            if (p.level < 10) {
                let gain = levelGainBase;
                if (p.perks && p.perks.some(perk => perk.id === 'growth')) gain += 1;

                let oldLvl = p.level;
                p.level = Math.min(10, p.level + gain);
                if (p.level > oldLvl) {
                    p.justLeveledUp = true;
                    totalLevelsGained += (p.level - oldLvl);
                }
            }
        });

        gameState.coins += coins;
        updateRosterUI();
        fireConfetti();

        document.getElementById("pm-title").innerText = "VITÓRIA!";
        document.getElementById("pm-title").className = `pm-title victory`;
        document.getElementById("pm-score").innerText = `${matchState.userScore} x ${matchState.rivalScore}`;

        document.getElementById("pm-info").innerText = gameState.currentNode.type === 'boss' ? "O CHEFÃO CAIU! MAPA VENCIDO!" : "O caminho está livre. Continue subindo!";

        let rewardsText = `+${coins} 💰`;
        document.getElementById("pm-coins").innerText = rewardsText;

        document.querySelector("#post-match-overlay .btn-primary").innerText = "CONTINUAR A JORNADA";
        document.querySelector("#post-match-overlay .btn-primary").onclick = () => advanceMapAfterMatch();

        document.getElementById("post-match-overlay").style.display = "flex";
    }, 500);
}

function advanceMapAfterMatch() {
    document.getElementById('post-match-overlay').style.display = 'none';
    advanceMapNode();
}