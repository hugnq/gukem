/* ============================================================================
   TINY BATTLE - BATTLE STATE, ENTITIES, ZOMBIE TD, LEVEL-UP QUEUE & BOSSES (js/entities.js)
   100% Procedural Canvas 2D • 18 Units (360° Rotation) • 14 Front-Top Zombies & Bosses
   Full-Map 7x11 Challenge Grid • Floating LEVEL UP (+N) Queue • 4 Special Keystones
   ============================================================================ */

import {
    LOGICAL_WIDTH,
    PLAYFIELD_HEIGHT,
    MAX_WAVES,
    CHALLENGE_MAX_WAVES,
    CHALLENGE_DECK_SLOTS,
    CHALLENGE_COOLDOWN_MULT,
    TD_GRID_COLS,
    TD_CELL_SIZE,
    TD_GRID_TOP_Y,
    TD_GRID_ROWS,
    MAP_ENEMY_SCALE_PER_LEVEL,
    RARITY_CONFIG,
    isMasterRarity,
    isDemonRarity,
    DIFFICULTY_CONFIG,
    COMMANDER_TACTICS,
    UNIT_CHIPS,
    ROGUELIKE_MUTATIONS,
    RAID_BOSS_CONFIG,
    UNIT_CATALOG,
    UNIT_BY_ID,
    ZOMBIE_CATALOG,
    ZOMBIE_BY_ID,
    BATTLE_SYNERGIES,
    BASE_TURRET_CONFIG,
    LEVELS
} from './config.js';

import { triggerHaptic } from './math.js';
import {
    metaState,
    getHighestRarityForUnit,
    normalizeUnitId,
    hasUnitInInventory,
    getAncientSkillTreeBonuses
} from './state.js';
import { drawCanvasRarityAura } from './lobby-ui.js';
import {
    sfx,
    projCache,
    particlePool,
    drawUnitArt,
    isZombieUnit,
    drawZombieArt,
    getUnitSpriteDataURL
} from './engine-core.js';
import { nav } from './map-nav.js';

let onEndBattleCallback = null;
export function setOnEndBattleHandler(fn) {
    onEndBattleCallback = fn;
}

let onDeckChangedCallback = null;
export function setOnDeckChangedHandler(fn) {
    onDeckChangedCallback = fn;
}

export function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const lenSq = vx * vx + vy * vy;
    if (lenSq <= 1e-6) {
        return Math.hypot(px - x1, py - y1);
    }
    let t = ((px - x1) * vx + (py - y1) * vy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * vx;
    const projY = y1 + t * vy;
    return Math.hypot(px - projX, py - projY);
}

export function getActiveMapConfig() {
    const lv = Math.max(1, Math.min(LEVELS.length, Number(game?.currentLevel) || 1));
    return LEVELS[lv - 1] || LEVELS[0];
}

// ============================================================================
// 1. TRẠNG THÁI TRẬN ĐẤU TRUNG TÂM (GAME STATE)
// ============================================================================
export const game = {
    running: false,
    paused: false,
    gameOver: false,
    showRanges: false,
    currentLevel: 1,
    difficulty: 'easy',
    battleMode: 'destroy', // 'destroy' | 'survival' | 'endless_siege' | 'auto_battler' | 'fog_of_war' | 'raid_boss' | 'challenge'
    timeSec: 0,

    speedMult: 1,
    autoPlay: false,
    autoPlayTimer: 0,

    matchKills: 0,
    matchSpawns: 0,

    // Kinh tế Xăng & Lò Phản Ứng Vô Cực (Mốc 10 Nhánh Kinh Tế)
    gas: 6,
    maxGas: 20,
    gasGenLevel: 0,
    gasTimer: 0,
    gasSpentAccumulator: 0,

    // Hệ thống Tích Lũy Cấp Độ Trận (Không bật popup ngang xương -> Nút LEVEL UP +N bên trái)
    battleLv: 1,
    battleExp: 0,
    battleNextExp: 35,
    pendingLevelUps: 0,
    battleUnitStars: {},
    rerollsLeft: 1,
    currentRollCandidates: [],
    isRollModalOpen: false,

    // Sóng địch (Wave)
    wave: 1,
    maxWaves: MAX_WAVES,
    waveTimer: 0,
    waveDuration: 20,
    enemySpawnTimer: 0,
    challengeWaveSpawnedCount: 0,
    challengeWaveTotalToSpawn: 0,

    // Lưới ô vuông 7x11 Full Map cho chế độ Tower Defense CHALLENGE
    tdGrid: new Array(TD_GRID_ROWS * TD_GRID_COLS).fill(null),

    // Cờ Tập Kết Xanh (Rally Point) cho chế độ Battle bình thường
    rallyPoint: {
        active: false,
        x: LOGICAL_WIDTH / 2,
        y: PLAYFIELD_HEIGHT - 122
    },

    // Trạng thái Kéo - Thả đặt quân (Drag & Drop Deploy)
    dragDeploy: {
        active: false,
        slotIdx: -1,
        unitId: null,
        x: 0,
        y: 0,
        isValid: false,
        gridCol: -1,
        gridRow: -1
    },

    // Trạng thái Nhấn Giữ 3.0s để Đổi Vị Trí Tower trong chế độ CHALLENGE
    towerRelocate: {
        holding: false,
        dragging: false,
        tower: null,
        holdTime: 0,
        x: 0,
        y: 0,
        targetCol: -1,
        targetRow: -1,
        isValid: false
    },

    // Bộ đếm Bão Thiên Thạch (Mốc 10 Nhánh Hỏa Lực)
    meteorStormTimer: 14.0,

    // Máu Căn Cứ, Khiên Phản Chấn Vĩnh Cửu & Ụ Pháo Căn Cứ Xanh
    playerBase: {
        x: LOGICAL_WIDTH / 2,
        y: PLAYFIELD_HEIGHT - 55,
        hp: 250,
        maxHp: 250,
        shield: 0,
        maxShield: 0,
        hitFlash: 0,
        turretAngle: -Math.PI / 2,
        turretTimer: 0.5
    },
    enemyBase: { x: LOGICAL_WIDTH / 2, y: 55, hp: 255, maxHp: 255, hitFlash: 0 },

    units: [],
    projectiles: [],
    airstrikes: [],
    landmines: [],
    paratroops: [],

    tireTracks: [],
    scorchMarks: [],
    shockwaves: [],
    muzzleFlashes: [],
    beamEffects: [],
    floatingTexts: [],

    // Bộ bài chiến đấu (5 ô trong Battle | 6 ô trong Challenge)
    deckIds: ['infantry', 'bazooka', null, null, 'airstrike'],
    deckCooldowns: [0, 0, 0, 0, 0, 0],
    deckMaxCooldowns: [1.5, 2.2, 3.0, 4.5, 5.5, 3.0],

    tacticCooldowns: { airdrop: 0, minefield: 0, emp_blast: 0, blitzkrieg: 0 },
    tacticMaxCooldowns: {
        airdrop: COMMANDER_TACTICS.airdrop?.cooldown ?? 16.0,
        minefield: COMMANDER_TACTICS.landmines?.cooldown ?? 18.0,
        emp_blast: COMMANDER_TACTICS.emp?.cooldown ?? 22.0,
        blitzkrieg: COMMANDER_TACTICS.blitzkrieg?.cooldown ?? 24.0
    },
    blitzkriegTimer: 0,

    activeSynergies: {
        thermal_shock: false,
        immortal_fortress: false,
        dark_legion: false
    },

    activeMutations: [],
    awaitingMutationChoice: false,

    autoBattlerPhase: 'prep',
    autoSelectedSlotIdx: 0,
    autoSelectedUnitId: 'infantry',

    raidBoss: null,

    shakeTimer: 0,
    shakeIntensity: 0
};

// ============================================================================
// 2. HÀM TIỆN ÍCH LƯỚI TOWER DEFENSE 7x11 FULL MAP (CHALLENGE MODE)
// ============================================================================
export function getTdGridCellFromPixel(x, y) {
    if (x < 0 || x >= LOGICAL_WIDTH) return null;
    if (y < TD_GRID_TOP_Y || y >= TD_GRID_TOP_Y + TD_GRID_ROWS * TD_CELL_SIZE) return null;
    const col = Math.floor(x / TD_CELL_SIZE);
    const row = Math.floor((y - TD_GRID_TOP_Y) / TD_CELL_SIZE);
    if (col < 0 || col >= TD_GRID_COLS || row < 0 || row >= TD_GRID_ROWS) return null;
    return { col, row, idx: row * TD_GRID_COLS + col };
}

export function getTdCellCenterPixel(col, row) {
    return {
        x: col * TD_CELL_SIZE + TD_CELL_SIZE / 2,
        y: TD_GRID_TOP_Y + row * TD_CELL_SIZE + TD_CELL_SIZE / 2
    };
}

export function canPlaceTowerAtCell(unitSpec, col, row, ignoreTower = null) {
    if (!unitSpec || col < 0 || col >= TD_GRID_COLS || row < 0 || row >= TD_GRID_ROWS) return false;
    const idx = row * TD_GRID_COLS + col;
    const occ = game.tdGrid[idx];
    if (occ && !occ.dead && occ !== ignoreTower) return false;

    const pt = getTdCellCenterPixel(col, row);
    return nav.isValidChallengeTileTerrain(unitSpec, pt.x, pt.y);
}

export function placeTowerInChallengeGrid(unitId, col, row) {
    const spec = getEffectiveUnitStats(unitId, 'blue');
    if (!canPlaceTowerAtCell(spec, col, row)) return null;
    const pt = getTdCellCenterPixel(col, row);
    const u = new Unit('blue', unitId, pt.x, pt.y);
    u.isTower = true;
    u.tdCol = col;
    u.tdRow = row;
    u.tdCellIdx = row * TD_GRID_COLS + col;
    game.tdGrid[u.tdCellIdx] = u;
    game.units.push(u);

    game.matchSpawns++;
    if (metaState?.missionsProgress) {
        metaState.missionsProgress.spawns = (metaState.missionsProgress.spawns || 0) + 1;
    }
    return u;
}

export function relocateTowerToCell(tower, newCol, newRow) {
    if (!tower || tower.dead || !tower.isTower) return false;
    if (!canPlaceTowerAtCell(tower.spec, newCol, newRow, tower)) return false;

    if (tower.tdCellIdx >= 0 && game.tdGrid[tower.tdCellIdx] === tower) {
        game.tdGrid[tower.tdCellIdx] = null;
    }

    const pt = getTdCellCenterPixel(newCol, newRow);
    tower.x = pt.x;
    tower.y = pt.y;
    tower.tdCol = newCol;
    tower.tdRow = newRow;
    tower.tdCellIdx = newRow * TD_GRID_COLS + newCol;
    game.tdGrid[tower.tdCellIdx] = tower;
    return true;
}

// ============================================================================
// 3. HIỆU ỨNG CHIẾN TRƯỜNG, KINH TẾ XĂNG & HUD MÁU 2 CĂN CỨ
// ============================================================================
export function spendMatchGas(amount) {
    const cost = Math.max(0, Number(amount) || 0);
    if (cost <= 0) return;
    game.gas = Math.max(0, game.gas - cost);

    // Kỹ năng Đặc Biệt Mốc 10 Nhánh Kinh Tế: Lò Phản Ứng Vô Cực (Hoàn 1 Xăng mỗi 5 Xăng tiêu tốn)
    const treeB = getAncientSkillTreeBonuses();
    if (treeB.infinite_reactor) {
        game.gasSpentAccumulator = (game.gasSpentAccumulator || 0) + cost;
        if (game.gasSpentAccumulator >= 5) {
            const refundCount = Math.floor(game.gasSpentAccumulator / 5);
            game.gasSpentAccumulator %= 5;
            game.gas = Math.min(game.maxGas, game.gas + refundCount);
            spawnFloatingText(48, PLAYFIELD_HEIGHT - 102, `⚛️ +${refundCount}⛽ HOÀN XĂNG!`, '#38bdf8', 12);
        }
    }
}

export function refreshEternalShields() {
    const treeB = getAncientSkillTreeBonuses();
    if (!treeB.eternal_shield) return;

    // Căn cứ Xanh nhận khiên bằng 25% HP tối đa
    game.playerBase.maxShield = Math.round(game.playerBase.maxHp * 0.25);
    game.playerBase.shield = game.playerBase.maxShield;

    // Toàn bộ Tower phe Xanh nhận khiên bằng 25% HP tối đa
    for (const u of game.units) {
        if (!u.dead && u.team === 'blue' && u.isTower) {
            u.maxShield = Math.round(u.maxHp * 0.25);
            u.shield = u.maxShield;
        }
    }
    spawnShockwave(game.playerBase.x, game.playerBase.y, 110, '#38bdf8', 3.5);
    spawnFloatingText(game.playerBase.x, game.playerBase.y - 36, '🔰 KHIÊN PHẢN CHẤN HỒI ĐẦY!', '#38bdf8', 13);
}

export function addScreenShake(intensity = 4, duration = 0.18) {
    game.shakeIntensity = Math.max(game.shakeIntensity, intensity);
    game.shakeTimer = Math.max(game.shakeTimer, duration);
}

export function spawnScorchMark(x, y, radius = 16) {
    if (nav.isPointInWaterRaw(x, y)) return;
    const mapCfg = getActiveMapConfig();
    const durMult = mapCfg.scorchDurationMult || 1.0;
    game.scorchMarks.push({
        x,
        y,
        radius,
        alpha: 0.82,
        decayRate: 0.03 / Math.max(0.5, durMult)
    });
    if (game.scorchMarks.length > 36) {
        game.scorchMarks.shift();
    }
}

export function spawnShockwave(x, y, maxRadius = 42, color = '#fde047', lineWidth = 3.5) {
    game.shockwaves.push({
        x,
        y,
        radius: 4,
        maxRadius,
        alpha: 1.0,
        color,
        lineWidth
    });
}

export function spawnMuzzleFlash(x, y, angle = 0, scale = 1.0) {
    game.muzzleFlashes.push({
        x,
        y,
        angle,
        scale,
        ttl: 0.065
    });
}

export function spawnFloatingText(x, y, text, color = '#fde047', size = 13) {
    game.floatingTexts.push({
        x,
        y,
        text,
        color,
        size,
        vy: -28,
        alpha: 1.0
    });
}

