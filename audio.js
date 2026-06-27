// ==========================================
// GERENCIADOR DE ÁUDIO (BGM E SFX)
// ==========================================

// Substitua os nomes dos arquivos pelos que você baixar
const AUDIO_FILES = {
    bgm: 'assets/audio/bgm_main.mp3',       // Música de fundo
    click: 'assets/audio/sfx_click.mp3',    // Clique de botões
    whistle: 'assets/audio/sfx_whistle.mp3', // Apito do juiz
    whistleEnd: 'assets/audio/sfx_whistleEnd.mp3',
    kick: 'assets/audio/sfx_kick.mp3',
    kickFail: 'assets/audio/sfx_kickFail.mp3',     // Chute/Passe
    goal: 'assets/audio/sfx_goal.mp3',      // Grito de Gol/Torcida
    userFail: 'assets/audio/sfx_userFail.mp3',      // Lamento da torcida
    cash: 'assets/audio/sfx_cash.mp3',      // Dinheiro (Loja)
    save: 'assets/audio/sfx_save.mp3',      // Dinheiro (Loja)
    error: 'assets/audio/sfx_error.mp3'     // Ação inválida / Sem dinheiro
};

let bgmAudio = null;
let audioInitialized = false;

function initAudio() {
    if (audioInitialized) return;

    bgmAudio = new Audio(AUDIO_FILES.bgm);
    bgmAudio.loop = true;
    bgmAudio.volume = 0.3; // Volume da música um pouco mais baixo

    audioInitialized = true;
    updateAudioState();
}

function playBGM() {
    if (gameState && gameState.settings && gameState.settings.musicOn) {
        if (bgmAudio && bgmAudio.paused) {
            bgmAudio.play().catch(e => console.log("Bloqueio de Autoplay do Navegador", e));
        }
    }
}

function stopBGM() {
    if (bgmAudio) bgmAudio.pause();
}

function playSFX(key) {
    if (gameState && gameState.settings && gameState.settings.sfxOn === false) return;
    if (!AUDIO_FILES[key]) return;

    let audio = new Audio(AUDIO_FILES[key]);
    audio.volume = 0.6;
    audio.play().catch(e => console.log("SFX bloqueado", e));
}

function toggleMusic() {
    gameState.settings.musicOn = !gameState.settings.musicOn;
    updateAudioState();
    if (typeof saveGame === 'function') saveGame();
    return gameState.settings.musicOn;
}

function toggleSFX() {
    gameState.settings.sfxOn = !gameState.settings.sfxOn;
    if (typeof saveGame === 'function') saveGame();
    if (gameState.settings.sfxOn) playSFX('click');
    return gameState.settings.sfxOn;
}

function updateAudioState() {
    if (!audioInitialized) return;
    if (gameState && gameState.settings && gameState.settings.musicOn) {
        playBGM();
    } else {
        stopBGM();
    }
}

// O NAVEGADOR EXIGE UM CLIQUE DO USUÁRIO ANTES DE TOCAR ÁUDIO
// Esse listener destrava o áudio no primeiro clique que o jogador der na tela
document.addEventListener('click', () => {
    initAudio();
}, { once: true });