// ==========================================
// TUTORIAL GUIADO - PRIMEIRA PARTIDA
// Textos localizados em locales/<idioma>/tutorial.json
// ==========================================

const TUTORIAL_LOCALE = "pt-br"; // troque aqui para mudar o idioma (ex: "en-us")

let TUTORIAL_DATA = null;
let tutorialStepIndex = 0;
let tutorialActiveSteps = [];

async function loadTutorialTexts() {
    if (TUTORIAL_DATA) return TUTORIAL_DATA;
    try {
        const res = await fetch(`/config_tutorial.json`);
        TUTORIAL_DATA = await res.json();
    } catch (e) {
        console.error("Falha ao carregar textos do tutorial:", e);
        TUTORIAL_DATA = null;
    }
    return TUTORIAL_DATA;
}

function ensureTutorialDOM() {
    if (document.getElementById("tutorial-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "tutorial-overlay";
    overlay.innerHTML = `
        <div id="tutorial-spotlight"></div>
        <div id="tutorial-card">
            <div class="tutorial-card-header">
                <span id="tutorial-progress"></span>
                <button id="tutorial-skip-btn" class="tutorial-skip-btn"></button>
            </div>
            <h3 id="tutorial-title"></h3>
            <p id="tutorial-text"></p>
            <div class="tutorial-card-footer">
                <button id="tutorial-prev-btn" class="btn-secondary btn-sm"></button>
                <button id="tutorial-next-btn" class="btn-primary btn-sm"></button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("tutorial-skip-btn").onclick = closeTutorial;
    document.getElementById("tutorial-next-btn").onclick = tutorialNextStep;
    document.getElementById("tutorial-prev-btn").onclick = tutorialPrevStep;
}

// Decide se o tutorial deve abrir automaticamente (primeira partida do jogador)
function shouldShowFirstMatchTutorial() {
    return !gameState.tutorialSeen;
}

async function startFirstMatchTutorial() {
    if (!shouldShowFirstMatchTutorial()) return;

    const data = await loadTutorialTexts();
    if (!data || !data.firstMatch) return;

    ensureTutorialDOM();
    tutorialActiveSteps = data.firstMatch.steps || [];
    tutorialStepIndex = 0;

    document.getElementById("tutorial-overlay").style.display = "flex";
    renderTutorialStep();
}

function renderTutorialStep() {
    const data = TUTORIAL_DATA.firstMatch;
    const step = tutorialActiveSteps[tutorialStepIndex];
    if (!step) return closeTutorial();

    const overlay = document.getElementById("tutorial-overlay");
    const spotlight = document.getElementById("tutorial-spotlight");
    const card = document.getElementById("tutorial-card");

    document.getElementById("tutorial-title").innerText = t(step.title || "");
    document.getElementById("tutorial-text").innerText = t(step.text || "");

    document.getElementById("tutorial-skip-btn").innerText =
        t(data.buttons?.skip || "TUTORIAL_BTN_SKIP");

    document.getElementById("tutorial-prev-btn").innerText =
        t(data.buttons?.prev || "TUTORIAL_BTN_PREV");

    const isLast = tutorialStepIndex === tutorialActiveSteps.length - 1;

    document.getElementById("tutorial-next-btn").innerText = isLast
        ? t(data.buttons?.done || "TUTORIAL_BTN_DONE")
        : t(data.buttons?.next || "TUTORIAL_BTN_NEXT");

    document.getElementById("tutorial-prev-btn").style.visibility =
        tutorialStepIndex === 0 ? "hidden" : "visible";

    const progressTpl = t(data.progressLabel || "TUTORIAL_PROGRESS");

    document.getElementById("tutorial-progress").innerText = progressTpl
        .replace("{current}", tutorialStepIndex + 1)
        .replace("{total}", tutorialActiveSteps.length);

    const targetEl = step.target ? document.querySelector(step.target) : null;

    if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const pad = 8;

        overlay.style.backgroundColor = "transparent";

        spotlight.style.display = "block";
        spotlight.style.top = `${rect.top - pad}px`;
        spotlight.style.left = `${rect.left - pad}px`;
        spotlight.style.width = `${rect.width + pad * 2}px`;
        spotlight.style.height = `${rect.height + pad * 2}px`;

        card.classList.remove("centered");
        positionCardNear(card, rect, step.placement || "bottom");

        targetEl.scrollIntoView({
            block: "nearest",
            behavior: "smooth"
        });
    } else {
        overlay.style.backgroundColor = "rgba(2, 6, 23, 0.85)";

        spotlight.style.display = "none";
        card.classList.add("centered");
        card.style.top = "";
        card.style.left = "";
    }

    overlay.style.display = "flex";
}

function positionCardNear(card, rect, placement) {
    const margin = 16;
    card.style.position = "fixed";

    // Mede o card antes de posicionar (já está no DOM, apenas invisível por estar fora da viewport ainda)
    card.style.visibility = "hidden";
    card.style.top = "0px";
    card.style.left = "0px";
    const cardRect = card.getBoundingClientRect();
    card.style.visibility = "visible";

    let top, left;

    if (placement === "top") {
        top = rect.top - cardRect.height - margin;
        left = rect.left + rect.width / 2 - cardRect.width / 2;
        if (top < margin) { top = rect.bottom + margin; } // sem espaço acima, desce
    } else { // "bottom" (padrão)
        top = rect.bottom + margin;
        left = rect.left + rect.width / 2 - cardRect.width / 2;
        if (top + cardRect.height > window.innerHeight - margin) { top = rect.top - cardRect.height - margin; }
    }

    left = Math.max(margin, Math.min(left, window.innerWidth - cardRect.width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - cardRect.height - margin));

    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
}

function tutorialNextStep() {
    if (tutorialStepIndex >= tutorialActiveSteps.length - 1) {
        closeTutorial();
        return;
    }
    tutorialStepIndex++;
    renderTutorialStep();
}

function tutorialPrevStep() {
    if (tutorialStepIndex <= 0) return;
    tutorialStepIndex--;
    renderTutorialStep();
}

function closeTutorial() {
    const overlay = document.getElementById("tutorial-overlay");
    if (overlay) overlay.style.display = "none";
    gameState.tutorialSeen = true;
    saveGame();
}

// Permite re-assistir o tutorial manualmente (ex: a partir do menu "Como Jogar")
function replayFirstMatchTutorial() {
    gameState.tutorialSeen = false;
    if (document.getElementById('screen-match')?.classList.contains('active')) {
        startFirstMatchTutorial();
    } else {
        closeModals();
        alert(t('TUTORIAL_NEXT_MATCH_ALERT'));
    }
}
