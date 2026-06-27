function startNewSeason() {
    closeModals();
    gameState.season.currentStage = 0;
    gameState.season.history = [];
    gameState.season.matchHistory = [];
    gameState.activeCampBuff = 0;

    gameState.season.map = generateMapNodes();

    // Atualiza a interface
    if (typeof updateRosterUI === "function") updateRosterUI();
    saveGame();

    const mapWrap = document.getElementById('map-wrapper');
    if (mapWrap) mapWrap.scrollTop = 0;

    renderMap();
}

function generateMapNodes() {
    const diff = GAME_BALANCE.leagues[gameState.leagueLevel].difficulty;
    const totalStages = GAME_BALANCE.mechanics.runStages || 8;
    let map = [];

    const stageWidths = [3, 2, 2, 3, 2, 2, 2, 1];

    for (let i = 0; i < totalStages; i++) {
        let stage = [];
        let numNodes = stageWidths[i] || 2;

        for (let j = 0; j < numNodes; j++) {
            let type = 'match';

            if (i === totalStages - 1) {
                type = 'boss';
            }
            else if (i === 2 || i === 5) {
                // RITMO PERFEITO: Substituímos o 'shop' pelo 'camp_physical'
                if (j === 0) {
                    type = 'camp_physical';
                } else {
                    type = 'camp_tactical';
                }
            }
            else {
                if (i === 0) {
                    type = 'match';
                } else {
                    let eliteChance = (i >= 3) ? 0.35 : 0.15;
                    type = Math.random() <= eliteChance ? 'elite' : 'match';
                }
            }

            let node = (type.startsWith('camp') || type === 'shop') ? { type } : createMapRivalNode(type, diff, i);
            node.id = `n_${i}_${j}`;
            node.stage = i;
            node.index = j;
            node.x = j / Math.max(1, numNodes - 1);
            node.next = [];
            stage.push(node);
        }
        map.push(stage);
    }

    for (let i = 0; i < totalStages - 1; i++) {
        let curr = map[i];
        let next = map[i + 1];

        curr.forEach((node, cIdx) => {
            let validNext = next.map((n, nIdx) => ({ nIdx, dist: Math.abs(node.x - n.x) })).sort((a, b) => a.dist - b.dist);
            node.next.push(validNext[0].nIdx);

            if (validNext.length > 1 && Math.random() < 0.4 && validNext[1].dist <= 0.6) {
                node.next.push(validNext[1].nIdx);
            }
        });

        next.forEach((nextNode, nIdx) => {
            let hasIncoming = curr.some(n => n.next.includes(nIdx));
            if (!hasIncoming) {
                let validPrev = curr.map((n, cIdx) => ({ cIdx, dist: Math.abs(n.x - nextNode.x) })).sort((a, b) => a.dist - b.dist);
                curr[validPrev[0].cIdx].next.push(nIdx);
            }
        });

        curr.forEach(node => node.next = [...new Set(node.next)]);
    }
    return map;
}

function createMapRivalNode(type, baseDiff, stageIndex = 0) {
    const base = rnd(GAME_CONTENT.clubGeneration.bases);
    const adj = rnd(GAME_CONTENT.clubGeneration.adjectives);
    const style = rnd(GAME_CONTENT.rivalStyles);
    const scale = GAME_BALANCE.mechanics.scaling || {};

    let currentLeague = GAME_BALANCE.leagues[gameState.leagueLevel];
    let rivalLevel = 1;

    let leagueBaseLevel = currentLeague.enemyBaseLevel !== undefined ? currentLeague.enemyBaseLevel : 1;
    let leagueLevelScaling = currentLeague.levelScaling !== undefined ? currentLeague.levelScaling : 0;

    rivalLevel = leagueBaseLevel + (leagueLevelScaling * stageIndex);

    if (currentLeague.dynamicScaling) {
        let teamLevel = getTeamAverageLevel();
        let offset = currentLeague.levelOffset || 0;
        rivalLevel = Math.max(rivalLevel, teamLevel + offset);
    }

    if (type === 'elite') rivalLevel += (scale.eliteLevelBonus || 6);
    if (type === 'boss') rivalLevel += (scale.bossLevelBonus || 12);

    return {
        id: `node_${Date.now()}_${Math.random()}`,
        type: type,
        rival: {
            name: `${base.name} ${adj}`,
            emoji: base.emoji,
            style: style,
            perks: [],
            level: Math.max(-10, Math.floor(rivalLevel)),
            dynamicTraitsSet: false
        }
    };
}

