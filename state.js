/* ============================================================================
   TINY BATTLE - META-GAME STATE & PERSISTENCE (js/state.js)
   Save Key: tiny_battle_meta_save_v3 (Tương thích ngược 100% với save cũ)
   Hỗ trợ: 54 Maps (6 Biomes) • Hệ thống 0-3 Sao (metaState.mapStars & 162 Sao) •
           18 Binh Chủng • Ngọc Trai Trắng • Kho Chip • Challenge •
           Cây Cổ Thụ 4 Nhánh (40 Kỹ Năng & 4 Kỹ Năng Đặc Biệt)
   ============================================================================ */

import {
    STORAGE_KEY,
    RARITY_ORDER,
    MAX_RARITY_RANK,
    RARITY_CONFIG,
    LEVELS,
    UNIT_CATALOG,
    UNIT_BY_ID,
    UNIT_CHIPS,
    CHIP_SOCKET_2_UNLOCK_GEMS,
    CHIP_BUY_COST_COINS,
    CHIP_BUY_COST_GEMS,
    BASE_TURRET_CONFIG,
    CODEX_MILESTONES,
    ANCIENT_SKILL_TREE,
    getSkillTreeNodeCost
} from './config.js';
import { getUnitUpgradeCost, calcTotalRefundCoinsFast } from './math.js';

export const PRIMARY_INFANTRY_ID = UNIT_CATALOG[0]?.id || 'infantry';

export function normalizeUnitId(unitId) {
    if (unitId === 'infantry' || unitId === 'rifleman') {
        return PRIMARY_INFANTRY_ID;
    }
    return unitId;
}

export function createDefaultChipInventory() {
    return {
        napalm_rocket: 1,
        tactical_radar: 1,
        reactive_armor: 1,
        overclock_core: 1
    };
}

export function createDefaultAncientSkillTree() {
    const tree = {};
    Object.keys(ANCIENT_SKILL_TREE).forEach(nodeId => {
        tree[nodeId] = 0;
    });
    return tree;
}

export function createDefaultMapStars() {
    const starsMap = {};
    for (let i = 1; i <= LEVELS.length; i++) {
        starsMap[i] = 0;
    }
    return starsMap;
}

export let metaState = {
    playerName: '',
    coins: 350,
    gems: 400,
    medals: 5,
    pearls: 0, // ⚪ Ngọc Trai Trắng
    isAdminMode: false,
    usedCodes: [],
    mapStars: createDefaultMapStars(),
    mapDifficultyProgress: {},
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
    // 6 Nhánh Cây Bị Động Chỉ Huy (Max Lv.10 - dùng 🎖️ Huy Chương)
    metaTalents: {
        oil_refining: 0,
        high_grade_steel: 0,
        optimal_logistics: 0,
        critical_firepower: 0,
        battlefield_harvest: 0,
        immortal_bastion: 0
    },
    // Hệ thống Chip & Mở khóa Khe 2 (500 Gems / binh chủng)
    chipInventory: createDefaultChipInventory(),
    unitSockets: {},
    unitSocket2Unlocked: {},
    talents: {},
    equippedChips: {},
    selectedDeck: [PRIMARY_INFANTRY_ID, 'bazooka', 'humvee', 'tank', 'airstrike'],
    endlessBestWave: 0,
    autobattlerWins: 0,
    raidBossClears: 0,

    // Tiến trình Chế độ CHALLENGE (Tower Defense 20 Wave Zombie - 54 Map)
    challengeClearedMaps: {},
    challengeBestWave: {},

    // Cây Kỹ Năng Cổ Thụ 4 Nhánh (40 Kỹ Năng - dùng ⚪ Ngọc Trai Trắng)
    ancientSkillTree: createDefaultAncientSkillTree(),

    // Vòng quay may mắn & Lịch sử nổ Jackpot
    wheelPity: 0,
    wheelSkipAnim: false,
    wheelJackpotTotal: 0,
    wheelJackpotHistory: [],

    // Ụ pháo phòng thủ Căn Cứ Xanh
    baseTurret: {
        type: 'gatling',
        level: 1
    },

    // Sổ tay INDEX (Codex) & Mốc độ hiếm cao nhất từng đạt
    highestRarityEverOwned: {},
    codexClaimed: {}
};

