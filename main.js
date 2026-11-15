/* ============================================================================
   TINY BATTLE - MAIN GAME CONTROLLER & RENDER LOOP (js/main.js)
   Logical Resolution: 420x840px | Target: 60-120 FPS Mobile Web
   Hỗ trợ: 45 Map • 17 Binh Chủng • Cộng Hưởng Synergy • Ụ Pháo Căn Cứ • Auto-Battler
   ============================================================================ */

import {
    LOGICAL_WIDTH,
    LOGICAL_HEIGHT,
    PLAYFIELD_HEIGHT,
    MAX_WAVES,
    BATTLE_SPEED_MULTIPLIERS,
    GAS_UPGRADE_LEVELS,
    DIFFICULTY_CONFIG,
    BATTLE_MODE_CONFIG,
    calcStageRewardCoins,
    UNIT_CHIPS,
    UNIT_BY_ID,
    LEVELS,
    AIRSTRIKE_SPEC
} from './config.js';

import { triggerHaptic } from './math.js';

import {
    metaState,
    saveProgress,
    normalizeSelectedDeck,
    syncLegacyEngineBridges
} from './state.js';

import {
    initLobby,
    switchLobbyTab,
    renderStageScreenUI,
    renderArmyTabUI,
    updateTopBarUI
} from './lobby-ui.js';

import {
    sfx,
    projCache,
    particlePool,
    atlas,
    drawBaseTurretArt,
    getUnitSpriteDataURL
} from './engine-core.js';

import {
    nav,
    drawDynamicSineWater,
    renderMap,
    buildStaticMapCanvas
} from './map-nav.js';

import {
    game,
    setOnEndBattleHandler,
    getActiveMapConfig,
    addScreenShake,
    spawnFloatingText,
    spawnExplosionFX,
    updateActiveSynergies,
    renderSynergyHUD,
    getEffectiveUnitStats,
    updateBaseTurret,
    damageBase,
    spawnUnit,
    launchAirstrike,
    updateCommanderSkillsUI,
    triggerCommanderSkill,
    showBossWarningBanner,
    initRaidBoss,
    updateRaidBossHUD,
    damageRaidBoss,
    updateRaidBoss,
    drawRaidBoss,
    renderFogOfWarOverlay,
    triggerRoguelikeMutationDraft
} from './entities.js';

// ============================================================================
// 1. KHỞI TẠO CANVAS CHÍNH (ĐỒNG BỘ ID #battleCanvas & KÍCH THƯỚC 420x840)
// ============================================================================
const canvas = document.getElementById('battleCanvas') || document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
if (canvas) {
    canvas.width = LOGICAL_WIDTH;
    canvas.height = LOGICAL_HEIGHT;
}
if (ctx) {
    ctx.imageSmoothingEnabled = false;
}

function getEffectiveGasInterval() {
    const oilLv = Number(metaState?.metaTalents?.oil_refining) || 0;
    const baseInterval = GAS_UPGRADE_LEVELS[game.gasGenLevel]?.interval || 3.0;
    const mapCfg = getActiveMapConfig();
    const gasRateMult = mapCfg?.gasRateMult || 1.0;
    return Math.max(0.50, (baseInterval - oilLv * 0.08) / gasRateMult);
}

// ============================================================================
// 2. ĐIỀU KHIỂN TỐC ĐỘ X1 / X2 / X4 & AUTO-PLAY THÔNG MINH
// ============================================================================
export function updateSpeedAndAutoPlayButtonsUI() {
    const speedBtn = document.getElementById('speed-mult-btn');
    if (speedBtn) {
        speedBtn.textContent = `⚡x${game.speedMult}`;
        speedBtn.classList.remove('speed-x2', 'speed-x4');
        if (game.speedMult === 2) speedBtn.classList.add('speed-x2');
        else if (game.speedMult === 4) speedBtn.classList.add('speed-x4');
    }

    const autoBtn = document.getElementById('auto-play-btn');
    if (autoBtn) {
        autoBtn.textContent = game.autoPlay ? '🤖 AUTO: BẬT' : '🤖 AUTO: TẮT';
        autoBtn.classList.toggle('auto-active', !!game.autoPlay);
    }
}

export function cycleBattleSpeed() {
    const idx = BATTLE_SPEED_MULTIPLIERS.indexOf(game.speedMult);
    const nextIdx = (idx + 1) % BATTLE_SPEED_MULTIPLIERS.length;
    game.speedMult = BATTLE_SPEED_MULTIPLIERS[nextIdx];
    sfx.play('gas');
    triggerHaptic(15);
    updateSpeedAndAutoPlayButtonsUI();
    spawnFloatingText(
        LOGICAL_WIDTH / 2,
        115,
        `⚡ TỐC ĐỘ TRẬN ĐẤU: x${game.speedMult}`,
        game.speedMult === 4 ? '#f0abfc' : '#38bdf8',
        14
    );
}

export function toggleAutoPlay() {
    game.autoPlay = !game.autoPlay;
    game.autoPlayTimer = 0.08;
    sfx.play('upgrade');
    triggerHaptic(20);
    updateSpeedAndAutoPlayButtonsUI();
    spawnFloatingText(
        LOGICAL_WIDTH / 2,
        135,
        game.autoPlay ? '🤖 CHẾ ĐỘ TỰ ĐỘNG ĐÁNH: BẬT' : '🤖 CHẾ ĐỘ TỰ ĐỘNG ĐÁNH: TẮT',
        game.autoPlay ? '#4ade80' : '#94a3b8',
        14
    );
}

function runAutoPlayCommanderAI(dt) {
    if (!game.autoPlay || !game.running || game.paused || game.gameOver) return;

    if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') {
        while (game.gas >= 2) {
            const candidates = game.deckIds
                .slice(0, 4)
                .map(id => getEffectiveUnitStats(id, 'blue'))
                .filter(sp => sp && sp.cost <= game.gas);
            if (candidates.length === 0) break;
            const pick = candidates[(Math.random() * candidates.length) | 0];
            const rx = 68 + Math.random() * (LOGICAL_WIDTH - 136);
            const ry = PLAYFIELD_HEIGHT - 190 - Math.random() * 145;
            game.gas -= pick.cost;
            spawnUnit('blue', pick.id, rx, ry);
        }
        startAutoBattlerCombat();
        return;
    }

    game.autoPlayTimer -= dt;
    if (game.autoPlayTimer > 0) return;
    game.autoPlayTimer = 0.32;

    const redUnits = game.units.filter(u => u.team === 'red' && !u.dead);
    const blueUnits = game.units.filter(u => u.team === 'blue' && !u.dead);

    if (game.tacticCooldowns.emp_blast <= 0 && redUnits.length >= 4) {
        triggerCommanderSkill('emp_blast');
    } else if (game.tacticCooldowns.airdrop <= 0 && (blueUnits.length <= 2 || game.playerBase.hp < game.playerBase.maxHp * 0.7)) {
        triggerCommanderSkill('airdrop');
    } else if (game.tacticCooldowns.minefield <= 0 && redUnits.length >= 2) {
        triggerCommanderSkill('minefield');
    } else if (game.tacticCooldowns.blitzkrieg <= 0 && blueUnits.length >= 4) {
        triggerCommanderSkill('blitzkrieg');
    }

    if (game.gasGenLevel < GAS_UPGRADE_LEVELS.length - 1) {
        const upgCost = GAS_UPGRADE_LEVELS[game.gasGenLevel].cost;
        if (game.gas >= upgCost + 3 && blueUnits.length >= 2) {
            upgradeGasGenerator();
            return;
        }
    }

    const readySlots = [];
    for (let i = 0; i < 4; i++) {
        if (game.deckCooldowns[i] > 0) continue;
        const uId = game.deckIds[i];
        const spec = getEffectiveUnitStats(uId, 'blue');
        if (spec && game.gas >= spec.cost) {
            readySlots.push({ slotIdx: i, spec });
        }
    }

    if (readySlots.length > 0) {
        readySlots.sort((a, b) => b.spec.cost - a.spec.cost);
        const chosen = Math.random() < 0.72 ? readySlots[0] : readySlots[(Math.random() * readySlots.length) | 0];
        triggerDeckSlot(chosen.slotIdx);
    } else if (game.deckCooldowns[4] <= 0 && game.gas >= 6 && redUnits.length >= 3) {
        triggerDeckSlot(4);
    }
}

