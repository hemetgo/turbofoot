// ==========================================
// SISTEMA DE LOCALIZAÇÃO (i18n)
// Textos em locales/<idioma>/strings.txt (formato chave=valor)
// ==========================================

let CURRENT_LANG = "en";
let I18N_STRINGS = {};

// Carrega e faz parse do arquivo strings.txt
async function loadLocale(lang = CURRENT_LANG) {
    CURRENT_LANG = lang;
    I18N_STRINGS = {};
    try {
        const res = await fetch(`locales/${lang}.txt`);
        const raw = await res.text();
        raw.split("\n").forEach(line => {
            line = line.trim();
            if (!line || line.startsWith("#")) return;
            const sepIndex = line.indexOf("=");
            if (sepIndex === -1) return;
            const key = line.slice(0, sepIndex).trim();
            const value = line.slice(sepIndex + 1).replace(/\\n/g, "\n");
            I18N_STRINGS[key] = value;
        });
    } catch (e) {
        console.error(`[i18n] Falha ao carregar locales/${lang}/strings.txt`, e);
    }
    return I18N_STRINGS;
}

// Busca uma string localizada pela chave. Suporta placeholders {var} via segundo argumento.
function t(key, vars) {
    let str = I18N_STRINGS[key];
    if (str === undefined) {
        console.warn(`[i18n] Chave ausente: "${key}"`);
        return key;
    }
    if (vars) {
        Object.keys(vars).forEach(k => {
            str = str.split(`{${k}}`).join(vars[k]);
        });
    }
    return str;
}

// NOVA FUNÇÃO: Traduz nomes de clubes compostos por múltiplas chaves (ex: "TEAM_BASE_HURRICANES TEAM_ADJ_SOUTH")
function tClub(compositeName) {
    if (!compositeName) return "";
    return compositeName.split(" ").map(word => t(word)).join(" ");
}

// Aplica as strings estáticas no HTML
function applyStaticI18n() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
        el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
}