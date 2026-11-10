// ============================================================================
// LOBBY.JS - TOÀN BỘ LOGIC META-GAME, GIAO DIỆN SẢNH CHỜ & HỆ THỐNG COMMANDER
// Đã fix đồng bộ 100% DOM ID, Map Preview, Giftcode HUNGDEPTRAI, Auto-Merge,
// Cây Kỹ Năng Bị Động (Meta-Talents), Khe Chip Bổ Trợ & 4 Chế Độ Chơi Mới.
// ============================================================================

import {
    STORAGE_KEY,
    ADMIN_PASSWORD,
    RARITY_ORDER,
    RARITY_CONFIG,
    DIFFICULTY_ORDER,
    BATTLE_MODE_ORDER,
    DIFFICULTY_CONFIG,
    BATTLE_MODE_CONFIG,
    calcStageRewardCoins,
    OFFICIAL_GIFTCODES,
    GIFTCODE_REWARD_GEMS,
    GIFTCODE_REWARD_COINS,
    GIFT_CODES,
    MISSIONS_CATALOG,
    LEVELS,
    UNIT_CATALOG,
    UNIT_BY_ID,
    META_TALENTS,
    UNIT_CHIPS
} from './data.js';

// Các tham chiếu được inject từ main.js để tránh phụ thuộc vòng (Circular Dependency)
let sfxRef = null;
let atlasRef = null;
let onStartBattleCallback = null;
let onRenderMapPreviewCallback = null;

// Chuẩn hóa ID đơn vị chính trong UNIT_CATALOG (tương thích cả 'infantry' và 'rifleman')
const PRIMARY_INFANTRY_ID = UNIT_CATALOG[0]?.id || 'infantry';

export function normalizeUnitId(unitId) {
    if (unitId === 'infantry' || unitId === 'rifleman') {
        return PRIMARY_INFANTRY_ID;
    }
    return unitId;
}

// Ánh xạ tên chế độ đặc biệt sang mã chế độ của Engine trong main.js
const SPECIAL_TO_ENGINE_MODE = {
    endless: 'endless_siege',
    endless_siege: 'endless_siege',
    autobattler: 'auto_battler',
    auto_battler: 'auto_battler',
    night_fog: 'fog_of_war',
    fog_of_war: 'fog_of_war',
    raid_boss: 'raid_boss',
    bossrush: 'raid_boss'
};

// ============================================================================
// TRẠNG THÁI META-GAME VÀ LƯU TRỮ LOCALSTORAGE
// ============================================================================
export let metaState = {
    playerName: '',
    coins: 350,
    gems: 400,
    medals: 5, // Huy chương nhận từ Map Khó / Raid Boss để nâng Cây Bị Động
    isAdminMode: false,
    usedCodes: [],
    mapDifficultyProgress: {},
    inventory: [],
    armyPermanentLevels: {},
    missionsProgress: {
        kills: 0,
        diffWins: 0,
        spawns: 0,
        cratesOpened: 0,
        merges: 0,
        wins: 0,
        upgrades: 0,
        claimed: {}
    },
    metaTalents: {
        oil_refining: 0,
        high_grade_steel: 0,
        optimal_logistics: 0
    },
    unitSockets: {},
    // Trường cầu nối tương thích trực tiếp với main.js
    talents: {},
    equippedChips: {},
    selectedDeck: [PRIMARY_INFANTRY_ID, 'bazooka', 'humvee', 'tank', 'airstrike'],
    endlessBestWave: 0,
    autobattlerWins: 0,
    raidBossClears: 0
};

export let currentLobbyTab = 'battle';
export let currentStageViewLevel = 1;
export let currentSelectedDifficulty = 'easy'; // 'easy' | 'difficult'
export let currentSelectedBattleMode = 'destroy'; // 'destroy' | 'survival'
export let currentSelectedSpecialMode = 'standard'; // 'standard' | 'endless' | 'autobattler' | 'night_fog' | 'raid_boss'
export let currentArmyMode = 'army'; // 'army' | 'merge'
export let showcaseUnitId = PRIMARY_INFANTRY_ID;
export let inspectingUnitId = PRIMARY_INFANTRY_ID;
export let mergeSelectedCardUids = [];
export let activeChipSocketIndex = 0;
let uidCounter = 1;

/**
 * Phản hồi xúc giác (Haptic Feedback) trên thiết bị di động
 */
export function triggerHaptic(duration = 15) {
    try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(duration);
        }
    } catch (e) {
        // Bỏ qua trên thiết bị không hỗ trợ rung
    }
}

export function nextCompactUid(prefix = 'c') {
    uidCounter = (uidCounter + 1) % 1000000000;
    return `${prefix}_${Date.now().toString(36)}_${uidCounter.toString(36)}`;
}

export function createDefaultInventory() {
    const starterUnits = [PRIMARY_INFANTRY_ID, 'bazooka', 'humvee', 'apc'];
    return starterUnits.map((unitId, idx) => ({
        uid: 'init_card_' + idx + '_' + Date.now(),
        unitId: normalizeUnitId(unitId),
        rarity: 'common'
    }));
}

export function createDefaultArmyLevels() {
    const lvMap = {};
    UNIT_CATALOG.forEach(u => {
        lvMap[u.id] = 1;
    });
    lvMap['infantry'] = 1;
    lvMap['rifleman'] = 1;
    lvMap['airstrike'] = 1;
    return lvMap;
}

export function createDefaultUnitSockets() {
    const sockMap = {};
    UNIT_CATALOG.forEach(u => {
        sockMap[u.id] = [u.defaultChips?.[0] || null, u.defaultChips?.[1] || null];
    });
    sockMap['infantry'] = [...(sockMap[PRIMARY_INFANTRY_ID] || ['overclock_core', null])];
    sockMap['rifleman'] = [...(sockMap[PRIMARY_INFANTRY_ID] || ['overclock_core', null])];
    return sockMap;
}

export function createDefaultMapDifficultyProgress() {
    const prog = {};
    for (let i = 1; i <= LEVELS.length; i++) {
        prog[i] = {
            easy: false,
            difficult: false,
            easy_destroy: false,
            easy_survival: false,
            difficult_destroy: false,
            difficult_survival: false
        };
    }
    return prog;
}

export function normalizeMapProgressEntry(rawEntry) {
    if (!rawEntry || typeof rawEntry !== 'object') {
        return {
            easy: false,
            difficult: false,
            easy_destroy: false,
            easy_survival: false,
            difficult_destroy: false,
            difficult_survival: false
        };
    }
    const easyDestroy = !!rawEntry.easy_destroy || (!!rawEntry.easy && !rawEntry.easy_survival);
    const easySurvival = !!rawEntry.easy_survival;
    const diffDestroy = !!rawEntry.difficult_destroy;
    const diffSurvival = !!rawEntry.difficult_survival || (!!rawEntry.difficult && !rawEntry.difficult_destroy);

    return {
        easy: !!rawEntry.easy || easyDestroy || easySurvival,
        difficult: !!rawEntry.difficult || diffDestroy || diffSurvival,
        easy_destroy: easyDestroy,
        easy_survival: easySurvival,
        difficult_destroy: diffDestroy,
        difficult_survival: diffSurvival
    };
}

/**
 * Đồng bộ dữ liệu Cây Bị Động (metaTalents) và Khe Chip (unitSockets)
 * sang cấu trúc metaState.talents & metaState.equippedChips mà main.js đọc
 */
export function syncLegacyEngineBridges() {
    // 1. Đồng bộ cấp độ Bộ Binh giữa 'infantry' và 'rifleman'
    const infLv = Math.max(
        metaState.armyPermanentLevels?.infantry || 1,
        metaState.armyPermanentLevels?.rifleman || 1
    );
    metaState.armyPermanentLevels.infantry = infLv;
    metaState.armyPermanentLevels.rifleman = infLv;

    // 2. Đồng bộ khe Chip giữa 'infantry' và 'rifleman'
    const infSockets =
        metaState.unitSockets?.[PRIMARY_INFANTRY_ID] ||
        metaState.unitSockets?.infantry ||
        metaState.unitSockets?.rifleman ||
        ['overclock_core', null];
    metaState.unitSockets.infantry = infSockets;
    metaState.unitSockets.rifleman = infSockets;

    // 3. Ánh xạ sang metaState.equippedChips cho main.js
    const eq = {};
    Object.keys(metaState.unitSockets || {}).forEach(uId => {
        const arr = metaState.unitSockets[uId];
        if (Array.isArray(arr)) {
            eq[uId] = arr[0] || arr[1] || null;
        }
    });
    metaState.equippedChips = eq;

    // 4. Ánh xạ sang metaState.talents cho main.js
    const oilLv = Number(metaState.metaTalents?.oil_refining) || 0;
    const steelLv = Number(metaState.metaTalents?.high_grade_steel) || 0;
    const logiLv = Number(metaState.metaTalents?.optimal_logistics) || 0;

    metaState.talents = {
        gas_speed: oilLv,
        infantry_hp: steelLv,
        vehicle_dmg: steelLv,
        base_fortify: steelLv,
        starting_gas: logiLv,
        tactic_cd: logiLv,
        air_naval_cd: logiLv,
        gold_rush: logiLv
    };
}

export function loadProgress() {
    const defaultLevels = createDefaultArmyLevels();
    const defaultMapProg = createDefaultMapDifficultyProgress();
    const defaultSockets = createDefaultUnitSockets();

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            metaState.playerName = typeof parsed.playerName === 'string' ? parsed.playerName : '';
            metaState.coins = typeof parsed.coins === 'number' ? parsed.coins : 350;
            metaState.gems = typeof parsed.gems === 'number' ? parsed.gems : 400;
            metaState.medals = typeof parsed.medals === 'number' ? parsed.medals : 5;
            metaState.isAdminMode = !!parsed.isAdminMode;
            metaState.usedCodes = Array.isArray(parsed.usedCodes) ? parsed.usedCodes : [];
            metaState.endlessBestWave = Number(parsed.endlessBestWave) || 0;
            metaState.autobattlerWins = Number(parsed.autobattlerWins) || 0;
            metaState.raidBossClears = Number(parsed.raidBossClears) || 0;

            metaState.mapDifficultyProgress = defaultMapProg;
            if (parsed.mapDifficultyProgress && typeof parsed.mapDifficultyProgress === 'object') {
                for (let i = 1; i <= LEVELS.length; i++) {
                    if (parsed.mapDifficultyProgress[i]) {
                        metaState.mapDifficultyProgress[i] = normalizeMapProgressEntry(parsed.mapDifficultyProgress[i]);
                    }
                }
            }

            if (parsed.inventoryStacks && typeof parsed.inventoryStacks === 'object') {
                const rebuilt = [];
                for (const [key, count] of Object.entries(parsed.inventoryStacks)) {
                    const [rawUnitId, rarity] = key.split('__');
                    const unitId = normalizeUnitId(rawUnitId);
                    const qty = Math.max(0, Math.floor(Number(count) || 0));
                    if (UNIT_BY_ID[unitId] && RARITY_CONFIG[rarity] && qty > 0) {
                        for (let i = 0; i < qty; i++) {
                            rebuilt.push({
                                uid: nextCompactUid('s'),
                                unitId,
                                rarity
                            });
                        }
                    }
                }
                metaState.inventory = rebuilt.length > 0 ? rebuilt : createDefaultInventory();
            } else if (Array.isArray(parsed.inventory) && parsed.inventory.length > 0) {
                const cleaned = [];
                parsed.inventory.forEach(item => {
                    if (!item) return;
                    const normId = normalizeUnitId(item.unitId);
                    if (UNIT_BY_ID[normId] && RARITY_CONFIG[item.rarity]) {
                        cleaned.push({
                            uid: item.uid || nextCompactUid('c'),
                            unitId: normId,
                            rarity: item.rarity
                        });
                    }
                });
                metaState.inventory = cleaned.length > 0 ? cleaned : createDefaultInventory();
            } else {
                metaState.inventory = createDefaultInventory();
            }

            metaState.armyPermanentLevels = { ...defaultLevels, ...(parsed.armyPermanentLevels || {}) };

            const mp = parsed.missionsProgress || {};
            metaState.missionsProgress = {
                kills: Number(mp.kills) || 0,
                diffWins: Number(mp.diffWins) || 0,
                spawns: Number(mp.spawns) || 0,
                cratesOpened: Number(mp.cratesOpened) || 0,
                merges: Number(mp.merges) || 0,
                wins: Number(mp.wins) || 0,
                upgrades: Number(mp.upgrades) || 0,
                claimed: mp.claimed && typeof mp.claimed === 'object' ? mp.claimed : {}
            };

            metaState.metaTalents = {
                oil_refining: 0,
                high_grade_steel: 0,
                optimal_logistics: 0,
                ...(parsed.metaTalents || {})
            };

            metaState.unitSockets = {
                ...defaultSockets,
                ...(parsed.unitSockets || {})
            };
        } else {
            metaState.playerName = '';
            metaState.coins = 350;
            metaState.gems = 400;
            metaState.medals = 5;
            metaState.isAdminMode = false;
            metaState.usedCodes = [];
            metaState.mapDifficultyProgress = defaultMapProg;
            metaState.inventory = createDefaultInventory();
            metaState.armyPermanentLevels = defaultLevels;
            metaState.unitSockets = defaultSockets;
        }
    } catch (e) {
        metaState.mapDifficultyProgress = defaultMapProg;
        metaState.inventory = createDefaultInventory();
        metaState.armyPermanentLevels = defaultLevels;
        metaState.unitSockets = defaultSockets;
    }

    syncLegacyEngineBridges();
    currentStageViewLevel = getMaxUnlockedMapLevel();
    currentSelectedDifficulty = getDefaultDifficultyForMap(currentStageViewLevel);
}

