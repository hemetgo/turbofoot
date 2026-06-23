// ==========================================
// MISSÕES DIÁRIAS
// ==========================================

function getTodayKey() {
    let d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Gera um número pseudo-aleatório determinístico a partir de uma string (seed),
// para que as missões do dia sejam as mesmas em qualquer load do mesmo dia.
function seededRandom(seedStr) {
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) {
        h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
    }
    return function () {
        h = (Math.imul(h, 2654435761) + 1) | 0;
        let t = h ^ (h >>> 15);
        return ((t >>> 0) % 10000) / 10000;
    };
}

function pickSeeded(arr, rngFn) {
    return arr[Math.floor(rngFn() * arr.length)];
}

function generateDailyMissions(dateKey) {
    const pool = GAME_BALANCE.missions?.pool || [];
    const count = GAME_BALANCE.missions?.missionsPerDay || 3;
    const rng = seededRandom(dateKey);

    // Embaralha o pool de forma determinística e pega os N primeiros (sem repetir tipo)
    let shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
        let j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    let chosen = shuffled.slice(0, Math.min(count, shuffled.length));

    return chosen.map(def => {
        let target = pickSeeded(def.targets, rng);
        return {
            id: def.id,
            type: def.type,
            label: def.label.replace('{target}', target),
            emoji: def.emoji,
            target: target,
            progress: 0,
            reward: def.reward,
            claimed: false
        };
    });
}

// Garante que gameState.daily existe e está atualizado para o dia de hoje.
// Se for um novo dia, gera novas missões e zera o progresso.
function ensureDailyMissions() {
    const todayKey = getTodayKey();

    if (!gameState.daily || gameState.daily.date !== todayKey) {
        gameState.daily = {
            date: todayKey,
            missions: generateDailyMissions(todayKey)
        };
        saveGame();
    }
}

// Avança o progresso de todas as missões diárias de um determinado tipo.
// Chamar nos pontos do jogo onde o evento correspondente acontece.
function progressDailyMission(type, amount = 1) {
    ensureDailyMissions();
    let changed = false;

    gameState.daily.missions.forEach(m => {
        if (m.type === type && !m.claimed && m.progress < m.target) {
            m.progress = Math.min(m.target, m.progress + amount);
            changed = true;
        }
    });

    if (changed) {
        saveGame();
        notifyDailyMissionProgress();
    }
}

// Mostra um pequeno aviso quando uma missão é concluída (sem travar o fluxo do jogo)
function notifyDailyMissionProgress() {
    let justCompleted = gameState.daily.missions.filter(m => !m.claimed && m.progress >= m.target && !m.notified);
    justCompleted.forEach(m => {
        m.notified = true;
        if (typeof addMatchLog === 'function' && document.getElementById('screen-match')?.classList.contains('active')) {
            addMatchLog(`Missão diária concluída: ${m.label}!`, 'success');
        }
    });
    if (justCompleted.length > 0) saveGame();
}

function claimDailyMission(missionId) {
    ensureDailyMissions();
    let m = gameState.daily.missions.find(x => x.id === missionId);
    if (!m || m.claimed || m.progress < m.target) return;

    m.claimed = true;
    if (!gameState.meta.metaCoins) gameState.meta.metaCoins = 0;
    gameState.meta.metaCoins += m.reward;
    saveGame();
    renderDailyMissionsModal();
    updateMissionsBadge();
}

function openDailyMissionsModal() {
    closeModals();
    ensureDailyMissions();
    renderDailyMissionsModal();
    document.getElementById('daily-missions-overlay').style.display = 'flex';
}

function renderDailyMissionsModal() {
    const list = document.getElementById('daily-missions-list');
    if (!list) return;
    list.innerHTML = '';

    gameState.daily.missions.forEach(m => {
        let pct = Math.min(100, Math.floor((m.progress / m.target) * 100));
        let isDone = m.progress >= m.target;
        let btnHtml = m.claimed
            ? `<span style="font-size:0.75rem; font-weight:900; color:var(--text-muted); text-transform:uppercase;">Resgatada</span>`
            : isDone
                ? `<button class="btn-primary" style="padding:6px 14px; font-size:0.8rem;" onclick="claimDailyMission('${m.id}')">RESGATAR</button>`
                : `<span style="font-size:0.8rem; font-weight:900; color:var(--text-muted);">${m.progress}/${m.target}</span>`;

        list.innerHTML += `
            <div style="display:flex; align-items:center; gap:12px; background:var(--bg-card); border:1px solid var(--border-light); border-radius:10px; padding:12px; margin-bottom:10px; ${m.claimed ? 'opacity:0.5;' : ''}">
                <div style="font-size:1.8rem; flex-shrink:0;">${m.emoji}</div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:900; color:#fff; font-size:0.9rem; margin-bottom:6px;">${m.label}</div>
                    <div style="background:rgba(0,0,0,0.4); border-radius:6px; height:8px; overflow:hidden;">
                        <div style="background:${isDone ? 'var(--accent-green)' : 'var(--accent-blue)'}; height:100%; width:${pct}%; transition: width 0.3s;"></div>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0;">
                    <div style="font-size:0.75rem; font-weight:900; color:var(--accent-gold);">+${m.reward} 🏆</div>
                    ${btnHtml}
                </div>
            </div>`;
    });

    // Contador de tempo até resetar (meia-noite local)
    const resetInfo = document.getElementById('daily-missions-reset-info');
    if (resetInfo) {
        let now = new Date();
        let midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        let diffMs = midnight - now;
        let h = Math.floor(diffMs / 3600000);
        let min = Math.floor((diffMs % 3600000) / 60000);
        resetInfo.innerText = `Renovam em ${h}h ${min}min`;
    }
}

function updateMissionsBadge() {
    ensureDailyMissions();
    const badge = document.getElementById('missions-badge');
    if (!badge) return;
    let readyCount = gameState.daily.missions.filter(m => !m.claimed && m.progress >= m.target).length;
    if (readyCount > 0) {
        badge.style.display = 'flex';
        badge.innerText = readyCount;
    } else {
        badge.style.display = 'none';
    }
}
