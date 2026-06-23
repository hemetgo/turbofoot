// ===== SISTEMA DE LOCALIZAÇÃO (i18n) =====
// Sistema simples e eficiente para gerenciar múltiplos idiomas

let I18N = {
    currentLanguage: 'pt-br',
    translations: {},
    availableLanguages: [],

    // Carrega a lista de idiomas disponíveis
    // Carrega a lista de idiomas disponíveis
    async loadLanguages() {
        try {
            // 👇 Aqui ele busca exatamente o arquivo que você criou
            const response = await fetch('locales/index.json');
            if (!response.ok) throw new Error('Failed to load languages index');

            const data = await response.json();

            // 👇 Aqui ele pega o array "languages" do seu JSON e salva no sistema
            this.availableLanguages = data.languages || [];

            console.log(`✅ Languages loaded: ${this.availableLanguages.map(l => l.code).join(', ')}`);
        } catch (e) {
            console.error('Failed to load languages:', e);
            // Fallback de segurança caso o arquivo não seja encontrado
            this.availableLanguages = [
                { code: 'pt-br', name: 'Português (Brasil)', emoji: '🇧🇷', nativeName: 'Português' }
            ];
        }
    },

    // Detecta o idioma do dispositivo
    detectDeviceLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const baseLang = browserLang.split('-')[0];

        // Tenta encontrar um idioma disponível que corresponda ao navegador
        const match = this.availableLanguages.find(lang => lang.code.startsWith(baseLang));
        if (match) return match.code;

        // Caso contrário, usa o primeiro idioma disponível
        return this.availableLanguages[0]?.code || 'pt-br';
    },

    // Inicializa o i18n carregando as traduções
    async init() {
        try {
            // Primeiro carrega a lista de idiomas disponíveis
            await this.loadLanguages();

            // Detecta idioma: primeiro tenta usar o salvo, depois o do device
            const savedLang = localStorage.getItem('turboFoot_language');
            this.currentLanguage = savedLang || this.detectDeviceLanguage();

            console.log(`🌐 Loading language: ${this.currentLanguage} (saved: ${savedLang})`);

            // Sincroniza com gameState (se existir no seu escopo)
            if (typeof gameState !== 'undefined' && gameState.settings) {
                gameState.settings.language = this.currentLanguage;
            }

            // Carrega o JSON de strings
            const response = await fetch(`locales/${this.currentLanguage}/strings.json`);
            if (!response.ok) {
                console.error(`❌ Failed to load strings.json for ${this.currentLanguage}: ${response.status} ${response.statusText}`);
                throw new Error(`Failed to load ${this.currentLanguage}`);
            }

            this.translations = await response.json();
            console.log(`✅ i18n initialized with language: ${this.currentLanguage}`);
        } catch (e) {
            console.error('Failed to initialize i18n:', e);
            // Carrega pt-br como fallback
            this.currentLanguage = 'pt-br';
            try {
                const response = await fetch('locales/pt-br/strings.json');
                this.translations = await response.json();
                console.log(`✅ Fallback: i18n loaded with pt-br`);
            } catch (fallbackError) {
                console.error('Failed to load fallback language:', fallbackError);
            }
        }
    },

    // Função principal de tradução que estava faltando
    t(key, replacements = {}) {
        if (!this.translations) return key;

        // Permite buscar chaves aninhadas (ex: "menu.buttons.start")
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value === undefined || value === null) {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
            value = value[k];
        }

        if (value === undefined || value === null) {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }

        if (typeof value !== 'string') {
            console.warn(`Translation value is not a string: ${key}`);
            return key;
        }

        // Substitui variáveis no formato {varName}
        let result = value;
        for (const [search, replace] of Object.entries(replacements)) {
            result = result.replace(new RegExp(`{${search}}`, 'g'), replace);
        }

        return result;
    },

    // Muda o idioma
    async setLanguage(lang) {
        if (this.currentLanguage === lang) {
            console.log(`ℹ️ Language already set to ${lang}`);
            return;
        }

        try {
            console.log(`🔄 Switching language from ${this.currentLanguage} to ${lang}...`);

            // Tenta carregar o arquivo de strings do novo idioma
            const response = await fetch(`locales/${lang}/strings.json`);
            if (!response.ok) {
                throw new Error(`Failed to load strings for ${lang}`);
            }

            const newTranslations = await response.json();

            // Se carregou com sucesso, atualiza tudo
            this.currentLanguage = lang;
            this.translations = newTranslations;
            localStorage.setItem('turboFoot_language', lang);

            // Sincroniza com gameState
            if (typeof gameState !== 'undefined' && gameState.settings) {
                gameState.settings.language = lang;
                if (typeof saveGame === 'function') saveGame();
            }

            console.log(`✅ Language switched to ${lang} successfully!`);

            // Recarrega a página para aplicar as mudanças em toda a UI
            location.reload();
        } catch (e) {
            console.error(`❌ Failed to switch language to ${lang}:`, e);
        }
    },

    // Retorna o idioma atual
    getLanguage() {
        return this.currentLanguage;
    },

    // Retorna a lista de idiomas disponíveis com suas informações
    getAvailableLanguages() {
        return this.availableLanguages;
    },

    // Traduz todos os elementos com data-i18n
    translateUI() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);

            if (el.tagName === 'INPUT' && el.type === 'placeholder') {
                el.placeholder = translation;
            } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = translation;
            } else {
                el.textContent = translation;
            }
        });
        console.log(`✅ UI translations applied for ${this.currentLanguage}`);
    }
};

// Atalho global para traduções
const _ = (key, replacements) => I18N.t(key, replacements);