export function spawnExplosionFX(x, y, radius = 28, isNapalm = false, isEmp = false) {
    spawnScorchMark(x, y, Math.max(12, radius * 0.55));
    spawnShockwave(
        x,
        y,
        radius * 1.25,
        isEmp ? '#38bdf8' : (isNapalm ? '#f97316' : '#fde047'),
        isEmp ? 4 : 3
    );

    const count = Math.min(18, Math.max(8, Math.floor(radius * 0.45)));
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.35;
        const spd = 25 + Math.random() * (radius * 2.2);
        const col = isEmp
            ? (i % 2 === 0 ? '#38bdf8' : '#e0f2fe')
            : (i % 3 === 0 ? '#fde047' : (i % 2 === 0 ? '#f97316' : '#ef4444'));
        particlePool.spawn(
            x,
            y,
            Math.cos(a) * spd,
            Math.sin(a) * spd,
            2.5 + Math.random() * 3.5,
            col,
            1.9,
            'circle'
        );
    }
}

export function updateBaseHpHUD() {
    const blueHp = Math.max(0, Math.ceil(game.playerBase.hp));
    const blueMax = Math.max(1, Math.ceil(game.playerBase.maxHp));
    const blueShield = Math.max(0, Math.ceil(game.playerBase.shield || 0));
    const bluePct = Math.max(0, Math.min(100, (blueHp / blueMax) * 100));

    const blueTxt = document.getElementById('hud-blue-hp-text');
    const blueBar = document.getElementById('hud-blue-hp-bar');
    if (blueTxt) {
        blueTxt.textContent = blueShield > 0 ? `${blueHp}+${blueShield}/${blueMax}` : `${blueHp}/${blueMax}`;
    }
    if (blueBar) {
        blueBar.style.width = `${bluePct}%`;
        blueBar.classList.toggle('hp-warn', bluePct <= 60 && bluePct > 30);
        blueBar.classList.toggle('hp-danger', bluePct <= 30);
    }

    const redBox = document.getElementById('hud-red-base-box');
    const redTxt = document.getElementById('hud-red-hp-text');
    const redBar = document.getElementById('hud-red-hp-bar');

    if (game.battleMode === 'challenge' || game.battleMode === 'survival' || game.battleMode === 'endless_siege') {
        if (redBox) redBox.style.opacity = '0.45';
        if (redTxt) redTxt.textContent = `W.${game.wave}/${game.maxWaves === 999 ? '∞' : game.maxWaves}`;
        if (redBar) redBar.style.width = '100%';
    } else {
        if (redBox) redBox.style.opacity = '1';
        const redHp = Math.max(0, Math.ceil(game.enemyBase.hp));
        const redMax = Math.max(1, Math.ceil(game.enemyBase.maxHp));
        const redPct = Math.max(0, Math.min(100, (redHp / redMax) * 100));
        if (redTxt) redTxt.textContent = `${redHp}/${redMax}`;
        if (redBar) {
            redBar.style.width = `${redPct}%`;
            redBar.classList.toggle('hp-warn', redPct <= 60 && redPct > 30);
            redBar.classList.toggle('hp-danger', redPct <= 30);
        }
    }
}

// ============================================================================
// 4. HỆ THỐNG CỘNG HƯỞNG ĐỘI HÌNH TRONG TRẬN (IN-BATTLE SYNERGIES)
// ============================================================================
let lastSynergySignature = '';

export function updateActiveSynergies() {
    let hasPyro = false;
    let hasCryo = false;
    let hasCleric = false;
    let hasPaladin = false;
    let hasNecro = false;
    let hasDemonTierUnit = false;

    for (let i = 0; i < game.units.length; i++) {
        const u = game.units[i];
        if (u.dead || u.team !== 'blue') continue;
        if (u.id === 'pyromancer') hasPyro = true;
        else if (u.id === 'cryomancer') hasCryo = true;
        else if (u.id === 'cleric') hasCleric = true;
        else if (u.id === 'mecha_paladin') hasPaladin = true;
        else if (u.id === 'necromancer') hasNecro = true;

        if (isDemonRarity(u.spec?.rarityId)) {
            hasDemonTierUnit = true;
        }
    }

    game.activeSynergies.thermal_shock = hasPyro && hasCryo;
    game.activeSynergies.immortal_fortress = hasCleric && hasPaladin;
    game.activeSynergies.dark_legion = hasNecro && hasDemonTierUnit;

    const sig = `${game.activeSynergies.thermal_shock ? 1 : 0}_${game.activeSynergies.immortal_fortress ? 1 : 0}_${game.activeSynergies.dark_legion ? 1 : 0}`;
    if (sig !== lastSynergySignature) {
        lastSynergySignature = sig;
        renderSynergyHUD();
    }
}

export function renderSynergyHUD() {
    const strip = document.getElementById('hud-synergy-strip');
    if (!strip) return;

    const badges = [];
    if (game.activeSynergies.thermal_shock) {
        badges.push(`<span class="synergy-hud-pill ${BATTLE_SYNERGIES.thermal_shock.cssClass}">${BATTLE_SYNERGIES.thermal_shock.shortBadge}</span>`);
    }
    if (game.activeSynergies.immortal_fortress) {
        badges.push(`<span class="synergy-hud-pill ${BATTLE_SYNERGIES.immortal_fortress.cssClass}">${BATTLE_SYNERGIES.immortal_fortress.shortBadge}</span>`);
    }
    if (game.activeSynergies.dark_legion) {
        badges.push(`<span class="synergy-hud-pill ${BATTLE_SYNERGIES.dark_legion.cssClass}">${BATTLE_SYNERGIES.dark_legion.shortBadge}</span>`);
    }
    strip.innerHTML = badges.join('');
}

// ============================================================================
// 5. TÍNH TOÁN CHỈ SỐ ĐƠN VỊ (41 RARITY + 6 TALENTS + 40 SKILL TREE + CHIPS)
// ============================================================================
export function getEffectiveUnitStats(rawUnitId, team = 'blue', customRarityId = null) {
    if (ZOMBIE_BY_ID[rawUnitId]) {
        const zBase = ZOMBIE_BY_ID[rawUnitId];
        const mapScale = 1 + Math.max(0, (game?.currentLevel || 1) - 1) * 0.14;
        const waveScale = Math.pow(1.135, Math.max(0, (game?.wave || 1) - 1));
        const totalMult = mapScale * waveScale;

        return {
            ...zBase,
            isZombie: true,
            isWalker: true,
            hp: Math.round(zBase.hp * totalMult),
            maxHp: Math.round(zBase.hp * totalMult),
            damage: Math.round(zBase.damage * totalMult),
            dmg: Math.round(zBase.damage * totalMult),
            speed: zBase.speed,
            range: zBase.range,
            fireRate: zBase.fireRate,
            atkSpeed: zBase.fireRate,
            rarityId: 'common',
            rarityColor: '#ef4444',
            auraType: 'none',
            equippedSockets: []
        };
    }

    const unitId = normalizeUnitId(rawUnitId);
    const base = UNIT_BY_ID[unitId] || UNIT_CATALOG[0];

    const mapCfg = getActiveMapConfig();
    const mapRangeMult = mapCfg.rangeMult || 1.0;
    const mapMoveSpeedMult = mapCfg.moveSpeedMult || 1.0;
    const mapProjSpeedMult = mapCfg.projSpeedMult || 1.0;
    const mapAirCdMult = (base.isAir || base.isAirstrike) ? (mapCfg.airCooldownMult || 1.0) : 1.0;

    if (team === 'red') {
        const diffCfg = DIFFICULTY_CONFIG[game?.difficulty || 'easy'] || DIFFICULTY_CONFIG.easy;
        const lvScale = 1 + Math.max(0, (game?.currentLevel || 1) - 1) * MAP_ENEMY_SCALE_PER_LEVEL;
        const waveScale =
            game?.battleMode === 'endless_siege'
                ? Math.pow(1.15, Math.max(0, (game?.wave || 1) - 1))
                : 1 + Math.max(0, (game?.wave || 1) - 1) * 0.055;
        const mult = diffCfg.statMult * lvScale * waveScale;

        return {
            ...base,
            hp: Math.round(base.hp * mult),
            maxHp: Math.round(base.hp * mult),
            damage: Math.round(base.damage * mult),
            dmg: Math.round(base.damage * mult),
            speed: Math.round(base.speed * mapMoveSpeedMult),
            range: Math.round(base.range * mapRangeMult),
            projSpeed: Math.round((base.projSpeed || 250) * mapProjSpeedMult),
            fireRate: base.fireRate,
            atkSpeed: base.fireRate,
            burnDps: base.innateBurnDps || 0,
            burnDuration: base.innateBurnDuration || 3.0,
            chillSlowPct: base.chillSlowPct || 0,
            chillDuration: base.chillDuration || 0,
            rangedShieldReductionPct: base.rangedShieldReductionPct || 0,
            rarityId: 'common',
            rarityColor: '#ef4444',
            auraType: 'none',
            equippedSockets: []
        };
    }

    // Phe Xanh (Người chơi)
    const permLv = metaState?.armyPermanentLevels?.[base.id] || metaState?.armyPermanentLevels?.[rawUnitId] || 1;
    const lvMult = 1 + (permLv - 1) * 0.12;

    const matchStars = Math.max(1, Number(game?.battleUnitStars?.[base.id]) || 1);
    const starMult = 1 + (matchStars - 1) * 0.22;

    const rarityId = customRarityId || getHighestRarityForUnit(base.id) || 'common';
    const rarityObj = RARITY_CONFIG[rarityId] || { mult: 1.0, color: '#94a3b8', auraType: 'none' };
    const rarityMult = rarityObj.mult ?? 1.0;

    // 1. Tổng hợp chỉ số từ Cây Kỹ Năng Cổ Thụ 4 Nhánh (40 Kỹ Năng)
    const treeB = getAncientSkillTreeBonuses();

    let hpBonusPct = treeB.hpPct;
    let dmgBonusPct = treeB.allDmgPct + (base.element === 'elemental' ? treeB.elemDmgPct : treeB.physDmgPct);
    let speedBonusPct = treeB.moveSpeedPct;
    let fireRateBonusPct = treeB.fireRatePct;
    let rangeBonusFlat = treeB.rangeBonus;
    let cdReductionPct = treeB.cdReductionPct;
    let splashBonusFlat = base.splash > 0 ? treeB.splashBonus : 0;
    let armorReductionPct = treeB.armorPct;
    let lifestealPct = treeB.lifestealPct;
    let critChance = treeB.critChance;
    let ccDurationMult = 1 + treeB.ccDurationPct;
    let ccResistPct = treeB.ccResistPct;
    let healBonusPct = treeB.healBonusPct;
    let zombieDmgBonusPct = treeB.zombieDmgPct;
    let hpRegenPctPerSec = treeB.hpRegenPct;
    let burnDps = base.innateBurnDps
        ? Math.round(base.innateBurnDps * Math.max(1, Math.sqrt(lvMult)) * (1 + treeB.burnBonusPct))
        : 0;
    let burnDuration = base.innateBurnDuration || 3.0;
    let stunChance = treeB.stunChanceBonus;
    let stunDuration = 1.1;

    // 2. Tích hợp 6 nhánh TALENTS (Huy chương)
    const steelLv = Number(metaState?.metaTalents?.high_grade_steel) || 0;
    const logiLv = Number(metaState?.metaTalents?.optimal_logistics) || 0;
    const critLv = Number(metaState?.metaTalents?.critical_firepower) || 0;

    if (steelLv > 0) {
        hpBonusPct += steelLv * 0.03;
        armorReductionPct += steelLv * 0.03;
    }
    if (logiLv > 0) {
        cdReductionPct += logiLv * 0.025;
    }
    if (critLv > 0) {
        critChance += critLv * 0.025;
    }

    // 3. Tích hợp 2 Khe Chip Bổ Trợ
    const sockets = Array.isArray(metaState?.unitSockets?.[base.id]) ? metaState.unitSockets[base.id] : [];
    sockets.forEach(chipId => {
        if (!chipId) return;
        if (chipId === 'napalm_rocket') {
            burnDps += Math.round((UNIT_CHIPS.napalm_rocket?.burnDps ?? 18) * (1 + treeB.burnBonusPct));
            burnDuration = Math.max(burnDuration, UNIT_CHIPS.napalm_rocket?.burnDuration ?? 3.0);
            splashBonusFlat += UNIT_CHIPS.napalm_rocket?.splashBonus ?? 14;
        } else if (chipId === 'tactical_radar') {
            rangeBonusFlat += UNIT_CHIPS.tactical_radar?.rangeBonusFlat ?? 28;
            stunChance = Math.min(0.75, stunChance + (UNIT_CHIPS.tactical_radar?.stunChance ?? 0.14));
            stunDuration = Math.max(stunDuration, UNIT_CHIPS.tactical_radar?.stunDuration ?? 1.2);
        } else if (chipId === 'reactive_armor') {
            hpBonusPct += UNIT_CHIPS.reactive_armor?.hpBonusPct ?? 0.18;
            armorReductionPct += UNIT_CHIPS.reactive_armor?.damageReductionPct ?? 0.15;
        } else if (chipId === 'overclock_core' || chipId === 'overclock_servo') {
            speedBonusPct += UNIT_CHIPS.overclock_core?.speedBonusPct ?? 0.20;
            cdReductionPct += UNIT_CHIPS.overclock_core?.cooldownReductionPct ?? 0.15;
            stunChance = Math.min(0.75, stunChance + (UNIT_CHIPS.overclock_core?.stunChance ?? 0.14));
            stunDuration = Math.max(stunDuration, UNIT_CHIPS.overclock_core?.stunDuration ?? 1.2);
        }
    });

    // 4. Đột biến Roguelike
    if (game?.activeMutations?.length) {
        for (const mutId of game.activeMutations) {
            if (mutId === 'titan_armor') hpBonusPct += 0.35;
            if (mutId === 'plasma_rounds') dmgBonusPct += 0.30;
            if (mutId === 'hyper_thrusters') speedBonusPct += 0.28;
            if (mutId === 'sniper_optics') rangeBonusFlat += 35;
            if (mutId === 'napalm_payload') {
                burnDps += 24;
                splashBonusFlat += 18;
            }
            if (mutId === 'nano_leech') lifestealPct += 0.22;
            if (mutId === 'rapid_clone') cdReductionPct += 0.25;
        }
    }

    let finalHp = Math.max(1, Math.round(base.hp * lvMult * rarityMult * starMult * (1 + hpBonusPct)));
    let finalDmg = Math.max(1, Math.round(base.damage * lvMult * rarityMult * starMult * (1 + dmgBonusPct)));

    if (base.isSummonedSkeleton) {
        const skelMult = (game?.activeSynergies?.dark_legion ? 2.0 : 1.0) * (1 + treeB.skeletonStatPct);
        finalHp = Math.round(finalHp * skelMult);
        finalDmg = Math.round(finalDmg * skelMult);
    }

    const challengeCdMult = game?.battleMode === 'challenge' ? CHALLENGE_COOLDOWN_MULT : 1.0;
    const finalSpeed = Math.round(base.speed * (1 + speedBonusPct) * mapMoveSpeedMult);
    const finalRange = Math.max(30, Math.round((base.range + rangeBonusFlat) * mapRangeMult));
    const finalFireRate = +(base.fireRate * (1 + fireRateBonusPct)).toFixed(2);
    const finalCooldown = Math.max(
        0.5,
        base.cooldown * (1 - Math.min(0.65, cdReductionPct)) * mapAirCdMult * challengeCdMult
    );
    const radarCount = sockets.filter(id => id === 'tactical_radar').length;

    return {
        ...base,
        level: permLv,
        matchStars,
        rarityId,
        rarityRank: rarityObj.rank ?? 0,
        rarityColor: rarityObj.color || '#38bdf8',
        auraType: rarityObj.auraType || 'none',
        hp: finalHp,
        maxHp: finalHp,
        damage: finalDmg,
        dmg: finalDmg,
        speed: finalSpeed,
        range: finalRange,
        projSpeed: Math.round((base.projSpeed || 250) * mapProjSpeedMult),
        fireRate: finalFireRate,
        atkSpeed: finalFireRate,
        visionCone: (base.visionCone || base.range + 35) + radarCount * (UNIT_CHIPS.tactical_radar?.nightVisionBonus ?? 65),
        splash: (base.splash || 0) + splashBonusFlat,
        cooldown: finalCooldown,
        equippedSockets: sockets,
        armorReductionPct: Math.min(0.75, armorReductionPct),
        rangedShieldReductionPct: base.rangedShieldReductionPct || 0,
        chillSlowPct: base.chillSlowPct || 0,
        chillDuration: (base.chillDuration || 0) * ccDurationMult,
        ccResistPct: Math.min(0.75, ccResistPct),
        healBonusPct,
        lifestealPct,
        critChance: Math.min(0.85, critChance),
        zombieDmgBonusPct,
        hpRegenPctPerSec,
        burnDps,
        burnDuration: burnDuration * ccDurationMult,
        stunChance,
        stunDuration: stunDuration * ccDurationMult
    };
}