// ============================================================================
// 3. QUẢN LÝ DECK 5 Ô (#unitDeckContainer), RADIAL COOLDOWN & NẠP/NÂNG XĂNG
// ============================================================================
export function renderBattleDeckButtons() {
    metaState.selectedDeck = normalizeSelectedDeck(metaState.selectedDeck);
    game.deckIds = [...metaState.selectedDeck];

    const container = document.getElementById('unitDeckContainer');
    if (container) {
        container.innerHTML = '';
        const gasIconUrl = atlas.ready ? atlas.toDataURL(12, 10) : '';

        for (let i = 0; i < 5; i++) {
            const uId = game.deckIds[i];
            const isAirSlot = i === 4 || uId === 'airstrike';
            const spec = isAirSlot
                ? { ...AIRSTRIKE_SPEC, level: metaState.armyPermanentLevels?.airstrike || 1 }
                : getEffectiveUnitStats(uId, 'blue');

            game.deckMaxCooldowns[i] = spec.cooldown || 2.0;

            const sockets = Array.isArray(metaState?.unitSockets?.[spec.id]) ? metaState.unitSockets[spec.id] : [];
            const dotsHtml = sockets
                .map(cId => {
                    const chip = cId ? UNIT_CHIPS[cId] : null;
                    return `<span class="socket-dot ${chip ? chip.dotCss : ''}"></span>`;
                })
                .join('');

            const spriteUrl = isAirSlot
                ? (atlas.ready ? atlas.toDataURL(spec.spriteCol ?? 10, 7) : '')
                : getUnitSpriteDataURL(spec, 7);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.id = `deck-slot-${i}`;
            btn.className = `unit-btn unit-card-btn${spec.isNaval ? ' naval-btn' : ''}`;
            btn.innerHTML = `
                <span class="hotkey-badge">${i + 1}</span>
                <span class="unit-lv-badge">Lv.${spec.level || 1}</span>
                <div class="unit-btn-socket-dots">${dotsHtml}</div>
                <div class="unit-card-art">
                    ${spriteUrl ? `<img src="${spriteUrl}" class="w-9 h-9 pixel-art" alt="${spec.name}" />` : `<span>${isAirSlot ? '✈️' : '🪖'}</span>`}
                </div>
                <div class="unit-card-name">${spec.name}</div>
                <div class="cost-badge">
                    ${gasIconUrl ? `<img src="${gasIconUrl}" class="w-2.5 h-2.5 pixel-art" alt="Gas" />` : '⛽'}
                    <span>${spec.cost}</span>
                </div>
                <div class="cooldown-radial-overlay">
                    <span class="unit-cd-timer"></span>
                </div>
                <div class="cooldown-bar-track">
                    <div class="cooldown-bar-fill"></div>
                </div>
            `;
            btn.addEventListener('click', () => triggerDeckSlot(i));
            container.appendChild(btn);
        }
    }

    updateDeckButtonsUI();
}

export function updateDeckButtonsUI() {
    const isAbPrep = game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep';

    for (let i = 0; i < 5; i++) {
        const btn = document.getElementById(`deck-slot-${i}`);
        if (!btn) continue;

        const uId = game.deckIds[i];
        const spec = i === 4 ? AIRSTRIKE_SPEC : getEffectiveUnitStats(uId, 'blue');
        const cd = isAbPrep ? 0 : (game.deckCooldowns[i] || 0);
        const maxCd = Math.max(0.1, game.deckMaxCooldowns[i] || spec.cooldown || 2.0);
        const canAfford = game.gas >= spec.cost && !(isAbPrep && i === 4);

        const cdOverlay = btn.querySelector('.cooldown-radial-overlay');
        const cdTimer = btn.querySelector('.unit-cd-timer');
        const barFill = btn.querySelector('.cooldown-bar-fill');

        if (cd > 0.04) {
            btn.classList.add('on-cooldown');
            btn.classList.remove('ready', 'ready-to-spawn');
            const pct = Math.max(0, Math.min(100, (cd / maxCd) * 100));
            const deg = Math.round((cd / maxCd) * 360);
            if (cdOverlay) cdOverlay.style.setProperty('--cd-deg', `${deg}deg`);
            if (cdTimer) cdTimer.textContent = `${cd.toFixed(1)}s`;
            if (barFill) barFill.style.setProperty('--cd-pct', `${pct}%`);
        } else {
            btn.classList.remove('on-cooldown');
            if (cdOverlay) cdOverlay.style.setProperty('--cd-deg', '0deg');
            if (cdTimer) cdTimer.textContent = '';
            if (barFill) barFill.style.setProperty('--cd-pct', '0%');
            btn.classList.toggle('ready', canAfford);
            btn.classList.toggle('ready-to-spawn', canAfford);
        }

        btn.classList.toggle('insufficient-fuel', !canAfford);
        btn.classList.toggle('ab-selected-slot', isAbPrep && i < 4 && game.autoSelectedSlotIdx === i);
    }

    const upgBtn = document.getElementById('btnUpgradeGas');
    const blockOverlay = document.getElementById('blockUpgrade');
    const isMax = game.gasGenLevel >= GAS_UPGRADE_LEVELS.length - 1;
    const upgCost = isMax ? Infinity : GAS_UPGRADE_LEVELS[game.gasGenLevel].cost;
    const canUpgrade = !isMax && !isAbPrep && game.gas >= upgCost;

    if (upgBtn) {
        upgBtn.classList.toggle('ready', canUpgrade);
    }
    if (blockOverlay) {
        blockOverlay.classList.toggle('unlocked', canUpgrade || isMax);
    }
}

