# 🌐 Sistema de Localização (i18n) - TurboFoot

## Como Usar

O sistema de localização foi implementado de forma simples e eficiente usando JSONs na pasta `locales/`.

### Estrutura de Pastas

```
locales/
├── pt-br/
│   ├── strings.json    # Todas as strings traduzidas para pt-BR
│   └── tutorial.json   # Tutorial em pt-BR
```

## 📝 Usando Tradução no Código

### No JavaScript

Use a função global `_()` para obter traduções com notação de pontos:

```javascript
// Exemplo simples
const title = _('screens.title');
// Retorna: "⚽ TurboFoot Manager"

// Com variáveis
const log = _('log.success', { action: 'Passe Longo' });
// Retorna: "Incrível execução de Passe Longo!"

// De um array (para random)
const prep = rnd(I18N.translations.suspense.userShootPrep);
// Retorna uma frase aleatória de preparação
```

### Alternativamente

```javascript
// Ambas as formas funcionam:
const text1 = I18N.t('common.close');
const text2 = _('common.close'); // Atalho mais curto
```

## 🔄 Adicionando Novas Strings

1. Abra `locales/pt-br/strings.json`
2. Adicione sua nova chave na estrutura apropriada:

```json
{
  "screens": {
    "myNewScreen": {
      "title": "Meu Novo Título"
    }
  }
}
```

3. Use no código:

```javascript
const title = _('screens.myNewScreen.title');
```

## 🌍 Criando Novos Idiomas

Quando quiser adicionar um novo idioma (ex: Inglês):

1. Crie a pasta: `locales/en/`
2. Crie o arquivo: `locales/en/strings.json`
3. Copie a estrutura de `pt-br/strings.json` e traduza
4. Adicione na lista de idiomas disponíveis em `i18n.js`:

```javascript
getAvailableLanguages() {
    return ['pt-br', 'en']; // Adicione o novo idioma aqui
}
```

5. No HTML (`index.html`), adicione a opção no select:

```html
<select id="language-select" onchange="changeLanguage(this.value)">
    <option value="pt-br">Português (Brasil)</option>
    <option value="en">English</option>
</select>
```

## 🔧 Detecção Automática de Idioma

O sistema detecta automaticamente o idioma do dispositivo:

```javascript
I18N.detectDeviceLanguage(); // Retorna 'pt-br' se o navegador estiver em português
```

Prioridade:
1. Idioma salvo no `localStorage` (última escolha do usuário)
2. Idioma do navegador (detectado de `navigator.language`)
3. Fallback padrão: `pt-br`

## 📦 Estrutura de `strings.json`

O arquivo está organizado em seções lógicas:

- `common` - Palavras comuns (OK, Cancelar, etc)
- `screens` - Textos da interface
- `ui` - Elementos da UI
- `match` - Textos de partidas
- `suspense` - Textos do efeito de suspense
- `log` - Textos do log de partidas
- `tooltips` - Dicas
- `options` - Opções/Configurações
- `howToPlay` - Tuto rio
- `perks` - Habilidades dos jogadores

## ⚙️ Configurações

As configurações agora incluem o idioma:

```javascript
gameState.settings = {
    showSuspense: true,
    requireConfirm: false,
    language: 'pt-br'  // ← Nova opção
};
```

## 🎯 Próximos Passos

Quando quiser migrar textos hardcoded para traduções:

1. Encontre o texto no código
2. Adicione-o ao `strings.json` com uma chave apropriada
3. Substitua o texto hardcoded por `_('chave.apropriada')`

Exemplo:
```javascript
// Antes
addMatchLog("⚽ GOOOOOOL! É DO SEU TIME!");

// Depois
addMatchLog(rnd(_('log.goalUser')));
```

---

**Criado em:** 2026-06-23
**Versão:** 1.0