let uidCounter = 1;

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

export function recordHighestRarityForUnit(rawUnitId, rarityId) {
    const unitId = normalizeUnitId(rawUnitId);
    if (!UNIT_BY_ID[unitId] || !RARITY_CONFIG[rarityId]) return;
    if (!metaState.highestRarityEverOwned || typeof metaState.highestRarityEverOwned !== 'object') {
        metaState.highestRarityEverOwned = {};
    }
    const curBest = metaState.highestRarityEverOwned[unitId];
    const curRank = curBest && RARITY_CONFIG[curBest] ? RARITY_CONFIG[curBest].rank : -1;
    const newRank = RARITY_CONFIG[rarityId].rank ?? 0;
    if (newRank > curRank) {
        metaState.highestRarityEverOwned[unitId] = rarityId;
    }
}

export function syncHighestRarityEverOwnedFromStacks() {
    if (!metaState.highestRarityEverOwned || typeof metaState.highestRarityEverOwned !== 'object') {
        metaState.highestRarityEverOwned = {};
    }
    if (metaState.inventoryStacks && typeof metaState.inventoryStacks === 'object') {
        for (const [key, rawCount] of Object.entries(metaState.inventoryStacks)) {
            const count = Math.floor(Number(rawCount) || 0);
            if (count <= 0) continue;
            const [rawUnitId, rarity] = key.split('__');
            recordHighestRarityForUnit(rawUnitId, rarity);
        }
    }
}

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

        recordHighestRarityForUnit(unitId, rarity);

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

export function addCardToStacks(rawUnitId, rarity, deltaCount = 1) {
    const unitId = normalizeUnitId(rawUnitId);
    if (!UNIT_BY_ID[unitId] || !RARITY_CONFIG[rarity]) return;
    const key = `${unitId}__${rarity}`;
    const cur = Math.floor(Number(metaState.inventoryStacks[key]) || 0);
    const delta = Math.floor(Number(deltaCount) || 0);
    const nextVal = Math.max(0, cur + delta);
    if (nextVal > 0) {
        metaState.inventoryStacks[key] = nextVal;
        if (delta > 0) {
            recordHighestRarityForUnit(unitId, rarity);
        }
    } else {
        delete metaState.inventoryStacks[key];
    }
}

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
        sockMap[u.id] = [null, null];
    });
    sockMap['infantry'] = [null, null];
    sockMap['rifleman'] = [null, null];
    return sockMap;
}