export function triggerDeckSlot(slotIdx) {
    if (!game.running || game.paused || game.gameOver) return;
    if (slotIdx < 0 || slotIdx >= 5) return;

    // Sửa lỗi #3: Khi ở pha chuẩn bị Auto-Battler, bấm ô 1–4 để chọn loại quân đặt lên sân
    if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') {
        if (slotIdx >= 4) {
            sfx.play('cannon');
            spawnFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT - 155, '⚠️ HÃY CHỌN Ô QUÂN 1–4 ĐỂ ĐẶT TRẬN!', '#fb7185', 12);
            return;
        }
        game.autoSelectedSlotIdx = slotIdx;
        game.autoSelectedUnitId = game.deckIds[slotIdx] || 'infantry';
        sfx.play('gas');
        triggerHaptic(15);
        setupAutoBattlerPrepUI();
        updateDeckButtonsUI();
        return;
    }

    if (game.deckCooldowns[slotIdx] > 0) return;

    const uId = game.deckIds[slotIdx];
    const spec = slotIdx === 4 ? AIRSTRIKE_SPEC : getEffectiveUnitStats(uId, 'blue');
    if (game.gas < spec.cost) {
        sfx.play('cannon');
        return;
    }

    game.gas -= spec.cost;
    game.deckCooldowns[slotIdx] = spec.cooldown;
    game.deckMaxCooldowns[slotIdx] = spec.cooldown;
    triggerHaptic(15);

    if (spec.isAirstrike || uId === 'airstrike' || slotIdx === 4) {
        const redUnits = game.units.filter(u => u.team === 'red' && !u.dead);
        let targetY = game.enemyBase.y + 45;
        if (redUnits.length > 0) {
            redUnits.sort((a, b) => b.y - a.y);
            targetY = redUnits[0].y;
        }
        launchAirstrike('blue', targetY);
    } else {
        sfx.play('spawn');
        const laneOffsets = [-76, -26, 26, 76];
        const prefX = LOGICAL_WIDTH / 2 + laneOffsets[slotIdx % 4] + (Math.random() - 0.5) * 18;
        const prefY = PLAYFIELD_HEIGHT - 118;
        spawnUnit('blue', uId, prefX, prefY);
        updateActiveSynergies();
    }

    updateDeckButtonsUI();
    updateHUD();
}

export function upgradeGasGenerator() {
    if (!game.running || game.paused || game.gameOver) return;
    if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') return;
    if (game.gasGenLevel >= GAS_UPGRADE_LEVELS.length - 1) return;

    const cfg = GAS_UPGRADE_LEVELS[game.gasGenLevel];
    if (game.gas < cfg.cost) {
        sfx.play('cannon');
        return;
    }

    game.gas -= cfg.cost;
    game.gasGenLevel++;
    sfx.play('upgrade');
    triggerHaptic(20);
    spawnFloatingText(52, PLAYFIELD_HEIGHT - 22, `⚡ NÂNG CẤP XĂNG LV.${game.gasGenLevel + 1}!`, '#fde047', 13);
    updateHUD();
    updateDeckButtonsUI();
}

export function manualPumpGas() {
    if (!game.running || game.paused || game.gameOver) return;
    if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') return;

    const effInterval = getEffectiveGasInterval();

    if (game.gas >= game.maxGas) {
        sfx.play('cannon');
        return;
    }

    // Mỗi lần chạm đẩy nhanh 25% thanh tiến trình nạp xăng (4 lần chạm = +1 Xăng ngay lập tức)
    game.gasTimer += effInterval * 0.25;
    sfx.play('gas');
    triggerHaptic(10);

    if (game.gasTimer >= effInterval) {
        game.gasTimer -= effInterval;
        game.gas = Math.min(game.maxGas, game.gas + 1);
        spawnFloatingText(46, PLAYFIELD_HEIGHT - 95, '+1 ⛽', '#4ade80', 14);
    }

    updateHUD();
    updateDeckButtonsUI();
}

// ============================================================================
// 4. ĐẤU TRƯỜNG AUTO-BATTLER (ĐẶT TRẬN TỰ ĐỘNG - CHỌN Ô 1-4 & CHẠM THU HỒI)
// ============================================================================
export function setupAutoBattlerPrepUI() {
    const overlay = document.getElementById('autobattler-setup-bar');
    if (!overlay) return;

    if (game.battleMode !== 'auto_battler') {
        overlay.classList.add('hidden');
        overlay.classList.remove('active');
        return;
    }

    const isPrep = game.autoBattlerPhase === 'prep';
    overlay.classList.toggle('hidden', !isPrep);
    overlay.classList.toggle('active', isPrep);

    const fuelEl = document.getElementById('autobattler-fuel-display');
    if (fuelEl) fuelEl.textContent = String(Math.floor(game.gas));

    const hintEl = document.getElementById('autobattler-zone-hint');
    if (hintEl && isPrep) {
        const slotIdx = Math.max(0, Math.min(3, Number(game.autoSelectedSlotIdx) || 0));
        const selectedId = game.deckIds?.[slotIdx] || game.autoSelectedUnitId || 'infantry';
        const sp = getEffectiveUnitStats(selectedId, 'blue');
        hintEl.innerHTML = `♟️ ĐANG CẦM <b>[Ô ${slotIdx + 1}: ${sp.name.toUpperCase()} - ${sp.cost}⛽]</b> • CHẠM SÂN ĐỂ ĐẶT / CHẠM LÍNH ĐỂ THU HỒI`;
    }
}

export function startAutoBattlerCombat() {
    if (game.battleMode !== 'auto_battler' || game.autoBattlerPhase !== 'prep') return;
    game.autoBattlerPhase = 'combat';
    sfx.play('blitz');
    setupAutoBattlerPrepUI();
    updateDeckButtonsUI();
    spawnFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT / 2, '⚔️ BẮT ĐẦU GIAO CHIẾN!', '#fde047', 18);
}

export function clearAutoBattlerFormation() {
    if (game.battleMode !== 'auto_battler' || game.autoBattlerPhase !== 'prep') return;
    let refunded = 0;
    game.units = game.units.filter(u => {
        if (u.team === 'blue') {
            refunded += u.spec.cost || 2;
            return false;
        }
        return true;
    });
    game.gas = Math.min(game.maxGas, game.gas + refunded);
    sfx.play('gas');
    updateActiveSynergies();
    setupAutoBattlerPrepUI();
    updateDeckButtonsUI();
    updateHUD();
}

function spawnEnemyAutoBattlerFormation() {
    const pool = [
        'infantry', 'bazooka', 'humvee', 'apc', 'tank', 'heavy_tank',
        'pyromancer', 'cryomancer', 'cleric', 'mecha_paladin', 'railgun_walker'
    ];
    const budget = 16 + game.currentLevel * 2;
    let spent = 0;
    while (spent < budget) {
        const uId = pool[Math.floor(Math.random() * pool.length)];
        const sp = getEffectiveUnitStats(uId, 'red');
        const rx = 68 + Math.random() * (LOGICAL_WIDTH - 136);
        const ry = 135 + Math.random() * 165;
        spawnUnit('red', uId, rx, ry);
        spent += sp.cost || 3;
    }
}