// ============================================================================
// 6. LỚP ĐƠN VỊ CHIẾN ĐẤU (UNIT / TOWER / ZOMBIE) & ĐẠN PHÁO (PROJECTILE)
// ============================================================================
let NEXT_UNIT_UID = 1;

export class Unit {
    constructor(team, unitId, x, y, customRarityId = null) {
        this.uid = NEXT_UNIT_UID++;
        this.team = team;
        this.spec = getEffectiveUnitStats(unitId, team, customRarityId);
        this.id = this.spec.id;
        this.x = x;
        this.y = y;
        this.hp = this.spec.hp;
        this.maxHp = this.spec.maxHp;
        this.shield = 0;
        this.maxShield = 0;
        this.radius = this.spec.radius || 12;
        this.isWalker = !!this.spec.isWalker;
        this.isAir = !!this.spec.isAir;
        this.isNaval = !!this.spec.isNaval;
        this.isZombie = !!this.spec.isZombie;
        this.isTower = false;
        this.tdCol = -1;
        this.tdRow = -1;
        this.tdCellIdx = -1;
        this.altitude = this.isAir ? (this.spec.altitude || 26) : 0;

        this.angle = team === 'blue' ? -Math.PI / 2 : Math.PI / 2;
        this.turretAngle = this.angle;
        this.walkCycle = Math.random() * Math.PI * 2;
        this.rotorAngle = 0;
        this.recoilOffset = 0;
        this.hitFlash = 0;
        this.attackTimer = Math.random() * 0.25;
        this.trailTimer = 0;
        this.auraPhase = Math.random() * Math.PI * 2;

        // Timers hiệu ứng & kỹ năng Zombie / Boss
        this.stunTimer = 0;
        this.burnTimer = 0;
        this.burnDps = 0;
        this.chillTimer = 0;
        this.chillSlowPct = 0.55;
        this.acidSlowTimer = 0;
        this.airdropBuffTimer = 0;
        this.swampTickTimer = 0;
        this.summonTimer = this.spec.summonCooldown || 5.5;
        this.roarTimer = this.spec.roarCooldown || 6.5;
        this.ownerNecroUid = null;
        this.isBossUnit = !!this.spec.isBoss;
        this.dead = false;
    }

    applyStatusEffect(type, duration, value = 0) {
        if (this.dead || this.spec?.ccImmune) return;
        const resistMult = this.team === 'blue' ? (1 - (this.spec?.ccResistPct || 0)) : 1.0;
        const effDur = duration * Math.max(0.25, resistMult);

        if (type === 'stun') {
            this.stunTimer = Math.max(this.stunTimer, effDur);
        } else if (type === 'chill') {
            this.chillTimer = Math.max(this.chillTimer, effDur);
            this.chillSlowPct = value || 0.55;
        } else if (type === 'acid') {
            this.acidSlowTimer = Math.max(this.acidSlowTimer, effDur);
        }
    }

    takeDamage(rawAmount, attacker = null, isRangedAttack = false, isTrueDamage = false) {
        if (this.dead) return;
        let finalDmg = rawAmount;

        // Cành Săn Xác Sống: tăng sát thương lên Zombie & Boss
        if (this.isZombie && attacker && attacker.team === 'blue' && attacker.spec?.zombieDmgBonusPct > 0) {
            finalDmg *= 1 + attacker.spec.zombieDmgBonusPct;
        }

        // Bạo kích từ Talents & Skill Tree (1.75x DMG)
        let isCrit = false;
        if (attacker && attacker.team === 'blue' && attacker.spec?.critChance > 0) {
            if (Math.random() < attacker.spec.critChance) {
                finalDmg *= 1.75;
                isCrit = true;
            }
        }

        if (!isTrueDamage) {
            let totalRed = this.spec.armorReductionPct || 0;
            if (this.team === 'blue' && game.activeSynergies.immortal_fortress) {
                totalRed += BATTLE_SYNERGIES.immortal_fortress.globalArmorBonusPct || 0.15;
            }
            if (isRangedAttack && this.spec.rangedShieldReductionPct > 0) {
                totalRed += this.spec.rangedShieldReductionPct;
            }
            if (this.spec.frontalShieldReductionPct > 0 && attacker && attacker.y >= this.y - 12) {
                totalRed += this.spec.frontalShieldReductionPct;
            }
            totalRed = Math.min(0.82, totalRed);
            if (totalRed > 0) {
                finalDmg *= 1 - totalRed;
            }
        }

        finalDmg = Math.max(1, Math.round(finalDmg));

        // Hấp thụ sát thương bằng Khiên Phản Chấn Vĩnh Cửu trước khi trừ máu
        if (this.shield > 0) {
            const absorbed = Math.min(this.shield, finalDmg);
            this.shield -= absorbed;
            finalDmg -= absorbed;
            if (finalDmg <= 0) {
                this.hitFlash = 0.08;
                return;
            }
        }

        this.hp -= finalDmg;
        this.hitFlash = 0.12;

        if (isCrit) {
            spawnFloatingText(this.x, this.y - this.radius - 8, `💥 ${finalDmg}!`, '#fde047', 12);
        }

        if (attacker && !attacker.dead && attacker.spec?.lifestealPct > 0) {
            const heal = Math.max(1, Math.round(finalDmg * attacker.spec.lifestealPct));
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            sfx.play('boom');

            if (this.isTower && this.tdCellIdx >= 0 && game.tdGrid[this.tdCellIdx] === this) {
                game.tdGrid[this.tdCellIdx] = null;
            }

            const treeB = getAncientSkillTreeBonuses();

            // Hoàn Xăng khi quân Xanh hy sinh (Talent Thu Hoạch Chiến Trường + Tái Chế Khí Tài)
            if (this.team === 'blue' && !this.spec.isSummonedSkeleton) {
                const harvestLv = Number(metaState?.metaTalents?.battlefield_harvest) || 0;
                const totalRefundPct = (harvestLv > 0 ? 0.15 : 0) + (treeB.deathGasRefundPct || 0);
                if (totalRefundPct > 0 && (this.spec.cost || 0) > 0) {
                    const gasBack = Math.max(0.3, +(this.spec.cost * totalRefundPct).toFixed(2));
                    game.gas = Math.min(game.maxGas, game.gas + gasBack);
                    spawnFloatingText(this.x, this.y, `+${gasBack}⛽`, '#4ade80', 11);
                }

                // Kỹ năng Đặc Biệt Mốc 10 Nhánh Triệu Hồi: Lãnh Chúa Hư Không (25% hồi sinh thành Xương)
                if (treeB.void_lord && Math.random() < 0.25) {
                    sfx.play('summon');
                    spawnUnit('blue', 'skeleton', this.x, this.y, this.spec.rarityId);
                    spawnShockwave(this.x, this.y, 26, '#c084fc', 2.5);
                    spawnFloatingText(this.x, this.y - 14, '👑 HỒI SINH XƯƠNG!', '#f0abfc', 11);
                }
            }

            const isMaster = isMasterRarity(this.spec.rarityId);
            const isDemon = isDemonRarity(this.spec.rarityId);
            spawnExplosionFX(
                this.x,
                this.y,
                this.radius * (this.isBossUnit ? 2.8 : 1.8),
                isDemon || this.isZombie,
                isMaster
            );

            if (this.team === 'red') {
                game.matchKills++;
                if (metaState?.missionsProgress) {
                    metaState.missionsProgress.kills = (metaState.missionsProgress.kills || 0) + 1;
                }
                const expGain = this.spec.expReward || (this.isBossUnit ? 85 : 10);
                grantBattleExp(expGain);

                const killGasProb = (game.battleMode === 'endless_siege' ? 0.25 : 0) + (treeB.killGasChance || 0);
                if (killGasProb > 0 && Math.random() < killGasProb) {
                    game.gas = Math.min(game.maxGas, game.gas + 0.5);
                }
            }

            if (!this.spec.isSummonedSkeleton) {
                tryTriggerNecromancerSoulHarvest(this);
            }
        }
    }

    update(dt) {
        if (this.dead) return;
        this.auraPhase += dt;

        if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') {
            if (this.isAir) this.rotorAngle += dt * 18;
            return;
        }

        if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
        if (this.recoilOffset > 0) this.recoilOffset = Math.max(0, this.recoilOffset - dt * 22);
        if (this.airdropBuffTimer > 0) this.airdropBuffTimer = Math.max(0, this.airdropBuffTimer - dt);
        if (this.chillTimer > 0) this.chillTimer = Math.max(0, this.chillTimer - dt);
        if (this.acidSlowTimer > 0) this.acidSlowTimer = Math.max(0, this.acidSlowTimer - dt);
        if (this.isAir) this.rotorAngle += dt * 24;