function renderMap() {
    showScreen('screen-map');

    // CORREÇÃO DO BUG: Verifica se o elemento de moedas existe antes de atualizar
    const mapCoins = document.getElementById('map-coins');
    if (mapCoins) {
        mapCoins.innerText = gameState.coins;
    }

    if (typeof updateRosterUI === "function") updateRosterUI();

    const container = document.getElementById('map-nodes-container');
    container.innerHTML = `<svg id="map-lines" style="position: absolute; top:0; left:0; width:100%; height:100%; z-index:0; pointer-events:none;"></svg>`;

    let currentLeagueName = GAME_BALANCE.leagues[gameState.leagueLevel].name;

    const totalStages = GAME_BALANCE.mechanics.runStages || 8;

    for (let sIdx = 0; sIdx < totalStages; sIdx++) {
        let stage = gameState.season.map[sIdx];
        let row = document.createElement('div');
        row.className = 'map-stage';

        stage.forEach(node => {
            let btn = document.createElement('div');
            btn.id = `map-node-${node.stage}-${node.index}`;

            // Padrão visual único
            let baseClass = node.type === 'boss' ? 'map-node boss' : 'map-node';
            btn.className = baseClass;

            let isActive = false;

            if (sIdx < gameState.season.currentStage) {
                if (gameState.season.history[sIdx] === node.index) btn.classList.add('completed');
                else btn.classList.add('locked');
            } else if (sIdx === gameState.season.currentStage) {
                if (sIdx === 0) isActive = true;
                else {
                    let prevIdx = gameState.season.history[sIdx - 1];
                    let parentNode = gameState.season.map[sIdx - 1][prevIdx];
                    if (parentNode.next.includes(node.index)) isActive = true;
                }
                if (isActive) btn.classList.add('active'); else btn.classList.add('locked');
            } else {
                btn.classList.add('locked');
            }

            let icon = '⚽';
            let nodeName = 'Partida';

            if (node.type === 'match') { icon = '⚽'; nodeName = t('MAP_NODE_MATCH'); }
            else if (node.type === 'elite') { icon = '⚽'; nodeName = t('MAP_NODE_MATCH'); }
            else if (node.type === 'boss') { icon = '👑'; nodeName = t('MAP_NODE_FINAL'); }
            else if (node.type === 'shop') { icon = '🕵️‍♂️'; nodeName = t('MAP_NODE_SCOUT'); }
            else if (node.type === 'camp_physical') { icon = '🏋️‍♂️'; nodeName = t('MAP_NODE_TRAINING'); }
            else if (node.type === 'camp_tactical') { icon = '🧠'; nodeName = t('MAP_NODE_LECTURE'); }

            btn.innerHTML = `
                <div class="node-icon">${icon}</div>
                <div class="node-label">${nodeName}</div>
            `;

            if (isActive) btn.onclick = () => handleMapNodeClick(node);
            row.appendChild(btn);
        });
        container.appendChild(row);
    }

    setTimeout(drawMapLines, 100);
}

function drawMapLines() {
    const svg = document.getElementById('map-lines');
    const container = document.getElementById('map-nodes-container');
    if (!svg || !container) return;
    svg.innerHTML = '';
    svg.style.height = container.scrollHeight + 'px';

    const contRect = container.getBoundingClientRect();

    const map = gameState.season.map;
    for (let i = 0; i < map.length - 1; i++) {
        map[i].forEach(node => {
            const el1 = document.getElementById(`map-node-${node.stage}-${node.index}`);
            if (!el1) return;
            const rect1 = el1.getBoundingClientRect();
            const x1 = rect1.left - contRect.left + rect1.width / 2;
            const y1 = rect1.top - contRect.top + rect1.height / 2;

            node.next.forEach(nextIdx => {
                const el2 = document.getElementById(`map-node-${i + 1}-${nextIdx}`);
                if (!el2) return;
                const rect2 = el2.getBoundingClientRect();
                const x2 = rect2.left - contRect.left + rect2.width / 2;
                const y2 = rect2.top - contRect.top + rect2.height / 2;

                let lineClass = 'map-line';
                let isHistory = gameState.season.history[i] === node.index;
                let isNextHistory = gameState.season.history[i + 1] === nextIdx;

                if (isHistory && isNextHistory) { lineClass += ' traversed'; }
                else if (isHistory && i === gameState.season.currentStage - 1) { lineClass += ' available'; }

                let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1); line.setAttribute('y1', y1);
                line.setAttribute('x2', x2); line.setAttribute('y2', y2);
                line.setAttribute('class', lineClass);
                svg.appendChild(line);
            });
        });
    }
}
window.addEventListener('resize', drawMapLines);