// ============================================================================
// 5. KHỞI TẠO TRẬN ĐẤU (INIT LEVEL) & KẾT THÚC TRẬN (END GAME)
// ============================================================================
export function initLevel(levelNum = 1, difficulty = 'easy', battleMode = 'destroy') {
    syncLegacyEngineBridges();

    const lv = Math.max(1, Math.min(LEVELS.length, Number(levelNum) || 1));
    const mapCfg = LEVELS[lv - 1] || LEVELS[0];
    const diffCfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;

    game.running = true;
    game.paused = false;
    game.gameOver = false;
    game.currentLevel = lv;
    game.difficulty = difficulty;
    game.battleMode = battleMode || 'destroy';
    game.timeSec = 0;
    game.matchKills = 0;
    game.matchSpawns = 0;
    game.autoPlayTimer = 0.1;

    const logiLv = Number(metaState?.metaTalents?.optimal_logistics) || 0;
    game.gas = game.battleMode === 'auto_battler' ? 28 : (mapCfg.startingGas || 6) + logiLv;
    game.maxGas = game.battleMode === 'auto_battler' ? 30 : 20 + logiLv;
    game.gasGenLevel = 0;
    game.gasTimer = 0;

    game.wave = 1;
    game.maxWaves = game.battleMode === 'endless_siege' ? 999 : MAX_WAVES;
    game.waveTimer = 0;
    game.waveDuration = 20;
    game.enemySpawnTimer = 1.6;

    const steelLv = Number(metaState?.metaTalents?.high_grade_steel) || 0;
    const pHp = Math.round((mapCfg.playerBaseHp || 250) * (1 + steelLv * 0.08));
    const eHp = Math.round((mapCfg.enemyBaseHp || 255) * diffCfg.baseHpMult);

    game.playerBase = {
        x: LOGICAL_WIDTH / 2,
        y: PLAYFIELD_HEIGHT - 55,
        hp: pHp,
        maxHp: pHp,
        hitFlash: 0,
        turretAngle: -Math.PI / 2,
        turretTimer: 0.4
    };
    game.enemyBase = { x: LOGICAL_WIDTH / 2, y: 55, hp: eHp, maxHp: eHp, hitFlash: 0 };

    game.units = [];
    game.projectiles = [];
    game.airstrikes = [];
    game.landmines = [];
    game.paratroops = [];
    game.tireTracks = [];
    game.scorchMarks = [];
    game.shockwaves = [];
    game.muzzleFlashes = [];
    game.beamEffects = [];
    game.floatingTexts = [];
    particlePool.clear();

    metaState.selectedDeck = normalizeSelectedDeck(metaState.selectedDeck);
    game.deckIds = [...metaState.selectedDeck];
    game.deckCooldowns = [0, 0, 0, 0, 0];
    game.tacticCooldowns = { airdrop: 0, minefield: 0, emp_blast: 0, blitzkrieg: 0 };
    game.blitzkriegTimer = 0;
    game.activeMutations = [];
    game.awaitingMutationChoice = false;
    game.raidBoss = null;

    game.autoSelectedSlotIdx = 0;
    game.autoSelectedUnitId = game.deckIds[0] || 'infantry';

    document.getElementById('win-panel')?.classList.remove('active');
    document.getElementById('lose-panel')?.classList.remove('active');
    document.getElementById('draft-modal')?.classList.remove('active');

    buildStaticMapCanvas(lv);

    if (game.battleMode === 'raid_boss') {
        initRaidBoss();
    } else if (game.battleMode === 'auto_battler') {
        game.autoBattlerPhase = 'prep';
        spawnEnemyAutoBattlerFormation();
    } else {
        spawnUnit('red', 'infantry', LOGICAL_WIDTH / 2 - 40, 128);
        spawnUnit('red', 'infantry', LOGICAL_WIDTH / 2 + 40, 128);
    }

    updateActiveSynergies();
    renderSynergyHUD();
    updateRaidBossHUD();
    setupAutoBattlerPrepUI();
    renderBattleDeckButtons();
    updateCommanderSkillsUI();
    updateSpeedAndAutoPlayButtonsUI();
    updateHUD();
}

function formatMatchTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mins = String(Math.floor(s / 60)).padStart(2, '0');
    const secs = String(s % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

export function endGame(isWin) {
    if (game.gameOver) return;
    game.gameOver = true;
    game.running = false;
    triggerHaptic(isWin ? 35 : 60);

    const lv = game.currentLevel;
    const diff = game.difficulty;
    const mode = game.battleMode;
    const diffCfg = DIFFICULTY_CONFIG[diff] || DIFFICULTY_CONFIG.easy;

    if (isWin) {
        sfx.play('upgrade');
        const rewardCoins = calcStageRewardCoins(lv, diff, mode);
        const rewardMedals = diff === 'difficult' ? (diffCfg.medalReward || 2) : (mode === 'raid_boss' ? 3 : 1);

        metaState.coins += rewardCoins;
        metaState.medals = (metaState.medals || 0) + rewardMedals;
        metaState.missionsProgress.wins = (metaState.missionsProgress.wins || 0) + 1;
        if (diff === 'difficult') {
            metaState.missionsProgress.diffWins = (metaState.missionsProgress.diffWins || 0) + 1;
        }

        if (mode === 'auto_battler') {
            metaState.autobattlerWins = (metaState.autobattlerWins || 0) + 1;
        } else if (mode === 'raid_boss') {
            metaState.raidBossClears = (metaState.raidBossClears || 0) + 1;
        } else {
            const prog = metaState.mapDifficultyProgress[lv] || {};
            prog[diff] = true;
            if (mode === 'destroy' || mode === 'survival') {
                prog[`${diff}_${mode}`] = true;
            }
            metaState.mapDifficultyProgress[lv] = prog;
        }

        saveProgress();

        const winCoinsEl = document.getElementById('win-coins-reward');
        if (winCoinsEl) winCoinsEl.textContent = `+${rewardCoins.toLocaleString('en-US')} 🪙 & +${rewardMedals} 🎖️`;
        const winTimeEl = document.getElementById('win-time');
        if (winTimeEl) winTimeEl.textContent = formatMatchTime(game.timeSec);
        const winHpEl = document.getElementById('win-hp');
        if (winHpEl) winHpEl.textContent = `${Math.ceil(game.playerBase.hp)} / ${game.playerBase.maxHp}`;
        const winWaveEl = document.getElementById('win-spawned');
        if (winWaveEl) winWaveEl.textContent = `WAVE ${game.wave}`;
        const winKillsEl = document.getElementById('win-kills');
        if (winKillsEl) winKillsEl.textContent = `${diffCfg.shortLabel} • ${game.matchKills}`;

        document.getElementById('win-panel')?.classList.add('active');
    } else {
        sfx.play('boom');
        if (mode === 'endless_siege' && game.wave > (metaState.endlessBestWave || 0)) {
            metaState.endlessBestWave = game.wave;
        }
        const consolCoins = Math.max(40, Math.round(game.matchKills * 8 + game.wave * 25));
        metaState.coins += consolCoins;
        saveProgress();

        const loseTimeEl = document.getElementById('lose-time');
        if (loseTimeEl) loseTimeEl.textContent = formatMatchTime(game.timeSec);
        const loseWaveEl = document.getElementById('lose-wave');
        if (loseWaveEl) loseWaveEl.textContent = `Wave ${game.wave} / ${game.maxWaves}`;
        const loseSpawnsEl = document.getElementById('lose-spawned');
        if (loseSpawnsEl) loseSpawnsEl.textContent = String(game.matchSpawns);
        const loseKillsEl = document.getElementById('lose-kills');
        if (loseKillsEl) loseKillsEl.textContent = `MAP ${lv} • ${game.matchKills}`;

        document.getElementById('lose-panel')?.classList.add('active');
    }
}

setOnEndBattleHandler(endGame);

// ============================================================================
// 6. CẬP NHẬT HUD & LOGIC MỖI KHUNG HÌNH (ĐỒNG BỘ ID TRONG index.html)
// ============================================================================
export function updateHUD() {
    const levelLabel = document.getElementById('current-level-label');
    if (levelLabel) {
        const diffShort = DIFFICULTY_CONFIG[game.difficulty]?.shortLabel || 'DỄ';
        const modeShort = BATTLE_MODE_CONFIG[game.battleMode]?.shortLabel || 'PHÁ CĂN CỨ';
        levelLabel.textContent = `MAP ${game.currentLevel} • ${diffShort} (${modeShort})`;
    }

    const timerEl = document.getElementById('hud-match-timer');
    if (timerEl) {
        timerEl.textContent = formatMatchTime(game.timeSec);
    }

    const effInterval = getEffectiveGasInterval();

    const speedIndEl = document.getElementById('speed-indicator');
    if (speedIndEl) speedIndEl.textContent = `${effInterval.toFixed(1)}s`;

    const gasRateEl = document.getElementById('gas-rate-label');
    if (gasRateEl) gasRateEl.textContent = `+1/${effInterval.toFixed(1)}s`;

    const gasCountEl = document.getElementById('gasCountText');
    if (gasCountEl) gasCountEl.textContent = String(Math.floor(game.gas));

    // 5 vạch L1 -> L5 biểu diễn tiến trình nạp từ từ của bình xăng hiện tại (0% -> 100%)
    const segIds = ['L1', 'L2', 'L3', 'L4', 'L5'];
    const isGasFull = game.gas >= game.maxGas;
    const fillRatio = isGasFull ? 1 : Math.min(1, game.gasTimer / Math.max(0.1, effInterval));
    const filledSegs = Math.floor(fillRatio * segIds.length);
    segIds.forEach((id, idx) => {
        document.getElementById(id)?.classList.toggle('active', idx < filledSegs);
    });

    const isMaxGas = game.gasGenLevel >= GAS_UPGRADE_LEVELS.length - 1;
    const upgCfg = GAS_UPGRADE_LEVELS[game.gasGenLevel];
    const nextSpeedEl = document.getElementById('upgrade-next-speed');
    if (nextSpeedEl) nextSpeedEl.textContent = upgCfg.label;

    const upgCostEl = document.getElementById('upgrade-cost-text');
    if (upgCostEl) upgCostEl.textContent = isMaxGas ? 'MAX' : String(upgCfg.cost);

    const upgLockEl = document.getElementById('upgrade-lock-cost');
    if (upgLockEl) upgLockEl.textContent = isMaxGas ? 'MAX' : String(upgCfg.cost);

    const battleLvEl = document.getElementById('battle-lv-label');
    if (battleLvEl) battleLvEl.textContent = `WAVE ${game.wave}`;

    const waveCounterEl = document.getElementById('hud-wave-counter');
    if (waveCounterEl) {
        waveCounterEl.textContent =
            game.battleMode === 'endless_siege'
                ? `${game.wave}/∞`
                : (game.battleMode === 'raid_boss' ? 'BOSS' : `${game.wave}/${game.maxWaves}`);
    }

    const expFillEl = document.getElementById('battle-exp-fill');
    if (expFillEl) {
        const pct = Math.min(100, Math.round((game.waveTimer / Math.max(1, game.waveDuration)) * 100));
        expFillEl.style.width = `${pct}%`;
    }
}

function spawnEnemyWaveSquad() {
    const mapCfg = LEVELS[game.currentLevel - 1] || LEVELS[0];
    const landPool = ['infantry', 'bazooka', 'sniper', 'humvee', 'apc', 'tank', 'cleric'];
    if (game.wave >= 2 || game.currentLevel >= 4) {
        landPool.push('pyromancer', 'cryomancer');
    }
    if (game.wave >= 4 || game.currentLevel >= 5) {
        landPool.push('heavy_tank', 'necromancer', 'mecha_paladin');
    }
    if (game.wave >= 5 || game.currentLevel >= 8) {
        landPool.push('railgun_walker');
    }
    if (game.wave >= 3 || game.currentLevel >= 3) {
        landPool.push('heli');
    }

    const navalPool = ['patrol_boat', 'destroyer'];
    if (game.wave >= 5) navalPool.push('battleship');

    const count = 1 + Math.floor(game.wave / 3);
    for (let i = 0; i < count; i++) {
        const useNaval = mapCfg.hasWater && Math.random() < 0.32;
        const pool = useNaval ? navalPool : landPool;
        const uId = pool[Math.floor(Math.random() * pool.length)];
        const rx = 68 + Math.random() * (LOGICAL_WIDTH - 136);
        spawnUnit('red', uId, rx, 122);
    }

    if (game.wave % 5 === 0 && game.battleMode !== 'raid_boss') {
        const bossType = game.wave % 10 === 0 ? 'mecha_paladin' : 'heavy_tank';
        const bossUnit = spawnUnit('red', bossType, LOGICAL_WIDTH / 2, 134);
        if (bossUnit) {
            bossUnit.isBossUnit = true;
            bossUnit.radius = 23;
            bossUnit.hp = Math.round(bossUnit.hp * 2.8);
            bossUnit.maxHp = bossUnit.hp;
            bossUnit.spec.damage = Math.round(bossUnit.spec.damage * 1.45);
            showBossWarningBanner(`BOSS WAVE ${game.wave}!`, `${bossUnit.spec.name} chỉ huy đã xuất kích!`);
        }
    }
}

export function update(dt) {
    if (!game.running || game.paused || game.gameOver) return;

    game.timeSec += dt;

    if (game.shakeTimer > 0) game.shakeTimer = Math.max(0, game.shakeTimer - dt);
    if (game.blitzkriegTimer > 0) game.blitzkriegTimer = Math.max(0, game.blitzkriegTimer - dt);
    if (game.playerBase.hitFlash > 0) game.playerBase.hitFlash = Math.max(0, game.playerBase.hitFlash - dt);
    if (game.enemyBase.hitFlash > 0) game.enemyBase.hitFlash = Math.max(0, game.enemyBase.hitFlash - dt);

    for (let i = 0; i < 5; i++) {
        if (game.deckCooldowns[i] > 0) {
            game.deckCooldowns[i] = Math.max(0, game.deckCooldowns[i] - dt);
        }
    }
    for (const k of Object.keys(game.tacticCooldowns)) {
        if (game.tacticCooldowns[k] > 0) {
            game.tacticCooldowns[k] = Math.max(0, game.tacticCooldowns[k] - dt);
        }
    }

    if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') {
        for (const u of game.units) u.update(dt);
        updateActiveSynergies();
        runAutoPlayCommanderAI(dt);
        return;
    }

    const effInterval = getEffectiveGasInterval();

    if (game.gas < game.maxGas) {
        game.gasTimer += dt;
        if (game.gasTimer >= effInterval) {
            game.gasTimer -= effInterval;
            game.gas = Math.min(game.maxGas, game.gas + 1);
        }
    } else {
        game.gasTimer = 0;
    }

    // 2 Phe giao tranh: Nếu ở Map 45 (Abyss Gate) thì tốc độ sinh quân địch cũng hưởng +15% nhịp độ
    const mapCfg = getActiveMapConfig();
    const enemyGasMult = mapCfg?.gasRateMult ? (1 + (mapCfg.gasRateMult - 1) * 0.5) : 1.0;

    if (game.battleMode !== 'auto_battler' && game.battleMode !== 'raid_boss') {
        game.waveTimer += dt;
        if (game.waveTimer >= game.waveDuration) {
            game.waveTimer = 0;
            if (game.battleMode === 'endless_siege') {
                game.wave++;
                if (game.wave > (metaState.endlessBestWave || 0)) {
                    metaState.endlessBestWave = game.wave;
                }
                triggerRoguelikeMutationDraft();
            } else if (game.wave < game.maxWaves) {
                game.wave++;
            } else if (game.battleMode === 'survival') {
                endGame(true);
                return;
            }
        }

        game.enemySpawnTimer -= dt * enemyGasMult;
        if (game.enemySpawnTimer <= 0) {
            spawnEnemyWaveSquad();
            const diffSpeed = game.difficulty === 'difficult' ? 0.78 : 1.0;
            game.enemySpawnTimer = Math.max(2.6, (7.2 - game.wave * 0.25) * diffSpeed);
        }
    }

    if (game.battleMode === 'raid_boss') {
        updateRaidBoss(dt);
    }

    updateActiveSynergies();
    updateBaseTurret(dt);

    for (const u of game.units) u.update(dt);
    game.units = game.units.filter(u => !u.dead);

    if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'combat') {
        const blueAlive = game.units.some(u => u.team === 'blue');
        const redAlive = game.units.some(u => u.team === 'red');
        if (!redAlive) {
            endGame(true);
            return;
        } else if (!blueAlive) {
            endGame(false);
            return;
        }
    }

    for (const p of game.projectiles) p.update(dt);
    game.projectiles = game.projectiles.filter(p => !p.done);

    for (const strike of game.airstrikes) {
        if (strike.done) continue;
        strike.x += strike.speed * dt;
        const dropPoints = [95, 175, 255, 335];
        dropPoints.forEach((dx, idx) => {
            if (!strike.droppedBombs[idx] && strike.x >= dx) {
                strike.droppedBombs[idx] = true;
                sfx.play('boom');
                addScreenShake(4.5, 0.16);
                spawnExplosionFX(dx, strike.y, 46, true, false);
                for (const u of game.units) {
                    if (!u.dead && u.team !== strike.team && Math.hypot(u.x - dx, u.y - strike.y) <= 52) {
                        u.takeDamage(strike.damage, null, true, false);
                    }
                }
                if (strike.team === 'blue') {
                    if (Math.hypot(game.enemyBase.x - dx, game.enemyBase.y - strike.y) <= 68) {
                        damageBase(game.enemyBase, strike.damage * 0.75);
                    }
                    if (game.battleMode === 'raid_boss' && game.raidBoss && Math.hypot(game.raidBoss.x - dx, game.raidBoss.y - strike.y) <= 75) {
                        damageRaidBoss(strike.damage, dx);
                    }
                }
            }
        });
        if (strike.x > LOGICAL_WIDTH + 90) strike.done = true;
    }
    game.airstrikes = game.airstrikes.filter(s => !s.done);

    for (const m of game.landmines) {
        if (m.exploded) continue;
        m.blinkTimer += dt * 4;
        for (const u of game.units) {
            if (u.team === 'red' && !u.dead && !u.isAir && Math.hypot(u.x - m.x, u.y - m.y) <= m.radius + u.radius) {
                m.exploded = true;
                sfx.play('boom');
                addScreenShake(5, 0.2);
                spawnExplosionFX(m.x, m.y, m.splash, true, false);
                for (const targetU of game.units) {
                    if (targetU.team === 'red' && !targetU.dead && Math.hypot(targetU.x - m.x, targetU.y - m.y) <= m.splash) {
                        targetU.takeDamage(m.damage, null, true, false);
                    }
                }
                break;
            }
        }
    }
    game.landmines = game.landmines.filter(m => !m.exploded);

    for (const pt of game.paratroops) {
        if (pt.done) continue;
        pt.y += 95 * dt;
        if (pt.y >= pt.targetY) {
            pt.done = true;
            const spawned = spawnUnit('blue', pt.unitId, pt.x, pt.targetY);
            if (spawned) spawned.airdropBuffTimer = 6.0;
            updateActiveSynergies();
        }
    }
    game.paratroops = game.paratroops.filter(p => !p.done);

    particlePool.update(dt);
    for (const tr of game.tireTracks) tr.alpha -= dt * 0.08;
    game.tireTracks = game.tireTracks.filter(tr => tr.alpha > 0.02);

    for (const sc of game.scorchMarks) sc.alpha -= dt * (sc.decayRate || 0.03);
    game.scorchMarks = game.scorchMarks.filter(sc => sc.alpha > 0.03);

    for (const sw of game.shockwaves) {
        sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, dt * 11) + 45 * dt;
        sw.alpha -= dt * 2.4;
    }
    game.shockwaves = game.shockwaves.filter(sw => sw.alpha > 0.02);

    for (const mf of game.muzzleFlashes) mf.ttl -= dt;
    game.muzzleFlashes = game.muzzleFlashes.filter(mf => mf.ttl > 0);

    for (const bm of game.beamEffects) bm.ttl -= dt;
    game.beamEffects = game.beamEffects.filter(bm => bm.ttl > 0);

    for (const ft of game.floatingTexts) {
        ft.y += ft.vy * dt;
        ft.alpha -= dt * 0.95;
    }
    game.floatingTexts = game.floatingTexts.filter(ft => ft.alpha > 0.02);

    runAutoPlayCommanderAI(dt);
    updateDeckButtonsUI();
    updateCommanderSkillsUI();
    updateHUD();
}