        // Huyết Thanh Tái Tạo (Skill Tree): Hồi HP tự động mỗi giây cho toàn quân & Tower
        if (this.team === 'blue' && this.spec.hpRegenPctPerSec > 0 && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.spec.hpRegenPctPerSec * dt);
        }

        // Cơ chế Map 37 (Đầm Lầy Độc Tố Neon)
        const mapCfg = getActiveMapConfig();
        if (mapCfg.swampInfantryDotPct > 0 && this.spec.category === 'infantry' && !this.isAir && !this.isTower) {
            if (nav.isPointInToxicSwamp(this.x, this.y)) {
                this.hp -= this.maxHp * mapCfg.swampInfantryDotPct * dt;
                this.swampTickTimer -= dt;
                if (this.swampTickTimer <= 0) {
                    this.swampTickTimer = 0.45;
                    particlePool.spawn(this.x, this.y, (Math.random() - 0.5) * 10, -16, 2.6, '#4ade80', 2.4, 'circle');
                }
                if (this.hp <= 0) {
                    this.takeDamage(1, null, false, true);
                    return;
                }
            }
        }

        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.hp -= this.burnDps * dt;
            if (Math.random() < 0.35) {
                particlePool.spawn(
                    this.x + (Math.random() - 0.5) * 10,
                    this.y + (Math.random() - 0.5) * 10,
                    0,
                    -18,
                    2.5,
                    '#f97316',
                    2.4,
                    'circle'
                );
            }
            if (this.hp <= 0) {
                this.takeDamage(1, null, false, true);
                return;
            }
        }

        if (this.stunTimer > 0) {
            if (!this.spec.ccImmune) {
                this.stunTimer -= dt;
                return;
            }
            this.stunTimer = 0;
        }

        // Kỹ năng đặc biệt của Zombie & Boss trong CHALLENGE
        if (this.isZombie) {
            if (this.spec.summonCooldown > 0) {
                this.summonTimer -= dt;
                if (this.summonTimer <= 0) {
                    this.summonTimer = this.spec.summonCooldown;
                    sfx.play('summon');
                    const summonType = this.id === 'boss_omega_tyrant' ? 'zombie_runner' : 'zombie_walker';
                    [-24, 24].forEach(ox => {
                        const sx = Math.max(30, Math.min(LOGICAL_WIDTH - 30, this.x + ox));
                        spawnZombie(summonType, sx, this.y + 12);
                    });
                    spawnShockwave(this.x, this.y, 34, '#a855f7', 2.5);
                }
            }
            if (this.spec.roarCooldown > 0) {
                this.roarTimer -= dt;
                if (this.roarTimer <= 0) {
                    this.roarTimer = this.spec.roarCooldown;
                    sfx.play('roar');
                    addScreenShake(6, 0.25);
                    const rRad = this.spec.roarRadius || 135;
                    spawnShockwave(this.x, this.y, rRad, '#c084fc', 4.5);
                    spawnFloatingText(this.x, this.y - 20, '🔊 GẦM CHOÁNG!', '#f0abfc', 13);
                    for (const u of game.units) {
                        if (u.team === 'blue' && !u.dead && Math.hypot(u.x - this.x, u.y - this.y) <= rRad) {
                            u.applyStatusEffect('stun', this.spec.roarStunDuration || 2.2);
                        }
                    }
                }
            }
        }

        const isBlitz = this.team === 'blue' && game.blitzkriegTimer > 0;
        const blitzSpeedMult = COMMANDER_TACTICS.blitzkrieg?.speedMult ?? 1.42;
        const blitzFireMult = COMMANDER_TACTICS.blitzkrieg?.fireRateMult ?? 1.55;
        const airdropFireMult = 1 + (COMMANDER_TACTICS.airdrop?.atkSpeedBuff ?? 0.30);

        const chillMult = (this.chillTimer > 0 && !this.spec.ccImmune) ? (1 - (this.chillSlowPct || 0.55)) : 1.0;
        const acidMult = this.acidSlowTimer > 0 ? 0.60 : 1.0;

        let iceVehicleMult = 1.0;
        if (mapCfg.vehicleIceSpeedBonus > 0 && this.spec.category === 'vehicle' && nav.isPointOnIce(this.x, this.y)) {
            iceVehicleMult = 1 + mapCfg.vehicleIceSpeedBonus;
        }

        const speedMult = (isBlitz ? blitzSpeedMult : 1.0) * chillMult * iceVehicleMult;
        const fireRateMult = (isBlitz ? blitzFireMult : 1.0) * (this.airdropBuffTimer > 0 ? airdropFireMult : 1.0) * chillMult * acidMult;

        this.attackTimer -= dt * fireRateMult;

        if (this.spec.isHealer) {
            const injuredAllies = this.findInjuredAlliesInRange();
            if (injuredAllies.length > 0) {
                const primaryAlly = injuredAllies[0];
                this.turretAngle = Math.atan2(primaryAlly.y - this.y, primaryAlly.x - this.x);
                this.angle = this.turretAngle;
                if (this.attackTimer <= 0) {
                    this.castHolyHealOnAllies(injuredAllies);
                    this.attackTimer = 1 / Math.max(0.25, this.spec.fireRate);
                }
                return;
            }
            if (this.isTower) return;
        } else {
            const target = this.findBestTarget();
            if (target) {
                const tx = target.x;
                const ty = target.y;
                const dist = Math.hypot(tx - this.x, ty - this.y);
                this.turretAngle = Math.atan2(ty - this.y, tx - this.x);

                if (dist <= this.spec.range) {
                    this.angle = this.turretAngle;
                    if (this.attackTimer <= 0) {
                        this.fireAt(target);
                        this.attackTimer = 1 / Math.max(0.25, this.spec.fireRate);
                    }
                    return;
                }
            }
        }

        if (this.isTower) {
            this.walkCycle += dt * 3;
            return;
        }

        let dirX = 0;
        let dirY = this.team === 'blue' ? -1 : 1;

        if (this.isZombie) {
            dirX = this.spec.zigzagAmp ? Math.sin(this.walkCycle * 1.4) * 0.55 : 0;
            dirY = 1.0;
        } else {
            const target = this.spec.isHealer ? this.findFrontlineAllyToFollow() : this.findBestTarget();

            if (this.spec.isHealer && target) {
                const distToAlly = Math.hypot(target.x - this.x, target.y - this.y);
                if (distToAlly <= 52) return;
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const l = Math.hypot(dx, dy) || 1;
                dirX = dx / l;
                dirY = dy / l;
            } else if (target && Math.hypot(target.x - this.x, target.y - this.y) < this.spec.range * 1.45) {
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const l = Math.hypot(dx, dy) || 1;
                dirX = dx / l;
                dirY = dy / l;
            } else if (!this.isAir) {
                const flow = nav.getFlowDirection(this.x, this.y, this.team, this.isNaval);
                dirX = flow.dirX;
                dirY = flow.dirY;
            } else {
                const goalX = this.team === 'blue' ? game.enemyBase.x : game.playerBase.x;
                const goalY = this.team === 'blue' ? game.enemyBase.y : game.playerBase.y;
                const dx = goalX - this.x;
                const dy = goalY - this.y;
                const l = Math.hypot(dx, dy) || 1;
                dirX = dx / l;
                dirY = dy / l;
            }
        }

        for (const other of game.units) {
            if (other === this || other.dead || other.isAir !== this.isAir || other.isTower) continue;
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const d = Math.hypot(dx, dy);
            const minSep = this.radius + other.radius + 2;
            if (d > 0.001 && d < minSep) {
                const push = ((minSep - d) / minSep) * 0.85;
                dirX += (dx / d) * push;
                dirY += (dy / d) * push;
            }
        }

        const norm = Math.hypot(dirX, dirY) || 1;
        dirX /= norm;
        dirY /= norm;

        const moveStep = this.spec.speed * speedMult * dt;
        this.x += dirX * moveStep;
        this.y += dirY * moveStep;
        this.angle = Math.atan2(dirY, dirX);
        this.turretAngle = this.angle;
        this.walkCycle += dt * (this.isWalker ? 11 : 7);

        if (this.isZombie) {
            this.x = Math.max(24, Math.min(LOGICAL_WIDTH - 24, this.x));
            this.y = Math.max(24, Math.min(PLAYFIELD_HEIGHT - 24, this.y));
        } else {
            nav.resolveHardCollisions(this);
        }

        this.trailTimer -= dt;
        if (this.trailTimer <= 0) {
            this.spawnMovementTrail();
            this.trailTimer = this.isNaval ? 0.11 : (this.isWalker ? 0.18 : 0.09);
        }
    }

    findInjuredAlliesInRange() {
        const candidates = [];
        for (const u of game.units) {
            if (u.dead || u.team !== this.team) continue;
            if (u.hp >= u.maxHp) continue;
            const d = Math.hypot(u.x - this.x, u.y - this.y);
            if (d <= this.spec.range) {
                candidates.push(u);
            }
        }
        candidates.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        return candidates.slice(0, this.spec.healTargetsCount || 2);
    }

    findFrontlineAllyToFollow() {
        let best = null;
        let bestDist = Infinity;
        for (const u of game.units) {
            if (u.dead || u.team !== this.team || u === this || u.spec.isHealer) continue;
            const d = Math.hypot(u.x - this.x, u.y - this.y);
            if (d < bestDist) {
                bestDist = d;
                best = u;
            }
        }
        return best;
    }

    castHolyHealOnAllies(allies) {
        sfx.play('heal');
        const synMult = (this.team === 'blue' && game.activeSynergies.immortal_fortress)
            ? (1 + (BATTLE_SYNERGIES.immortal_fortress.healBonusPct || 0.20))
            : 1.0;
        const skillTreeHealMult = 1 + (this.spec.healBonusPct || 0);
        const healAmount = Math.max(1, Math.round(this.spec.damage * synMult * skillTreeHealMult));

        allies.forEach(ally => {
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
            game.beamEffects.push({
                x1: this.x,
                y1: this.y - 6,
                x2: ally.x,
                y2: ally.y - (ally.altitude || 0),
                color: '#34d399',
                width: 3.2,
                ttl: 0.14
            });
            spawnFloatingText(ally.x, ally.y - ally.radius - 6, `+${healAmount} HP`, '#4ade80', 11);
            particlePool.spawn(ally.x, ally.y, 0, -20, 3.5, '#fde047', 2.2, 'circle');
        });
    }

    spawnMovementTrail() {
        const auraType = this.spec.auraType || 'none';
        if (this.team === 'blue' && (auraType === 'master_aqua' || auraType === 'demon_abyss')) {
            const col = auraType === 'demon_abyss'
                ? (Math.random() < 0.5 ? '#d946ef' : '#a855f7')
                : (Math.random() < 0.5 ? '#00f2fe' : '#38bdf8');
            particlePool.spawn(
                this.x + (Math.random() - 0.5) * 12,
                this.y + (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 14,
                -12 - Math.random() * 14,
                2.6,
                col,
                2.3,
                'circle'
            );
        }

        if (this.isAir) return;

        if (this.isNaval) {
            const bx = this.x - Math.cos(this.angle) * (this.radius * 0.85);
            const by = this.y - Math.sin(this.angle) * (this.radius * 0.85);
            particlePool.spawn(bx, by, 0, 0, 5, 'rgba(224, 242, 254, 0.85)', 1.4, 'wake', this.angle);
        } else if (this.isWalker) {
            const fx = this.x - Math.cos(this.angle) * 6;
            const fy = this.y - Math.sin(this.angle) * 6 + 4;
            particlePool.spawn(fx, fy, (Math.random() - 0.5) * 8, -4, 3.2, '#d4a373', 2.2, 'dust', 0);
        } else {
            const perpX = -Math.sin(this.angle) * 6.5;
            const perpY = Math.cos(this.angle) * 6.5;
            const backX = this.x - Math.cos(this.angle) * 8;
            const backY = this.y - Math.sin(this.angle) * 8;
            game.tireTracks.push({
                x1: backX - perpX,
                y1: backY - perpY,
                x2: backX + perpX,
                y2: backY + perpY,
                angle: this.angle,
                alpha: 0.42
            });
            if (game.tireTracks.length > 120) {
                game.tireTracks.shift();
            }
        }
    }

    findBestTarget() {
        let best = null;
        let bestDist = Infinity;

        for (const u of game.units) {
            if (u.dead || u.team === this.team) continue;
            const d = Math.hypot(u.x - this.x, u.y - this.y);
            if (d < bestDist) {
                bestDist = d;
                best = u;
            }
        }

        if (this.team === 'blue' && game.battleMode === 'raid_boss' && game.raidBoss && game.raidBoss.hp > 0) {
            const dBoss = Math.hypot(game.raidBoss.x - this.x, game.raidBoss.y - this.y) - 28;
            if (dBoss <= this.spec.range || dBoss < bestDist) {
                return {
                    isBoss: true,
                    x: game.raidBoss.x,
                    y: game.raidBoss.y + 18,
                    ref: game.raidBoss
                };
            }
        }

        if (game.battleMode === 'challenge' && this.team === 'blue') {
            return best;
        }

        const enemyBaseObj = this.team === 'blue' ? game.enemyBase : game.playerBase;
        if (enemyBaseObj && enemyBaseObj.hp > 0) {
            const dBase = Math.hypot(enemyBaseObj.x - this.x, enemyBaseObj.y - this.y) - 24;
            if (dBase <= this.spec.range || !best) {
                if (!best || dBase < bestDist) {
                    return {
                        isBase: true,
                        x: enemyBaseObj.x,
                        y: enemyBaseObj.y,
                        ref: enemyBaseObj
                    };
                }
            }
        }

        return best;
    }

    fireAt(target) {
        const muzzleDist = this.radius + 5;
        const mx = this.x + Math.cos(this.turretAngle) * muzzleDist;
        const my = this.y - this.altitude + Math.sin(this.turretAngle) * muzzleDist;

        this.recoilOffset = 4.2;
        spawnMuzzleFlash(mx, my, this.turretAngle, this.spec.splash >= 30 ? 1.25 : 0.9);

        if (this.spec.isBomber) {
            sfx.play('boom');
            addScreenShake(6, 0.25);
            const splashR = this.spec.splash || 75;
            spawnExplosionFX(this.x, this.y, splashR, true, false);
            for (const u of game.units) {
                if (!u.dead && u.team === 'blue' && Math.hypot(u.x - this.x, u.y - this.y) <= splashR) {
                    u.takeDamage(this.spec.damage, this, false, false);
                }
            }
            if (Math.hypot(game.playerBase.x - this.x, game.playerBase.y - this.y) <= splashR + 28) {
                damageBase(game.playerBase, this.spec.damage);
            }
            this.dead = true;
            this.hp = 0;
            return;
        }

        if (this.spec.cleaveRadius > 0) {
            sfx.play('boom');
            const cRad = this.spec.cleaveRadius;
            spawnShockwave(this.x, this.y + 12, cRad, '#ef4444', 3.5);
            for (const u of game.units) {
                if (!u.dead && u.team === 'blue' && Math.hypot(u.x - this.x, u.y - this.y) <= cRad) {
                    u.takeDamage(this.spec.damage, this, false, false);
                }
            }
            if (target.isBase && target.ref) {
                damageBase(target.ref, this.spec.damage);
            }
            return;
        }

        const auraType = this.spec.auraType || 'none';

        if (this.spec.attackType === 'railgun_line') {
            sfx.play('railgun');
            const lineLen = this.spec.range || 210;
            const endX = this.x + Math.cos(this.turretAngle) * lineLen;
            const endY = this.y + Math.sin(this.turretAngle) * lineLen;

            game.beamEffects.push({
                x1: mx,
                y1: my,
                x2: endX,
                y2: endY,
                color: '#00f2fe',
                width: 5.2,
                ttl: 0.14
            });
            game.beamEffects.push({
                x1: mx,
                y1: my,
                x2: endX,
                y2: endY,
                color: '#ffffff',
                width: 2.0,
                ttl: 0.14
            });

            const stunDur = this.spec.lineStunDuration || 0.8;
            for (const u of game.units) {
                if (u.dead || u.team === this.team) continue;
                const dSeg = pointToSegmentDistance(u.x, u.y, this.x, this.y, endX, endY);
                if (dSeg <= u.radius + 8) {
                    applyDamageToTargetObject(u, this.spec.damage, this, true);
                    u.applyStatusEffect('stun', stunDur);
                    particlePool.spawn(u.x, u.y, 0, 0, 5, '#00f2fe', 3.0, 'circle');
                }
            }

            if (game.battleMode !== 'challenge') {
                const enemyBaseObj = this.team === 'blue' ? game.enemyBase : game.playerBase;
                if (enemyBaseObj && enemyBaseObj.hp > 0) {
                    const dBase = pointToSegmentDistance(enemyBaseObj.x, enemyBaseObj.y, this.x, this.y, endX, endY);
                    if (dBase <= 36) {
                        damageBase(enemyBaseObj, this.spec.damage * 0.85);
                    }
                }
            }

            if (this.team === 'blue' && game.battleMode === 'raid_boss' && game.raidBoss && game.raidBoss.hp > 0) {
                const dBoss = pointToSegmentDistance(game.raidBoss.x, game.raidBoss.y, this.x, this.y, endX, endY);
                if (dBoss <= 48) {
                    damageRaidBoss(this.spec.damage, endX);
                }
            }
            return;
        }

        if (this.spec.attackType === 'beam' || !this.spec.attackType) {
            sfx.play('beam');
            let beamColor = this.team === 'blue' ? '#fde047' : '#fb7185';
            if (this.id === 'mecha_paladin') beamColor = '#00f2fe';
            if (this.team === 'blue') {
                if (auraType === 'demon_abyss') beamColor = '#f0abfc';
                else if (auraType === 'master_aqua') beamColor = '#00f2fe';
            }
            game.beamEffects.push({
                x1: mx,
                y1: my,
                x2: target.x,
                y2: target.y - (target.altitude || 0),
                color: beamColor,
                width: auraType === 'demon_abyss' ? 3.8 : (auraType === 'master_aqua' ? 3.2 : 2.5),
                ttl: 0.08
            });
            const isRanged = this.spec.range > 105;
            let hitDmg = this.spec.damage;
            if (this.spec.towerBonusMult && target.isTower) {
                hitDmg *= this.spec.towerBonusMult;
            }
            applyDamageToTargetObject(target, hitDmg, this, isRanged);
        } else {
            if (this.spec.projType === 'ice_shard') sfx.play('freeze');
            else sfx.play('cannon');

            game.projectiles.push(
                new Projectile({
                    team: this.team,
                    x: mx,
                    y: my,
                    targetX: target.x,
                    targetY: target.y,
                    targetRef: target,
                    speed: this.spec.projSpeed || 250,
                    damage: this.spec.damage,
                    splash: this.spec.splash || 0,
                    arcHeight: this.spec.arcHeight || 0,
                    auraType,
                    projType: this.spec.projType || 'shell',
                    isRocket:
                        this.spec.projType === 'rocket_short' ||
                        this.spec.projType === 'air_missile' ||
                        this.spec.projType === 'arc_missile',
                    owner: this
                })
            );
        }
    }

    drawShadow(ctx) {
        if (this.team === 'blue' && (isMasterRarity(this.spec.rarityId) || isDemonRarity(this.spec.rarityId))) {
            drawCanvasRarityAura(
                ctx,
                this.x,
                this.y + 3,
                this.radius * 1.18,
                this.spec.rarityId,
                game.timeSec + this.auraPhase
            );
        }

        if (this.isTower) {
            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
            ctx.strokeStyle = this.shield > 0 ? '#00f2fe' : '#38bdf8';
            ctx.lineWidth = this.shield > 0 ? 2.4 : 1.6;
            ctx.beginPath();
            ctx.arc(this.x, this.y + 5, this.radius + 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            return;
        }

        ctx.save();
        if (this.isAir) {
            const sx = this.x + 18;
            const sy = this.y + 22;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
            ctx.beginPath();
            ctx.ellipse(sx, sy, this.radius * 0.85, this.radius * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.isWalker) {
            const pulse = 1 + Math.sin(this.walkCycle) * 0.14;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
            ctx.beginPath();
            ctx.ellipse(
                this.x + 4,
                this.y + 4,
                this.radius * 0.82 * pulse,
                this.radius * 0.52 * (2 - pulse),
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.36)';
            ctx.beginPath();
            ctx.ellipse(this.x + 4, this.y + 4, this.radius * 1.02, this.radius * 0.68, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawBody(ctx) {
        const drawX = this.x - Math.cos(this.turretAngle) * this.recoilOffset;
        const drawY =
            this.y -
            this.altitude -
            Math.sin(this.turretAngle) * this.recoilOffset +
            (this.isWalker && !this.isTower ? Math.abs(Math.sin(this.walkCycle)) * -2.2 : 0);

        if (game.showRanges) {
            ctx.save();
            ctx.strokeStyle = this.team === 'blue' ? 'rgba(56, 189, 248, 0.28)' : 'rgba(244, 63, 94, 0.24)';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.spec.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();

        if (this.team === 'blue' && (game.blitzkriegTimer > 0 || this.airdropBuffTimer > 0)) {
            ctx.strokeStyle = game.blitzkriegTimer > 0 ? '#fde047' : '#4ade80';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(drawX, drawY, this.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Vòng Khiên Phản Chấn Vĩnh Cửu trên Tower
        if (this.shield > 0) {
            ctx.strokeStyle = 'rgba(0, 242, 254, 0.85)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(drawX, drawY, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.isAir && this.team === 'blue' && (isMasterRarity(this.spec.rarityId) || isDemonRarity(this.spec.rarityId))) {
            drawCanvasRarityAura(
                ctx,
                drawX,
                drawY + 4,
                this.radius * 1.1,
                this.spec.rarityId,
                game.timeSec + this.auraPhase
            );
        }

        const size = this.radius * 2.4;

        if (this.isZombie || isZombieUnit(this.id)) {
            const zScaleSize = 34 * (this.spec.scale || 1.0);
            drawZombieArt(ctx, this.id, drawX, drawY, zScaleSize, game.timeSec + this.auraPhase);
        } else {
            // Vẽ 100% Procedural Canvas 2D xoay mượt mọi góc 0 -> 2π
            drawUnitArt(
                ctx,
                this.id,
                drawX,
                drawY,
                size,
                this.team,
                game.timeSec + this.auraPhase,
                this.turretAngle,
                {
                    walkCycle: this.walkCycle,
                    rotorAngle: this.rotorAngle,
                    recoilOffset: this.recoilOffset
                }
            );
        }

        ctx.restore();

        if (this.chillTimer > 0 && !this.spec.ccImmune) {
            ctx.save();
            ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
            ctx.strokeStyle = '#bae6fd';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(drawX, drawY, this.radius + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        if (this.acidSlowTimer > 0) {
            ctx.save();
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(drawX, drawY, this.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (this.hitFlash > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.beginPath();
            ctx.arc(drawX, drawY, this.radius * 0.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (this.stunTimer > 0 && !this.spec.ccImmune) {
            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(drawX, drawY - this.radius - 8, 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (this.team === 'blue' && (this.spec.matchStars || 1) > 1) {
            ctx.save();
            ctx.font = '900 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fde047';
            ctx.fillText(`★${this.spec.matchStars}`, drawX, drawY + this.radius + 9);
            ctx.restore();
        }

        if (this.hp < this.maxHp || this.shield > 0 || this.isBossUnit) {
            const bw = Math.max(20, this.radius * 1.7);
            const bh = this.isBossUnit ? 6 : 4;
            const bx = drawX - bw / 2;
            const by = drawY - this.radius - 10;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
            ctx.fillStyle = this.team === 'blue'
                ? (isDemonRarity(this.spec.rarityId) ? '#d946ef' : (isMasterRarity(this.spec.rarityId) ? '#00f2fe' : '#22c55e'))
                : (this.isBossUnit ? '#f97316' : '#ef4444');
            ctx.fillRect(bx, by, bw * Math.max(0, this.hp / this.maxHp), bh);

            if (this.shield > 0 && this.maxShield > 0) {
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(bx, by - 2.5, bw * Math.min(1, this.shield / this.maxShield), 2);
            }
        }
    }
}

export function tryTriggerNecromancerSoulHarvest(deadEnemy) {
    if (!deadEnemy || deadEnemy.team !== 'red') return;
    const treeB = getAncientSkillTreeBonuses();

    for (const u of game.units) {
        if (u.dead || u.team !== 'blue' || !u.spec.isNecromancer) continue;
        const dist = Math.hypot(u.x - deadEnemy.x, u.y - deadEnemy.y);
        if (dist <= (u.spec.soulHarvestRadius || 135)) {
            const baseCap = (u.spec.maxSkeletons || 4) + (treeB.extraSkeletonCap || 0);
            const maxSkelCap = treeB.void_lord ? baseCap * 2 : baseCap;
            const activeSkels = game.units.filter(
                s => !s.dead && s.team === 'blue' && s.id === 'skeleton' && s.ownerNecroUid === u.uid
            ).length;
            if (activeSkels < maxSkelCap) {
                sfx.play('summon');
                const skel = spawnUnit('blue', 'skeleton', deadEnemy.x, deadEnemy.y, u.spec.rarityId);
                if (skel) {
                    skel.ownerNecroUid = u.uid;
                    spawnShockwave(deadEnemy.x, deadEnemy.y, 26, '#c084fc', 2.5);
                    spawnFloatingText(deadEnemy.x, deadEnemy.y - 12, '💀 CHIÊU HỒN!', '#e879f9', 11);
                }
                break;
            }
        }
    }
}

export class Projectile {
    constructor(opts) {
        this.team = opts.team;
        this.startX = opts.x;
        this.startY = opts.y;
        this.x = opts.x;
        this.y = opts.y;
        this.targetX = opts.targetX;
        this.targetY = opts.targetY;
        this.targetRef = opts.targetRef || null;
        this.speed = opts.speed || 250;
        this.damage = opts.damage || 25;
        this.splash = opts.splash || 0;
        this.arcHeight = opts.arcHeight || 0;
        this.auraType = opts.auraType || 'none';
        this.projType = opts.projType || 'shell';
        this.isRocket = !!opts.isRocket;
        this.owner = opts.owner || null;
        this.forceBurnDps = opts.forceBurnDps || 0;

        const totalDist = Math.max(10, Math.hypot(this.targetX - this.startX, this.targetY - this.startY));
        this.totalTime = totalDist / this.speed;
        this.elapsed = 0;
        this.angle = Math.atan2(this.targetY - this.startY, this.targetX - this.startX);
        this.smokeTimer = 0;
        this.done = false;
    }

    update(dt) {
        if (this.done) return;

        if (this.targetRef) {
            if (this.targetRef.isBoss && this.targetRef.ref && this.targetRef.ref.hp > 0) {
                this.targetX = this.targetRef.ref.x;
                this.targetY = this.targetRef.ref.y + 18;
            } else if (!this.targetRef.dead && !this.targetRef.isBase && !this.targetRef.isBoss) {
                this.targetX = this.targetRef.x;
                this.targetY = this.targetRef.y;
            }
        }

        this.elapsed += dt;
        const t = Math.min(1, this.elapsed / this.totalTime);

        const prevX = this.x;
        const prevY = this.y;

        const baseX = this.startX + (this.targetX - this.startX) * t;
        const baseY = this.startY + (this.targetY - this.startY) * t;
        const parabola = this.arcHeight > 0 ? Math.sin(t * Math.PI) * this.arcHeight : 0;

        this.x = baseX;
        this.y = baseY - parabola;
        this.angle = Math.atan2(this.y - prevY, this.x - prevX);

        if (
            this.isRocket ||
            this.projType === 'fireball' ||
            this.projType === 'meteor' ||
            this.projType === 'ice_shard' ||
            this.projType === 'dark_orb' ||
            this.projType === 'acid_glob' ||
            this.auraType === 'master_aqua' ||
            this.auraType === 'demon_abyss'
        ) {
            this.smokeTimer -= dt;
            if (this.smokeTimer <= 0) {
                let trailCol = 'rgba(226, 232, 240, 0.75)';
                if (this.projType === 'fireball' || this.projType === 'meteor') trailCol = '#f97316';
                else if (this.projType === 'ice_shard') trailCol = '#38bdf8';
                else if (this.projType === 'dark_orb') trailCol = '#a855f7';
                else if (this.projType === 'acid_glob') trailCol = '#4ade80';
                else if (this.auraType === 'demon_abyss') trailCol = '#d946ef';
                else if (this.auraType === 'master_aqua') trailCol = '#00f2fe';

                particlePool.spawn(
                    this.x - Math.cos(this.angle) * 6,
                    this.y - Math.sin(this.angle) * 6,
                    (Math.random() - 0.5) * 12,
                    (Math.random() - 0.5) * 12,
                    3.2,
                    trailCol,
                    2.6,
                    'circle'
                );
                this.smokeTimer = 0.028;
            }
        }

        if (t >= 1) {
            this.detonate();
        }
    }

    detonate() {
        this.done = true;
        const ownerSpec = this.owner?.spec || {};
        const hasNapalm = (ownerSpec.burnDps || 0) > 0 || this.forceBurnDps > 0;
        const hasChill = (ownerSpec.chillDuration || 0) > 0;
        const hasEmp = (ownerSpec.stunChance || 0) > 0 && Math.random() < ownerSpec.stunChance;
        const stunDur = ownerSpec.stunDuration || 1.2;

        if (this.splash > 0) {
            sfx.play('boom');
            spawnExplosionFX(
                this.targetX,
                this.targetY,
                this.splash,
                hasNapalm || this.auraType === 'demon_abyss',
                hasChill || hasEmp || this.auraType === 'master_aqua'
            );
            if (this.splash >= 38) addScreenShake(3.5, 0.14);

            for (const u of game.units) {
                if (u.dead || u.team === this.team) continue;
                const d = Math.hypot(u.x - this.targetX, u.y - this.targetY);
                if (d <= this.splash) {
                    const falloff = 1 - (d / this.splash) * 0.35;
                    applyDamageToTargetObject(u, this.damage * falloff, this.owner, true);
                    if (this.forceBurnDps > 0 && !u.dead) {
                        u.burnTimer = Math.max(u.burnTimer, 3.0);
                        u.burnDps = Math.max(u.burnDps, this.forceBurnDps);
                    }
                    if (hasEmp) {
                        u.applyStatusEffect('stun', stunDur);
                    }
                }
            }

            if (game.battleMode !== 'challenge' || this.team === 'red') {
                const enemyBaseObj = this.team === 'blue' ? game.enemyBase : game.playerBase;
                if (Math.hypot(enemyBaseObj.x - this.targetX, enemyBaseObj.y - this.targetY) <= this.splash + 26) {
                    damageBase(enemyBaseObj, this.damage * 0.85);
                }
            }
            if (
                this.team === 'blue' &&
                game.battleMode === 'raid_boss' &&
                game.raidBoss &&
                Math.hypot(game.raidBoss.x - this.targetX, game.raidBoss.y - this.targetY) <= this.splash + 42
            ) {
                damageRaidBoss(this.damage, this.targetX);
            }
        } else {
            const hitCol = this.projType === 'acid_glob'
                ? '#4ade80'
                : (this.auraType === 'demon_abyss' ? '#f0abfc' : (this.auraType === 'master_aqua' ? '#00f2fe' : '#fde047'));
            particlePool.spawn(this.targetX, this.targetY, 0, 0, 5, hitCol, 3.5, 'circle');
            if (this.targetRef) {
                applyDamageToTargetObject(this.targetRef, this.damage, this.owner, true);
            }
        }
    }

    draw(ctx) {
        if (this.done) return;
        const sprite = projCache.getProjectileSprite(
            this.angle,
            this.team === 'blue',
            this.isRocket,
            this.auraType,
            this.projType
        );
        if (sprite) {
            ctx.drawImage(sprite, this.x - sprite.width / 2, this.y - sprite.height / 2);
        }
    }
}

export function applyDamageToTargetObject(target, dmg, attacker = null, isRangedAttack = false) {
    if (!target) return;
    const ownerSpec = attacker?.spec || {};

    const hasThermalShock =
        attacker &&
        attacker.team === 'blue' &&
        game.activeSynergies.thermal_shock &&
        (attacker.id === 'pyromancer' || attacker.id === 'cryomancer');
    const bonusTrueDmg = hasThermalShock ? dmg * (BATTLE_SYNERGIES.thermal_shock.trueDmgBonusPct || 0.25) : 0;

    if (target.isBase && target.ref) {
        damageBase(target.ref, dmg + bonusTrueDmg);
    } else if (target.isBoss && target.ref) {
        damageRaidBoss(dmg + bonusTrueDmg, attacker?.x);
    } else if (typeof target.takeDamage === 'function') {
        target.takeDamage(dmg, attacker, isRangedAttack, false);
        if (bonusTrueDmg > 0 && !target.dead) {
            target.takeDamage(bonusTrueDmg, attacker, isRangedAttack, true);
        }
        if (ownerSpec.burnDps > 0 && !target.dead) {
            target.burnTimer = Math.max(target.burnTimer, ownerSpec.burnDuration || 3.0);
            target.burnDps = Math.max(target.burnDps, ownerSpec.burnDps);
        }
        if (ownerSpec.chillDuration > 0 && !target.dead) {
            target.applyStatusEffect('chill', ownerSpec.chillDuration, ownerSpec.chillSlowPct || 0.55);
        }
        if (ownerSpec.acidDuration > 0 && !target.dead) {
            target.applyStatusEffect('acid', ownerSpec.acidDuration);
        }
        if (ownerSpec.stunChance > 0 && !target.dead && Math.random() < ownerSpec.stunChance) {
            target.applyStatusEffect('stun', ownerSpec.stunDuration || 1.2);
        }
    }
}

// ============================================================================
// 7. Ụ PHÁO PHÒNG THỦ CĂN CỨ XANH & KỸ NĂNG ĐẶC BIỆT BÃO THIÊN THẠCH
// ============================================================================
export function updateBaseTurret(dt) {
    if (!game.playerBase || game.playerBase.hp <= 0) return;
    if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') return;

    const turretState = metaState?.baseTurret || { type: 'gatling', level: 1 };
    const cfg = BASE_TURRET_CONFIG[turretState.type] || BASE_TURRET_CONFIG.gatling;
    const lv = Math.max(1, Number(turretState.level) || 1);
    const lvMult = 1 + (lv - 1) * 0.15;
    const bastionLv = Number(metaState?.metaTalents?.immortal_bastion) || 0;
    const treeB = getAncientSkillTreeBonuses();
    const bastionDmgMult = 1 + bastionLv * 0.08 + (treeB.turretDmgPct || 0);
    const mapRangeMult = getActiveMapConfig().rangeMult || 1.0;

    const effDamage = Math.round(cfg.baseDamage * lvMult * bastionDmgMult);
    const effRange = Math.round(cfg.range * mapRangeMult);

    game.playerBase.turretTimer -= dt * cfg.fireRate;
    if (game.playerBase.turretTimer > 0) return;

    const bx = game.playerBase.x;
    const by = game.playerBase.y - 6;

    const redTargets = [];
    for (const u of game.units) {
        if (u.dead || u.team !== 'red') continue;
        const d = Math.hypot(u.x - bx, u.y - by);
        if (d <= effRange) {
            redTargets.push({ unit: u, dist: d });
        }
    }

    if (redTargets.length === 0) return;
    redTargets.sort((a, b) => a.dist - b.dist);

    const primary = redTargets[0].unit;
    game.playerBase.turretAngle = Math.atan2(primary.y - by, primary.x - bx);
    game.playerBase.turretTimer = 1.0;

    const muzzleX = bx + Math.cos(game.playerBase.turretAngle) * 16;
    const muzzleY = by + Math.sin(game.playerBase.turretAngle) * 16;

    if (cfg.id === 'sam_missile') {
        sfx.play('cannon');
        spawnMuzzleFlash(muzzleX, muzzleY, game.playerBase.turretAngle, 1.1);
        game.projectiles.push(
            new Projectile({
                team: 'blue',
                x: muzzleX,
                y: muzzleY,
                targetX: primary.x,
                targetY: primary.y,
                targetRef: primary,
                speed: 275,
                damage: effDamage,
                splash: cfg.splash || 44,
                arcHeight: 24,
                isRocket: true
            })
        );
    } else if (cfg.id === 'tesla_coil') {
        sfx.play('tesla');
        const chainList = redTargets.slice(0, cfg.chainTargets || 2).map(it => it.unit);
        let prevX = muzzleX;
        let prevY = muzzleY;
        chainList.forEach(tUnit => {
            game.beamEffects.push({
                x1: prevX,
                y1: prevY,
                x2: tUnit.x,
                y2: tUnit.y,
                color: '#c084fc',
                width: 3.4,
                ttl: 0.12
            });
            tUnit.takeDamage(effDamage, null, true, false);
            tUnit.applyStatusEffect('stun', cfg.stunDuration || 0.65);
            tUnit.applyStatusEffect('chill', cfg.chillDuration || 1.8, 0.55);
            particlePool.spawn(tUnit.x, tUnit.y, 0, 0, 4.5, '#00f2fe', 2.8, 'circle');
            prevX = tUnit.x;
            prevY = tUnit.y;
        });
    } else {
        sfx.play('beam');
        spawnMuzzleFlash(muzzleX, muzzleY, game.playerBase.turretAngle, 0.85);
        game.beamEffects.push({
            x1: muzzleX,
            y1: muzzleY,
            x2: primary.x,
            y2: primary.y,
            color: '#38bdf8',
            width: 2.6,
            ttl: 0.07
        });
        primary.takeDamage(effDamage, null, true, false);
    }
}

/**
 * Kỹ năng Đặc Biệt Mốc 10 Nhánh Hỏa Lực: Bão Thiên Thạch (Mỗi 14 giây gọi 3 thiên thạch)
 */
export function triggerMeteorStormSkill() {
    const redUnits = game.units.filter(u => u.team === 'red' && !u.dead);
    if (redUnits.length === 0 && (!game.raidBoss || game.raidBoss.hp <= 0)) return;

    sfx.play('airstrike');
    const meteorDmg = 320 + game.wave * 35 + game.currentLevel * 20;

    for (let i = 0; i < 3; i++) {
        let tx = LOGICAL_WIDTH / 2 + (i - 1) * 65;
        let ty = PLAYFIELD_HEIGHT * 0.42;

        if (redUnits.length > 0) {
            const targetUnit = redUnits[i % redUnits.length];
            tx = targetUnit.x + (Math.random() - 0.5) * 26;
            ty = targetUnit.y + (Math.random() - 0.5) * 26;
        } else if (game.raidBoss) {
            tx = game.raidBoss.x + (i - 1) * 32;
            ty = game.raidBoss.y + 15;
        }

        game.projectiles.push(
            new Projectile({
                team: 'blue',
                x: Math.max(20, Math.min(LOGICAL_WIDTH - 20, tx - 65)),
                y: Math.max(10, ty - 220),
                targetX: tx,
                targetY: ty,
                speed: 340,
                damage: meteorDmg,
                splash: 62,
                arcHeight: 15,
                projType: 'meteor',
                forceBurnDps: 45
            })
        );
    }
    spawnFloatingText(LOGICAL_WIDTH / 2, 132, '☄️ BÃO THIÊN THẠCH!', '#fb923c', 15);
}

export function damageBase(baseObj, rawDmg) {
    if (!baseObj || baseObj.hp <= 0 || game.gameOver) return;
    let dmg = Math.max(1, Math.round(rawDmg));
    baseObj.hitFlash = 0.15;

    // Khiên Phản Chấn Vĩnh Cửu của Căn Cứ Xanh hấp thụ sát thương trước
    if (baseObj === game.playerBase && (baseObj.shield || 0) > 0) {
        const absorbed = Math.min(baseObj.shield, dmg);
        baseObj.shield -= absorbed;
        dmg -= absorbed;
        if (dmg <= 0) {
            updateBaseHpHUD();
            return;
        }
    }

    baseObj.hp = Math.max(0, baseObj.hp - dmg);

    if (baseObj === game.enemyBase) {
        grantBattleExp(Math.max(1, Math.floor(dmg * 0.08)));
    }

    updateBaseHpHUD();

    if (baseObj === game.playerBase && baseObj.hp <= 0) {
        if (onEndBattleCallback) onEndBattleCallback(false);
    } else if (baseObj === game.enemyBase && baseObj.hp <= 0) {
        if (game.battleMode === 'destroy' || game.battleMode === 'fog_of_war' || game.battleMode === 'auto_battler') {
            if (onEndBattleCallback) onEndBattleCallback(true);
        }
    }
}

export function spawnUnit(team, unitId, prefX, prefY, customRarityId = null, exactPref = false) {
    const spec = getEffectiveUnitStats(unitId, team, customRarityId);
    const validPt = nav.findValidSpawnPoint(team, spec, prefX, prefY, exactPref);
    const u = new Unit(team, unitId, validPt.x, validPt.y, customRarityId);
    game.units.push(u);

    if (team === 'blue' && !spec.isSummonedSkeleton) {
        game.matchSpawns++;
        if (metaState?.missionsProgress) {
            metaState.missionsProgress.spawns = (metaState.missionsProgress.spawns || 0) + 1;
        }
    }
    return u;
}

export function spawnZombie(zombieId, prefX, prefY) {
    const zSpec = ZOMBIE_BY_ID[zombieId] || ZOMBIE_CATALOG[0];
    const x = Math.max(30, Math.min(LOGICAL_WIDTH - 30, prefX));
    const y = Math.max(24, Math.min(TD_GRID_TOP_Y + 8, prefY));
    const z = new Unit('red', zSpec.id, x, y);
    game.units.push(z);
    return z;
}

export function launchAirstrike(team, targetY) {
    sfx.play('airstrike');
    let sumMult = 0;
    let countUnits = 0;
    const activeIds = (game.deckIds || []).filter(id => id && id !== 'airstrike' && UNIT_BY_ID[id]);
    activeIds.forEach(uId => {
        const sp = getEffectiveUnitStats(uId, team);
        const baseSp = UNIT_BY_ID[uId];
        if (sp && baseSp && baseSp.damage > 0) {
            sumMult += sp.damage / baseSp.damage;
            countUnits++;
        }
    });
    const avgScale = countUnits > 0 ? Math.max(1.0, sumMult / countUnits) : 1.0;
    const dmg = Math.round(95 * avgScale);

    game.airstrikes.push({
        team,
        x: -60,
        y: targetY,
        speed: 440,
        damage: dmg,
        droppedBombs: [false, false, false, false],
        done: false
    });
}

// ============================================================================
// 8. HỆ THỐNG TÍCH LŨY CẤP ĐỘ TRẬN, NÚT NỔI LEVEL UP (+N) & CHUỖI NÂNG CẤP LIÊN TIẾP
// ============================================================================
export function updateFloatingLevelUpButtonUI() {
    const btn = document.getElementById('btn-battle-levelup-notify');
    const badge = document.getElementById('battle-levelup-badge');
    if (!btn) return;

    const count = Math.max(0, Math.floor(Number(game.pendingLevelUps) || 0));
    if (count > 0 && game.running && !game.gameOver) {
        btn.classList.remove('hidden');
        if (badge) badge.textContent = `+${count}`;
    } else {
        btn.classList.add('hidden');
    }
}

export function grantBattleExp(rawAmount) {
    if (!game.running || game.gameOver) return;
    if (game.battleMode === 'auto_battler') return;

    const treeB = getAncientSkillTreeBonuses();
    const expMult = 1 + (treeB.expGainPct || 0);
    game.battleExp += Math.max(1, Math.round(rawAmount * expMult));

    let leveledUpCount = 0;
    while (game.battleExp >= game.battleNextExp) {
        game.battleExp -= game.battleNextExp;
        game.battleLv++;
        game.battleNextExp = Math.round(35 + game.battleLv * 18);
        game.pendingLevelUps = (game.pendingLevelUps || 0) + 1;
        leveledUpCount++;
    }

    if (leveledUpCount > 0) {
        sfx.play('levelup');
        triggerHaptic(20);
        spawnFloatingText(
            62,
            135,
            `⬆️ ĐẠT BATTLE LV.${game.battleLv} (+${game.pendingLevelUps} NÂNG CẤP)!`,
            '#fde047',
            13
        );
        updateFloatingLevelUpButtonUI();

        // Nếu đang bật AUTO-PLAY thì tự động nâng cấp luôn
        if (game.autoPlay) {
            while (game.pendingLevelUps > 0) {
                game.pendingLevelUps--;
                const rollCount = game.battleMode === 'challenge' ? CHALLENGE_DECK_SLOTS : 3;
                const cands = generateRollCandidates(rollCount);
                if (cands[0]) applyRolledUnitSelection(cands[0].id);
            }
            updateFloatingLevelUpButtonUI();
        }
    }
}

function generateRollCandidates(count) {
    const ownedPool = UNIT_CATALOG.filter(u => hasUnitInInventory(u.id));
    const sourcePool = ownedPool.length >= count ? ownedPool : UNIT_CATALOG;
    const shuffled = [...sourcePool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

export function executeDraftReroll() {
    if (!game.isRollModalOpen || game.rerollsLeft <= 0) {
        sfx.play('cannon');
        return;
    }
    game.rerollsLeft--;
    sfx.play('blitz');
    triggerHaptic(20);
    const rollCount = game.battleMode === 'challenge' ? CHALLENGE_DECK_SLOTS : 3;
    game.currentRollCandidates = generateRollCandidates(rollCount);
    renderBattleRollModal();
}

/**
 * Người chơi chủ động bấm nút LEVEL UP (+N) bên trái để nâng một thể liên tiếp các cấp tích lũy
 */
export function openBattleLevelUpChain() {
    if (!game.running || game.gameOver || game.pendingLevelUps <= 0) return;

    // Tích dồn từ 3 cấp trở lên tặng thêm +1 lượt Reroll miễn phí
    if (game.pendingLevelUps >= 3) {
        game.rerollsLeft += 1;
    }

    game.paused = true;
    game.isRollModalOpen = true;
    sfx.play('upgrade');
    triggerHaptic(25);

    const rollCount = game.battleMode === 'challenge' ? CHALLENGE_DECK_SLOTS : 3;
    game.currentRollCandidates = generateRollCandidates(rollCount);
    renderBattleRollModal();
}

function applyRolledUnitSelection(unitId) {
    const normId = normalizeUnitId(unitId);
    const maxUnitSlots = game.battleMode === 'challenge' ? CHALLENGE_DECK_SLOTS : 4;
    const existingIdx = game.deckIds.slice(0, maxUnitSlots).indexOf(normId);

    if (existingIdx >= 0) {
        game.battleUnitStars[normId] = (game.battleUnitStars[normId] || 1) + 1;
        if (game.battleMode === 'challenge') {
            for (const u of game.units) {
                if (!u.dead && u.team === 'blue' && u.id === normId) {
                    const newSpec = getEffectiveUnitStats(normId, 'blue');
                    const hpRatio = u.hp / Math.max(1, u.maxHp);
                    u.spec = newSpec;
                    u.maxHp = newSpec.maxHp;
                    u.hp = Math.round(newSpec.maxHp * hpRatio);
                }
            }
        }
        spawnFloatingText(
            LOGICAL_WIDTH / 2,
            PLAYFIELD_HEIGHT / 2,
            `⭐ ${UNIT_BY_ID[normId]?.name.toUpperCase()} LÊN ${game.battleUnitStars[normId]} SAO!`,
            '#fde047',
            15
        );
    } else {
        let emptyIdx = -1;
        for (let i = 0; i < maxUnitSlots; i++) {
            if (!game.deckIds[i]) {
                emptyIdx = i;
                break;
            }
        }
        if (emptyIdx >= 0) {
            game.deckIds[emptyIdx] = normId;
            game.battleUnitStars[normId] = 1;
            spawnFloatingText(
                LOGICAL_WIDTH / 2,
                PLAYFIELD_HEIGHT / 2,
                `🎖️ CHIÊU MỘ: ${UNIT_BY_ID[normId]?.name.toUpperCase()}!`,
                '#4ade80',
                15
            );
        } else {
            game.deckIds[0] = normId;
            game.battleUnitStars[normId] = 1;
            spawnFloatingText(
                LOGICAL_WIDTH / 2,
                PLAYFIELD_HEIGHT / 2,
                `🔄 ĐỔI Ô 1 ➔ ${UNIT_BY_ID[normId]?.name.toUpperCase()}!`,
                '#38bdf8',
                14
            );
        }
    }

    if (typeof onDeckChangedCallback === 'function') {
        onDeckChangedCallback();
    }
}

export function renderBattleRollModal() {
    const draftModal = document.getElementById('draft-modal');
    const badgeEl = document.getElementById('draft-badge-text');
    const queuePillEl = document.getElementById('draft-queue-pill');
    const titleEl = document.getElementById('draft-title');
    const subEl = document.getElementById('draft-subtitle');
    const rerollBtn = document.getElementById('btn-draft-reroll');
    const container = document.getElementById('draft-cards-container');
    if (!draftModal || !container) return;

    const isChallenge = game.battleMode === 'challenge';
    const maxUnitSlots = isChallenge ? CHALLENGE_DECK_SLOTS : 4;

    if (badgeEl) badgeEl.textContent = `BATTLE LV.${game.battleLv}`;
    if (queuePillEl) {
        if (game.pendingLevelUps > 1) {
            queuePillEl.classList.remove('hidden');
            queuePillEl.textContent = `Còn ${game.pendingLevelUps} lượt nâng cấp`;
        } else {
            queuePillEl.classList.add('hidden');
        }
    }
    if (titleEl) titleEl.textContent = isChallenge ? 'ROLL 6 TOWER PHÒNG THỦ' : 'CHỌN CHI VIỆN QUÂN ĐỘI';
    if (subEl) subEl.textContent = 'Chọn 1 đơn vị để thêm vào Deck hoặc tăng Sao (+22% HP & DMG)';

    if (rerollBtn) {
        rerollBtn.style.display = 'inline-flex';
        rerollBtn.textContent = `🎲 REROLL (${game.rerollsLeft})`;
        rerollBtn.disabled = game.rerollsLeft <= 0;
        rerollBtn.onclick = () => executeDraftReroll();
    }

    container.className = `draft-cards-grid${isChallenge ? ' six-cards' : ''}`;
    container.innerHTML = '';

    game.currentRollCandidates.forEach(u => {
        const sp = getEffectiveUnitStats(u.id, 'blue');
        const rCfg = RARITY_CONFIG[sp.rarityId] || RARITY_CONFIG.common;
        const spriteUrl = getUnitSpriteDataURL(u, 'blue');
        const inDeck = game.deckIds.slice(0, maxUnitSlots).includes(u.id);
        const curStars = game.battleUnitStars[u.id] || 1;

        const card = document.createElement('div');
        card.className = 'draft-card';
        card.innerHTML = `
            <span class="draft-card-tag">${inDeck ? `⭐ LÊN ${curStars + 1} SAO` : '+ MỚI VÀO DECK'}</span>
            <img src="${spriteUrl}" class="w-11 h-11 pixel-art my-1" alt="${u.name}" />
            <div style="font-size:11px; font-weight:900; color:#ffffff; line-height:1.1;">${u.name}</div>
            <div style="font-size:9px; font-weight:800; color:${rCfg.color};">${rCfg.name} • ${sp.cost}⛽</div>
            <div style="font-size:8.5px; color:#94a3b8; line-height:1.15;">DMG: ${sp.damage} | HP: ${sp.hp}</div>
        `;
        card.addEventListener('click', () => {
            triggerHaptic(20);
            sfx.play('upgrade');
            applyRolledUnitSelection(u.id);

            game.pendingLevelUps = Math.max(0, (game.pendingLevelUps || 1) - 1);
            updateFloatingLevelUpButtonUI();

            if (game.pendingLevelUps > 0) {
                // Roll ngay lượt nâng cấp tiếp theo trong chuỗi
                const nextRollCount = isChallenge ? CHALLENGE_DECK_SLOTS : 3;
                game.currentRollCandidates = generateRollCandidates(nextRollCount);
                renderBattleRollModal();
            } else {
                game.isRollModalOpen = false;
                game.paused = false;
                draftModal.classList.remove('active');
            }
        });
        container.appendChild(card);
    });

    draftModal.classList.add('active');
}

// ============================================================================
// 9. HỆ THỐNG KỸ NĂNG CHỈ HUY (Q/W/E/R)
// ============================================================================
const SKILL_ALIAS_MAP = {
    airdrop: 'airdrop',
    mines: 'minefield',
    landmines: 'minefield',
    minefield: 'minefield',
    emp: 'emp_blast',
    emp_blast: 'emp_blast',
    blitz: 'blitzkrieg',
    blitzkrieg: 'blitzkrieg'
};

export function updateCommanderSkillsUI() {
    const pairs = [
        { btnId: 'tactic-btn-airdrop', cdId: 'tactic-cd-airdrop', key: 'airdrop' },
        { btnId: 'tactic-btn-mines',   cdId: 'tactic-cd-mines',   key: 'minefield' },
        { btnId: 'tactic-btn-emp',     cdId: 'tactic-cd-emp',     key: 'emp_blast' },
        { btnId: 'tactic-btn-blitz',   cdId: 'tactic-cd-blitz',   key: 'blitzkrieg' }
    ];

    pairs.forEach(({ btnId, cdId, key }) => {
        const btn = document.getElementById(btnId);
        const cdOverlay = document.getElementById(cdId);
        const cd = game.tacticCooldowns[key] || 0;
        const maxCd = game.tacticMaxCooldowns[key] || 16;

        if (!btn || !cdOverlay) return;
        if (cd > 0.05) {
            btn.classList.add('on-cooldown');
            cdOverlay.classList.remove('hidden');
            const deg = Math.round((cd / maxCd) * 360);
            cdOverlay.style.setProperty('--cd-deg', `${deg}deg`);
            const txt = cdOverlay.querySelector('.tactic-cd-timer, .tactic-cd-text') || cdOverlay;
            txt.textContent = `${Math.ceil(cd)}s`;
        } else {
            btn.classList.remove('on-cooldown');
            cdOverlay.classList.add('hidden');
        }
    });
}

export function triggerCommanderSkill(rawSkillKey, targetX = null, targetY = null) {
    if (!game.running || game.paused || game.gameOver) return;
    if (game.battleMode === 'auto_battler' && game.autoBattlerPhase === 'prep') return;

    const skillKey = SKILL_ALIAS_MAP[rawSkillKey] || rawSkillKey;
    if (!skillKey || game.tacticCooldowns[skillKey] > 0) return;

    const logiLv = Number(metaState?.metaTalents?.optimal_logistics) || 0;
    const treeB = getAncientSkillTreeBonuses();
    const cdReduction = Math.min(0.65, logiLv * 0.03 + (treeB.tacticCdPct || 0));
    const baseCd = game.tacticMaxCooldowns[skillKey] || 16;
    game.tacticCooldowns[skillKey] = Math.max(4, baseCd * (1 - cdReduction));

    triggerHaptic(25);

    if (skillKey === 'airdrop') {
        sfx.play('spawn');
        const dropX = targetX ?? (game.rallyPoint.active ? game.rallyPoint.x : LOGICAL_WIDTH / 2);
        const dropY = targetY ?? (game.rallyPoint.active ? game.rallyPoint.y : Math.max(190, PLAYFIELD_HEIGHT * 0.52));
        const healRatio = (COMMANDER_TACTICS.airdrop?.healRatio ?? 0.40) * (1 + (treeB.healBonusPct || 0));
        const buffDur = COMMANDER_TACTICS.airdrop?.buffDuration ?? 6.0;

        for (const u of game.units) {
            if (u.team === 'blue' && !u.dead) {
                u.hp = Math.min(u.maxHp, Math.round(u.hp + u.maxHp * healRatio));
                u.airdropBuffTimer = buffDur;
            }
        }

        if (game.battleMode !== 'challenge') {
            const specs = COMMANDER_TACTICS.airdrop?.paratroopUnits || ['infantry', 'bazooka', 'infantry'];
            specs.forEach((uId, idx) => {
                const dx = Math.max(48, Math.min(LOGICAL_WIDTH - 48, dropX + (idx - 1) * 42));
                game.paratroops.push({
                    unitId: uId,
                    x: dx,
                    targetY: dropY + (idx % 2 === 0 ? 10 : -10),
                    y: Math.max(40, dropY - 110),
                    done: false
                });
            });
        }
        spawnFloatingText(dropX, dropY - 28, '🪂 CHI VIỆN DÙ [Q] & HỒI HP!', '#4ade80', 14);
    } else if (skillKey === 'minefield') {
        sfx.play('upgrade');
        const rowY = targetY ?? PLAYFIELD_HEIGHT * 0.55;
        const mineCount = COMMANDER_TACTICS.landmines?.mineCount ?? 5;
        const mineDmg = COMMANDER_TACTICS.landmines?.mineDamage ?? 240;
        const mineSplash = COMMANDER_TACTICS.landmines?.mineSplash ?? 54;

        for (let i = 0; i < mineCount; i++) {
            const mx = 70 + i * 70;
            const validPt = game.battleMode === 'challenge'
                ? { x: mx, y: rowY }
                : nav.findValidSpawnPoint('blue', UNIT_BY_ID.infantry, mx, rowY);
            game.landmines.push({
                x: validPt.x,
                y: validPt.y,
                radius: 11,
                splash: mineSplash,
                damage: mineDmg,
                blinkTimer: Math.random(),
                exploded: false
            });
        }
        spawnFloatingText(LOGICAL_WIDTH / 2, rowY - 20, '💣 BÃI MÌN CHỐNG TĂNG [W]!', '#f97316', 14);
    } else if (skillKey === 'emp_blast') {
        sfx.play('emp');
        addScreenShake(6, 0.28);
        const empX = targetX ?? LOGICAL_WIDTH / 2;
        const empY = targetY ?? PLAYFIELD_HEIGHT * 0.42;
        const mapCfg = getActiveMapConfig();
        const extraStun = mapCfg.empExtraStunSec || 0;
        const stunDur = ((COMMANDER_TACTICS.emp?.stunDuration ?? 4.0) + extraStun) * (1 + (treeB.ccDurationPct || 0));
        const empDmg = COMMANDER_TACTICS.emp?.empDamage ?? 48;
        const bossEmpDmg = COMMANDER_TACTICS.emp?.bossEmpDamage ?? 180;

        spawnShockwave(empX, empY, 240, '#38bdf8', 5);

        for (const u of game.units) {
            if (u.team === 'red' && !u.dead) {
                u.applyStatusEffect('stun', stunDur);
                u.takeDamage(empDmg);
            }
        }
        if (game.raidBoss && game.raidBoss.hp > 0) {
            game.raidBoss.stunTimer = 3.0 + extraStun * 0.5;
            damageRaidBoss(bossEmpDmg, empX);
        }
        spawnFloatingText(empX, empY, `⚡ XUNG ĐIỆN EMP [E] (TÊ LIỆT ${stunDur.toFixed(1)}S)!`, '#38bdf8', 15);
    } else if (skillKey === 'blitzkrieg') {
        sfx.play('blitz');
        game.blitzkriegTimer = COMMANDER_TACTICS.blitzkrieg?.duration ?? 6.0;
        spawnShockwave(game.playerBase.x, game.playerBase.y, 180, '#fde047', 4.5);
        spawnFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT * 0.68, '🚀 BLITZKRIEG THẦN TỐC [R] (6S)!', '#fde047', 15);
    }

    updateCommanderSkillsUI();
}

// ============================================================================
// 10. CÁC CHẾ ĐỘ ĐẶC BIỆT: RAID BOSS, FOG OF WAR & ENDLESS MUTATIONS
// ============================================================================
export function showBossWarningBanner(titleText, subText) {
    const banner = document.getElementById('boss-warning-banner');
    if (!banner) return;
    const tEl = document.getElementById('boss-alert-title');
    const sEl = document.getElementById('boss-alert-sub');
    if (tEl && titleText) tEl.textContent = titleText;
    if (sEl && subText) sEl.textContent = subText;
    banner.classList.remove('hidden');
    setTimeout(() => {
        banner.classList.add('hidden');
    }, 3200);
}

export function initRaidBoss() {
    const diffMult = DIFFICULTY_CONFIG[game.difficulty]?.statMult || 1.2;
    const maxHp = Math.round((6200 + game.currentLevel * 460) * diffMult);
    const partMax = Math.round(maxHp * 0.35);

    game.raidBoss = {
        name: RAID_BOSS_CONFIG.name || 'PHÁO ĐÀI HẠM LEVIATHAN MK-IX',
        x: LOGICAL_WIDTH / 2,
        y: 82,
        vx: 36,
        hp: maxHp,
        maxHp,
        parts: {
            cannon: { hp: partMax, maxHp: partMax, destroyed: false },
            sam: { hp: partMax, maxHp: partMax, destroyed: false },
            engine: { hp: partMax, maxHp: partMax, destroyed: false }
        },
        phase: 1,
        skillTimer: 4.5,
        turretTimer: 1.1,
        stunTimer: 0,
        hitFlash: 0,
        laserSweepAngle: 0,
        laserSweepTimer: 0
    };
    game.enemyBase.hp = maxHp;
    game.enemyBase.maxHp = maxHp;
    updateRaidBossHUD();
    updateBaseHpHUD();
    showBossWarningBanner('PHÁO ĐÀI LEVIATHAN MK-IX!', 'Hủy diệt 3 bộ phận Pháo Chính, Phòng Không & Động Cơ!');
}

export function updateRaidBossHUD() {
    const hud = document.getElementById('raid-boss-hud');
    const boss = game.raidBoss;
    if (!hud) return;

    if (game.battleMode !== 'raid_boss' || !boss) {
        hud.classList.add('hidden');
        hud.classList.remove('active');
        return;
    }

    hud.classList.remove('hidden');
    hud.classList.add('active');

    const totalHpEl = document.getElementById('raid-boss-total-hp');
    if (totalHpEl) totalHpEl.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;

    const mainFillEl = document.getElementById('raid-boss-main-bar-fill');
    if (mainFillEl) {
        mainFillEl.style.width = `${Math.max(0, Math.round((boss.hp / boss.maxHp) * 100))}%`;
    }

    ['cannon', 'sam', 'engine'].forEach(key => {
        const part = boss.parts[key];
        const cardEl = document.getElementById(`boss-part-${key}`);
        const hpTextEl = document.getElementById(`boss-part-${key}-hp`);
        const barEl = document.getElementById(`boss-part-${key}-bar`);
        const pct = Math.max(0, Math.round((part.hp / part.maxHp) * 100));

        if (cardEl) cardEl.classList.toggle('part-destroyed', part.destroyed);
        if (hpTextEl) hpTextEl.textContent = part.destroyed ? 'HỎNG' : `${pct}%`;
        if (barEl) barEl.style.width = `${pct}%`;
    });
}

export function damageRaidBoss(rawDmg, hitX = null) {
    const boss = game.raidBoss;
    if (!boss || boss.hp <= 0 || game.gameOver) return;
    const dmg = Math.max(1, Math.round(rawDmg));
    boss.hp = Math.max(0, boss.hp - dmg);
    boss.hitFlash = 0.12;
    game.enemyBase.hp = boss.hp;
    updateBaseHpHUD();

    let partKey = 'engine';
    if (hitX !== null) {
        if (hitX < boss.x - 15) partKey = 'cannon';
        else if (hitX > boss.x + 15) partKey = 'sam';
    }
    const targetPart = boss.parts[partKey] && !boss.parts[partKey].destroyed
        ? boss.parts[partKey]
        : Object.values(boss.parts).find(p => !p.destroyed);

    if (targetPart) {
        targetPart.hp = Math.max(0, targetPart.hp - dmg * 0.85);
        if (targetPart.hp <= 0 && !targetPart.destroyed) {
            targetPart.destroyed = true;
            sfx.play('boom');
            addScreenShake(6, 0.3);
            spawnExplosionFX(boss.x, boss.y, 65, true, false);
            spawnFloatingText(boss.x, boss.y + 36, '💥 ĐÃ PHÁ HỦY BỘ PHẬN BOSS!', '#fde047', 14);
        }
    }

    const hpRatio = boss.hp / boss.maxHp;
    if (hpRatio <= 0.65 && boss.phase === 1) {
        boss.phase = 2;
        sfx.play('boom');
        addScreenShake(7, 0.35);
        spawnShockwave(boss.x, boss.y, 180, '#f97316', 5);
        spawnFloatingText(boss.x, boss.y + 45, 'GIAI ĐOẠN 2: MƯA TÊN LỬA!', '#f97316', 16);
    } else if (hpRatio <= 0.30 && boss.phase === 2) {
        boss.phase = 3;
        sfx.play('emp');
        addScreenShake(9, 0.45);
        spawnShockwave(boss.x, boss.y, 240, '#ef4444', 6);
        spawnFloatingText(boss.x, boss.y + 45, 'GIAI ĐOẠN CUỐI: TIA HỦY DIỆT!', '#ef4444', 17);
    }

    updateRaidBossHUD();

    if (boss.hp <= 0) {
        spawnExplosionFX(boss.x, boss.y, 95, true, false);
        addScreenShake(12, 0.6);
        if (onEndBattleCallback) onEndBattleCallback(true);
    }
}

export function updateRaidBoss(dt) {
    const boss = game.raidBoss;
    if (!boss || boss.hp <= 0) return;

    if (boss.hitFlash > 0) boss.hitFlash = Math.max(0, boss.hitFlash - dt);
    if (boss.stunTimer > 0) {
        boss.stunTimer -= dt;
        return;
    }

    const engineMult = boss.parts.engine.destroyed ? 0.35 : 1.0;
    boss.x += boss.vx * (boss.phase === 3 ? 1.45 : 1.0) * engineMult * dt;
    if (boss.x > LOGICAL_WIDTH - 85) {
        boss.x = LOGICAL_WIDTH - 85;
        boss.vx = -Math.abs(boss.vx);
    } else if (boss.x < 85) {
        boss.x = 85;
        boss.vx = Math.abs(boss.vx);
    }

    const cannonMult = boss.parts.cannon.destroyed ? 0.45 : 1.0;
    boss.turretTimer -= dt * (boss.phase >= 2 ? 1.35 : 1.0) * cannonMult;
    if (boss.turretTimer <= 0) {
        boss.turretTimer = 1.25;
        const targets = game.units.filter(u => u.team === 'blue' && !u.dead);
        if (targets.length > 0) {
            const t = targets[Math.floor(Math.random() * targets.length)];
            [-26, 26].forEach(offsetX => {
                game.projectiles.push(
                    new Projectile({
                        team: 'red',
                        x: boss.x + offsetX,
                        y: boss.y + 24,
                        targetX: t.x,
                        targetY: t.y,
                        targetRef: t,
                        speed: 240,
                        damage: 32 * boss.phase,
                        splash: 28,
                        arcHeight: 16,
                        isRocket: true
                    })
                );
            });
            sfx.play('cannon');
        }
    }

    boss.skillTimer -= dt;
    if (boss.skillTimer <= 0) {
        boss.skillTimer = boss.phase === 3 ? 5.5 : 7.5;
        if (boss.phase === 1) {
            spawnUnit('red', 'tank', boss.x - 45, boss.y + 48);
            spawnUnit('red', 'tank', boss.x + 45, boss.y + 48);
            spawnFloatingText(boss.x, boss.y + 52, 'TRIỆU HỒI THIẾT GIÁP!', '#fb7185', 13);
        } else if (boss.phase === 2 && !boss.parts.sam.destroyed) {
            sfx.play('airstrike');
            for (let i = 0; i < 4; i++) {
                const tx = 65 + Math.random() * (LOGICAL_WIDTH - 130);
                const ty = 240 + Math.random() * (PLAYFIELD_HEIGHT - 340);
                game.projectiles.push(
                    new Projectile({
                        team: 'red',
                        x: boss.x,
                        y: boss.y,
                        targetX: tx,
                        targetY: ty,
                        speed: 195,
                        damage: 65,
                        splash: 48,
                        arcHeight: 55,
                        isRocket: true
                    })
                );
            }
            spawnFloatingText(boss.x, boss.y + 52, 'MƯA TÊN LỬA PHÒNG KHÔNG!', '#f97316', 14);
        } else {
            boss.laserSweepTimer = 1.6;
            spawnUnit('red', 'heavy_tank', boss.x, boss.y + 52);
            sfx.play('emp');
            spawnFloatingText(boss.x, boss.y + 52, 'TIA LASER HỦY DIỆT!', '#ef4444', 15);
        }
    }

    if (boss.laserSweepTimer > 0) {
        boss.laserSweepTimer -= dt;
        boss.laserSweepAngle = Math.sin(game.timeSec * 5) * 0.65 + Math.PI / 2;
        const endX = boss.x + Math.cos(boss.laserSweepAngle) * 420;
        const endY = boss.y + Math.sin(boss.laserSweepAngle) * 420;

        for (const u of game.units) {
            if (u.team === 'blue' && !u.dead) {
                const distToSegment = pointToSegmentDistance(u.x, u.y, boss.x, boss.y, endX, endY);
                if (distToSegment <= u.radius + 14) {
                    u.takeDamage(60 * dt, null, true, false);
                }
            }
        }
    }
}

export function drawRaidBoss(ctx) {
    const boss = game.raidBoss;
    if (!boss || boss.hp <= 0) return;

    ctx.save();
    ctx.translate(boss.x, boss.y);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.roundRect(-52 + 6, -30 + 6, 104, 64, 14);
    ctx.fill();

    ctx.fillStyle = boss.hitFlash > 0 ? '#ffffff' : (boss.phase === 3 ? '#7f1d1d' : '#1e293b');
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(-52, -30, 104, 64, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = boss.phase === 3 ? '#ef4444' : '#dc2626';
    ctx.fillRect(-44, -22, 88, 46);

    ctx.fillStyle = boss.phase === 3 ? '#fde047' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, 0, 14 + Math.sin(game.timeSec * 8) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = boss.parts.cannon.destroyed ? '#1e293b' : '#475569';
    ctx.fillRect(-34, 18, 12, 22);
    ctx.fillStyle = boss.parts.sam.destroyed ? '#1e293b' : '#475569';
    ctx.fillRect(22, 18, 12, 22);

    if (boss.laserSweepTimer > 0) {
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(boss.x, boss.y);
        ctx.lineTo(
            boss.x + Math.cos(boss.laserSweepAngle) * 420,
            boss.y + Math.sin(boss.laserSweepAngle) * 420
        );
        ctx.stroke();

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    ctx.restore();
}

let fogOffscreenCanvas = null;

export function renderFogOfWarOverlay(ctx) {
    if (game.battleMode !== 'fog_of_war') return;

    if (!fogOffscreenCanvas) {
        fogOffscreenCanvas = document.createElement('canvas');
        fogOffscreenCanvas.width = LOGICAL_WIDTH;
        fogOffscreenCanvas.height = PLAYFIELD_HEIGHT;
    }
    const fCtx = fogOffscreenCanvas.getContext('2d');
    fCtx.clearRect(0, 0, LOGICAL_WIDTH, PLAYFIELD_HEIGHT);

    fCtx.fillStyle = 'rgba(6, 11, 25, 0.88)';
    fCtx.fillRect(0, 0, LOGICAL_WIDTH, PLAYFIELD_HEIGHT);

    fCtx.globalCompositeOperation = 'destination-out';

    const punchVisionHole = (x, y, radius) => {
        const grad = fCtx.createRadialGradient(x, y, radius * 0.25, x, y, radius);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.85)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        fCtx.fillStyle = grad;
        fCtx.beginPath();
        fCtx.arc(x, y, radius, 0, Math.PI * 2);
        fCtx.fill();
    };

    punchVisionHole(game.playerBase.x, game.playerBase.y, 155);

    for (const u of game.units) {
        if (u.team === 'blue' && !u.dead) {
            punchVisionHole(u.x, u.y, u.spec.visionCone || 145);
        }
    }

    for (const m of game.landmines) {
        if (!m.exploded) punchVisionHole(m.x, m.y, 65);
    }
    for (const sw of game.shockwaves) {
        punchVisionHole(sw.x, sw.y, sw.maxRadius * 1.4);
    }

    fCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(fogOffscreenCanvas, 0, 0);
}

export function triggerRoguelikeMutationDraft() {
    const shuffled = [...ROGUELIKE_MUTATIONS].sort(() => Math.random() - 0.5).slice(0, 3);
    if (shuffled.length === 0) return;

    if (game.autoPlay) {
        const picked = shuffled[0];
        game.activeMutations.push(picked.id);
        sfx.play('upgrade');
        spawnFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT / 2, `🤖 AUTO ĐỘT BIẾN: ${picked.name}!`, '#fde047', 15);
        return;
    }

    game.paused = true;
    game.awaitingMutationChoice = true;

    const draftModal = document.getElementById('draft-modal');
    const badgeEl = document.getElementById('draft-badge-text');
    const queuePillEl = document.getElementById('draft-queue-pill');
    const titleEl = document.getElementById('draft-title');
    const subEl = document.getElementById('draft-subtitle');
    const rerollBtn = document.getElementById('btn-draft-reroll');
    const container = document.getElementById('draft-cards-container');

    if (rerollBtn) rerollBtn.style.display = 'none';
    if (queuePillEl) queuePillEl.classList.add('hidden');

    if (draftModal && container) {
        if (badgeEl) badgeEl.textContent = `ĐỘT BIẾN WAVE ${game.wave}`;
        if (titleEl) titleEl.textContent = 'CHỌN NÂNG CẤP ROGUELIKE';
        if (subEl) subEl.textContent = 'Chọn 1 trong 3 công nghệ đột biến cộng dồn vĩnh viễn trong trận này';
        container.className = 'draft-cards-grid';
        container.innerHTML = '';

        shuffled.forEach(item => {
            const card = document.createElement('div');
            card.className = 'draft-card mutation-roguelike-card';
            card.innerHTML = `
                <span class="draft-card-tag">MUTATION</span>
                <div style="font-size:32px; margin:8px 0;">${item.icon || '⚡'}</div>
                <div style="font-size:12px; font-weight:900; color:#fde047;">${item.name}</div>
                <div class="mutation-buff-line">${item.desc}</div>
            `;
            card.addEventListener('click', () => {
                triggerHaptic(20);
                sfx.play('upgrade');
                game.activeMutations.push(item.id);
                game.awaitingMutationChoice = false;
                game.paused = false;
                draftModal.classList.remove('active');
                spawnFloatingText(LOGICAL_WIDTH / 2, PLAYFIELD_HEIGHT / 2, `ĐÃ NHẬN: ${item.name}!`, '#fde047', 15);
            });
            container.appendChild(card);
        });

        draftModal.classList.add('active');
    } else {
        game.activeMutations.push(shuffled[0].id);
        game.awaitingMutationChoice = false;
        game.paused = false;
    }
}