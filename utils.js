function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(id);
    if (target) target.classList.add("active");
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function shuffle(arr) {
    let array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function calcWinChance(pBase, rBase, rng) {
    const D = rBase - pBase;
    const R = rng;
    let probability = 0;

    if (D <= -R) { probability = 1; }
    else if (D >= R) { probability = 0; }
    else if (D <= 0) { probability = 1 - Math.pow(R + D, 2) / (2 * R * R); }
    else { probability = Math.pow(R - D, 2) / (2 * R * R); }

    let pct = Math.round(probability * 100);
    return clamp(pct, 5, 95);
}

function fitText(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.fontSize = '1.1rem';
    let fontSize = 1.1;
    setTimeout(() => {
        while (el.scrollWidth > el.clientWidth && fontSize > 0.6) {
            fontSize -= 0.05;
            el.style.fontSize = fontSize + 'rem';
        }
    }, 10);
}

function setupMarquee(elId, text) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerText = text;
    el.style.animation = "none";
    el.style.transform = "translateX(0)";
    void el.offsetWidth;
    setTimeout(() => {
        const parent = el.parentElement;
        if (el.scrollWidth > parent.clientWidth) {
            const dist = el.scrollWidth - parent.clientWidth + 10;
            el.style.setProperty('--scroll-dist', `-${dist}px`);
            el.style.animation = "marquee-swing 4s ease-in-out infinite alternate";
        }
    }, 100);
}

function closeModals() {
    document.querySelectorAll(".modal-overlay").forEach(m => m.style.display = 'none');
}