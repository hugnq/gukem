// ============================================================================
// LOBBY.JS - TOÀN BỘ LOGIC META-GAME, GIAO DIỆN SẢNH CHỜ, KHO HÀNG TỶ THẺ O(1),
// 41 BẬC ĐỘ HIẾM (MASTER +8 & DEMON +10), BULK LEVEL UP, CUSTOM DECK BUILDER,
// VÒNG QUAY MAY MẮN 8 Ô (PITY 100) & TRUNG TÂM 3 MINI-GAME GIẢI TRÍ
// Save Key: tiny_battle_meta_save_v3 (Tương thích ngược 100%)
// ============================================================================

import {
    STORAGE_KEY,
    ADMIN_PASSWORD,
    RARITY_ORDER,
    MAX_RARITY_RANK,
    RARITY_CONFIG,
    isMasterRarity,
    isDemonRarity,
    DIFFICULTY_ORDER,
    BATTLE_MODE_ORDER,
    DIFFICULTY_CONFIG,
    BATTLE_MODE_CONFIG,
    calcStageRewardCoins,
    MAX_CRATE_OPEN_QTY,
    CRATE_CONFIG,
    simulateBulkCrateOpeningO1,
    getUnitUpgradeCost,
    calcBulkUpgradeCost,
    calcMaxAffordableLevels,
    calcTotalRefundCoinsFast,
    formatCompactNumber,
    OFFICIAL_GIFTCODES,
    GIFTCODE_REWARD_GEMS,
    GIFTCODE_REWARD_COINS,
    GIFT_CODES,
    MISSIONS_CATALOG,
    LEVELS,
    UNIT_CATALOG,
    UNIT_BY_ID,
    META_TALENTS,
    UNIT_CHIPS,
    LUCKY_WHEEL_CONFIG,
    MINIGAME_CONFIG
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
// 1. TRẠNG THÁI META-GAME VÀ LƯU TRỮ LOCALSTORAGE (HỖ TRỢ KHO HÀNG TỶ THẺ O(1))
// ============================================================================
export let metaState = {
    playerName: '',
    coins: 350,
    gems: 400,
    medals: 5, // Huy chương nhận từ Map Khó / Raid Boss / Vòng Quay / Mini-Game
    isAdminMode: false,
    usedCodes: [],
    mapDifficultyProgress: {},
    // Cấu trúc lưu trữ kết hợp O(1):
    // - inventoryStacks: lưu chính xác số lượng thẻ từng loại (lên tới hàng tỷ thẻ)
    // - inventory: chỉ giữ tối đa 2 thẻ đại diện mỗi loại để phục vụ giao diện chọn thẻ
    inventoryStacks: {},
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
    raidBossClears: 0,
    wheelPity: 0 // Điểm may mắn Vòng Quay (0 ➔ 100 chắc chắn nổ Jackpot Master/Demon)
};

export let currentLobbyTab = 'battle';
export let currentStageViewLevel = 1;
export let currentSelectedDifficulty = 'easy'; // 'easy' | 'difficult'
export let currentSelectedBattleMode = 'destroy'; // 'destroy' | 'survival'
export let currentSelectedSpecialMode = 'standard'; // 'standard' | 'endless' | 'autobattler' | 'night_fog' | 'raid_boss'
export let currentArmyMode = 'army'; // 'army' | 'merge'
export let showcaseUnitId = PRIMARY_INFANTRY_ID;
export let inspectingUnitId = PRIMARY_INFANTRY_ID;
export let currentBulkAddLevels = 1;
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

export function createDefaultInventoryStacks() {
    const starterUnits = [PRIMARY_INFANTRY_ID, 'bazooka', 'humvee', 'apc'];
    const stacks = {};
    starterUnits.forEach(uId => {
        const normId = normalizeUnitId(uId);
        stacks[`${normId}__common`] = 1;
    });
    return stacks;
}

export function createDefaultInventory() {
    const starterUnits = [PRIMARY_INFANTRY_ID, 'bazooka', 'humvee', 'apc'];
    return starterUnits.map((unitId, idx) => ({
        uid: 'init_card_' + idx + '_' + Date.now(),
        unitId: normalizeUnitId(unitId),
        rarity: 'common'
    }));
}

/**
 * Đồng bộ mảng đại diện `metaState.inventory` (tối đa 2 thẻ cho mỗi khóa `unitId__rarity`)
 * từ `metaState.inventoryStacks`. Nhờ vậy dù người chơi có 10 tỷ thẻ trong kho,
 * mảng `metaState.inventory` không bao giờ vượt quá 2 * 11 * 41 = 902 phần tử!
 */
export function syncRepresentativeInventoryFromStacks() {
    if (!metaState.inventoryStacks || typeof metaState.inventoryStacks !== 'object') {
        metaState.inventoryStacks = createDefaultInventoryStacks();
    }

    const existingMap = new Map();
    if (Array.isArray(metaState.inventory)) {
        for (let i = 0; i < metaState.inventory.length; i++) {
            const c = metaState.inventory[i];
            if (!c) continue;
            const normId = normalizeUnitId(c.unitId);
            const key = `${normId}__${c.rarity}`;
            let list = existingMap.get(key);
            if (!list) {
                list = [];
                existingMap.set(key, list);
            }
            if (list.length < 2) {
                c.unitId = normId;
                list.push(c);
            }
        }
    }

    const repInventory = [];
    for (const [key, rawCount] of Object.entries(metaState.inventoryStacks)) {
        const count = Math.floor(Number(rawCount) || 0);
        if (count <= 0) {
            delete metaState.inventoryStacks[key];
            continue;
        }
        const [rawUnitId, rarity] = key.split('__');
        const unitId = normalizeUnitId(rawUnitId);
        if (!UNIT_BY_ID[unitId] || !RARITY_CONFIG[rarity]) {
            delete metaState.inventoryStacks[key];
            continue;
        }

        const repCount = Math.min(2, count);
        const existingCards = existingMap.get(`${unitId}__${rarity}`) || [];
        for (let i = 0; i < repCount; i++) {
            if (existingCards[i]) {
                repInventory.push(existingCards[i]);
            } else {
                repInventory.push({
                    uid: nextCompactUid('rep'),
                    unitId,
                    rarity
                });
            }
        }
    }

    metaState.inventory = repInventory;
}

/**
 * Cộng thêm hoặc trừ thẻ trực tiếp trên `metaState.inventoryStacks` với độ phức tạp O(1)
 */
export function addCardToStacks(rawUnitId, rarity, deltaCount = 1) {
    const unitId = normalizeUnitId(rawUnitId);
    if (!UNIT_BY_ID[unitId] || !RARITY_CONFIG[rarity]) return;
    const key = `${unitId}__${rarity}`;
    const cur = Math.floor(Number(metaState.inventoryStacks[key]) || 0);
    const nextVal = Math.max(0, cur + Math.floor(Number(deltaCount) || 0));
    if (nextVal > 0) {
        metaState.inventoryStacks[key] = nextVal;
    } else {
        delete metaState.inventoryStacks[key];
    }
}

/**
 * Tổng số thẻ thực tế đang sở hữu trong `metaState.inventoryStacks` (hỗ trợ hàng tỷ thẻ)
 */
export function getTotalCardsInInventory() {
    if (!metaState.inventoryStacks || typeof metaState.inventoryStacks !== 'object') {
        return metaState.inventory?.length || 0;
    }
    let total = 0;
    for (const qty of Object.values(metaState.inventoryStacks)) {
        const n = Math.floor(Number(qty) || 0);
        if (n > 0) total += n;
    }
    return total;
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
 * Chuẩn hóa Đội Hình Chiến Đấu 5 Ô (4 Ô Quân Tự Chọn + Ô 5 Không Kích)
 */
export function normalizeSelectedDeck(rawDeck) {
    const defaultDeck = [PRIMARY_INFANTRY_ID, 'bazooka', 'humvee', 'tank', 'airstrike'];
    if (!Array.isArray(rawDeck) || rawDeck.length < 4) {
        return [...defaultDeck];
    }
    const chosen = [];
    for (let i = 0; i < 4; i++) {
        const uId = normalizeUnitId(rawDeck[i]);
        if (uId && uId !== 'airstrike' && UNIT_BY_ID[uId] && !chosen.includes(uId)) {
            chosen.push(uId);
        }
    }
    const fallbackPool = [PRIMARY_INFANTRY_ID, 'bazooka', 'humvee', 'tank', 'sniper', 'apc'];
    for (const fb of fallbackPool) {
        if (chosen.length >= 4) break;
        if (!chosen.includes(fb)) chosen.push(fb);
    }
    return [chosen[0], chosen[1], chosen[2], chosen[3], 'airstrike'];
}

/**
 * Đồng bộ dữ liệu Cây Bị Động (metaTalents), Khe Chip (unitSockets) và Đội Hình (selectedDeck)
 * sang cấu trúc mà main.js đọc
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

    // 5. Chuẩn hóa selectedDeck 4 ô quân + 1 Không Kích
    metaState.selectedDeck = normalizeSelectedDeck(metaState.selectedDeck);
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
            metaState.wheelPity = Math.max(0, Math.min(100, Number(parsed.wheelPity) || 0));

            metaState.mapDifficultyProgress = defaultMapProg;
            if (parsed.mapDifficultyProgress && typeof parsed.mapDifficultyProgress === 'object') {
                for (let i = 1; i <= LEVELS.length; i++) {
                    if (parsed.mapDifficultyProgress[i]) {
                        metaState.mapDifficultyProgress[i] = normalizeMapProgressEntry(parsed.mapDifficultyProgress[i]);
                    }
                }
            }

            // Nạp kho thẻ: ưu tiên `inventoryStacks` O(1), tương thích ngược 100% với mảng `inventory` cũ
            const loadedStacks = {};
            if (parsed.inventoryStacks && typeof parsed.inventoryStacks === 'object') {
                for (const [key, count] of Object.entries(parsed.inventoryStacks)) {
                    const [rawUnitId, rarity] = key.split('__');
                    const unitId = normalizeUnitId(rawUnitId);
                    const qty = Math.max(0, Math.floor(Number(count) || 0));
                    if (UNIT_BY_ID[unitId] && RARITY_CONFIG[rarity] && qty > 0) {
                        const normKey = `${unitId}__${rarity}`;
                        loadedStacks[normKey] = (loadedStacks[normKey] || 0) + qty;
                    }
                }
            }
            if (Object.keys(loadedStacks).length === 0 && Array.isArray(parsed.inventory) && parsed.inventory.length > 0) {
                parsed.inventory.forEach(item => {
                    if (!item) return;
                    const normId = normalizeUnitId(item.unitId);
                    if (UNIT_BY_ID[normId] && RARITY_CONFIG[item.rarity]) {
                        const key = `${normId}__${item.rarity}`;
                        loadedStacks[key] = (loadedStacks[key] || 0) + 1;
                    }
                });
            }

            metaState.inventoryStacks = Object.keys(loadedStacks).length > 0
                ? loadedStacks
                : createDefaultInventoryStacks();
            syncRepresentativeInventoryFromStacks();

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

            metaState.selectedDeck = normalizeSelectedDeck(parsed.selectedDeck);
        } else {
            metaState.playerName = '';
            metaState.coins = 350;
            metaState.gems = 400;
            metaState.medals = 5;
            metaState.isAdminMode = false;
            metaState.usedCodes = [];
            metaState.mapDifficultyProgress = defaultMapProg;
            metaState.inventoryStacks = createDefaultInventoryStacks();
            syncRepresentativeInventoryFromStacks();
            metaState.armyPermanentLevels = defaultLevels;
            metaState.unitSockets = defaultSockets;
            metaState.selectedDeck = normalizeSelectedDeck(null);
            metaState.wheelPity = 0;
        }
    } catch (e) {
        metaState.mapDifficultyProgress = defaultMapProg;
        metaState.inventoryStacks = createDefaultInventoryStacks();
        syncRepresentativeInventoryFromStacks();
        metaState.armyPermanentLevels = defaultLevels;
        metaState.unitSockets = defaultSockets;
        metaState.selectedDeck = normalizeSelectedDeck(null);
    }

    syncLegacyEngineBridges();
    currentStageViewLevel = getMaxUnlockedMapLevel();
    currentSelectedDifficulty = getDefaultDifficultyForMap(currentStageViewLevel);
}

/**
 * Lưu tiến trình O(1) siêu nhẹ bằng `inventoryStacks` (không bao giờ tràn bộ nhớ LocalStorage dù có 100 tỷ thẻ)
 */
export function saveProgress() {
    syncLegacyEngineBridges();
    syncRepresentativeInventoryFromStacks();
    try {
        const compactPayload = {
            ...metaState,
            inventory: metaState.inventory, // Tối đa <= 902 thẻ đại diện
            inventoryStacks: metaState.inventoryStacks
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(compactPayload));
    } catch (e) {}
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

/**
 * FIX MỤC 1.4: Gỡ bỏ hoàn toàn giới hạn cứng `bestRank === 20`!
 * Kiểm tra từ Rank 40 (`demon10`) xuống Rank 0 (`common`) trên `inventoryStacks` trong O(1).
 */
export function getHighestRarityForUnit(unitId) {
    const targetId = normalizeUnitId(unitId);
    let bestRarity = 'common';
    let bestRank = -1;

    if (metaState.inventoryStacks && typeof metaState.inventoryStacks === 'object') {
        for (let rIdx = RARITY_ORDER.length - 1; rIdx >= 0; rIdx--) {
            const rKey = RARITY_ORDER[rIdx];
            const stackCount = metaState.inventoryStacks[`${targetId}__${rKey}`] || 0;
            if (stackCount > 0) {
                return rKey;
            }
        }
    }

    for (let i = 0; i < metaState.inventory.length; i++) {
        const card = metaState.inventory[i];
        if (normalizeUnitId(card.unitId) === targetId) {
            const cfg = RARITY_CONFIG[card.rarity];
            if (cfg && cfg.rank > bestRank) {
                bestRank = cfg.rank;
                bestRarity = card.rarity;
                if (bestRank >= MAX_RARITY_RANK) break;
            }
        }
    }
    return bestRarity;
}

export function hasUnitInInventory(unitId) {
    const targetId = normalizeUnitId(unitId);
    if (metaState.inventoryStacks && typeof metaState.inventoryStacks === 'object') {
        for (let rIdx = 0; rIdx < RARITY_ORDER.length; rIdx++) {
            if ((metaState.inventoryStacks[`${targetId}__${RARITY_ORDER[rIdx]}`] || 0) > 0) {
                return true;
            }
        }
    }
    return metaState.inventory.some(c => normalizeUnitId(c.unitId) === targetId);
}

export function calcTotalRefundCoins(targetLv, currentLv) {
    return calcTotalRefundCoinsFast(targetLv, currentLv);
}

export function getUpgradeTierBracketText(currentLv) {
    const block = Math.floor((currentLv - 1) / 5);
    const startLv = block * 5 + 1;
    const endLv = startLv + 4;
    const stepPrice = getUnitUpgradeCost(currentLv);
    return `Khung giá Cấp ${startLv}-${endLv}: 🪙 ${stepPrice.toLocaleString('en-US')} / cấp`;
}

export function formatCurrency(val) {
    if (metaState.isAdminMode) return '∞';
    const n = Math.floor(Number(val) || 0);
    return n.toLocaleString('en-US');
}

export { getUnitUpgradeCost, calcBulkUpgradeCost };

// ============================================================================
// 2. GIAO DIỆN SẢNH (TOP BAR & TABS)
// ============================================================================
export function updateTopBarUI() {
    const nameEl = document.getElementById('player-name-display');
    if (nameEl) nameEl.textContent = metaState.playerName || 'COMMANDER';

    const gemsEl = document.getElementById('gems-count-display');
    if (gemsEl) gemsEl.textContent = formatCurrency(metaState.gems);

    const coinsEl = document.getElementById('coins-count-display');
    if (coinsEl) coinsEl.textContent = formatCurrency(metaState.coins);

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
// 3. POPUP ĐẶT TÊN & SETTINGS (ADMIN MODE & RESET ACCOUNT)
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
            modeDesc.textContent = `Bạn đang bật quyền Admin: Tài nguyên vô hạn, mở 1 Tỷ rương miễn phí, mở khóa toàn bộ ${LEVELS.length} map chơi.`;
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
// 4. TAB BATTLE: CHỌN MAP, ĐỘ KHÓ, 2 HÌNH THỨC & 4 CHẾ ĐỘ CHƠI MỚI
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
        fogStatusEl.textContent = currentSelectedSpecialMode === 'night_fog' ? 'BẬT' : 'FOG';
    }

    const endlessBestMini = document.getElementById('endless-best-mini');
    if (endlessBestMini) endlessBestMini.textContent = `W:${metaState.endlessBestWave || 0}`;

    const diffCfg = DIFFICULTY_CONFIG[currentSelectedDifficulty] || DIFFICULTY_CONFIG.easy;
    const rewardCoins = calcStageRewardCoins(cfg.level, currentSelectedDifficulty, currentSelectedBattleMode);
    const scaledEnemyBaseHp = Math.round(cfg.enemyBaseHp * diffCfg.baseHpMult);

    const diffBannerEl = document.getElementById('diff-info-banner');
    if (diffBannerEl) {
        const sp = currentSelectedSpecialMode;
        if (sp === 'endless') {
            diffBannerEl.innerHTML = `Chế độ: <b>Thủ Thành Roguelike Vô Tận</b> • Kỷ lục: <b class="text-purple-300">Wave ${metaState.endlessBestWave || 0}</b> • Qua mỗi Wave chọn Thẻ Đột Biến!`;
        } else if (sp === 'autobattler') {
            diffBannerEl.innerHTML = `Chế độ: <b>Đấu Trường Đặt Trận Tự Động</b> • Đã thắng: <b class="text-emerald-300">${metaState.autobattlerWins || 0} trận</b> • Dàn trận nửa sân dưới!`;
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
// 5. CÂY KỸ NĂNG CHỈ HUY BỊ ĐỘNG (META-TALENTS MODAL)
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
// 6. NHIỆM VỤ CHIẾN DỊCH & GIFTCODE
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
                    <span class="text-[10.5px] font-black text-emerald-600">💎 +${m.rewardGems.toLocaleString('en-US')}${coinBonusText}</span>
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
// 7. TAB SHOP: MỞ RƯƠNG SIÊU TỐC O(1) LÊN TỚI 1 TỶ (1,000,000,000) RƯƠNG
// ============================================================================
let pendingGachaData = null;

export function requestOpenGachaCrate(crateType, count) {
    const qty = Math.max(1, Math.min(MAX_CRATE_OPEN_QTY, Math.floor(Number(count) || 1)));
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
    if (qtyEl) qtyEl.textContent = `${qty.toLocaleString('en-US')} rương (${formatCompactNumber(qty)})`;
    if (rawCostEl) rawCostEl.textContent = `💎 ${rawCost.toLocaleString('en-US')}`;
    if (discEl) discEl.textContent = blocksOf10 > 0 ? `-10% (${formatCompactNumber(blocksOf10)} cụm 10)` : 'Không đủ 10 rương để giảm giá';
    if (savedEl) savedEl.textContent = `💎 ${discountAmount.toLocaleString('en-US')}`;
    if (finalCostEl) finalCostEl.textContent = metaState.isAdminMode ? '💎 0 (ADMIN ∞)' : `💎 ${finalCost.toLocaleString('en-US')}`;

    const hasEnough = metaState.isAdminMode || metaState.gems >= finalCost;
    if (errEl) errEl.classList.toggle('hidden', hasEnough);
    if (confirmBtn) confirmBtn.disabled = !hasEnough;

    if (modal) modal.classList.add('active');
}

// ============================================================================
// 8. TAB ARMY: SHOWCASE CANVAS (CÓ AURA MASTER/DEMON), DECK BUILDER,
//    BULK LEVEL UP (+1/+5/+10/MAX + Ô NHẬP TÙY Ý) & AUTO MERGE O(1)
// ============================================================================

/**
 * Vẽ vòng hào quang năng lượng trên Canvas cho bậc MASTER (Xoáy nước lửa xanh biển #00f2fe)
 * và DEMON (Ma trận lửa tím hắc ám & tia sét tím #c084fc / #d946ef)
 */
export function drawCanvasRarityAura(ctx, cx, cy, baseRadius, rarityId, timeSec) {
    const rCfg = RARITY_CONFIG[rarityId];
    if (!rCfg) return;

    if (isMasterRarity(rarityId)) {
        // Bậc MASTER (Rank 21 ➔ 29): Vòng hào quang xoáy nước năng lượng xanh biển (#00f2fe)
        ctx.save();
        ctx.translate(cx, cy);

        const grad = ctx.createRadialGradient(0, 0, baseRadius * 0.2, 0, 0, baseRadius * 1.45);
        grad.addColorStop(0, 'rgba(0, 242, 254, 0.58)');
        grad.addColorStop(0.55, 'rgba(2, 132, 199, 0.35)');
        grad.addColorStop(1, 'rgba(0, 30, 77, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, baseRadius * 1.45, baseRadius * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2 vòng xoáy nước xoay ngược chiều
        for (let ring = 0; ring < 2; ring++) {
            ctx.save();
            ctx.scale(1, 0.52);
            ctx.rotate(timeSec * (ring === 0 ? 3.2 : -2.4));
            ctx.strokeStyle = ring === 0 ? '#00f2fe' : '#38bdf8';
            ctx.lineWidth = ring === 0 ? 2.5 : 1.8;
            ctx.setLineDash([10, 6]);
            ctx.beginPath();
            ctx.arc(0, 0, baseRadius * (1.05 + ring * 0.22), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 6 hạt lửa đại dương xoay quanh chân
        const orbCount = 6;
        for (let i = 0; i < orbCount; i++) {
            const a = timeSec * 3.8 + (i * Math.PI * 2) / orbCount;
            const ox = Math.cos(a) * (baseRadius * 1.15);
            const oy = Math.sin(a) * (baseRadius * 0.55) - Math.abs(Math.sin(timeSec * 5 + i)) * 5;
            ctx.fillStyle = i % 2 === 0 ? '#e0f2fe' : '#00f2fe';
            ctx.beginPath();
            ctx.arc(ox, oy, 3.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    } else if (isDemonRarity(rarityId)) {
        // Bậc DEMON (Rank 30 ➔ 40): Vòng ma trận lửa tím hắc ám (#c084fc & #7e22ce) kèm tia sét tím
        ctx.save();
        ctx.translate(cx, cy);

        const grad = ctx.createRadialGradient(0, 0, baseRadius * 0.15, 0, 0, baseRadius * 1.6);
        grad.addColorStop(0, 'rgba(240, 171, 252, 0.68)');
        grad.addColorStop(0.5, 'rgba(147, 51, 234, 0.45)');
        grad.addColorStop(1, 'rgba(9, 0, 20, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, baseRadius * 1.6, baseRadius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ma trận lục giác / ngôi sao 6 cánh ma giới xoay dưới chân
        ctx.save();
        ctx.scale(1, 0.54);
        ctx.rotate(-timeSec * 2.8);
        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        const rOuter = baseRadius * 1.28;
        for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            const px = Math.cos(a) * rOuter;
            const py = Math.sin(a) * rOuter;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, rOuter * 0.82, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Tia sét tím ma giới phóng quanh nhân vật
        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 1.6;
        for (let b = 0; b < 3; b++) {
            const seed = Math.floor(timeSec * 14) + b * 17;
            const baseA = ((seed % 12) / 12) * Math.PI * 2;
            const sx = Math.cos(baseA) * (baseRadius * 0.95);
            const sy = Math.sin(baseA) * (baseRadius * 0.45);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + ((seed % 5) - 2) * 4, sy - 12);
            ctx.lineTo(sx + (((seed + 2) % 5) - 2) * 3, sy - 24);
            ctx.stroke();
        }

        ctx.restore();
    }
}

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
    const timeSec = performance.now() * 0.001;

    // Đổi màu bệ đứng theo bậc Master / Demon
    const pedestalEl = document.querySelector('.army-pedestal-circle');
    if (pedestalEl) {
        pedestalEl.classList.toggle('pedestal-master', isMasterRarity(highestRarity));
        pedestalEl.classList.toggle('pedestal-demon', isDemonRarity(highestRarity));
    }

    // Vẽ vòng hào quang xoáy nước Master hoặc ma trận lửa tím Demon dưới chân nhân vật
    if (isMasterRarity(highestRarity) || isDemonRarity(highestRarity)) {
        drawCanvasRarityAura(sCtx, 64, 92, 34, highestRarity, timeSec);
    }

    if (atlasRef && atlasRef.ready) {
        const bob = Math.sin(timeSec * 5) * 3;
        atlasRef.draw(sCtx, u.spriteCol, 7, 64, 62 + bob, 78, 78);
    }

    const nameEl = document.getElementById('army-showcase-name');
    if (nameEl) nameEl.textContent = `${u.name.toUpperCase()} (LV.${metaState.armyPermanentLevels[u.id] || 1})`;

    const rarityEl = document.getElementById('army-showcase-rarity');
    if (rarityEl) {
        rarityEl.className = `rarity-badge ${rCfg.cssClass}`;
        rarityEl.textContent = `${rCfg.name.toUpperCase()} (${rCfg.mult}x)`;
    }
}

/**
 * Render thanh Đội Hình Chiến Đấu 4 Ô Quân + 1 Không Kích ngay tại Tab ARMY
 */
export function renderArmyDeckBuilderBar() {
    metaState.selectedDeck = normalizeSelectedDeck(metaState.selectedDeck);
    const bar = document.getElementById('army-active-deck-bar');
    if (!bar) return;

    const buttons = bar.querySelectorAll('button[data-deck-slot]');
    buttons.forEach(btn => {
        const slotIdx = Number(btn.getAttribute('data-deck-slot'));
        const uId = metaState.selectedDeck[slotIdx] || PRIMARY_INFANTRY_ID;
        const u = UNIT_BY_ID[uId] || UNIT_CATALOG[0];
        const lv = metaState.armyPermanentLevels[u.id] || 1;
        btn.textContent = `Ô ${slotIdx + 1}: ${u.name} (Lv.${lv})`;
    });
}

export function renderArmyTabUI() {
    renderArmyShowcaseCanvas();
    renderArmyDeckBuilderBar();

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
        const totalOwned = getTotalCardsInInventory();
        if (headingEl) headingEl.textContent = `GHÉP TƯỚNG (${formatCompactNumber(totalOwned)} THẺ)`;
        renderMergeWorkbenchAndInventory();
    }
}

export function renderArmyUnitsGrid() {
    const grid = document.getElementById('army-units-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const activeDeck = normalizeSelectedDeck(metaState.selectedDeck);

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

        const deckSlotIdx = activeDeck.indexOf(u.id);
        const deckSlotTag = deckSlotIdx >= 0 && deckSlotIdx < 4
            ? `<span class="card-qty-badge" style="bottom:20px;left:3px;right:auto;background:#0284c7;border-color:#bae6fd;color:#fff;font-size:10px;">Ô ${deckSlotIdx + 1}</span>`
            : '';

        const card = document.createElement('div');
        card.className = `army-unit-card ${rCfg.cssClass}`;
        card.innerHTML = `
            <div class="card-socket-dots">${chipDotsHtml}</div>
            <div class="card-top-lv">
                <span>LV.${permLv}</span>
                ${rCfg.plusLabel ? `<span class="card-plus-tag">${rCfg.plusLabel}</span>` : `<span class="text-[8px] opacity-95">${owned ? rCfg.name : 'Cơ bản'}</span>`}
            </div>
            <img src="${spriteUrl}" class="w-10 h-10 pixel-art my-1 drop-shadow" alt="${u.name}" />
            ${deckSlotTag}
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

/**
 * Render cụm 4 nút [Ô Đội Hình 1] [Ô 2] [Ô 3] [Ô 4] trong `#unit-upgrade-modal`
 */
export function renderDeckSlotButtonsInUpgradeModal(rawUnitId) {
    const unitId = normalizeUnitId(rawUnitId);
    metaState.selectedDeck = normalizeSelectedDeck(metaState.selectedDeck);
    const selector = document.getElementById('upg-deck-slot-selector');
    if (!selector) return;

    const buttons = selector.querySelectorAll('button[data-deck-slot]');
    buttons.forEach(btn => {
        const slotIdx = Number(btn.getAttribute('data-deck-slot'));
        const curSlotUnitId = metaState.selectedDeck[slotIdx];
        const curSlotUnit = UNIT_BY_ID[curSlotUnitId] || UNIT_CATALOG[0];
        const isAssignedHere = curSlotUnitId === unitId;

        btn.classList.toggle('active-deck-slot', isAssignedHere);
        btn.classList.toggle('btn-3d-amber', isAssignedHere);
        btn.classList.toggle('btn-3d-slate', !isAssignedHere);
        btn.textContent = isAssignedHere
            ? `✓ Ô ${slotIdx + 1}: Đang chọn`
            : `[Ô ${slotIdx + 1}]: ${curSlotUnit.name}`;
    });
}

/**
 * Gắn binh chủng `rawUnitId` vào `slotIdx` (0..3) của `metaState.selectedDeck`
 */
export function assignUnitToDeckSlot(rawUnitId, slotIdx) {
    const unitId = normalizeUnitId(rawUnitId);
    if (!UNIT_BY_ID[unitId] || unitId === 'airstrike') return;
    const idx = Math.max(0, Math.min(3, Number(slotIdx) || 0));
    metaState.selectedDeck = normalizeSelectedDeck(metaState.selectedDeck);

    const existingIdx = metaState.selectedDeck.indexOf(unitId);
    if (existingIdx >= 0 && existingIdx < 4 && existingIdx !== idx) {
        // Hoán đổi vị trí nếu tướng đã nằm ở ô khác trong 4 ô đầu
        const temp = metaState.selectedDeck[idx];
        metaState.selectedDeck[idx] = unitId;
        metaState.selectedDeck[existingIdx] = temp;
    } else {
        metaState.selectedDeck[idx] = unitId;
    }

    saveProgress();
    if (sfxRef) sfxRef.play('spawn');
    renderDeckSlotButtonsInUpgradeModal(unitId);
    renderArmyDeckBuilderBar();
    if (currentLobbyTab === 'army' && currentArmyMode === 'army') {
        renderArmyUnitsGrid();
    }
    if (typeof window !== 'undefined' && window.game?.running && typeof window.renderBattleDeckButtons === 'function') {
        window.game.deckIds = [...metaState.selectedDeck];
        window.renderBattleDeckButtons();
    }
}

/**
 * MỤC 4.1 & 4.2: Cập nhật trực tiếp Preview chỉ số, huy hiệu cấp độ và tổng Vàng
 * khi người chơi gõ số vào `#upg-custom-add-lv-input` hoặc bấm `+1 / +5 / +10 / MAX`
 */
export function updateBulkUpgradePreviewUI(rawAddLevels = null) {
    const u = UNIT_BY_ID[inspectingUnitId];
    if (!u) return;

    const inputEl = document.getElementById('upg-custom-add-lv-input');
    let addLv = rawAddLevels !== null
        ? Math.floor(Number(rawAddLevels) || 1)
        : Math.floor(Number(inputEl?.value) || 1);
    addLv = Math.max(1, Math.min(999999, addLv));
    currentBulkAddLevels = addLv;

    if (inputEl && Number(inputEl.value) !== addLv) {
        inputEl.value = String(addLv);
    }

    const permLv = metaState.armyPermanentLevels[u.id] || 1;
    const targetLv = permLv + addLv;
    const highestRarity = getHighestRarityForUnit(u.id);
    const rCfg = RARITY_CONFIG[highestRarity] || RARITY_CONFIG.common;
    const totalCostCoins = calcBulkUpgradeCost(permLv, addLv);

    const curStats = calcUnitPermanentStats(u, highestRarity, permLv);
    const targetStats = calcUnitPermanentStats(u, highestRarity, targetLv);

    const lvBadge = document.getElementById('upg-modal-level-badge');
    if (lvBadge) {
        lvBadge.textContent = `LV.${permLv} ➔ LV.${targetLv} (+${addLv.toLocaleString('en-US')})`;
    }

    const multInfoEl = document.getElementById('upg-modal-mult-info');
    if (multInfoEl) {
        multInfoEl.textContent = `Độ hiếm ${rCfg.name}: ${rCfg.mult}x HP & DMG • Cấp ${permLv} ➔ ${targetLv} (+${addLv * 12}% cơ bản)`;
    }

    const bracketEl = document.getElementById('upg-modal-tier-bracket');
    if (bracketEl) bracketEl.textContent = getUpgradeTierBracketText(permLv);

    const curDmgEl = document.getElementById('upg-cur-dmg');
    if (curDmgEl) curDmgEl.textContent = `${curStats.damage.toLocaleString('en-US')}`;

    const nextDmgEl = document.getElementById('upg-next-dmg');
    if (nextDmgEl) {
        const diffDmg = Math.max(0, targetStats.damage - curStats.damage);
        nextDmgEl.textContent = `${targetStats.damage.toLocaleString('en-US')} (+${diffDmg.toLocaleString('en-US')})`;
    }

    const curHpEl = document.getElementById('upg-cur-hp');
    if (curHpEl) {
        curHpEl.textContent = u.isAirstrike
            ? `Phá nhà ${u.baseDamage}`
            : `${curStats.hp.toLocaleString('en-US')}`;
    }

    const nextHpEl = document.getElementById('upg-next-hp');
    if (nextHpEl) {
        if (u.isAirstrike) {
            nextHpEl.textContent = `Phá nhà ${Math.round(u.baseDamage * (1 + (targetLv - 1) * 0.12))}`;
        } else {
            const diffHp = Math.max(0, targetStats.hp - curStats.hp);
            nextHpEl.textContent = `${targetStats.hp.toLocaleString('en-US')} (+${diffHp.toLocaleString('en-US')})`;
        }
    }

    const actionLabelEl = document.getElementById('upg-btn-action-label');
    if (actionLabelEl) {
        actionLabelEl.textContent = `⬆️ NÂNG +${addLv.toLocaleString('en-US')} CẤP`;
    }

    const costEl = document.getElementById('upg-cost-coins');
    if (costEl) {
        costEl.textContent = metaState.isAdminMode
            ? '🪙 0 (ADMIN ∞)'
            : `🪙 ${formatCurrency(totalCostCoins)}`;
    }

    const btnUpg = document.getElementById('btn-confirm-unit-upgrade');
    if (btnUpg) {
        btnUpg.disabled = !metaState.isAdminMode && metaState.coins < totalCostCoins;
    }

    // Đồng bộ nút active trên thanh chọn nhanh +1 / +5 / +10 / MAX
    document.querySelectorAll('.upg-quick-lv-btn').forEach(b => {
        const attr = b.getAttribute('data-add-lv');
        if (attr !== 'max') {
            b.classList.toggle('active', Number(attr) === addLv);
        } else {
            b.classList.remove('active');
        }
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

    const nameEl = document.getElementById('upg-modal-unit-name');
    if (nameEl) nameEl.textContent = u.name.toUpperCase();

    const frameEl = document.getElementById('upg-modal-card-frame');
    if (frameEl) frameEl.className = `upg-unit-avatar-box ${rCfg.cssClass}`;

    const spriteEl = document.getElementById('upg-modal-sprite');
    if (spriteEl && atlasRef && atlasRef.ready) spriteEl.src = atlasRef.toDataURL(u.spriteCol, 7);

    const rarityBadge = document.getElementById('upg-modal-rarity-badge');
    if (rarityBadge) {
        rarityBadge.className = `rarity-badge ${rCfg.cssClass}`;
        rarityBadge.textContent = `${rCfg.name.toUpperCase()} (${rCfg.mult}x)`;
    }

    const roleEl = document.getElementById('upg-modal-role');
    if (roleEl) roleEl.textContent = u.role;

    const gasEl = document.getElementById('upg-unit-gas');
    if (gasEl) gasEl.textContent = `${u.cost} Xăng`;

    const btnRefund = document.getElementById('btn-open-level-refund');
    if (btnRefund) {
        btnRefund.disabled = permLv <= 1;
    }

    renderDeckSlotButtonsInUpgradeModal(u.id);
    renderUnitSocketsInModal(u.id);
    updateBulkUpgradePreviewUI(currentBulkAddLevels || 1);
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
// 9. CHẾ ĐỘ MERGE: BÀN GHÉP THỦ CÔNG & CASCADE AUTO-MERGE SIÊU TỐC O(1)
// ============================================================================
export function renderMergeWorkbenchAndInventory() {
    syncRepresentativeInventoryFromStacks();

    const slot1El = document.getElementById('merge-slot-1');
    const slot2El = document.getElementById('merge-slot-2');
    const slotResEl = document.getElementById('merge-slot-result');
    const btnMergeExec = document.getElementById('btn-execute-merge');
    const hintEl = document.getElementById('merge-hint-text');
    const invGrid = document.getElementById('merge-inventory-grid');
    const headingEl = document.getElementById('army-panel-title');

    if (headingEl && currentArmyMode === 'merge') {
        const totalOwned = getTotalCardsInInventory();
        headingEl.textContent = `GHÉP TƯỚNG (${formatCompactNumber(totalOwned)} THẺ)`;
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
            hintEl.innerHTML = `Chọn 2 thẻ <b>cùng tên & cùng độ hiếm</b> hoặc bấm <b>⚡ AUTO MERGE</b> để ghép dây chuyền O(1) lên tới <b>Master +8 & Demon +10 (7777x)</b>!`;
        }
    }

    if (!invGrid) return;
    invGrid.innerHTML = '';

    // Gom nhóm trực tiếp từ `metaState.inventoryStacks` kết hợp 2 thẻ đại diện trong `metaState.inventory`
    const repByKey = new Map();
    for (let i = 0; i < metaState.inventory.length; i++) {
        const c = metaState.inventory[i];
        const normId = normalizeUnitId(c.unitId);
        const key = `${normId}__${c.rarity}`;
        let list = repByKey.get(key);
        if (!list) {
            list = [];
            repByKey.set(key, list);
        }
        list.push(c);
    }

    const sortedGroups = [];
    for (const [key, rawCount] of Object.entries(metaState.inventoryStacks || {})) {
        const totalCount = Math.floor(Number(rawCount) || 0);
        if (totalCount <= 0) continue;
        const [rawUnitId, rarity] = key.split('__');
        const unitId = normalizeUnitId(rawUnitId);
        if (!UNIT_BY_ID[unitId] || !RARITY_CONFIG[rarity]) continue;
        sortedGroups.push({
            unitId,
            rarity,
            rank: RARITY_CONFIG[rarity]?.rank ?? 0,
            totalCount,
            sampleCards: repByKey.get(`${unitId}__${rarity}`) || []
        });
    }

    sortedGroups.sort((a, b) => {
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
                ${showStackBadge ? `<span class="card-qty-badge" title="Tổng cộng: ${grp.totalCount.toLocaleString('en-US')} thẻ">x${formatCompactNumber(grp.totalCount)}</span>` : ''}
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
// 10. HỆ THỐNG VÒNG QUAY MAY MẮN 8 Ô (#lucky-wheel-modal) & PITY 0/100
// ============================================================================
let wheelCurrentRotationRad = 0;
let wheelIsSpinning = false;

export function drawLuckyWheelCanvas(rotationRad = wheelCurrentRotationRad) {
    const canvas = document.getElementById('luckyWheelCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(cx, cy) - 8;

    ctx.clearRect(0, 0, W, H);
    const slices = LUCKY_WHEEL_CONFIG.slices;
    const numSlices = slices.length;
    const arcStep = (Math.PI * 2) / numSlices;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRad);

    slices.forEach((slice, idx) => {
        const startA = idx * arcStep;
        const endA = startA + arcStep;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startA, endA);
        ctx.closePath();
        ctx.fillStyle = slice.bgColor;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        // Vẽ chữ và icon trên từng múi
        ctx.save();
        ctx.rotate(startA + arcStep / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = slice.textColor || '#ffffff';
        ctx.font = '900 11px "Chakra Petch", sans-serif';
        ctx.fillText(slice.label, radius - 14, 4);
        ctx.restore();
    });

    // Viền vàng đinh tán ngoài cùng
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();

    for (let i = 0; i < numSlices * 2; i++) {
        const a = (i * Math.PI) / numSlices;
        const px = Math.cos(a) * (radius - 2);
        const py = Math.sin(a) * (radius - 2);
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#ef4444';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

export function updateLuckyWheelPityUI() {
    const pity = Math.max(0, Math.min(100, Number(metaState.wheelPity) || 0));
    const countEl = document.getElementById('lucky-pity-count');
    const fillEl = document.getElementById('lucky-pity-bar-fill');
    if (countEl) countEl.textContent = `${pity} / ${LUCKY_WHEEL_CONFIG.pityMax}`;
    if (fillEl) fillEl.style.width = `${Math.min(100, Math.round((pity / LUCKY_WHEEL_CONFIG.pityMax) * 100))}%`;
}

function rollSingleWheelSlice(forceJackpot = false) {
    const slices = LUCKY_WHEEL_CONFIG.slices;
    if (forceJackpot) {
        return slices[slices.length - 1]; // Ô 8: JACKPOT MASTER / DEMON
    }
    const rand = Math.random() * 100;
    let acc = 0;
    for (let i = 0; i < slices.length; i++) {
        acc += slices[i].weight;
        if (rand <= acc) return slices[i];
    }
    return slices[0];
}

export function executeLuckyWheelSpins(rawSpinCount = 1) {
    if (wheelIsSpinning) return;
    const spins = Math.max(1, Math.min(100000, Math.floor(Number(rawSpinCount) || 1)));
    const blocksOf10 = Math.floor(spins / 10);
    const remSpins = spins % 10;
    const totalGemCost = metaState.isAdminMode
        ? 0
        : (blocksOf10 * LUCKY_WHEEL_CONFIG.tenPrice + remSpins * LUCKY_WHEEL_CONFIG.singlePrice);

    const bannerEl = document.getElementById('lucky-wheel-result-banner');
    if (!metaState.isAdminMode && metaState.gems < totalGemCost) {
        if (sfxRef) sfxRef.play('cannon');
        if (bannerEl) {
            bannerEl.classList.remove('jackpot-hit');
            bannerEl.innerHTML = `⚠️ Không đủ Gems! Cần <b>💎 ${totalGemCost.toLocaleString('en-US')}</b> để quay ${spins.toLocaleString('en-US')} lượt.`;
        }
        return;
    }

    if (!metaState.isAdminMode) {
        metaState.gems -= totalGemCost;
    }

    let gainedCoins = 0;
    let gainedGems = 0;
    let gainedMedals = 0;
    const gainedCardsSummary = {};
    let lastSlice = LUCKY_WHEEL_CONFIG.slices[0];
    let hitJackpotCount = 0;

    for (let i = 0; i < spins; i++) {
        metaState.wheelPity = (Number(metaState.wheelPity) || 0) + 1;
        const isGuaranteedPity = metaState.wheelPity >= LUCKY_WHEEL_CONFIG.pityMax;
        const slice = rollSingleWheelSlice(isGuaranteedPity);
        lastSlice = slice;

        if (slice.type === 'coins') {
            gainedCoins += slice.amount;
        } else if (slice.type === 'gems') {
            gainedGems += slice.amount;
        } else if (slice.type === 'medals') {
            gainedMedals += slice.amount;
        } else if (slice.type === 'card') {
            const randUnit = UNIT_CATALOG[(Math.random() * UNIT_CATALOG.length) | 0];
            addCardToStacks(randUnit.id, slice.rarity, 1);
            const rName = RARITY_CONFIG[slice.rarity]?.name || slice.rarity;
            const k = `${randUnit.name} (${rName})`;
            gainedCardsSummary[k] = (gainedCardsSummary[k] || 0) + 1;
        } else if (slice.type === 'jackpot_card') {
            metaState.wheelPity = 0; // Reset Pity khi nổ Jackpot
            hitJackpotCount++;
            const jackpotRarities = slice.rarities || ['master', 'demon'];
            const pickedRarity = jackpotRarities[(Math.random() * jackpotRarities.length) | 0];
            const randUnit = UNIT_CATALOG[(Math.random() * UNIT_CATALOG.length) | 0];
            addCardToStacks(randUnit.id, pickedRarity, 1);
            const rName = RARITY_CONFIG[pickedRarity]?.name || pickedRarity;
            const k = `💠 ${randUnit.name} [${rName}]`;
            gainedCardsSummary[k] = (gainedCardsSummary[k] || 0) + 1;
        }
    }

    metaState.coins += gainedCoins;
    metaState.gems += gainedGems;
    metaState.medals = (metaState.medals || 0) + gainedMedals;
    saveProgress();
    updateTopBarUI();
    updateLuckyWheelPityUI();

    // Tính góc dừng chính xác tại kim chỉ ở đỉnh (-Math.PI / 2) cho `lastSlice`
    const numSlices = LUCKY_WHEEL_CONFIG.slices.length;
    const arcStep = (Math.PI * 2) / numSlices;
    const sliceCenterAngle = lastSlice.index * arcStep + arcStep / 2;
    const targetPointerAngle = -Math.PI / 2;
    const extraSpinsRad = (spins === 1 ? 6 : 8) * Math.PI * 2;
    const startRot = wheelCurrentRotationRad % (Math.PI * 2);
    let targetRot = startRot + extraSpinsRad + (targetPointerAngle - sliceCenterAngle - startRot);
    while (targetRot <= startRot + Math.PI * 6) {
        targetRot += Math.PI * 2;
    }

    const canvasEl = document.getElementById('luckyWheelCanvas');
    canvasEl?.classList.add('spinning');
    wheelIsSpinning = true;
    if (sfxRef) sfxRef.play('blitz');

    const animDurationMs = spins > 25 ? 1100 : 2100;
    const t0 = performance.now();

    function animateWheel(now) {
        const elapsed = now - t0;
        const t = Math.min(1, elapsed / animDurationMs);
        // Cubic-Bezier ease-out giảm tốc mượt mà
        const easeOut = 1 - Math.pow(1 - t, 3);
        wheelCurrentRotationRad = startRot + (targetRot - startRot) * easeOut;
        drawLuckyWheelCanvas(wheelCurrentRotationRad);

        if (t < 1) {
            requestAnimationFrame(animateWheel);
        } else {
            wheelIsSpinning = false;
            canvasEl?.classList.remove('spinning');
            if (sfxRef) sfxRef.play('upgrade');
            triggerHaptic(35);

            if (bannerEl) {
                bannerEl.classList.toggle('jackpot-hit', hitJackpotCount > 0);
                if (spins === 1) {
                    const cardKeys = Object.keys(gainedCardsSummary);
                    const extraCardTxt = cardKeys.length > 0 ? ` ➔ <b>${cardKeys[0]}</b>` : '';
                    bannerEl.innerHTML = `🎉 Trúng: <b>${lastSlice.fullName}</b>${extraCardTxt}!`;
                } else {
                    const parts = [];
                    if (gainedCoins > 0) parts.push(`+🪙 ${gainedCoins.toLocaleString('en-US')}`);
                    if (gainedGems > 0) parts.push(`+💎 ${gainedGems.toLocaleString('en-US')}`);
                    if (gainedMedals > 0) parts.push(`+🎖️ ${gainedMedals.toLocaleString('en-US')}`);
                    const cardList = Object.entries(gainedCardsSummary).map(([k, v]) => `${k} x${v}`);
                    if (cardList.length > 0) parts.push(`🃏 ${cardList.slice(0, 4).join(', ')}${cardList.length > 4 ? '...' : ''}`);
                    bannerEl.innerHTML = `🎉 Kết quả ${spins.toLocaleString('en-US')} lượt: ${parts.join(' • ')}`;
                }
            }
            if (currentLobbyTab === 'army') renderArmyTabUI();
        }
    }

    requestAnimationFrame(animateWheel);
}

// ============================================================================
// 11. TRUNG TÂM 3 MINI-GAME GIẢI TRÍ (#minigame-arcade-modal)
// ============================================================================
let currentMinigameTab = 'mines';

// --- Trạng thái Mini-Game 1: Đập Mìn Công Binh 5x5 ---
const minesGameState = {
    active: false,
    board: [], // 25 phần tử: { isMine: bool, revealed: bool, rewardText: string }
    safeOpened: 0,
    potCoins: 0,
    potGems: 0,
    potMedals: 0
};

// --- Trạng thái Mini-Game 2: Hứng Tiếp Tế Dù 30s ---
const catcherGameState = {
    running: false,
    timeLeft: 30.0,
    playerX: 160,
    moveLeft: false,
    moveRight: false,
    spawnTimer: 0,
    items: [],
    floatingTexts: [],
    scoreCoins: 0,
    scoreGems: 0,
    scoreMedals: 0,
    rafId: null,
    lastFrameTs: 0
};

// --- Trạng thái Mini-Game 3: Đoán Bài Chiến Thuật (Rank 0 ➔ 40) ---
const highLowGameState = {
    active: false,
    streak: 0,
    potCoins: 0,
    potGems: 0,
    curRarityId: 'common',
    curUnitId: PRIMARY_INFANTRY_ID
};

export function switchMinigameTab(tabId) {
    currentMinigameTab = tabId;
    if (sfxRef) sfxRef.play('gas');

    document.querySelectorAll('.arcade-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mg-tab') === tabId);
    });
    ['mines', 'catcher', 'highlow'].forEach(key => {
        document.getElementById(`mg-pane-${key}`)?.classList.toggle('active', key === tabId);
    });

    if (tabId === 'mines') renderMinesMinigameBoard();
    else if (tabId === 'catcher') drawCatcherIdleCanvas();
    else if (tabId === 'highlow') renderHighLowMinigameUI();
}

/* --- 11.1. MINI-GAME 1: ĐẬP MÌN CÔNG BINH (TACTICAL RADAR 5x5) --- */
export function startMinesMinigame() {
    const cfg = MINIGAME_CONFIG.mines;
    if (!metaState.isAdminMode && metaState.coins < cfg.entryCostCoins) {
        if (sfxRef) sfxRef.play('cannon');
        const stEl = document.getElementById('mg-mines-status-text');
        if (stEl) stEl.innerHTML = `<span class="text-rose-600">⚠️ Bạn cần 🪙 ${cfg.entryCostCoins.toLocaleString('en-US')} Vàng để bắt đầu dò mìn!</span>`;
        return;
    }

    if (!metaState.isAdminMode) {
        metaState.coins -= cfg.entryCostCoins;
        saveProgress();
        updateTopBarUI();
    }

    const cells = Array.from({ length: cfg.gridSize }, (_, idx) => ({
        isMine: idx < cfg.mineCells,
        revealed: false,
        icon: '❓'
    }));
    // Xáo trộn Fisher-Yates
    for (let i = cells.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = cells[i];
        cells[i] = cells[j];
        cells[j] = tmp;
    }

    minesGameState.active = true;
    minesGameState.board = cells;
    minesGameState.safeOpened = 0;
    minesGameState.potCoins = cfg.entryCostCoins;
    minesGameState.potGems = 15;
    minesGameState.potMedals = 0;

    if (sfxRef) sfxRef.play('spawn');
    const stEl = document.getElementById('mg-mines-status-text');
    if (stEl) stEl.innerHTML = `🎯 Hãy chạm vào các ô trên lưới 5x5 để tìm Kho báu! Tránh <b>5 quả Mìn</b>!`;
    renderMinesMinigameBoard();
}

export function renderMinesMinigameBoard() {
    const gridEl = document.getElementById('mg-mines-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const cfg = MINIGAME_CONFIG.mines;
    const curMult = minesGameState.safeOpened > 0
        ? (cfg.multipliers[Math.min(minesGameState.safeOpened - 1, cfg.multipliers.length - 1)] || 1.0)
        : 1.0;

    const multBadge = document.getElementById('mg-mines-mult-badge');
    if (multBadge) multBadge.textContent = `x${curMult.toFixed(2)}`;

    const safeCountEl = document.getElementById('mg-mines-safe-count');
    if (safeCountEl) safeCountEl.textContent = `${minesGameState.safeOpened}/${cfg.safeCells}`;

    const potEl = document.getElementById('mg-mines-current-pot');
    if (potEl) {
        const medalStr = minesGameState.potMedals > 0 ? ` | 🎖️ ${minesGameState.potMedals}` : '';
        potEl.textContent = `🪙 ${minesGameState.potCoins.toLocaleString('en-US')} | 💎 ${minesGameState.potGems}${medalStr}`;
    }

    const cashoutBtn = document.getElementById('btn-mg-mines-cashout');
    if (cashoutBtn) {
        cashoutBtn.disabled = !minesGameState.active || minesGameState.safeOpened <= 0;
    }

    if (minesGameState.board.length === 0) {
        for (let i = 0; i < cfg.gridSize; i++) {
            minesGameState.board.push({ isMine: false, revealed: false, icon: 'radar' });
        }
    }

    minesGameState.board.forEach((cell, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mg-mine-cell' +
            (cell.revealed ? (cell.isMine ? ' revealed mine' : ' revealed safe') : '');
        btn.textContent = cell.revealed ? (cell.isMine ? '💣' : cell.icon) : '📡';

        btn.addEventListener('click', () => {
            if (!minesGameState.active || cell.revealed) return;
            cell.revealed = true;

            if (cell.isMine) {
                // Đạp trúng mìn!
                minesGameState.active = false;
                minesGameState.potCoins = 0;
                minesGameState.potGems = 0;
                minesGameState.potMedals = 0;
                minesGameState.board.forEach(c => {
                    if (c.isMine) c.revealed = true;
                });
                triggerHaptic(50);
                if (sfxRef) sfxRef.play('boom');
                const stEl = document.getElementById('mg-mines-status-text');
                if (stEl) stEl.innerHTML = `<span class="text-rose-600 font-black">💥 BÙM! Bạn đã đạp trúng Mìn Chống Tăng và mất quỹ thưởng ván này!</span>`;
                renderMinesMinigameBoard();
            } else {
                // Mở trúng Kho báu!
                minesGameState.safeOpened++;
                const m = cfg.multipliers[Math.min(minesGameState.safeOpened - 1, cfg.multipliers.length - 1)] || 1.2;
                const addCoins = Math.round(cfg.baseCoinsPerSafe * m);
                const addGems = Math.round(cfg.baseGemsPerSafe * m);
                minesGameState.potCoins += addCoins;
                minesGameState.potGems += addGems;

                if (Math.random() < cfg.medalChancePerSafe) {
                    minesGameState.potMedals += 2;
                    cell.icon = '🎖️';
                } else {
                    cell.icon = minesGameState.safeOpened % 2 === 0 ? '💎' : '🪙';
                }

                triggerHaptic(15);
                if (sfxRef) sfxRef.play('upgrade');
                const stEl = document.getElementById('mg-mines-status-text');
                if (stEl) {
                    stEl.innerHTML = `✨ An toàn! Hệ số tăng lên <b class="text-emerald-600">x${m.toFixed(2)}</b>! Có thể bấm <b>RÚT THƯỞNG NGAY</b>!`;
                }

                if (minesGameState.safeOpened >= cfg.safeCells) {
                    cashoutMinesMinigame();
                    return;
                }
                renderMinesMinigameBoard();
            }
        });

        gridEl.appendChild(btn);
    });
}

export function cashoutMinesMinigame() {
    if (!minesGameState.active || minesGameState.safeOpened <= 0) return;
    minesGameState.active = false;

    const c = minesGameState.potCoins;
    const g = minesGameState.potGems;
    const m = minesGameState.potMedals;

    metaState.coins += c;
    metaState.gems += g;
    metaState.medals = (metaState.medals || 0) + m;

    // Nếu mở được từ 8 ô an toàn trở lên, tặng thêm 1 thẻ tướng Epic/Legendary
    let bonusCardMsg = '';
    if (minesGameState.safeOpened >= 8) {
        const bonusRarity = minesGameState.safeOpened >= 14 ? 'mythic' : 'legendary';
        const randUnit = UNIT_CATALOG[(Math.random() * UNIT_CATALOG.length) | 0];
        addCardToStacks(randUnit.id, bonusRarity, 1);
        bonusCardMsg = ` + 1 Thẻ <b>${randUnit.name} (${RARITY_CONFIG[bonusRarity].name})</b>`;
    }

    minesGameState.board.forEach(cell => {
        if (cell.isMine) cell.revealed = true;
    });

    saveProgress();
    updateTopBarUI();
    if (sfxRef) sfxRef.play('upgrade');

    const stEl = document.getElementById('mg-mines-status-text');
    if (stEl) {
        const mTxt = m > 0 ? `, +🎖️ ${m}` : '';
        stEl.innerHTML = `<span class="text-emerald-600 font-black">🎉 RÚT THƯỞNG THÀNH CÔNG: +🪙 ${c.toLocaleString('en-US')}, +💎 ${g.toLocaleString('en-US')}${mTxt}${bonusCardMsg}!</span>`;
    }
    renderMinesMinigameBoard();
}

/* --- 11.2. MINI-GAME 2: HỨNG TIẾP TẾ DÙ 30 GIÂY (AIRDROP CATCHER) --- */
export function drawCatcherIdleCanvas() {
    const canvas = document.getElementById('mgCatcherCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, W, H * 0.72);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, H * 0.72, W, H * 0.28);

    // Vẽ xe Humvee ở giữa
    ctx.fillStyle = '#1e3a8a';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(catcherGameState.playerX - 24, H - 38, 48, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = '900 12px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BẤM "BẮT ĐẦU HỨNG TIẾP TẾ" ĐỂ CHƠI!', W / 2, H / 2 - 10);
}

export function stopCatcherMinigame(awardLoot = true) {
    if (catcherGameState.rafId) {
        cancelAnimationFrame(catcherGameState.rafId);
        catcherGameState.rafId = null;
    }
    if (!catcherGameState.running) return;
    catcherGameState.running = false;

    if (awardLoot) {
        const c = Math.max(0, catcherGameState.scoreCoins);
        const g = Math.max(0, catcherGameState.scoreGems);
        const m = Math.max(0, catcherGameState.scoreMedals);
        metaState.coins += c;
        metaState.gems += g;
        metaState.medals = (metaState.medals || 0) + m;
        saveProgress();
        updateTopBarUI();
        if (sfxRef) sfxRef.play('upgrade');
    }
}

export function startCatcherMinigame() {
    stopCatcherMinigame(false);
    const cfg = MINIGAME_CONFIG.catcher;

    catcherGameState.running = true;
    catcherGameState.timeLeft = cfg.durationSec;
    catcherGameState.playerX = cfg.canvasWidth / 2;
    catcherGameState.items = [];
    catcherGameState.floatingTexts = [];
    catcherGameState.scoreCoins = 0;
    catcherGameState.scoreGems = 0;
    catcherGameState.scoreMedals = 0;
    catcherGameState.spawnTimer = 0.1;
    catcherGameState.lastFrameTs = performance.now();

    if (sfxRef) sfxRef.play('spawn');

    function catcherLoop(now) {
        if (!catcherGameState.running) return;
        const dt = Math.min(0.05, Math.max(0.001, (now - catcherGameState.lastFrameTs) / 1000));
        catcherGameState.lastFrameTs = now;

        catcherGameState.timeLeft = Math.max(0, catcherGameState.timeLeft - dt);

        if (catcherGameState.moveLeft) {
            catcherGameState.playerX -= cfg.playerSpeed * dt;
        }
        if (catcherGameState.moveRight) {
            catcherGameState.playerX += cfg.playerSpeed * dt;
        }
        catcherGameState.playerX = Math.max(28, Math.min(cfg.canvasWidth - 28, catcherGameState.playerX));

        // Sinh vật phẩm rơi từ bầu trời
        catcherGameState.spawnTimer -= dt;
        if (catcherGameState.spawnTimer <= 0) {
            catcherGameState.spawnTimer = cfg.spawnIntervalSec;
            const rand = Math.random() * 100;
            let acc = 0;
            let spec = cfg.items[0];
            for (const it of cfg.items) {
                acc += it.weight;
                if (rand <= acc) {
                    spec = it;
                    break;
                }
            }
            catcherGameState.items.push({
                ...spec,
                x: 24 + Math.random() * (cfg.canvasWidth - 48),
                y: -16
            });
        }

        const playerY = cfg.canvasHeight - 28;
        for (let i = catcherGameState.items.length - 1; i >= 0; i--) {
            const it = catcherGameState.items[i];
            it.y += it.speed * dt;

            if (Math.abs(it.x - catcherGameState.playerX) <= 28 && Math.abs(it.y - playerY) <= 20) {
                catcherGameState.scoreCoins = Math.max(0, catcherGameState.scoreCoins + it.coins);
                catcherGameState.scoreGems = Math.max(0, catcherGameState.scoreGems + it.gems);
                catcherGameState.scoreMedals = Math.max(0, catcherGameState.scoreMedals + it.medals);

                if (it.type === 'bomb') {
                    if (sfxRef) sfxRef.play('boom');
                    triggerHaptic(35);
                    catcherGameState.floatingTexts.push({ x: it.x, y: it.y, text: '💥 TRÚNG BOM!', color: '#ef4444', alpha: 1.0 });
                } else {
                    if (sfxRef) sfxRef.play('gas');
                    const txt = it.coins > 0 ? `+${it.coins}🪙` : (it.gems > 0 ? `+${it.gems}💎` : `+${it.medals}🎖️`);
                    catcherGameState.floatingTexts.push({ x: it.x, y: it.y, text: txt, color: it.color, alpha: 1.0 });
                }
                catcherGameState.items.splice(i, 1);
                continue;
            }

            if (it.y > cfg.canvasHeight + 20) {
                catcherGameState.items.splice(i, 1);
            }
        }

        for (let i = catcherGameState.floatingTexts.length - 1; i >= 0; i--) {
            const ft = catcherGameState.floatingTexts[i];
            ft.y -= 32 * dt;
            ft.alpha -= dt * 1.4;
            if (ft.alpha <= 0) catcherGameState.floatingTexts.splice(i, 1);
        }

        // Cập nhật DOM HUD của Mini-game 2
        const timeEl = document.getElementById('mg-catcher-time');
        if (timeEl) timeEl.textContent = `${catcherGameState.timeLeft.toFixed(1)}s`;
        const scoreEl = document.getElementById('mg-catcher-score');
        if (scoreEl) {
            scoreEl.textContent = `🪙 ${catcherGameState.scoreCoins.toLocaleString('en-US')} | 💎 ${catcherGameState.scoreGems} | 🎖️ ${catcherGameState.scoreMedals}`;
        }

        // Vẽ Canvas Mini-game 2
        const canvas = document.getElementById('mgCatcherCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const W = canvas.width;
            const H = canvas.height;
            ctx.clearRect(0, 0, W, H);

            // Vật phẩm tiếp tế dù
            for (const it of catcherGameState.items) {
                ctx.save();
                if (it.type !== 'bomb') {
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(it.x - 9, it.y - 12);
                    ctx.lineTo(it.x, it.y);
                    ctx.moveTo(it.x + 9, it.y - 12);
                    ctx.lineTo(it.x, it.y);
                    ctx.stroke();

                    ctx.fillStyle = '#f8fafc';
                    ctx.beginPath();
                    ctx.arc(it.x, it.y - 12, 10, Math.PI, 0);
                    ctx.fill();
                }
                ctx.font = '18px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(it.icon, it.x, it.y);
                ctx.restore();
            }

            // Xe Humvee hứng hàng
            if (atlasRef && atlasRef.ready) {
                atlasRef.draw(ctx, 5, 7, catcherGameState.playerX, playerY, 44, 44);
            } else {
                ctx.fillStyle = '#0284c7';
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 2;
                ctx.fillRect(catcherGameState.playerX - 22, playerY - 12, 44, 22);
            }

            for (const ft of catcherGameState.floatingTexts) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, ft.alpha);
                ctx.font = '900 12px "Chakra Petch", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = ft.color;
                ctx.fillText(ft.text, ft.x, ft.y);
                ctx.restore();
            }
        }

        if (catcherGameState.timeLeft <= 0) {
            stopCatcherMinigame(true);
            const canvas = document.getElementById('mgCatcherCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#4ade80';
                ctx.font = '900 13px "Chakra Petch", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(
                    `HOÀN THÀNH! +🪙${catcherGameState.scoreCoins} +💎${catcherGameState.scoreGems} +🎖️${catcherGameState.scoreMedals}`,
                    canvas.width / 2,
                    canvas.height / 2
                );
            }
            return;
        }

        catcherGameState.rafId = requestAnimationFrame(catcherLoop);
    }

    catcherGameState.rafId = requestAnimationFrame(catcherLoop);
}

/* --- 11.3. MINI-GAME 3: ĐOÁN BÀI CHIẾN THUẬT (HIGH-LOW RARITY RANK 0 ➔ 40) --- */
export function startHighLowMinigame() {
    const cfg = MINIGAME_CONFIG.highlow;
    if (!metaState.isAdminMode && metaState.coins < cfg.entryCostCoins) {
        if (sfxRef) sfxRef.play('cannon');
        const stEl = document.getElementById('mg-hl-status-text');
        if (stEl) stEl.innerHTML = `<span class="text-rose-600">⚠️ Bạn cần 🪙 ${cfg.entryCostCoins.toLocaleString('en-US')} Vàng để mở ván bài!</span>`;
        return;
    }

    if (!metaState.isAdminMode) {
        metaState.coins -= cfg.entryCostCoins;
        saveProgress();
        updateTopBarUI();
    }

    // Lật lá đầu tiên ở khoảng giữa (Rank 8 ➔ Rank 32) để dễ đoán
    const startRank = 8 + ((Math.random() * 25) | 0);
    highLowGameState.active = true;
    highLowGameState.streak = 0;
    highLowGameState.potCoins = cfg.initialPotCoins;
    highLowGameState.potGems = cfg.initialPotGems;
    highLowGameState.curRarityId = RARITY_ORDER[startRank] || 'legendary2';
    highLowGameState.curUnitId = UNIT_CATALOG[(Math.random() * UNIT_CATALOG.length) | 0].id;

    if (sfxRef) sfxRef.play('spawn');
    const stEl = document.getElementById('mg-hl-status-text');
    if (stEl) stEl.innerHTML = `🃏 Hãy dự đoán thẻ tiếp theo có <b>Rank Cao hơn (HIGHER)</b> hay <b>Thấp hơn (LOWER)</b>!`;

    const nextBox = document.getElementById('mg-hl-next-card');
    if (nextBox) {
        nextBox.className = 'mg-hl-card-box mystery-card';
        document.getElementById('mg-hl-next-rarity').textContent = '???';
        document.getElementById('mg-hl-next-rank').textContent = 'RANK ?';
        document.getElementById('mg-hl-next-unit').textContent = 'ĐANG ÚP';
    }

    renderHighLowMinigameUI();
}

export function renderHighLowMinigameUI() {
    const rCfg = RARITY_CONFIG[highLowGameState.curRarityId] || RARITY_CONFIG.common;
    const u = UNIT_BY_ID[highLowGameState.curUnitId] || UNIT_CATALOG[0];

    const curBox = document.getElementById('mg-hl-current-card');
    if (curBox) curBox.className = `mg-hl-card-box ${rCfg.cssClass}`;

    const curRarityEl = document.getElementById('mg-hl-cur-rarity');
    if (curRarityEl) {
        curRarityEl.className = `rarity-badge ${rCfg.cssClass} mt-1`;
        curRarityEl.textContent = rCfg.name.toUpperCase();
    }

    const curRankEl = document.getElementById('mg-hl-cur-rank');
    if (curRankEl) curRankEl.textContent = `RANK ${rCfg.rank} (${rCfg.mult}x)`;

    const curUnitEl = document.getElementById('mg-hl-cur-unit');
    if (curUnitEl) curUnitEl.textContent = u.name.toUpperCase();

    const streakEl = document.getElementById('mg-hl-streak');
    if (streakEl) streakEl.textContent = String(highLowGameState.streak);

    const potEl = document.getElementById('mg-hl-pot');
    if (potEl) {
        potEl.textContent = `🪙 ${highLowGameState.potCoins.toLocaleString('en-US')} | 💎 ${highLowGameState.potGems.toLocaleString('en-US')}`;
    }

    const btnHigher = document.getElementById('btn-mg-hl-higher');
    const btnLower = document.getElementById('btn-mg-hl-lower');
    const btnCashout = document.getElementById('btn-mg-hl-cashout');

    if (btnHigher) btnHigher.disabled = !highLowGameState.active;
    if (btnLower) btnLower.disabled = !highLowGameState.active;
    if (btnCashout) btnCashout.disabled = !highLowGameState.active || highLowGameState.streak <= 0;
}

export function guessHighLowCard(guessDirection = 'higher') {
    if (!highLowGameState.active) return;

    const curRank = RARITY_CONFIG[highLowGameState.curRarityId]?.rank ?? 0;
    let nextRank = (Math.random() * RARITY_ORDER.length) | 0;
    if (nextRank === curRank) {
        nextRank = (nextRank + 1) % RARITY_ORDER.length;
    }

    const nextRarityId = RARITY_ORDER[nextRank];
    const nextRCfg = RARITY_CONFIG[nextRarityId];
    const nextUnit = UNIT_CATALOG[(Math.random() * UNIT_CATALOG.length) | 0];

    // Hiển thị thẻ vừa lật ở ô bên phải
    const nextBox = document.getElementById('mg-hl-next-card');
    if (nextBox) {
        nextBox.className = `mg-hl-card-box ${nextRCfg.cssClass} card-revealed`;
        const nr = document.getElementById('mg-hl-next-rarity');
        if (nr) {
            nr.className = `rarity-badge ${nextRCfg.cssClass} mt-1`;
            nr.textContent = nextRCfg.name.toUpperCase();
        }
        const nRankEl = document.getElementById('mg-hl-next-rank');
        if (nRankEl) nRankEl.textContent = `RANK ${nextRCfg.rank} (${nextRCfg.mult}x)`;
        const nUnitEl = document.getElementById('mg-hl-next-unit');
        if (nUnitEl) nUnitEl.textContent = nextUnit.name.toUpperCase();
    }

    const isWin =
        (guessDirection === 'higher' && nextRank >= curRank) ||
        (guessDirection === 'lower' && nextRank <= curRank);

    const stEl = document.getElementById('mg-hl-status-text');

    if (isWin) {
        highLowGameState.streak++;
        const mult = MINIGAME_CONFIG.highlow.winMultiplier;
        highLowGameState.potCoins = Math.round(highLowGameState.potCoins * mult);
        highLowGameState.potGems = Math.round(highLowGameState.potGems * mult);
        highLowGameState.curRarityId = nextRarityId;
        highLowGameState.curUnitId = nextUnit.id;

        triggerHaptic(20);
        if (sfxRef) sfxRef.play('upgrade');
        if (stEl) {
            stEl.innerHTML = `<span class="text-emerald-600 font-black">✅ CHÍNH XÁC! Thẻ mới là ${nextRCfg.name} (Rank ${nextRank})! Quỹ thưởng nhân x${mult}!</span>`;
        }
        renderHighLowMinigameUI();
    } else {
        highLowGameState.active = false;
        highLowGameState.potCoins = 0;
        highLowGameState.potGems = 0;
        triggerHaptic(45);
        if (sfxRef) sfxRef.play('boom');
        if (stEl) {
            stEl.innerHTML = `<span class="text-rose-600 font-black">❌ ĐOÁN SAI! Thẻ lật ra là ${nextRCfg.name} (Rank ${nextRank}). Hãy bắt đầu ván mới!</span>`;
        }
        renderHighLowMinigameUI();
    }
}

export function cashoutHighLowMinigame() {
    if (!highLowGameState.active || highLowGameState.streak <= 0) return;
    highLowGameState.active = false;

    const c = highLowGameState.potCoins;
    const g = highLowGameState.potGems;
    metaState.coins += c;
    metaState.gems += g;

    let bonusTxt = '';
    if (highLowGameState.streak >= MINIGAME_CONFIG.highlow.bonusCardStreakThreshold) {
        const bonusRarity = highLowGameState.streak >= 8 ? 'master' : 'secret';
        addCardToStacks(highLowGameState.curUnitId, bonusRarity, 1);
        const u = UNIT_BY_ID[highLowGameState.curUnitId];
        bonusTxt = ` + 1 Thẻ <b>${u?.name || 'Tướng'} (${RARITY_CONFIG[bonusRarity].name})</b>`;
    }

    saveProgress();
    updateTopBarUI();
    if (sfxRef) sfxRef.play('upgrade');

    const stEl = document.getElementById('mg-hl-status-text');
    if (stEl) {
        stEl.innerHTML = `<span class="text-emerald-600 font-black">💰 ĐÃ THU NHẬN: +🪙 ${c.toLocaleString('en-US')}, +💎 ${g.toLocaleString('en-US')}${bonusTxt}!</span>`;
    }
    renderHighLowMinigameUI();
}

// ============================================================================
// 12. KHỞI TẠO BỘ LẮNG NGHE SỰ KIỆN SẢNH (INIT LOBBY LISTENERS)
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

    document.getElementById('btn-quick-army-chips')?.addEventListener('click', () => {
        switchLobbyTab('army');
        openUnitUpgradeModal(showcaseUnitId || PRIMARY_INFANTRY_ID);
    });

    // Nút START bắt đầu trận đấu (Chỉ gắn 1 lần duy nhất tại đây, đã xóa bản lặp ở index.html)
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

    // 5. Nhiệm vụ & Giftcode
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
        fb.innerHTML = `🎉 NHẬP QUÀ THÀNH CÔNG! (+${(Number(rewardPack.gems) || 0).toLocaleString('en-US')} 💎, +${(Number(rewardPack.coins) || 0).toLocaleString('en-US')} 🪙${medalMsg})`;
        input.value = '';
        renderGiftcodeModalUI();
    });

    // 6. Shop & Mở Rương Siêu Tốc 1 Tỷ Rương O(1) (< 0.005s)
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

    // Các nút chọn nhanh [1K], [1M], [100M], [1B (1 Tỷ)] dưới ô nhập rương
    document.querySelectorAll('.crate-preset-qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetInputId = btn.getAttribute('data-target-input');
            const crateType = btn.getAttribute('data-crate') || 'legendary';
            const qty = Number(btn.getAttribute('data-qty')) || 1000;
            const inputEl = document.getElementById(targetInputId);
            if (inputEl) inputEl.value = String(qty);
            if (sfxRef) sfxRef.play('gas');
            requestOpenGachaCrate(crateType, qty);
        });
    });

    document.getElementById('btn-close-gacha-confirm')?.addEventListener('click', () => {
        document.getElementById('gacha-confirm-modal')?.classList.remove('active');
    });

    document.getElementById('btn-cancel-custom-gacha')?.addEventListener('click', () => {
        document.getElementById('gacha-confirm-modal')?.classList.remove('active');
    });

    // Xác nhận mở rương O(1) Box-Muller Gaussian Multinomial (Hỗ trợ tới 1,000,000,000 rương trong < 0.005s)
    document.getElementById('btn-confirm-custom-gacha')?.addEventListener('click', () => {
        if (!pendingGachaData) return;
        const { crateType, qty, finalCost, isLegendary } = pendingGachaData;

        if (!metaState.isAdminMode && metaState.gems < finalCost) {
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        const tStart = performance.now();
        if (!metaState.isAdminMode) {
            metaState.gems -= finalCost;
        }
        metaState.missionsProgress.cratesOpened = (metaState.missionsProgress.cratesOpened || 0) + qty;

        const unitIds = UNIT_CATALOG.map(u => normalizeUnitId(u.id));
        const pullResult = simulateBulkCrateOpeningO1(crateType, qty, unitIds);

        // Cộng thẳng vào `metaState.inventoryStacks` O(1)
        for (const [stackKey, count] of Object.entries(pullResult.unitRarityStacks)) {
            if (count > 0) {
                metaState.inventoryStacks[stackKey] = (metaState.inventoryStacks[stackKey] || 0) + count;
            }
        }

        saveProgress();
        updateTopBarUI();
        if (sfxRef) sfxRef.play('upgrade');
        document.getElementById('gacha-confirm-modal')?.classList.remove('active');

        const elapsedMs = Math.max(0.1, +(performance.now() - tStart).toFixed(2));
        const resModal = document.getElementById('gacha-result-modal');
        const titleEl = document.getElementById('gacha-modal-title');
        const sumBanner = document.getElementById('gacha-total-pulled');
        const breakdownEl = document.getElementById('gacha-rarity-breakdown');
        const gridEl = document.getElementById('gacha-cards-grid');

        if (titleEl) {
            titleEl.textContent = isLegendary
                ? `👑 LEGENDARY CRATE X${formatCompactNumber(qty)}`
                : `🧰 EPIC CRATE X${formatCompactNumber(qty)}`;
        }
        if (sumBanner) {
            sumBanner.textContent = `${qty.toLocaleString('en-US')} thẻ tướng (trong ${elapsedMs}ms)`;
        }

        if (breakdownEl) {
            breakdownEl.innerHTML = '';
            const orderedRarities = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
            let hasAny = false;
            orderedRarities.forEach(rKey => {
                const count = pullResult.rarityTotals[rKey] || 0;
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

            if (qty <= 10 && pullResult.sampleCards.length > 0) {
                pullResult.sampleCards.forEach(c => {
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
                const aggregatedEntries = Object.entries(pullResult.unitRarityStacks).map(([key, count]) => {
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
                        <span class="card-qty-badge" title="${item.count.toLocaleString('en-US')} thẻ">x${formatCompactNumber(item.count)}</span>
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

    // 7. Tab Army: Chuyển chế độ Army / Merge, Deck Builder, Bulk Level Up (+1/+5/+10/MAX + Custom Input) & Hoàn cấp
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

    // Thanh Đội Hình 4 Ô ở Tab ARMY: chạm vào ô nào mở modal của tướng ở ô đó
    document.querySelectorAll('#army-active-deck-bar button[data-deck-slot]').forEach(btn => {
        btn.addEventListener('click', () => {
            const slotIdx = Number(btn.getAttribute('data-deck-slot'));
            const uId = metaState.selectedDeck?.[slotIdx] || PRIMARY_INFANTRY_ID;
            showcaseUnitId = uId;
            renderArmyShowcaseCanvas();
            openUnitUpgradeModal(uId);
        });
    });

    // 4 nút [Ô Đội Hình 1..4] trong `#unit-upgrade-modal`
    document.querySelectorAll('#upg-deck-slot-selector button[data-deck-slot]').forEach(btn => {
        btn.addEventListener('click', () => {
            const slotIdx = Number(btn.getAttribute('data-deck-slot'));
            assignUnitToDeckSlot(inspectingUnitId, slotIdx);
        });
    });

    // Các nút chọn nhanh số cấp nâng [+1], [+5], [+10], [MAX] và ô nhập `#upg-custom-add-lv-input`
    document.querySelectorAll('.upg-quick-lv-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const u = UNIT_BY_ID[inspectingUnitId];
            if (!u) return;
            const permLv = metaState.armyPermanentLevels[u.id] || 1;
            const attr = btn.getAttribute('data-add-lv');
            if (sfxRef) sfxRef.play('gas');

            if (attr === 'max') {
                const maxAdd = calcMaxAffordableLevels(permLv, metaState.coins, metaState.isAdminMode);
                updateBulkUpgradePreviewUI(maxAdd);
                btn.classList.add('active');
            } else {
                updateBulkUpgradePreviewUI(Number(attr) || 1);
            }
        });
    });

    document.getElementById('upg-custom-add-lv-input')?.addEventListener('input', (e) => {
        const val = Math.max(1, Math.min(999999, Math.floor(Number(e.target.value) || 1)));
        updateBulkUpgradePreviewUI(val);
    });

    document.getElementById('btn-close-upg-modal')?.addEventListener('click', () => {
        document.getElementById('unit-upgrade-modal')?.classList.remove('active');
    });

    // Nút xác nhận nâng cấp vượt cấp (+N cấp cùng lúc)
    document.getElementById('btn-confirm-unit-upgrade')?.addEventListener('click', () => {
        const u = UNIT_BY_ID[inspectingUnitId];
        if (!u) return;

        const permLv = metaState.armyPermanentLevels[u.id] || 1;
        const addLv = Math.max(1, Math.min(999999, Math.floor(Number(currentBulkAddLevels) || 1)));
        const totalCostCoins = calcBulkUpgradeCost(permLv, addLv);

        if (!metaState.isAdminMode && metaState.coins < totalCostCoins) {
            if (sfxRef) sfxRef.play('cannon');
            return;
        }

        if (!metaState.isAdminMode) {
            metaState.coins -= totalCostCoins;
        }
        metaState.armyPermanentLevels[u.id] = permLv + addLv;
        metaState.missionsProgress.upgrades = (metaState.missionsProgress.upgrades || 0) + addLv;

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

    // 8. Bàn Merge Thủ Công 2 Thẻ
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

        addCardToStacks(normId1, card1.rarity, -2);
        addCardToStacks(normId1, nextRarity, 1);

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

    // 9. MỤC 3.3: NÂNG CẤP CASCADE AUTO MERGE SIÊU TỐC O(1) TRỰC TIẾP TRÊN `inventoryStacks`
    // Dù kho có 1 Tỷ thẻ vẫn gộp dây chuyền lên thẳng Master +8 & Demon +10 trong < 0.002 giây!
    document.getElementById('btn-auto-merge')?.addEventListener('click', () => {
        const t0 = performance.now();
        let totalMergeOperations = 0;
        const newlyCreatedCounts = {};
        UNIT_CATALOG.forEach(u => {
            newlyCreatedCounts[u.id] = {};
        });

        UNIT_CATALOG.forEach(u => {
            const normId = normalizeUnitId(u.id);
            for (let rIdx = 0; rIdx < RARITY_ORDER.length - 1; rIdx++) {
                const curR = RARITY_ORDER[rIdx];
                const nextR = RARITY_CONFIG[curR]?.next;
                if (!nextR) continue;

                const curKey = `${normId}__${curR}`;
                const nextKey = `${normId}__${nextR}`;
                const stackCount = Math.floor(Number(metaState.inventoryStacks[curKey]) || 0);

                if (stackCount >= 2) {
                    const pairs = Math.floor(stackCount / 2);
                    const remainder = stackCount % 2;

                    if (remainder > 0) {
                        metaState.inventoryStacks[curKey] = remainder;
                    } else {
                        delete metaState.inventoryStacks[curKey];
                    }
                    metaState.inventoryStacks[nextKey] = (Math.floor(Number(metaState.inventoryStacks[nextKey]) || 0)) + pairs;

                    if (newlyCreatedCounts[normId][curR]) {
                        newlyCreatedCounts[normId][curR] = Math.min(newlyCreatedCounts[normId][curR], remainder);
                    }
                    newlyCreatedCounts[normId][nextR] = (newlyCreatedCounts[normId][nextR] || 0) + pairs;
                    totalMergeOperations += pairs;
                }
            }
        });

        if (totalMergeOperations === 0) {
            if (sfxRef) sfxRef.play('cannon');
            alert('Không tìm thấy cặp thẻ nào cùng tên & cùng độ hiếm trong kho để tự động ghép!');
            return;
        }

        const summaryItems = [];
        UNIT_CATALOG.forEach(u => {
            const normId = normalizeUnitId(u.id);
            RARITY_ORDER.forEach(r => {
                const qty = Math.floor(Number(metaState.inventoryStacks[`${normId}__${r}`]) || 0);
                const createdStillRemaining = Math.min(qty, newlyCreatedCounts[normId]?.[r] || 0);
                if (createdStillRemaining > 0) {
                    summaryItems.push({
                        unitId: normId,
                        rarity: r,
                        count: createdStillRemaining,
                        rank: RARITY_CONFIG[r]?.rank ?? 0
                    });
                }
            });
        });

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

        const elapsedMs = Math.max(0.1, +(performance.now() - t0).toFixed(2));
        const amModal = document.getElementById('auto-merge-modal');
        const textEl = document.getElementById('auto-merge-summary-text');
        const gridEl = document.getElementById('auto-merge-results-grid');

        const totalNewCards = summaryItems.reduce((acc, it) => acc + it.count, 0);
        if (textEl) {
            textEl.innerHTML = `⚡ Đã tự động ghép dây chuyền <b>${totalMergeOperations.toLocaleString('en-US')} lần</b> trong <b>${elapsedMs}ms</b>! Tạo ra <b>${totalNewCards.toLocaleString('en-US')} thẻ</b> bậc cao nhất:`;
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
                    ${item.count > 1 ? `<span class="card-qty-badge">x${formatCompactNumber(item.count)}</span>` : ''}
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

    // 10. Sự kiện Vòng Quay May Mắn (#lucky-wheel-modal)
    document.getElementById('btn-open-lucky-wheel')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        updateLuckyWheelPityUI();
        drawLuckyWheelCanvas();
        document.getElementById('lucky-wheel-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-lucky-wheel')?.addEventListener('click', () => {
        document.getElementById('lucky-wheel-modal')?.classList.remove('active');
    });

    document.getElementById('btn-wheel-center-spin')?.addEventListener('click', () => executeLuckyWheelSpins(1));
    document.getElementById('btn-spin-wheel-1')?.addEventListener('click', () => executeLuckyWheelSpins(1));
    document.getElementById('btn-spin-wheel-10')?.addEventListener('click', () => executeLuckyWheelSpins(10));
    document.getElementById('btn-spin-wheel-custom')?.addEventListener('click', () => {
        const count = Number(document.getElementById('input-custom-wheel-spins')?.value) || 50;
        executeLuckyWheelSpins(count);
    });

    // 11. Sự kiện Trung Tâm 3 Mini-Game (#minigame-arcade-modal)
    document.getElementById('btn-open-minigames')?.addEventListener('click', () => {
        if (sfxRef) sfxRef.play('gas');
        switchMinigameTab(currentMinigameTab || 'mines');
        document.getElementById('minigame-arcade-modal')?.classList.add('active');
    });

    document.getElementById('btn-close-minigames')?.addEventListener('click', () => {
        stopCatcherMinigame(true);
        document.getElementById('minigame-arcade-modal')?.classList.remove('active');
    });

    document.querySelectorAll('.arcade-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-mg-tab');
            if (tab !== 'catcher') stopCatcherMinigame(true);
            if (tab) switchMinigameTab(tab);
        });
    });

    // Mini-game 1: Đập Mìn 5x5
    document.getElementById('btn-mg-mines-start')?.addEventListener('click', startMinesMinigame);
    document.getElementById('btn-mg-mines-cashout')?.addEventListener('click', cashoutMinesMinigame);

    // Mini-game 2: Hứng Tiếp Tế Dù 30s
    document.getElementById('btn-mg-catcher-start')?.addEventListener('click', startCatcherMinigame);

    const bindHoldBtn = (btnId, dirKey) => {
        const el = document.getElementById(btnId);
        if (!el) return;
        const setMove = (val) => { catcherGameState[dirKey] = val; };
        el.addEventListener('pointerdown', () => setMove(true));
        el.addEventListener('pointerup', () => setMove(false));
        el.addEventListener('pointerleave', () => setMove(false));
        el.addEventListener('pointercancel', () => setMove(false));
    };
    bindHoldBtn('btn-mg-catcher-left', 'moveLeft');
    bindHoldBtn('btn-mg-catcher-right', 'moveRight');

    const catcherCanvas = document.getElementById('mgCatcherCanvas');
    if (catcherCanvas) {
        catcherCanvas.addEventListener('pointermove', (e) => {
            if (!catcherGameState.running) return;
            const rect = catcherCanvas.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * catcherCanvas.width;
            catcherGameState.playerX = Math.max(28, Math.min(catcherCanvas.width - 28, relX));
        });
    }

    // Mini-game 3: Đoán Bài Chiến Thuật
    document.getElementById('btn-mg-hl-start')?.addEventListener('click', startHighLowMinigame);
    document.getElementById('btn-mg-hl-higher')?.addEventListener('click', () => guessHighLowCard('higher'));
    document.getElementById('btn-mg-hl-lower')?.addEventListener('click', () => guessHighLowCard('lower'));
    document.getElementById('btn-mg-hl-cashout')?.addEventListener('click', cashoutHighLowMinigame);

    // 12. Vòng lặp 60 FPS nhẹ cho `#army-hero-showcase` để nhân vật nhấp nhô & xoay hào quang Master/Demon
    function lobbyShowcaseAnimationLoop() {
        const lobbyActive = document.getElementById('lobby-wrapper')?.classList.contains('active');
        if (lobbyActive && currentLobbyTab === 'army') {
            renderArmyShowcaseCanvas();
        }
        requestAnimationFrame(lobbyShowcaseAnimationLoop);
    }
    requestAnimationFrame(lobbyShowcaseAnimationLoop);

    // Khởi chạy đồng bộ UI ban đầu
    updateTopBarUI();
    renderStageScreenUI();
    renderArmyDeckBuilderBar();
    drawLuckyWheelCanvas();
    checkAndPromptPlayerName(false);
}