function handleMapNodeClick(node) {
    gameState.currentNode = node;

    if (typeof playSFX === 'function') playSFX('click');

    if (node.type === 'match' || node.type === 'elite' || node.type === 'boss') {
        const threat = GAME_BALANCE.mechanics.threatLevels[node.type] || GAME_BALANCE.mechanics.threatLevels['match'];

        if (!node.rival.dynamicTraitsSet) {
            let currentLeague = GAME_BALANCE.leagues[gameState.leagueLevel];

            let leagueBaseTraits = currentLeague.enemyBaseTraits !== undefined ? currentLeague.enemyBaseTraits : 0;
            let leagueTraitScaling = currentLeague.traitScaling !== undefined ? currentLeague.traitScaling : 0;

            let rivalTraitCount = leagueBaseTraits + (leagueTraitScaling * node.stage);
            rivalTraitCount += threat.extraTraits;
            rivalTraitCount = Math.max(0, Math.floor(rivalTraitCount));

            node.rival.perks = [];
            for (let i = 0; i < rivalTraitCount; i++) {
                node.rival.perks.push(rndWeighted(PERK_LIST));
            }
            node.rival.dynamicTraitsSet = true;
            saveGame();
        }

        const modal = document.getElementById('pre-match-overlay');
        const details = document.getElementById('pre-match-details');

        let threatColor = threat.color;
        let threatLabel = t(threat.label);
        let levelGain = threat.expReward;

        let perkCounts = {};
        node.rival.perks.forEach(perk => {
            if (!perkCounts[perk.id]) perkCounts[perk.id] = { ...perk, count: 1 };
            else perkCounts[perk.id].count++;
        });

        let perksHtml = Object.values(perkCounts).map(perk => {
            let countLabel = perk.count > 1 ? ` <span style="color:var(--accent-gold); font-weight:900;">x${perk.count}</span>` : "";
            // Usando a função t() nas chaves do perk
            return `<span data-tip="${t(perk.desc)}" style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; background: rgba(0,0,0,0.5); padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-light); font-size: 0.8rem; font-weight: 800; white-space: nowrap; color: #e2e8f0; pointer-events: auto;">${perk.emoji} ${t(perk.name)}${countLabel}</span>`;
        }).join('');

        if (!perksHtml) {
            perksHtml = `<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">${t('SKILLS_NOT_FOUND')}</span>`;
        }

        let teamLvl = getTeamAverageLevel();
        let rivalLvl = node.rival.level;
        let lvlColor = rivalLvl > teamLvl ? "var(--accent-red)" : (rivalLvl < teamLvl ? "var(--accent-green)" : "#fff");
        let lvlIcon = rivalLvl > teamLvl ? "⚠️" : (rivalLvl < teamLvl ? "✅" : "⚖️");

        details.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 20px;">
                <div style="font-size:4.5rem; margin-bottom:5px; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5)); line-height: 1;">${node.rival.emoji}</div>
                <h3 style="color:#fff; font-size:1.5rem; text-transform:uppercase; letter-spacing: 1px; margin-top: 15px;">${tClub(node.rival.name)}</h3>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="background:rgba(0,0,0,0.3); padding: 12px; border-radius:8px; border-bottom: 3px solid ${threatColor}; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                    <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">${t('LABEL_THREAT')}</span>
                    <span style="font-size:0.9rem; font-weight:900; color:${threatColor}; text-transform:uppercase; text-align:center;">${t(threatLabel)}</span>
                </div>
                <div style="background:rgba(0,0,0,0.3); padding: 12px; border-radius:8px; border-bottom: 3px solid var(--accent-blue); display:flex; flex-direction:column; align-items:center; justify-content:center;">
                    <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 4px;">${t('LABEL_REWARD')}</span>
                    <span style="font-size:0.9rem; font-weight:900; color:var(--accent-blue); text-transform:uppercase; text-align:center;">+${levelGain} ${t('LABEL_LEVEL')}</span>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    } else if (node.type === 'camp_physical') {
        executePhysicalCamp();
    } else if (node.type === 'camp_tactical') {
        executeTacticalCamp();
    } else if (node.type === 'shop') {
        openShopNode();
    }
}