// ============================================================================
// 7. VẼ CHIẾN TRƯỜNG (DRAW) KÈM Ụ PHÁO PHÒNG THỦ & THANH HP CĂN CỨ
// ============================================================================
function drawBaseBuilding(ctx, baseObj, isBlue) {
    ctx.save();
    ctx.translate(baseObj.x, baseObj.y);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
    ctx.beginPath();
    ctx.roundRect(-42 + 5, -22 + 5, 84, 44, 10);
    ctx.fill();

    const col = isBlue ? 7 : 8;
    const offsets = [-28, 0, 28];
    const drewAtlas =
        atlas.ready &&
        offsets.every((ox, idx) => atlas.draw(ctx, col + (idx === 1 ? 0 : 1), 0, ox, 0, 34, 34));

    if (!drewAtlas) {
        ctx.fillStyle = baseObj.hitFlash > 0 ? '#ffffff' : (isBlue ? '#0284c7' : '#dc2626');
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-42, -22, 84, 44, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isBlue ? '#38bdf8' : '#f87171';
        ctx.fillRect(-34, -14, 68, 26);
    }

    if (baseObj.hitFlash > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.roundRect(-42, -22, 84, 44, 10);
        ctx.fill();
    }

    // Vẽ Ụ Pháo Phòng Thủ tự động trên nóc Căn Cứ Xanh
    if (isBlue) {
        const turretType = metaState?.baseTurret?.type || 'gatling';
        drawBaseTurretArt(ctx, turretType, 0, -4, baseObj.turretAngle ?? -Math.PI / 2, game.timeSec);
    }

    // Thanh máu căn cứ hiển thị trực tiếp trên bản đồ
    const bw = 76;
    const bh = 6;
    const by = isBlue ? 25 : -31;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-bw / 2 - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = isBlue ? '#22c55e' : '#ef4444';
    ctx.fillRect(-bw / 2, by, bw * Math.max(0, baseObj.hp / Math.max(1, baseObj.maxHp)), bh);

    ctx.restore();
}

