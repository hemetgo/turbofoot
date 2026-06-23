// ===== SISTEMA DE LOCALIZAÇÃO (i18n) =====
// Sistema simples e eficiente para gerenciar múltiplos idiomas

let I18N = {
    currentLanguage: 'pt-br',
    translations: {},
    availableLanguages: [],

    // Carrega a lista de idiomas disponíveis
    async loadLanguages() {
        try {
            const response = await fetch('locales/index.json');
            if (!response.ok) throw new Error('Failed to load languages index');
            const data = await response.json();
            this.availableLanguages = data.languages || [];
            console.log(`✅ Languages loaded: ${this.availableLanguages.map(l => l.code).join(', ')}`);
        } catch (e) {
            console.error('Failed to load languages:', e);
            // Fallback com pt-br como padrão
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

            // Carrega o JSON de strings
            const response = await fetch(`locales/${this.currentLanguage}/strings.json`);
            if (!response.ok) throw new Error(`Failed to load ${this.currentLanguage}`);

            this.translations = await response.json();
            console.log(`✅ i18n initialized with language: ${this.currentLanguage}`);
        } catch (e) {
            console.error('Failed to initialize i18n:', e);
            // Carrega pt-br como fallback
            this.currentLanguage = 'pt-br';
            const response = await fetch('locales/pt-br/strings.json');
            this.translations = await response.json();
        }
    },

    // Obtém uma tradução usando notação com pontos: "screens.title", "common.close"
    t(key, replacements = {}) {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (!value || typeof value !== 'object') {
                console.warn(`Translation key not found: ${key}`);
                return key; // Retorna a chave se não encontrar
            }
            value = value[k];
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
    setLanguage(lang) {
        if (this.currentLanguage === lang) return;

        const oldLang = this.currentLanguage;
        this.currentLanguage = lang;
        localStorage.setItem('turboFoot_language', lang);

        // Recarrega a página para aplicar as mudanças
        // (Alternativa: você pode emitir um evento e atualizar a UI dinamicamente)
        location.reload();
    },

    // Retorna o idioma atual
    getLanguage() {
        return this.currentLanguage;
    },

    // Retorna a lista de idiomas disponíveis com suas informações
    getAvailableLanguages() {
        return this.availableLanguages;
    }
};

// Atalho global para traduções
const _ = (key, replacements) => I18N.t(key, replacements);