window.executePhysicalCamp = function () {
    showLevelDistribution(1, () => {
        advanceMapNode();
    }, true);
};

window.executeTacticalCamp = function () {
    gameState.activeCampBuff = 15;

    if (typeof createJuiceText === 'function') {
        createJuiceText("🧠 +15 TÁTICA!", "var(--accent-blue)", window.innerWidth / 2, window.innerHeight / 2);
    }

    advanceMapNode();
};

function advanceMapNode() {
    gameState.season.history[gameState.season.currentStage] = gameState.currentNode.index;
    gameState.season.currentStage++;
    progressDailyMission('reach_stage', 1);
    saveGame();

    const totalStages = GAME_BALANCE.mechanics.runStages || 8;
    if (gameState.season.currentStage >= totalStages) finishSeason(true);
    else renderMap();
}

function recordRun(wonSeason) {
    const runData = {
        id: Date.now(),
        date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        club: gameState.club,
        result: wonSeason ? "CAMPEÃO" : "ELIMINADO",
        stageReached: gameState.season.currentStage,
        matches: [...gameState.season.matchHistory],
        finalTeam: [...gameState.team],
        // INCLUA ESTA NOVA LINHA PARA SALVAR OS ARTILHEIROS:
        playerStats: gameState.season.playerStats ? JSON.parse(JSON.stringify(gameState.season.playerStats)) : {}
    };

    if (!gameState.runHistory) gameState.runHistory = [];
    gameState.runHistory.unshift(runData);
    if (gameState.runHistory.length > 30) gameState.runHistory.pop();
    saveGame();
}

function finishSeason(wonSeason) {
    if (wonSeason) {
        gameState.team.forEach(p => {
            if (!p.stats) p.stats = { matches: 0, goals: 0, passes: 0, tackles: 0, saves: 0, cleanSheets: 0, titles: 0 };
            p.stats.titles++;
        });
    }

    recordRun(wonSeason);
    progressDailyMission('play_runs', 1);

    gameState.season.map = []; // Garante o fim da run após o resumo
    saveGame();

    let currentLeague = GAME_BALANCE.leagues[gameState.leagueLevel];
    let leagueEmoji = currentLeague.emoji || '🏆';
    const endIcon = document.querySelector('.champ-end-icon');
    if (endIcon) {
        endIcon.innerText = leagueEmoji;
    }

    let subText = wonSeason ? "\n🏆 TEMPORADA PERFEITA!\nO título é nosso e a torcida está em festa!" : "\n❌ ELIMINADO.\nUm tropeço duro. Junte os cacos e prepare o time para a próxima tentativa.";

    if (wonSeason) {
        let highest = gameState.meta.highestSeriesUnlocked || 0;

        if (gameState.leagueLevel === highest && highest < GAME_BALANCE.leagues.length - 1) {
            gameState.meta.highestSeriesUnlocked = highest + 1;
            let nextSeriesName = GAME_BALANCE.leagues[highest + 1].name;
            subText += `\n\n⭐ META ALCANÇADA! ⭐\nNova Liga Desbloqueada:\n👉 ${nextSeriesName} 👈`;
        }
    }

    let matchesWon = gameState.season.matchHistory.filter(m => m.userScore > m.rivalScore).length;
    let metaPerWin = (gameState.leagueLevel + 1) * 5;
    let metaWinBonus = (gameState.leagueLevel + 1) * 50;

    let earnedTrophies = matchesWon * metaPerWin;
    if (wonSeason) earnedTrophies += metaWinBonus;

    if (!gameState.meta.metaCoins) gameState.meta.metaCoins = 0;
    gameState.meta.metaCoins += earnedTrophies;
    saveGame();

    subText += `\n\nVitórias na liga: ${matchesWon} (+${matchesWon * metaPerWin} 💰)`;
    if (wonSeason) subText += `\nBônus de Campeão: +${metaWinBonus} 💰`;
    subText += `\n\n🏆 Você ganhou +${earnedTrophies} Troféus para usar na Sede do Clube!`;

    document.getElementById('se-sub').innerText = subText;
    document.getElementById('se-coins').innerText = `+${earnedTrophies} 💰`;
    document.getElementById('se-coins').style.color = "var(--accent-gold)";

    document.getElementById('season-end-overlay').style.display = 'flex';
}