export function draw() {
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    if (game.shakeTimer > 0) {
        const sx = (Math.random() - 0.5) * game.shakeIntensity * 2;
        const sy = (Math.random() - 0.5) * game.shakeIntensity * 2;
        ctx.translate(sx, sy);
    }

    if (atlas.bakedMapCanvas) {
        ctx.drawImage(atlas.bakedMapCanvas, 0, 0);
    } else {
        renderMap(ctx, LOGICAL_WIDTH, PLAYFIELD_HEIGHT, game.currentLevel, false);
    }

    drawDynamicSineWater(ctx, game.timeSec, game.currentLevel);

    for (const tr of game.tireTracks) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, tr.alpha);
        ctx.fillStyle = '#334155';
        ctx.fillRect(tr.x1 - 1.5, tr.y1 - 1.5, 3, 3);
        ctx.fillRect(tr.x2 - 1.5, tr.y2 - 1.5, 3, 3);
        ctx.restore();
    }

    for (const sc of game.scorchMarks) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sc.alpha);
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, sc.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    for (const m of game.landmines) {
        if (m.exploded) continue;
        ctx.save();
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = Math.sin(m.blinkTimer * Math.PI) > 0 ? '#ef4444' : '#7f1d1d';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawBaseBuilding(ctx, game.playerBase, true);
    if (game.battleMode === 'raid_boss') {
        drawRaidBoss(ctx);
    } else {
        drawBaseBuilding(ctx, game.enemyBase, false);
    }

    const groundUnits = game.units.filter(u => !u.isAir).sort((a, b) => a.y - b.y);
    const airUnits = game.units.filter(u => u.isAir).sort((a, b) => a.y - b.y);

    for (const u of groundUnits) u.drawShadow(ctx);
    for (const u of groundUnits) u.drawBody(ctx);

    for (const p of game.projectiles) p.draw(ctx);

    for (const bm of game.beamEffects) {
        ctx.save();
        ctx.strokeStyle = bm.color;
        ctx.lineWidth = bm.width;
        ctx.beginPath();
        ctx.moveTo(bm.x1, bm.y1);
        ctx.lineTo(bm.x2, bm.y2);
        ctx.stroke();
        ctx.restore();
    }

    for (const mf of game.muzzleFlashes) {
        if (projCache.muzzleStarCanvas) {
            ctx.save();
            ctx.translate(mf.x, mf.y);
            ctx.rotate(mf.angle);
            ctx.scale(mf.scale, mf.scale);
            ctx.drawImage(projCache.muzzleStarCanvas, -14, -14);
            ctx.restore();
        }
    }

    for (const u of airUnits) u.drawShadow(ctx);
    for (const u of airUnits) u.drawBody(ctx);

    for (const pt of game.paratroops) {
        if (pt.done) continue;
        ctx.save();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(pt.x - 10, pt.y - 16);
        ctx.lineTo(pt.x, pt.y);
        ctx.moveTo(pt.x + 10, pt.y - 16);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 16, 12, Math.PI, 0);
        ctx.fill();
        ctx.stroke();

        if (atlas.ready) {
            atlas.draw(ctx, 16, 7, pt.x, pt.y, 22, 22);
        }
        ctx.restore();
    }

    for (const strike of game.airstrikes) {
        if (strike.done) continue;
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.beginPath();
        ctx.ellipse(strike.x + 22, strike.y + 34, 24, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        const drewJet =
            atlas.ready &&
            atlas.draw(ctx, 10, strike.team === 'blue' ? 7 : 8, strike.x, strike.y, 48, 48, {
                rotation: Math.PI / 2
            });
        if (!drewJet) {
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.moveTo(strike.x + 22, strike.y);
            ctx.lineTo(strike.x - 18, strike.y - 16);
            ctx.lineTo(strike.x - 10, strike.y);
            ctx.lineTo(strike.x - 18, strike.y + 16);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    particlePool.draw(ctx);

    for (const sw of game.shockwaves) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = sw.lineWidth;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    renderFogOfWarOverlay(ctx);

    for (const ft of game.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = `900 ${ft.size}px "Chakra Petch", sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#0f172a';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }

    ctx.restore();
}

// ============================================================================
// 8. VÒNG LẶP CHÍNH (60 - 120 FPS FIXED TIMESTEP + SPEED MULTIPLIER)
// ============================================================================
let lastFrameTime = performance.now();
let accumulator = 0;
const FIXED_DT = 1 / 60;

function mainGameLoop(now) {
    const frameDt = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    if (game.running && !game.paused) {
        accumulator += frameDt * (game.speedMult || 1);
        let safetySteps = 0;
        while (accumulator >= FIXED_DT && safetySteps < 10) {
            update(FIXED_DT);
            accumulator -= FIXED_DT;
            safetySteps++;
        }
        draw();
    }

    requestAnimationFrame(mainGameLoop);
}

// ============================================================================
// 9. ĐIỀU HƯỚNG SẢNH / TRẬN & GẮN SỰ KIỆN DOM (ĐỒNG BỘ ID HTML)
// ============================================================================
export function openLobbyScreen(tab = 'battle') {
    game.running = false;
    game.paused = true;
    document.getElementById('win-panel')?.classList.remove('active');
    document.getElementById('lose-panel')?.classList.remove('active');
    document.getElementById('draft-modal')?.classList.remove('active');

    const lobbyEl = document.getElementById('lobby-wrapper');
    if (lobbyEl) lobbyEl.classList.add('active');
    switchLobbyTab(tab);
    updateTopBarUI();
    renderStageScreenUI();
    renderArmyTabUI();
}

export function restartGame() {
    initLevel(game.currentLevel, game.difficulty, game.battleMode);
}

export function nextOrRestartLevel() {
    const nextLv = Math.min(LEVELS.length, game.currentLevel + 1);
    initLevel(nextLv, game.difficulty, game.battleMode);
}

atlas.onReadyCallback = () => {
    renderStageScreenUI();
    renderArmyTabUI();
    if (game.running) {
        buildStaticMapCanvas(game.currentLevel);
        renderBattleDeckButtons();
    }
};

function bindInGameDOMEvents() {
    document.getElementById('menu-return-btn')?.addEventListener('click', () => {
        sfx.play('gas');
        openLobbyScreen('battle');
    });

    document.getElementById('range-toggle-btn')?.addEventListener('click', (e) => {
        game.showRanges = !game.showRanges;
        sfx.play('gas');
        e.currentTarget.textContent = game.showRanges ? '🎯 TẦM: BẬT' : '🎯 TẦM';
    });

    document.getElementById('sound-btn')?.addEventListener('click', (e) => {
        sfx.enabled = !sfx.enabled;
        e.currentTarget.textContent = sfx.enabled ? '🔊' : '🔇';
        if (sfx.enabled) sfx.play('gas');
    });

    document.getElementById('pause-btn')?.addEventListener('click', (e) => {
        if (!game.running || game.gameOver) return;
        game.paused = !game.paused;
        e.currentTarget.textContent = game.paused ? '▶️' : '⏸';
    });

    document.getElementById('speed-mult-btn')?.addEventListener('click', cycleBattleSpeed);
    document.getElementById('auto-play-btn')?.addEventListener('click', toggleAutoPlay);

    document.getElementById('btnUpgradeGas')?.addEventListener('click', upgradeGasGenerator);
    document.getElementById('gas-generator-btn')?.addEventListener('click', manualPumpGas);

    document.getElementById('tactic-btn-airdrop')?.addEventListener('click', () => triggerCommanderSkill('airdrop'));
    document.getElementById('tactic-btn-mines')?.addEventListener('click', () => triggerCommanderSkill('minefield'));
    document.getElementById('tactic-btn-emp')?.addEventListener('click', () => triggerCommanderSkill('emp_blast'));
    document.getElementById('tactic-btn-blitz')?.addEventListener('click', () => triggerCommanderSkill('blitzkrieg'));

    document.getElementById('btn-ab-fight')?.addEventListener('click', startAutoBattlerCombat);
    document.getElementById('btn-ab-clear')?.addEventListener('click', clearAutoBattlerFormation);

    // Sửa lỗi #3: Chạm vào quân Xanh đã đặt để thu hồi 100% Xăng hoặc đặt đúng loại quân đang chọn ở Ô 1–4
    if (canvas) {
        canvas.addEventListener('pointerdown', (e) => {
            if (!game.running || game.paused || game.gameOver) return;
            if (game.battleMode !== 'auto_battler' || game.autoBattlerPhase !== 'prep') return;

            const rect = canvas.getBoundingClientRect();
            const lx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * LOGICAL_WIDTH;
            const ly = ((e.clientY - rect.top) / Math.max(1, rect.height)) * LOGICAL_HEIGHT;

            // 1. Kiểm tra nếu người chơi chạm trực tiếp vào 1 đơn vị Xanh đã đặt trên sân -> Thu hồi & hoàn 100% Xăng
            for (let i = game.units.length - 1; i >= 0; i--) {
                const u = game.units[i];
                if (u.team === 'blue' && !u.dead) {
                    const dist = Math.hypot(u.x - lx, u.y - ly);
                    if (dist <= (u.radius || 12) + 14) {
                        const refundCost = u.spec?.cost || UNIT_BY_ID[u.id]?.cost || 2;
                        game.units.splice(i, 1);
                        game.gas = Math.min(game.maxGas, game.gas + refundCost);
                        sfx.play('gas');
                        triggerHaptic(15);
                        spawnFloatingText(u.x, u.y - 10, `+${refundCost} ⛽ THU HỒI`, '#4ade80', 13);
                        updateActiveSynergies();
                        setupAutoBattlerPrepUI();
                        updateDeckButtonsUI();
                        updateHUD();
                        return;
                    }
                }
            }

            // 2. Nếu không chạm trúng lính cũ -> Kiểm tra vùng đặt quân hợp lệ ở nửa sân dưới
            if (ly < PLAYFIELD_HEIGHT * 0.45 || ly > PLAYFIELD_HEIGHT - 95) {
                sfx.play('cannon');
                spawnFloatingText(lx, ly, '⚠️ CHỈ ĐẶT QUÂN Ở NỬA SÂN DƯỚI!', '#fb7185', 12);
                return;
            }

            const slotIdx = Math.max(0, Math.min(3, Number(game.autoSelectedSlotIdx) || 0));
            const uId = game.deckIds[slotIdx] || game.autoSelectedUnitId || 'infantry';
            const spec = getEffectiveUnitStats(uId, 'blue');
            if (game.gas < spec.cost) {
                sfx.play('cannon');
                spawnFloatingText(lx, ly, `⚠️ CẦN ${spec.cost} ⛽ ĐỂ ĐẶT ${spec.name.toUpperCase()}!`, '#fb7185', 12);
                return;
            }
            game.gas -= spec.cost;
            sfx.play('spawn');
            spawnUnit('blue', uId, lx, ly);
            updateActiveSynergies();
            setupAutoBattlerPrepUI();
            updateDeckButtonsUI();
            updateHUD();
        });
    }

    window.addEventListener('keydown', (e) => {
        if (!game.running || game.paused || game.gameOver) return;
        const k = e.key.toLowerCase();
        if (k === '1') triggerDeckSlot(0);
        else if (k === '2') triggerDeckSlot(1);
        else if (k === '3') triggerDeckSlot(2);
        else if (k === '4') triggerDeckSlot(3);
        else if (k === '5') triggerDeckSlot(4);
        else if (k === 'q') triggerCommanderSkill('airdrop');
        else if (k === 'w') triggerCommanderSkill('minefield');
        else if (k === 'e') triggerCommanderSkill('emp_blast');
        else if (k === 'r') triggerCommanderSkill('blitzkrieg');
        else if (k === ' ') {
            e.preventDefault();
            upgradeGasGenerator();
        }
    });
}

// ============================================================================
// 10. KHỞI CHẠY TOÀN BỘ HỆ THỐNG GAME
// ============================================================================
bindInGameDOMEvents();

initLobby({
    sfx,
    atlas,
    renderMap,
    onStartBattle: (lv, diff, effectiveMode) => {
        initLevel(lv, diff, effectiveMode);
    }
});

Object.assign(window, {
    game,
    renderMap,
    openLobbyScreen,
    restartGame,
    nextOrRestartLevel,
    renderBattleDeckButtons,
    cycleBattleSpeed,
    toggleAutoPlay,
    manualPumpGas
});

requestAnimationFrame(mainGameLoop);