export function createDefaultMapDifficultyProgress() {
    const prog = {};
    for (let i = 1; i <= LEVELS.length; i++) {
        prog[i] = {
            stars: 0,
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

export function normalizeMapProgressEntry(rawEntry, externalStars = 0) {
    if (!rawEntry || typeof rawEntry !== 'object') {
        const baseStars = Math.max(0, Math.min(3, Math.floor(Number(externalStars) || 0)));
        return {
            stars: baseStars,
            easy: baseStars >= 1,
            difficult: baseStars >= 2,
            easy_destroy: baseStars >= 1,
            easy_survival: false,
            difficult_destroy: baseStars >= 2,
            difficult_survival: false
        };
    }
    const easyDestroy = !!rawEntry.easy_destroy || (!!rawEntry.easy && !rawEntry.easy_survival);
    const easySurvival = !!rawEntry.easy_survival;
    const diffDestroy = !!rawEntry.difficult_destroy;
    const diffSurvival = !!rawEntry.difficult_survival || (!!rawEntry.difficult && !rawEntry.difficult_destroy);

    const easy = !!rawEntry.easy || easyDestroy || easySurvival;
    const difficult = !!rawEntry.difficult || diffDestroy || diffSurvival;

    // Suy diễn số sao tối thiểu từ tiến trình lưu cũ (0 -> 3 sao)
    let inferredStars = 0;
    if (easy) inferredStars = 1;
    if (difficult) inferredStars = 2;
    if (
        difficult &&
        (diffSurvival ||
            rawEntry.difficult_endless_siege ||
            rawEntry.difficult_raid_boss ||
            rawEntry.difficult_fog_of_war ||
            rawEntry.difficult_auto_battler ||
            rawEntry.difficult_challenge)
    ) {
        inferredStars = 3;
    }

    const savedStars = Math.max(
        0,
        Math.min(3, Math.floor(Math.max(Number(rawEntry.stars) || 0, Number(externalStars) || 0)))
    );

    return {
        ...rawEntry,
        stars: Math.max(inferredStars, savedStars),
        easy,
        difficult,
        easy_destroy: easyDestroy,
        easy_survival: easySurvival,
        difficult_destroy: diffDestroy,
        difficult_survival: diffSurvival
    };
}

/**
 * Đồng bộ thuộc tính stars giữa metaState.mapStars, metaState.mapDifficultyProgress và mảng LEVELS
 */
export function syncLevelsMetadata() {
    if (!metaState.mapStars || typeof metaState.mapStars !== 'object') {
        metaState.mapStars = createDefaultMapStars();
    }
    for (let i = 1; i <= LEVELS.length; i++) {
        const entry = metaState.mapDifficultyProgress?.[i];
        const progStars = entry ? Math.max(0, Math.min(3, Math.floor(Number(entry.stars) || 0))) : 0;
        const mapStarsVal = Math.max(0, Math.min(3, Math.floor(Number(metaState.mapStars[i]) || 0)));
        const bestStars = Math.max(progStars, mapStarsVal);

        metaState.mapStars[i] = bestStars;
        if (entry) {
            entry.stars = bestStars;
        }
        if (LEVELS[i - 1]) {
            LEVELS[i - 1].stars = bestStars;
        }
    }
}

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
 * Chuyển đổi tương thích ngược từ sơ đồ Skill Tree 7 nút cũ sang sơ đồ 4 nhánh 40 nút mới
 */
function migrateLegacySkillTree(rawTree) {
    const normalized = createDefaultAncientSkillTree();
    if (!rawTree || typeof rawTree !== 'object') return normalized;

    const legacyMap = {
        vital_roots: 'ft_1',
        supply_roots: 'ec_1',
        iron_trunk: 'fp_1',
        arcane_trunk: 'fp_3',
        undead_slayer: 'sm_1',
        elite_lineage: 'sm_3',
        ancient_heart: 'ft_4'
    };

    for (const [key, val] of Object.entries(rawTree)) {
        const lv = Math.max(0, Math.floor(Number(val) || 0));
        if (lv <= 0) continue;
        if (ANCIENT_SKILL_TREE[key]) {
            normalized[key] = Math.min(ANCIENT_SKILL_TREE[key].maxLevel, lv);
        } else if (legacyMap[key] && ANCIENT_SKILL_TREE[legacyMap[key]]) {
            const targetId = legacyMap[key];
            normalized[targetId] = Math.min(
                ANCIENT_SKILL_TREE[targetId].maxLevel,
                Math.max(normalized[targetId], lv)
            );
        }
    }
    return normalized;
}

export function syncLegacyEngineBridges() {
    const infLv = Math.max(
        metaState.armyPermanentLevels?.infantry || 1,
        metaState.armyPermanentLevels?.rifleman || 1
    );
    metaState.armyPermanentLevels.infantry = infLv;
    metaState.armyPermanentLevels.rifleman = infLv;

    if (!metaState.unitSocket2Unlocked || typeof metaState.unitSocket2Unlocked !== 'object') {
        metaState.unitSocket2Unlocked = {};
    }

    UNIT_CATALOG.forEach(u => {
        if (!metaState.armyPermanentLevels[u.id] || metaState.armyPermanentLevels[u.id] < 1) {
            metaState.armyPermanentLevels[u.id] = 1;
        }
        if (!Array.isArray(metaState.unitSockets[u.id])) {
            metaState.unitSockets[u.id] = [null, null];
        }
        if (metaState.unitSockets[u.id][1]) {
            metaState.unitSocket2Unlocked[u.id] = true;
        }
    });

    const infSockets =
        metaState.unitSockets?.[PRIMARY_INFANTRY_ID] ||
        metaState.unitSockets?.infantry ||
        metaState.unitSockets?.rifleman ||
        [null, null];
    metaState.unitSockets.infantry = infSockets;
    metaState.unitSockets.rifleman = infSockets;

    if (metaState.unitSocket2Unlocked[PRIMARY_INFANTRY_ID]) {
        metaState.unitSocket2Unlocked.infantry = true;
        metaState.unitSocket2Unlocked.rifleman = true;
    }

    if (!metaState.chipInventory || typeof metaState.chipInventory !== 'object') {
        metaState.chipInventory = createDefaultChipInventory();
    }
    Object.keys(UNIT_CHIPS).forEach(cId => {
        metaState.chipInventory[cId] = Math.max(0, Math.floor(Number(metaState.chipInventory[cId]) || 0));
    });

    const eq = {};
    Object.keys(metaState.unitSockets || {}).forEach(uId => {
        const arr = metaState.unitSockets[uId];
        if (Array.isArray(arr)) {
            eq[uId] = arr[0] || arr[1] || null;
        }
    });
    metaState.equippedChips = eq;

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

    metaState.ancientSkillTree = migrateLegacySkillTree(metaState.ancientSkillTree);

    if (!metaState.challengeClearedMaps || typeof metaState.challengeClearedMaps !== 'object') {
        metaState.challengeClearedMaps = {};
    }
    if (!metaState.challengeBestWave || typeof metaState.challengeBestWave !== 'object') {
        metaState.challengeBestWave = {};
    }

    if (!metaState.baseTurret || typeof metaState.baseTurret !== 'object') {
        metaState.baseTurret = { type: 'gatling', level: 1 };
    }
    if (!BASE_TURRET_CONFIG[metaState.baseTurret.type]) {
        metaState.baseTurret.type = 'gatling';
    }
    metaState.baseTurret.level = Math.max(1, Math.floor(Number(metaState.baseTurret.level) || 1));

    metaState.selectedDeck = normalizeSelectedDeck(metaState.selectedDeck);
    syncHighestRarityEverOwnedFromStacks();
    syncLevelsMetadata();
}

export function loadProgress() {
    const defaultLevels = createDefaultArmyLevels();
    const defaultMapProg = createDefaultMapDifficultyProgress();
    const defaultStars = createDefaultMapStars();
    const defaultSockets = createDefaultUnitSockets();

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            metaState.playerName = typeof parsed.playerName === 'string' ? parsed.playerName : '';
            metaState.coins = typeof parsed.coins === 'number' ? parsed.coins : 350;
            metaState.gems = typeof parsed.gems === 'number' ? parsed.gems : 400;
            metaState.medals = typeof parsed.medals === 'number' ? parsed.medals : 5;
            metaState.pearls = typeof parsed.pearls === 'number' ? parsed.pearls : 0;
            metaState.isAdminMode = !!parsed.isAdminMode;
            metaState.usedCodes = Array.isArray(parsed.usedCodes) ? parsed.usedCodes : [];
            metaState.endlessBestWave = Number(parsed.endlessBestWave) || 0;
            metaState.autobattlerWins = Number(parsed.autobattlerWins) || 0;
            metaState.raidBossClears = Number(parsed.raidBossClears) || 0;

            metaState.challengeClearedMaps =
                parsed.challengeClearedMaps && typeof parsed.challengeClearedMaps === 'object'
                    ? { ...parsed.challengeClearedMaps }
                    : {};
            metaState.challengeBestWave =
                parsed.challengeBestWave && typeof parsed.challengeBestWave === 'object'
                    ? { ...parsed.challengeBestWave }
                    : {};

            metaState.ancientSkillTree = migrateLegacySkillTree(parsed.ancientSkillTree);

            metaState.chipInventory =
                parsed.chipInventory && typeof parsed.chipInventory === 'object'
                    ? { ...createDefaultChipInventory(), ...parsed.chipInventory }
                    : createDefaultChipInventory();

            metaState.unitSocket2Unlocked =
                parsed.unitSocket2Unlocked && typeof parsed.unitSocket2Unlocked === 'object'
                    ? { ...parsed.unitSocket2Unlocked }
                    : {};

            metaState.wheelPity = Math.max(0, Math.min(100, Number(parsed.wheelPity) || 0));
            metaState.wheelSkipAnim = !!parsed.wheelSkipAnim;
            metaState.wheelJackpotTotal = Math.max(0, Math.floor(Number(parsed.wheelJackpotTotal) || 0));
            metaState.wheelJackpotHistory = Array.isArray(parsed.wheelJackpotHistory)
                ? parsed.wheelJackpotHistory.slice(0, 15)
                : [];

            metaState.baseTurret = {
                type: BASE_TURRET_CONFIG[parsed.baseTurret?.type] ? parsed.baseTurret.type : 'gatling',
                level: Math.max(1, Math.floor(Number(parsed.baseTurret?.level) || 1))
            };

            metaState.highestRarityEverOwned =
                parsed.highestRarityEverOwned && typeof parsed.highestRarityEverOwned === 'object'
                    ? { ...parsed.highestRarityEverOwned }
                    : {};

            metaState.codexClaimed =
                parsed.codexClaimed && typeof parsed.codexClaimed === 'object'
                    ? { ...parsed.codexClaimed }
                    : {};

            metaState.mapStars = defaultStars;
            metaState.mapDifficultyProgress = defaultMapProg;
            const parsedStars = parsed.mapStars && typeof parsed.mapStars === 'object' ? parsed.mapStars : {};

            for (let i = 1; i <= LEVELS.length; i++) {
                const extStar = Number(parsedStars[i]) || 0;
                const rawProg = parsed.mapDifficultyProgress?.[i] || null;
                const normEntry = normalizeMapProgressEntry(rawProg, extStar);
                if (metaState.challengeClearedMaps[i] && normEntry.stars < 3) {
                    normEntry.stars = 3;
                }
                metaState.mapDifficultyProgress[i] = normEntry;
                metaState.mapStars[i] = normEntry.stars;
            }

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
                critical_firepower: 0,
                battlefield_harvest: 0,
                immortal_bastion: 0,
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
            metaState.pearls = 0;
            metaState.isAdminMode = false;
            metaState.usedCodes = [];
            metaState.mapStars = defaultStars;
            metaState.mapDifficultyProgress = defaultMapProg;
            metaState.inventoryStacks = createDefaultInventoryStacks();
            syncRepresentativeInventoryFromStacks();
            metaState.armyPermanentLevels = defaultLevels;
            metaState.unitSockets = defaultSockets;
            metaState.unitSocket2Unlocked = {};
            metaState.chipInventory = createDefaultChipInventory();
            metaState.ancientSkillTree = createDefaultAncientSkillTree();
            metaState.challengeClearedMaps = {};
            metaState.challengeBestWave = {};
            metaState.selectedDeck = normalizeSelectedDeck(null);
            metaState.wheelPity = 0;
            metaState.wheelSkipAnim = false;
            metaState.wheelJackpotTotal = 0;
            metaState.wheelJackpotHistory = [];
            metaState.baseTurret = { type: 'gatling', level: 1 };
            metaState.highestRarityEverOwned = {};
            metaState.codexClaimed = {};
        }
    } catch (e) {
        metaState.mapStars = defaultStars;
        metaState.mapDifficultyProgress = defaultMapProg;
        metaState.inventoryStacks = createDefaultInventoryStacks();
        syncRepresentativeInventoryFromStacks();
        metaState.armyPermanentLevels = defaultLevels;
        metaState.unitSockets = defaultSockets;
        metaState.unitSocket2Unlocked = {};
        metaState.chipInventory = createDefaultChipInventory();
        metaState.ancientSkillTree = createDefaultAncientSkillTree();
        metaState.challengeClearedMaps = {};
        metaState.challengeBestWave = {};
        metaState.selectedDeck = normalizeSelectedDeck(null);
        metaState.baseTurret = { type: 'gatling', level: 1 };
        metaState.highestRarityEverOwned = {};
        metaState.codexClaimed = {};
    }

    syncLegacyEngineBridges();
}

export function saveProgress() {
    syncLegacyEngineBridges();
    syncRepresentativeInventoryFromStacks();
    try {
        const compactPayload = {
            ...metaState,
            inventory: metaState.inventory,
            inventoryStacks: metaState.inventoryStacks,
            mapStars: metaState.mapStars
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

// ============================================================================
// CÁC HÀM QUẢN LÝ CHIP MOD & MỞ KHE CHIP THỨ 2 (500 💎 GEMS)
// ============================================================================
export function isUnitSocket2Unlocked(rawUnitId) {
    if (metaState.isAdminMode) return true;
    const unitId = normalizeUnitId(rawUnitId);
    return !!metaState.unitSocket2Unlocked?.[unitId];
}

export function unlockUnitSocket2(rawUnitId) {
    const unitId = normalizeUnitId(rawUnitId);
    if (!UNIT_BY_ID[unitId]) return false;
    if (isUnitSocket2Unlocked(unitId)) return true;
    if (!metaState.isAdminMode && metaState.gems < CHIP_SOCKET_2_UNLOCK_GEMS) {
        return false;
    }
    if (!metaState.isAdminMode) {
        metaState.gems -= CHIP_SOCKET_2_UNLOCK_GEMS;
    }
    if (!metaState.unitSocket2Unlocked) metaState.unitSocket2Unlocked = {};
    metaState.unitSocket2Unlocked[unitId] = true;
    if (unitId === PRIMARY_INFANTRY_ID) {
        metaState.unitSocket2Unlocked.infantry = true;
        metaState.unitSocket2Unlocked.rifleman = true;
    }
    saveProgress();
    return true;
}

export function getChipOwnedCount(chipId) {
    if (!UNIT_CHIPS[chipId]) return 0;
    return Math.max(0, Math.floor(Number(metaState.chipInventory?.[chipId]) || 0));
}

export function buyChipItem(chipId, currencyType = 'coins') {
    const chip = UNIT_CHIPS[chipId];
    if (!chip) return false;
    if (!metaState.chipInventory) metaState.chipInventory = createDefaultChipInventory();

    if (!metaState.isAdminMode) {
        if (currencyType === 'gems') {
            const cost = chip.buyGems || CHIP_BUY_COST_GEMS;
            if (metaState.gems < cost) return false;
            metaState.gems -= cost;
        } else {
            const cost = chip.buyCoins || CHIP_BUY_COST_COINS;
            if (metaState.coins < cost) return false;
            metaState.coins -= cost;
        }
    }

    metaState.chipInventory[chipId] = getChipOwnedCount(chipId) + 1;
    saveProgress();
    return true;
}

export function equipChipToUnitSlot(rawUnitId, slotIdx, chipId) {
    const unitId = normalizeUnitId(rawUnitId);
    if (!UNIT_BY_ID[unitId] || !UNIT_CHIPS[chipId]) return { ok: false, reason: 'invalid' };
    if (slotIdx !== 0 && slotIdx !== 1) return { ok: false, reason: 'invalid_slot' };
    if (slotIdx === 1 && !isUnitSocket2Unlocked(unitId)) {
        return { ok: false, reason: 'locked_slot2' };
    }

    if (!Array.isArray(metaState.unitSockets[unitId])) {
        metaState.unitSockets[unitId] = [null, null];
    }

    const prevChipId = metaState.unitSockets[unitId][slotIdx];
    if (prevChipId === chipId) {
        return { ok: true };
    }

    const owned = getChipOwnedCount(chipId);
    if (!metaState.isAdminMode && owned <= 0) {
        return { ok: false, reason: 'no_stock' };
    }

    if (prevChipId && UNIT_CHIPS[prevChipId]) {
        metaState.chipInventory[prevChipId] = getChipOwnedCount(prevChipId) + 1;
    }

    if (!metaState.isAdminMode) {
        metaState.chipInventory[chipId] = Math.max(0, owned - 1);
    }

    metaState.unitSockets[unitId][slotIdx] = chipId;
    saveProgress();
    return { ok: true };
}

export function unequipChipFromUnitSlot(rawUnitId, slotIdx) {
    const unitId = normalizeUnitId(rawUnitId);
    if (!UNIT_BY_ID[unitId]) return false;
    if (slotIdx !== 0 && slotIdx !== 1) return false;
    if (!Array.isArray(metaState.unitSockets[unitId])) return false;

    const prevChipId = metaState.unitSockets[unitId][slotIdx];
    if (!prevChipId) return false;

    if (UNIT_CHIPS[prevChipId]) {
        metaState.chipInventory[prevChipId] = getChipOwnedCount(prevChipId) + 1;
    }
    metaState.unitSockets[unitId][slotIdx] = null;
    saveProgress();
    return true;
}

// ============================================================================
// CÁC HÀM TIẾN TRÌNH 54 MAP, 0-3 SAO, CHALLENGE & CÂY KỸ NĂNG CỔ THỤ 4 NHÁNH
// ============================================================================
export function isDifficultyCleared(mapLv, diffId) {
    const prog = metaState.mapDifficultyProgress[mapLv];
    if (!prog) return false;
    if (diffId === 'easy') {
        return !!(prog.easy || prog.easy_destroy || prog.easy_survival || (metaState.mapStars?.[mapLv] || 0) >= 1);
    }
    if (diffId === 'difficult') {
        return !!(prog.difficult || prog.difficult_destroy || prog.difficult_survival || (metaState.mapStars?.[mapLv] || 0) >= 2);
    }
    return false;
}

export function isDifficultyModeCleared(mapLv, diffId, modeId) {
    const prog = metaState.mapDifficultyProgress[mapLv];
    if (!prog) return false;
    const key = `${diffId}_${modeId}`;
    return !!prog[key];
}

export function getStageStars(mapLv) {
    const progStars = metaState.mapDifficultyProgress?.[mapLv]?.stars || 0;
    const directStars = metaState.mapStars?.[mapLv] || 0;
    return Math.max(0, Math.min(3, Math.floor(Math.max(Number(progStars) || 0, Number(directStars) || 0))));
}

export function recordStageStars(mapLv, earnedStars) {
    const lv = Math.max(1, Math.min(LEVELS.length, Math.floor(Number(mapLv) || 1)));
    const clamped = Math.max(0, Math.min(3, Math.floor(Number(earnedStars) || 0)));
    if (!metaState.mapDifficultyProgress[lv]) {
        metaState.mapDifficultyProgress[lv] = normalizeMapProgressEntry(null);
    }
    if (!metaState.mapStars || typeof metaState.mapStars !== 'object') {
        metaState.mapStars = createDefaultMapStars();
    }
    const prev = getStageStars(lv);
    if (clamped > prev) {
        metaState.mapDifficultyProgress[lv].stars = clamped;
        metaState.mapStars[lv] = clamped;
    }
    syncLevelsMetadata();
    return getStageStars(lv);
}

export function getTotalCampaignStars() {
    let total = 0;
    for (let i = 1; i <= LEVELS.length; i++) {
        total += getStageStars(i);
    }
    return total;
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

/**
 * Lấy Level hiện tại mà người chơi đang đứng (màn chưa thắng tiếp theo trên lộ trình 54 màn)
 */
export function getCurrentCampaignLevel() {
    for (let i = 1; i <= LEVELS.length; i++) {
        if (!isDifficultyCleared(i, 'easy')) {
            return i;
        }
    }
    return LEVELS.length;
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

export function isChallengeMapCleared(mapLv) {
    return !!metaState.challengeClearedMaps?.[mapLv];
}

export function getMaxUnlockedChallengeMapLevel() {
    if (metaState.isAdminMode) return LEVELS.length;
    let maxLv = 1;
    for (let i = 1; i < LEVELS.length; i++) {
        if (isChallengeMapCleared(i)) {
            maxLv = i + 1;
        } else {
            break;
        }
    }
    return maxLv;
}

export function isChallengeMapUnlocked(mapLv) {
    if (metaState.isAdminMode) return true;
    return mapLv >= 1 && mapLv <= getMaxUnlockedChallengeMapLevel();
}

export function getSkillTreeNodeLevel(nodeId) {
    return Math.max(0, Math.floor(Number(metaState.ancientSkillTree?.[nodeId]) || 0));
}

export function isSkillTreeNodeUnlocked(nodeId) {
    const node = ANCIENT_SKILL_TREE[nodeId];
    if (!node) return false;
    if (!Array.isArray(node.requires) || node.requires.length === 0) return true;
    return node.requires.every(reqId => getSkillTreeNodeLevel(reqId) >= 1);
}

export function canUpgradeSkillTreeNode(nodeId) {
    const node = ANCIENT_SKILL_TREE[nodeId];
    if (!node) return false;
    const curLv = getSkillTreeNodeLevel(nodeId);
    if (curLv >= node.maxLevel) return false;
    if (!isSkillTreeNodeUnlocked(nodeId)) return false;
    const cost = getSkillTreeNodeCost(nodeId, curLv);
    return metaState.isAdminMode || (metaState.pearls || 0) >= cost;
}

export function upgradeSkillTreeNode(nodeId) {
    if (!canUpgradeSkillTreeNode(nodeId)) return false;
    const curLv = getSkillTreeNodeLevel(nodeId);
    const cost = getSkillTreeNodeCost(nodeId, curLv);
    if (!metaState.isAdminMode) {
        metaState.pearls = Math.max(0, (metaState.pearls || 0) - cost);
    }
    if (!metaState.ancientSkillTree) metaState.ancientSkillTree = createDefaultAncientSkillTree();
    metaState.ancientSkillTree[nodeId] = curLv + 1;
    saveProgress();
    return true;
}

export function hasAnyUpgradableSkillTreeNode() {
    return Object.keys(ANCIENT_SKILL_TREE).some(nodeId => canUpgradeSkillTreeNode(nodeId));
}

/**
 * Tổng hợp toàn bộ chỉ số cộng thêm & 4 Kỹ Năng Đặc Biệt từ Cây Kỹ Năng Cổ Thụ 4 Nhánh
 */
export function getAncientSkillTreeBonuses() {
    const bonuses = {
        physDmgPct: 0,
        elemDmgPct: 0,
        allDmgPct: 0,
        critChance: 0,
        fireRatePct: 0,
        splashBonus: 0,
        burnBonusPct: 0,
        rangeBonus: 0,

        hpPct: 0,
        armorPct: 0,
        baseHpPct: 0,
        hpRegenPct: 0,
        turretDmgPct: 0,
        lifestealPct: 0,
        healBonusPct: 0,
        ccResistPct: 0,

        zombieDmgPct: 0,
        ccDurationPct: 0,
        cdReductionPct: 0,
        stunChanceBonus: 0,
        skeletonStatPct: 0,
        tacticCdPct: 0,
        extraSkeletonCap: 0,
        moveSpeedPct: 0,

        startGasFlat: 0,
        gasRegenPct: 0,
        goldBonusPct: 0,
        expGainPct: 0,
        pearlBonusPct: 0,
        deathGasRefundPct: 0,
        maxGasFlat: 0,
        killGasChance: 0,

        // 4 Kỹ Năng Đặc Biệt Mốc 10
        meteor_storm: false,
        eternal_shield: false,
        void_lord: false,
        infinite_reactor: false
    };

    for (const node of Object.values(ANCIENT_SKILL_TREE)) {
        const lv = getSkillTreeNodeLevel(node.id);
        if (lv <= 0) continue;
        if (node.specialKey) {
            bonuses[node.specialKey] = true;
        } else if (node.statType && Object.prototype.hasOwnProperty.call(bonuses, node.statType)) {
            bonuses[node.statType] += lv * (node.perLevel || 0);
        }
    }

    return bonuses;
}

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

export function getHighestEverRarityRankForUnit(unitId) {
    const targetId = normalizeUnitId(unitId);
    const currentBest = getHighestRarityForUnit(targetId);
    const curRank = hasUnitInInventory(targetId)
        ? (RARITY_CONFIG[currentBest]?.rank ?? 0)
        : -1;
    const histRarity = metaState.highestRarityEverOwned?.[targetId];
    const histRank = histRarity && RARITY_CONFIG[histRarity] ? RARITY_CONFIG[histRarity].rank : -1;
    return Math.max(curRank, histRank);
}

export function hasClaimableCodexMilestones() {
    for (const u of UNIT_CATALOG) {
        const maxRank = getHighestEverRarityRankForUnit(u.id);
        for (const ms of CODEX_MILESTONES) {
            const claimKey = `${u.id}__${ms.id}`;
            if (maxRank >= ms.minRank && !metaState.codexClaimed?.[claimKey]) {
                return true;
            }
        }
    }
    return false;
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
    return calcTotalRefundCoinsFast(targetLv, Math.max(1, Math.floor(Number(currentLv) || 1)));
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