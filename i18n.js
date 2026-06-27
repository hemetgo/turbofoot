// ==========================================
// SISTEMA DE LOCALIZAÇÃO (i18n)
// Textos em locales/<idioma>.txt
// ==========================================

window.getSafeStorage = function () {
    // Se o SDK da CrazyGames carregou, usa o Cloud Data, senão usa o cache local comum
    if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.data) {
        return window.CrazyGames.SDK.data;
    }
    return localStorage;
};

let CURRENT_LANG = "en";
let I18N_STRINGS = {};
let I18N_FALLBACK_STRINGS = {};

function parseLocaleText(raw) {
    const strings = {};

    raw.split("\n").forEach(line => {
        line = line.trim();

        if (!line || line.startsWith("#")) return;

        const sepIndex = line.indexOf("=");

        if (sepIndex === -1) return;

        const key = line.slice(0, sepIndex).trim();
        const value = line
            .slice(sepIndex + 1)
            .replace(/\\n/g, "\n");

        strings[key] = value;
    });

    return strings;
}

async function loadLocale(lang = CURRENT_LANG) {
    CURRENT_LANG = lang;
    I18N_STRINGS = {};
    I18N_FALLBACK_STRINGS = {};

    try {
        const res = await fetch(`locales/${lang}.txt`);
        const raw = await res.text();
        I18N_STRINGS = parseLocaleText(raw);
    } catch (e) {
        console.error(`[i18n] Failed loading locales/${lang}.txt`, e);
    }

    if (lang !== "en") {
        try {
            const res = await fetch("locales/en.txt");
            const raw = await res.text();
            I18N_FALLBACK_STRINGS = parseLocaleText(raw);
        } catch (e) {
            console.error("[i18n] Failed loading fallback locale", e);
        }
    }

    return I18N_STRINGS;
}

function t(key, vars = null) {
    let str = I18N_STRINGS[key];

    if (str === undefined && CURRENT_LANG !== "en") {
        str = I18N_FALLBACK_STRINGS[key];
    }

    if (str === undefined) {
        console.warn(`[i18n] Missing key: ${key}`);
        return key;
    }

    if (vars) {
        Object.keys(vars).forEach(k => {
            str = str.replaceAll(`{${k}}`, vars[k]);
        });
    }

    return str;
}

function tClub(compositeName) {
    if (!compositeName) return "";

    return compositeName
        .split(" ")
        .map(word => t(word))
        .join(" ");
}

function applyStaticI18n() {

    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");

        if (el.tagName === "OPTION") {
            el.innerText = t(key);
        } else {
            el.textContent = t(key);
        }
    });

    document.querySelectorAll("[data-i18n-html]").forEach(el => {
        const key = el.getAttribute("data-i18n-html");
        el.innerHTML = t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        el.placeholder = t(key);
    });
}

async function changeLanguage(lang) {
    getSafeStorage().setItem("language", lang); // <-- Modificado

    await loadLocale(lang);
    applyStaticI18n();
    console.log("[i18n] language changed to", lang);
}

async function loadLanguagePreference() {
    // 1. Tenta pegar o idioma salvo na Nuvem/Dispositivo
    let lang = getSafeStorage().getItem("language"); // <-- Modificado

    if (!lang) {
        lang = navigator.language.toLowerCase().startsWith("pt") ? "pt-br" : "en";
    }

    // 3. Carrega as strings e aplica no HTML
    await loadLocale(lang);
    applyStaticI18n();

    // 4. Atualiza a caixinha de seleção no menu de opções
    const select = document.getElementById("language-select");
    if (select) {
        select.value = lang;
    }

    console.log("[i18n] language loaded:", lang);
}

window.t = t;
window.tClub = tClub;
window.changeLanguage = changeLanguage;
window.loadLanguagePreference = loadLanguagePreference;