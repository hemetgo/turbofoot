function startNewSeason() {
    closeModals();
    gameState.season.currentStage = 0;
    gameState.season.history = [];
    gameState.season.matchHistory = [];
    gameState.activeCampBuff = 0;

    gameState.season.map = generateMapNodes();
    updateRosterUI();
    saveGame();
    renderMap();
}

function generateMapNodes() {
    const diff = GAME_BALANCE.leagues[gameState.leagueLevel].difficulty;
    const STAGES = 10;
    let map = [];

    for (let i = 0; i < STAGES; i++) {
        let stage = [];
        let numNodes = (i === STAGES - 1) ? 1 : (i === 0 ? 3 : Math.floor(Math.random() * 2) + 3);

        for (let j = 0; j < numNodes; j++) {
            let type = 'match';
            if (i === STAGES - 1) type = 'boss';
            else if (i === 0) type = 'match';
            else if (i % 2 !== 0) type = Math.random() > 0.35 ? 'match' : 'elite';
            else {
                const r = Math.random();
                if (r < 0.35) type = 'camp';
                else if (r < 0.70) type = 'shop';
                else type = (Math.random() > 0.5 ? 'match' : 'elite');
            }

            let node = (type === 'camp' || type === 'shop') ? { type } : createMapRivalNode(type, diff, i);
            node.id = `n_${i}_${j}`;
            node.stage = i;
            node.index = j;
            node.x = j / Math.max(1, numNodes - 1);
            node.next = [];
            stage.push(node);
        }
        map.push(stage);
    }

    for (let i = 0; i < STAGES - 1; i++) {
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

    // Pega as mecânicas do JSON
    const mechanics = GAME_BALANCE.mechanics;
    const threat = mechanics.threatLevels[type] || mechanics.threatLevels['match'];

    let runScale = 1 + (stageIndex * mechanics.scaling.stageDifficultyStep);

    // Rola uma dificuldade dinamicamente baseada nos multiplicadores do JSON
    let minMult = threat.powerMultMin;
    let maxMult = threat.powerMultMax;
    let varMult = minMult + Math.random() * (maxMult - minMult);

    let rAtk = Math.floor(baseDiff * style.atkMod * varMult * runScale);
    let rDef = Math.floor(baseDiff * style.defMod * varMult * runScale);

    return {
        id: `node_${Date.now()}_${Math.random()}`, type: type,
        rival: {
            name: `${base.name} ${adj}`,
            emoji: base.emoji,
            style: style,
            perks: [],
            atk: rAtk,
            def: rDef,
            dynamicTraitsSet: false
        }
    };
}

function renderMap() {
    showScreen('screen-map');
    document.getElementById('map-coins').innerText = gameState.coins;
    updateRosterUI();

    const container = document.getElementById('map-nodes-container');
    container.innerHTML = `<svg id="map-lines" style="position: absolute; top:0; left:0; width:100%; height:100%; z-index:0; pointer-events:none;"></svg>`;

    let currentLeagueName = GAME_BALANCE.leagues[gameState.leagueLevel].name;
    document.getElementById('map-league-title').innerText = `${currentLeagueName}`;

    // MAPA AGORA RENDERIZA DE CIMA PARA BAIXO (Invertido)
    for (let sIdx = 0; sIdx <= 9; sIdx++) {
        let stage = gameState.season.map[sIdx];
        let row = document.createElement('div');
        row.className = 'map-stage';

        stage.forEach(node => {
            let btn = document.createElement('div');
            btn.id = `map-node-${node.stage}-${node.index}`;
            btn.className = `map-node ${node.type}`;

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

            let icon = node.type === 'elite' ? '🔥' : node.type === 'camp' ? '🏕️' : node.type === 'shop' ? '🛒' : node.type === 'boss' ? '👑' : '⚽';
            btn.innerHTML = `<div class="node-icon">${icon}</div>`;

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

    if (node.type === 'match' || node.type === 'elite' || node.type === 'boss') {
        const threat = GAME_BALANCE.mechanics.threatLevels[node.type] || GAME_BALANCE.mechanics.threatLevels['match'];

        // --- NOVA LÓGICA DE PAREAMENTO DINÂMICO USANDO JSON ---
        if (!node.rival.dynamicTraitsSet) {
            let playerTraitCount = 0;
            gameState.team.forEach(p => {
                if (p.perks) playerTraitCount += p.perks.length;
            });

            let variation = Math.floor(Math.random() * 5) - 2;
            let rivalTraitCount = Math.max(0, playerTraitCount + variation);

            // Soma a ameaça extra que vem configurada no JSON
            rivalTraitCount += threat.extraTraits;

            // NOVO: Garante que NENHUM rival terá menos de 2 traits
            rivalTraitCount = Math.max(2, rivalTraitCount);

            node.rival.perks = [];
            for (let i = 0; i < rivalTraitCount; i++) {
                node.rival.perks.push(rnd(PERK_LIST));
            }
            node.rival.dynamicTraitsSet = true;
            saveGame();
        }
        // ------------------------------------------

        const modal = document.getElementById('pre-match-overlay');
        const details = document.getElementById('pre-match-details');

        // Puxa as cores e textos do JSON
        let threatColor = threat.color;
        let threatLabel = threat.label;
        let levelGain = threat.expReward;

        let perkCounts = {};
        node.rival.perks.forEach(perk => {
            if (!perkCounts[perk.id]) perkCounts[perk.id] = { ...perk, count: 1 };
            else perkCounts[perk.id].count++;
        });

        let perksHtml = Object.values(perkCounts).map(perk => {
            let countLabel = perk.count > 1 ? ` <b style="color:var(--accent-gold);">(x${perk.count})</b>` : "";
            return `<span data-tip="${perk.desc}" style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.05); padding:6px 12px; border-radius:8px; ">${perk.emoji} ${perk.name}${countLabel}</span>`;
        }).join('');

        details.innerHTML = `
            <div style="font-size:3.5rem; margin-bottom:10px; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5)); text-align: center;">${node.rival.emoji}</div>
            <h3 style="color:#fff; margin-bottom:5px; font-size:1.4rem; text-transform:uppercase; text-align:center;">${node.rival.name}</h3>
            
            <div style="background:rgba(0,0,0,0.4); border-radius:12px; padding:15px; margin-bottom:15px; border:1px solid var(--border-light); display:flex; flex-direction:column; align-items:center;">
                <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:10px; font-weight:900; text-transform:uppercase; letter-spacing:1px;">Especialistas em:</div>
                <div style="display:flex; justify-content:center; flex-wrap:wrap; gap:10px; font-size:0.9rem; font-weight:900; color:var(--accent-blue);">
                    ${perksHtml}
                </div>
            </div>

            <div style="background:rgba(0,0,0,0.4); padding: 10px; border-radius:8px; border-left: 4px solid var(--accent-blue); display:flex; justify-content:center; margin-bottom: 15px;">
                <p style="font-size:0.85rem; font-weight:900; color:var(--accent-blue); text-transform:uppercase; margin:0;">EXP: Todos ganham +${levelGain} Nível</p>
            </div>
            
            <div style="background:rgba(0,0,0,0.4); padding: 10px; border-radius:8px; border-left: 4px solid ${threatColor}; display:flex; justify-content:center;">
                <p style="font-size:0.9rem; font-weight:900; color:${threatColor}; text-transform:uppercase; margin:0;">Ameaça: ${threatLabel}</p>
            </div>
        `;
        modal.style.display = 'flex';
    } else if (node.type === 'camp') {
        document.getElementById('camp-overlay').style.display = 'flex';
    } else if (node.type === 'shop') {
        openShopNode();
    }
}

function promptCampTrain() {
    document.getElementById('camp-overlay').style.display = 'none';
    document.getElementById('camp-train-overlay').style.display = 'flex';

    const list = document.getElementById('camp-train-list');
    list.innerHTML = '';

    gameState.team.forEach((p, i) => {
        let styleAttr = p.level >= 10 ? 'opacity:0.4; pointer-events:none;' : 'cursor:pointer;';
        list.innerHTML += getPlayerCardHTML(p, `style="${styleAttr}" onclick="executeCampTrain(${i})"`);
    });
}

function executeCampTrain(index) {
    let p = gameState.team[index];

    p.level = Math.min(10, p.level + 1);
    p.justLeveledUp = true;

    // NOVO: Lógica de ganhar Trait
    if (!p.perks) p.perks = [];
    if (p.perks.length < 2) {
        // Filtra os traits que o jogador AINDA NÃO TEM para não vir repetido
        let availablePerks = PERK_LIST.filter(perk => !p.perks.some(existing => existing.id === perk.id));
        if (availablePerks.length > 0) {
            p.perks.push(rnd(availablePerks));
            createJuiceText("NOVO TRAIT! ✨", "var(--accent-purple)", window.innerWidth / 2, window.innerHeight / 2 - 50);
        }
    }

    // Feedback visual extra do level up
    createJuiceText("LEVEL UP! ⬆️", "var(--accent-green)", window.innerWidth / 2, window.innerHeight / 2);

    document.getElementById('camp-train-overlay').style.display = 'none';
    updateRosterUI();
    fireConfetti();
    advanceMapNode();
}

function closeCampTrainModal() {
    document.getElementById('camp-train-overlay').style.display = 'none';
    document.getElementById('camp-overlay').style.display = 'flex';
}

function applyCamp(choice) {
    if (choice === 'buff') {
        gameState.activeCampBuff = 15;
    }
    updateRosterUI();
    closeModals(); advanceMapNode();
}

function advanceMapNode() {
    gameState.season.history[gameState.season.currentStage] = gameState.currentNode.index;
    gameState.season.currentStage++;
    saveGame();
    if (gameState.season.currentStage > 9) finishSeason(true);
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
        finalTeam: [...gameState.team]
    };

    if (!gameState.runHistory) gameState.runHistory = [];
    gameState.runHistory.unshift(runData);
    if (gameState.runHistory.length > 30) gameState.runHistory.pop();
    saveGame();
}

function finishSeason(wonSeason) {
    recordRun(wonSeason);

    let subText = wonSeason ? "\n🏆 A CAMPANHA FOI UM SUCESSO!\nVocê completou o mapa!" : "\nDerrota dolorosa. Fim da jornada.";

    if (wonSeason) {
        let currentSeries = gameState.leagueLevel;
        let highest = gameState.meta.highestSeriesUnlocked || 0;

        if (currentSeries === highest && highest < GAME_BALANCE.leagues.length - 1) {
            gameState.meta.highestSeriesUnlocked = highest + 1;
            let nextSeriesName = GAME_BALANCE.leagues[highest + 1].name;
            subText += `\n\n⭐ META ALCANÇADA! ⭐\nNova Divisão Desbloqueada:\n👉 ${nextSeriesName} 👈`;
        }
    }

    // CALCULA TROFÉUS (Moeda Meta)
    let baseTrophies = gameState.season.currentStage * 2;
    let diffMult = (gameState.leagueLevel + 1);
    let earnedTrophies = baseTrophies * diffMult;
    if (wonSeason) earnedTrophies += (50 * diffMult); // Bônus por zerar

    if (!gameState.meta.metaCoins) gameState.meta.metaCoins = 0;
    gameState.meta.metaCoins += earnedTrophies;
    saveGame();

    subText += `\n\n🏆 Você ganhou +${earnedTrophies} Troféus para usar na Sede do Clube!`;

    document.getElementById('se-sub').innerText = subText;

    // Mostra os troféus NO LUGAR das moedas, com a formatação correta
    document.getElementById('se-coins').innerText = `+${earnedTrophies} 🏆`;
    document.getElementById('se-coins').style.color = "var(--accent-gold)";

    document.getElementById('season-end-overlay').style.display = 'flex';
}