export function saveProgress() {
    syncLegacyEngineBridges();
    try {
        if (metaState.inventory.length <= 2500) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(metaState));
        } else {
            const stacks = {};
            for (let i = 0; i < metaState.inventory.length; i++) {
                const c = metaState.inventory[i];
                const normId = normalizeUnitId(c.unitId);
                const key = `${normId}__${c.rarity}`;
                stacks[key] = (stacks[key] || 0) + 1;
            }
            const compactPayload = {
                ...metaState,
                inventory: [],
                inventoryStacks: stacks
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(compactPayload));
        }
    } catch (e) {
        try {
            const stacks = {};
            for (let i = 0; i < metaState.inventory.length; i++) {
                const c = metaState.inventory[i];
                const normId = normalizeUnitId(c.unitId);
                const key = `${normId}__${c.rarity}`;
                stacks[key] = (stacks[key] || 0) + 1;
            }
            const compactPayload = {
                ...metaState,
                inventory: [],
                inventoryStacks: stacks
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(compactPayload));
        } catch (err) {}
    }
}

export function resetAllAccountData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    window.location.reload();
}

export function isDifficultyCleared(mapLv, diffId) {
    const prog = metaState.mapDifficultyProgress[mapLv];
    if (!prog) return false;
    if (diffId === 'easy') {
        return !!(prog.easy || prog.easy_destroy || prog.easy_survival);
    }
    if (diffId === 'difficult') {
        return !!(prog.difficult || prog.difficult_destroy || prog.difficult_survival);
    }
    return false;
}

export function isDifficultyModeCleared(mapLv, diffId, modeId) {
    const prog = metaState.mapDifficultyProgress[mapLv];
    if (!prog) return false;
    const key = `${diffId}_${modeId}`;
    return !!prog[key];
}

export function getMaxUnlockedMapLevel() {
    if (metaState.isAdminMode) return LEVELS.length;
    let maxLv = 1;
    for (let i = 1; i < LEVELS.length; i++) {
        if (isDifficultyCleared(i, 'easy')) {
            maxLv = i + 1;
        } else {
            break;
        }
    }
    return maxLv;
}

export function isDifficultyUnlocked(mapLv, diffId) {
    if (metaState.isAdminMode) return true;
    if (mapLv > getMaxUnlockedMapLevel()) return false;
    if (diffId === 'easy') return true;
    if (diffId === 'difficult') return isDifficultyCleared(mapLv, 'easy');
    return false;
}

export function getDefaultDifficultyForMap(mapLv) {
    if (!isDifficultyCleared(mapLv, 'easy')) return 'easy';
    return 'difficult';
}

export function getHighestRarityForUnit(unitId) {
    const targetId = normalizeUnitId(unitId);
    let bestRarity = 'common';
    let bestRank = -1;

    for (let i = 0; i < metaState.inventory.length; i++) {
        const card = metaState.inventory[i];
        if (normalizeUnitId(card.unitId) === targetId) {
            const cfg = RARITY_CONFIG[card.rarity];
            if (cfg && cfg.rank > bestRank) {
                bestRank = cfg.rank;
                bestRarity = card.rarity;
                if (bestRank === 20) break;
            }
        }
    }
    return bestRarity;
}

export function hasUnitInInventory(unitId) {
    const targetId = normalizeUnitId(unitId);
    return metaState.inventory.some(c => normalizeUnitId(c.unitId) === targetId);
}

export function getUnitUpgradeCost(currentLv) {
    const tierBlock = Math.floor((currentLv - 1) / 5);
    const basePrices = [100, 280, 750, 1800, 4200, 9500, 20000];
    return basePrices[Math.min(tierBlock, basePrices.length - 1)];
}

export function calcTotalRefundCoins(targetLv, currentLv) {
    const start = Math.max(1, Math.floor(Number(targetLv) || 1));
    const end = Math.floor(Number(currentLv) || 1);
    if (start >= end) return 0;
    let totalRefund = 0;
    for (let lv = start; lv < end; lv++) {
        totalRefund += getUnitUpgradeCost(lv);
    }
    return totalRefund;
}

export function getUpgradeTierBracketText(currentLv) {
    const block = Math.floor((currentLv - 1) / 5);
    const startLv = block * 5 + 1;
    const endLv = startLv + 4;
    return `Khung giá cố định: Cấp ${startLv} - ${endLv}`;
}

export function formatCurrency(val) {
    if (metaState.isAdminMode) return '∞';
    const n = Math.floor(Number(val) || 0);
    return n.toLocaleString('en-US');
}

// ============================================================================
// GIAO DIỆN SẢNH (TOP BAR & TABS)
// ============================================================================
export function updateTopBarUI() {
    const nameEl = document.getElementById('player-name-display');
    if (nameEl) nameEl.textContent = metaState.playerName || 'COMMANDER';

    const gemsEl = document.getElementById('gems-count-display');
    if (gemsEl) gemsEl.textContent = formatCurrency(metaState.gems);

    const coinsEl = document.getElementById('coins-count-display');
    if (coinsEl) coinsEl.textContent = formatCurrency(metaState.coins);

    // Cập nhật hiển thị Huy chương (Hỗ trợ cả 2 ID)
    const medalsEl1 = document.getElementById('medals-count-display');
    const medalsEl2 = document.getElementById('lobby-medals-val');
    if (medalsEl1) medalsEl1.textContent = formatCurrency(metaState.medals || 0);
    if (medalsEl2) medalsEl2.textContent = formatCurrency(metaState.medals || 0);

    const medalsPill = document.getElementById('medals-pill-box');
    const gemsPill = document.getElementById('gems-pill-box');
    const coinsPill = document.getElementById('coins-pill-box');
    const gearBtn = document.getElementById('btn-open-settings');
    const adminTag = document.getElementById('admin-active-tag');

    if (metaState.isAdminMode) {
        if (medalsPill) medalsPill.className = 'currency-pill medal-pill admin-infinite-pill';
        if (gemsPill) gemsPill.className = 'currency-pill admin-infinite-pill';
        if (coinsPill) coinsPill.className = 'currency-pill admin-infinite-pill';
        if (gearBtn) gearBtn.className = 'btn-settings-gear admin-active-gear';
        if (adminTag) adminTag.classList.remove('hidden');
    } else {
        if (medalsPill) medalsPill.className = 'currency-pill medal-pill';
        if (gemsPill) gemsPill.className = 'currency-pill';
        if (coinsPill) gemsPill.className = 'currency-pill';
        if (coinsPill) coinsPill.className = 'currency-pill';
        if (gearBtn) gearBtn.className = 'btn-settings-gear';
        if (adminTag) adminTag.classList.add('hidden');
    }

    updateMissionNotificationDot();
    updateTalentNotificationDot();
}

export function switchLobbyTab(tabName) {
    currentLobbyTab = tabName;
    if (sfxRef) sfxRef.play('gas');
    triggerHaptic(15);

    document.querySelectorAll('.lobby-tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    const targetPane = document.getElementById(`tab-${tabName}`);
    if (targetPane) targetPane.classList.add('active');

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (tabName === 'battle') renderStageScreenUI();
    else if (tabName === 'army') renderArmyTabUI();
    updateTopBarUI();
}

// ============================================================================
// POPUP ĐẶT TÊN & SETTINGS (ADMIN MODE & RESET ACCOUNT)
// ============================================================================
export function checkAndPromptPlayerName(forceOpen = false) {
    const modal = document.getElementById('name-modal');
    const input = document.getElementById('player-name-input');
    const errEl = document.getElementById('name-error-msg');
    if (!modal || !input) return;

    if (forceOpen || !metaState.playerName || metaState.playerName.trim() === '') {
        input.value = metaState.playerName || '';
        if (errEl) errEl.classList.add('hidden');
        modal.classList.add('active');
        setTimeout(() => input.focus(), 80);
    }
}

export function renderSettingsModalUI() {
    const modeBadge = document.getElementById('settings-mode-badge');
    const modeDesc = document.getElementById('settings-mode-desc');
    const loginSection = document.getElementById('admin-login-section');
    const activeSection = document.getElementById('admin-active-section');
    const passInput = document.getElementById('admin-password-input');
    const fb = document.getElementById('admin-auth-feedback');
    const passForm = document.getElementById('admin-password-form');

    if (passInput) passInput.value = '';
    if (fb) fb.classList.add('hidden');
    if (passForm) passForm.classList.add('hidden');

    if (metaState.isAdminMode) {
        if (modeBadge) {
            modeBadge.className = 'mode-pill-admin';
            modeBadge.textContent = '👑 CHẾ ĐỘ ADMIN ĐANG BẬT';
        }
        if (modeDesc) {
            modeDesc.textContent = `Bạn đang bật quyền Admin: Tài nguyên vô hạn, mở khóa toàn bộ ${LEVELS.length} map chơi.`;
        }
        if (loginSection) loginSection.classList.add('hidden');
        if (activeSection) activeSection.classList.remove('hidden');
    } else {
        if (modeBadge) {
            modeBadge.className = 'mode-pill-normal';
            modeBadge.textContent = 'NGƯỜI CHƠI THƯỜNG';
        }
        if (modeDesc) {
            modeDesc.textContent = 'Tài nguyên và tiến trình khóa map đang áp dụng theo dữ liệu lưu thực tế.';
        }
        if (loginSection) loginSection.classList.remove('hidden');
        if (activeSection) activeSection.classList.add('hidden');
    }
}

// ============================================================================
// TAB BATTLE: CHỌN MAP, ĐỘ KHÓ, 2 HÌNH THỨC & 4 CHẾ ĐỘ CHƠI MỚI
// ============================================================================
export function drawLobbyMapPreviewCanvas(levelNum) {
    if (typeof onRenderMapPreviewCallback === 'function') {
        onRenderMapPreviewCallback(levelNum);
        return;
    }
    const previewCanvas = document.getElementById('selected-map-preview');
    if (previewCanvas && typeof window !== 'undefined' && typeof window.renderMap === 'function') {
        const pCtx = previewCanvas.getContext('2d');
        pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        window.renderMap(pCtx, previewCanvas.width, previewCanvas.height, levelNum, true);
    }
}

export function renderStageScreenUI() {
    const maxUnlocked = getMaxUnlockedMapLevel();
    currentStageViewLevel = Math.max(1, Math.min(maxUnlocked, currentStageViewLevel));
    const cfg = LEVELS[currentStageViewLevel - 1] || LEVELS[0];

    if (!isDifficultyUnlocked(cfg.level, currentSelectedDifficulty)) {
        currentSelectedDifficulty = getDefaultDifficultyForMap(cfg.level);
    }

    const titleEl = document.getElementById('stage-map-title');
    if (titleEl) titleEl.textContent = `${cfg.level}. ${cfg.name.toUpperCase()}`;

    const progressTextEl = document.getElementById('stage-progress-text');
    if (progressTextEl) {
        progressTextEl.textContent = metaState.isAdminMode
            ? `👑 ADMIN MODE: ĐÃ MỞ KHÓA TOÀN BỘ ${LEVELS.length} MAP`
            : `ĐÃ MỞ KHÓA: MAP ${maxUnlocked} / ${LEVELS.length} | KỶ LỤC VÔ TẬN: WAVE ${metaState.endlessBestWave || 0}`;
    }

    const prevBtn = document.getElementById('btn-prev-stage');
    if (prevBtn) prevBtn.disabled = currentStageViewLevel <= 1;

    const nextBtn = document.getElementById('btn-next-stage');
    if (nextBtn) nextBtn.disabled = currentStageViewLevel >= maxUnlocked;

    DIFFICULTY_ORDER.forEach(diffKey => {
        const btn = document.getElementById(`diff-btn-${diffKey}`);
        const statusEl = document.getElementById(`diff-status-${diffKey}`);
        const unlocked = isDifficultyUnlocked(cfg.level, diffKey);
        const cleared = isDifficultyCleared(cfg.level, diffKey);

        if (btn) {
            btn.classList.toggle('active', currentSelectedDifficulty === diffKey);
            btn.classList.toggle('locked', !unlocked);
        }
        if (statusEl) {
            if (!unlocked) statusEl.textContent = '🔒';
            else if (cleared) statusEl.textContent = '✓';
            else statusEl.textContent = '★';
        }
    });

    BATTLE_MODE_ORDER.forEach(modeKey => {
        const mBtn = document.getElementById(`mode-btn-${modeKey}`);
        const mStatus = document.getElementById(`mode-status-${modeKey}`);
        const modeCleared = isDifficultyModeCleared(cfg.level, currentSelectedDifficulty, modeKey);

        if (mBtn) {
            mBtn.classList.toggle('active', currentSelectedSpecialMode === 'standard' && currentSelectedBattleMode === modeKey);
        }
        if (mStatus) {
            mStatus.textContent = modeCleared ? '✓' : '★';
        }
    });

    // Đồng bộ trạng thái active cho 4 Chế Độ Chơi Mới (Hỗ trợ cả .special-mode-pill lẫn #mode-btn-...)
    document.querySelectorAll('.special-mode-pill').forEach(btn => {
        const sp = btn.getAttribute('data-special') || btn.getAttribute('data-mode');
        btn.classList.toggle('active', currentSelectedSpecialMode === sp);
    });

    const specialBtnMap = {
        'mode-btn-endless': 'endless',
        'mode-btn-autobattler': 'autobattler',
        'btn-toggle-fog-mode': 'night_fog',
        'mode-btn-bossrush': 'raid_boss'
    };
    Object.entries(specialBtnMap).forEach(([btnId, spKey]) => {
        const el = document.getElementById(btnId);
        if (el) el.classList.toggle('active', currentSelectedSpecialMode === spKey);
    });

    const fogStatusEl = document.getElementById('fog-mode-status');
    if (fogStatusEl) {
        fogStatusEl.textContent = currentSelectedSpecialMode === 'night_fog' ? 'BẬT' : 'TẮT';
    }

    const endlessBestMini = document.getElementById('endless-best-mini');
    if (endlessBestMini) endlessBestMini.textContent = `W:${metaState.endlessBestWave || 0}`;

    const modeStatusEndless = document.getElementById('mode-status-endless');
    if (modeStatusEndless) modeStatusEndless.textContent = `W${metaState.endlessBestWave || 0}`;

    const endlessRecordBadge = document.getElementById('endless-best-wave-badge');
    if (endlessRecordBadge) {
        endlessRecordBadge.textContent = `🏆 KỶ LỤC: WAVE ${metaState.endlessBestWave || 0}`;
        endlessRecordBadge.classList.toggle('hidden', currentSelectedSpecialMode !== 'endless');
    }

    const diffCfg = DIFFICULTY_CONFIG[currentSelectedDifficulty] || DIFFICULTY_CONFIG.easy;
    const rewardCoins = calcStageRewardCoins(cfg.level, currentSelectedDifficulty, currentSelectedBattleMode);
    const scaledEnemyBaseHp = Math.round(cfg.enemyBaseHp * diffCfg.baseHpMult);

    const diffBannerEl = document.getElementById('diff-info-banner');
    if (diffBannerEl) {
        const sp = currentSelectedSpecialMode;
        if (sp === 'endless') {
            diffBannerEl.innerHTML = `Chế độ: <b>Thủ Thành Roguelike Vô Tận</b> • Kỷ lục: <b class="text-purple-300">Wave ${metaState.endlessBestWave || 0}</b> • Qua mỗi Wave chọn Thẻ Đột Biến!`;
        } else if (sp === 'autobattler') {
            diffBannerEl.innerHTML = `Chế độ: <b>Đấu Trường Đặt Trận Tự Động</b> • Chọn thẻ dưới Deck & chạm nửa sân dưới để dàn trận!`;
        } else if (sp === 'night_fog') {
            diffBannerEl.innerHTML = `Chế độ: <b>Chiến Dịch Đêm Mù (Fog of War)</b> • Màn đêm bao phủ, đơn vị chiếu đèn mở tầm nhìn!`;
        } else if (sp === 'raid_boss') {
            diffBannerEl.innerHTML = `Chế độ: <b>Đấu Trường Siêu Boss</b> • Hủy diệt Pháo Đài Hạm Leviathan MK-IX qua 3 giai đoạn!`;
        } else if (currentSelectedBattleMode === 'destroy') {
            diffBannerEl.innerHTML = `Mục tiêu: <b>Phá hủy Căn cứ Đỏ (HP: ${scaledEnemyBaseHp})</b> • Thưởng: <b class="text-amber-300">🪙 ${formatCurrency(rewardCoins)} Coins</b>`;
        } else {
            diffBannerEl.innerHTML = `Mục tiêu: <b>Sinh tồn 10 Wave liên tiếp</b> • Thưởng: <b class="text-amber-300">🪙 ${formatCurrency(rewardCoins)} Coins</b>`;
        }
    }

    const waterBadge = document.getElementById('select-map-water-badge');
    if (waterBadge) {
        if (cfg.hasWater) {
            waterBadge.className = 'map-water-pill has-water';
            waterBadge.textContent = cfg.hasCoastFoam ? '🌊 BỜ BIỂN SÓNG VỖ: CÓ THỦY QUÂN' : '🌊 CÓ NƯỚC: CÓ THỦY QUÂN';
        } else {
            waterBadge.className = 'map-water-pill no-water';
            waterBadge.textContent = cfg.theme === 'brown_earth' ? '🏜️ ĐẤT NÂU HẺM NÚI: LỤC & KHÔNG QUÂN' : '⛰️ ĐẤT LIỀN: LỤC & KHÔNG QUÂN';
        }
    }

    const clearedStampEl = document.getElementById('stage-cleared-stamp');
    if (clearedStampEl) {
        const curModeCleared = isDifficultyModeCleared(cfg.level, currentSelectedDifficulty, currentSelectedBattleMode);
        const anyDiffCleared = isDifficultyCleared(cfg.level, currentSelectedDifficulty);
        if (curModeCleared || anyDiffCleared) {
            clearedStampEl.classList.remove('hidden');
            const mLabel = BATTLE_MODE_CONFIG[currentSelectedBattleMode]?.shortLabel || 'PHÁ CĂN CỨ';
            clearedStampEl.textContent = curModeCleared
                ? `✓ ĐÃ QUA: ${diffCfg.shortLabel} - ${mLabel}`
                : `✓ ĐÃ MỞ KHÓA (${diffCfg.shortLabel})`;
        } else {
            clearedStampEl.classList.add('hidden');
        }
    }

    const descEl = document.getElementById('select-map-desc');
    if (descEl) descEl.textContent = cfg.desc;

    drawLobbyMapPreviewCanvas(cfg.level);
    updateTopBarUI();
}

// ============================================================================
// CÂY KỸ NĂNG CHỈ HUY BỊ ĐỘNG (META-TALENTS MODAL - HỖ TRỢ MỌI ID TRONG HTML)
// ============================================================================
export function updateTalentNotificationDot() {
    const canAffordAny = Object.values(META_TALENTS).some(t => {
        const lv = (metaState.metaTalents && metaState.metaTalents[t.id]) || 0;
        const cost = t.baseCost + lv * t.costStep;
        return lv < t.maxLevel && (metaState.isAdminMode || (metaState.medals || 0) >= cost);
    });

    const dot1 = document.getElementById('talents-notif-badge');
    const dot2 = document.getElementById('talent-notif-dot');
    if (dot1) {
        dot1.style.display = canAffordAny ? 'flex' : 'none';
        dot1.classList.toggle('hidden', !canAffordAny);
    }
    if (dot2) {
        dot2.classList.toggle('hidden', !canAffordAny);
    }
}

export function renderMetaTalentsModalUI() {
    const formattedMedals = formatCurrency(metaState.medals || 0);
    const modalMedals1 = document.getElementById('modal-medals-count');
    const modalMedals2 = document.getElementById('talent-medals-count');
    if (modalMedals1) modalMedals1.textContent = formattedMedals;
    if (modalMedals2) modalMedals2.textContent = `${formattedMedals} 🎖️`;

    const container =
        document.getElementById('talents-list-container') ||
        document.getElementById('talent-tree-list');
    if (!container) return;
    container.innerHTML = '';

    Object.values(META_TALENTS).forEach(talent => {
        const curLv = (metaState.metaTalents && metaState.metaTalents[talent.id]) || 0;
        const isMax = curLv >= talent.maxLevel;
        const cost = talent.baseCost + curLv * talent.costStep;
        const canAfford = metaState.isAdminMode || (metaState.medals || 0) >= cost;

        let pipsHtml = '';
        for (let i = 1; i <= talent.maxLevel; i++) {
            pipsHtml += `<span class="talent-pip ${i <= curLv ? 'active' : ''}"></span>`;
        }

        const card = document.createElement('div');
        card.className = `talent-node-card ${isMax ? 'talent-maxed' : ''}`;
        card.innerHTML = `
            <div class="talent-node-icon">${talent.icon}</div>
            <div class="talent-node-info">
                <div class="talent-node-title">${talent.name} (Cấp ${curLv}/${talent.maxLevel})</div>
                <div class="talent-node-desc">${talent.desc}</div>
                <div class="talent-node-stat-preview">${talent.getEffectText(curLv)}</div>
                <div class="talent-level-pips">${pipsHtml}</div>
            </div>
            <button type="button" class="btn-3d ${isMax ? 'btn-3d-amber' : 'btn-3d-green'} talent-upgrade-btn" ${(!isMax && !canAfford) ? 'disabled' : ''}>
                ${isMax ? '<span>TỐI ĐA</span>' : `<span>NÂNG CẤP</span><span class="talent-cost-num">🎖️ ${metaState.isAdminMode ? 0 : cost}</span>`}
            </button>
        `;

        const upgBtn = card.querySelector('.talent-upgrade-btn');
        if (upgBtn && !isMax) {
            upgBtn.addEventListener('click', () => {
                if (!metaState.isAdminMode && (metaState.medals || 0) < cost) {
                    if (sfxRef) sfxRef.play('cannon');
                    return;
                }
                if (!metaState.isAdminMode) metaState.medals -= cost;
                metaState.metaTalents[talent.id] = curLv + 1;
                triggerHaptic(25);
                if (sfxRef) sfxRef.play('upgrade');
                saveProgress();
                renderMetaTalentsModalUI();
                updateTopBarUI();
            });
        }
        container.appendChild(card);
    });
}

export function resetAllMetaTalents() {
    if (!metaState.metaTalents) return;
    let refunded = 0;
    Object.values(META_TALENTS).forEach(talent => {
        const curLv = Number(metaState.metaTalents[talent.id]) || 0;
        for (let i = 0; i < curLv; i++) {
            refunded += talent.baseCost + i * talent.costStep;
        }
        metaState.metaTalents[talent.id] = 0;
    });

    if (refunded > 0) {
        if (!metaState.isAdminMode) {
            metaState.medals = (metaState.medals || 0) + refunded;
        }
        triggerHaptic(25);
        if (sfxRef) sfxRef.play('upgrade');
        saveProgress();
        renderMetaTalentsModalUI();
        updateTopBarUI();
    } else if (sfxRef) {
        sfxRef.play('cannon');
    }
}

// ============================================================================
// NHIỆM VỤ CHIẾN DỊCH & GIFTCODE
// ============================================================================
export function updateMissionNotificationDot() {
    const dotEl = document.getElementById('mission-notif-dot');
    if (!dotEl) return;
    const mp = metaState.missionsProgress;
    const hasClaimable = MISSIONS_CATALOG.some(m => {
        const cur = Number(mp[m.statKey]) || 0;
        return cur >= m.target && !mp.claimed[m.id];
    });
    dotEl.classList.toggle('hidden', !hasClaimable);
}

export function renderMissionsList() {
    const container = document.getElementById('mission-list-container');
    if (!container) return;
    container.innerHTML = '';
    const mp = metaState.missionsProgress;

    MISSIONS_CATALOG.forEach(m => {
        const cur = Math.min(m.target, Number(mp[m.statKey]) || 0);
        const pct = Math.max(0, Math.min(100, Math.round((cur / m.target) * 100)));
        const isClaimed = !!mp.claimed[m.id];
        const canClaim = cur >= m.target && !isClaimed;
        const coinBonusText = m.rewardCoins ? ` • 🪙 +${m.rewardCoins.toLocaleString('en-US')}` : '';

        const item = document.createElement('div');
        item.className = 'mission-item-card';
        item.innerHTML = `
            <div class="flex-1 text-left">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-extrabold text-slate-900">${m.title}</span>
                    <span class="text-[10.5px] font-black text-emerald-600">💎 +${m.rewardGems}${coinBonusText}</span>
                </div>
                <div class="mission-progress-track">
                    <div class="mission-progress-fill" style="width: ${pct}%"></div>
                </div>
                <div class="text-[10px] font-bold text-slate-500 mt-0.5">Tiến độ: ${cur.toLocaleString('en-US')} / ${m.target.toLocaleString('en-US')}</div>
            </div>
            <div>
                <button class="btn-3d ${canClaim ? 'btn-3d-green' : 'btn-3d-yellow'} px-3 py-1.5 text-[11px]" ${canClaim ? '' : 'disabled'}>
                    ${isClaimed ? 'ĐÃ NHẬN' : (canClaim ? 'NHẬN' : 'CHƯA ĐẠT')}
                </button>
            </div>
        `;

        const btn = item.querySelector('button');
        if (btn && canClaim) {
            btn.addEventListener('click', () => {
                metaState.missionsProgress.claimed[m.id] = true;
                metaState.gems += m.rewardGems || 0;
                metaState.coins += m.rewardCoins || 0;
                saveProgress();
                triggerHaptic(20);
                if (sfxRef) sfxRef.play('upgrade');
                renderMissionsList();
                updateTopBarUI();
            });
        }
        container.appendChild(item);
    });
}

export function renderGiftcodeModalUI() {
    const input = document.getElementById('giftcode-input');
    const fb = document.getElementById('giftcode-feedback');
    const usedCountEl = document.getElementById('giftcode-used-count');
    const tagsWrap = document.getElementById('giftcode-used-tags');

    if (input) input.value = '';
    if (fb) fb.classList.add('hidden');

    const usedList = Array.isArray(metaState.usedCodes) ? metaState.usedCodes : [];
    if (usedCountEl) usedCountEl.textContent = `${usedList.length} / ${OFFICIAL_GIFTCODES.length} mã`;

    if (tagsWrap) {
        tagsWrap.innerHTML = '';
        if (usedList.length === 0) {
            tagsWrap.innerHTML = `<span class="text-[10px] text-slate-400 italic">Chưa có mã nào được nhập</span>`;
        } else {
            usedList.forEach(code => {
                const pill = document.createElement('span');
                pill.className = 'used-code-pill';
                pill.textContent = `✓ ${code}`;
                tagsWrap.appendChild(pill);
            });
        }
    }
}

// ============================================================================
// TAB SHOP: GACHA CRATES VÀ MỞ RƯƠNG TÙY CHỈNH
// ============================================================================
let pendingGachaData = null;

function rollRarityFromTable(oddsTable) {
    const rand = Math.random() * 100;
    let acc = 0;
    for (let i = 0; i < oddsTable.length; i++) {
        acc += oddsTable[i].weight;
        if (rand <= acc) return oddsTable[i].rarity;
    }
    return oddsTable[0].rarity;
}

export function requestOpenGachaCrate(crateType, count) {
    const qty = Math.max(1, Math.min(1000000, Math.floor(Number(count) || 1)));
    const isLegendary = crateType === 'legendary';
    const unitPrice = isLegendary ? 300 : 150;

    const blocksOf10 = Math.floor(qty / 10);
    const rawCost = qty * unitPrice;
    const discountAmount = Math.round(blocksOf10 * 10 * unitPrice * 0.1);
    const finalCost = metaState.isAdminMode ? 0 : Math.max(0, rawCost - discountAmount);

    pendingGachaData = {
        crateType,
        qty,
        unitPrice,
        rawCost,
        blocksOf10,
        discountAmount,
        finalCost,
        isLegendary
    };

    const modal = document.getElementById('gacha-confirm-modal');
    const titleEl = document.getElementById('gacha-conf-crate-title');
    const qtyEl = document.getElementById('gacha-conf-qty');
    const rawCostEl = document.getElementById('gacha-conf-raw-cost');
    const discEl = document.getElementById('gacha-conf-discount-tag');
    const savedEl = document.getElementById('gacha-conf-saved');
    const finalCostEl = document.getElementById('gacha-conf-final-cost');
    const errEl = document.getElementById('gacha-conf-error');
    const confirmBtn = document.getElementById('btn-confirm-custom-gacha');

    if (titleEl) titleEl.textContent = isLegendary ? '👑 LEGENDARY CRATE' : '🧰 EPIC CRATE';
    if (qtyEl) qtyEl.textContent = `${qty.toLocaleString('en-US')} rương`;
    if (rawCostEl) rawCostEl.textContent = `💎 ${rawCost.toLocaleString('en-US')}`;
    if (discEl) discEl.textContent = blocksOf10 > 0 ? `-10% (${blocksOf10.toLocaleString('en-US')} cụm 10 rương)` : 'Không đủ 10 rương để giảm giá';
    if (savedEl) savedEl.textContent = `💎 ${discountAmount.toLocaleString('en-US')}`;
    if (finalCostEl) finalCostEl.textContent = metaState.isAdminMode ? '💎 0 (ADMIN ∞)' : `💎 ${finalCost.toLocaleString('en-US')}`;

    const hasEnough = metaState.isAdminMode || metaState.gems >= finalCost;
    if (errEl) errEl.classList.toggle('hidden', hasEnough);
    if (confirmBtn) confirmBtn.disabled = !hasEnough;

    if (modal) modal.classList.add('active');
}

// ============================================================================
// TAB ARMY: QUẢN LÝ QUÂN, NÂNG CẤP, KHE GẮN CHIP & HOÀN LẠI CẤP ĐỘ
// ============================================================================
export function renderArmyShowcaseCanvas() {
    const sCanvas = document.getElementById('army-hero-showcase');
    if (!sCanvas) return;
    const sCtx = sCanvas.getContext('2d');
    sCtx.imageSmoothingEnabled = false;
    sCtx.clearRect(0, 0, sCanvas.width, sCanvas.height);

    const normId = normalizeUnitId(showcaseUnitId);
    const u = UNIT_BY_ID[normId] || UNIT_CATALOG[0];
    const highestRarity = getHighestRarityForUnit(u.id);
    const rCfg = RARITY_CONFIG[highestRarity] || RARITY_CONFIG.common;

    if (atlasRef && atlasRef.ready) {
        const bob = Math.sin(performance.now() * 0.005) * 3;
        atlasRef.draw(sCtx, u.spriteCol, 7, 64, 62 + bob, 78, 78);
    }

    const nameEl = document.getElementById('army-showcase-name');
    if (nameEl) nameEl.textContent = `${u.name.toUpperCase()} (LV.${metaState.armyPermanentLevels[u.id] || 1})`;

    const rarityEl = document.getElementById('army-showcase-rarity');
    if (rarityEl) {
        rarityEl.className = `rarity-badge ${rCfg.cssClass}`;
        rarityEl.textContent = rCfg.name.toUpperCase();
    }
}

export function renderArmyTabUI() {
    renderArmyShowcaseCanvas();

    const btnArmy = document.getElementById('btn-mode-army');
    const btnMerge = document.getElementById('btn-mode-merge');
    const listView = document.getElementById('army-list-view');
    const mergeView = document.getElementById('army-merge-view');
    const headingEl = document.getElementById('army-panel-title');

    if (currentArmyMode === 'army') {
        btnArmy?.classList.add('active');
        btnMerge?.classList.remove('active');
        listView?.classList.add('active');
        mergeView?.classList.remove('active');
        if (headingEl) headingEl.textContent = `QUÂN ĐỘI (${UNIT_CATALOG.length} BINH CHỦNG)`;
        renderArmyUnitsGrid();
    } else {
        btnArmy?.classList.remove('active');
        btnMerge?.classList.add('active');
        listView?.classList.remove('active');
        mergeView?.classList.add('active');
        if (headingEl) headingEl.textContent = `GHÉP TƯỚNG (${metaState.inventory.length.toLocaleString('en-US')} THẺ)`;
        renderMergeWorkbenchAndInventory();
    }
}

export function renderArmyUnitsGrid() {
    const grid = document.getElementById('army-units-grid');
    if (!grid) return;
    grid.innerHTML = '';

    UNIT_CATALOG.forEach(u => {
        const permLv = metaState.armyPermanentLevels[u.id] || 1;
        const highestRarity = getHighestRarityForUnit(u.id);
        const rCfg = RARITY_CONFIG[highestRarity] || RARITY_CONFIG.common;
        const owned = hasUnitInInventory(u.id);
        const spriteUrl = (atlasRef && atlasRef.ready) ? atlasRef.toDataURL(u.spriteCol, 7) : '';

        const sockets = metaState.unitSockets[u.id] || [null, null];
        const chipDotsHtml = sockets.map(cId => {
            const chip = cId ? UNIT_CHIPS[cId] : null;
            return `<span class="socket-dot ${chip ? chip.dotCss : ''}"></span>`;
        }).join('');

        const card = document.createElement('div');
        card.className = `army-unit-card ${rCfg.cssClass}`;
        card.innerHTML = `
            <div class="card-socket-dots">${chipDotsHtml}</div>
            <div class="card-top-lv">
                <span>LV.${permLv}</span>
                ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : `<span class="text-[8px] opacity-90">${owned ? rCfg.name : 'Cơ bản'}</span>`}
            </div>
            <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-1 drop-shadow" alt="${u.name}" />
            <div class="card-unit-title">${u.name}</div>
        `;

        card.addEventListener('click', () => {
            showcaseUnitId = u.id;
            renderArmyShowcaseCanvas();
            openUnitUpgradeModal(u.id);
        });

        grid.appendChild(card);
    });
}

export function calcUnitPermanentStats(spec, rarityId, permLv) {
    const rCfg = RARITY_CONFIG[rarityId] || RARITY_CONFIG.common;
    const lvMult = 1 + (permLv - 1) * 0.12;
    const totalMult = rCfg.mult * lvMult;

    // Tích hợp Chip Giáp Phản Ứng Nổ (+18% HP) & Cây Bị Động Thép Tôi Cao Cấp (+4% mỗi cấp)
    const normId = normalizeUnitId(spec.id);
    const sockets = metaState.unitSockets[normId] || [];
    const steelLv = Number(metaState.metaTalents?.high_grade_steel) || 0;
    const hpBonus = (sockets.includes('reactive_armor') ? 1.18 : 1.0) * (1 + steelLv * 0.04);

    return {
        damage: Math.max(1, Math.round(spec.damage * totalMult)),
        hp: Math.max(1, Math.round(spec.hp * totalMult * hpBonus)),
        rawDmg: +(spec.damage * totalMult).toFixed(1),
        rawHp: +(spec.hp * totalMult * hpBonus).toFixed(1)
    };
}

/**
 * Đảm bảo vùng chứa 2 Khe cắm Chip & Ngăn chọn Chip luôn tồn tại
 * dù index.html dùng #unit-sockets-slots-row hay #unit-chip-sockets-box
 */
function ensureUnitSocketContainers() {
    let slotsRow = document.getElementById('unit-sockets-slots-row');
    let pickerDrawer = document.getElementById('chip-picker-drawer');
    const legacyBox = document.getElementById('unit-chip-sockets-box');

    if (!slotsRow && legacyBox) {
        slotsRow = legacyBox;
        if (!pickerDrawer) {
            pickerDrawer = document.createElement('div');
            pickerDrawer.id = 'chip-picker-drawer';
            pickerDrawer.className = 'chip-inventory-grid';
            pickerDrawer.style.display = 'none';
            legacyBox.parentElement?.appendChild(pickerDrawer);
        }
    }
    return { slotsRow, pickerDrawer };
}

export function renderUnitSocketsInModal(rawUnitId) {
    const unitId = normalizeUnitId(rawUnitId);
    const { slotsRow, pickerDrawer } = ensureUnitSocketContainers();
    if (!slotsRow) return;

    if (!metaState.unitSockets[unitId]) {
        const u = UNIT_BY_ID[unitId];
        metaState.unitSockets[unitId] = [u?.defaultChips?.[0] || null, u?.defaultChips?.[1] || null];
    }
    const equipped = metaState.unitSockets[unitId];
    slotsRow.innerHTML = '';

    // Cập nhật nhãn tóm tắt chip đang gắn (nếu có trong HTML)
    const equippedTagEl = document.getElementById('unit-equipped-chip-tag');
    if (equippedTagEl) {
        const names = equipped.map(id => UNIT_CHIPS[id]?.shortName).filter(Boolean);
        equippedTagEl.textContent = names.length > 0 ? `Đang gắn: ${names.join(' + ')}` : 'Đang gắn: Trống';
    }

    [0, 1].forEach(slotIdx => {
        const chipId = equipped[slotIdx];
        const chip = chipId ? UNIT_CHIPS[chipId] : null;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `chip-slot-btn ${chip ? 'equipped' : ''}`;
        if (chip) btn.setAttribute('data-chip', chip.id);

        btn.innerHTML = `
            <div class="chip-slot-icon">${chip ? chip.icon : '➕'}</div>
            <div class="chip-slot-text-wrap">
                <span class="chip-slot-name">${chip ? chip.name : `Khe Chip #${slotIdx + 1}`}</span>
                <span class="chip-slot-effect">${chip ? chip.shortName : 'Chạm để gắn'}</span>
            </div>
        `;

        btn.addEventListener('click', () => {
            activeChipSocketIndex = slotIdx;
            renderChipPickerDrawer(unitId, slotIdx);
        });

        slotsRow.appendChild(btn);
    });

    if (pickerDrawer) pickerDrawer.style.display = 'none';
}

export function renderChipPickerDrawer(rawUnitId, slotIdx) {
    const unitId = normalizeUnitId(rawUnitId);
    const { pickerDrawer } = ensureUnitSocketContainers();
    if (!pickerDrawer) return;
    pickerDrawer.style.display = 'grid';
    pickerDrawer.innerHTML = '';

    // Nút gỡ bỏ Chip
    const removeCard = document.createElement('div');
    removeCard.className = 'chip-item-card';
    removeCard.innerHTML = `
        <span style="font-size:11px;font-weight:800;color:#dc2626;">❌ Tháo Chip khỏi Khe #${slotIdx + 1}</span>
        <button type="button" class="btn-3d btn-3d-danger" style="padding:4px 8px;font-size:9.5px;">GỠ BỎ</button>
    `;
    removeCard.addEventListener('click', () => {
        metaState.unitSockets[unitId][slotIdx] = null;
        saveProgress();
        openUnitUpgradeModal(unitId);
        renderArmyTabUI();
    });
    pickerDrawer.appendChild(removeCard);

    // Danh sách 4 loại Chip
    Object.values(UNIT_CHIPS).forEach(chip => {
        const isRecommended = chip.recommendedUnits.includes(unitId) ||
            (unitId === PRIMARY_INFANTRY_ID && (chip.recommendedUnits.includes('infantry') || chip.recommendedUnits.includes('rifleman')));
        const item = document.createElement('div');
        item.className = `chip-item-card ${isRecommended ? 'compatible' : ''}`;
        item.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:20px;">${chip.icon}</span>
                <div style="text-align:left;">
                    <div style="font-size:11px;font-weight:900;color:#0f172a;">
                        ${chip.name} ${isRecommended ? '<span style="color:#16a34a;font-size:9px;">(Khuyên dùng)</span>' : ''}
                    </div>
                    <div style="font-size:9.5px;color:#475569;">${chip.desc}</div>
                </div>
            </div>
            <button type="button" class="btn-3d btn-3d-green" style="padding:4px 8px;font-size:9.5px;">LẮP</button>
        `;
        item.addEventListener('click', () => {
            metaState.unitSockets[unitId][slotIdx] = chip.id;
            triggerHaptic(20);
            if (sfxRef) sfxRef.play('upgrade');
            saveProgress();
            openUnitUpgradeModal(unitId);
            renderArmyTabUI();
        });
        pickerDrawer.appendChild(item);
    });
}

export function openUnitUpgradeModal(rawUnitId) {
    const unitId = normalizeUnitId(rawUnitId);
    inspectingUnitId = unitId;
    const u = UNIT_BY_ID[unitId];
    if (!u) return;

    if (sfxRef) sfxRef.play('gas');
    const permLv = metaState.armyPermanentLevels[u.id] || 1;
    const highestRarity = getHighestRarityForUnit(u.id);
    const rCfg = RARITY_CONFIG[highestRarity] || RARITY_CONFIG.common;
    const costCoins = getUnitUpgradeCost(permLv);

    const curStats = calcUnitPermanentStats(u, highestRarity, permLv);
    const nextStats = calcUnitPermanentStats(u, highestRarity, permLv + 1);

    const nameEl = document.getElementById('upg-modal-unit-name');
    if (nameEl) nameEl.textContent = u.name.toUpperCase();

    const frameEl = document.getElementById('upg-modal-card-frame');
    if (frameEl) frameEl.className = `upg-unit-avatar-box ${rCfg.cssClass}`;

    const spriteEl = document.getElementById('upg-modal-sprite');
    if (spriteEl && atlasRef && atlasRef.ready) spriteEl.src = atlasRef.toDataURL(u.spriteCol, 7);

    const rarityBadge = document.getElementById('upg-modal-rarity-badge');
    if (rarityBadge) {
        rarityBadge.className = `rarity-badge ${rCfg.cssClass}`;
        rarityBadge.textContent = rCfg.name.toUpperCase();
    }

    const lvBadge = document.getElementById('upg-modal-level-badge');
    if (lvBadge) lvBadge.textContent = `LV.${permLv}`;

    const roleEl = document.getElementById('upg-modal-role');
    if (roleEl) roleEl.textContent = u.role;

    const multInfoEl = document.getElementById('upg-modal-mult-info');
    if (multInfoEl) multInfoEl.textContent = `Độ hiếm ${rCfg.name}: ${rCfg.mult}x HP & DMG • Cấp ${permLv}: +${(permLv - 1) * 12}%`;

    const bracketEl = document.getElementById('upg-modal-tier-bracket');
    if (bracketEl) bracketEl.textContent = getUpgradeTierBracketText(permLv);

    const curDmgEl = document.getElementById('upg-cur-dmg');
    if (curDmgEl) curDmgEl.textContent = `${curStats.damage} (${curStats.rawDmg})`;

    const nextDmgEl = document.getElementById('upg-next-dmg');
    if (nextDmgEl) nextDmgEl.textContent = `${nextStats.damage} (${nextStats.rawDmg})`;

    const curHpEl = document.getElementById('upg-cur-hp');
    if (curHpEl) curHpEl.textContent = u.isAirstrike ? `Phá nhà ${u.baseDamage}` : `${curStats.hp} (${curStats.rawHp})`;

    const nextHpEl = document.getElementById('upg-next-hp');
    if (nextHpEl) nextHpEl.textContent = u.isAirstrike ? `Phá nhà ${Math.round(u.baseDamage * (1 + permLv * 0.12))}` : `${nextStats.hp} (${nextStats.rawHp})`;

    const gasEl = document.getElementById('upg-unit-gas');
    if (gasEl) gasEl.textContent = `${u.cost} Xăng`;

    const costEl = document.getElementById('upg-cost-coins');
    if (costEl) costEl.textContent = metaState.isAdminMode ? '🪙 0 (ADMIN ∞)' : `🪙 ${formatCurrency(costCoins)}`;

    const btnUpg = document.getElementById('btn-confirm-unit-upgrade');
    if (btnUpg) {
        btnUpg.disabled = !metaState.isAdminMode && metaState.coins < costCoins;
    }

    const btnRefund = document.getElementById('btn-open-level-refund');
    if (btnRefund) {
        btnRefund.disabled = permLv <= 1;
    }

    renderUnitSocketsInModal(u.id);
    document.getElementById('unit-upgrade-modal')?.classList.add('active');
}

export function updateLevelRefundModalCalculation() {
    const u = UNIT_BY_ID[inspectingUnitId];
    if (!u) return;

    const curLv = metaState.armyPermanentLevels[u.id] || 1;
    const inputEl = document.getElementById('refund-target-level-input');
    const previewEl = document.getElementById('refund-target-lv-preview');
    const coinsValEl = document.getElementById('refund-total-coins-val');
    const errEl = document.getElementById('refund-error-msg');
    const confirmBtn = document.getElementById('btn-confirm-level-refund');

    const rawTarget = Math.floor(Number(inputEl?.value));
    const isValid = Number.isFinite(rawTarget) && rawTarget >= 1 && rawTarget < curLv;

    if (previewEl) {
        previewEl.textContent = isValid ? `LV.${rawTarget}` : '---';
    }

    if (isValid) {
        const refundCoins = calcTotalRefundCoins(rawTarget, curLv);
        if (coinsValEl) coinsValEl.textContent = `+🪙 ${refundCoins.toLocaleString('en-US')}`;
        if (errEl) errEl.classList.add('hidden');
        if (confirmBtn) confirmBtn.disabled = false;
    } else {
        if (coinsValEl) coinsValEl.textContent = '+🪙 0';
        if (errEl) errEl.classList.remove('hidden');
        if (confirmBtn) confirmBtn.disabled = true;
    }
}

export function openLevelRefundModal() {
    const u = UNIT_BY_ID[inspectingUnitId];
    if (!u) return;
    const curLv = metaState.armyPermanentLevels[u.id] || 1;
    if (curLv <= 1) {
        if (sfxRef) sfxRef.play('cannon');
        return;
    }

    if (sfxRef) sfxRef.play('gas');
    const titleEl = document.getElementById('refund-unit-title');
    const curLvEl = document.getElementById('refund-current-lv');
    const inputEl = document.getElementById('refund-target-level-input');

    if (titleEl) titleEl.textContent = `${u.name.toUpperCase()} (HIỆN TẠI LV.${curLv})`;
    if (curLvEl) curLvEl.textContent = `LV.${curLv}`;
    if (inputEl) {
        inputEl.min = '1';
        inputEl.max = String(curLv - 1);
        inputEl.value = '1';
    }

    updateLevelRefundModalCalculation();
    document.getElementById('level-refund-modal')?.classList.add('active');
}

// ============================================================================
// CHẾ ĐỘ MERGE: GHÉP TƯỚNG VÀ CASCADE AUTO-MERGE (ĐỒNG BỘ ID KHÔNG MẤT THẺ)
// ============================================================================
export function renderMergeWorkbenchAndInventory() {
    const slot1El = document.getElementById('merge-slot-1');
    const slot2El = document.getElementById('merge-slot-2');
    const slotResEl = document.getElementById('merge-slot-result');
    const btnMergeExec = document.getElementById('btn-execute-merge');
    const hintEl = document.getElementById('merge-hint-text');
    const invGrid = document.getElementById('merge-inventory-grid');
    const headingEl = document.getElementById('army-panel-title');

    if (headingEl && currentArmyMode === 'merge') {
        headingEl.textContent = `GHÉP TƯỚNG (${metaState.inventory.length.toLocaleString('en-US')} THẺ)`;
    }

    const card1 = metaState.inventory.find(c => c.uid === mergeSelectedCardUids[0]) || null;
    const card2 = metaState.inventory.find(c => c.uid === mergeSelectedCardUids[1]) || null;

    const renderMiniSlotCard = (slotEl, cardObj, placeholderText) => {
        if (!slotEl) return;
        if (!cardObj) {
            slotEl.className = 'merge-slot';
            slotEl.innerHTML = `<span class="merge-slot-placeholder">${placeholderText}</span>`;
            return;
        }
        const u = UNIT_BY_ID[normalizeUnitId(cardObj.unitId)];
        const rCfg = RARITY_CONFIG[cardObj.rarity] || RARITY_CONFIG.common;
        const spriteUrl = (atlasRef && atlasRef.ready && u) ? atlasRef.toDataURL(u.spriteCol, 7) : '';
        slotEl.className = `merge-slot ${rCfg.cssClass}`;
        slotEl.innerHTML = `
            <img src="${spriteUrl}" class="w-7 h-7 pixel-art" alt="${u?.name || ''}" />
            <span class="text-[7px] font-black text-white leading-none mt-0.5 text-center">${rCfg.name}</span>
        `;
    };

    renderMiniSlotCard(slot1El, card1, '+ THẺ 1');
    renderMiniSlotCard(slot2El, card2, '+ THẺ 2');

    if (
        card1 &&
        card2 &&
        normalizeUnitId(card1.unitId) === normalizeUnitId(card2.unitId) &&
        card1.rarity === card2.rarity
    ) {
        const nextRarityId = RARITY_CONFIG[card1.rarity]?.next;
        if (nextRarityId && RARITY_CONFIG[nextRarityId]) {
            const u = UNIT_BY_ID[normalizeUnitId(card1.unitId)];
            const nextRCfg = RARITY_CONFIG[nextRarityId];
            const spriteUrl = (atlasRef && atlasRef.ready && u) ? atlasRef.toDataURL(u.spriteCol, 7) : '';
            if (slotResEl) {
                slotResEl.className = `merge-slot result-slot ${nextRCfg.cssClass}`;
                slotResEl.innerHTML = `
                    <img src="${spriteUrl}" class="w-8 h-8 pixel-art" alt="${u?.name || ''}" />
                    <span class="text-[7px] font-black text-white leading-none mt-0.5 text-center">${nextRCfg.name}</span>
                `;
            }
            if (btnMergeExec) btnMergeExec.disabled = false;
            if (hintEl && u) {
                hintEl.innerHTML = `Sẵn sàng ghép 2 <b>${u.name} (${RARITY_CONFIG[card1.rarity].name})</b> ➔ <b class="text-amber-300">${nextRCfg.name} (${nextRCfg.mult}x)</b>!`;
            }
        }
    } else {
        if (slotResEl) {
            slotResEl.className = 'merge-slot result-slot';
            slotResEl.innerHTML = `<span class="merge-slot-placeholder">KẾT QUẢ</span>`;
        }
        if (btnMergeExec) btnMergeExec.disabled = true;
        if (card1) {
            const u = UNIT_BY_ID[normalizeUnitId(card1.unitId)];
            const rCfg = RARITY_CONFIG[card1.rarity];
            if (hintEl && u && rCfg) {
                hintEl.innerHTML = `Hãy chọn thêm 1 thẻ <b>${u.name} (${rCfg.name})</b> giống hệt để ghép!`;
            }
        } else if (hintEl) {
            hintEl.innerHTML = `Chọn 2 thẻ <b>cùng tên & cùng độ hiếm</b> hoặc bấm <b>⚡ AUTO MERGE</b> để ghép dây chuyền lên tới <b>Mythic / Secret +5</b>!`;
        }
    }

    if (!invGrid) return;
    invGrid.innerHTML = '';

    const stackGroups = new Map();
    for (let i = 0; i < metaState.inventory.length; i++) {
        const c = metaState.inventory[i];
        const normId = normalizeUnitId(c.unitId);
        c.unitId = normId;
        const key = `${normId}__${c.rarity}`;
        let grp = stackGroups.get(key);
        if (!grp) {
            grp = {
                unitId: normId,
                rarity: c.rarity,
                rank: RARITY_CONFIG[c.rarity]?.rank ?? 0,
                totalCount: 0,
                sampleCards: []
            };
            stackGroups.set(key, grp);
        }
        grp.totalCount++;
        if (grp.sampleCards.length < 2 || mergeSelectedCardUids.includes(c.uid)) {
            if (!grp.sampleCards.some(sc => sc.uid === c.uid)) {
                if (grp.sampleCards.length < 2) {
                    grp.sampleCards.push(c);
                } else {
                    grp.sampleCards[1] = c;
                }
            }
        }
    }

    const sortedGroups = Array.from(stackGroups.values()).sort((a, b) => {
        if (b.rank !== a.rank) return b.rank - a.rank;
        return a.unitId.localeCompare(b.unitId);
    });

    const fragment = document.createDocumentFragment();

    sortedGroups.forEach(grp => {
        const u = UNIT_BY_ID[grp.unitId];
        const rCfg = RARITY_CONFIG[grp.rarity] || RARITY_CONFIG.common;
        if (!u) return;

        const isMaxRarity = !rCfg.next;
        const permLv = metaState.armyPermanentLevels[u.id] || 1;
        const spriteUrl = (atlasRef && atlasRef.ready) ? atlasRef.toDataURL(u.spriteCol, 7) : '';

        grp.sampleCards.forEach((cardObj, idx) => {
            const isSelected = mergeSelectedCardUids.includes(cardObj.uid);
            let isDimmed = false;
            if (isMaxRarity) isDimmed = true;
            else if (card1 && !isSelected) {
                if (
                    normalizeUnitId(cardObj.unitId) !== normalizeUnitId(card1.unitId) ||
                    cardObj.rarity !== card1.rarity
                ) {
                    isDimmed = true;
                }
            }

            const showStackBadge = idx === 0 && grp.totalCount > 2;

            const cardEl = document.createElement('div');
            cardEl.className = `army-unit-card ${rCfg.cssClass}` +
                (isSelected ? ' selected-for-merge' : '') +
                (isDimmed ? ' dimmed-unmatch' : '');

            cardEl.innerHTML = `
                <div class="card-top-lv">
                    <span>LV.${permLv}</span>
                    ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : `<span class="text-[8px]">${rCfg.name}</span>`}
                </div>
                <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-1 drop-shadow" alt="${u.name}" />
                ${showStackBadge ? `<span class="card-qty-badge">x${grp.totalCount.toLocaleString('en-US')}</span>` : ''}
                <div class="card-unit-title">${u.name}</div>
            `;

            cardEl.addEventListener('click', () => {
                showcaseUnitId = u.id;
                renderArmyShowcaseCanvas();

                if (isSelected) {
                    mergeSelectedCardUids = mergeSelectedCardUids.filter(id => id !== cardObj.uid);
                    if (sfxRef) sfxRef.play('gas');
                    renderMergeWorkbenchAndInventory();
                    return;
                }

                if (isMaxRarity) {
                    if (sfxRef) sfxRef.play('cannon');
                    return;
                }

                if (mergeSelectedCardUids.length === 0) {
                    mergeSelectedCardUids.push(cardObj.uid);
                    if (sfxRef) sfxRef.play('gas');
                } else if (mergeSelectedCardUids.length === 1) {
                    const firstCard = metaState.inventory.find(c => c.uid === mergeSelectedCardUids[0]);
                    if (
                        firstCard &&
                        normalizeUnitId(firstCard.unitId) === normalizeUnitId(cardObj.unitId) &&
                        firstCard.rarity === cardObj.rarity
                    ) {
                        mergeSelectedCardUids.push(cardObj.uid);
                        if (sfxRef) sfxRef.play('spawn');
                    } else {
                        mergeSelectedCardUids = [cardObj.uid];
                        if (sfxRef) sfxRef.play('gas');
                    }
                } else {
                    mergeSelectedCardUids = [cardObj.uid];
                    if (sfxRef) sfxRef.play('gas');
                }
                renderMergeWorkbenchAndInventory();
            });

            fragment.appendChild(cardEl);
        });
    });

    invGrid.appendChild(fragment);
}

// ============================================================================
// KHỞI TẠO BỘ LẮNG NGHE SỰ KIỆN SẢNH (INIT LOBBY LISTENERS)
// ============================================================================
export function initLobby({ sfx, atlas, renderMap, onStartBattle, onRenderMapPreview }) {
    sfxRef = sfx;
    atlasRef = atlas;
    onStartBattleCallback = onStartBattle;

    if (typeof onRenderMapPreview === 'function') {
        onRenderMapPreviewCallback = onRenderMapPreview;
    } else if (typeof renderMap === 'function') {
        onRenderMapPreviewCallback = (lv) => {
            const previewCanvas = document.getElementById('selected-map-preview');
            if (!previewCanvas) return;
            const pCtx = previewCanvas.getContext('2d');
            pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            renderMap(pCtx, previewCanvas.width, previewCanvas.height, lv, true);
        };
    }

    loadProgress();

    // Rung xúc giác chung cho mọi nút tương tác
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button, .btn-3d, .army-unit-card, .diff-pill-btn, .mode-pill-btn, .special-mode-pill, .nav-tab-btn, .side-feature-btn');
        if (btn && !btn.disabled) {
            triggerHaptic(15);
        }
    });

    // 1. Chuyển Tab Navigation
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            if (tab) switchLobbyTab(tab);
        });
    });

    // 2. Popup Đặt tên
    document.getElementById('btn-edit-name')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        checkAndPromptPlayerName(true);
    });

    document.getElementById('btn-confirm-name')?.addEventListener('click', () => {
        const input = document.getElementById('player-name-input');
        const errEl = document.getElementById('name-error-msg');
        if (!input) return;

        const val = input.value.trim();
        if (val.length < 1 || val.length > 14) {
            if (errEl) errEl.classList.remove('hidden');
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        metaState.playerName = val;
        saveProgress();
        updateTopBarUI();
        if (sfxRef) sfxRef.play('upgrade');
        document.getElementById('name-modal')?.classList.remove('active');
    });

    // 3. Settings, Admin Mode và Reset Account
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        renderSettingsModalUI();
        document.getElementById('settings-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
        document.getElementById('settings-modal')?.classList.remove('active');
    });

    document.getElementById('btn-toggle-admin-form')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        document.getElementById('admin-password-form')?.classList.toggle('hidden');
    });

    document.getElementById('btn-submit-admin-pass')?.addEventListener('click', () => {
        const passInput = document.getElementById('admin-password-input');
        const fb = document.getElementById('admin-auth-feedback');
        if (!passInput || !fb) return;

        const enteredPass = passInput.value.trim();
        fb.classList.remove('hidden');

        if (enteredPass === (ADMIN_PASSWORD || 'HUNGADMINDZ')) {
            metaState.isAdminMode = true;
            saveProgress();
            updateTopBarUI();
            if (sfxRef) sfxRef.play('upgrade');
            renderSettingsModalUI();
            if (currentLobbyTab === 'battle') renderStageScreenUI();
        } else {
            fb.className = 'text-[11px] font-extrabold mt-1.5 text-center text-rose-600';
            fb.textContent = '❌ Mật khẩu Admin không chính xác!';
            if (sfxRef) sfxRef.play('cannon');
        }
    });

    document.getElementById('btn-Return-normal-mode')?.addEventListener('click', () => {
        metaState.isAdminMode = false;
        saveProgress();
        updateTopBarUI();
        if (sfxRef) sfxRef.play('gas');
        renderSettingsModalUI();
        if (currentLobbyTab === 'battle') renderStageScreenUI();
    });

    document.getElementById('btn-settings-rename')?.addEventListener('click', () => {
        document.getElementById('settings-modal')?.classList.remove('active');
        checkAndPromptPlayerName(true);
    });

    document.getElementById('btn-settings-sound')?.addEventListener('click', (e) => {
        if (!sfxRef) return;
        sfxRef.enabled = !sfxRef.enabled;
        e.currentTarget.textContent = sfxRef.enabled ? '🔊 ÂM THANH: BẬT' : '🔇 ÂM THANH: TẮT';
        sfxRef.play('gas');
    });

    document.getElementById('btn-reset-account-data')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('cannon');
        document.getElementById('reset-confirm-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-reset-confirm')?.addEventListener('click', () => {
        document.getElementById('reset-confirm-modal')?.classList.remove('active');
    });

    document.getElementById('btn-cancel-reset-data')?.addEventListener('click', () => {
        document.getElementById('reset-confirm-modal')?.classList.remove('active');
    });

    document.getElementById('btn-confirm-reset-data')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('boom');
        resetAllAccountData();
    });

    // 4. Tab Battle: Chọn Map, Độ Khó, 2 Hình Thức Chuẩn & 4 Chế Độ Đặc Biệt
    document.getElementById('btn-prev-stage')?.addEventListener('click', () => {
        if (currentStageViewLevel > 1) {
            currentStageViewLevel--;
            currentSelectedDifficulty = getDefaultDifficultyForMap(currentStageViewLevel);
            if (sfxRef) sfxRef.play('gas');
            renderStageScreenUI();
        }
    });

    document.getElementById('btn-next-stage')?.addEventListener('click', () => {
        if (currentStageViewLevel < getMaxUnlockedMapLevel()) {
            currentStageViewLevel++;
            currentSelectedDifficulty = getDefaultDifficultyForMap(currentStageViewLevel);
            if (sfxRef) sfxRef.play('gas');
            renderStageScreenUI();
        }
    });

    DIFFICULTY_ORDER.forEach(diffKey => {
        const btn = document.getElementById(`diff-btn-${diffKey}`);
        if (btn) {
            btn.addEventListener('click', () => {
                if (!isDifficultyUnlocked(currentStageViewLevel, diffKey)) {
                    if (sfxRef) sfxRef.play('cannon');
                    return;
                }
                currentSelectedDifficulty = diffKey;
                if (sfxRef) sfxRef.play('gas');
                renderStageScreenUI();
            });
        }
    });

    BATTLE_MODE_ORDER.forEach(modeKey => {
        const btn = document.getElementById(`mode-btn-${modeKey}`);
        if (btn) {
            btn.addEventListener('click', () => {
                currentSelectedBattleMode = modeKey;
                currentSelectedSpecialMode = 'standard';
                if (sfxRef) sfxRef.play('gas');
                renderStageScreenUI();
            });
        }
    });

    // Hàm dùng chung bật/tắt 4 Chế Độ Chơi Đặc Biệt (Hỗ trợ cả .special-mode-pill lẫn #mode-btn-...)
    const toggleSpecialBattleMode = (spMode) => {
        if (!spMode) return;
        if (currentSelectedSpecialMode === spMode) {
            currentSelectedSpecialMode = 'standard';
        } else {
            currentSelectedSpecialMode = spMode;
        }
        if (sfxRef) sfxRef.play('gas');
        renderStageScreenUI();
    };

    document.querySelectorAll('.special-mode-pill').forEach(btn => {
        btn.dataset.boundSpecial = '1';
        btn.addEventListener('click', () => {
            const spMode = btn.getAttribute('data-special') || btn.getAttribute('data-mode');
            toggleSpecialBattleMode(spMode);
        });
    });

    // Hỗ trợ thêm trường hợp index.html cũ dùng #mode-btn-endless, #mode-btn-autobattler, #mode-btn-bossrush, #btn-toggle-fog-mode
    const fallbackSpecialBtns = [
        { id: 'mode-btn-endless', mode: 'endless' },
        { id: 'mode-btn-autobattler', mode: 'autobattler' },
        { id: 'btn-toggle-fog-mode', mode: 'night_fog' },
        { id: 'mode-btn-bossrush', mode: 'raid_boss' }
    ];
    fallbackSpecialBtns.forEach(({ id, mode }) => {
        const el = document.getElementById(id);
        if (el && !el.dataset.boundSpecial) {
            el.dataset.boundSpecial = '1';
            el.addEventListener('click', () => toggleSpecialBattleMode(mode));
        }
    });

    // Mở & Đóng Modal Cây Kỹ Năng Bị Động Chỉ Huy + Nút Tẩy Điểm
    document.getElementById('btn-open-talents')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        renderMetaTalentsModalUI();
        document.getElementById('talents-modal')?.classList.add('active');
    });

    const closeTalentsModal = () => {
        document.getElementById('talents-modal')?.classList.remove('active');
    };
    document.getElementById('btn-close-talents')?.addEventListener('click', closeTalentsModal);
    document.getElementById('btn-close-talents-bottom')?.addEventListener('click', closeTalentsModal);
    document.querySelector('[data-close="talents-modal"]')?.addEventListener('click', closeTalentsModal);

    document.getElementById('btn-reset-talents')?.addEventListener('click', resetAllMetaTalents);

    // Nút tắt CHIP MOD ở Sảnh Battle
    document.getElementById('btn-quick-army-chips')?.addEventListener('click', () => {
        switchLobbyTab('army');
        openUnitUpgradeModal(showcaseUnitId || PRIMARY_INFANTRY_ID);
    });

    // Nút START bắt đầu trận đấu (Ẩn #lobby-wrapper và truyền đúng mã chế độ vào main.js)
    document.getElementById('btn-start-battle')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('spawn');
        syncLegacyEngineBridges();

        const effectiveMode =
            currentSelectedSpecialMode !== 'standard' && SPECIAL_TO_ENGINE_MODE[currentSelectedSpecialMode]
                ? SPECIAL_TO_ENGINE_MODE[currentSelectedSpecialMode]
                : currentSelectedBattleMode;

        document.getElementById('lobby-wrapper')?.classList.remove('active');

        if (onStartBattleCallback) {
            onStartBattleCallback(
                currentStageViewLevel,
                currentSelectedDifficulty,
                effectiveMode,
                currentSelectedSpecialMode
            );
        }
    });

    // 5. Nhiệm vụ & Giftcode (Đọc phần thưởng chuẩn từ GIFT_CODES gồm cả HUNGDEPTRAI & Medals)
    document.getElementById('btn-open-missions')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        renderMissionsList();
        document.getElementById('mission-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-missions')?.addEventListener('click', () => {
        document.getElementById('mission-modal')?.classList.remove('active');
    });

    document.getElementById('btn-open-code')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        renderGiftcodeModalUI();
        document.getElementById('code-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-code')?.addEventListener('click', () => {
        document.getElementById('code-modal')?.classList.remove('active');
    });

    document.getElementById('btn-submit-code')?.addEventListener('click', () => {
        const input = document.getElementById('giftcode-input');
        const fb = document.getElementById('giftcode-feedback');
        if (!input || !fb) return;

        const rawCode = input.value.trim().toUpperCase();
        fb.classList.remove('hidden');

        if (!rawCode) {
            fb.className = 'text-xs font-extrabold mt-2 text-rose-600';
            fb.textContent = '⚠️ Vui lòng nhập mã Giftcode!';
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        if (!OFFICIAL_GIFTCODES.includes(rawCode)) {
            fb.className = 'text-xs font-extrabold mt-2 text-rose-600';
            fb.textContent = '❌ Mã Giftcode không hợp lệ hoặc không tồn tại!';
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        if (!Array.isArray(metaState.usedCodes)) metaState.usedCodes = [];

        if (metaState.usedCodes.includes(rawCode)) {
            fb.className = 'text-xs font-extrabold mt-2 text-amber-600';
            fb.textContent = '⚠️ Mã Giftcode này đã được sử dụng trên tài khoản này rồi!';
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        const rewardPack = (GIFT_CODES && GIFT_CODES[rawCode]) || {
            gems: GIFTCODE_REWARD_GEMS,
            coins: GIFTCODE_REWARD_COINS,
            medals: 15
        };

        metaState.usedCodes.push(rawCode);
        metaState.gems += Number(rewardPack.gems) || GIFTCODE_REWARD_GEMS;
        metaState.coins += Number(rewardPack.coins) || GIFTCODE_REWARD_COINS;
        metaState.medals = (metaState.medals || 0) + (Number(rewardPack.medals) || 0);

        saveProgress();
        updateTopBarUI();
        if (sfxRef) sfxRef.play('upgrade');

        const medalMsg = rewardPack.medals ? ` & +${rewardPack.medals} 🎖️` : '';
        fb.className = 'text-xs font-extrabold mt-2 text-emerald-600';
        fb.innerHTML = `🎉 NHẬP QUÀ THÀNH CÔNG! (+${ (Number(rewardPack.gems) || 0).toLocaleString('en-US') } 💎, +${ (Number(rewardPack.coins) || 0).toLocaleString('en-US') } 🪙${medalMsg})`;
        input.value = '';
        renderGiftcodeModalUI();
    });

    // 6. Shop & Gacha Modal Listeners
    document.getElementById('btn-open-leg-1')?.addEventListener('click', () => requestOpenGachaCrate('legendary', 1));
    document.getElementById('btn-open-leg-10')?.addEventListener('click', () => requestOpenGachaCrate('legendary', 10));
    document.getElementById('btn-open-leg-custom')?.addEventListener('click', () => {
        const val = document.getElementById('input-custom-leg-count')?.value || 20;
        requestOpenGachaCrate('legendary', val);
    });

    document.getElementById('btn-open-epic-1')?.addEventListener('click', () => requestOpenGachaCrate('epic', 1));
    document.getElementById('btn-open-epic-10')?.addEventListener('click', () => requestOpenGachaCrate('epic', 10));
    document.getElementById('btn-open-epic-custom')?.addEventListener('click', () => {
        const val = document.getElementById('input-custom-epic-count')?.value || 20;
        requestOpenGachaCrate('epic', val);
    });

    document.getElementById('btn-close-gacha-confirm')?.addEventListener('click', () => {
        document.getElementById('gacha-confirm-modal')?.classList.remove('active');
    });

    document.getElementById('btn-cancel-custom-gacha')?.addEventListener('click', () => {
        document.getElementById('gacha-confirm-modal')?.classList.remove('active');
    });

    document.getElementById('btn-confirm-custom-gacha')?.addEventListener('click', () => {
        if (!pendingGachaData) return;
        const { qty, finalCost, isLegendary } = pendingGachaData;

        if (!metaState.isAdminMode && metaState.gems < finalCost) {
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        if (!metaState.isAdminMode) {
            metaState.gems -= finalCost;
        }
        metaState.missionsProgress.cratesOpened = (metaState.missionsProgress.cratesOpened || 0) + qty;

        const oddsTable = isLegendary
            ? [
                { rarity: 'uncommon', weight: 50 },
                { rarity: 'rare', weight: 35 },
                { rarity: 'epic', weight: 12 },
                { rarity: 'legendary', weight: 3 }
            ]
            : [
                { rarity: 'common', weight: 55 },
                { rarity: 'uncommon', weight: 30 },
                { rarity: 'rare', weight: 12 },
                { rarity: 'epic', weight: 3 }
            ];

        const unitRarityCounts = new Map();
        const rarityTotals = {};
        const singlePulledCards = [];
        const numUnits = UNIT_CATALOG.length;
        const baseUid = Date.now().toString(36);

        for (let i = 0; i < qty; i++) {
            const rarity = rollRarityFromTable(oddsTable);
            const randomUnit = UNIT_CATALOG[(Math.random() * numUnits) | 0];
            const normId = normalizeUnitId(randomUnit.id);
            const newCard = {
                uid: `g_${baseUid}_${i}`,
                unitId: normId,
                rarity
            };
            metaState.inventory.push(newCard);

            rarityTotals[rarity] = (rarityTotals[rarity] || 0) + 1;
            const aggKey = `${normId}__${rarity}`;
            unitRarityCounts.set(aggKey, (unitRarityCounts.get(aggKey) || 0) + 1);

            if (qty <= 10) {
                singlePulledCards.push(newCard);
            }
        }

        saveProgress();
        updateTopBarUI();
        if (sfxRef) sfxRef.play('upgrade');
        document.getElementById('gacha-confirm-modal')?.classList.remove('active');

        const resModal = document.getElementById('gacha-result-modal');
        const titleEl = document.getElementById('gacha-modal-title');
        const sumBanner = document.getElementById('gacha-total-pulled');
        const breakdownEl = document.getElementById('gacha-rarity-breakdown');
        const gridEl = document.getElementById('gacha-cards-grid');

        if (titleEl) {
            titleEl.textContent = isLegendary
                ? `👑 KẾT QUẢ LEGENDARY CRATE X${qty.toLocaleString('en-US')}`
                : `🧰 KẾT QUẢ EPIC CRATE X${qty.toLocaleString('en-US')}`;
        }
        if (sumBanner) sumBanner.textContent = `${qty.toLocaleString('en-US')} thẻ tướng`;

        if (breakdownEl) {
            breakdownEl.innerHTML = '';
            const orderedRarities = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
            let hasAny = false;
            orderedRarities.forEach(rKey => {
                const count = rarityTotals[rKey] || 0;
                if (count > 0) {
                    hasAny = true;
                    const rCfg = RARITY_CONFIG[rKey];
                    const pill = document.createElement('span');
                    pill.className = `gacha-rarity-stat-pill ${rCfg.cssClass}`;
                    pill.textContent = `${rCfg.name}: ${count.toLocaleString('en-US')}`;
                    breakdownEl.appendChild(pill);
                }
            });
            breakdownEl.classList.toggle('hidden', !hasAny);
        }

        if (gridEl) {
            gridEl.innerHTML = '';
            const fragment = document.createDocumentFragment();

            if (qty <= 10) {
                singlePulledCards.forEach(c => {
                    const u = UNIT_BY_ID[normalizeUnitId(c.unitId)];
                    const rCfg = RARITY_CONFIG[c.rarity] || RARITY_CONFIG.common;
                    if (!u) return;
                    const spriteUrl = (atlasRef && atlasRef.ready) ? atlasRef.toDataURL(u.spriteCol, 7) : '';

                    const cardEl = document.createElement('div');
                    cardEl.className = `army-unit-card ${rCfg.cssClass}`;
                    cardEl.innerHTML = `
                        <div class="card-top-lv">
                            <span>${rCfg.name.toUpperCase()}</span>
                            ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : ''}
                        </div>
                        <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-1 drop-shadow" alt="${u.name}" />
                        <div class="card-unit-title">${u.name}</div>
                    `;
                    fragment.appendChild(cardEl);
                });
            } else {
                const aggregatedEntries = Array.from(unitRarityCounts.entries()).map(([key, count]) => {
                    const [unitId, rarity] = key.split('__');
                    return {
                        unitId,
                        rarity,
                        count,
                        rank: RARITY_CONFIG[rarity]?.rank ?? 0
                    };
                }).sort((a, b) => {
                    if (b.rank !== a.rank) return b.rank - a.rank;
                    return b.count - a.count;
                });

                aggregatedEntries.forEach(item => {
                    const u = UNIT_BY_ID[normalizeUnitId(item.unitId)];
                    const rCfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
                    if (!u) return;
                    const spriteUrl = (atlasRef && atlasRef.ready) ? atlasRef.toDataURL(u.spriteCol, 7) : '';

                    const cardEl = document.createElement('div');
                    cardEl.className = `army-unit-card ${rCfg.cssClass}`;
                    cardEl.innerHTML = `
                        <div class="card-top-lv">
                            <span>${rCfg.name.toUpperCase()}</span>
                            ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : ''}
                        </div>
                        <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-1 drop-shadow" alt="${u.name}" />
                        <span class="card-qty-badge">x${item.count.toLocaleString('en-US')}</span>
                        <div class="card-unit-title">${u.name}</div>
                    `;
                    fragment.appendChild(cardEl);
                });
            }

            gridEl.appendChild(fragment);
        }

        if (resModal) resModal.classList.add('active');
    });

    document.getElementById('btn-close-gacha')?.addEventListener('click', () => {
        document.getElementById('gacha-result-modal')?.classList.remove('active');
        if (currentLobbyTab === 'army') renderArmyTabUI();
    });

    // 7. Tab Army (Chuyển chế độ Army / Merge, Nâng cấp & Hoàn cấp)
    document.getElementById('btn-mode-army')?.addEventListener('click', () => {
        currentArmyMode = 'army';
        if (sfxRef) sfxRef.play('gas');
        renderArmyTabUI();
    });

    document.getElementById('btn-mode-merge')?.addEventListener('click', () => {
        currentArmyMode = 'merge';
        mergeSelectedCardUids = [];
        if (sfxRef) sfxRef.play('gas');
        renderArmyTabUI();
    });

    document.getElementById('btn-close-upg-modal')?.addEventListener('click', () => {
        document.getElementById('unit-upgrade-modal')?.classList.remove('active');
    });

    document.getElementById('btn-confirm-unit-upgrade')?.addEventListener('click', () => {
        const u = UNIT_BY_ID[inspectingUnitId];
        if (!u) return;

        const permLv = metaState.armyPermanentLevels[u.id] || 1;
        const costCoins = getUnitUpgradeCost(permLv);

        if (!metaState.isAdminMode && metaState.coins < costCoins) {
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        if (!metaState.isAdminMode) {
            metaState.coins -= costCoins;
        }
        metaState.armyPermanentLevels[u.id] = permLv + 1;
        metaState.missionsProgress.upgrades = (metaState.missionsProgress.upgrades || 0) + 1;

        saveProgress();
        if (sfxRef) sfxRef.play('upgrade');
        updateTopBarUI();
        renderArmyTabUI();
        openUnitUpgradeModal(u.id);
    });

    document.getElementById('btn-open-level-refund')?.addEventListener('click', openLevelRefundModal);

    document.getElementById('btn-close-refund-modal')?.addEventListener('click', () => {
        document.getElementById('level-refund-modal')?.classList.remove('active');
    });

    document.getElementById('btn-cancel-level-refund')?.addEventListener('click', () => {
        document.getElementById('level-refund-modal')?.classList.remove('active');
    });

    document.getElementById('refund-target-level-input')?.addEventListener('input', updateLevelRefundModalCalculation);

    document.getElementById('btn-refund-lv-min')?.addEventListener('click', () => {
        const inputEl = document.getElementById('refund-target-level-input');
        if (inputEl) {
            inputEl.value = '1';
            if (sfxRef) sfxRef.play('gas');
            updateLevelRefundModalCalculation();
        }
    });

    document.getElementById('btn-refund-lv-max')?.addEventListener('click', () => {
        const u = UNIT_BY_ID[inspectingUnitId];
        const curLv = u ? (metaState.armyPermanentLevels[u.id] || 1) : 1;
        const inputEl = document.getElementById('refund-target-level-input');
        if (inputEl && curLv > 1) {
            inputEl.value = String(curLv - 1);
            if (sfxRef) sfxRef.play('gas');
            updateLevelRefundModalCalculation();
        }
    });

    document.getElementById('btn-refund-lv-minus')?.addEventListener('click', () => {
        const u = UNIT_BY_ID[inspectingUnitId];
        const curLv = u ? (metaState.armyPermanentLevels[u.id] || 1) : 1;
        const inputEl = document.getElementById('refund-target-level-input');
        if (!inputEl) return;
        const curVal = Math.floor(Number(inputEl.value) || 1);
        inputEl.value = String(Math.max(1, Math.min(curLv - 1, curVal - 1)));
        if (sfxRef) sfxRef.play('gas');
        updateLevelRefundModalCalculation();
    });

    document.getElementById('btn-refund-lv-plus')?.addEventListener('click', () => {
        const u = UNIT_BY_ID[inspectingUnitId];
        const curLv = u ? (metaState.armyPermanentLevels[u.id] || 1) : 1;
        const inputEl = document.getElementById('refund-target-level-input');
        if (!inputEl) return;
        const curVal = Math.floor(Number(inputEl.value) || 1);
        inputEl.value = String(Math.max(1, Math.min(curLv - 1, curVal + 1)));
        if (sfxRef) sfxRef.play('gas');
        updateLevelRefundModalCalculation();
    });

    document.getElementById('btn-confirm-level-refund')?.addEventListener('click', () => {
        const u = UNIT_BY_ID[inspectingUnitId];
        if (!u) return;

        const curLv = metaState.armyPermanentLevels[u.id] || 1;
        const inputEl = document.getElementById('refund-target-level-input');
        const targetLv = Math.floor(Number(inputEl?.value));

        if (!Number.isFinite(targetLv) || targetLv < 1 || targetLv >= curLv) {
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        const refundCoins = calcTotalRefundCoins(targetLv, curLv);
        metaState.coins += refundCoins;
        metaState.armyPermanentLevels[u.id] = targetLv;

        saveProgress();
        if (sfxRef) sfxRef.play('upgrade');
        document.getElementById('level-refund-modal')?.classList.remove('active');
        updateTopBarUI();
        renderArmyTabUI();
        openUnitUpgradeModal(u.id);
    });

    // 8. Bàn Merge Slots
    document.getElementById('merge-slot-1')?.addEventListener('click', () => {
        if (mergeSelectedCardUids.length > 0) {
            mergeSelectedCardUids.shift();
            if (sfxRef) sfxRef.play('gas');
            renderMergeWorkbenchAndInventory();
        }
    });

    document.getElementById('merge-slot-2')?.addEventListener('click', () => {
        if (mergeSelectedCardUids.length > 1) {
            mergeSelectedCardUids.pop();
            if (sfxRef) sfxRef.play('gas');
            renderMergeWorkbenchAndInventory();
        }
    });

    document.getElementById('btn-execute-merge')?.addEventListener('click', () => {
        if (mergeSelectedCardUids.length < 2) return;
        const card1 = metaState.inventory.find(c => c.uid === mergeSelectedCardUids[0]);
        const card2 = metaState.inventory.find(c => c.uid === mergeSelectedCardUids[1]);

        if (!card1 || !card2) return;
        const normId1 = normalizeUnitId(card1.unitId);
        const normId2 = normalizeUnitId(card2.unitId);
        if (normId1 !== normId2 || card1.rarity !== card2.rarity) return;

        const nextRarity = RARITY_CONFIG[card1.rarity]?.next;
        if (!nextRarity) return;

        const removeSet = new Set([card1.uid, card2.uid]);
        metaState.inventory = metaState.inventory.filter(c => !removeSet.has(c.uid));

        const newCard = {
            uid: nextCompactUid('m'),
            unitId: normId1,
            rarity: nextRarity
        };
        metaState.inventory.push(newCard);

        metaState.missionsProgress.merges = (metaState.missionsProgress.merges || 0) + 1;

        mergeSelectedCardUids = [];
        showcaseUnitId = normId1;

        saveProgress();
        if (sfxRef) sfxRef.play('upgrade');
        updateTopBarUI();
        renderArmyTabUI();

        const u = UNIT_BY_ID[normId1];
        const nextRCfg = RARITY_CONFIG[nextRarity];
        const hintEl = document.getElementById('merge-hint-text');
        if (hintEl && u && nextRCfg) {
            hintEl.innerHTML = `🎉 GHÉP THÀNH CÔNG: <b>${u.name}</b> tiến hóa lên bậc <b class="text-amber-300">${nextRCfg.name} (${nextRCfg.mult}x)</b>!`;
        }
    });

    // 9. Cascade Auto Merge Dây chuyền (Chuẩn hóa ID trước khi gộp để không bao giờ mất thẻ Bộ Binh)
    document.getElementById('btn-auto-merge')?.addEventListener('click', () => {
        const countsByUnit = {};
        UNIT_CATALOG.forEach(u => {
            countsByUnit[u.id] = {};
            RARITY_ORDER.forEach(r => { countsByUnit[u.id][r] = 0; });
        });

        for (let i = 0; i < metaState.inventory.length; i++) {
            const c = metaState.inventory[i];
            const normId = normalizeUnitId(c.unitId);
            if (countsByUnit[normId] && countsByUnit[normId][c.rarity] !== undefined) {
                countsByUnit[normId][c.rarity]++;
            }
        }

        let totalMergeOperations = 0;
        const newlyCreatedCounts = {};
        UNIT_CATALOG.forEach(u => {
            newlyCreatedCounts[u.id] = {};
        });

        UNIT_CATALOG.forEach(u => {
            const uCounts = countsByUnit[u.id];
            for (let rIdx = 0; rIdx < RARITY_ORDER.length - 1; rIdx++) {
                const curR = RARITY_ORDER[rIdx];
                const nextR = RARITY_CONFIG[curR]?.next;
                if (!nextR) continue;

                const currentTotal = uCounts[curR] || 0;
                if (currentTotal >= 2) {
                    const pairs = Math.floor(currentTotal / 2);
                    const remainder = currentTotal % 2;

                    uCounts[curR] = remainder;
                    uCounts[nextR] = (uCounts[nextR] || 0) + pairs;

                    if (newlyCreatedCounts[u.id][curR]) {
                        newlyCreatedCounts[u.id][curR] = Math.min(newlyCreatedCounts[u.id][curR], remainder);
                    }
                    newlyCreatedCounts[u.id][nextR] = (newlyCreatedCounts[u.id][nextR] || 0) + pairs;
                    totalMergeOperations += pairs;
                }
            }
        });

        if (totalMergeOperations === 0) {
            if (sfxRef) sfxRef.play('cannon');
            alert('Không tìm thấy cặp thẻ nào cùng tên & cùng độ hiếm trong kho để tự động ghép!');
            return;
        }

        const rebuiltInventory = [];
        const summaryItems = [];

        UNIT_CATALOG.forEach(u => {
            const uCounts = countsByUnit[u.id];
            RARITY_ORDER.forEach(r => {
                const qty = uCounts[r] || 0;
                for (let k = 0; k < qty; k++) {
                    rebuiltInventory.push({
                        uid: nextCompactUid('am'),
                        unitId: u.id,
                        rarity: r
                    });
                }
                const createdStillRemaining = Math.min(qty, newlyCreatedCounts[u.id][r] || 0);
                if (createdStillRemaining > 0) {
                    summaryItems.push({
                        unitId: u.id,
                        rarity: r,
                        count: createdStillRemaining,
                        rank: RARITY_CONFIG[r]?.rank ?? 0
                    });
                }
            });
        });

        metaState.inventory = rebuiltInventory;
        metaState.missionsProgress.merges = (metaState.missionsProgress.merges || 0) + totalMergeOperations;

        summaryItems.sort((a, b) => {
            if (b.rank !== a.rank) return b.rank - a.rank;
            return b.count - a.count;
        });

        saveProgress();
        if (sfxRef) sfxRef.play('upgrade');
        updateTopBarUI();
        mergeSelectedCardUids = [];
        renderArmyTabUI();

        const amModal = document.getElementById('auto-merge-modal');
        const textEl = document.getElementById('auto-merge-summary-text');
        const gridEl = document.getElementById('auto-merge-results-grid');

        const totalNewCards = summaryItems.reduce((acc, it) => acc + it.count, 0);
        if (textEl) {
            textEl.innerHTML = `⚡ Đã tự động ghép dây chuyền <b>${totalMergeOperations.toLocaleString('en-US')} lần</b>! Tạo ra <b>${totalNewCards.toLocaleString('en-US')} thẻ</b> bậc cao nhất:`;
        }

        if (gridEl) {
            gridEl.innerHTML = '';
            const fragment = document.createDocumentFragment();
            summaryItems.forEach(item => {
                const u = UNIT_BY_ID[item.unitId];
                const rCfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
                const spriteUrl = (atlasRef && atlasRef.ready && u) ? atlasRef.toDataURL(u.spriteCol, 7) : '';

                const cardEl = document.createElement('div');
                cardEl.className = `army-unit-card ${rCfg.cssClass}`;
                cardEl.innerHTML = `
                    <div class="card-top-lv">
                        <span>${rCfg.name.toUpperCase()}</span>
                        ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : ''}
                    </div>
                    <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-1 drop-shadow" alt="${u?.name || ''}" />
                    ${item.count > 1 ? `<span class="card-qty-badge">x${item.count.toLocaleString('en-US')}</span>` : ''}
                    <div class="card-unit-title">${u?.name || ''}</div>
                `;
                fragment.appendChild(cardEl);
            });
            gridEl.appendChild(fragment);
        }

        if (amModal) amModal.classList.add('active');
    });

    document.getElementById('btn-close-auto-merge')?.addEventListener('click', () => {
        document.getElementById('auto-merge-modal')?.classList.remove('active');
    });

    document.getElementById('btn-close-auto-merge-x')?.addEventListener('click', () => {
        document.getElementById('auto-merge-modal')?.classList.remove('active');
    });

    // Khởi chạy đồng bộ UI ban đầu
    updateTopBarUI();
    renderStageScreenUI();
    checkAndPromptPlayerName(false);
}